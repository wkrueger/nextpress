"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Redis = require("ioredis");
const __1 = require("..");
exports.redisContext = (opts) => __1.createContextMapper({
    id: "default.redis",
    envKeys: [],
    optionalKeys: ["REDIS_URL"],
    envContext({ getKey }) {
        let _instance;
        function instance() {
            if (_instance)
                return _instance;
            if (getKey("REDIS_URL"))
                _instance = new Redis(getKey("REDIS_URL"), opts);
            else
                _instance = new Redis();
            return _instance;
        }
        let out = {
            redis: {
                client: instance
            }
        };
        return out;
    }
});
//# sourceMappingURL=redis.js.map