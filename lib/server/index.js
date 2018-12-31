"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rimraf = require("rimraf");
const util_1 = require("util");
const path_1 = require("path");
const messages_1 = require("../messages/messages");
const font_plugin_1 = require("./font-plugin");
const user_auth_jwt_1 = require("./user-auth-jwt");
const Fastify = require("fastify");
const error_1 = require("../other/error");
class Server {
    constructor(ctx) {
        this.ctx = ctx;
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
        this.UserAuthClass = user_auth_jwt_1.UserAuthJwt;
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
        const fastifyOpts = { logger: Boolean(this.ctx.website.logRequests) };
        if (this.nodeHttpServer) {
            //hmr setup
            fastifyOpts.serverFactory = (handler, opts) => {
                let listeners = this.nodeHttpServer.listeners("request");
                for (let x = 0; x < listeners.length; x++) {
                    const listener = listeners[x];
                    if (listener.__nextpress) {
                        this.nodeHttpServer.removeListener("request", listener);
                    }
                }
                handler.__nextpress = true;
                this.nodeHttpServer.addListener("request", handler);
                return this.nodeHttpServer;
            };
        }
        this.fastify = Fastify(fastifyOpts);
        //;(this.expressApp as any).__nextpress = true
        await this.setupGlobalMiddleware();
        await this.setupRoutes();
        if (this.options.useNextjs) {
            this.setNextjsMiddleware();
        }
        //first load
        let ret;
        if (!this.nodeHttpServer) {
            ret = this.fastify.listen(this.ctx.website.port);
        }
        this.nodeHttpServer = this.fastify.server;
        return ret;
    }
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    async setupRoutes() { }
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
    async setupGlobalMiddleware() {
        const fastify = this.fastify;
        fastify.setErrorHandler((error, req, res) => {
            res
                .status(error.statusCode || 500)
                .send(error ? error_1.formatError(error) : { error: { message: "Internal server error." } });
        });
        //serve static through express because cache headers.
        fastify.register(require("fastify-static"), {
            root: this.ctx.pathFromRoot("static"),
            prefix: "/static/",
            maxAge: "30d"
        });
        if (this.ctx.jwt) {
            fastify.register(require("fastify-cookie"));
            this.createAuthMw_Jwt();
        }
        fastify.get("/robots.txt", function (req, reply) {
            reply.sendFile("robots.txt");
        });
        if (this.options.useHelmet) {
            fastify.register(require("fastify-helmet"));
        }
    }
    createAuthMw_Jwt() {
        this.fastify.decorateRequest("nextpressAuth", {});
        this.fastify.addHook("preHandler", (req, res, next) => {
            req.nextpressAuth = new this.UserAuthClass(req, res, {
                durationSeconds: this.options.jwtOptions.tokenDuration,
                secret: this.ctx.jwt.secret
            });
            next();
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
    setNextjsMiddleware() {
        const handler = (req, res) => this.getNextApp().getRequestHandler()(req, res);
        this.fastify.use(handler);
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