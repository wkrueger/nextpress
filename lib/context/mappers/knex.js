"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
                _currentFwVersion: 2,
                _oldFwVersion: 0,
                _db: undefined,
                init(opts) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const client = this.db();
                        const CURRENT_FW_VERSION = this._currentFwVersion;
                        let oldFwVersion = 0;
                        if (!(yield client.schema.hasTable("meta"))) {
                            yield client.schema.createTable("meta", table => {
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
                            yield client.table("meta").insert({ version: 1 });
                        }
                        else {
                            let { fwVersion } = (yield client.table("meta").select("fwVersion"))[0];
                            oldFwVersion = fwVersion;
                        }
                        let { version: oldVersion } = (yield client.table("meta").select("version"))[0];
                        this._oldFwVersion = oldFwVersion;
                        yield client.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
                            yield opts.migration(trx, oldVersion, opts.currentVersion);
                        }));
                        yield client
                            .table("meta")
                            .update({ version: opts.currentVersion, fwVersion: CURRENT_FW_VERSION });
                    });
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
                                database: ctx.name
                            }
                        });
                    }
                    return this._db;
                }
            }
        };
    }
});
//# sourceMappingURL=knex.js.map