import { Server } from "."
import { parse as urlparse } from "url"
import expressMod = require("express")
import ono = require("ono")
import yup = require("yup")

export class RouterBuilder {
  constructor(public server: Server) {}

  static yup = yup
  static polka = expressMod

  static tryMw = (fn: expressMod.RequestHandler): expressMod.RequestHandler => async (
    req,
    res,
    next
  ) => {
    try {
      await fn(req, res, next)
    } catch (err) {
      next(err)
    }
  }

  static appendJsonRoutesFromDict<Dict extends Record<string, RouteDictItem>>(
    router: expressMod.Router,
    setup: (i: typeof RouteDictSetters) => Dict
  ) {
    const routeDict = setup(RouteDictSetters)
    Object.keys(routeDict).forEach(key => {
      let item = routeDict[key]
      let method: "get" | "post" | "put" | "delete" = item.method || ("post" as any)
      let mw = item.middleware || []
      let fn: expressMod.RequestHandler = async (req, res) => {
        let result = await item(req)
        res.send(result)
      }
      router[method](key, ...mw, RouterBuilder.tryMw(fn) as any)
    })
  }

  nextMw = RouterBuilder.tryMw((req, res) => {
    const _nextHandle = this.server.getNextApp().getRequestHandler()
    const parsedUrl = urlparse(req.url!, true)
    _nextHandle(req, res, parsedUrl)
  })

  /**
   * creates a router suited for next.js html/react routes;
   * we add the common middleware, you set up the routes on the callback;
   * next.js middleware is always added in the end of the stack.
   */
  async createHtmlRouter(callback?: ({ router }: { router: expressMod.Router }) => Promise<void>) {
    const router = expressMod.Router()
    if (callback) {
      await callback({ router })
    }
    if (this.server.options.errorRoute) {
      const errorMw: expressMod.ErrorRequestHandler = (err, req, res, next) => {
        this.server.getNextApp().render(req, res, this.server.options.errorRoute, {
          message: String(err)
        })
      }
      router.use(errorMw)
    }
    router.use(this.nextMw)
    return router
  }

  /**
   * creates a router suited for JSON API routes;
   * we add the common middleware, you set up the routes on the callback;
   */
  async createJsonRouter(callback: ({ router }: { router: expressMod.Router }) => Promise<void>) {
    const router = expressMod.Router()
    router.use(expressMod.json())
    await callback({ router })
    router.use(function apiNotFound(_, __, next) {
      next(ono({ statusCode: 404 }, "Path not found (404)."))
    })
    router.use(this.jsonErrorHandler)
    return router
  }

  async createJsonRouterFromDict<Dict extends Record<string, RouteDictItem>>(
    setup: (i: typeof RouteDictSetters) => Dict
  ) {
    return this.createJsonRouter(async ({ router }) => {
      return RouterBuilder.appendJsonRoutesFromDict(router, setup)
    })
  }

  jsonErrorHandler: expressMod.ErrorRequestHandler = (err, req, res, next) => {
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

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
export interface RouteDictItem<Replace = {}> {
  (req: Omit<expressMod.Request, keyof Replace> & Replace): Promise<{
    [r: string]: any
  }>
  method?: string
  middleware?: expressMod.RequestHandler[]
}

const RouteDictSetters = {
  yup,

  /**
   * (for a given RouteItem) Sets another http method than the default
   */
  withMethod(method: string, item: RouteDictItem): RouteDictItem {
    item.method = method
    return item
  },

  /**
   * (for a given route item) Adds middleware to be run before
   */
  withMiddleware(mw: expressMod.RequestHandler[], item: RouteDictItem): RouteDictItem {
    item.middleware = mw
    return item
  },

  /**
   * (for a given route item) Validates query and/or params with the provided rules.
   */
  withValidation<What extends SchemaDict>(
    what: What,
    item: RouteDictItem<UnwrapSchemaDict<What>>
  ): RouteDictItem {
    let fn: any = (req: expressMod.Request) => {
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
}

type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : never
type SchemaDict = { [k in "query" | "params" | "body"]?: yup.ObjectSchema<any> }

type UnwrapSchemaDict<T extends SchemaDict> = { [k in keyof T]: UnwrapSchema<T[k]> }
