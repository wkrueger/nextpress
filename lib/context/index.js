"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const validateType = () => (i) => i;
exports.createContextMapper = validateType();
function ContextFactory(i) {
    const prefix = i.withPrefix || "";
    const prefixUpper = prefix.toUpperCase();
    const pluginKeys = (i.mappers || []).reduce((out, item) => {
        const envKeys = item.envKeys.map(key => prefixUpper + key);
        return [...out, ...envKeys];
    }, []);
    const pluginOptional = (i.mappers || []).reduce((out, item) => {
        const optionalKeys = item.optionalKeys.map(key => prefixUpper + key);
        return [...out, ...optionalKeys];
    }, []);
    const required = pluginKeys.filter(k => pluginOptional.indexOf(k) === -1);
    if (!process.env.NO_ENVFILE) {
        const envfilePath = path.resolve(i.projectRoot, prefix + "envfile.env");
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
        dotenv.config({ path: path.resolve(i.projectRoot, prefix + "envfile.env") });
    }
    for (let x = 0; x < required.length; x++) {
        const key = required[x];
        if (process.env[key] === undefined)
            throw Error(`Required env key ${key} not defined.`);
    }
    const getKey = (key) => process.env[prefixUpper + key];
    const pluginContext = (i.mappers || []).reduce((out, item) => {
        return Object.assign({}, out, item.envContext({ getKey }));
    }, {});
    return Object.assign({ projectRoot: i.projectRoot, pathFromRoot(...args) {
            return path.resolve(i.projectRoot, ...args);
        }, loadedContexts: new Set((i.mappers || []).map(m => m.id)) }, pluginContext, { requireContext(...contextIds) {
            for (let i = 0; i < contextIds.length; i++) {
                const contextId = contextIds[i];
                if (!this.loadedContexts.has(contextId)) {
                    throw Error(`context mapper with id: ${contextId} required but not found.`);
                }
            }
        } });
}
exports.ContextFactory = ContextFactory;
//# sourceMappingURL=index.js.map