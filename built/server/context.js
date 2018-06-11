"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
exports.defaultMappers = {
    mailgun: {
        id: 'default.mailgun',
        envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
        optionalKeys: [],
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
    database: {
        id: 'default.database',
        envKeys: ["DB_NAME", "DB_USER", "DB_PASS"],
        optionalKeys: [],
        envContext() {
            return {
                database: {
                    name: process.env.DB_NAME,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASS,
                },
            };
        },
    },
    website: {
        id: 'default.website',
        envKeys: ["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
        optionalKeys: ["WEBSITE_LOG_REQUESTS"],
        envContext() {
            return {
                website: {
                    root: process.env.WEBSITE_ROOT,
                    port: Number(process.env.WEBSITE_PORT),
                    sessionSecret: process.env.WEBSITE_SESSION_SECRET,
                    logRequests: Boolean(process.env.WEBSITE_LOG_REQUESTS),
                }
            };
        }
    }
};
function default_1(i) {
    const pluginKeys = (i.mappers || []).reduce((out, item) => {
        return [...out, ...item.envKeys];
    }, []);
    const pluginOptional = (i.mappers || []).reduce((out, item) => {
        return [...out, ...item.optionalKeys];
    }, []);
    const required = pluginKeys.filter(k => pluginOptional.indexOf(k) === -1);
    const envfilePath = path.resolve(i.projectRoot, "envfile.env");
    try {
        fs.statSync(envfilePath);
    }
    catch (err) {
        const scaffold = required.reduce((out, item) => {
            return out + `${item}=fill\n`;
        }, "");
        fs.writeFileSync(envfilePath, scaffold);
        throw Error("envfile not found. Fill up the generated one.");
    }
    dotenv.config({ path: path.resolve(i.projectRoot, "envfile.env") });
    for (let x = 0; x < required.length; x++) {
        const key = required[x];
        if (!process.env[key])
            throw Error(`Required env key ${key} not defined.`);
    }
    const pluginContext = (i.mappers || []).reduce((out, item) => {
        return Object.assign({}, out, item.envContext());
    }, {});
    return Object.assign({ projectRoot: i.projectRoot, loadedContexts: new Set((i.mappers || []).map(m => m.id)) }, pluginContext);
}
exports.default = default_1;
//# sourceMappingURL=context.js.map