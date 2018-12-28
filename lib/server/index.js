"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="../../types/global.types.d.ts"/>
const expressMod = require("express");
const morgan = require("morgan");
const rimraf = require("rimraf");
const util_1 = require("util");
const path_1 = require("path");
const router_builder_1 = require("./router-builder");
const helmet = require("helmet");
const messages_1 = require("../messages/messages");
const font_plugin_1 = require("./font-plugin");
const http = require("http");
const user_auth_jwt_1 = require("./user-auth-jwt");
const cookieParser = require("cookie-parser");
class Server {
    constructor(ctx, opts = {}) {
        this.ctx = ctx;
        this.opts = opts;
        this.isProduction = process.env.NODE_ENV === "production";
        this.options = {
            errorRoute: "/error",
            useNextjs: true,
            useHelmet: true,
            jwtOptions: {
                //tokenHeader: "authorization",
                tokenDuration: 60 * 60 * 24 * 5 //5 days
            },
            bundleAnalyzer: {
                analyzeServer: false,
                analyzeBrowser: true
            },
            prebuilt: false
        };
        if (!ctx.loadedContexts.has("default.website")) {
            throw Error("Server requires the default.website context to be used.");
        }
        messages_1.setWithLanguage(ctx.website.language);
    }
    useHMR() {
        const hmr = require("./hmr");
        hmr.setServerHmr(this);
    }
    /**
     * all set, run
     */
    async run() {
        if (this.isProduction && this.options.useNextjs && !this.options.prebuilt) {
            await this.buildForProduction();
        }
        this.expressApp = expressMod();
        this.expressApp.__nextpress = true;
        await this.setupGlobalMiddleware(this.expressApp);
        await this.setupRoutes({ app: this.expressApp });
        if (!this.nodeHttpServer) {
            this.nodeHttpServer = http.createServer(this.expressApp);
            this.nodeHttpServer.listen(this.ctx.website.port);
            console.log("Server running on " + this.ctx.website.port);
        }
        else {
            //hmr setup
            let listeners = this.nodeHttpServer.listeners("request");
            for (let x = 0; x < listeners.length; x++) {
                const listener = listeners[x];
                if (listener.__nextpress) {
                    this.nodeHttpServer.removeListener("request", listener);
                }
            }
            this.nodeHttpServer.addListener("request", this.expressApp);
        }
    }
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    async setupRoutes({ app }) {
        const builder = new router_builder_1.RouterBuilder(this);
        app.use(await builder.createHtmlRouter());
    }
    /**
     * to be used if manually setting up a build flow
     */
    async buildForProduction() {
        console.log("Building for production...");
        const nextBuild = require("next/dist/build").default;
        await util_1.promisify(rimraf)(path_1.resolve(this.ctx.projectRoot, ".next"));
        await nextBuild(this.ctx.projectRoot, this.getNextjsConfig());
        if (global.gc) {
            global.gc();
        }
    }
    // --- PROTECTED --- //
    /**
     * app.use's on the express app
     */
    async setupGlobalMiddleware(expressApp) {
        if (this.options.useNextjs) {
            this.getNextApp(); //.prepare()
        }
        if (this.ctx.website.logRequests) {
            expressApp.use(morgan("short"));
        }
        if (this.ctx.website.useCompression && this.isProduction) {
            const compression = require("compression");
            expressApp.use(compression());
        }
        if (this.isProduction) {
            //serve static through express because cache headers.
            expressApp.use("/static", expressMod.static(path_1.resolve(this.ctx.projectRoot, "static"), {
                maxAge: "30d"
            }));
        }
        if (this.ctx.jwt) {
            expressApp.use(cookieParser());
            const authMw = this.createAuthMw_Jwt();
            expressApp.use(authMw);
        }
        const robotsPath = path_1.resolve(this.ctx.projectRoot, "static", "robots.txt");
        expressApp.get("/robots.txt", (_, response) => {
            response.sendFile(robotsPath);
        });
        if (this.options.useHelmet) {
            expressApp.use(helmet());
        }
        return expressApp;
    }
    createAuthMw_Jwt() {
        const out = (req, res, next) => {
            req.nextpressAuth = new user_auth_jwt_1.UserAuthJwt(req, res, {
                durationSeconds: this.options.jwtOptions.tokenDuration,
                secret: this.ctx.jwt.secret
            });
            next();
        };
        return out;
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
        return font_plugin_1.fontPlugin(out);
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
                conf: this.getNextjsConfig()
            });
            this._nextApp.prepare();
        }
        return this._nextApp;
    }
}
exports.Server = Server;
if (!process.listenerCount("unhandledRejection")) {
    process.on("unhandledRejection", (...arg) => {
        console.error("unhandledRejection", ...arg);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map