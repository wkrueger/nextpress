import * as build from "@proerd/buildscript"
import { resolve } from "path"
import * as fs from "fs"
import shelljs = require("shelljs")
const libroot = resolve(__dirname, "..")

export function buildscript(projectRoot: string) {
  const tasks = {
    scaffold() {
      const scaffolds = fs.readdirSync(resolve(libroot, "scaffolds"))
      scaffolds.map(_file => {
        var file = _file
        if (file.charAt(0) === "#") file = file.substr(1)
        let pth = file.split("#")
        checkNCreate(pth, () => loadScaffoldFile(_file))
      })
      checkNCreate(["server", "tsconfig.json"], () => JSON.stringify(serverTsconfig, null, 2))
      checkNCreate(["tsconfig.json"], () => JSON.stringify(clientTsConfig, null, 2))

      const pjspath = resolve(projectRoot, "package.json")
      const packagejson = require(pjspath)
      packagejson.scripts = packagejson.scripts || {}

      packagejson.scripts = Object.assign({}, packagejson.scripts, {
        compileWithoutErrors: "tsc -p ./server || exit 0",
        dev: "webpack --config ./server/webpack.config.js",
        start: "yarn run compileWithoutErrors && node ./.nextpress/index",
        testServer: 'jest -c="jest.server.config.js"',
        testClient: 'jest -c="jest.client.config.js"'
      })

      fs.writeFileSync(pjspath, JSON.stringify(packagejson, null, 2))
      console.log("Add the latest version of react and typescript...")
      shelljs.exec("yarn add react react-dom typescript", { cwd: process.cwd() })
    }
  }

  return {
    run() {
      build.runTask(tasks)
    },
    tool: build,
    tasks
  }

  function checkNCreate(paths: string[], content: () => string | Buffer) {
    let folders = paths.slice(0, paths.length - 1)
    let it = 0
    let current = projectRoot
    while (it < folders.length) {
      current = resolve(current, paths[it])
      try {
        fs.statSync(current)
      } catch (err) {
        fs.mkdirSync(current)
        fs.statSync(current)
      }
      it++
    }
    let filepath = resolve(projectRoot, ...paths)
    try {
      fs.statSync(filepath)
    } catch (err) {
      console.log("Creating", filepath)
      fs.writeFileSync(filepath, content())
    }
  }

  function loadScaffoldFile(pathInsideScaffoldFolder: string) {
    return fs.readFileSync(resolve(libroot, "scaffolds", pathInsideScaffoldFolder))
  }
}

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
}

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
}
