import nextjs = require("next")
import express = require("express")
import morgan = require("morgan")
import expressSession = require("express-session")
import mysqlSession = require("express-mysql-session")
import { parse as urlparse } from "url"
import ono = require("ono")
import yup = require("yup")
import rimraf = require("rimraf")
import { promisify } from "util"
import { resolve } from "path"
export { default as ContextFactory, defaultMappers } from "./context"

export type ExpressApp = ReturnType<typeof express>
export type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>

class Server {
  constructor(
    public ctx: Nextpress.Context,
    public isProduction = process.env.NODE_ENV === "production",
  ) {
    if (!ctx.loadedContexts.has("default.website")) {
      throw Error("Server required the default.website context to be used.")
    }
  }

  errorRoute = "/error"

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
   * this is meant to be overriden in order to set the server routes.
   */
  async routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void> {
    app.use(await helper.htmlRoutes())
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
    await this.getNextApp().prepare()
    const expressApp = express()
    if (this.ctx.website.logRequests) {
      expressApp.use(morgan("short"))
    }
    const store = this.createSessionStore()
    const sessionMw = this.createSessionMw(store)
    //fixme optional and scoped middleware
    expressApp.use(sessionMw)
    await this.routeSetup(expressApp, this._routeSetupHelper())
    expressApp.listen(this.ctx.website.port, () => console.log(this.ctx.website.port))
  }

  /**
   * the next.config.js
   */
  getNextjsConfig() {
    const withCSS = require("@zeit/next-css")
    const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
    const withTypescript = require("@zeit/next-typescript")
    let that = this

    const opts = {
      webpack(config: any, options: any) {
        // Do not run type checking twice:
        if (options.isServer && !that.isProduction)
          config.plugins.push(new ForkTsCheckerWebpackPlugin())
        return config
      },
    }

    return withTypescript(withCSS(opts))
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

  /**
   * helpers available on the routeSetup method
   */
  _routeSetupHelper() {
    let that = this
    type RouteHelper = express.Router
    //next mw
    const _nextHandle = this.getNextApp().getRequestHandler()
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
        if (that.errorRoute) {
          const errorMw: express.ErrorRequestHandler = (err, req, res, next) => {
            that.getNextApp().render(req, res, that.errorRoute, { message: String(err) })
          }
          router.use(errorMw)
        }
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
      nextApp: this.getNextApp.bind(this) as () => nextjs.Server,
      /** next.js default middleware */
      nextMw,
      /** declare json routes in a simplified way */
      jsonRouteDict,
      /** for use on jsonRouteDict */
      withMethod,
      /** for use on jsonRouteDict */
      withMiddleware,
      /** for use on jsonRouteDict */
      withValidation,
      /* yup lib reference */
      yup,
      /* express lib reference */
      express,
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

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
export interface RouteDictItem<Replace = {}> {
  (req: Omit<express.Request, keyof Replace> & Replace): Promise<{ [r: string]: any }>
  method?: string
  middleware?: express.RequestHandler[]
}

type RouteDict = {
  [k: string]: RouteDictItem
}

function jsonRouteDict<Dict extends RouteDict>(router: express.Router, routeDict: Dict) {
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

/**
 * (for a given RouteItem) Sets another http method than the default
 */
function withMethod(method: string, item: RouteDictItem): RouteDictItem {
  item.method = method
  return item
}

/**
 * (for a given route item) Adds middleware to be run before
 */
function withMiddleware(mw: express.RequestHandler[], item: RouteDictItem): RouteDictItem {
  item.middleware = mw
  return item
}

type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : never
type SchemaDict = { [k in "query" | "params" | "body"]?: yup.ObjectSchema<any> }

type UnwrapSchemaDict<T extends SchemaDict> = { [k in keyof T]: UnwrapSchema<T[k]> }

/**
 * (for a given route item) Validates query and/or params with the provided rules.
 */
function withValidation<What extends SchemaDict>(
  what: What,
  item: RouteDictItem<UnwrapSchemaDict<What>>,
): RouteDictItem {
  let fn: any = (req: express.Request) => {
    if (what.query) req.query = what.query.validateSync(req.query)
    if (what.params) req.params = what.params.validateSync(req.params)
    if (what.body) req.body = what.body.validateSync(req.body)
    return item(req as any)
  }
  Object.keys(item).forEach(key => {
    fn[key] = (item as any)[key]
  })
  return fn
}

export { Server, nextjs }
