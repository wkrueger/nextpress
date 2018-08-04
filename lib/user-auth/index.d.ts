import Yup = require("yup");
import { Server } from "../server";
import { RouterBuilder } from "../server/router-builder";
import { UserStore } from "./user-stores";
import { RequestHandler } from "express";
const createUserSchema: Yup.ObjectSchema<{
    email: string;
    password: string;
}>;
const emailSchema: Yup.ObjectSchema<{
    email: string;
}>;
const requestIdSchema: Yup.ObjectSchema<{
    requestId: string;
}>;
const pwdRequestSchema: Yup.ObjectSchema<{
    pwd1: string;
    pwd2: string;
    requestId: string;
}>;
export interface User {
    id: number;
    email: string;
    auth?: string;
    validationHash?: string;
}
type SchemaType<T> = T extends Yup.ObjectSchema<infer Y> ? Y : never;
export declare class UserAuth {
    ctx: Nextpress.Context;
    constructor(ctx: Nextpress.Context);
    _bcrypt: any;
    readonly bcrypt: typeof import("bcrypt");
    sendMail: (inp: {
        email: string;
        subject: string;
        html: string;
    }) => Promise<any>;
    userStore: UserStore;
    init(): Promise<void>;
    private checkAndUpdateUserRequestCap;
    create(inp: SchemaType<typeof createUserSchema>, opts?: {
        askForValidation: boolean;
    }): Promise<void>;
    validate(hash: string): Promise<User>;
    find(inp: SchemaType<typeof createUserSchema>): Promise<User | undefined>;
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
    userRoutes(routerBuilder: RouterBuilder): Promise<{
        json: import("express-serve-static-core").Router;
        html: import("express-serve-static-core").Router;
    }>;
    _renderSimpleMessage(server: Server, req: any, res: any, title: string, message: string): Promise<void>;
    _validationMailHTML(i: {
        address: string;
        validationLink: string;
    }): string;
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
    _resetPwdMailHTML(i: {
        address: string;
        validationLink: string;
    }): string;
    _pwdResetEmailSubject(): string;
    _newAccountEmailSubject(): string;
}
declare global {
    namespace Express {
        interface Session {
            user?: {
                id: number;
                email: string;
            };
        }
    }
}
export {};
