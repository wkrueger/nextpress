import knexMod = require("knex");
declare enum Username {
}
interface User {
    id: number;
    email: string;
    username: Username;
    lastRequest?: Date;
    auth?: string;
    validationHash?: string;
}
export declare abstract class UserStore {
    abstract initStore(): Promise<void>;
    abstract routineCleanup(): Promise<void>;
    abstract getLastRequest(userId: number): Promise<Date | undefined>;
    abstract writeLastRequest(userId: number): Promise<void>;
    abstract writeNewUser(i: {
        username: string;
        email: string;
        auth: string;
        validationHash: string | null;
        validationExpires: Date | null;
    }): Promise<number>;
    abstract deleteUserId(id: number): Promise<void>;
    abstract queryUserByValidationHash(hash: string): Promise<User | undefined>;
    abstract queryUserByResetPasswordHash(hash: string): Promise<User | undefined>;
    abstract queryUserByEmail(email: string): Promise<undefined | User>;
    abstract queryUserByName(name: string): Promise<undefined | User>;
    abstract clearValidationHash(userId: number): Promise<void>;
    abstract writeResetPwdRequest(userId: number, hash: string, expires: Date): Promise<number>;
    abstract writeNewPassword(requestId: string, pwdhash: string): Promise<void>;
}
export declare class KnexStore extends UserStore {
    ctx: Nextpress.Context;
    constructor(ctx: Nextpress.Context);
    _knex: knexMod;
    userTableName: string;
    fields: string[];
    userTable(): knexMod.QueryBuilder;
    static initRun: boolean;
    initStore(): Promise<void>;
    private _queryUserById;
    routineCleanup(): Promise<void>;
    getLastRequest(id: number): Promise<Date | undefined>;
    writeLastRequest(id: number): Promise<any>;
    writeNewUser(i: {
        username: string;
        email: string;
        auth: string;
        validationHash: string | null;
        validationExpires: Date | null;
    }): Promise<any>;
    deleteUserId(pkey: number): Promise<void>;
    queryUserByValidationHash(hash: string): Promise<any>;
    clearValidationHash(userId: number): Promise<void>;
    queryUserByEmail(email: string): Promise<User>;
    writeResetPwdRequest(id: number, hash: string, expires: Date): Promise<any>;
    queryUserByResetPasswordHash(hash: string): Promise<User | undefined>;
    writeNewPassword(requestId: string, pwdhash: string): Promise<void>;
    queryUserByName(username: string): Promise<any>;
}
export {};
