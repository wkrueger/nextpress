import nextjs = require("next");
import express = require("express");
export { default as ContextFactory } from "./context";
export declare type ExpressApp = ReturnType<typeof express>;
export declare type RouteSetupHelper = ReturnType<typeof Server.prototype._routeSetupHelper>;
declare class Server {
    ctx: Nextpress.Context;
    constructor(ctx: Nextpress.Context);
    errorRoute: string;
    routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void>;
    nextApp: nextjs.Server;
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * the next.config.js
     */
    nextConfig(): any;
    _routeSetupHelper(): {
        htmlRoutes(fn: (h: {
            router: express.Router;
        }) => Promise<void>): Promise<express.Router>;
        tryMw: (fn: (req: express.Request, res: express.Response) => void | Promise<void>) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
        nextApp: nextjs.Server;
        nextMw: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    };
}
export { Server, nextjs };
