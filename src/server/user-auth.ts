import Yup = require("yup")
import knexModule = require("knex")
import { v4 as uuid } from "uuid"
import bcrypt = require("bcrypt")
import ono = require("ono")

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
  constructor(public ctx: Nextpress.Context, public _knex: knexModule) {}

  userTable() {
    return this._knex("user")
  }

  async create(inp: SchemaType<typeof createUserSchema>) {
    createUserSchema.validateSync(inp, { strict: true })
    const pwdHash = await bcrypt.hash(inp.password, 10)
    const validationHash = uuid()

    try {
      var [pkey] = await this.userTable()
        .insert({ email: inp.email, auth: pwdHash, validationHash })
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
      .update({ resetPwdHash: requestId })
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

  _validationMailHTML(i: { address: string; validationLink: string }) {
    return `<p>Hi! ${i.address}.</p>
      <p>Follow this link to validate your account: 
      <a href="${i.validationLink}">${i.validationLink}</a>.</p>`
  }

  _createValidationLink(hash: string) {
    return `${this.ctx.website.root}/validate?seq=${encodeURIComponent(hash)}`
  }

  _createResetPasswordLink(seq: string) {
    return `${this.ctx.website.root}/forgot-password?seq=${encodeURIComponent(seq)}`
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
