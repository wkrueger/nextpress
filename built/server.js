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
const nextjs = require("next");
exports.nextjs = nextjs;
const http = require("http");
http.createServer;
class Server {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const nextApp = nextjs({
                dev: process.env.NODE_ENV !== "production",
                dir: this.projectRoot,
                conf: this.nextConfig(),
            });
            yield nextApp.prepare();
        });
    }
    nextConfig() {
        const withCSS = require("@zeit/next-css");
        const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
        const withTypescript = require("@zeit/next-typescript");
        const opts = {
            webpack(config, options) {
                // Do not run type checking twice:
                if (options.isServer && process.env.NODE_ENV !== "production")
                    config.plugins.push(new ForkTsCheckerWebpackPlugin());
                return config;
            },
        };
        return withCSS(withTypescript(opts));
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map