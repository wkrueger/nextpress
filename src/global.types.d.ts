declare module "spirit" {
  import * as http from "http"
  export type App = { _spiritapp: never }
  export type ServerHandle = (request: http.IncomingMessage, response: http.ServerResponse) => void
  export var node: {
    adapter: (app: App) => ServerHandle
  }
}

declare module "spirit-router" {
  export type Route = {}
  export type Handler = {}
  export function define(routes: Route[]): void
  export function get(match: string, handler: Handler): Route
}
