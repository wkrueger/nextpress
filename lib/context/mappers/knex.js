"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const knex = require("knex");
const __1 = require("..");
exports.knexContext = __1.createContextMapper({
    id: "default.knex",
    envKeys: ["DB_NAME", "DB_USER", "DB_PASS", "DB_HOST", "DB_CLIENT"],
    optionalKeys: ["DB_HOST", "DB_CLIENT"],
    envContext({ getKey }) {
        return {
            database: {
                client: getKey("DB_CLIENT") || "mysql",
                host: getKey("DB_HOST") || "127.0.0.1",
                name: getKey("DB_NAME"),
                user: getKey("DB_USER"),
                password: getKey("DB_PASS"),
                _currentFwVersion: 3,
                _oldFwVersion: 0,
                _db: undefined,
                async init(opts) {
                    const client = this.db();
                    const CURRENT_FW_VERSION = this._currentFwVersion;
                    let oldFwVersion = 0;
                    if (!(await client.schema.hasTable("meta"))) {
                        await client.schema.createTable("meta", table => {
                            table.increments();
                            table
                                .integer("version")
                                .notNullable()
                                .defaultTo(1)
                                .unique();
                            table
                                .integer("fwVersion")
                                .notNullable()
                                .defaultTo(1);
                        });
                        await client.table("meta").insert({ version: 1 });
                    }
                    else {
                        let { fwVersion } = (await client.table("meta").select("fwVersion"))[0];
                        oldFwVersion = fwVersion;
                    }
                    let { version: oldVersion } = (await client.table("meta").select("version"))[0];
                    this._oldFwVersion = oldFwVersion;
                    await client.transaction(async (trx) => {
                        await opts.migration(trx, oldVersion, opts.currentVersion);
                    });
                    await client
                        .table("meta")
                        .update({ version: opts.currentVersion, fwVersion: CURRENT_FW_VERSION });
                },
                db() {
                    let ctx = this;
                    if (!this._db) {
                        this._db = knex({
                            client: ctx.client,
                            connection: {
                                host: ctx.host,
                                user: ctx.user,
                                password: ctx.password,
                                database: ctx.name,
                            },
                        });
                    }
                    return this._db;
                },
            },
        };
    },
});
//# sourceMappingURL=knex.js.map