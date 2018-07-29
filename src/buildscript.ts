import * as build from "@proerd/buildscript"
import { resolve, relative } from "path"
import * as fs from "fs"
const libroot = resolve(__dirname, "..")

export function buildscript(projectRoot: string) {
  const tsPath = resolve(projectRoot, "node_modules", ".bin", "tsc")
  const serverTsConfigPath = resolve(projectRoot, "server", "tsconfig.json")
  const relativeTo = (to: string) => relative(projectRoot, to)

  const tasks = {
    scaffold() {
      checkNCreate(["server", "tsconfig.json"], () =>
        JSON.stringify(serverTsconfig, null, 2)
      )
      checkNCreate(["server", "index.ts"], () =>
        loadScaffoldFile("server-index.txt")
      )
      checkNCreate(["pages", "index.tsx"], () =>
        loadScaffoldFile("client-index.txt")
      )
      checkNCreate(["app", "index.tsx"], () => "")
      checkNCreate(
        ["static", "hello.txt"],
        () => "Use this folder to host static assets."
      )
      checkNCreate(["static", "robots.txt"], () => "")
      checkNCreate([".babelrc.js"], () => loadScaffoldFile("babelrc.txt"))
      checkNCreate(["tsconfig.json"], () =>
        JSON.stringify(clientTsConfig, null, 2)
      )
      checkNCreate([".gitignore"], () =>
        loadScaffoldFile("gitignore.scaff.txt")
      )
      checkNCreate(["pages", "client-global.d.ts"], () =>
        loadScaffoldFile("client-global-types.txt")
      )
      checkNCreate([".vscode", "launch.json"], () =>
        loadScaffoldFile("vscode-launch.txt")
      )
      checkNCreate(["jest.server.config.js"], () =>
        loadScaffoldFile("jest-config.txt")
      )
      const pjspath = resolve(projectRoot, "package.json")
      const packagejson = require(pjspath)
      packagejson.scripts = packagejson.scripts || {}
      packagejson.scripts.testServer =
        packagejson.scripts.testServer || 'jest -c="jest-server.config.js"'
      fs.writeFileSync(pjspath, JSON.stringify(packagejson, null, 2))
    },

    async compileServer() {
      await build.spawn(`${tsPath} -p ${relativeTo(serverTsConfigPath)} -w`)
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
    return fs.readFileSync(
      resolve(libroot, "src", "scaffolds", pathInsideScaffoldFolder)
    )
  }
}

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
  include: ["pages", "app"]
}
