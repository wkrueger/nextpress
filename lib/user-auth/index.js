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
const ono = require("ono");
const day = require("dayjs");
const router_builder_1 = require("../server/router-builder");
const user_stores_1 = require("./user-stores");
const createUserSchema = Yup.object({
    email: Yup.string()
        .email()
        .required(),
    password: Yup.string()
        .min(8)
        .required()
});
const emailSchema = Yup.object({
    email: Yup.string()
        .email()
        .required()
});
const requestIdSchema = Yup.object({
    requestId: Yup.string()
        .min(36)
        .max(36)
        .required()
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
        .required()
});
class UserAuth {
    constructor(ctx) {
        this.ctx = ctx;
        this.sendMail = this.ctx.email.sendMail;
        this.checkSession = req => {
            if (!req.session)
                throw ono({ statusCode: 401 }, "Unauthorized");
            if (!req.session.user)
                throw ono({ statusCode: 401 }, "Unauthorized");
            //res.setHeader("X-User-Id", req.session.user.id)
            //res.setHeader("X-User-Email", req.session.user.email)
        };
        this.throwOnUnauthMw = (req, res, next) => {
            try {
                this.checkSession(req, res, next);
                next();
            }
            catch (err) {
                next(err);
            }
        };
        ctx.requireContext("default.website");
        if (this.ctx.loadedContexts.has("default.knex")) {
            this.userStore = new user_stores_1.KnexStore(ctx.database.db());
        }
        if (!this.sendMail) {
            console.warn("UserAuth: No sendMail implementation provided.");
        }
    }
    get bcrypt() {
        if (this._bcrypt)
            return this._bcrypt;
        this._bcrypt = require("bcrypt");
        return this._bcrypt;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.userStore) {
                throw Error("UserAuth: No store found. Either setup the supported" +
                    "contexts (knex) or provide your own userStore implementation.");
            }
            yield this.userStore.initStore();
            yield this.userStore.routineCleanup();
        });
    }
    checkAndUpdateUserRequestCap(email, seconds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!email)
                throw Error("Invalid input.");
            let lastReq = yield this.userStore.getLastRequest(email);
            if (!lastReq ||
                day(lastReq)
                    .add(seconds, "second")
                    .isBefore(day())) {
                yield this.userStore.writeLastRequest(email, new Date());
                return;
            }
            else {
                throw Error("Try again in a few seconds.");
            }
        });
    }
    create(inp, opts = { askForValidation: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            createUserSchema.validateSync(inp, { strict: true });
            const pwdHash = yield this.bcrypt.hash(inp.password, 10);
            const validationHash = opts.askForValidation ? uuid_1.v4() : null;
            let expireDate = opts.askForValidation
                ? day()
                    .add(2, "hour")
                    .toDate()
                : null;
            let pkey = yield this.userStore.writeNewUser({
                email: inp.email,
                auth: pwdHash,
                validationHash,
                validationExpires: expireDate
            });
            if (opts.askForValidation) {
                try {
                    const link = this._createValidationLink(validationHash);
                    yield this.sendMail({
                        email: inp.email,
                        subject: this._newAccountEmailSubject(),
                        html: this._validationMailHTML({
                            address: inp.email,
                            validationLink: link
                        })
                    });
                }
                catch (err) {
                    //fixme use transaction
                    yield this.userStore.deleteUserId(pkey);
                    throw err;
                }
            }
        });
    }
    validate(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!hash)
                throw Error("Invalid hash.");
            const found = yield this.userStore.queryUserByValidationHash(hash);
            if (!found)
                throw Error("Invalid hash.");
            yield this.userStore.clearValidationHash(found.id);
            return { id: found.id, email: found.email };
        });
    }
    find(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            createUserSchema.validateSync(inp, { strict: true });
            const user = yield this.userStore.queryUserByEmail(inp.email);
            if (!user)
                return undefined;
            const check = yield this.bcrypt.compare(inp.password, user.auth);
            if (user.validationHash)
                throw Error("User needs to validate his email first.");
            return check ? { id: user.id, email: user.email } : undefined;
        });
    }
    createResetPwdRequest(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            emailSchema.validateSync(inp);
            const requestId = uuid_1.v4();
            const storeId = this.userStore.writeResetPwdRequest(inp.email, requestId, day()
                .add(2, "hour")
                .toDate());
            const link = this._createResetPasswordLink(requestId);
            if (storeId) {
                yield this.sendMail({
                    email: inp.email,
                    subject: this._pwdResetEmailSubject(),
                    html: this._resetPwdMailHTML({
                        address: inp.email,
                        validationLink: link
                    })
                });
            }
        });
    }
    findResetPwdRequest(inp) {
        return __awaiter(this, void 0, void 0, function* () {
            requestIdSchema.validateSync(inp);
            const found = yield this.userStore.queryUserByResetPasswordHash(inp.requestId);
            return found ? true : false;
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
            yield this.userStore.writeNewPassword(inp.requestId, yield this.bcrypt.hash(inp.pwd1, 10));
        });
    }
    /**
     * overrideable (default is 10 reqs / 10 secs per route)
     * this counts all the requests this server receives
     */
    _getRequestThrottleMws() {
        return {
            createUser: timedQueueMw(),
            login: timedQueueMw(30, 10000),
            requestReset: timedQueueMw(),
            performReset: timedQueueMw()
        };
    }
    /**
     * overrideable
     * this is a per-user time limit for the operations
     */
    _getPerUserWaitTime() {
        return {
            login: 5,
            requestPasswordReset: 15
        };
    }
    userRoutes(routerBuilder) {
        return __awaiter(this, void 0, void 0, function* () {
            const User = this;
            const queues = this._getRequestThrottleMws();
            const json = yield routerBuilder.createJsonRouterFromDict(({ withMiddleware, withMethod, withValidation, yup }) => ({
                "/createuser": withMiddleware([queues.createUser], withValidation({
                    body: yup.object({
                        newUserEmail: yup.string().email(),
                        newUserPwd: yup.string().min(8)
                    })
                }, (req) => __awaiter(this, void 0, void 0, function* () {
                    yield User.create({
                        email: req.body.newUserEmail,
                        password: req.body.newUserPwd
                    });
                    return { status: "OK" };
                }))),
                "/login": withMiddleware([queues.login], withValidation({
                    body: yup.object({
                        existingUserEmail: yup.string().email(),
                        existingUserPwd: yup.string().min(8)
                    })
                }, (req) => __awaiter(this, void 0, void 0, function* () {
                    yield this.checkAndUpdateUserRequestCap(req.body.existingUserEmail, this._getPerUserWaitTime().login);
                    const user = yield User.find({
                        email: req.body.existingUserEmail,
                        password: req.body.existingUserPwd
                    });
                    if (!user) {
                        throw ono({ statusCode: 401 }, "Could not authenticate with what you entered.");
                    }
                    req.session.user = { email: user.email, id: user.id };
                    return { status: "OK" };
                }))),
                "/request-password-reset": withMiddleware([queues.requestReset], withValidation({ body: yup.object({ email: yup.string().email() }) }, (req) => __awaiter(this, void 0, void 0, function* () {
                    yield this.checkAndUpdateUserRequestCap(req.body.email, this._getPerUserWaitTime().requestPasswordReset);
                    yield User.createResetPwdRequest({ email: req.body.email });
                    return { status: "OK" };
                }))),
                "/perform-password-reset": withMiddleware([queues.performReset], withValidation({
                    body: yup.object({
                        pwd1: yup.string().min(8),
                        pwd2: yup.string().min(8),
                        requestId: yup.string().required()
                    })
                }, (req) => __awaiter(this, void 0, void 0, function* () {
                    yield User.performResetPwd(req.body);
                    return { status: "OK" };
                }))),
                "/logout": withMethod("all", withMiddleware([User.throwOnUnauthMw], (req) => __awaiter(this, void 0, void 0, function* () {
                    yield new Promise(res => {
                        req.session.destroy(res);
                    });
                    return { status: "OK" };
                })))
            }));
            const html = yield routerBuilder.createHtmlRouter(({ router }) => __awaiter(this, void 0, void 0, function* () {
                router.get(this._validateRoute(), router_builder_1.RouterBuilder.tryMw((req, res) => __awaiter(this, void 0, void 0, function* () {
                    const hash = req.query.seq;
                    let user = yield User.validate(hash);
                    req.session.user = { id: user.id, email: user.email };
                    return this._renderSimpleMessage(routerBuilder.server, req, res, "Success", "User validated.");
                })));
            }));
            return { json, html };
        });
    }
    _renderSimpleMessage(server, req, res, title, message) {
        return server.getNextApp().render(req, res, "/auth/message", {
            title: title,
            content: message
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
//# sourceMappingURL=index.js.map