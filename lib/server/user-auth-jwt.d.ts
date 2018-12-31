import Fastify = require("fastify");
interface User {
    id: number;
    email: string;
}
export declare class UserAuthJwt {
    req: Fastify.FastifyRequest;
    resp: Fastify.FastifyReply<any>;
    private opts;
    constructor(req: Fastify.FastifyRequest, resp: Fastify.FastifyReply<any>, opts: {
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
