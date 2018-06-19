import Yup = require("yup");
import knexModule = require("knex");
declare const createUserSchema: Yup.ObjectSchema<{
    email: string;
    password: string;
}>;
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
export interface User {
    id: number;
    email: string;
    auth?: string;
    validationHash?: string;
}
declare type SchemaType<T> = T extends Yup.ObjectSchema<infer Y> ? Y : never;
export declare class UserAuth {
    ctx: Nextpress.Context;
    _knex: knexModule;
    constructor(ctx: Nextpress.Context, _knex: knexModule);
    userTable(): knexModule.QueryBuilder;
    create(inp: SchemaType<typeof createUserSchema>): Promise<void>;
    validate(hash: string): Promise<User>;
    find(inp: SchemaType<typeof createUserSchema>): Promise<User | undefined>;
    createResetPwdRequest(inp: SchemaType<typeof emailSchema>): Promise<void>;
    findResetPwdRequest(inp: SchemaType<typeof requestIdSchema>): Promise<boolean>;
    performResetPwd(inp: SchemaType<typeof pwdRequestSchema>): Promise<void>;
    _validationMailHTML(i: {
        address: string;
        validationLink: string;
    }): string;
    _createValidationLink(hash: string): string;
    _createResetPasswordLink(seq: string): string;
    _resetPwdMailHTML(i: {
        address: string;
        validationLink: string;
    }): string;
    _pwdResetEmailSubject(): string;
    _newAccountEmailSubject(): string;
}
export {};
