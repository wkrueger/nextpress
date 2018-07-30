import Redis = require("ioredis");
export declare const context: {
    id: string;
    envKeys: never[];
    optionalKeys: string[];
    envContext(): {
        redis: {
            instance: () => Redis.Redis;
        };
    };
};
declare global {
    namespace Nextpress {
        interface CustomContext extends ReturnType<typeof context["envContext"]> {
        }
    }
}
