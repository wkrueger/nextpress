#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseArgs = require("minimist");
const buildscript_1 = require("./buildscript");
const args = parseArgs(process.argv);
if (args.scaffold) {
    const root = process.cwd();
    const tools = buildscript_1.buildscript(root);
    console.log("Scaffolding...");
    tools.tasks.scaffold();
}
else {
    console.log("No args provided. (try --scaffold)");
}
//# sourceMappingURL=cli.js.map