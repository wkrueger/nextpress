import knex = require("knex")
import { createContextMapper } from ".."

export const knexContext = createContextMapper({
  id: "default.knex",
  envKeys: ["DB_NAME", "DB_USER", "DB_PASS", "DB_HOST", "DB_CLIENT"],
  optionalKeys: ["DB_HOST", "DB_CLIENT"],
  envContext({ getKey }) {
    return {
      database: {
        client: getKey("DB_CLIENT") || "mysql",
        host: getKey("DB_HOST") || "127.0.0.1",
        name: getKey("DB_NAME")!,
        user: getKey("DB_USER")!,
        password: getKey("DB_PASS")!,
        _currentFwVersion: 2,
        _oldFwVersion: 0,
        _db: (undefined as any) as knex,

        async init(opts: {
          currentVersion: number
          migration: (
            trx: knex.Transaction,
            oldVersion: number,
            newVersion: number
          ) => Promise<void>
        }) {
          const client = this.db()
          const CURRENT_FW_VERSION = this._currentFwVersion
          if (!(await client.schema.hasTable("meta"))) {
            await client.schema.createTable("meta", table => {
              table.increments()
              table
                .integer("version")
                .notNullable()
                .defaultTo(1)
                .unique()
              table
                .integer("fwVersion")
                .notNullable()
                .defaultTo(1)
            })
            await client.table("meta").insert({ version: CURRENT_FW_VERSION })
          }
          let { version: oldVersion, fwVersion } = (await client
            .table("meta")
            .select("version", "fwVersion"))[0]
          this._oldFwVersion = fwVersion
          await client.transaction(async trx => {
            await opts.migration(trx, oldVersion, opts.currentVersion)
          })
          //fixme: should not be updated here, but in another user defined place
          await client.table("meta").update({ version: opts.currentVersion })
        },

        db() {
          let ctx = this
          if (!this._db) {
            this._db = knex({
              client: ctx.client,
              connection: {
                host: ctx.host,
                user: ctx.user,
                password: ctx.password,
                database: ctx.name
              }
            })
          }
          return this._db
        }
      }
    }
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof knexContext["envContext"]> {}
  }
}
