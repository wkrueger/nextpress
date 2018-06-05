import nextjs = require("next")
import express = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import mysqlSession = require("express-mysql-session")
import { parse as urlparse } from "url"
import ono = require("ono")
export { default as ContextFactory, defaultMappers as contextPlugins } from "./context"

export type ExpressApp = ReturnType<typeof express>
export type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>

class Server {
  constructor(public ctx: Nextpress.Context) {}

  errorRoute = "/error"

  _nextApp?: nextjs.Server
  get nextApp() {
    if (!this._nextApp)
      this._nextApp = nextjs({
        dev: process.env.NODE_ENV !== "production",
        dir: this.ctx.projectRoot,
        conf: this.nextConfig(),
      })
    return this._nextApp
  }

  /**
   * this is meant to be overriden in order to set the server routes.
   */
  async routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void> {
    app.use(await helper.htmlRoutes())
  }

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
    type RouteHelper = express.Router
    //next mw
    const _nextHandle = this.nextApp.getRequestHandler()
    const nextMw = tryMw((req, res) => {
      const parsedUrl = urlparse(req.url, true)
      _nextHandle(req, res, parsedUrl)
    })
    return {
      /**
       * creates a router suited for next.js html/react routes;
       * we add the common middleware, you set up the routes on the callback;
       * next.js middleware is always added in the end of the stack.
       */
      async htmlRoutes(fn: (h: RouteHelper) => Promise<void> = async () => undefined) {
        const router = express.Router() as express.Router
        await fn(router)
        const errorMw: express.ErrorRequestHandler = (err, req, res, next) => {
          that.nextApp.render(req, res, "/error", { message: String(err) })
        }
        router.use(errorMw)
        router.use(nextMw)
        return router
      },
      /**
       * creates a router suited for JSON API routes;
       * we add the common middleware, you set up the routes on the callback;
       */
      async jsonRoutes(fn: (h: RouteHelper) => Promise<void>) {
        const router = express.Router() as express.Router
        router.use(express.json())
        await fn(router)
        router.use(function apiNotFound(req, res, next) {
          next(ono({ statusCode: 404 }, "Path not found (404)."))
        })
        router.use(that.jsonErrorHandler)
        return router
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
    }
  }

  jsonErrorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
    try {
      console.error(err)
      if (err.sql && !err.statusCode) {
        err.message = "DB error."
      }
      if (process.env.NODE_ENV !== "production") {
        return res.status(err.statusCode || 500).json({ error: { ...err, message: err.message } })
      } else {
        return res
          .status(err.statusCode || 500)
          .json({ error: { message: err.message, code: err.code } })
      }
    } catch (err) {
      next(err)
    }
  }
}

const tryMw = (fn: (req: express.Request, res: express.Response) => void | Promise<void>) => async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    await fn(req, res)
  } catch (err) {
    next(err)
  }
}

export interface RouteDictItem {
  (req: express.Request): Promise<{ [r: string]: any }>
  method?: string
  middleware?: express.RequestHandler[]
}

type RouteDict = {
  [k: string]: RouteDictItem
}

function jsonRouteDict(router: express.Router, routeDict: RouteDict) {
  Object.keys(routeDict).forEach(key => {
    let item = routeDict[key]
    let method: "get" | "post" | "put" | "delete" = item.method || ("post" as any)
    let mw = item.middleware || []
    router[method](
      key,
      ...mw,
      tryMw(async (req, res) => {
        let result = await item(req)
        res.send(result)
      }),
    )
  })
}

function withMethod(method: string, item: RouteDictItem): RouteDictItem {
  item.method = method
  return item
}

function withMiddleware(mw: express.RequestHandler[], item: RouteDictItem): RouteDictItem {
  item.middleware = mw
  return item
}

export { Server, nextjs }
