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
const nextjs = require("next");
exports.nextjs = nextjs;
const express = require("express");
const morgan = require("morgan");
const expressSession = require("express-session");
const mysqlSession = require("express-mysql-session");
const url_1 = require("url");
var context_1 = require("./context");
exports.ContextFactory = context_1.default;
exports.contextPlugins = context_1.defaultPlugins;
class Server {
    constructor(ctx) {
        this.ctx = ctx;
        this.errorRoute = "/error";
        this.nextApp = nextjs({
            dev: process.env.NODE_ENV !== "production",
            dir: this.ctx.projectRoot,
            conf: this.nextConfig(),
        });
    }
    /**
     * this is meant to be overriden
     */
    routeSetup(app, helper) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    /**
     * all set, run
     */
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.nextApp.prepare();
            const expressApp = express();
            expressApp.use(morgan("short"));
            let store = undefined;
            if (this.ctx.database) {
                const StoreConstructor = mysqlSession(expressSession);
                store = new StoreConstructor({
                    user: this.ctx.database.user,
                    password: this.ctx.database.password,
                    database: this.ctx.database.name,
                });
            }
            const sessionMw = expressSession({
                secret: this.ctx.website.sessionSecret,
                cookie: {
                    maxAge: 1000 * 60 * 60 * 24 * 7,
                },
                resave: false,
                saveUninitialized: false,
                store,
            });
            //fixme optional and scoped middleware
            expressApp.use(sessionMw);
            yield this.routeSetup(expressApp, this._routeSetupHelper());
            expressApp.listen(this.ctx.website.port, () => console.log(this.ctx.website.port));
        });
    }
    /**
     * the next.config.js
     */
    nextConfig() {
        const withCSS = require("@zeit/next-css");
        const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
        const withTypescript = require("@zeit/next-typescript");
        const opts = {
            webpack(config, options) {
                // Do not run type checking twice:
                if (options.isServer && process.env.NODE_ENV !== "production")
                    config.plugins.push(new ForkTsCheckerWebpackPlugin());
                return config;
            },
        };
        return withCSS(withTypescript(opts));
    }
    /**
     * helpers available on the routeSetup method
     */
    _routeSetupHelper() {
        let that = this;
        const tryMw = (fn) => (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield fn(req, res);
            }
            catch (err) {
                next(err);
            }
        });
        const _nextHandle = this.nextApp.getRequestHandler();
        const nextMw = tryMw((req, res) => {
            const parsedUrl = url_1.parse(req.url, true);
            _nextHandle(req, res, parsedUrl);
        });
        return {
            htmlRoutes(fn) {
                return __awaiter(this, void 0, void 0, function* () {
                    const router = express();
                    yield fn({ router });
                    const errorMw = (err, req, res, next) => {
                        that.nextApp.render(req, res, "/error", { message: String(err) });
                    };
                    router.use(errorMw);
                    return router;
                });
            },
            tryMw,
            nextApp: this.nextApp,
            nextMw,
        };
    }
}
exports.Server = Server;
//# sourceMappingURL=index.js.map