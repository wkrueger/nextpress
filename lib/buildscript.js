"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build = require("@proerd/buildscript");
const path_1 = require("path");
const fs = require("fs");
const shelljs = require("shelljs");
const libroot = path_1.resolve(__dirname, "..");
function buildscript(projectRoot) {
    const tasks = {
        scaffold() {
            const scaffolds = fs.readdirSync(path_1.resolve(libroot, "scaffolds"));
            scaffolds.map(_file => {
                var file = _file;
                if (file.charAt(0) === "#")
                    file = file.substr(1);
                let pth = file.split("#");
                checkNCreate(pth, () => loadScaffoldFile(_file));
            });
            checkNCreate(["server", "tsconfig.json"], () => JSON.stringify(serverTsconfig, null, 2));
            checkNCreate(["tsconfig.json"], () => JSON.stringify(clientTsConfig, null, 2));
            const pjspath = path_1.resolve(projectRoot, "package.json");
            const packagejson = require(pjspath);
            packagejson.scripts = packagejson.scripts || {};
            packagejson.scripts = Object.assign({}, packagejson.scripts, {
                compileWithoutErrors: "tsc -p ./server || exit 0",
                dev: "webpack --config ./server/webpack.config.js",
                start: "yarn run compileWithoutErrors && node ./.nextpress/index",
                testServer: 'jest -c="jest.server.config.js"',
                testClient: 'jest -c="jest.client.config.js"'
            });
            fs.writeFileSync(pjspath, JSON.stringify(packagejson, null, 2));
            console.log("Add the latest version of react and typescript...");
            shelljs.exec("yarn add react react-dom typescript", { cwd: process.cwd() });
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
        return fs.readFileSync(path_1.resolve(libroot, "scaffolds", pathInsideScaffoldFolder));
    }
}
exports.buildscript = buildscript;
const serverTsconfig = {
    compilerOptions: {
        target: "es2017",
        module: "commonjs",
        moduleResolution: "node",
        outDir: "../.nextpress",
        esModuleInterop: true,
        strict: true,
        noUnusedLocals: true,
        sourceMap: true,
        pretty: false
    },
    include: ["."],
    exclude: ["__tests__"]
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
    include: ["pages", "pages-content"]
};
//# sourceMappingURL=buildscript.js.map