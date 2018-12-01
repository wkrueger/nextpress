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

`getContext` sets ups contexts in a separate file in order to provide an easy access singleton.

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

We call `websiteContext` a **context**. A context is defined using `createContextMapper`, and its
type is declared to typescript using the following `declare global` snippet:

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

```ts
import { knexContext } from "@proerd/nextpress/lib/context/mappers/knex"
```

- Required vars: `"DB_NAME", "DB_USER", "DB_PASS"`
- Optional vars: `"DB_HOST", "DB_CLIENT"`

Notable exports:

```ts
init(opts: {
    currentVersion: number;
    migration: (trx: knex.Transaction, oldVersion: number, newVersion: number) => Promise<void>;
}): Promise<void>
```

This is optional and might be used as a migration helper (FIXME: this is not knex migrations, still). We keep track of the
schema with the `meta` table.

```ts
db()
```

Returns the instance of the connection.
