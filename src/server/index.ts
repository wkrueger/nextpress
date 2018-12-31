///<reference path="../../types/global.types.d.ts"/>
import { Server as NextServer } from "next"
import rimraf = require("rimraf")
import { promisify } from "util"
import { resolve } from "path"
import { setWithLanguage } from "../messages/messages"
import { fontPlugin } from "./font-plugin"
import http = require("http")
import { UserAuthJwt } from "./user-auth-jwt"
import * as Fastify from "fastify"
import { formatError } from "../other/error"

export class Server {
  nodeHttpServer?: http.Server
  isProduction = process.env.NODE_ENV === "production"
  fastify!: Fastify.FastifyInstance

  constructor(public ctx: Nextpress.Context) {
    if (!ctx.loadedContexts.has("default.website")) {
      throw Error("Server requires the default.website context to be used.")
    }
    setWithLanguage(ctx.website.language)
  }

  options = {
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
  }

  public useHMR() {
    const hmr = require("./hmr") as typeof import("./hmr")
    hmr.setServerHmr(this)
  }

  /**
   * all set, run
   */
  public async run() {
    if (this.isProduction && this.options.useNextjs && !this.options.prebuilt) {
      await this.buildForProduction()
    }
    const fastifyOpts: any = { logger: Boolean(this.ctx.website.logRequests) }
    if (this.nodeHttpServer) {
      //hmr setup
      fastifyOpts.serverFactory = (handler: any, opts: any) => {
        let listeners = this.nodeHttpServer!.listeners("request")
        for (let x = 0; x < listeners.length; x++) {
          const listener = listeners[x]
          if ((listener as any).__nextpress) {
            this.nodeHttpServer!.removeListener("request", listener as any)
          }
        }
        handler.__nextpress = true
        this.nodeHttpServer!.addListener("request", handler)
        return this.nodeHttpServer
      }
    }
    this.fastify = Fastify(fastifyOpts)
    //;(this.expressApp as any).__nextpress = true
    await this.setupGlobalMiddleware()
    await this.setupRoutes()
    if (this.options.useNextjs) {
      this.setNextjsMiddleware()
    }
    //first load
    let ret: Promise<any> | undefined
    if (!this.nodeHttpServer) {
      ret = this.fastify.listen(this.ctx.website.port)
    }
    this.nodeHttpServer = this.fastify.server
    return ret
  }

  /**
   * this is meant to be overriden in order to set the server routes.
   */
  public async setupRoutes() {}

  /**
   * to be used if manually setting up a build flow
   */
  public async buildForProduction() {
    console.log("Building for production...")
    const nextBuild = require("next/dist/build").default
    await promisify(rimraf)(resolve(this.ctx.projectRoot, ".next"))
    await nextBuild(this.ctx.projectRoot, this.getNextjsConfig())
    if (global.gc) {
      global.gc()
    }
  }

  // --- PROTECTED --- //

  /**
   * app.use's on the express app
   */
  protected async setupGlobalMiddleware() {
    const fastify = this.fastify
    fastify.setErrorHandler((error: any, req, res) => {
      res
        .status(error.statusCode || 500)
        .send(error ? formatError(error) : { error: { message: "Internal server error." } })
    })
    //serve static through express because cache headers.
    fastify.register(require("fastify-static"), {
      root: this.ctx.pathFromRoot("static"),
      prefix: "/static/",
      maxAge: "30d"
    })
    if (this.ctx.jwt) {
      fastify.register(require("fastify-cookie"))
      this.createAuthMw_Jwt()
    }
    fastify.get("/robots.txt", function(req, reply) {
      reply.sendFile("robots.txt")
    })
    if (this.options.useHelmet) {
      fastify.register(require("fastify-helmet"))
    }
  }

  UserAuthClass = UserAuthJwt
  protected createAuthMw_Jwt() {
    this.fastify.decorateRequest("nextpressAuth", {})
    this.fastify.addHook("preHandler", (req, res, next) => {
      req.nextpressAuth = new this.UserAuthClass(req, res, {
        durationSeconds: this.options.jwtOptions.tokenDuration,
        secret: this.ctx.jwt.secret
      })
      next()
    })
  }

  /**
   * the next.config.js
   */
  protected getNextjsConfig() {
    const withCSS = require("@zeit/next-css")
    const withSass = require("@zeit/next-sass")
    const LodashPlugin = require("lodash-webpack-plugin")
    const withTypescript = require("@zeit/next-typescript")
    let that = this

    const opts = {
      webpack(config: any, options: any) {
        // Do not run type checking twice:
        if (options.isServer && !that.isProduction) {
          const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
          config.plugins.push(new ForkTsCheckerWebpackPlugin())
        }
        config.plugins.push(new LodashPlugin())
        return config
      }
    }
    let out = this.isProduction
      ? withTypescript(withCSS(withSass(opts)))
      : withSass(withTypescript(withCSS(opts)))
    if (this.ctx.website.bundleAnalyzer) {
      const withBundleAnalyzer = require("@zeit/next-bundle-analyzer")
      out = withBundleAnalyzer({ ...out, ...this.options.bundleAnalyzer })
    }
    return fontPlugin(out)
  }

  _nextApp?: NextServer
  public getNextApp() {
    if (!this._nextApp) {
      if (!this.options.useNextjs) {
        throw Error("options.useNextJs is set to false.")
      }
      const nextjs = require("next") as typeof import("next")
      this._nextApp = nextjs({
        dev: !this.isProduction,
        dir: this.ctx.projectRoot,
        conf: this.getNextjsConfig()
      })
      this._nextApp.prepare()
    }
    return this._nextApp
  }

  private setNextjsMiddleware() {
    const handler = (req: any, res: any) => this.getNextApp().getRequestHandler()(req, res)
    this.fastify.use(handler)
  }
}

if (!process.listenerCount("unhandledRejection")) {
  process.on("unhandledRejection", (...arg: any[]) => {
    console.error("unhandledRejection", ...arg)
    process.exit(1)
  })
}

declare module "fastify" {
  interface FastifyRequest {
    nextpressAuth: UserAuthJwt
  }
}
