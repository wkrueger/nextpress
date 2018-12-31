/// <reference path="../../types/global.types.d.ts" />
/// <reference types="node" />
/// <reference types="next-server" />
import { Server as NextServer } from "next";
import http = require("http");
import { UserAuthJwt } from "./user-auth-jwt";
import * as Fastify from "fastify";
export declare class Server {
    ctx: Nextpress.Context;
    nodeHttpServer?: http.Server;
    isProduction: boolean;
    fastify: Fastify.FastifyInstance;
    constructor(ctx: Nextpress.Context);
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
    run(): Promise<any>;
    /**
     * this is meant to be overriden in order to set the server routes.
     */
    setupRoutes(): Promise<void>;
    /**
     * to be used if manually setting up a build flow
     */
    buildForProduction(): Promise<void>;
    /**
     * app.use's on the express app
     */
    protected setupGlobalMiddleware(): Promise<void>;
    UserAuthClass: typeof UserAuthJwt;
    protected createAuthMw_Jwt(): void;
    /**
     * the next.config.js
     */
    protected getNextjsConfig(): any;
    _nextApp?: NextServer;
    getNextApp(): import("next-server").Server;
    private setNextjsMiddleware;
}
declare module "fastify" {
    interface FastifyRequest {
        nextpressAuth: UserAuthJwt;
    }
}
