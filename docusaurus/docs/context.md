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

`getContext` sets ups contexts in a separate file in order to provide an easy access singleton. Typing `getContext` anywhere may kick in the default import.

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

## Acessing the context

```ts
getContext().jwt.secret
```

# Preset contexts

## knex

[(source)](https://github.com/wkrueger/nextpress/blob/master/src/context/mappers/knex.ts)

```ts
import { knexContext } from "@proerd/nextpress/lib/context/mappers/knex"
```

- Required vars: `"DB_NAME", "DB_USER", "DB_PASS"`
- Optional vars: `"DB_HOST", "DB_CLIENT"`

Notable exports:

### init ({ migrations: Migration[] })

This should be called at least once and is where migrations are intended to be handled.

```ts
db()
```

Returns the instance of the connection.
