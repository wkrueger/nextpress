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
exports.default = {
    id: "default.knex",
    envKeys: ["DB_NAME", "DB_USER", "DB_PASS", "DB_HOST", "DB_CLIENT"],
    optionalKeys: ["DB_HOST", "DB_CLIENT"],
    envContext() {
        return {
            database: {
                client: process.env.DB_CLIENT || "mysql",
                host: process.env.DB_HOST || "127.0.0.1",
                name: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                _db: undefined,
                init(opts) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const client = this.db();
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
                        let oldVersion = (yield client
                            .table("meta")
                            .select("version"))[0].version;
                        yield client.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
                            yield opts.migration(trx, oldVersion, opts.currentVersion);
                        }));
                        yield client.table("meta").update({ version: opts.currentVersion });
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
};
//# sourceMappingURL=knex.js.map