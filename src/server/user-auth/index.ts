import Yup = require("yup")
import { v4 as uuid } from "uuid"
import ono = require("ono")
import { Server } from "../.."
import day = require("dayjs")
import { RouterBuilder } from "../router-builder"
import { UserStore, KnexStore } from "./user-stores"

const createUserSchema = Yup.object({
  email: Yup.string()
    .email()
    .required(),
  password: Yup.string()
    .min(8)
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
    .min(8)
    .required(),
  pwd2: Yup.string()
    .min(8)
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
    ctx.requireContext("default.mailgun", "default.website")
    if (this.ctx.loadedContexts.has("default.knex")) {
      this.userStore = new KnexStore(ctx.database.db())
    }
  }

  _bcrypt: any
  get bcrypt(): typeof import("bcrypt") {
    if (this._bcrypt) return this._bcrypt
    this._bcrypt = require("bcrypt")
    return this._bcrypt
  }

  sendMail = this.ctx.mailgun.sendMail
  userStore!: UserStore

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

  private async checkAndUpdateUserRequestCap(email: string, seconds: number) {
    if (!email) throw Error("Invalid input.")
    let lastReq = await this.userStore.getLastRequest(email)
    if (
      !lastReq ||
      day(lastReq)
        .add(seconds, "second")
        .isBefore(day())
    ) {
      await this.userStore.writeLastRequest(email, new Date())
      return
    } else {
      throw Error("Try again in a few seconds.")
    }
  }

  async create(
    inp: SchemaType<typeof createUserSchema>,
    opts = { askForValidation: true }
  ) {
    createUserSchema.validateSync(inp, { strict: true })
    const pwdHash = await this.bcrypt.hash(inp.password, 10)
    const validationHash = opts.askForValidation ? uuid() : null

    let expireDate = opts.askForValidation
      ? day()
          .add(2, "hour")
          .toDate()
      : null

    let pkey = await this.userStore.writeNewUser({
      email: inp.email,
      auth: pwdHash,
      validationHash,
      validationExpires: expireDate
    })

    if (opts.askForValidation) {
      try {
        const link = this._createValidationLink(validationHash!)
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
  }

  async validate(hash: string): Promise<User> {
    if (!hash) throw Error("Invalid hash.")
    const found = await this.userStore.queryUserByValidationHash(hash)
    if (!found) throw Error("Invalid hash.")
    await this.userStore.clearValidationHash(found.id)
    return { id: found.id, email: found.email }
  }

  async find(
    inp: SchemaType<typeof createUserSchema>
  ): Promise<User | undefined> {
    createUserSchema.validateSync(inp, { strict: true })
    const user = await this.userStore.queryUserByEmail(inp.email)
    if (!user) return undefined
    const check = await this.bcrypt.compare(inp.password, user.auth!)
    if (user.validationHash)
      throw Error("User needs to validate his email first.")
    return check ? { id: user.id, email: user.email } : undefined
  }

  async createResetPwdRequest(inp: SchemaType<typeof emailSchema>) {
    emailSchema.validateSync(inp)
    const requestId = uuid()
    const storeId = this.userStore.writeResetPwdRequest(
      inp.email,
      requestId,
      day()
        .add(2, "hour")
        .toDate()
    )
    const link = this._createResetPasswordLink(requestId)
    if (storeId) {
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
    const found = await this.userStore.queryUserByResetPasswordHash(
      inp.requestId
    )
    return found ? true : false
  }

  async performResetPwd(inp: SchemaType<typeof pwdRequestSchema>) {
    pwdRequestSchema.validateSync(inp)
    const found = await this.findResetPwdRequest({ requestId: inp.requestId })
    if (!found) throw Error("Invalid request")
    if (inp.pwd1 !== inp.pwd2) throw Error("Password confirmation failed.")
    await this.userStore.writeNewPassword(
      inp.requestId,
      await this.bcrypt.hash(inp.pwd1, 10)
    )
  }

  checkSession: Polka.Middleware = req => {
    if (!req.session) throw ono({ statusCode: 401 }, "Unauthorized")
    if (!req.session.user) throw ono({ statusCode: 401 }, "Unauthorized")
    //res.setHeader("X-User-Id", req.session.user.id)
    //res.setHeader("X-User-Email", req.session.user.email)
  }

  throwOnUnauthMw: Polka.Middleware = (req, res, next) => {
    try {
      this.checkSession(req, res, next)
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
      login: 5,
      requestPasswordReset: 15
    }
  }

  async userRoutes(routerBuilder: RouterBuilder) {
    const User = this
    const queues = this._getRequestThrottleMws()
    const json = await routerBuilder.createJsonRouterFromDict(
      ({ withMiddleware, withMethod, withValidation, yup }) => ({
        "/createuser": withMiddleware(
          [queues.createUser],
          withValidation(
            {
              body: yup.object({
                newUserEmail: yup.string().email(),
                newUserPwd: yup.string().min(8)
              })
            },
            async req => {
              await User.create({
                email: req.body.newUserEmail,
                password: req.body.newUserPwd
              })
              return { status: "OK" }
            }
          )
        ),

        "/login": withMiddleware(
          [queues.login],
          withValidation(
            {
              body: yup.object({
                existingUserEmail: yup.string().email(),
                existingUserPwd: yup.string().min(8)
              })
            },
            async req => {
              await this.checkAndUpdateUserRequestCap(
                req.body.existingUserEmail,
                this._getPerUserWaitTime().login
              )
              const user = await User.find({
                email: req.body.existingUserEmail,
                password: req.body.existingUserPwd
              })
              if (!user) {
                throw ono(
                  { statusCode: 401 },
                  "Could not authenticate with what you entered."
                )
              }
              req.session!.user = { email: user.email, id: user.id }
              return { status: "OK" }
            }
          )
        ),

        "/request-password-reset": withMiddleware(
          [queues.requestReset],
          withValidation(
            { body: yup.object({ email: yup.string().email() }) },
            async req => {
              await this.checkAndUpdateUserRequestCap(
                req.body.email,
                this._getPerUserWaitTime().requestPasswordReset
              )
              await User.createResetPwdRequest({ email: req.body.email })
              return { status: "OK" }
            }
          )
        ),

        "/perform-password-reset": withMiddleware(
          [queues.performReset],
          withValidation(
            {
              body: yup.object({
                pwd1: yup.string().min(8),
                pwd2: yup.string().min(8),
                requestId: yup.string().required()
              })
            },
            async req => {
              await User.performResetPwd(req.body)
              return { status: "OK" }
            }
          )
        ),

        "/logout": withMethod(
          "all",
          withMiddleware([User.throwOnUnauthMw], async req => {
            await new Promise(res => {
              req.session!.destroy(res)
            })
            return { status: "OK" }
          })
        )
      })
    )

    const html = await routerBuilder.createHtmlRouter(async ({ router }) => {
      router.get(
        this._validateRoute(),
        RouterBuilder.tryMw(async (req, res) => {
          const hash = req.query.seq
          let user = await User.validate(hash)
          req.session!.user = { id: user.id, email: user.email }
          return this._renderSimpleMessage(
            routerBuilder.server,
            req,
            res,
            "Success",
            "User validated."
          )
        })
      )
    })

    return { json, html }
  }

  _renderSimpleMessage(
    server: Server,
    req: any,
    res: any,
    title: string,
    message: string
  ) {
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
    return `${
      this.ctx.website.root
    }${this._validateRoute()}?seq=${encodeURIComponent(hash)}`
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

declare global {
  namespace Polka {
    interface Session {
      user?: { id: number; email: string }
    }
  }
}
