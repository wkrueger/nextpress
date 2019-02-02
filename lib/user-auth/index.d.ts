/// <reference types="node" />
import Yup = require("yup");
import { Server } from "../server";
import { RouterBuilder, RouteDictHelper } from "../server/router-builder";
import { UserStore, BaseUser } from "./user-stores";
import { RequestHandler } from "express";
declare const emailSchema: Yup.ObjectSchema<{
    email: string;
}>;
declare const requestIdSchema: Yup.ObjectSchema<{
    requestId: string;
}>;
declare const pwdRequestSchema: Yup.ObjectSchema<{
    pwd1: string;
    pwd2: string;
    requestId: string;
}>;
declare type SchemaType<T> = T extends Yup.ObjectSchema<infer Y> ? Y : never;
export declare class UserAuth<User extends BaseUser = BaseUser> {
    ctx: Nextpress.Context;
    schema_createUser: Yup.ObjectSchema<{
        username: string;
        email: string;
        password: string;
    }>;
    _bcrypt: any;
    readonly bcrypt: typeof import("bcrypt");
    sendMail?: ((inp: {
        email: string;
        subject: string;
        html: string;
        attachment?: {
            value: NodeJS.ReadStream;
            options: {
                filename: string;
                contentType: string;
            };
        }[] | undefined;
    }) => Promise<any>) | undefined;
    userStore: UserStore<User>;
    options: {
        skipNewUserValidation: boolean;
    };
    constructor(ctx: Nextpress.Context);
    init(): Promise<void>;
    private checkAndUpdateUserRequestCap;
    create(inp: {
        username: string;
        email: string;
        password: string;
    }, opts?: {
        askForValidation: boolean;
        extraFields?: Partial<User>;
    }): Promise<number>;
    validateHash(hash: string): Promise<{
        id: number;
        email: string;
    }>;
    validateLogin(inp: {
        username: string;
        password: string;
    }): Promise<User | undefined>;
    createResetPwdRequest(inp: SchemaType<typeof emailSchema>): Promise<void>;
    findResetPwdRequest(inp: SchemaType<typeof requestIdSchema>): Promise<boolean>;
    performResetPwd(inp: SchemaType<typeof pwdRequestSchema>): Promise<void>;
    checkSession: RequestHandler;
    throwOnUnauthMw: RequestHandler;
    /**
     * overrideable (default is 10 reqs / 10 secs per route)
     * this counts all the requests this server receives
     */
    _getRequestThrottleMws(): {
        createUser: RequestHandler;
        login: RequestHandler;
        requestReset: RequestHandler;
        performReset: RequestHandler;
    };
    /**
     * overrideable
     * this is a per-user time limit for the operations
     */
    _getPerUserWaitTime(): {
        login: number;
        requestPasswordReset: number;
    };
    loginRoute({ username, password }: {
        username: string;
        password: string;
    }, setUser: (u: {
        id: number;
        email: string;
    }) => Promise<string>, mapUser?: (u: User) => {
        email: string;
        id: number;
    }): Promise<{
        id: number | undefined;
        token: string;
    }>;
    userJsonMethods(helper: typeof RouteDictHelper): {
        "/createUser": import("../server/router-builder").RouteOpts;
        "/login": import("../server/router-builder").RouteOpts;
        "/request-password-reset": import("../server/router-builder").RouteOpts;
        "/perform-password-reset": import("../server/router-builder").RouteOpts;
        "/logout": import("../server/router-builder").RouteOpts;
    };
    userRoutes(routerBuilder: RouterBuilder): Promise<{
        json: import("express-serve-static-core").Router;
        html: import("express-serve-static-core").Router;
    }>;
    _renderSimpleMessage(server: Server, req: any, res: any, title: string, message: string, type: string): Promise<void>;
    /**
     * Overrideable.
     * The route to be used for user creation validation email.
     */
    _validateRoute(): string;
    /**
     * Overrideable.
     * The route to be used for user reset password email.
     */
    _passwordResetFormRoute(): string;
    _createValidationLink(hash: string): string;
    _createResetPasswordLink(seq: string): string;
    _validationMailHTML(i: {
        address: string;
        validationLink: string;
    }): Promise<string>;
    _validationMailAttachment(): Promise<void | {
        value: NodeJS.ReadStream;
        options: {
            filename: string;
            contentType: string;
        };
    }[]>;
    _resetPwdMailHTML(i: {
        address: string;
        validationLink: string;
    }): Promise<string>;
    _resetPwdMailSubject(): string;
    _validationMailSubject(): string;
}
export {};
