import Yup = require("yup")
import { v4 as uuid } from "uuid"
import ono = require("ono")
import { Server } from "../server"
import day = require("dayjs")
import { RouterBuilder } from "../server/router-builder"
import { UserStore, KnexStore } from "./user-stores"
import { RequestHandler, Request } from "express"
import { timedQueueMw } from "./timed-queue"

type FirstArg<Fn> = Fn extends (i: infer Arg) => any ? Arg : never

const createUserSchema = Yup.object({
  username: Yup.string().required(),
  email: Yup.string()
    .email()
    .required(),
  password: Yup.string()
    .min(6)
    .required()
})

const emailSchema = Yup.object({
  email: Yup.string()
    .email()
    .required()
})

const requestIdSchema = Yup.object({
  requestId: Yup.string()
    .min(36)
    .max(36)
    .required()
})

const pwdRequestSchema = Yup.object({
  pwd1: Yup.string()
    .min(6)
    .required(),
  pwd2: Yup.string()
    .min(6)
    .required(),
  requestId: Yup.string()
    .min(36)
    .max(36)
    .required()
})

export interface User {
  id: number
  email: string
  auth?: string
  validationHash?: string
}

type SchemaType<T> = T extends Yup.ObjectSchema<infer Y> ? Y : never

export class UserAuth {
  constructor(public ctx: Nextpress.Context) {
    ctx.requireContext("default.website")
    if (this.ctx.loadedContexts.has("default.knex")) {
      this.userStore = new KnexStore(ctx)
    }
    if (!this.sendMail) {
      console.warn("UserAuth: No sendMail implementation provided.")
    }
  }

  _bcrypt: any
  get bcrypt(): typeof import("bcrypt") {
    if (this._bcrypt) return this._bcrypt
    this._bcrypt = require("bcrypt")
    return this._bcrypt
  }

  sendMail? = this.ctx.email && this.ctx.email.sendMail
  userStore!: UserStore

  options = {
    skipNewUserValidation: false
  }

  async init() {
    if (!this.userStore) {
      throw Error(
        "UserAuth: No store found. Either setup the supported" +
          "contexts (knex) or provide your own userStore implementation."
      )
    }
    await this.userStore.initStore()
    await this.userStore.routineCleanup()
  }

  private async checkAndUpdateUserRequestCap(userId: number, seconds: number) {
    if (!userId) throw Error("Invalid input.")
    let lastReq = await this.userStore.getLastRequest(userId)
    if (
      !lastReq ||
      day(lastReq)
        .add(seconds, "second")
        .isBefore(day())
    ) {
      await this.userStore.writeLastRequest(userId)
      return
    } else {
      throw Error("Try again in a few seconds.")
    }
  }

  async create(inp: SchemaType<typeof createUserSchema>, opts = { askForValidation: true }) {
    if (this.options.skipNewUserValidation) {
      opts.askForValidation = false
    }
    createUserSchema.validateSync(inp, { strict: true })
    const pwdHash = await this.bcrypt.hash(inp.password, 10)
    const validationHash = opts.askForValidation ? uuid() : null

    let expireDate = opts.askForValidation
      ? day()
          .add(2, "hour")
          .toDate()
      : null

    let pkey = await this.userStore.writeNewUser({
      username: inp.username,
      email: inp.email,
      auth: pwdHash,
      validationHash,
      validationExpires: expireDate
    })

    if (opts.askForValidation) {
      try {
        const link = this._createValidationLink(validationHash!)
        if (!this.sendMail) {
          throw Error("No email setup provided.")
        }
        await this.sendMail({
          email: inp.email,
          subject: this._newAccountEmailSubject(),
          html: this._validationMailHTML({
            address: inp.email,
            validationLink: link
          })
        })
      } catch (err) {
        //fixme use transaction
        await this.userStore.deleteUserId(pkey)
        throw err
      }
    }

    return pkey
  }

  async validateHash(hash: string): Promise<User> {
    if (!hash) throw Error("Invalid hash.")
    const found = await this.userStore.queryUserByValidationHash(hash)
    if (!found) throw Error("Invalid hash.")
    await this.userStore.clearValidationHash(found.id)
    return { id: found.id, email: found.email }
  }

  async validateLogin(inp: { username: string; password: string }): Promise<User | undefined> {
    const schema = Yup.object({
      username: Yup.string()
        .min(4)
        .required(),
      password: Yup.string()
        .min(6)
        .required()
    })
    schema.validateSync(inp)
    const user = await this.userStore.queryUserByName(inp.username)
    if (!user) return undefined
    const check = await this.bcrypt.compare(inp.password, user.auth!)
    if (user.validationHash) throw Error("User needs to validate his email first.")
    return check ? user : undefined
  }

  async createResetPwdRequest(inp: SchemaType<typeof emailSchema>) {
    emailSchema.validateSync(inp)
    const requestId = uuid()
    const user = await this.userStore.queryUserByEmail(inp.email)
    if (!user) throw Error("User not found.")
    const storeId = this.userStore.writeResetPwdRequest(
      user.id,
      requestId,
      day()
        .add(2, "hour")
        .toDate()
    )
    const link = this._createResetPasswordLink(requestId)
    if (storeId) {
      if (!this.sendMail) {
        throw Error("No email setup provided.")
      }
      await this.sendMail({
        email: inp.email,
        subject: this._pwdResetEmailSubject(),
        html: this._resetPwdMailHTML({
          address: inp.email,
          validationLink: link
        })
      })
    }
  }

  async findResetPwdRequest(inp: SchemaType<typeof requestIdSchema>) {
    requestIdSchema.validateSync(inp)
    const found = await this.userStore.queryUserByResetPasswordHash(inp.requestId)
    return found ? true : false
  }

  async performResetPwd(inp: SchemaType<typeof pwdRequestSchema>) {
    pwdRequestSchema.validateSync(inp)
    const found = await this.findResetPwdRequest({ requestId: inp.requestId })
    if (!found) throw Error("Invalid request")
    if (inp.pwd1 !== inp.pwd2) throw Error("Password confirmation failed.")
    await this.userStore.writeNewPassword(inp.requestId, await this.bcrypt.hash(inp.pwd1, 10))
  }

  checkSession: RequestHandler = async req => {
    if (!req.nextpressAuth) throw ono({ statusCode: 401 }, "Unauthorized")
    let user = await req.nextpressAuth.getUser()
    if (!user) throw ono({ statusCode: 401 }, "Unauthorized")
    //res.setHeader("X-User-Id", req.session.user.id)
    //res.setHeader("X-User-Email", req.session.user.email)
  }

  throwOnUnauthMw: RequestHandler = async (req, res, next) => {
    try {
      await this.checkSession(req, res, next)
      next()
    } catch (err) {
      next(err)
    }
  }

  /**
   * overrideable (default is 10 reqs / 10 secs per route)
   * this counts all the requests this server receives
   */
  _getRequestThrottleMws() {
    return {
      createUser: timedQueueMw(),
      login: timedQueueMw(30, 10000),
      requestReset: timedQueueMw(),
      performReset: timedQueueMw()
    }
  }

  /**
   * overrideable
   * this is a per-user time limit for the operations
   */
  _getPerUserWaitTime() {
    return {
      login: 2,
      requestPasswordReset: 10
    }
  }

  async loginRoute(
    { username, password }: { username: string; password: string },
    setUser: (u: User) => Promise<string>,
    mapUser = (u: User) => ({ email: u.email, id: u.id })
  ) {
    const user = await this.userStore.queryUserByName(username)
    if (!user) {
      throw ono(
        { statusCode: 401, code: "UNAUTHORIZED" },
        "Could not authenticate with what you entered."
      )
    }
    await this.checkAndUpdateUserRequestCap(user.id, this._getPerUserWaitTime().login)
    const found = await this.validateLogin({
      username,
      password
    })
    if (!found) {
      throw ono(
        { statusCode: 401, code: "UNAUTHORIZED" },
        "Could not authenticate with what you entered."
      )
    }
    const token = await setUser(mapUser(found))
    return { status: "OK", token }
  }

  userJsonMethods: FirstArg<RouterBuilder["rpcishJsonRouter"]> = helper => {
    const queues = this._getRequestThrottleMws()
    const { route, yup } = helper
    const User = this
    return {
      "/createUser": route({
        middleware: [queues.createUser],
        validation: {
          body: yup.object({
            newUsername: yup.string().required(),
            newUserEmail: yup
              .string()
              .email()
              .required(),
            newUserPwd: yup.string().min(6)
          })
        }
      }).handler(async req => {
        await User.create({
          username: req.body.newUsername,
          email: req.body.newUserEmail,
          password: req.body.newUserPwd
        })
        return { status: "OK" }
      }),

      "/login": route({
        middleware: [queues.login],
        validation: {
          body: yup.object({
            username: yup.string().required(),
            password: yup
              .string()
              .min(6)
              .required()
          })
        }
      }).handler(async req => {
        return this.loginRoute(
          { username: req.body.username, password: req.body.password },
          req.nextpressAuth.setUser.bind(req.nextpressAuth)
        )
      }),

      "/request-password-reset": route({
        middleware: [queues.requestReset],
        validation: { body: yup.object({ email: yup.string().email() }) }
      }).handler(async req => {
        const user = await this.userStore.queryUserByEmail(req.body.email)
        if (!user) throw Error("Not found.")
        await this.checkAndUpdateUserRequestCap(
          user.id,
          this._getPerUserWaitTime().requestPasswordReset
        )
        await User.createResetPwdRequest({ email: req.body.email })
        return { status: "OK" }
      }),

      "/perform-password-reset": route({
        middleware: [queues.performReset],
        validation: {
          body: yup.object({
            pwd1: yup.string().min(6),
            pwd2: yup.string().min(6),
            requestId: yup.string().required()
          })
        }
      }).handler(async req => {
        await User.performResetPwd(req.body)
        return { status: "OK" }
      }),

      "/logout": route({
        method: "all",
        middleware: [User.throwOnUnauthMw]
      }).handler(async req => {
        if (req.nextpressAuth) await req.nextpressAuth.logout()
        return { status: "OK" }
      })
    }
  }

  async userRoutes(routerBuilder: RouterBuilder) {
    const User = this
    const json = await routerBuilder.rpcishJsonRouter(this.userJsonMethods)

    const html = await routerBuilder.createHtmlRouter(
      async ({ router }) => {
        router.get(
          this._validateRoute(),
          RouterBuilder.createHandler(async (req, res) => {
            const hash = req.query.seq
            let user = await User.validateHash(hash)
            req.nextpressAuth.setUser({ id: user.id, email: user.email })
            return this._renderSimpleMessage(
              routerBuilder.server,
              req,
              res,
              "Success",
              "User validated."
            )
          })
        )
      },
      { noNextJs: true }
    )

    return { json, html }
  }

  _renderSimpleMessage(server: Server, req: any, res: any, title: string, message: string) {
    return server.getNextApp().render(req, res, "/auth/message", {
      title: title,
      content: message
    })
  }

  _validationMailHTML(i: { address: string; validationLink: string }) {
    return `<p>Hi! ${i.address}.</p>
      <p>Follow this link to validate your account: 
      <a href="${i.validationLink}">${i.validationLink}</a>.</p>`
  }

  /**
   * Overrideable.
   * The route to be used for user creation validation email.
   */
  _validateRoute() {
    return "/auth/validate"
  }

  /**
   * Overrideable.
   * The route to be used for user reset password email.
   */
  _passwordResetFormRoute() {
    return "/auth/password-reset-form"
  }

  _createValidationLink(hash: string) {
    return `${this.ctx.website.root}${this._validateRoute()}?seq=${encodeURIComponent(hash)}`
  }

  _createResetPasswordLink(seq: string) {
    return `${
      this.ctx.website.root
    }${this._passwordResetFormRoute()}?requestId=${encodeURIComponent(seq)}`
  }

  _resetPwdMailHTML(i: { address: string; validationLink: string }) {
    return `
      <p>Hello, ${i.address},
      </p><p>Follow this link to proceed your password reset.</p>
      <p><a href="${i.validationLink}">${i.validationLink}</a></p>`
  }

  _pwdResetEmailSubject() {
    return "password reset"
  }

  _newAccountEmailSubject() {
    return "New account"
  }
}
