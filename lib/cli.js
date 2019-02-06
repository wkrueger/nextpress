#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseArgs = require("minimist");
const buildscript_1 = require("./buildscript");
const path = require("path");
const args = parseArgs(process.argv);
const shell = require("shelljs");
if (args.scaffold) {
    const root = process.cwd();
    const tools = buildscript_1.buildscript(root);
    console.log("Scaffolding...");
    tools.tasks.scaffold();
}
if (args.prebuild) {
    prebuild();
}
if (args.prodRun) {
    prodRun();
}
async function prebuild() {
    try {
        const root = process.cwd();
        if (shell.exec("yarn run compileProd").code !== 0) {
            shell.echo("compileProd failed");
            shell.exit(1);
            return;
        }
        const serverModule = require(path.resolve(root, ".nextpress"));
        const serverClass = serverModule.default;
        if (serverClass.__tag__ !== "SERVER") {
            shell.echo("invalid server class");
            shell.exit(1);
            return;
        }
        let context = serverClass.getDefaultContext();
        let server = new serverClass(context);
        server.isProduction = true;
        await server.buildForProduction();
        process.exit(0);
    }
    catch (err) {
        shell.echo(err.message);
        shell.exit(1);
        return;
    }
}
async function prodRun() {
    const root = process.cwd();
    if (shell.exec("yarn run compileProd").code !== 0) {
        shell.echo("compileProd failed");
        shell.exit(1);
        return;
    }
    const serverModule = require(path.resolve(root, ".nextpress"));
    serverModule.run();
}
//# sourceMappingURL=cli.js.map