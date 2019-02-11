import knexMod = require("knex")
import ono = require("ono")

//enum Username {}

export interface BaseUser {
  id?: number
  email: string
  username: string
  lastRequest?: Date
  auth?: string
  validationHash?: string | null
  validationExpires?: Date | null
}

export abstract class UserStore<User extends BaseUser> {
  abstract initStore(): Promise<void>
  abstract routineCleanup(): Promise<void>
  abstract getLastRequest(userId: number): Promise<Date | undefined>
  abstract writeLastRequest(userId: number): Promise<void>
  abstract writeNewUser(
    i: {
      username: string
      email: string
      auth: string
      validationHash: string | null
      validationExpires: Date | null
    },
    extra: Partial<User>
  ): Promise<number>
  abstract deleteUserId(id: number): Promise<void>
  abstract queryUserByValidationHash(hash: string): Promise<User | undefined>
  abstract queryUserByResetPasswordHash(hash: string): Promise<User | undefined>
  abstract queryUserByEmail(email: string): Promise<undefined | User>
  abstract queryUserByName(name: string): Promise<undefined | User>
  abstract clearValidationHash(userId: number): Promise<void>
  abstract writeResetPwdRequest(userId: number, hash: string, expires: Date): Promise<number>
  abstract writeNewPassword(requestId: string, pwdhash: string): Promise<void>
}

export class KnexStore<User extends BaseUser> extends UserStore<User> {
  constructor(public ctx: Nextpress.Context) {
    super()
  }
  _knex = this.ctx.database.db()

  userTableName = "user"
  fields = ["id", "email", "username", "lastRequest", "auth", "validationHash", "displayName"]

  userTable() {
    return this._knex(this.userTableName)
  }

  static initRun = false

  async initStore() {
    if (KnexStore.initRun) return
    KnexStore.initRun = true
    await this._knex.transaction(async trx => {
      if (!(await trx.schema.hasTable(this.userTableName))) {
        await trx.schema.createTable(this.userTableName, table => {
          table.increments()
          table
            .string("email", 30)
            .unique()
            .notNullable()
          table.string("auth", 80).notNullable()
          //
          table.string("validationHash", 80).nullable()
          table.string("resetPwdHash", 80).nullable()
          table.timestamp("validationExpires").nullable()
          table.timestamp("resetPwdExpires").nullable()
          table.timestamp("lastRequest").nullable()
        })
      }

      if (this.ctx.database._oldFwVersion < 2) {
        await trx.schema.alterTable(this.userTableName, table => {
          table
            .string("username", 30)
            .unique()
            .notNullable()
        })
        await trx.table(this.userTableName).update({
          username: trx.raw("??", ["email"])
        })
      }

      if (this.ctx.database._oldFwVersion < 3) {
        await trx.schema.alterTable(this.userTableName, table => {
          table.string("displayName", 50).nullable()
        })
      }
    })
  }

  private async _queryUserById(id: number): Promise<User | undefined> {
    const user = await this.userTable()
      .select(this.fields)
      .where({ id })
    return user[0]
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

  async getLastRequest(id: number) {
    const user = await this._queryUserById(id)
    if (!user) return
    return (user as any).lastRequest as Date
  }

  async writeLastRequest(id: number) {
    return this.userTable()
      .where({ id })
      .update({
        lastRequest: new Date()
      })
  }

  async writeNewUser(
    i: {
      username: string
      email: string
      auth: string
      validationHash: string | null
      validationExpires: Date | null
    },
    extra: Partial<User> = {}
  ) {
    try {
      var [pkey] = await this.userTable()
        .insert(Object.assign({}, extra, i))
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
      .select(...this.fields)
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
      //.select(...this.fields)
      .select()
      .where({ email })
    return users[0]
  }

  async writeResetPwdRequest(id: number, hash: string, expires: Date) {
    const ids = await this.userTable()
      .where({ id })
      .update({
        resetPwdHash: hash,
        resetPwdExpires: expires
      })
    return ids[0]
  }

  async queryUserByResetPasswordHash(hash: string) {
    const found = await this.userTable()
      .select(...this.fields)
      .where({ resetPwdHash: hash })
    return found[0] as User | undefined
  }

  async writeNewPassword(requestId: string, pwdhash: string) {
    await this.userTable()
      .update({
        resetPwdHash: null,
        auth: pwdhash
      })
      .where({ resetPwdHash: requestId })
  }

  async queryUserByName(username: string) {
    let out = await this.userTable()
      //.select(...this.fields)
      .select()
      .where({ username })
    if (!out.length && username.indexOf("@") !== -1) {
      out = this.queryUserByEmail(username)
    }
    return out[0]
  }
}
