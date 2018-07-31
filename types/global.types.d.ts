declare module "@proerd/buildscript"
declare module "next/app"
declare module "ono"
declare module "rimraf"
declare module "connect-session-knex" {
  import expressSession = require("express-session")
  interface Opts {
    knex: any
  }
  function fn(session: any): new (opts: Opts) => {}
  export = fn
}

//modules I'm purposely not importing @types so they dont inherit express
declare module "morgan"
declare module "express-session"
declare module "helmet"

declare namespace Express {
  interface Request {
    session: Session
  }
  interface Session {
    destroy(err: any): void
  }
}
