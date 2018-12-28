"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch = require("isomorphic-fetch");
const FormData = require("form-data");
const __1 = require("..");
const ono = require("ono");
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
                    const fdata = {
                        from: inp.from || ctx.from,
                        to: inp.email,
                        subject: inp.subject,
                        text: inp.html,
                        html: inp.html
                    };
                    const form = new FormData();
                    Object.keys(fdata).forEach(key => form.append(key, fdata[key]));
                    const response = await fetch(`https://api.mailgun.net/v3/${ctx.domain}/messages`, {
                        method: "POST",
                        headers: {
                            authorization: `Basic ${Buffer.from("api:" + ctx.apiKey).toString("base64")}`
                        },
                        body: form
                    });
                    let json = await response.json();
                    if (!response.ok)
                        throw ono(json, "Failed while sending email.");
                    return json;
                }
            }
        };
        return out;
    }
});
//# sourceMappingURL=mailgun.js.map