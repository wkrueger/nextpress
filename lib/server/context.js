"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const mailgun_1 = require("./contexts/mailgun");
const knex_1 = require("./contexts/knex");
const website_1 = require("./contexts/website");
const redis_1 = require("./contexts/redis");
exports.defaultMappers = {
    mailgun: mailgun_1.default,
    knex: knex_1.default,
    website: website_1.default,
    redis: redis_1.default
};
function default_1(i) {
    const pluginKeys = (i.mappers || []).reduce((out, item) => {
        return [...out, ...item.envKeys];
    }, []);
    const pluginOptional = (i.mappers || []).reduce((out, item) => {
        return [...out, ...item.optionalKeys];
    }, []);
    const required = pluginKeys.filter(k => pluginOptional.indexOf(k) === -1);
    if (!process.env.NO_ENVFILE) {
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
    }
    for (let x = 0; x < required.length; x++) {
        const key = required[x];
        if (!process.env[key])
            throw Error(`Required env key ${key} not defined.`);
    }
    const pluginContext = (i.mappers || []).reduce((out, item) => {
        return Object.assign({}, out, item.envContext());
    }, {});
    return Object.assign({ projectRoot: i.projectRoot, loadedContexts: new Set((i.mappers || []).map(m => m.id)) }, pluginContext, { requireContext(...contextIds) {
            for (let i = 0; i < contextIds.length; i++) {
                const contextId = contextIds[i];
                if (!this.loadedContexts.has(contextId)) {
                    throw Error(`context mapper with id: ${contextId} required but not found.`);
                }
            }
        } });
}
exports.default = default_1;
//# sourceMappingURL=context.js.map