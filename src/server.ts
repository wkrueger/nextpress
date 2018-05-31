import nextjs = require("next")
import http = require("http")
import spirit = require("spirit")
import spiritRouter = require("spirit-router")

export type RouteSetupFn = (r: typeof spiritRouter) => spirit.App

class Server {
  constructor(public projectRoot: string, public port = 8080) {}

  private _routeSetup: RouteSetupFn = () => {
    throw Error("Must setup a route.")
  }
  routeSetup(fn: RouteSetupFn) {
    this._routeSetup = fn
  }

  async run() {
    const nextApp = nextjs({
      dev: process.env.NODE_ENV !== "production",
      dir: this.projectRoot,
      conf: this.nextConfig(),
    })
    await nextApp.prepare()

    const app = this._routeSetup(spiritRouter)

    http.createServer(spirit.node.adapter(app)).listen(this.port)
  }

  nextConfig() {
    const withCSS = require("@zeit/next-css")
    const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
    const withTypescript = require("@zeit/next-typescript")

    const opts = {
      webpack(config: any, options: any) {
        // Do not run type checking twice:
        if (options.isServer && process.env.NODE_ENV !== "production")
          config.plugins.push(new ForkTsCheckerWebpackPlugin())
        return config
      },
    }

    return withCSS(withTypescript(opts))
  }
}

export { Server, nextjs }
