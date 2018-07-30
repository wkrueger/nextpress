/// <reference path="../../types/global.types.d.ts" />
import polka = require("polka");
import { Server as NextServer } from "next";
export { ContextFactory } from "../context";
export declare type PolkaApp = ReturnType<typeof polka>;
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
    getNextApp(): NextServer;
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes({ app }: {
        app: PolkaApp;
    }): Promise<void>;
    setupGlobalMiddleware(expressApp: Polka.App): Promise<Polka.App>;
    /**
     * the next.config.js
     */
    getNextjsConfig(): any;
    createSessionStore(): any;
    createSessionMw(store: any): any;
}
export { Server };
