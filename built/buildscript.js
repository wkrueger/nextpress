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
const build = require("@proerd/buildscript");
const path_1 = require("path");
const fs = require("fs");
function buildscript(projectRoot) {
    const tsPath = path_1.resolve(projectRoot, "node_modules", ".bin", "tsc");
    const tsConfigPath = path_1.resolve(projectRoot, "server", "tsconfig.json");
    const serverPath = path_1.resolve(projectRoot, ".nextpress", "server", "index.js");
    const relativeTo = (to) => path_1.relative(projectRoot, to);
    const tasks = {
        scaffold() {
            checkNCreate(["server", "tsconfig.json"], JSON.stringify(serverTsconfig, null, 2));
            checkNCreate(["server", "index.ts"], "console.log('Hello world')");
            checkNCreate(["pages", "index.ts"], "console.log('Hello world')");
            checkNCreate(["static", "hello.txt"], "Use this folder to host static assets.");
            checkNCreate([".babelrc"], JSON.stringify(babelRc, null, 2));
            checkNCreate(["tsconfig.json"], JSON.stringify(clientTsConfig, null, 2));
        },
        watch() {
            return __awaiter(this, void 0, void 0, function* () {
                this.scaffold();
                yield build.spawn(`${tsPath} -p ${relativeTo(tsConfigPath)}`);
                yield Promise.all([
                    build.spawn(`${tsPath} -p ${relativeTo(tsConfigPath)} -w`),
                    build.spawn(`node ${relativeTo(serverPath)}`),
                ]);
            });
        },
    };
    return {
        run() {
            build.runTask(tasks);
        },
        tool: build,
    };
    function checkNCreate(paths, content) {
        let folders = paths.slice(0, paths.length - 1);
        let it = 0;
        let current = projectRoot;
        while (it < folders.length) {
            current = path_1.resolve(current, paths[it]);
            try {
                fs.statSync(current);
            }
            catch (err) {
                fs.mkdirSync(current);
                fs.statSync(current);
            }
            it++;
        }
        let filepath = path_1.resolve(projectRoot, ...paths);
        try {
            fs.statSync(filepath);
        }
        catch (err) {
            fs.writeFileSync(filepath, content);
        }
    }
}
exports.buildscript = buildscript;
const serverTsconfig = {
    include: ["."],
    compilerOptions: {
        target: "es6",
        module: "commonjs",
        moduleResolution: "node",
        outDir: "../nextpress/server",
        strict: true,
        noUnusedLocals: true,
    },
};
const clientTsConfig = {
    compilerOptions: {
        target: "es5",
        module: "commonjs",
        moduleResolution: "node",
        noUnusedLocals: true,
        skipDefaultLibCheck: true,
        skipLibCheck: true,
        lib: ["es5", "dom", "es2015.promise"],
        jsx: "react",
        strict: true,
        sourceMap: false,
        esModuleInterop: true,
    },
    include: ["pages", "app"],
};
const babelRc = {
    presets: ["next/babel", "@zeit/next-typescript/babel"],
};
//# sourceMappingURL=buildscript.js.map