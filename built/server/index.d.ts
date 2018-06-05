/// <reference types="express" />
/// <reference types="next" />
import nextjs = require("next");
import express = require("express");
export { default as ContextFactory, defaultMappers as contextPlugins } from "./context";
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
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * the next.config.js
     */
    nextConfig(): any;
    /**
     * helpers available on the routeSetup method
     */
    _routeSetupHelper(): {
        htmlRoutes(fn?: (h: express.Router) => Promise<void>): Promise<express.Router>;
        jsonRoutes(fn: (h: express.Router) => Promise<void>): Promise<express.Router>;
        tryMw: (fn: (req: express.Request, res: express.Response) => void | Promise<void>) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
        nextApp: nextjs.Server;
        nextMw: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
        jsonRouteDict: (router: express.Router, routeDict: {
            [k: string]: RouteDictItem;
        }) => void;
        withMethod: (method: string, item: RouteDictItem) => RouteDictItem;
        withMiddleware: (mw: express.RequestHandler[], item: RouteDictItem) => RouteDictItem;
    };
    jsonErrorHandler: express.ErrorRequestHandler;
}
export interface RouteDictItem {
    (req: express.Request): Promise<{
        [r: string]: any;
    }>;
    method?: string;
    middleware?: express.RequestHandler[];
}
export { Server, nextjs };
