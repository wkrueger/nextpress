#!/usr/bin/env node
const parseArgs = require("minimist")
import { buildscript } from "./buildscript"
const args = parseArgs(process.argv)

if (args.scaffold) {
  const root = process.cwd()
  const tools = buildscript(root)
  console.log("Scaffolding...")
  tools.tasks.scaffold()
} else {
  console.log("No args provided. (try --scaffold)")
}
