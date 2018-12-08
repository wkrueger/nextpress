import knex = require("knex")
import { createContextMapper } from ".."

export interface Migration {
  version: number
  upgrade: (trx: knex.Transaction) => Promise<void>
  downgrade: (trx: knex.Transaction) => Promise<void>
}

export const customKnexContext = (extraOpts: knex.Config = {}) =>
  createContextMapper({
    id: "default.knex",
    envKeys: ["DB_NAME", "DB_USER", "DB_PASS", "DB_HOST", "DB_CLIENT"],
    optionalKeys: ["DB_HOST", "DB_CLIENT"],
    envContext({ getKey }) {
      return {
        database: {
          /* from environment variables */
          client: getKey("DB_CLIENT") || "mysql",
          host: getKey("DB_HOST") || "127.0.0.1",
          name: getKey("DB_NAME")!,
          user: getKey("DB_USER")!,
          password: getKey("DB_PASS")!,

          /* versions and members */
          _currentFwVersion: 3,
          _oldFwVersion: 0,
          _db: (undefined as any) as knex,

          /* custom migrations */
          async init(opts: { migrations?: Migration[] }) {
            opts.migrations = opts.migrations || []
            const client = this.db()
            //const CURRENT_FW_VERSION = this._currentFwVersion
            let oldFwVersion = 0
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
            let { version: oldVersion } = (await client.table("meta").select("version"))[0]
            this._oldFwVersion = oldFwVersion
            this._checkMigrationVersions(opts.migrations)
            await client.transaction(async trx => {
              let lastVersion = oldVersion
              for (let x = 0; x < opts.migrations!.length; x++) {
                const migration = opts.migrations![x]
                if (migration.version <= oldVersion) continue
                else {
                  try {
                    await migration.upgrade(trx)
                    lastVersion = migration.version
                  } catch (err) {
                    await migration.downgrade(trx)
                    throw err
                  }
                }
              }
              await client
                .table("meta")
                .update({ version: lastVersion, fwVersion: this._currentFwVersion })
            })
          },

          /* db singleton access */
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
                },
                ...extraOpts
              })
            }
            return this._db
          },

          _checkMigrationVersions(migrations: Migration[]) {
            let version = 0
            for (let x = 0; x < migrations.length; x++) {
              const migration = migrations[x]
              if (migration.version > version) version = migration.version
              else throw Error("Error in the megrations versions sequence.")
            }
          }
        }
      }
    }
  })

export const knexContext = customKnexContext({})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof knexContext["envContext"]> {}
  }

  namespace Express {
    interface Request {
      transaction?: knex
    }
  }
}
