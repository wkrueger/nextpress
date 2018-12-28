import express = require("express");
interface User {
    id: number;
    email: string;
}
export declare class UserAuthJwt {
    req: express.Request;
    resp: express.Response;
    private opts;
    constructor(req: express.Request, resp: express.Response, opts: {
        secret: string;
        durationSeconds: number;
    });
    private _user;
    private tryToken;
    getUser(): Promise<any>;
    setUser(user: User): Promise<string>;
    logout(): Promise<void>;
}
export {};
