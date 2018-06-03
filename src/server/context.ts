import dotenv = require("dotenv")
import path = require("path")
import fs = require("fs")

export type ContextPlugin = {
  envKeys: string[]
  envContext: () => any
}

export const defaultPlugins = {
  mailgun: {
    envKeys: ["MAILGUN_FROM", "MAILGUN_DOMAIN", "MAILGUN_API_KEY"],
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
}

export default function<Plugin extends ContextPlugin>(i: {
  requiredKeys?: string[]
  projectRoot: string
  customContext?: () => Nextpress.CustomContext
  plugins?: Plugin[]
}) {
  const pluginKeys = (i.plugins || []).reduce(
    (out, item) => {
      return [...out, ...item.envKeys]
    },
    [] as string[],
  )
  const required = [
    ...["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET", "DB_NAME", "DB_USER", "DB_PASS"],
    ...pluginKeys,
    ...(i.requiredKeys || []),
  ]
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
  const customContext = i.customContext ? i.customContext() : {}
  const defaultContext: Nextpress.DefaultContext = {
    projectRoot: i.projectRoot,
    website: {
      root: process.env.WEBSITE_ROOT!,
      port: Number(process.env.WEBSITE_PORT!),
      sessionSecret: process.env.WEBSITE_SESSION_SECRET!,
    },
    database: {
      name: process.env.DB_NAME!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
    },
  }
  const pluginContext = (i.plugins || []).reduce(
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
    ...customContext,
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
      mailgun?: {
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
