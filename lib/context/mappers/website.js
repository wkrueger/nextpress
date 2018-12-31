"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
exports.websiteContext = __1.createContextMapper({
    id: "default.website",
    envKeys: ["WEBSITE_ROOT", "WEBSITE_PORT"],
    optionalKeys: [
        "WEBSITE_BASEURL",
        "WEBSITE_LOG_REQUESTS",
        "WEBSITE_BUNDLE_ANALYZER",
        "WEBSITE_LANGUAGE"
    ],
    envContext({ getKey }) {
        return {
            website: {
                root: getKey("WEBSITE_ROOT"),
                port: Number(getKey("WEBSITE_PORT")),
                baseUrl: getKey("WEBSITE_BASEURL") || "/",
                logRequests: Boolean(getKey("WEBSITE_LOG_REQUESTS")),
                bundleAnalyzer: Boolean(getKey("WEBSITE_BUNDLE_ANALYZER")),
                language: getKey("WEBSITE_LANGUAGE") || "en"
            }
        };
    }
});
//# sourceMappingURL=website.js.map