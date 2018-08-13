import { Server } from "."
import { parse as urlparse } from "url"
import expressMod = require("express")
import ono = require("ono")
import yup = require("yup")

export class RouterBuilder {
  constructor(public server: Server) {}

  static yup = yup
  static polka = expressMod

  /**
   * Wraps request handler in try/catch/next
   */
  static createHandler = (fn: expressMod.RequestHandler): expressMod.RequestHandler => async (
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

  static appendJsonRoutesFromDict<Dict extends Record<string, RouteOpts>>(
    router: expressMod.Router,
    setup: (i: typeof RouteDictHelper) => Dict
  ) {
    const routeDict = setup(RouteDictHelper)
    Object.keys(routeDict).forEach(key => {
      let routeOpts = routeDict[key]
      let method: "get" | "post" | "put" | "delete" = routeOpts.method || ("post" as any)
      let mw = routeOpts.middleware || []
      let fn: expressMod.RequestHandler = async (req, res) => {
        validateRequest(routeOpts, req)
        let result = await routeOpts.handler!(req)
        res.send(result)
      }
      router[method](key, ...mw, RouterBuilder.createHandler(fn))
    })
  }

  nextMw = RouterBuilder.createHandler((req, res) => {
    const _nextHandle = this.server.getNextApp().getRequestHandler()
    const parsedUrl = urlparse(req.url!, true)
    _nextHandle(req, res, parsedUrl)
  })

  /**
   * creates a router suited for next.js html/react routes;
   * we add the common middleware, you set up the routes on the callback;
   * next.js middleware is always added in the end of the stack.
   */
  async createHtmlRouter(
    callback?: ({ router }: { router: expressMod.Router }) => Promise<void>,
    options: { noNextJs?: boolean } = {}
  ) {
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
    if (!options.noNextJs) {
      router.use(this.nextMw)
    }
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

  async opinionatedJsonRouter<Dict extends Record<string, RouteOpts>>(
    setup: (i: typeof RouteDictHelper) => Dict
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

  route = route
}

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

interface EditedRequestHandler<Replace = {}> {
  (req: Omit<expressMod.Request, keyof Replace> & Replace): Promise<Record<string, any>>
}

interface RouteOpts {
  method?: string
  middleware?: expressMod.RequestHandler[]
  validation?: SchemaDict
  handler?: Function
}

type NeverParams = { body: unknown; query: unknown; params: unknown }

type HandlerType<Opts> = Opts extends { validation: any }
  ? EditedRequestHandler<UnwrapSchemaDict<Opts["validation"]>>
  : EditedRequestHandler<NeverParams>

export const route = <Opts extends RouteOpts>(opts: Opts = {} as any) => {
  return {
    handler: (fn: HandlerType<Opts>): RouteOpts => {
      return Object.assign(opts, { handler: fn })
    }
  }
}

const validateRequest = (opts: RouteOpts, req: expressMod.Request) => {
  if (!opts.validation) return
  const what = opts.validation
  if (what.query) req.query = what.query.validateSync(req.query)
  if (what.params) req.params = what.params.validateSync(req.params)
  if (what.body) {
    req.body = what.body.validateSync(req.body, { stripUnknown: true })
  }
}

const RouteDictHelper = {
  route,
  yup
}

type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : unknown
type SchemaDict = {
  query?: yup.ObjectSchema<any>
  body?: yup.ObjectSchema<any>
  params?: yup.ObjectSchema<any>
}

type UnwrapSchemaDict<T extends SchemaDict> = {
  query: UnwrapSchema<T["query"]>
  body: UnwrapSchema<T["body"]>
  params: UnwrapSchema<T["params"]>
}
