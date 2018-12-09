import Redis = require("ioredis")
import { createContextMapper } from ".."

export const redisContext = (opts?: Redis.RedisOptions) =>
  createContextMapper({
    id: "default.redis",
    envKeys: [],
    optionalKeys: ["REDIS_URL"],
    envContext({ getKey }) {
      let _instance: InstanceType<typeof Redis> | undefined
      function instance() {
        if (_instance) return _instance
        if (getKey("REDIS_URL")) _instance = new Redis(getKey("REDIS_URL"), opts)
        else _instance = new Redis()
        return _instance
      }

      let out = {
        redis: {
          client: instance
        }
      }
      return out
    }
  })

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<ReturnType<typeof redisContext>["envContext"]> {}
  }
}
