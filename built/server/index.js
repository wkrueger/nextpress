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
const ono = require("ono");
var context_1 = require("./context");
exports.ContextFactory = context_1.default;
exports.contextPlugins = context_1.defaultMappers;
class Server {
    constructor(ctx) {
        this.ctx = ctx;
        this.errorRoute = "/error";
        this.jsonErrorHandler = (err, req, res, next) => {
            try {
                console.error(err);
                if (err.sql && !err.statusCode) {
                    err.message = "DB error.";
                }
                if (process.env.NODE_ENV !== "production") {
                    return res.status(err.statusCode || 500).json({ error: Object.assign({}, err, { message: err.message }) });
                }
                else {
                    return res
                        .status(err.statusCode || 500)
                        .json({ error: { message: err.message, code: err.code } });
                }
            }
            catch (err) {
                next(err);
            }
        };
    }
    get nextApp() {
        if (!this._nextApp)
            this._nextApp = nextjs({
                dev: process.env.NODE_ENV !== "production",
                dir: this.ctx.projectRoot,
                conf: this.nextConfig(),
            });
        return this._nextApp;
    }
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    routeSetup(app, helper) {
        return __awaiter(this, void 0, void 0, function* () {
            app.use(yield helper.htmlRoutes());
        });
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
        //next mw
        const _nextHandle = this.nextApp.getRequestHandler();
        const nextMw = tryMw((req, res) => {
            const parsedUrl = url_1.parse(req.url, true);
            _nextHandle(req, res, parsedUrl);
        });
        return {
            /**
             * creates a router suited for next.js html/react routes;
             * we add the common middleware, you set up the routes on the callback;
             * next.js middleware is always added in the end of the stack.
             */
            htmlRoutes(fn = () => __awaiter(this, void 0, void 0, function* () { return undefined; })) {
                return __awaiter(this, void 0, void 0, function* () {
                    const router = express.Router();
                    yield fn(router);
                    const errorMw = (err, req, res, next) => {
                        that.nextApp.render(req, res, "/error", { message: String(err) });
                    };
                    router.use(errorMw);
                    router.use(nextMw);
                    return router;
                });
            },
            /**
             * creates a router suited for JSON API routes;
             * we add the common middleware, you set up the routes on the callback;
             */
            jsonRoutes(fn) {
                return __awaiter(this, void 0, void 0, function* () {
                    const router = express.Router();
                    router.use(express.json());
                    yield fn(router);
                    router.use(function apiNotFound(req, res, next) {
                        next(ono({ statusCode: 404 }, "Path not found (404)."));
                    });
                    router.use(that.jsonErrorHandler);
                    return router;
                });
            },
            /** wraps a middleware in try/catch/next */
            tryMw,
            /** a reference to the next.js app, which has the renderer */
            nextApp: this.nextApp,
            /** next.js default middleware */
            nextMw,
            /** declare json routes in a simplified way */
            jsonRouteDict,
            /** for use on jsonRouteDict */
            withMethod,
            /** for use on jsonRouteDict */
            withMiddleware,
        };
    }
}
exports.Server = Server;
const tryMw = (fn) => (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield fn(req, res);
    }
    catch (err) {
        next(err);
    }
});
function jsonRouteDict(router, routeDict) {
    Object.keys(routeDict).forEach(key => {
        let item = routeDict[key];
        let method = item.method || "post";
        let mw = item.middleware || [];
        router[method](key, ...mw, tryMw((req, res) => __awaiter(this, void 0, void 0, function* () {
            let result = yield item(req);
            res.send(result);
        })));
    });
}
function withMethod(method, item) {
    item.method = method;
    return item;
}
function withMiddleware(mw, item) {
    item.middleware = mw;
    return item;
}
//# sourceMappingURL=index.js.map