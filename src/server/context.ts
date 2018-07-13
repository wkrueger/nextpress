import dotenv = require("dotenv")
import path = require("path")
import fs = require("fs")
import mailgunMapper from "./contexts/mailgun"
import databaseMapper from "./contexts/database"
import websiteMapper from "./contexts/website"
import knex = require("knex")

export type ContextMapper = {
  id: string
  envKeys: string[]
  optionalKeys: string[]
  envContext: () => any
}

export const defaultMappers = {
  mailgun: mailgunMapper,
  database: databaseMapper,
  website: websiteMapper,
}

type GetMapperContext<T> = T extends { envContext: () => infer R } ? R : never
type Values<T> = T[keyof T]
type Intersecion = GetMapperContext<Values<typeof defaultMappers>>
type GetKeys<U> = U extends Record<infer K, any> ? K : never
type UnionToIntersection<U extends object> = {
  [K in GetKeys<U>]: U extends Record<K, infer T> ? T : never
}
type GenDefaultContext = UnionToIntersection<Intersecion>

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
  const required = pluginKeys.filter(k => pluginOptional.indexOf(k) === -1)
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
    projectRoot: i.projectRoot,
    loadedContexts: new Set<string>((i.mappers || []).map(m => m.id)),
    ...pluginContext,
    requireContext(...contextIds: string[]) {
      for (let i = 0; i < contextIds.length; i++) {
        const contextId = contextIds[i]
        if (this.loadedContexts.has(contextId)) {
          throw Error(`context mapper with id: ${contextId} required but not found.`)
        }
      }
    },
  } as Nextpress.Context
}

declare global {
  namespace Nextpress {
    interface DefaultContext extends GenDefaultContext {
      projectRoot: string
      loadedContexts: Set<string>
      requireContext: (...contextIds: string[]) => void
    }
    interface CustomContext {}
    interface Context extends DefaultContext, CustomContext {}
  }
}
