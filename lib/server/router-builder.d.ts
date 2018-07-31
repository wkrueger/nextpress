import { Server } from ".";
import expressMod = require("express");
import yup = require("yup");
export declare class RouterBuilder {
    server: Server;
    constructor(server: Server);
    static yup: typeof yup;
    static polka: typeof expressMod;
    static tryMw: (fn: expressMod.RequestHandler) => expressMod.RequestHandler;
    static appendJsonRoutesFromDict<Dict extends Record<string, RouteDictItem>>(router: expressMod.Router, setup: (i: typeof RouteDictSetters) => Dict): void;
    private _nextHandle;
    nextMw: expressMod.RequestHandler;
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback?: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>): Promise<import("express-serve-static-core").Router>;
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>): Promise<import("express-serve-static-core").Router>;
    createJsonRouterFromDict<Dict extends Record<string, RouteDictItem>>(setup: (i: typeof RouteDictSetters) => Dict): Promise<import("express-serve-static-core").Router>;
    jsonErrorHandler: expressMod.ErrorRequestHandler;
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export interface RouteDictItem<Replace = {}> {
    (req: Omit<expressMod.Request, keyof Replace> & Replace): Promise<{
        [r: string]: any;
    }>;
    method?: string;
    middleware?: expressMod.RequestHandler[];
}
declare const RouteDictSetters: {
    yup: typeof yup;
    /**
     * (for a given RouteItem) Sets another http method than the default
     */
    withMethod(method: string, item: RouteDictItem<{}>): RouteDictItem<{}>;
    /**
     * (for a given route item) Adds middleware to be run before
     */
    withMiddleware(mw: expressMod.RequestHandler[], item: RouteDictItem<{}>): RouteDictItem<{}>;
    /**
     * (for a given route item) Validates query and/or params with the provided rules.
     */
    withValidation<What extends SchemaDict>(what: What, item: RouteDictItem<UnwrapSchemaDict<What>>): RouteDictItem<{}>;
};
declare type UnwrapSchema<T> = T extends yup.ObjectSchema<infer R> ? R : never;
declare type SchemaDict = {
    [k in "query" | "params" | "body"]?: yup.ObjectSchema<any>;
};
declare type UnwrapSchemaDict<T extends SchemaDict> = {
    [k in keyof T]: UnwrapSchema<T[k]>;
};
export {};
