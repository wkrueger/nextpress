import jwt = require("jsonwebtoken")
import express = require("express")

interface User {
  id: number
  email: string
}
export class UserAuthJwt {
  constructor(
    public req: express.Request,
    public resp: express.Response,
    private opts: {
      //headerKey: string
      secret: string
      durationSeconds: number
    }
  ) {}

  private _user: User | undefined

  private tryToken() {
    //try authorizaition header
    let token: string = this.req.headers.authorization || ""
    token = token.startsWith("Bearer") ? token.split(" ")[1] || "" : ""
    if (!token) {
      token = (this.req.cookies || {}).user_auth || ""
    }
    return token
  }

  async getUser() {
    if (this._user) return this._user
    //try authorizaition header
    const token: string = this.tryToken()

    if (!token || token === "undefined") return undefined
    const decoded = await new Promise<any>((resolve, reject) => {
      jwt.verify(token, this.opts.secret, (err: any, resp) => {
        if (err) {
          err.statusCode = 401
          return reject(err)
        }
        return resolve(resp)
      })
    })
    return decoded
  }

  async setUser(user: User) {
    if (this._user) throw Error("User already set.")
    const token = await new Promise<string>((resolve, reject) => {
      jwt.sign(user, this.opts.secret, { expiresIn: this.opts.durationSeconds }, (err, token) => {
        if (err) return reject(err)
        return resolve(token)
      })
    })
    this._user = user
    if (!this.resp.headersSent) {
      this.resp.set("Set-Cookie", `user_auth=${token}; Max-Age=${this.opts.durationSeconds};`)
    }
    return token
  }

  async logout() {
    this._user = undefined
    if (!this.resp.headersSent) {
      this.resp.set("Set-Cookie", `user_auth=;`)
    }
  }
}
