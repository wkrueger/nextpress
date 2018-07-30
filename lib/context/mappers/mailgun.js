"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const __1 = require("..");
exports.context = __1.validateContextType({
    id: "default.mailgun",
    envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
    optionalKeys: [],
    envContext() {
        let out = {
            email: {
                from: process.env.MAILGUN_FROM,
                domain: process.env.MAILGUN_DOMAIN,
                apiKey: process.env.MAILGUN_API_KEY,
                sendMail(inp) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let ctx = out.email;
                        const body = yield new Promise((res, rej) => {
                            request({
                                method: "POST",
                                auth: {
                                    user: "api",
                                    pass: ctx.apiKey
                                },
                                url: `https://api.mailgun.net/v3/${ctx.domain}/messages`,
                                form: {
                                    from: ctx.from,
                                    to: inp.email,
                                    subject: inp.subject,
                                    text: inp.html,
                                    html: "<html>" + inp.html + "</html>"
                                }
                            }, (err, response, body) => {
                                if (err)
                                    return rej(err);
                                if (String(response.statusCode).charAt(0) !== "2") {
                                    console.error("mailgun error", body);
                                    return rej(Error("Failed while sending e-mail."));
                                }
                                res(body);
                            });
                        });
                        return body;
                    });
                }
            }
        };
        return out;
    }
});
//# sourceMappingURL=mailgun.js.map