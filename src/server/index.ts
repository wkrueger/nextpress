import nextjs = require("next")
import express = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import mysqlSession = require("express-mysql-session")
import { parse as urlparse } from "url"
export { default as ContextFactory, defaultPlugins as contextPlugins } from "./context"

export type ExpressApp = ReturnType<typeof express>
export type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>

class Server {
  constructor(public ctx: Nextpress.Context) {}

  errorRoute = "/error"

  nextApp = nextjs({
    dev: process.env.NODE_ENV !== "production",
    dir: this.ctx.projectRoot,
    conf: this.nextConfig(),
  })

  /**
   * this is meant to be overriden
   */
  async routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void> {}

  /**
   * all set, run
   */
  async run() {
    await this.nextApp.prepare()
    const expressApp = express()
    expressApp.use(morgan("short"))
    let store: any = undefined
    if (this.ctx.database) {
      const StoreConstructor = (mysqlSession as any)(expressSession)
      store = new StoreConstructor({
        user: this.ctx.database.user,
        password: this.ctx.database.password,
        database: this.ctx.database.name,
      })
    }
    const sessionMw = expressSession({
      secret: this.ctx.website.sessionSecret,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
      resave: false,
      saveUninitialized: false,
      store,
    })
    //fixme optional and scoped middleware
    expressApp.use(sessionMw)
    await this.routeSetup(expressApp, this._routeSetupHelper())
    expressApp.listen(this.ctx.website.port, () => console.log(this.ctx.website.port))
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

  /**
   * helpers available on the routeSetup method
   */
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
