"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
class UserAuthJwt {
    constructor(req, resp, opts) {
        this.req = req;
        this.resp = resp;
        this.opts = opts;
    }
    tryToken() {
        //try authorizaition header
        let token = this.req.headers.authorization || "";
        token = token.startsWith("Bearer") ? token.split(" ")[1] || "" : "";
        if (!token) {
            token = (this.req.cookies || {}).user_auth || "";
        }
        return token;
    }
    async getUser() {
        if (this._user)
            return this._user;
        //try authorizaition header
        const token = this.tryToken();
        if (!token || token === "undefined")
            return undefined;
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, this.opts.secret, (err, resp) => {
                if (err) {
                    err.statusCode = 401;
                    return reject(err);
                }
                return resolve(resp);
            });
        });
        return decoded;
    }
    async setUser(user) {
        if (this._user)
            throw Error("User already set.");
        const token = await new Promise((resolve, reject) => {
            jwt.sign(user, this.opts.secret, { expiresIn: this.opts.durationSeconds }, (err, token) => {
                if (err)
                    return reject(err);
                return resolve(token);
            });
        });
        this._user = user;
        if (!this.resp.sent) {
            this.resp.setCookie("user_auth", token, { maxAge: this.opts.durationSeconds });
        }
        return token;
    }
    async logout() {
        this._user = undefined;
        if (!this.resp.sent) {
            this.resp.setCookie("user_auth", "");
        }
    }
}
exports.UserAuthJwt = UserAuthJwt;
//# sourceMappingURL=user-auth-jwt.js.map