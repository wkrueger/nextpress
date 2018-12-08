import { Server } from "@proerd/nextpress/lib/server"
import { getContext } from "./context"
//
;(async () => {
  const context = getContext()

  await context.database.init({
    currentVersion: 1,
    async migration() {},
  })

  const server = new Server(context)

  server.run()
})()

process.on("unhandledRejection", (...arg: any[]) => {
  console.error("unhandledRejection", ...arg)
  process.exit(1)
})