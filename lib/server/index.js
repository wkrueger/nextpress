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
///<reference path="../../types/global.types.d.ts"/>
const expressMod = require("express");
const morgan = require("morgan");
const expressSession = require("express-session");
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
            bundleAnalyzer: {
                analyzeServer: false,
                analyzeBrowser: true
            }
        };
        if (!ctx.loadedContexts.has("default.website")) {
            throw Error("Server required the default.website context to be used.");
        }
    }
    getNextApp() {
        if (!this._nextApp) {
            const nextjs = require("next");
            this._nextApp = nextjs({
                dev: !this.isProduction,
                dir: this.ctx.projectRoot,
                conf: this.getNextjsConfig()
            });
        }
        return this._nextApp;
    }
    /**
     * all set, run
     */
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isProduction) {
                console.log("Production mode. Building...");
                const nextBuild = require("next/dist/build").default;
                yield util_1.promisify(rimraf)(path_1.resolve(this.ctx.projectRoot, ".next"));
                yield nextBuild(this.ctx.projectRoot, this.getNextjsConfig());
            }
            const expressApp = expressMod();
            yield this.setupGlobalMiddleware(expressApp);
            yield this.setupRoutes({ app: expressApp });
            expressApp.listen(this.ctx.website.port, () => console.log(this.ctx.website.port));
        });
    }
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes({ app }) {
        return __awaiter(this, void 0, void 0, function* () {
            const builder = new router_builder_1.RouterBuilder(this);
            app.use(yield builder.createHtmlRouter());
        });
    }
    setupGlobalMiddleware(expressApp) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.getNextApp().prepare();
            if (this.ctx.website.logRequests) {
                expressApp.use(morgan("short"));
            }
            const store = this.createSessionStore();
            const sessionMw = this.createSessionMw(store);
            expressApp.use(sessionMw);
            const robotsPath = path_1.resolve(this.ctx.projectRoot, "static", "robots.txt");
            expressApp.get("/robots.txt", (_, response) => {
                response.sendFile(robotsPath);
            });
            expressApp.use(helmet());
            return expressApp;
        });
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
            }
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
                client: this.ctx.redis.instance()
            });
        }
        if (this.ctx.loadedContexts.has("default.database")) {
            const knexMod = require("connect-session-knex");
            const StoreConstructor = knexMod(expressSession);
            return new StoreConstructor({
                knex: this.ctx.database.db()
            });
        }
    }
    createSessionMw(store) {
        return expressSession({
            secret: this.ctx.website.sessionSecret,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7
            },
            resave: false,
            saveUninitialized: false,
            store
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=index.js.map