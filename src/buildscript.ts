import * as build from "@proerd/buildscript"
import { resolve, relative } from "path"
import * as fs from "fs"
const libroot = resolve(__dirname, "..")

export function buildscript(projectRoot: string) {
  const tsPath = resolve(projectRoot, "node_modules", ".bin", "tsc")
  const tsConfigPath = resolve(projectRoot, "server", "tsconfig.json")
  const serverPath = resolve(projectRoot, ".nextpress", "server", "index.js")
  const relativeTo = (to: string) => relative(projectRoot, to)

  const tasks = {
    scaffold() {
      checkNCreate(["server", "tsconfig.json"], () => JSON.stringify(serverTsconfig, null, 2))
      checkNCreate(["server", "index.ts"], () => "console.log('Hello world')")
      checkNCreate(["pages", "index.tsx"], () => "console.log('Hello world')")
      checkNCreate(["app", "index.tsx"], () => "")
      checkNCreate(["static", "hello.txt"], () => "Use this folder to host static assets.")
      checkNCreate([".babelrc"], () => JSON.stringify(babelRc, null, 2))
      checkNCreate(["tsconfig.json"], () => JSON.stringify(clientTsConfig, null, 2))
      checkNCreate(["envfile.env"], () => "")

      checkNCreate([".gitignore"], () => {
        const gitscaff = fs.readFileSync(
          resolve(libroot, "src", "scaffolds", "gitignore.scaff.txt"),
        )
        return gitscaff
      })
    },

    async watch() {
      this.scaffold()
      await build.spawn(`${tsPath} -p ${relativeTo(tsConfigPath)}`)
      await Promise.all([
        build.spawn(`${tsPath} -p ${relativeTo(tsConfigPath)} -w`),
        build.spawn(`node ${relativeTo(serverPath)}`),
      ])
    },
  }

  return {
    run() {
      build.runTask(tasks)
    },
    tool: build,
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
      fs.writeFileSync(filepath, content())
    }
  }
}

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
}

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
}

const babelRc = {
  presets: ["next/babel", "@zeit/next-typescript/babel"],
}
