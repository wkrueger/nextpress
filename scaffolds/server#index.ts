import { Server } from "@proerd/nextpress/lib/server"
import { getContext } from "./context"
//
;(async () => {
  const context = getContext()

  await context.database.init({ migrations: [] })

  const server = new Server(context)
  server.useHMR()
  server.run()
})()

module.hot && module.hot.accept()
