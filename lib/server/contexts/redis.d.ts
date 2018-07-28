import Redis = require("ioredis");
declare const _default: {
    id: string;
    optionalKeys: string[];
    envContext(): {
        redis: {
            instance: () => Redis.Redis;
        };
    };
};
export default _default;
