/// <reference path="../../types/global.types.d.ts" />
/// <reference types="node" />
/// <reference types="next-server" />
import expressMod = require("express");
import { Server as NextServer } from "next";
import http = require("http");
import { UserAuthJwt } from "./user-auth-jwt";
export declare type ExpressApp = ReturnType<typeof expressMod>;
export declare class Server {
    ctx: Nextpress.Context;
    opts: {
        tag?: string;
    };
    nodeHttpServer?: http.Server;
    expressApp?: ExpressApp;
    isProduction: boolean;
    constructor(ctx: Nextpress.Context, opts?: {
        tag?: string;
    });
    options: {
        errorRoute: string;
        useNextjs: boolean;
        useHelmet: boolean;
        jwtOptions: {
            tokenDuration: number;
        };
        bundleAnalyzer: {
            analyzeServer: boolean;
            analyzeBrowser: boolean;
        };
        prebuilt: boolean;
    };
    useHMR(): void;
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
    /**
     * to be used if manually setting up a build flow
     */
    buildForProduction(): Promise<void>;
    /**
     * app.use's on the express app
     */
    protected setupGlobalMiddleware(expressApp: expressMod.Router): Promise<expressMod.Router>;
    UserAuthClass: typeof UserAuthJwt;
    protected createAuthMw_Jwt(): expressMod.RequestHandler;
    /**
     * the next.config.js
     */
    protected getNextjsConfig(): any;
    _nextApp?: NextServer;
    getNextApp(): import("next-server").Server;
}
declare global {
    namespace Express {
        interface Request {
            nextpressAuth: UserAuthJwt;
        }
    }
}
