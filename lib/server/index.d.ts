import nextjs = require("next");
import express = require("express");
export { default as ContextFactory, defaultMappers } from "./context";
export declare type ExpressApp = ReturnType<typeof express>;
declare class Server {
    ctx: Nextpress.Context;
    isProduction: boolean;
    constructor(ctx: Nextpress.Context, isProduction?: boolean);
    options: {
        errorRoute: string;
        bundleAnalyzer: {
            analyzeServer: boolean;
            analyzeBrowser: boolean;
        };
    };
    private _nextApp?;
    getNextApp(): nextjs.Server;
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes({ app }: {
        app: ExpressApp;
    }): Promise<void>;
    setupGlobalMiddleware(expressApp: express.Application): Promise<express.Application>;
    /**
     * the next.config.js
     */
    getNextjsConfig(): any;
    createSessionStore(): any;
    createSessionMw(store: any): express.RequestHandler;
}
export { Server, nextjs };
