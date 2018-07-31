import Redis = require("ioredis")
import { createContextMapper } from ".."

export const redisContext = createContextMapper({
  id: "default.redis",
  envKeys: [],
  optionalKeys: ["REDIS_URL"],
  envContext() {
    let _instance: InstanceType<typeof Redis> | undefined
    function instance() {
      if (_instance) return _instance
      if (process.env.REDIS_URL) _instance = new Redis(process.env.REDIS_URL)
      else _instance = new Redis()
      return _instance
    }

    let out = {
      redis: {
        instance
      }
    }
    return out
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext
      extends ReturnType<typeof redisContext["envContext"]> {}
  }
}
