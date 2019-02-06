/// <reference path="../../types/global.types.d.ts" />
/// <reference types="node" />
import expressMod = require("express");
import { Server as NextServer } from "next";
import http = require("http");
export declare type ExpressApp = ReturnType<typeof expressMod>;
export declare class Server {
    ctx: Nextpress.Context;
    opts: {
        tag?: string;
    };
    static __tag__: string;
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
            tokenHeader: string;
            tokenDuration: number;
        };
        bundleAnalyzer: {
            analyzeServer: boolean;
            analyzeBrowser: boolean;
        };
    };
    static getDefaultContext(): Nextpress.Context;
    useHMR(): void;
    /**
     * all set, run
     */
    run(): Promise<void>;
    /**
     * app.use's on the express app
     */
    setupGlobalMiddleware(expressApp: expressMod.Router): Promise<expressMod.Router>;
    _nextApp?: NextServer;
    getNextApp(): NextServer;
    buildForProduction(): Promise<void>;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes({ app }: {
        app: ExpressApp;
    }): Promise<void>;
    /**
     * the next.config.js
     */
    getNextjsConfig(): any;
    createAuthMw_Jwt(): expressMod.RequestHandler;
}
interface User {
    id: number;
    email: string;
}
export declare class UserAuthSession {
    req: any;
    constructor(req: any);
    getUser(): Promise<User | undefined>;
    setUser(user: User): Promise<string>;
    logout(): Promise<void>;
}
export declare class UserAuthJwt implements UserAuthSession {
    req: any;
    private opts;
    constructor(req: any, opts: {
        headerKey: string;
        secret: string;
        durationSeconds: number;
    });
    private _user;
    getUser(): Promise<any>;
    setUser(user: User): Promise<string>;
    logout(): Promise<void>;
}
declare global {
    namespace Express {
        interface Request {
            nextpressAuth: UserAuthSession | UserAuthJwt;
        }
    }
}
export {};
