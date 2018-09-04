"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="../../types/global.types.d.ts"/>
const expressMod = require("express");
const morgan = require("morgan");
const expressSession = require("express-session");
const jwt = require("jsonwebtoken");
const rimraf = require("rimraf");
const util_1 = require("util");
const path_1 = require("path");
const router_builder_1 = require("./router-builder");
const helmet = require("helmet");
class Server {
    constructor(ctx, isProduction = process.env.NODE_ENV === "production") {
        this.ctx = ctx;
        this.isProduction = isProduction;
        this.options = {
            errorRoute: "/error",
            useNextjs: true,
            useSession: true,
            useJwt: false,
            jwtOptions: {
                tokenHeader: "authorization",
                tokenDuration: 60 * 60 * 24 * 5,
            },
            bundleAnalyzer: {
                analyzeServer: false,
                analyzeBrowser: true,
            },
        };
        if (!ctx.loadedContexts.has("default.website")) {
            throw Error("Server required the default.website context to be used.");
        }
    }
    getNextApp() {
        if (!this._nextApp) {
            if (!this.options.useNextjs) {
                throw Error("options.useNextJs is set to false.");
            }
            const nextjs = require("next");
            this._nextApp = nextjs({
                dev: !this.isProduction,
                dir: this.ctx.projectRoot,
                conf: this.getNextjsConfig(),
            });
        }
        return this._nextApp;
    }
    async buildForProduction() {
        console.log("Building for production...");
        const nextBuild = require("next/dist/build").default;
        await util_1.promisify(rimraf)(path_1.resolve(this.ctx.projectRoot, ".next"));
        await nextBuild(this.ctx.projectRoot, this.getNextjsConfig());
        if (global.gc) {
            global.gc();
        }
    }
    /**
     * all set, run
     */
    async run() {
        if (this.isProduction && this.options.useNextjs) {
            await this.buildForProduction();
        }
        const expressApp = expressMod();
        await this.setupGlobalMiddleware(expressApp);
        await this.setupRoutes({ app: expressApp });
        return new Promise(resolve => {
            const nodeServer = expressApp.listen(this.ctx.website.port, () => {
                console.log("Server running on " + this.ctx.website.port);
                resolve(nodeServer);
            });
        });
    }
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    async setupRoutes({ app }) {
        const builder = new router_builder_1.RouterBuilder(this);
        app.use(await builder.createHtmlRouter());
    }
    async setupGlobalMiddleware(expressApp) {
        if (this.options.useNextjs) {
            await this.getNextApp().prepare();
        }
        if (this.ctx.website.logRequests) {
            expressApp.use(morgan("short"));
        }
        if (this.ctx.website.useCompression && this.isProduction) {
            const compression = require("compression");
            expressApp.use(compression());
        }
        if (this.options.useSession) {
            const store = this.createSessionStore();
            const sessionMw = this.createSessionMw(store);
            expressApp.use(sessionMw);
            const authMw = this.createAuthMw_Session();
            expressApp.use(authMw);
        }
        if (this.options.useJwt) {
            if (!this.ctx.jwt)
                throw Error("useJwt requires a jwt contextMapper.");
            const authMw = this.createAuthMw_Jwt();
            expressApp.use(authMw);
        }
        const robotsPath = path_1.resolve(this.ctx.projectRoot, "static", "robots.txt");
        expressApp.get("/robots.txt", (_, response) => {
            response.sendFile(robotsPath);
        });
        expressApp.use(helmet());
        return expressApp;
    }
    /**
     * the next.config.js
     */
    getNextjsConfig() {
        const withCSS = require("@zeit/next-css");
        const withSass = require("@zeit/next-sass");
        const LodashPlugin = require("lodash-webpack-plugin");
        const withTypescript = require("@zeit/next-typescript");
        let that = this;
        const opts = {
            webpack(config, options) {
                // Do not run type checking twice:
                if (options.isServer && !that.isProduction) {
                    const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
                    config.plugins.push(new ForkTsCheckerWebpackPlugin());
                }
                config.plugins.push(new LodashPlugin());
                return config;
            },
        };
        let out = this.isProduction
            ? withTypescript(withCSS(withSass(opts)))
            : withSass(withTypescript(withCSS(opts)));
        if (this.ctx.website.bundleAnalyzer) {
            const withBundleAnalyzer = require("@zeit/next-bundle-analyzer");
            out = withBundleAnalyzer(Object.assign({}, out, this.options.bundleAnalyzer));
        }
        return out;
    }
    createSessionStore() {
        if (this.ctx.loadedContexts.has("default.redis")) {
            const redisMod = require("connect-redis");
            const StoreConstructor = redisMod(expressSession);
            return new StoreConstructor({
                client: this.ctx.redis.instance(),
            });
        }
        if (this.ctx.loadedContexts.has("default.database")) {
            const knexMod = require("connect-session-knex");
            const StoreConstructor = knexMod(expressSession);
            return new StoreConstructor({
                knex: this.ctx.database.db(),
            });
        }
    }
    createSessionMw(store) {
        return expressSession({
            secret: this.ctx.website.sessionSecret,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7,
            },
            resave: false,
            saveUninitialized: false,
            store,
        });
    }
    createAuthMw_Session() {
        const out = (req, _, next) => {
            req.nextpressAuth = new UserAuthSession(req);
            next();
        };
        return out;
    }
    createAuthMw_Jwt() {
        const out = (req, _, next) => {
            req.nextpressAuth = new UserAuthJwt(req, {
                headerKey: this.options.jwtOptions.tokenHeader,
                durationSeconds: this.options.jwtOptions.tokenDuration,
                secret: this.ctx.jwt.secret,
            });
            next();
        };
        return out;
    }
}
exports.Server = Server;
class UserAuthSession {
    constructor(req) {
        this.req = req;
    }
    async getUser() {
        return (this.req.session && this.req.session.user) || undefined;
    }
    async setUser(user) {
        if (!this.req.session) {
            throw Error("Session not present.");
        }
        this.req.session.user = user;
        return "";
    }
    async logout() {
        await new Promise(res => {
            this.req.session.destroy(res);
        });
    }
}
class UserAuthJwt {
    constructor(req, opts) {
        this.req = req;
        this.opts = opts;
    }
    async getUser() {
        if (this._user)
            return this._user;
        const token = this.req.headers[this.opts.headerKey.toLowerCase()];
        if (!token || token === "undefined")
            return undefined;
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, this.opts.secret, (err, resp) => {
                if (err) {
                    err.statusCode = 401;
                    return reject(err);
                }
                return resolve(resp);
            });
        });
        return decoded;
    }
    async setUser(user) {
        if (this._user)
            throw Error("User already set.");
        const token = await new Promise((resolve, reject) => {
            jwt.sign(user, this.opts.secret, { expiresIn: this.opts.durationSeconds }, (err, token) => {
                if (err)
                    return reject(err);
                return resolve(token);
            });
        });
        this._user = user;
        return token;
    }
    async logout() {
        this._user = undefined;
    }
}
//# sourceMappingURL=index.js.map