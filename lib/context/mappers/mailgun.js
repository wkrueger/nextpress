"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const __1 = require("..");
exports.mailgunContext = __1.createContextMapper({
    id: "default.mailgun",
    envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
    optionalKeys: [],
    envContext({ getKey }) {
        let out = {
            email: {
                from: getKey("MAILGUN_FROM"),
                domain: getKey("MAILGUN_DOMAIN"),
                apiKey: getKey("MAILGUN_API_KEY"),
                async sendMail(inp) {
                    let ctx = out.email;
                    const body = await new Promise((res, rej) => {
                        request({
                            method: "POST",
                            auth: {
                                user: "api",
                                pass: ctx.apiKey
                            },
                            url: `https://api.mailgun.net/v3/${ctx.domain}/messages`,
                            formData: {
                                from: ctx.from,
                                to: inp.email,
                                subject: inp.subject,
                                text: inp.html,
                                html: "<html>" + inp.html + "</html>",
                                attachment: inp.attachment
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
                }
            }
        };
        return out;
    }
});
//# sourceMappingURL=mailgun.js.map