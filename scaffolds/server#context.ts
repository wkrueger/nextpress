import { ContextFactory } from "@proerd/nextpress/lib/context"
import { websiteContext } from "@proerd/nextpress/lib/context/mappers/website"
import { knexContext } from "@proerd/nextpress/lib/context/mappers/knex"
import path from "path"

let context: Nextpress.Context

export function getContext() {
  if (context) return context
  context = ContextFactory({
    projectRoot: path.resolve(__dirname, ".."),
    mappers: [websiteContext, knexContext],
  })
  return context
}
