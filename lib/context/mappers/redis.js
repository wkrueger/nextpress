"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Redis = require("ioredis");
const __1 = require("..");
exports.context = __1.validateContextType({
    id: "default.redis",
    envKeys: [],
    optionalKeys: ["REDIS_URL"],
    envContext() {
        let _instance;
        function instance() {
            if (_instance)
                return _instance;
            if (process.env.REDIS_URL)
                _instance = new Redis(process.env.REDIS_URL);
            else
                _instance = new Redis();
            return _instance;
        }
        let out = {
            redis: {
                instance
            }
        };
        return out;
    }
});
//# sourceMappingURL=redis.js.map