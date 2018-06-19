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
const Yup = require("yup");
const uuid_1 = require("uuid");
const bcrypt = require("bcrypt");
const ono = require("ono");
const createUserSchema = Yup.object({
    email: Yup.string()
        .email()
        .required(),
    password: Yup.string()
        .min(8)
        .required(),
});
const emailSchema = Yup.object({
    email: Yup.string()
        .email()
        .required(),
});
const requestIdSchema = Yup.object({
    requestId: Yup.string()
        .min(36)
        .max(36)
        .required(),
});
const pwdRequestSchema = Yup.object({
    pwd1: Yup.string()
        .min(8)
        .required(),
    pwd2: Yup.string()
        .min(8)
        .required(),
    requestId: Yup.string()
        .min(36)
        .max(36)
        .required(),
});
class UserAuth {
    constructor(ctx, _knex) {
        this.ctx = ctx;
        this._knex = _knex;
    }
    userTable() {
        return this._knex("user");
    }
    create(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            createUserSchema.validateSync(inp, { strict: true });
            const pwdHash = yield bcrypt.hash(inp.password, 10);
            const validationHash = uuid_1.v4();
            try {
                var [pkey] = yield this.userTable()
                    .insert({ email: inp.email, auth: pwdHash, validationHash })
                    .into("user");
            }
            catch (err) {
                if ((err.errno || "") === 1062) {
                    err.message = "";
                    throw ono(err, { statusCode: 400 }, "This user already exists.");
                }
            }
            try {
                const link = this._createValidationLink(validationHash);
                yield this.ctx.mailgun.sendMail({
                    email: inp.email,
                    subject: this._newAccountEmailSubject(),
                    html: this._validationMailHTML({ address: inp.email, validationLink: link }),
                });
            }
            catch (err) {
                yield this.userTable()
                    .where({ id: pkey })
                    .delete();
                throw err;
            }
        });
    }
    validate(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!hash)
                throw Error("Invalid hash.");
            const users = yield this.userTable()
                .select()
                .where({ validationHash: hash });
            if (!users.length)
                throw Error("Invalid hash.");
            const found = users[0];
            yield this.userTable()
                .update({ validationHash: null })
                .where({ id: found.id });
            return { id: found.id, email: found.email };
        });
    }
    find(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            createUserSchema.validateSync(inp, { strict: true });
            const users = yield this.userTable()
                .select("id", "email", "auth", "validationHash")
                .where({ email: inp.email });
            if (!users.length)
                return undefined;
            const check = yield bcrypt.compare(inp.password, users[0].auth);
            if (users[0].validationHash)
                throw Error("User needs to validate his email first.");
            return check ? { id: users[0].id, email: users[0].email } : undefined;
        });
    }
    createResetPwdRequest(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            emailSchema.validateSync(inp);
            const requestId = uuid_1.v4();
            const ids = yield this.userTable()
                .where({ email: inp.email })
                .update({ resetPwdHash: requestId });
            const link = this._createResetPasswordLink(requestId);
            if (ids || ids.length) {
                yield this.ctx.mailgun.sendMail({
                    email: inp.email,
                    subject: this._pwdResetEmailSubject(),
                    html: this._resetPwdMailHTML({ address: inp.email, validationLink: link }),
                });
            }
        });
    }
    findResetPwdRequest(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            requestIdSchema.validateSync(inp);
            const found = yield this.userTable()
                .select("id")
                .where({ resetPwdHash: inp.requestId });
            return found.length ? true : false;
        });
    }
    performResetPwd(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            pwdRequestSchema.validateSync(inp);
            const found = yield this.findResetPwdRequest({ requestId: inp.requestId });
            if (!found)
                throw Error("Invalid request");
            if (inp.pwd1 !== inp.pwd2)
                throw Error("Password confirmation failed.");
            yield this.userTable()
                .update({ resetPwdHash: null, auth: yield bcrypt.hash(inp.pwd1, 10) })
                .where({ resetPwdHash: inp.requestId });
        });
    }
    _validationMailHTML(i) {
        return `<p>Hi! ${i.address}.</p>
      <p>Follow this link to validate your account: 
      <a href="${i.validationLink}">${i.validationLink}</a>.</p>`;
    }
    _createValidationLink(hash) {
        return `${this.ctx.website.root}/validate?seq=${encodeURIComponent(hash)}`;
    }
    _createResetPasswordLink(seq) {
        return `${this.ctx.website.root}/forgot-password?seq=${encodeURIComponent(seq)}`;
    }
    _resetPwdMailHTML(i) {
        return `
      <p>Hello, ${i.address},
      </p><p>Follow this link to proceed your password reset.</p>
      <p><a href="${i.validationLink}">${i.validationLink}</a></p>`;
    }
    _pwdResetEmailSubject() {
        return "password reset";
    }
    _newAccountEmailSubject() {
        return "New account";
    }
}
exports.UserAuth = UserAuth;
//# sourceMappingURL=user-auth.js.map