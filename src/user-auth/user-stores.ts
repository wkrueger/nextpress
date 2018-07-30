import knexMod = require("knex")
import ono = require("ono")

interface User {
  id: number
  email: string
  auth?: string
  validationHash?: string
}

export abstract class UserStore {
  abstract initStore(): Promise<void>
  abstract routineCleanup(): Promise<void>
  abstract getLastRequest(email: string): Promise<Date | undefined>
  abstract writeLastRequest(email: string, date: Date): Promise<void>
  abstract writeNewUser(i: {
    email: string
    auth: string
    validationHash: string | null
    validationExpires: Date | null
  }): Promise<number>
  abstract deleteUserId(id: number): Promise<void>
  abstract queryUserByValidationHash(
    hash: string
  ): Promise<{ id: number; email: string } | undefined>
  abstract queryUserByResetPasswordHash(
    hash: string
  ): Promise<number | undefined>
  abstract queryUserByEmail(email: string): Promise<undefined | User>
  abstract clearValidationHash(userId: number): Promise<void>
  abstract writeResetPwdRequest(
    email: string,
    hash: string,
    expires: Date
  ): Promise<number>
  abstract writeNewPassword(requestId: string, pwdhash: string): Promise<void>
}

type Knex = ReturnType<Nextpress.Context["database"]["db"]>

export class KnexStore extends UserStore {
  constructor(public _knex: Knex) {
    super()
  }

  userTableName = "user"

  userTable() {
    return this._knex(this.userTableName)
  }

  async initStore() {
    if (!(await this._knex.schema.hasTable(this.userTableName))) {
      await this._knex.schema.createTable(this.userTableName, table => {
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

  async getLastRequest(email: string) {
    let result: any[] = await this.userTable()
      .where({ email })
      .select("lastRequest")
    if (!result.length) return
    let lastReq = result[0].lastRequest
    return lastReq as Date
  }

  async writeLastRequest(email: string, date: Date) {
    this.userTable()
      .where({ email })
      .update({
        lastRequest: new Date()
      })
  }

  async writeNewUser(i: {
    email: string
    auth: string
    validationHash: string | null
    validationExpires: Date | null
  }) {
    try {
      var [pkey] = await this.userTable()
        .insert(i)
        .into("user")
      return pkey
    } catch (err) {
      if ((err.errno || "") === 1062) {
        err.message = ""
        throw ono(err, { statusCode: 400 }, "This user already exists.")
      }
    }
  }

  async deleteUserId(pkey: number) {
    await this.userTable()
      .where({ id: pkey })
      .delete()
  }

  async queryUserByValidationHash(hash: string) {
    let users = await this.userTable()
      .select()
      .where({ validationHash: hash })
    return users[0]
  }

  async clearValidationHash(userId: number) {
    await this.userTable()
      .update({ validationHash: null })
      .where({ id: userId })
  }

  async queryUserByEmail(email: string) {
    const users: User[] = await this.userTable()
      .select("id", "email", "auth", "validationHash")
      .where({ email })
    return users[0]
  }

  async writeResetPwdRequest(email: string, hash: string, expires: Date) {
    const ids = await this.userTable()
      .where({ email })
      .update({
        resetPwdHash: hash,
        resetPwdExpires: expires
      })
    return ids[0]
  }

  async queryUserByResetPasswordHash(hash: string) {
    const found = await this.userTable()
      .select("id")
      .where({ resetPwdHash: hash })
    return found[0] as number
  }

  async writeNewPassword(requestId: string, pwdhash: string) {
    await this.userTable()
      .update({
        resetPwdHash: null,
        auth: pwdhash
      })
      .where({ resetPwdHash: requestId })
  }
}
