import knexMod = require("knex");
interface User {
    id: number;
    email: string;
    auth?: string;
    validationHash?: string;
}
export declare abstract class UserStore {
    abstract initStore(): Promise<void>;
    abstract routineCleanup(): Promise<void>;
    abstract getLastRequest(email: string): Promise<Date | undefined>;
    abstract writeLastRequest(email: string, date: Date): Promise<void>;
    abstract writeNewUser(i: {
        email: string;
        auth: string;
        validationHash: string | null;
        validationExpires: Date | null;
    }): Promise<number>;
    abstract deleteUserId(id: number): Promise<void>;
    abstract queryUserByValidationHash(hash: string): Promise<{
        id: number;
        email: string;
    } | undefined>;
    abstract queryUserByResetPasswordHash(hash: string): Promise<number | undefined>;
    abstract queryUserByEmail(email: string): Promise<undefined | User>;
    abstract clearValidationHash(userId: number): Promise<void>;
    abstract writeResetPwdRequest(email: string, hash: string, expires: Date): Promise<number>;
    abstract writeNewPassword(requestId: string, pwdhash: string): Promise<void>;
}
export declare class KnexStore extends UserStore {
    ctx: Nextpress.Context;
    constructor(ctx: Nextpress.Context);
    _knex: knexMod;
    userTableName: string;
    userTable(): knexMod.QueryBuilder;
    initStore(): Promise<void>;
    routineCleanup(): Promise<void>;
    getLastRequest(email: string): Promise<Date | undefined>;
    writeLastRequest(email: string, date: Date): Promise<void>;
    writeNewUser(i: {
        email: string;
        auth: string;
        validationHash: string | null;
        validationExpires: Date | null;
    }): Promise<any>;
    deleteUserId(pkey: number): Promise<void>;
    queryUserByValidationHash(hash: string): Promise<any>;
    clearValidationHash(userId: number): Promise<void>;
    queryUserByEmail(email: string): Promise<User>;
    writeResetPwdRequest(email: string, hash: string, expires: Date): Promise<any>;
    queryUserByResetPasswordHash(hash: string): Promise<number>;
    writeNewPassword(requestId: string, pwdhash: string): Promise<void>;
}
export {};
