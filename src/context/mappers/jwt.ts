import { createContextMapper } from ".."

export const websiteContext = createContextMapper({
  id: "default.jwt",
  envKeys: ["JWT_SECRET"],
  optionalKeys: [],
  envContext({ getKey }) {
    return {
      jwt: {
        secret: getKey("JWT_SECRET")!
      }
    }
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof websiteContext["envContext"]> {}
  }
}
