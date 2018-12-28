---
id: server
title: Server
---

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

## JWT Authorization

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
