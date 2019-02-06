import { createContextMapper } from ".."

export const websiteContext = createContextMapper({
  id: "default.website",
  envKeys: ["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
  optionalKeys: [
    "WEBSITE_LOG_REQUESTS",
    "WEBSITE_BUNDLE_ANALYZER",
    "WEBSITE_COMPRESSION",
    "WEBSITE_LANGUAGE"
    //"WEBSITE_IS_PREBUILT"
  ],
  envContext({ getKey }) {
    return {
      website: {
        root: getKey("WEBSITE_ROOT")!,
        port: Number(getKey("WEBSITE_PORT")!),
        sessionSecret: getKey("WEBSITE_SESSION_SECRET")!,
        logRequests: Boolean(getKey("WEBSITE_LOG_REQUESTS")),
        bundleAnalyzer: Boolean(getKey("WEBSITE_BUNDLE_ANALYZER")),
        useCompression: Boolean(getKey("WEBSITE_COMPRESSION")),
        language: getKey("WEBSITE_LANGUAGE") || "en"
        //isPrebuilt: Boolean(getKey("WEBSITE_IS_PREBUILT"))
      }
    }
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof websiteContext["envContext"]> {}
  }
}
