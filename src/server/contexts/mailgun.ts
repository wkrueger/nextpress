import request = require("request")

export default {
  id: "default.mailgun",
  envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
  optionalKeys: [] as string[],
  envContext() {
    return {
      mailgun: {
        from: process.env.MAILGUN_FROM!,
        domain: process.env.MAILGUN_DOMAIN!,
        apiKey: process.env.MAILGUN_API_KEY!,
        async sendMail(inp: { email: string; subject: string; html: string }) {
          let ctx = this
          const body: any = await new Promise((res, rej) => {
            request(
              {
                method: "POST",
                auth: {
                  user: "api",
                  pass: ctx.apiKey,
                },
                url: `https://api.mailgun.net/v3/${ctx.domain}/messages`,
                form: {
                  from: ctx.from,
                  to: inp.email,
                  subject: inp.subject,
                  text: inp.html,
                  html: "<html>" + inp.html + "</html>",
                },
              },
              (err, response, body) => {
                if (err) return rej(err)
                if (String(response.statusCode).charAt(0) !== "2") {
                  console.error("mailgun error", body)
                  return rej(Error("Failed while sending e-mail."))
                }
                res(body)
              },
            )
          })
          return body
        },
      },
    }
  },
}
