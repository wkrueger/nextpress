import nextjs = require("next")
import express = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import mysqlSession = require("express-mysql-session")
import rimraf = require("rimraf")
import { promisify } from "util"
import { resolve } from "path"
import { RouterBuilder } from "./router-builder"
export { default as ContextFactory, defaultMappers } from "./context"

export type ExpressApp = ReturnType<typeof express>

class Server {
  constructor(
    public ctx: Nextpress.Context,
    public isProduction = process.env.NODE_ENV === "production",
  ) {
    if (!ctx.loadedContexts.has("default.website")) {
      throw Error("Server required the default.website context to be used.")
    }
  }

  options = {
    errorRoute: "/error",
    bundleAnalyzer: {
      analyzeServer: false,
      analyzeBrowser: true,
    },
  }

  private _nextApp?: nextjs.Server
  getNextApp() {
    if (!this._nextApp)
      this._nextApp = nextjs({
        dev: !this.isProduction,
        dir: this.ctx.projectRoot,
        conf: this.getNextjsConfig(),
      })
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
    const expressApp = express()
    await this.setupGlobalMiddleware(expressApp)
    await this.setupRoutes({ app: expressApp })
    expressApp.listen(this.ctx.website.port, () => console.log(this.ctx.website.port))
  }

  /**
   * this is meant to be overriden in order to set the server routes.
   */
  async setupRoutes({ app }: { app: ExpressApp }): Promise<void> {
    const builder = new RouterBuilder(this)
    app.use(await builder.createHtmlRouter())
  }

  async setupGlobalMiddleware(expressApp: express.Application) {
    await this.getNextApp().prepare()
    if (this.ctx.website.logRequests) {
      expressApp.use(morgan("short"))
    }
    const store = this.createSessionStore()
    const sessionMw = this.createSessionMw(store)
    //fixme optional and scoped middleware
    expressApp.use(sessionMw)
    const robotsPath = resolve(this.ctx.projectRoot, "static", "robots.txt")
    expressApp.get("/robots.txt", (_, response) => {
      response.sendFile(robotsPath)
    })
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
      },
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
    if (this.ctx.database) {
      const StoreConstructor = (mysqlSession as any)(expressSession)
      return new StoreConstructor({
        user: this.ctx.database.user,
        password: this.ctx.database.password,
        database: this.ctx.database.name,
      })
    }
  }

  createSessionMw(store: any) {
    return expressSession({
      secret: this.ctx.website.sessionSecret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
      resave: false,
      saveUninitialized: false,
      store,
    })
  }
}

export { Server, nextjs }
