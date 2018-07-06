import nextjs = require("next");
import express = require("express");
import yup = require("yup");
export { default as ContextFactory, defaultMappers } from "./context";
export declare type ExpressApp = ReturnType<typeof express>;
export declare type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>;
declare class Server {
    ctx: Nextpress.Context;
    constructor(ctx: Nextpress.Context);
    errorRoute: string;
    _nextApp?: nextjs.Server;
    readonly nextApp: nextjs.Server;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void>;
    createSessionStore(): any;
    createSessionMw(store: any): express.RequestHandler;
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * the next.config.js
     */
    getNextjsConfig(): any;
    jsonErrorHandler: express.ErrorRequestHandler;
    /**
     * helpers available on the routeSetup method
     */
    _routeSetupHelper(): {
        /**
         * creates a router suited for next.js html/react routes;
         * we add the common middleware, you set up the routes on the callback;
         * next.js middleware is always added in the end of the stack.
         */
        htmlRoutes(fn?: (h: express.Router) => Promise<void>): Promise<express.Router>;
        /**
         * creates a router suited for JSON API routes;
         * we add the common middleware, you set up the routes on the callback;
         */
        jsonRoutes(fn: (h: express.Router) => Promise<void>): Promise<express.Router>;
        /** wraps a middleware in try/catch/next */
        tryMw: (fn: (req: express.Request, res: express.Response) => void | Promise<void>) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
        /** a reference to the next.js app, which has the renderer */
        nextApp: nextjs.Server;
        /** next.js default middleware */
        nextMw: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
        /** declare json routes in a simplified way */
        jsonRouteDict: typeof jsonRouteDict;
        /** for use on jsonRouteDict */
        withMethod: typeof withMethod;
        /** for use on jsonRouteDict */
        withMiddleware: typeof withMiddleware;
        /** for use on jsonRouteDict */
        withValidation: typeof withValidation;
        yup: typeof yup;
        express: typeof express;
    };
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export interface RouteDictItem<Replace = {}> {
    (req: Omit<express.Request, keyof Replace> & Replace): Promise<{
        [r: string]: any;
    }>;
    method?: string;
    middleware?: express.RequestHandler[];
}
declare type RouteDict = {
    [k: string]: RouteDictItem;
};
declare function jsonRouteDict<Dict extends RouteDict>(router: express.Router, routeDict: Dict): void;
/**
 * (for a given RouteItem) Sets another http method than the default
 */
declare function withMethod(method: string, item: RouteDictItem): RouteDictItem;
/**
 * (for a given route item) Adds middleware to be run before
 */
declare function withMiddleware(mw: express.RequestHandler[], item: RouteDictItem): RouteDictItem;
declare type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : never;
declare type SchemaDict = {
    [k in "query" | "params" | "body"]?: yup.ObjectSchema<any>;
};
declare type UnwrapSchemaDict<T extends SchemaDict> = {
    [k in keyof T]: UnwrapSchema<T[k]>;
};
/**
 * (for a given route item) Validates query and/or params with the provided rules.
 */
declare function withValidation<What extends SchemaDict>(what: What, item: RouteDictItem<UnwrapSchemaDict<What>>): RouteDictItem;
export { Server, nextjs };
