import { Server } from ".";
import yup = require("yup");
export declare class RouterBuilder {
    server: Server;
    constructor(server: Server);
    static yup: typeof yup;
    static polka: {
        (): Polka.App;
        Router(): Polka.Router;
        json(): Polka.Middleware;
    };
    static tryMw: (fn: Polka.Middleware) => Polka.Middleware;
    static appendJsonRoutesFromDict<Dict extends Record<string, RouteDictItem>>(router: Polka.Router, setup: (i: typeof RouteDictSetters) => Dict): void;
    private _nextHandle;
    nextMw: Polka.Middleware;
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback?: ({ router }: {
        router: Polka.Router;
    }) => Promise<void>): Promise<Polka.Router>;
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback: ({ router }: {
        router: Polka.Router;
    }) => Promise<void>): Promise<Polka.Router>;
    createJsonRouterFromDict<Dict extends Record<string, RouteDictItem>>(setup: (i: typeof RouteDictSetters) => Dict): Promise<Polka.Router>;
    jsonErrorHandler: Polka.ErrorMiddleware;
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export interface RouteDictItem<Replace = {}> {
    (req: Omit<Polka.Request, keyof Replace> & Replace): Promise<{
        [r: string]: any;
    }>;
    method?: string;
    middleware?: Polka.Middleware[];
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
    withMiddleware(mw: Polka.Middleware[], item: RouteDictItem<{}>): RouteDictItem<{}>;
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
