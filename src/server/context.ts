import dotenv = require("dotenv")
import path = require("path")
import fs = require("fs")

export type ContextMapper = {
  envKeys: string[]
  optionalKeys: string[]
  envContext: () => any
}

export const defaultMappers = {
  mailgun: {
    envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
    optionalKeys: [] as string[],
    envContext() {
      return {
        mailgun: {
          from: process.env.MAILGUN_FROM,
          domain: process.env.MAILGUN_DOMAIN,
          apiKey: process.env.MAILGUN_API_KEY,
        },
      }
    },
  },
  database: {
    envKeys: ["DB_NAME", "DB_USER", "DB_PASS"],
    optionalKeys: [] as string[],
    envContext() {
      return {
        database: {
          name: process.env.DB_NAME!,
          user: process.env.DB_USER!,
          password: process.env.DB_PASS!,
        },
      }
    },
  },
}

export default function(i: { projectRoot: string; mappers: ContextMapper[] }) {
  const pluginKeys = (i.mappers || []).reduce(
    (out, item) => {
      return [...out, ...item.envKeys]
    },
    [] as string[],
  )
  const pluginOptional = (i.mappers || []).reduce(
    (out, item) => {
      return [...out, ...item.optionalKeys]
    },
    [] as string[],
  )
  const required = [
    ...["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
    ...pluginKeys,
  ].filter(k => pluginOptional.indexOf(k) === -1)
  const envfilePath = path.resolve(i.projectRoot, "envfile.env")
  try {
    fs.statSync(envfilePath)
  } catch (err) {
    const scaffold = required.reduce((out, item) => {
      return out + `${item}=fill\n`
    }, "")
    fs.writeFileSync(envfilePath, scaffold)
    throw Error("envfile not found. Fill up the generated one.")
  }
  dotenv.config({ path: path.resolve(i.projectRoot, "envfile.env") })
  for (let x = 0; x < required.length; x++) {
    const key = required[x]
    if (!process.env[key]) throw Error(`Required env key ${key} not defined.`)
  }
  const defaultContext: Nextpress.DefaultContext = {
    projectRoot: i.projectRoot,
    website: {
      root: process.env.WEBSITE_ROOT!,
      port: Number(process.env.WEBSITE_PORT!),
      sessionSecret: process.env.WEBSITE_SESSION_SECRET!,
    },
    database: undefined as any,
    mailgun: undefined as any,
  }
  const pluginContext = (i.mappers || []).reduce(
    (out, item) => {
      return {
        ...out,
        ...item.envContext(),
      }
    },
    {} as any,
  )
  return {
    ...defaultContext,
    ...pluginContext,
  } as Nextpress.Context
}

declare global {
  namespace Nextpress {
    interface DefaultContext {
      projectRoot: string
      database: {
        name: string
        user: string
        password: string
      }
      mailgun: {
        from: string
        domain: string
        apiKey: string
      }
      website: {
        root: string
        port: number
        sessionSecret: string
      }
    }
    interface CustomContext {}
    interface Context extends DefaultContext, CustomContext {}
  }
}
