import { ClientRequest, ServerResponse, IncomingMessage } from "http"

declare global {
  namespace Polka {
    export type Middleware = (req: Request, resp: Response, next: Function) => any
    export type ErrorMiddleware = (error: any, req: Request, resp: Response, next: Function) => any

    export type EveryMiddleware = Middleware | ErrorMiddleware | Router

    type Methods = "get" | "post" | "put" | "update" | "delete" | "use"
    const M: {
      A: any
      B: any
    }

    interface RouterMethod {
      <MW extends EveryMiddleware = EveryMiddleware>(route: string, ...mw: MW[]): any
      <MW extends EveryMiddleware = EveryMiddleware>(...mw: MW[]): any
    }
    export type Router = { [k in Methods]: RouterMethod }

    export interface App extends Router {
      listen(post: number, callback?: Function): void
    }

    export interface Request extends IncomingMessage {
      session?: Session
      query: Record<string, string>
      params: Record<string, string>
      body: any
    }

    export interface Response extends ServerResponse {
      sendFile(path: string): void
      status(code: number): Response
      send(obj: Record<string, any> | string | Buffer | ReadableStream): void
      json(obj: Record<string, any>): void
    }

    export type NextFunction = Function

    export interface Session {
      destroy(cb: Function): void
    }
  }
}
