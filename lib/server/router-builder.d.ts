import { Server } from ".";
import express = require("express");
import yup = require("yup");
export declare class RouterBuilder {
    server: Server;
    constructor(server: Server);
    static yup: typeof yup;
    static express: typeof express;
    static tryMw: (fn: (req: express.Request, res: express.Response) => void | Promise<void>) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    static appendJsonRoutesFromDict<Dict extends Record<string, RouteDictItem>>(router: express.Router, setup: (i: typeof RouteDictSetters) => Dict): void;
    private _nextHandle;
    nextMw: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback?: ({ router }: {
        router: express.Router;
    }) => Promise<void>): Promise<import("express-serve-static-core").Router>;
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback: ({ router }: {
        router: express.Router;
    }) => Promise<void>): Promise<express.Router>;
    createJsonRouterFromDict<Dict extends Record<string, RouteDictItem>>(setup: (i: typeof RouteDictSetters) => Dict): Promise<express.Router>;
    jsonErrorHandler: express.ErrorRequestHandler;
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export interface RouteDictItem<Replace = {}> {
    (req: Omit<express.Request, keyof Replace> & Replace): Promise<{
        [r: string]: any;
    }>;
    method?: string;
    middleware?: express.RequestHandler[];
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
    withMiddleware(mw: express.RequestHandler[], item: RouteDictItem<{}>): RouteDictItem<{}>;
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
