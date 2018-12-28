///<reference path="../../types/global.types.d.ts"/>
import expressMod = require("express")
import morgan = require("morgan")
import { Server as NextServer } from "next"
import rimraf = require("rimraf")
import { promisify } from "util"
import { resolve } from "path"
import { RouterBuilder } from "./router-builder"
import helmet = require("helmet")
import { setWithLanguage } from "../messages/messages"
import { fontPlugin } from "./font-plugin"
import http = require("http")
import { UserAuthJwt } from "./user-auth-jwt"
import cookieParser = require("cookie-parser")

export type ExpressApp = ReturnType<typeof expressMod>
declare const module: any

export class Server {
  nodeHttpServer?: http.Server
  expressApp?: ExpressApp
  isProduction = process.env.NODE_ENV === "production"

  constructor(public ctx: Nextpress.Context, public opts: { tag?: string } = {}) {
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
    this.expressApp = expressMod()
    ;(this.expressApp as any).__nextpress = true
    await this.setupGlobalMiddleware(this.expressApp)
    await this.setupRoutes({ app: this.expressApp })
    if (!this.nodeHttpServer) {
      this.nodeHttpServer = http.createServer(this.expressApp)
      this.nodeHttpServer.listen(this.ctx.website.port)
      console.log("Server running on " + this.ctx.website.port)
    } else {
      //hmr setup
      let listeners = this.nodeHttpServer!.listeners("request")
      for (let x = 0; x < listeners.length; x++) {
        const listener = listeners[x]
        if ((listener as any).__nextpress) {
          this.nodeHttpServer.removeListener("request", listener as any)
        }
      }
      this.nodeHttpServer.addListener("request", this.expressApp)
    }
  }

  /**
   * this is meant to be overriden in order to set the server routes.
   */
  public async setupRoutes({ app }: { app: ExpressApp }): Promise<void> {
    const builder = new RouterBuilder(this)
    app.use(await builder.createHtmlRouter())
  }

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
  protected async setupGlobalMiddleware(expressApp: expressMod.Router) {
    if (this.options.useNextjs) {
      this.getNextApp() //.prepare()
    }
    if (this.ctx.website.logRequests) {
      expressApp.use(morgan("short"))
    }
    if (this.ctx.website.useCompression && this.isProduction) {
      const compression = require("compression")
      expressApp.use(compression())
    }
    if (this.isProduction) {
      //serve static through express because cache headers.
      expressApp.use(
        "/static",
        expressMod.static(resolve(this.ctx.projectRoot, "static"), {
          maxAge: "30d"
        })
      )
    }
    if (this.ctx.jwt) {
      expressApp.use(cookieParser())
      const authMw = this.createAuthMw_Jwt()
      expressApp.use(authMw)
    }
    const robotsPath = resolve(this.ctx.projectRoot, "static", "robots.txt")
    expressApp.get("/robots.txt", (_, response) => {
      response.sendFile(robotsPath)
    })
    if (this.options.useHelmet) {
      expressApp.use(helmet())
    }
    return expressApp
  }

  UserAuthClass = UserAuthJwt
  protected createAuthMw_Jwt() {
    const out: expressMod.RequestHandler = (req, res, next) => {
      req.nextpressAuth = new this.UserAuthClass(req, res, {
        durationSeconds: this.options.jwtOptions.tokenDuration,
        secret: this.ctx.jwt.secret
      })
      next()
    }
    return out
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
}

if (!process.listenerCount("unhandledRejection")) {
  process.on("unhandledRejection", (...arg: any[]) => {
    console.error("unhandledRejection", ...arg)
    process.exit(1)
  })
}

declare global {
  namespace Express {
    interface Request {
      nextpressAuth: UserAuthJwt
    }
  }
}
