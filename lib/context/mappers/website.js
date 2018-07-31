"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
exports.websiteContext = __1.createContextMapper({
    id: "default.website",
    envKeys: ["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
    optionalKeys: ["WEBSITE_LOG_REQUESTS", "WEBSITE_BUNDLE_ANALYZER"],
    envContext() {
        return {
            website: {
                root: process.env.WEBSITE_ROOT,
                port: Number(process.env.WEBSITE_PORT),
                sessionSecret: process.env.WEBSITE_SESSION_SECRET,
                logRequests: Boolean(process.env.WEBSITE_LOG_REQUESTS),
                bundleAnalyzer: Boolean(process.env.WEBSITE_BUNDLE_ANALYZER)
            }
        };
    }
});
//# sourceMappingURL=website.js.map