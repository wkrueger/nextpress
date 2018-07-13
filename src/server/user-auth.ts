import Yup = require("yup")
import knexModule = require("knex")
import { v4 as uuid } from "uuid"
import bcrypt = require("bcrypt")
import ono = require("ono")
import { RequestHandler, RouteSetupHelper } from ".."
import { Router, Request, Response } from "express"
import day = require("dayjs")

const createUserSchema = Yup.object({
  email: Yup.string()
    .email()
    .required(),
  password: Yup.string()
    .min(8)
    .required(),
})

const emailSchema = Yup.object({
  email: Yup.string()
    .email()
    .required(),
})

const requestIdSchema = Yup.object({
  requestId: Yup.string()
    .min(36)
    .max(36)
    .required(),
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
    .required(),
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
    ctx.requireContext("default.mailgun", "default.database", "default.website")
  }

  _knex = this.ctx.database.db()

  async init() {
    if (!(await this._knex.schema.hasTable("user"))) {
      await this._knex.schema.createTable("user", table => {
        table.increments()
        table.string("email", 30).unique()
        table.string("auth", 80)
        table.string("validationHash", 80).nullable()
        table.string("resetPwdHash", 80).nullable()
        table.timestamp("validationExpires").nullable()
        table.timestamp("resetPwdExpires").nullable()
        table.timestamp("lastRequest").nullable()
      })
    }
    await this.routineCleanup()
  }

  userTable() {
    return this._knex("user")
  }

  private async checkAndUpdateUserRequestCap(email: string, seconds: number) {
    if (!email) throw Error("Invalid input.")
    let result: any[] = await this.userTable()
      .where({ email })
      .select("lastRequest")
    if (!result.length) return
    let lastReq = result[0].lastRequest
    if (
      !lastReq ||
      day(lastReq)
        .add(seconds, "second")
        .isBefore(day())
    ) {
      await this.userTable()
        .where({ email })
        .update({
          lastRequest: new Date(),
        })
      return
    } else {
      throw Error("Try again in a few seconds.")
    }
  }

  async routineCleanup() {
    //dead users
    await this.userTable()
      .whereNotNull("validationHash")
      .andWhere("validationExpires", "<", new Date())
      .delete()
    //dead password requests
    await this.userTable()
      .whereNotNull("resetPwdHash")
      .andWhere("resetPwdExpires", "<", new Date())
      .update({ resetPwdHash: null, resetPwdExpires: null })
  }

  async create(inp: SchemaType<typeof createUserSchema>) {
    createUserSchema.validateSync(inp, { strict: true })
    const pwdHash = await bcrypt.hash(inp.password, 10)
    const validationHash = uuid()

    let expireDate = day()
      .add(2, "hour")
      .toDate()

    try {
      var [pkey] = await this.userTable()
        .insert({ email: inp.email, auth: pwdHash, validationHash, validationExpires: expireDate })
        .into("user")
    } catch (err) {
      if ((err.errno || "") === 1062) {
        err.message = ""
        throw ono(err, { statusCode: 400 }, "This user already exists.")
      }
    }

    try {
      const link = this._createValidationLink(validationHash)
      await this.ctx.mailgun.sendMail({
        email: inp.email,
        subject: this._newAccountEmailSubject(),
        html: this._validationMailHTML({ address: inp.email, validationLink: link }),
      })
    } catch (err) {
      await this.userTable()
        .where({ id: pkey })
        .delete()
      throw err
    }
  }

  async validate(hash: string): Promise<User> {
    if (!hash) throw Error("Invalid hash.")
    const users = await this.userTable()
      .select()
      .where({ validationHash: hash })
    if (!users.length) throw Error("Invalid hash.")
    const found = users[0]
    await this.userTable()
      .update({ validationHash: null })
      .where({ id: found.id })
    return { id: found.id, email: found.email }
  }

  async find(inp: SchemaType<typeof createUserSchema>): Promise<User | undefined> {
    createUserSchema.validateSync(inp, { strict: true })
    const users: User[] = await this.userTable()
      .select("id", "email", "auth", "validationHash")
      .where({ email: inp.email })
    if (!users.length) return undefined
    const check = await bcrypt.compare(inp.password, users[0].auth!)
    if (users[0].validationHash!) throw Error("User needs to validate his email first.")
    return check ? { id: users[0].id, email: users[0].email } : undefined
  }

  async createResetPwdRequest(inp: SchemaType<typeof emailSchema>) {
    emailSchema.validateSync(inp)
    const requestId = uuid()
    const ids = await this.userTable()
      .where({ email: inp.email })
      .update({
        resetPwdHash: requestId,
        resetPwdExpires: day()
          .add(2, "hour")
          .toDate(),
      })
    const link = this._createResetPasswordLink(requestId)
    if (ids || ids.length) {
      await this.ctx.mailgun.sendMail({
        email: inp.email,
        subject: this._pwdResetEmailSubject(),
        html: this._resetPwdMailHTML({ address: inp.email, validationLink: link }),
      })
    }
  }

  async findResetPwdRequest(inp: SchemaType<typeof requestIdSchema>) {
    requestIdSchema.validateSync(inp)
    const found = await this.userTable()
      .select("id")
      .where({ resetPwdHash: inp.requestId })
    return found.length ? true : false
  }

  async performResetPwd(inp: SchemaType<typeof pwdRequestSchema>) {
    pwdRequestSchema.validateSync(inp)
    const found = await this.findResetPwdRequest({ requestId: inp.requestId })
    if (!found) throw Error("Invalid request")
    if (inp.pwd1 !== inp.pwd2) throw Error("Password confirmation failed.")
    await this.userTable()
      .update({ resetPwdHash: null, auth: await bcrypt.hash(inp.pwd1, 10) })
      .where({ resetPwdHash: inp.requestId })
  }

  checkSession = (req: Request, res: Response) => {
    if (!req.session) throw ono({ statusCode: 401 }, "Unauthorized")
    if (!req.session.user) throw ono({ statusCode: 401 }, "Unauthorized")
    res.setHeader("X-User-Id", req.session.user.id)
    res.setHeader("X-User-Email", req.session.user.email)
  }

  throwOnUnauthMw: RequestHandler = (req, res, next) => {
    try {
      this.checkSession(req, res)
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
      performReset: timedQueueMw(),
    }
  }

  /**
   * overrideable
   * this is a per-user time limit for the operations
   */
  _getPerUserWaitTime() {
    return {
      login: 5,
      requestPasswordReset: 15,
    }
  }

  async userRoutes(Setup: RouteSetupHelper) {
    const User = this
    const { yup, withValidation } = Setup
    const queues = this._getRequestThrottleMws()
    const json = await Setup.jsonRoutes(async router => {
      Setup.jsonRouteDict(router, {
        "/createuser": Setup.withMiddleware(
          [queues.createUser],
          withValidation(
            {
              body: yup.object({
                newUserEmail: yup.string().email(),
                newUserPwd: yup.string().min(8),
              }),
            },
            async req => {
              await User.create({
                email: req.body.newUserEmail,
                password: req.body.newUserPwd,
              })
              return { status: "OK" }
            },
          ),
        ),

        "/login": Setup.withMiddleware(
          [queues.login],
          withValidation(
            {
              body: yup.object({
                existingUserEmail: yup.string().email(),
                existingUserPwd: yup.string().min(8),
              }),
            },
            async req => {
              await this.checkAndUpdateUserRequestCap(
                req.body.existingUserEmail,
                this._getPerUserWaitTime().login,
              )
              const user = await User.find({
                email: req.body.existingUserEmail,
                password: req.body.existingUserPwd,
              })
              if (!user) {
                throw ono({ statusCode: 401 }, "Could not authenticate with what you entered.")
              }
              req.session!.user = { email: user.email, id: user.id }
              return { status: "OK" }
            },
          ),
        ),

        "/request-password-reset": Setup.withMiddleware(
          [queues.requestReset],
          withValidation({ body: yup.object({ email: yup.string().email() }) }, async req => {
            await this.checkAndUpdateUserRequestCap(
              req.body.email,
              this._getPerUserWaitTime().requestPasswordReset,
            )
            await User.createResetPwdRequest({ email: req.body.email })
            return { status: "OK" }
          }),
        ),

        "/perform-password-reset": Setup.withMiddleware(
          [queues.performReset],
          withValidation(
            {
              body: yup.object({
                pwd1: yup.string().min(8),
                pwd2: yup.string().min(8),
                requestId: yup.string().required(),
              }),
            },
            async req => {
              await User.performResetPwd(req.body)
              return { status: "OK" }
            },
          ),
        ),

        "/logout": Setup.withMethod(
          "all",
          Setup.withMiddleware([User.throwOnUnauthMw], async req => {
            await new Promise(res => {
              req.session!.destroy(res)
            })
            return { status: "OK" }
          }),
        ),
      })
    })

    const html = await Setup.htmlRoutes(async router => {
      router.get(
        this._validateRoute(),
        Setup.tryMw(async (req, res) => {
          const hash = req.query.seq
          let user = await User.validate(hash)
          req.session!.user = { id: user.id, email: user.email }
          return this._renderSimpleMessage(Setup, req, res, "Success", "User validated.")
        }),
      )
    })

    return { json, html }
  }

  _renderSimpleMessage(
    Setup: RouteSetupHelper,
    req: any,
    res: any,
    title: string,
    message: string,
  ) {
    return Setup.nextApp().render(req, res, "/auth/message", {
      title: title,
      content: message,
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

class TimedQueue {
  constructor(public size: number, public wait: number) {}

  list = [] as boolean[]

  push() {
    if (this.list.length >= this.size) {
      throw Error("Wait some seconds until attempting again.")
    }
    this.list.push(true)
    setTimeout(() => {
      this.list.pop()
    }, this.wait)
  }
}

let timedQueueMw: (size?: number, wait?: number) => RequestHandler = (size = 10, wait = 10000) => {
  let queue = new TimedQueue(size, wait)
  return (req, res, next) => {
    try {
      queue.push()
    } catch (err) {
      next(err)
      return
    }
    next()
  }
}
