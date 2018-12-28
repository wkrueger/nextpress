import fetch = require("isomorphic-fetch")
import FormData = require("form-data")
import { createContextMapper } from ".."
import ono = require("ono")

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
          const fdata = {
            from: inp.from || ctx.from,
            to: inp.email,
            subject: inp.subject,
            text: inp.html,
            html: inp.html
          } as any
          const form = new FormData()
          Object.keys(fdata).forEach(key => form.append(key, fdata[key]))
          const response = await fetch(`https://api.mailgun.net/v3/${ctx.domain}/messages`, {
            method: "POST",
            headers: {
              authorization: `Basic ${Buffer.from("api:" + ctx.apiKey).toString("base64")}`
            },
            body: form as any
          })
          let json = await response.json()
          if (!response.ok) throw ono(json, "Failed while sending email.")
          return json
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
