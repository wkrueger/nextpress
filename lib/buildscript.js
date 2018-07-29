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
const libroot = path_1.resolve(__dirname, "..");
function buildscript(projectRoot) {
    const tsPath = path_1.resolve(projectRoot, "node_modules", ".bin", "tsc");
    const serverTsConfigPath = path_1.resolve(projectRoot, "server", "tsconfig.json");
    const relativeTo = (to) => path_1.relative(projectRoot, to);
    const tasks = {
        scaffold() {
            checkNCreate(["server", "tsconfig.json"], () => JSON.stringify(serverTsconfig, null, 2));
            checkNCreate(["server", "index.ts"], () => loadScaffoldFile("server-index.txt"));
            checkNCreate(["pages", "index.tsx"], () => loadScaffoldFile("client-index.txt"));
            checkNCreate(["app", "index.tsx"], () => "");
            checkNCreate(["static", "hello.txt"], () => "Use this folder to host static assets.");
            checkNCreate(["static", "robots.txt"], () => "");
            checkNCreate([".babelrc.js"], () => loadScaffoldFile("babelrc.txt"));
            checkNCreate(["tsconfig.json"], () => JSON.stringify(clientTsConfig, null, 2));
            checkNCreate([".gitignore"], () => loadScaffoldFile("gitignore.scaff.txt"));
            checkNCreate(["pages", "client-global.d.ts"], () => loadScaffoldFile("client-global-types.txt"));
            checkNCreate([".vscode", "launch.json"], () => loadScaffoldFile("vscode-launch.txt"));
            checkNCreate(["jest.server.config.js"], () => loadScaffoldFile("jest-config.txt"));
            const pjspath = path_1.resolve(projectRoot, "package.json");
            const packagejson = require(pjspath);
            packagejson.scripts = packagejson.scripts || {};
            packagejson.scripts.testServer =
                packagejson.scripts.testServer || 'jest -c="jest-server.config.js"';
            fs.writeFileSync(pjspath, JSON.stringify(packagejson, null, 2));
        },
        compileServer() {
            return __awaiter(this, void 0, void 0, function* () {
                yield build.spawn(`${tsPath} -p ${relativeTo(serverTsConfigPath)} -w`);
            });
        }
    };
    return {
        run() {
            build.runTask(tasks);
        },
        tool: build,
        tasks
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
            console.log("Creating", filepath);
            fs.writeFileSync(filepath, content());
        }
    }
    function loadScaffoldFile(pathInsideScaffoldFolder) {
        return fs.readFileSync(path_1.resolve(libroot, "src", "scaffolds", pathInsideScaffoldFolder));
    }
}
exports.buildscript = buildscript;
const serverTsconfig = {
    include: ["."],
    compilerOptions: {
        target: "es2017",
        module: "commonjs",
        moduleResolution: "node",
        outDir: "../.nextpress",
        strict: true,
        noUnusedLocals: true,
        sourceMap: true,
        pretty: false
    }
};
const clientTsConfig = {
    compilerOptions: {
        target: "esnext",
        module: "commonjs",
        moduleResolution: "node",
        noUnusedLocals: true,
        skipDefaultLibCheck: true,
        lib: ["es2015", "dom"],
        jsx: "react",
        strict: true,
        sourceMap: false,
        esModuleInterop: true,
        experimentalDecorators: true,
        downlevelIteration: true
    },
    include: ["pages", "app"]
};
//# sourceMappingURL=buildscript.js.map