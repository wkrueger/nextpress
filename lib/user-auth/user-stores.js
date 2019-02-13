"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ono = require("ono");
class UserStore {
}
exports.UserStore = UserStore;
class KnexStore extends UserStore {
    constructor(ctx) {
        super();
        this.ctx = ctx;
        this._knex = this.ctx.database.db();
        this.userTableName = "user";
        this.fields = ["id", "email", "username", "lastRequest", "auth", "validationHash", "displayName"];
    }
    userTable() {
        return this._knex(this.userTableName);
    }
    async initStore() {
        if (KnexStore.initRun)
            return;
        KnexStore.initRun = true;
        await this._knex.transaction(async (trx) => {
            if (!(await trx.schema.hasTable(this.userTableName))) {
                await trx.schema.createTable(this.userTableName, table => {
                    table.increments();
                    table
                        .string("email", 30)
                        .unique()
                        .notNullable();
                    table.string("auth", 80).notNullable();
                    //
                    table.string("validationHash", 80).nullable();
                    table.string("resetPwdHash", 80).nullable();
                    table.timestamp("validationExpires").nullable();
                    table.timestamp("resetPwdExpires").nullable();
                    table.timestamp("lastRequest").nullable();
                });
            }
            if (this.ctx.database._oldFwVersion < 2) {
                await trx.schema.alterTable(this.userTableName, table => {
                    table
                        .string("username", 30)
                        .unique()
                        .notNullable();
                });
                await trx.table(this.userTableName).update({
                    username: trx.raw("??", ["email"])
                });
            }
            if (this.ctx.database._oldFwVersion < 3) {
                await trx.schema.alterTable(this.userTableName, table => {
                    table.string("displayName", 50).nullable();
                });
            }
        });
    }
    async _queryUserById(id) {
        const user = await this.userTable()
            .select(this.fields)
            .where({ id });
        return user[0];
    }
    async routineCleanup() {
        //dead users
        await this.userTable()
            .whereNotNull("validationHash")
            .andWhere("validationExpires", "<", new Date())
            .delete();
        //dead password requests
        await this.userTable()
            .whereNotNull("resetPwdHash")
            .andWhere("resetPwdExpires", "<", new Date())
            .update({ resetPwdHash: null, resetPwdExpires: null });
    }
    async getLastRequest(id) {
        const user = await this._queryUserById(id);
        if (!user)
            return;
        return user.lastRequest;
    }
    async writeLastRequest(id) {
        return this.userTable()
            .where({ id })
            .update({
            lastRequest: new Date()
        });
    }
    async writeNewUser(i, extra = {}) {
        try {
            var [pkey] = await this.userTable()
                .insert(Object.assign({}, extra, i))
                .into("user");
            return pkey;
        }
        catch (err) {
            if ((err.errno || "") === 1062) {
                err.message = "";
                throw ono(err, { statusCode: 400 }, "This user already exists.");
            }
        }
    }
    async deleteUserId(pkey) {
        await this.userTable()
            .where({ id: pkey })
            .delete();
    }
    async queryUserByValidationHash(hash) {
        let users = await this.userTable()
            .select(...this.fields)
            .where({ validationHash: hash });
        return users[0];
    }
    async clearValidationHash(userId) {
        await this.userTable()
            .update({ validationHash: null })
            .where({ id: userId });
    }
    async queryUserByEmail(email) {
        const users = await this.userTable()
            //.select(...this.fields)
            .select()
            .where({ email });
        return users[0];
    }
    async writeResetPwdRequest(id, hash, expires) {
        const ids = await this.userTable()
            .where({ id })
            .update({
            resetPwdHash: hash,
            resetPwdExpires: expires
        });
        return ids[0];
    }
    async queryUserByResetPasswordHash(hash) {
        const found = await this.userTable()
            .select(...this.fields)
            .where({ resetPwdHash: hash });
        return found[0];
    }
    async writeNewPassword(requestId, pwdhash) {
        await this.userTable()
            .update({
            resetPwdHash: null,
            auth: pwdhash
        })
            .where({ resetPwdHash: requestId });
    }
    async queryUserByName(username) {
        let out = (await this.userTable()
            //.select(...this.fields)
            .select()
            .where({ username }))[0];
        if (!out && username.indexOf("@") !== -1) {
            out = await this.queryUserByEmail(username);
        }
        return out;
    }
}
KnexStore.initRun = false;
exports.KnexStore = KnexStore;
//# sourceMappingURL=user-stores.js.map