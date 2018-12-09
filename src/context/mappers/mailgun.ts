import request = require("request")
import { createContextMapper } from ".."

export const mailgunContext = createContextMapper({
  id: "default.mailgun",
  envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
  optionalKeys: [] as string[],
  envContext({ getKey }) {
    let out = {
      email: {
        from: getKey("MAILGUN_FROM")!,
        domain: getKey("MAILGUN_DOMAIN")!,
        apiKey: getKey("MAILGUN_API_KEY")!,
        async sendMail(inp: { email: string; subject: string; html: string; from?: string }) {
          let ctx = out.email
          const body: any = await new Promise((res, rej) => {
            request(
              {
                method: "POST",
                auth: {
                  user: "api",
                  pass: ctx.apiKey
                },
                url: `https://api.mailgun.net/v3/${ctx.domain}/messages`,
                form: {
                  from: inp.from || ctx.from,
                  to: inp.email,
                  subject: inp.subject,
                  text: inp.html,
                  html: inp.html
                }
              },
              (err, response, body) => {
                if (err) return rej(err)
                if (String(response.statusCode).charAt(0) !== "2") {
                  console.error("mailgun error", body)
                  return rej(Error("Failed while sending e-mail."))
                }
                res(body)
              }
            )
          })
          return body
        }
      }
    }
    return out
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof mailgunContext["envContext"]> {}
  }
}
