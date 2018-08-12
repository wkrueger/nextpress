import { Server } from ".";
import expressMod = require("express");
import yup = require("yup");
export declare class RouterBuilder {
    server: Server;
    constructor(server: Server);
    static yup: typeof yup;
    static polka: typeof expressMod;
    /**
     * Wraps request handler in try/catch/next
     */
    static createHandler: (fn: expressMod.RequestHandler) => expressMod.RequestHandler;
    static appendJsonRoutesFromDict<Dict extends Record<string, RouteOpts>>(router: expressMod.Router, setup: (i: typeof RouteDictHelper) => Dict): void;
    nextMw: expressMod.RequestHandler;
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback?: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>, options?: {
        noNextJs?: boolean;
    }): Promise<import("express-serve-static-core").Router>;
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>): Promise<import("express-serve-static-core").Router>;
    opinionatedJsonRouter<Dict extends Record<string, RouteOpts>>(setup: (i: typeof RouteDictHelper) => Dict): Promise<import("express-serve-static-core").Router>;
    jsonErrorHandler: expressMod.ErrorRequestHandler;
    route: <Opts extends RouteOpts>(opts?: Opts) => {
        handler: (fn: HandlerType<Opts>) => RouteOpts;
    };
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
interface EditedRequestHandler<Replace = {}> {
    (req: Omit<expressMod.Request, keyof Replace> & Replace): Promise<Record<string, any>>;
}
interface RouteOpts {
    method?: string;
    middleware?: expressMod.RequestHandler[];
    validation?: SchemaDict;
    handler?: Function;
}
declare type NeverParams = {
    body: unknown;
    query: unknown;
    params: unknown;
};
declare type HandlerType<Opts> = Opts extends {
    validation: any;
} ? EditedRequestHandler<UnwrapSchemaDict<Opts["validation"]>> : EditedRequestHandler<NeverParams>;
export declare const route: <Opts extends RouteOpts>(opts?: Opts) => {
    handler: (fn: HandlerType<Opts>) => RouteOpts;
};
declare const RouteDictHelper: {
    route: <Opts extends RouteOpts>(opts?: Opts) => {
        handler: (fn: HandlerType<Opts>) => RouteOpts;
    };
    yup: typeof yup;
};
declare type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : unknown;
declare type SchemaDict = {
    query?: yup.ObjectSchema<any>;
    body?: yup.ObjectSchema<any>;
    params?: yup.ObjectSchema<any>;
};
declare type UnwrapSchemaDict<T extends SchemaDict> = {
    query: UnwrapSchema<T["query"]>;
    body: UnwrapSchema<T["body"]>;
    params: UnwrapSchema<T["params"]>;
};
export {};
