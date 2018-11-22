import { ContextFactory } from "@proerd/nextpress/lib/context"
import { websiteContext } from "@proerd/nextpress/lib/context/mappers/website"
import { mailgunContext } from "@proerd/nextpress/lib/context/mappers/mailgun"
import { knexContext } from "@proerd/nextpress/lib/context/mappers/knex"
import path = require("path")

let context: Nextpress.Context

export function getContext() {
  if (context) return context
  context = ContextFactory({
    projectRoot: path.resolve(__dirname, ".."),
    mappers: [websiteContext, mailgunContext, knexContext],
  })
  return context
}
