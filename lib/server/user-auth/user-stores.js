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
const ono = require("ono");
class UserStore {
}
exports.UserStore = UserStore;
class KnexStore extends UserStore {
    constructor(_knex) {
        super();
        this._knex = _knex;
        this.userTableName = "user";
    }
    userTable() {
        return this._knex(this.userTableName);
    }
    initStore() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this._knex.schema.hasTable(this.userTableName))) {
                yield this._knex.schema.createTable(this.userTableName, table => {
                    table.increments();
                    table.string("email", 30).unique();
                    table.string("auth", 80);
                    table.string("validationHash", 80).nullable();
                    table.string("resetPwdHash", 80).nullable();
                    table.timestamp("validationExpires").nullable();
                    table.timestamp("resetPwdExpires").nullable();
                    table.timestamp("lastRequest").nullable();
                });
            }
        });
    }
    routineCleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            //dead users
            yield this.userTable()
                .whereNotNull("validationHash")
                .andWhere("validationExpires", "<", new Date())
                .delete();
            //dead password requests
            yield this.userTable()
                .whereNotNull("resetPwdHash")
                .andWhere("resetPwdExpires", "<", new Date())
                .update({ resetPwdHash: null, resetPwdExpires: null });
        });
    }
    getLastRequest(email) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userTable()
                .where({ email })
                .select("lastRequest");
            if (!result.length)
                return;
            let lastReq = result[0].lastRequest;
            return lastReq;
        });
    }
    writeLastRequest(email, date) {
        return __awaiter(this, void 0, void 0, function* () {
            this.userTable()
                .where({ email })
                .update({
                lastRequest: new Date()
            });
        });
    }
    writeNewUser(i) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var [pkey] = yield this.userTable()
                    .insert(i)
                    .into("user");
                return pkey;
            }
            catch (err) {
                if ((err.errno || "") === 1062) {
                    err.message = "";
                    throw ono(err, { statusCode: 400 }, "This user already exists.");
                }
            }
        });
    }
    deleteUserId(pkey) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.userTable()
                .where({ id: pkey })
                .delete();
        });
    }
    queryUserByValidationHash(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            let users = yield this.userTable()
                .select()
                .where({ validationHash: hash });
            return users[0];
        });
    }
    clearValidationHash(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.userTable()
                .update({ validationHash: null })
                .where({ id: userId });
        });
    }
    queryUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield this.userTable()
                .select("id", "email", "auth", "validationHash")
                .where({ email });
            return users[0];
        });
    }
    writeResetPwdRequest(email, hash, expires) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = yield this.userTable()
                .where({ email })
                .update({
                resetPwdHash: hash,
                resetPwdExpires: expires
            });
            return ids[0];
        });
    }
    queryUserByResetPasswordHash(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const found = yield this.userTable()
                .select("id")
                .where({ resetPwdHash: hash });
            return found[0];
        });
    }
    writeNewPassword(requestId, pwdhash) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.userTable()
                .update({
                resetPwdHash: null,
                auth: pwdhash
            })
                .where({ resetPwdHash: requestId });
        });
    }
}
exports.KnexStore = KnexStore;
//# sourceMappingURL=user-stores.js.map