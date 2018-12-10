---
id: context
title: Context Provider
---

The server `index.ts` from the scaffold starts with something like this:

```ts
import { Server } from "@proerd/nextpress/lib/server"
import { getContext } from "./context"
//
;(async () => {
  const context = getContext()
  const server = new Server(context)
  server.run()
})()
```

`getContext` sets ups contexts in a separate file in order to provide an easy access singleton. Typing `getContext` anywhere may kick in the default import. Edit `context.ts` in oder to add other preset contexts or your own.

```ts
import { ContextFactory } from "@proerd/nextpress/lib/context"
import { websiteContext } from "@proerd/nextpress/lib/context/mappers/website"
import { jwtContext } from "@proerd/nextpress/lib/context/mappers/jwt"
import path = require("path")

let context: Nextpress.Context

export function getContext() {
  if (context) return context
  context = ContextFactory({
    projectRoot: path.resolve(__dirname, ".."),
    mappers: [websiteContext, jwtContext]
  })
  return context
}
```

We call `websiteContext` a **context**. A context houses a singleton object and may require enviroment variables:

```ts
export const jwtContext = createContextMapper({
  id: "default.jwt",
  envKeys: ["JWT_SECRET"],
  optionalKeys: [],
  //this gets **merged** into the main context singleton
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
    interface CustomContext extends ReturnType<typeof jwtContext["envContext"]> {}
  }
}
```

The snippet above:

1. Requires the `JWT_SECRET` environment variable to be available either in the root `envfile.env` or in the enviroment variables themselves;
2. Maps its value to the global context object `getContext().jwt.secret`;
3. Augments the type of the global context object with the changes.

`jwt` will only be present on the global typing `Nextpress.Context` if `@proerd/nextpress/lib/context/mappers/jwt`
is ever required on the project.

> You may have noticed our imports are quite long, pointing to the module's `/lib` folder.
> It works like that in order to better handle selective module loading and selective type definitions.

## Acessing the context

```ts
getContext().jwt.secret //variable
type MyContext = Nextpress.Context //type
```

# Preset contexts

**Relevant base functions:**

`ctx.pathFromRoot(path: string[]) => string` - Gets an absolute path from the project root.

## website

```ts
import { websiteContext } from "@proerd/nextpress/lib/context/mappers/website"
```

This is a required context which includes some basic website options.

**Required env vars**

- `"WEBSITE_ROOT"`: ex: http://localhost:8080
- `"WEBSITE_PORT"`: ex: 8080

**Optional**

- `"WEBSITE_BASEURL"`: ex: '/'
- `"WEBSITE_LOG_REQUESTS"`: if truthy, add morgan middleware
- `"WEBSITE_BUNDLE_ANALYZER"`: if truthy, runs a bundle analyzer instance (production)
- `"WEBSITE_COMPRESSION"`: if truthy, runs compression on the node.js side
- `"WEBSITE_LANGUAGE"`: WIP

## knex

```ts
import { knexContext } from "@proerd/nextpress/lib/context/mappers/knex"
```

**Required env vars**

- Required vars: `"DB_NAME", "DB_USER", "DB_PASS"`
- Optional vars: `"DB_HOST", "DB_CLIENT"`

**Notable exports:**

### init ({ migrations: Migration[] })

This should be called at least once and is where migrations are intended to be handled.

PS: On a new project, you need to manually create an empty database with the specified name.

### db()

Returns the instance of the connection.

## jwt

```ts
import { jwtContext } from "@proerd/nextpress/lib/context/mappers/jwt"
```

When included adds the JWT middleware to the server.

**Required env vars**

- `JWT_SECRET`

## mailgun

```ts
import { mailgunContext } from "@proerd/nextpress/lib/context/mappers/mailgun"
```

**Required env vars**

- `"MAILGUN_FROM"`
- `"MAILGUN_DOMAIN"`
- `"MAILGUN_API_KEY"`

**Notable exports**

### async sendMail({ email: string; subject: string; html: string; from: string })

The `ctx.mail.sendMail` function is required by the authentication flow module. If one intends to use
another email solution, implement a context which exposes the same function.

## redis

```ts
import { redisContext } from "@proerd/nextpress/lib/context/mappers/redis"
```

**Optional env vars**

- `REDIS_URL`: Connection string

**Notable exports**

### client()

Returns an instance from `ioredis`.
