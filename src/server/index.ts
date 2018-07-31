///<reference path="../../types/global.types.d.ts"/>
import expressMod = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import { Server as NextServer } from "next"
import rimraf = require("rimraf")
import { promisify } from "util"
import { resolve } from "path"
import { RouterBuilder } from "./router-builder"
import helmet = require("helmet")

export type PolkaApp = ReturnType<typeof expressMod>

export class Server {
  constructor(
    public ctx: Nextpress.Context,
    public isProduction = process.env.NODE_ENV === "production"
  ) {
    if (!ctx.loadedContexts.has("default.website")) {
      throw Error("Server required the default.website context to be used.")
    }
  }

  options = {
    errorRoute: "/error",
    bundleAnalyzer: {
      analyzeServer: false,
      analyzeBrowser: true
    }
  }

  private _nextApp?: NextServer
  getNextApp() {
    if (!this._nextApp) {
      const nextjs = require("next") as typeof import("next")
      this._nextApp = nextjs({
        dev: !this.isProduction,
        dir: this.ctx.projectRoot,
        conf: this.getNextjsConfig()
      })
    }
    return this._nextApp
  }

  /**
   * all set, run
   */
  async run() {
    if (this.isProduction) {
      console.log("Production mode. Building...")
      const nextBuild = require("next/dist/build").default
      await promisify(rimraf)(resolve(this.ctx.projectRoot, ".next"))
      await nextBuild(this.ctx.projectRoot, this.getNextjsConfig())
    }
    const expressApp = expressMod()
    await this.setupGlobalMiddleware(expressApp)
    await this.setupRoutes({ app: expressApp })
    expressApp.listen(this.ctx.website.port, () =>
      console.log(this.ctx.website.port)
    )
  }

  /**
   * this is meant to be overriden in order to set the server routes.
   */
  async setupRoutes({ app }: { app: PolkaApp }): Promise<void> {
    const builder = new RouterBuilder(this)
    app.use(await builder.createHtmlRouter())
  }

  async setupGlobalMiddleware(expressApp: expressMod.Router) {
    await this.getNextApp().prepare()
    if (this.ctx.website.logRequests) {
      expressApp.use(morgan("short"))
    }
    const store = this.createSessionStore()
    const sessionMw = this.createSessionMw(store)
    expressApp.use(sessionMw)
    const robotsPath = resolve(this.ctx.projectRoot, "static", "robots.txt")
    expressApp.get("/robots.txt", (_, response) => {
      response.sendFile(robotsPath)
    })
    expressApp.use(helmet())
    return expressApp
  }

  /**
   * the next.config.js
   */
  getNextjsConfig() {
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
    return out
  }

  createSessionStore() {
    if (this.ctx.loadedContexts.has("default.redis")) {
      const redisMod = require("connect-redis")
      const StoreConstructor = redisMod(expressSession)
      return new StoreConstructor({
        client: this.ctx.redis.instance()
      })
    }
    if (this.ctx.loadedContexts.has("default.database")) {
      const knexMod = require("connect-session-knex")
      const StoreConstructor = knexMod(expressSession)
      return new StoreConstructor({
        knex: this.ctx.database.db()
      })
    }
  }

  createSessionMw(store: any) {
    return expressSession({
      secret: this.ctx.website.sessionSecret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7
      },
      resave: false,
      saveUninitialized: false,
      store
    })
  }
}
