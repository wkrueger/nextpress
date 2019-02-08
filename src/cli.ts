#!/usr/bin/env node
const parseArgs = require("minimist")
import { buildscript } from "./buildscript"
import path = require("path")
const args = parseArgs(process.argv)
import shell = require("shelljs")
import { Server } from "./server"

if (args.scaffold) {
  const root = process.cwd()
  const tools = buildscript(root)
  console.log("Scaffolding...")
  tools.tasks.scaffold()
}
if (args.prebuild) {
  prebuild()
}
if (args.prodRun || args.run) {
  prodRun()
}

async function prebuild() {
  try {
    const root = process.cwd()
    if (shell.exec("yarn run compileProd").code !== 0) {
      shell.echo("compileProd failed")
      shell.exit(1)
      return
    }
    const serverModule = require(path.resolve(root, ".nextpress"))
    const serverClass: typeof Server = serverModule.default
    if (serverClass.__tag__ !== "SERVER") {
      shell.echo("invalid server class")
      shell.exit(1)
      return
    }
    let context = serverClass.getDefaultContext()
    let server = new serverClass(context)
    server.isProduction = true
    await server.buildForProduction()
    process.exit(0)
  } catch (err) {
    shell.echo(err.message)
    shell.exit(1)
    return
  }
}

async function prodRun() {
  const root = process.cwd()
  if (shell.exec("yarn run compileProd").code !== 0) {
    shell.echo("compileProd failed")
    shell.exit(1)
    return
  }
  const serverModule = require(path.resolve(root, ".nextpress"))
  serverModule.run()
}
