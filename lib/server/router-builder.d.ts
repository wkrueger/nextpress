import { Server } from ".";
import expressMod = require("express");
import yup = require("yup");
export declare class RouterBuilder {
    server: Server;
    constructor(server: Server);
    static yup: any;
    static express: any;
    /**
     * Wraps request handler in try/catch/next
     */
    static createHandler: (fn: any) => any;
    static appendJsonRoutesFromDict<Dict extends Record<string, RouteOpts>>(router: expressMod.Router, setup: (i: typeof RouteDictHelper) => Dict): void;
    nextMw: any;
    /**
     * creates a router suited for next.js html/react routes;
     * we add the common middleware, you set up the routes on the callback;
     * next.js middleware is always added in the end of the stack.
     */
    createHtmlRouter(callback?: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>, options?: {
        noNextJs?: boolean;
    }): Promise<any>;
    /**
     * creates a router suited for JSON API routes;
     * we add the common middleware, you set up the routes on the callback;
     */
    createJsonRouter(callback: ({ router }: {
        router: expressMod.Router;
    }) => Promise<void>): Promise<any>;
    /**
     * creates a router suited for JSON API routes, from a simplified RPC-ish syntax;
     * usage:
     ```
     var router = builder.rpcishJsonRouter( setup => {
       return {
         '/my-route': setup.route( ... ).handler( ... )
       }
     })
     ```
     */
    rpcishJsonRouter<Dict extends Record<string, RouteOpts>>(setup: (i: typeof RouteDictHelper) => Dict): Promise<any>;
    jsonErrorHandler(err: any, _req: expressMod.Request, res: expressMod.Response, next: expressMod.NextFunction): any;
    route: <Opts extends RouteOpts>(opts?: Opts) => {
        handler: (fn: HandlerType<Opts>) => RouteOpts;
    };
}
export declare type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
interface EditedRequestHandler<Replace = {}> {
    (req: Omit<expressMod.Request, keyof Replace> & Replace): Promise<Record<string, any>>;
}
export interface RouteOpts {
    method?: string;
    middleware?: PriorityRequestHandler[];
    validation?: SchemaDict;
    handler?: Function;
    withTransaction?: Nextpress.Context;
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
export interface PriorityRequestHandler extends expressMod.RequestHandler {
    priority?: number;
}
export declare const validateRequest: (opts: SchemaDict | undefined) => PriorityRequestHandler;
export declare const RouteDictHelper: {
    route: <Opts extends RouteOpts>(opts?: Opts) => {
        handler: (fn: HandlerType<Opts>) => RouteOpts;
    };
    yup: any;
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
