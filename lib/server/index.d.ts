import nextjs = require("next");
import polka = require("polka");
export { default as ContextFactory, defaultMappers } from "./context";
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
    getNextApp(): nextjs.Server;
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
export { Server, nextjs };
