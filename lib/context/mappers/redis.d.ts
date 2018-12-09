import Redis = require("ioredis");
export declare const redisContext: (opts?: Redis.RedisOptions | undefined) => {
    id: string;
    envKeys: never[];
    optionalKeys: string[];
    envContext({ getKey }: {
        getKey: (s: string) => string | undefined;
    }): {
        redis: {
            client: () => Redis.Redis;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<ReturnType<typeof redisContext>["envContext"]> {
        }
    }
}
