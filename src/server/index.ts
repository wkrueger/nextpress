import nextjs = require("next")
import express = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import mysqlSession = require("express-mysql-session")
import { parse as urlparse } from "url"
export { default as ContextFactory } from "./context"

export type ExpressApp = ReturnType<typeof express>
export type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>

class Server {
  constructor(public ctx: Nextpress.Context) {}

  errorRoute = "/error"

  async routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void> {}

  nextApp = nextjs({
    dev: process.env.NODE_ENV !== "production",
    dir: this.ctx.projectRoot,
    conf: this.nextConfig(),
  })

  /**
   * all set, run
   */
  async run() {
    await this.nextApp.prepare()
    const expressApp = express()
    expressApp.use(morgan("short"))
    const StoreConstructor = (mysqlSession as any)(expressSession)
    const mysqlStore = new StoreConstructor({
      user: this.ctx.database.user,
      password: this.ctx.database.password,
      database: this.ctx.database.name,
    })
    const sessionMw = expressSession({
      secret: this.ctx.website.sessionSecret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
      resave: false,
      saveUninitialized: false,
      store: mysqlStore,
    })
    //fixme optional and scoped middleware
    expressApp.use(sessionMw)
    await this.routeSetup(expressApp, this._routeSetupHelper())
    expressApp.listen(this.ctx.website.port, () => this.ctx.website.port)
  }

  /**
   * the next.config.js
   */
  nextConfig() {
    const withCSS = require("@zeit/next-css")
    const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
    const withTypescript = require("@zeit/next-typescript")

    const opts = {
      webpack(config: any, options: any) {
        // Do not run type checking twice:
        if (options.isServer && process.env.NODE_ENV !== "production")
          config.plugins.push(new ForkTsCheckerWebpackPlugin())
        return config
      },
    }

    return withCSS(withTypescript(opts))
  }

  _routeSetupHelper() {
    let that = this
    type RouteHelper = {
      router: express.Router
    }
    const tryMw = (
      fn: (req: express.Request, res: express.Response) => void | Promise<void>,
    ) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await fn(req, res)
      } catch (err) {
        next(err)
      }
    }
    const _nextHandle = this.nextApp.getRequestHandler()
    const nextMw = tryMw((req, res) => {
      const parsedUrl = urlparse(req.url, true)
      _nextHandle(req, res, parsedUrl)
    })
    return {
      async htmlRoutes(fn: (h: RouteHelper) => Promise<void>) {
        const router: express.Router = express()
        await fn({ router })
        const errorMw: express.ErrorRequestHandler = (err, req, res, next) => {
          that.nextApp.render(req, res, "/error", { message: String(err) })
        }
        router.use(errorMw)
        return router
      },
      tryMw,
      nextApp: this.nextApp,
      nextMw,
    }
  }
}

export { Server, nextjs }
