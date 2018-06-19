import knex = require("knex")

export default {
  id: "default.database",
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
        _db: (undefined as any) as knex.QueryInterface,
        db() {
          let ctx = this
          if (!this._db) {
            this._db = knex({
              client: ctx.client,
              connection: {
                host: ctx.host,
                user: ctx.user,
                password: ctx.password,
                database: ctx.name,
              },
            })
          }
          return this._db
        },
      },
    }
  },
}
