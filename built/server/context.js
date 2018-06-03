"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
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
    sql: {
        envKeys: ["DB_NAME", "DB_USER", "DB_PASS"],
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
};
function default_1(i) {
    const pluginKeys = (i.plugins || []).reduce((out, item) => {
        return [...out, ...item.envKeys];
    }, []);
    const required = [
        ...["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
        ...pluginKeys,
        ...(i.requiredKeys || []),
    ];
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
    const customContext = i.customContext ? i.customContext() : {};
    const defaultContext = {
        projectRoot: i.projectRoot,
        website: {
            root: process.env.WEBSITE_ROOT,
            port: Number(process.env.WEBSITE_PORT),
            sessionSecret: process.env.WEBSITE_SESSION_SECRET,
        },
    };
    const pluginContext = (i.plugins || []).reduce((out, item) => {
        return Object.assign({}, out, item.envContext());
    }, {});
    return Object.assign({}, defaultContext, pluginContext, customContext);
}
exports.default = default_1;
//# sourceMappingURL=context.js.map