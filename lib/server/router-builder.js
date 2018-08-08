"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    }
    static appendJsonRoutesFromDict(router, setup) {
        const routeDict = setup(RouteDictHelper);
        Object.keys(routeDict).forEach(key => {
            let routeOpts = routeDict[key];
            let method = routeOpts.method || "post";
            let mw = routeOpts.middleware || [];
            let fn = (req, res) => __awaiter(this, void 0, void 0, function* () {
                validateRequest(routeOpts, req);
                let result = yield routeOpts.handler(req);
                res.send(result);
            });
            router[method](key, ...mw, RouterBuilder.createHandler(fn));
        });
    }
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const router = expressMod.Router();
            if (callback) {
                yield callback({ router });
            }
            if (this.server.options.errorRoute) {
                const errorMw = (err, req, res, next) => {
                    this.server.getNextApp().render(req, res, this.server.options.errorRoute, {
                        message: String(err)
                    });
                };
                router.use(errorMw);
            }
            router.use(this.nextMw);
            return router;
        });
    }
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const router = expressMod.Router();
            router.use(expressMod.json());
            yield callback({ router });
            router.use(function apiNotFound(_, __, next) {
                next(ono({ statusCode: 404 }, "Path not found (404)."));
            });
            router.use(this.jsonErrorHandler);
            return router;
        });
    }
    opinionatedJsonRouter(setup) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createJsonRouter(({ router }) => __awaiter(this, void 0, void 0, function* () {
                return RouterBuilder.appendJsonRoutesFromDict(router, setup);
            }));
        });
    }
}
RouterBuilder.yup = yup;
RouterBuilder.polka = expressMod;
/**
 * Wraps request handler in try/catch/next
 */
RouterBuilder.createHandler = (fn) => (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield fn(req, res, next);
    }
    catch (err) {
        next(err);
    }
});
exports.RouterBuilder = RouterBuilder;
const route = (opts = {}) => {
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
    if (what.body)
        req.body = what.body.validateSync(req.body);
};
const RouteDictHelper = {
    route,
    yup
};
//# sourceMappingURL=router-builder.js.map