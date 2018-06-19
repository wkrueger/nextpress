export default {
  id: "default.website",
  envKeys: ["WEBSITE_ROOT", "WEBSITE_PORT", "WEBSITE_SESSION_SECRET"],
  optionalKeys: ["WEBSITE_LOG_REQUESTS"],
  envContext() {
    return {
      website: {
        root: process.env.WEBSITE_ROOT!,
        port: Number(process.env.WEBSITE_PORT!),
        sessionSecret: process.env.WEBSITE_SESSION_SECRET!,
        logRequests: Boolean(process.env.WEBSITE_LOG_REQUESTS),
      },
    }
  },
}
