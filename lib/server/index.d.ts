/// <reference path="../../types/global.types.d.ts" />
import expressMod = require("express");
import { Server as NextServer } from "next";
export declare type ExpressApp = ReturnType<typeof expressMod>;
export declare class Server {
    ctx: Nextpress.Context;
    isProduction: boolean;
    constructor(ctx: Nextpress.Context, isProduction?: boolean);
    options: {
        errorRoute: string;
        useNextjs: boolean;
        useSession: boolean;
        useJwt: boolean;
        jwtOptions: {
            tokenHeader: string;
            tokenDuration: number;
        };
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
    run(): Promise<{}>;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes({ app }: {
        app: ExpressApp;
    }): Promise<void>;
    setupGlobalMiddleware(expressApp: expressMod.Router): Promise<expressMod.Router>;
    /**
     * the next.config.js
     */
    getNextjsConfig(): any;
    createSessionStore(): any;
    createSessionMw(store: any): any;
    createAuthMw_Session(): expressMod.RequestHandler;
    createAuthMw_Jwt(): expressMod.RequestHandler;
}
interface User {
    id: number;
    email: string;
}
class UserAuthSession {
    req: any;
    constructor(req: any);
    getUser(): Promise<User | undefined>;
    setUser(user: User): Promise<string>;
    logout(): Promise<void>;
}
class UserAuthJwt implements UserAuthSession {
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
