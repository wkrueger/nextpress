import { Server } from "./index"

let currentServers: Record<string, Server> = {}

export function setServerHmr(newServer: Server) {
  let tag = newServer.opts.tag || "__default__"
  let currentServer = currentServers[tag]
  if (!currentServer) {
    currentServers[tag] = newServer
  } else {
    newServer.nodeHttpServer = currentServer.nodeHttpServer
    newServer._nextApp = currentServer._nextApp
  }
}
