"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = require("yup");
const uuid_1 = require("uuid");
const ono = require("ono");
const day = require("dayjs");
const user_stores_1 = require("./user-stores");
const timed_queue_1 = require("./timed-queue");
const messages_1 = require("../messages/messages");
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
        .min(3)
        .required(),
    pwd2: Yup.string()
        .min(3)
        .required(),
    requestId: Yup.string()
        .min(36)
        .max(36)
        .required()
});
class UserAuth {
    constructor(ctx) {
        this.ctx = ctx;
        this.schema_createUser = Yup.object({
            username: Yup.string().required(),
            email: Yup.string()
                .email()
                .required(),
            password: Yup.string()
                .min(3)
                .required()
        });
        this.sendMail = this.ctx.email && this.ctx.email.sendMail;
        this.options = {
            skipNewUserValidation: false
        };
        this.checkSession = async (req) => {
            if (!req.nextpressAuth)
                throw ono({ statusCode: 401 }, "Unauthorized");
            let user = await req.nextpressAuth.getUser();
            if (!user)
                throw ono({ statusCode: 401 }, "Unauthorized");
            //res.setHeader("X-User-Id", req.session.user.id)
            //res.setHeader("X-User-Email", req.session.user.email)
        };
        this.throwOnUnauthMw = async (req, res, next) => {
            try {
                await this.checkSession(req, res, next);
                next();
            }
            catch (err) {
                next(err);
            }
        };
        ctx.requireContext("default.website");
        if (this.ctx.loadedContexts.has("default.knex")) {
            this.userStore = new user_stores_1.KnexStore(ctx);
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
    async init() {
        if (!this.userStore) {
            throw Error("UserAuth: No store found. Either setup the supported" +
                "contexts (knex) or provide your own userStore implementation.");
        }
        await this.userStore.initStore();
        await this.userStore.routineCleanup();
    }
    async checkAndUpdateUserRequestCap(userId, seconds) {
        if (!userId)
            throw Error(messages_1.messages.invalid_input);
        let lastReq = await this.userStore.getLastRequest(userId);
        if (!lastReq ||
            day(lastReq)
                .add(seconds, "second")
                .isBefore(day())) {
            await this.userStore.writeLastRequest(userId);
            return;
        }
        else {
            throw Error(messages_1.messages.try_again_in_a_few_seconds);
        }
    }
    async create(inp, opts = {
        askForValidation: true,
        extraFields: {}
    }) {
        if (this.options.skipNewUserValidation) {
            opts.askForValidation = false;
        }
        this.schema_createUser.validateSync(Object.assign({}, (opts.extraFields || {}), inp), { strict: true });
        const auth = await this.bcrypt.hash(inp.password, 10);
        let validationExpires = opts.askForValidation
            ? day()
                .add(2, "hour")
                .toDate()
            : null;
        let pkey = await this.userStore.writeNewUser({
            email: inp.email,
            username: inp.username,
            auth,
            validationHash: null,
            validationExpires
        }, opts.extraFields || {});
        if (opts.askForValidation) {
            try {
                await this.sendNewValidationEmail(pkey);
            }
            catch (err) {
                //fixme use transaction
                await this.userStore.deleteUserId(pkey);
                throw err;
            }
        }
        return pkey;
    }
    async sendNewValidationEmail(userId) {
        let user = await this.userStore.queryUserById(userId);
        if (!user)
            throw Error(messages_1.messages.user_not_found);
        const validationHash = uuid_1.v4();
        const link = this._createValidationLink(validationHash);
        await this.userStore.setValidationHash(userId, validationHash);
        if (!this.sendMail) {
            throw Error("No email setup provided.");
        }
        await this.sendMail({
            email: user.email,
            subject: this._validationMailSubject(),
            html: await this._validationMailHTML({
                address: user.email,
                validationLink: link
            }),
            attachment: (await this._validationMailAttachment()) || undefined
        });
    }
    async validateHash(hash) {
        if (!hash)
            throw Error(messages_1.messages.invalid_hash);
        const found = await this.userStore.queryUserByValidationHash(hash);
        if (!found)
            throw Error(messages_1.messages.invalid_hash);
        await this.userStore.clearValidationHash(found.id);
        return { id: found.id, email: found.email };
    }
    async validateLogin(inp) {
        const schema = Yup.object({
            username: Yup.string()
                .min(4)
                .required(),
            password: Yup.string()
                .min(3)
                .required()
        });
        schema.validateSync(inp);
        const user = await this.userStore.queryUserByName(inp.username);
        if (!user)
            return undefined;
        const check = await this.bcrypt.compare(inp.password, user.auth);
        if (user.validationHash)
            throw Error(messages_1.messages.validate_email_first);
        return check ? user : undefined;
    }
    async createResetPwdRequest(inp) {
        emailSchema.validateSync(inp);
        const requestId = uuid_1.v4();
        const user = await this.userStore.queryUserByEmail(inp.email);
        if (!user)
            throw Error(messages_1.messages.user_not_found);
        const storeId = this.userStore.writeResetPwdRequest(user.id, requestId, day()
            .add(2, "hour")
            .toDate());
        const link = this._createResetPasswordLink(requestId);
        if (storeId) {
            if (!this.sendMail) {
                throw Error("No email setup provided.");
            }
            await this.sendMail({
                email: inp.email,
                subject: this._resetPwdMailSubject(),
                html: await this._resetPwdMailHTML({
                    address: inp.email,
                    validationLink: link
                })
            });
        }
    }
    async findResetPwdRequest(inp) {
        requestIdSchema.validateSync(inp);
        const found = await this.userStore.queryUserByResetPasswordHash(inp.requestId);
        return found ? true : false;
    }
    async performResetPwd(inp) {
        pwdRequestSchema.validateSync(inp);
        const found = await this.findResetPwdRequest({ requestId: inp.requestId });
        if (!found)
            throw Error(messages_1.messages.invalid_request);
        if (inp.pwd1 !== inp.pwd2)
            throw Error(messages_1.messages.password_confirmation_failed);
        await this.userStore.writeNewPassword(inp.requestId, await this.bcrypt.hash(inp.pwd1, 10));
    }
    /**
     * overrideable (default is 10 reqs / 10 secs per route)
     * this counts all the requests this server receives
     */
    _getRequestThrottleMws() {
        return {
            createUser: timed_queue_1.timedQueueMw(),
            login: timed_queue_1.timedQueueMw(30, 10000),
            requestReset: timed_queue_1.timedQueueMw(),
            performReset: timed_queue_1.timedQueueMw()
        };
    }
    /**
     * overrideable
     * this is a per-user time limit for the operations
     */
    _getPerUserWaitTime() {
        return {
            login: 2,
            requestPasswordReset: 10
        };
    }
    async loginRoute({ username, password }, setUser, mapUser = (u) => ({ email: u.email, id: u.id })) {
        const user = await this.userStore.queryUserByName(username);
        if (!user) {
            throw ono({ statusCode: 401, code: "UNAUTHORIZED" }, "Could not authenticate with what you entered.");
        }
        await this.checkAndUpdateUserRequestCap(user.id, this._getPerUserWaitTime().login);
        const found = await this.validateLogin({
            username: user.username,
            password
        });
        if (!found) {
            throw ono({ statusCode: 401, code: "UNAUTHORIZED" }, "Could not authenticate with what you entered.");
        }
        const token = await setUser(mapUser(found));
        return { id: user.id, token };
    }
    userJsonMethods(helper) {
        const queues = this._getRequestThrottleMws();
        const { route, yup } = helper;
        const User = this;
        return {
            "/createUser": route({
                middleware: [queues.createUser],
                validation: {
                    body: yup.object({
                        newUsername: yup.string().required(),
                        newUserEmail: yup
                            .string()
                            .email()
                            .required(),
                        newUserPwd: yup.string().min(3)
                    })
                }
            }).handler(async (req) => {
                await User.create({
                    username: req.body.newUsername,
                    email: req.body.newUserEmail,
                    password: req.body.newUserPwd
                });
                return { status: "OK" };
            }),
            "/login": route({
                middleware: [queues.login],
                validation: {
                    body: yup.object({
                        username: yup.string().required(),
                        password: yup
                            .string()
                            .min(3)
                            .required()
                    })
                }
            }).handler(async (req) => {
                return this.loginRoute({ username: req.body.username, password: req.body.password }, req.nextpressAuth.setUser.bind(req.nextpressAuth));
            }),
            "/request-password-reset": route({
                middleware: [queues.requestReset],
                validation: { body: yup.object({ email: yup.string().email() }) }
            }).handler(async (req) => {
                const user = await this.userStore.queryUserByEmail(req.body.email);
                if (!user)
                    throw Error(messages_1.messages.not_found);
                await this.checkAndUpdateUserRequestCap(user.id, this._getPerUserWaitTime().requestPasswordReset);
                await User.createResetPwdRequest({ email: req.body.email });
                return { status: "OK" };
            }),
            "/perform-password-reset": route({
                middleware: [queues.performReset],
                validation: {
                    body: yup.object({
                        pwd1: yup.string().min(3),
                        pwd2: yup.string().min(3),
                        requestId: yup.string().required()
                    })
                }
            }).handler(async (req) => {
                await User.performResetPwd(req.body);
                return { status: "OK" };
            }),
            "/logout": route({
                method: "all",
                middleware: [User.throwOnUnauthMw]
            }).handler(async (req) => {
                if (req.nextpressAuth)
                    await req.nextpressAuth.logout();
                return { status: "OK" };
            })
        };
    }
    async userRoutes(routerBuilder) {
        const User = this;
        const json = await routerBuilder.rpcishJsonRouter(this.userJsonMethods.bind(this));
        const html = await routerBuilder.createHtmlRouter(async ({ router }) => {
            router.get(this._validateRoute(), async (req, res) => {
                try {
                    const hash = req.query.seq;
                    let user = await User.validateHash(hash);
                    req.nextpressAuth.setUser({ id: user.id, email: user.email });
                    this._renderSimpleMessage(routerBuilder.server, req, res, {
                        title: messages_1.messages.success,
                        message: messages_1.messages.user_validated,
                        type: "VALIDATION"
                    });
                }
                catch (err) {
                    this._renderSimpleMessage(routerBuilder.server, req, res, {
                        title: messages_1.messages.error,
                        message: err.message,
                        type: "ERROR"
                    });
                }
            });
            router.get(this._passwordResetFormRoute(), async (req, res) => {
                try {
                    routerBuilder.server.getNextApp().render(req, res, this._passwordResetFormRoute(), {
                        requestId: req.query.requestId
                    });
                }
                catch (err) {
                    this._renderSimpleMessage(routerBuilder.server, req, res, {
                        title: "Error",
                        message: err.message,
                        type: "ERROR"
                    });
                }
            });
        }, { noNextJs: true });
        return { json, html };
    }
    _renderSimpleMessage(server, req, res, opts) {
        return server.getNextApp().render(req, res, "/auth/message", {
            title: opts.title,
            content: opts.message,
            type: opts.type,
            code: opts.code
        });
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
    async _validationMailHTML(i) {
        return `<p>Hi! ${i.address}.</p>
      <p>Follow this link to validate your account: 
      <a href="${i.validationLink}">${i.validationLink}</a>.</p>`;
    }
    async _validationMailAttachment() { }
    async _resetPwdMailHTML(i) {
        return `
      <p>Hello, ${i.address},
      </p><p>Follow this link to proceed your password reset.</p>
      <p><a href="${i.validationLink}">${i.validationLink}</a></p>`;
    }
    _resetPwdMailSubject() {
        return "password reset";
    }
    _validationMailSubject() {
        return "New account";
    }
}
exports.UserAuth = UserAuth;
//# sourceMappingURL=index.js.map