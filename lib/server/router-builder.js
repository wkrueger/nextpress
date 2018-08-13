"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const expressMod = require("express");
const ono = require("ono");
const yup = require("yup");
class RouterBuilder {
    constructor(server) {
        this.server = server;
        this.nextMw = RouterBuilder.createHandler((req, res) => {
            const _nextHandle = this.server.getNextApp().getRequestHandler();
            const parsedUrl = url_1.parse(req.url, true);
            _nextHandle(req, res, parsedUrl);
        });
        this.jsonErrorHandler = (err, req, res, next) => {
            try {
                console.error(err);
                if (err.sql && !err.statusCode) {
                    err.message = "DB error.";
                }
                if (process.env.NODE_ENV !== "production") {
                    return res.status(err.statusCode || 500).json({ error: Object.assign({}, err, { message: err.message }) });
                }
                else {
                    return res
                        .status(err.statusCode || 500)
                        .json({ error: { message: err.message, code: err.code } });
                }
            }
            catch (err) {
                next(err);
            }
        };
        this.route = exports.route;
    }
    static appendJsonRoutesFromDict(router, setup) {
        const routeDict = setup(RouteDictHelper);
        Object.keys(routeDict).forEach(key => {
            let routeOpts = routeDict[key];
            let method = routeOpts.method || "post";
            let mw = routeOpts.middleware || [];
            let fn = async (req, res) => {
                validateRequest(routeOpts, req);
                let result = await routeOpts.handler(req);
                res.send(result);
            };
            router[method](key, ...mw, RouterBuilder.createHandler(fn));
        });
    }
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    async createHtmlRouter(callback, options = {}) {
        const router = expressMod.Router();
        if (callback) {
            await callback({ router });
        }
        if (this.server.options.errorRoute) {
            const errorMw = (err, req, res, next) => {
                this.server.getNextApp().render(req, res, this.server.options.errorRoute, {
                    message: String(err)
                });
            };
            router.use(errorMw);
        }
        if (!options.noNextJs) {
            router.use(this.nextMw);
        }
        return router;
    }
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    async createJsonRouter(callback) {
        const router = expressMod.Router();
        router.use(expressMod.json());
        await callback({ router });
        router.use(function apiNotFound(_, __, next) {
            next(ono({ statusCode: 404 }, "Path not found (404)."));
        });
        router.use(this.jsonErrorHandler);
        return router;
    }
    async opinionatedJsonRouter(setup) {
        return this.createJsonRouter(async ({ router }) => {
            return RouterBuilder.appendJsonRoutesFromDict(router, setup);
        });
    }
}
RouterBuilder.yup = yup;
RouterBuilder.polka = expressMod;
/**
 * Wraps request handler in try/catch/next
 */
RouterBuilder.createHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    }
    catch (err) {
        next(err);
    }
};
exports.RouterBuilder = RouterBuilder;
exports.route = (opts = {}) => {
    return {
        handler: (fn) => {
            return Object.assign(opts, { handler: fn });
        }
    };
};
const validateRequest = (opts, req) => {
    if (!opts.validation)
        return;
    const what = opts.validation;
    if (what.query)
        req.query = what.query.validateSync(req.query);
    if (what.params)
        req.params = what.params.validateSync(req.params);
    if (what.body) {
        req.body = what.body.validateSync(req.body, { stripUnknown: true });
    }
};
const RouteDictHelper = {
    route: exports.route,
    yup
};
//# sourceMappingURL=router-builder.js.map