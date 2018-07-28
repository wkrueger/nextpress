import knex = require("knex")

export default {
  id: "default.knex",
  envKeys: ["DB_NAME", "DB_USER", "DB_PASS", "DB_HOST", "DB_CLIENT"],
  optionalKeys: ["DB_HOST", "DB_CLIENT"],
  envContext() {
    return {
      database: {
        client: process.env.DB_CLIENT || "mysql",
        host: process.env.DB_HOST || "127.0.0.1",
        name: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASS!,
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
            await client.table("meta").insert({ version: 1 })
          }
          let oldVersion: number = (await client
            .table("meta")
            .select("version"))[0].version
          await client.transaction(async trx => {
            await opts.migration(trx, oldVersion, opts.currentVersion)
          })
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
}
