"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
exports.jwtContext = __1.createContextMapper({
    id: "default.jwt",
    envKeys: ["JWT_SECRET"],
    optionalKeys: [],
    envContext({ getKey }) {
        return {
            jwt: {
                secret: getKey("JWT_SECRET")
            }
        };
    }
});
//# sourceMappingURL=jwt.js.map