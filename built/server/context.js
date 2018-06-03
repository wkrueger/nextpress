"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
exports.defaultPlugins = {
    mailgun: {
        envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
        envContext() {
            return {
                mailgun: {
                    from: process.env.MAILGUN_FROM,
                    domain: process.env.MAILGUN_DOMAIN,
                    apiKey: process.env.MAILGUN_API_KEY,
                },
            };
        },
    },
};
function default_1(i) {
    return __awaiter(this, void 0, void 0, function* () {
        dotenv.config({ path: path.resolve(i.projectRoot, "envfile.env") });
        const pluginKeys = (i.plugins || []).reduce((out, item) => {
            return [...out, ...item.envKeys];
        }, []);
        const required = [
            ...["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET", "DB_NAME", "DB_USER", "DB_PASS"],
            ...pluginKeys,
            ...(i.requiredKeys || []),
        ];
        for (let x = 0; x < required.length; x++) {
            const key = required[x];
            if (!process.env[key])
                throw Error(`Required env key ${key} not defined.`);
        }
        const customContext = i.customContext ? i.customContext() : {};
        const defaultContext = {
            projectRoot: i.projectRoot,
            website: {
                root: process.env.WEBSITE_ROOT,
                port: Number(process.env.WEBSITE_PORT),
                sessionSecret: process.env.WEBSITE_SESSION_SECRET,
            },
            database: {
                name: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
            },
        };
        const pluginContext = (i.plugins || []).reduce((out, item) => {
            return Object.assign({}, out, item.envContext());
        }, {});
        return Object.assign({}, defaultContext, pluginContext, customContext);
    });
}
exports.default = default_1;
//# sourceMappingURL=context.js.map