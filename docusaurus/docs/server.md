---
id: server
title: Server
---

## Basic usage

    extend server class > server.run()

Sets up a fastify server with a couple of predefined middleware and next.js at the end of the stack.

Example:

```typescript
import { Server } from "@proerd/nextpress/lib/server"

class MyServer extends Server {
  constructor(context) {
    super(context)
    this.options.useHelmet = false
  }

  async setupRoutes() {
    this.fastify("/hello", async () => {
      return { hello: "world" }
    })
  }
}

const ctx = getContext()
const server = new MyServer(ctx)
server.run()
```

## Options

- useNextJs (default true)
- useHelmet (defaul true)
- jwtOptions > tokenDuration (5 days)
- bundleAnalyzer: { analyzeServer: false, analyzeClient: true } - Options if WEBSITE_BUNDLE_ANALYZER is active

## next.js bundled plugins

- CSS (no modules)
- SASS (no modules)
- lodash webpack plugin (bundle size reduction)
- typescript
- url-loader for CSS imported fonts

Currently CSS and SASS output a single file for the project, automatically imported by next.

You may override or extend the plugins by changing the `getNextJsCongig` method.

## JWT Parsing

If `ctx.jwt` is present on the context, nextpress adds `req.nextpressAuth` to the request object.

**req.nextpressAuth.getUser(): Promise<User|undefined>**

Attempts to fetch user info from either the `Authorization` header or the `user_token` cookie.

JWTs are set also on the cookie in order to aid SSR on browser GETs.

**req.nextpressAuth.setUser(user): Promise\<string>**

Obtains a JWT for the requested object and sets the `user_token` cookie.

**req.nextpressAuth.logout(): Promise\<void>**

Removes the auth for that request and sends an unset cookie header.

> The methods above do not perform any form of user validation, they just write arbitrary data into
> a JWT and set it as cookie. Refer to the `user-auth` module for a preset authentication flow.

You may extend the `nextpressAuth` with custom logic in the following manner.

```ts
class MyUserAuth extends UserAuthJwt {
  async getUser(user) {
    await checkIfUserIsValid(user)
    return super.user()
  }
}

class MyServer {
  UserAuthClass = MyUserAuth
}
```

## Development setup

    yarn run dev

By default the scaffold comes with a webpack setup for the server with the main purpose of enabling
HMR. It defaults to a `./index.ts` entrypoint.

The main point of running HMR for the server is allowing a restart without reloading the next.js
instance. The next.js init process rebuilds all of the client-side assets, which may take quite long. The
current HMR setup, on the other hand, will reload the whole script but keep the previous next.js instance.

The HMR setup requires 2 actions on the server code in order to work (both already included on the scaffold):

- call `.useHMR()` on `Server` instances
- self-register the entry points by calling `module.hot && module.hot.accept()`

## Production

When `NODE_ENV` is set to `production`, the equivalent of `next build` and `next start` are called with `server.run()`.
