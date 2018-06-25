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
        this.checkSession = (req, res) => {
            if (!req.session)
                throw ono({ statusCode: 401 }, "Unauthorized");
            if (!req.session.user)
                throw ono({ statusCode: 401 }, "Unauthorized");
            res.setHeader("X-User-Id", req.session.user.id);
            res.setHeader("X-User-Email", req.session.user.email);
        };
        this.throwOnUnauthMw = (req, res, next) => {
            try {
                this.checkSession(req, res);
                next();
            }
            catch (err) {
                next(err);
            }
        };
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this._knex.schema.hasTable("user"))) {
                yield this._knex.schema.createTable("user", table => {
                    table.increments();
                    table.string("email", 30).unique();
                    table.string("auth", 80);
                    table.string("validationHash", 80);
                    table.string("resetPwdHash", 80);
                });
            }
        });
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
    userRoutes(Setup) {
        return __awaiter(this, void 0, void 0, function* () {
            const User = this;
            const { yup, withValidation } = Setup;
            const json = yield Setup.jsonRoutes((router) => __awaiter(this, void 0, void 0, function* () {
                Setup.jsonRouteDict(router, {
                    "/createuser": withValidation({
                        body: yup.object({
                            newUserEmail: yup.string().email(),
                            newUserPwd: yup.string().min(8),
                        }),
                    }, (req) => __awaiter(this, void 0, void 0, function* () {
                        yield User.create({
                            email: req.body.newUserEmail,
                            password: req.body.newUserPwd,
                        });
                        return { status: "OK" };
                    })),
                    "/login": withValidation({
                        body: yup.object({
                            existingUserEmail: yup.string().email(),
                            existingUserPwd: yup.string().min(8),
                        }),
                    }, (req) => __awaiter(this, void 0, void 0, function* () {
                        const user = yield User.find({
                            email: req.body.existingUserEmail,
                            password: req.body.existingUserPwd,
                        });
                        if (!user) {
                            throw ono({ statusCode: 401 }, "Could not authenticate with what you entered.");
                        }
                        req.session.user = { email: user.email, id: user.id };
                        return { status: "OK" };
                    })),
                    "/request-password-reset": withValidation({ body: yup.object({ email: yup.string().email() }) }, (req) => __awaiter(this, void 0, void 0, function* () {
                        yield User.createResetPwdRequest({ email: req.body.email });
                        return { status: "OK" };
                    })),
                    "/perform-password-reset": withValidation({
                        body: yup.object({
                            pwd1: yup.string().min(8),
                            pwd2: yup.string().min(8),
                            requestId: yup.string().required(),
                        }),
                    }, (req) => __awaiter(this, void 0, void 0, function* () {
                        yield User.performResetPwd(req.body);
                        return { status: "OK" };
                    })),
                    "/logout": Setup.withMethod("all", Setup.withMiddleware([User.throwOnUnauthMw], (req) => __awaiter(this, void 0, void 0, function* () {
                        req.session.user = undefined;
                        return { status: "OK" };
                    }))),
                });
            }));
            const html = yield Setup.htmlRoutes((router) => __awaiter(this, void 0, void 0, function* () {
                router.get(this._validateRoute(), Setup.tryMw((req, res) => __awaiter(this, void 0, void 0, function* () {
                    const hash = req.query.seq;
                    let user = yield User.validate(hash);
                    req.session.user = { id: user.id, email: user.email };
                    return this._renderSimpleMessage(Setup, req, res, "Success", "User validated.");
                })));
            }));
            return { json, html };
        });
    }
    _renderSimpleMessage(Setup, req, res, title, message) {
        return Setup.nextApp.render(req, res, "/auth/message", {
            title: message,
            content: message,
        });
    }
    _validationMailHTML(i) {
        return `<p>Hi! ${i.address}.</p>
      <p>Follow this link to validate your account: 
      <a href="${i.validationLink}">${i.validationLink}</a>.</p>`;
    }
    /**
     * Overrideable.
     * The route to be used for user creation validation email.
     */
    _validateRoute() {
        return "/auth/validate";
    }
    /**
     * Overrideable.
     * The route to be used for user reset password email.
     */
    _passwordResetFormRoute() {
        return "/auth/password-reset-form";
    }
    _createValidationLink(hash) {
        return `${this.ctx.website.root}${this._validateRoute()}?seq=${encodeURIComponent(hash)}`;
    }
    _createResetPasswordLink(seq) {
        return `${this.ctx.website.root}${this._passwordResetFormRoute()}?requestId=${encodeURIComponent(seq)}`;
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