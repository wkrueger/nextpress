# nextpress

Package website things into a module.

Currently bundling:

- express
- next.js as a view layer
- a default configs setup with `dotenv`
- some scaffolding (I'd like less but huh)
- front-end reacty common things (react, react-dom, redux, redutser, formik...)
  - moved to `nextpress-client` package
- all with typescript in mind

Trying not to worry much about config options, it is of intention to have one big monolythic package.

## scaffolding

```
npm i @proerd/nextpress
```

Create a `build.js` file with:

```js
const nextpress = require("nextpress")
nextpress.buildscript(__dirname).run()
```

Run:

```
node build scaffold
```

Also currently available:

- `node build compileServer` (typescript watch task for the server code)

There will be two `tsconfig.json`s around. The one on the root is invoked by next.js when you start the server. The one inside the `server` folder needs to be manually built.

Server (compiled) will be available at `./nextpress/index.js` and is expected to be run with .nextpress cwd. The first time you run it it may complain something and create an `envfile.env` which you should edit.

```
WEBSITE_ROOT="http://localhost:8080"
WEBSITE_PORT=8080
WEBSITE_SESSION_SECRET=iamsecret
```

Folder structure goes like this:

```
  |_ .next (next.js things)
  |_ .nextpress (the compiled server)
  |_ app (put your client-side here)
  |_ pages (next.js suggested "pages" folder)
  |_ server
  |_ static
  | ...
```

## Context tool

```typescript
import { ContextFactory } from "nextpress"

const context = ContextFactory({
  mappers: [
    defaultMappers.website,
    defaultMappers.mailgun,
    defaultMappers.database,
    {
      id: "auction_scan",
      envKeys: ["BNET_API_KEY", "RUN_SERVICE"],
      optionalKeys: ["RUN_SERVICE"],
      envContext: () => ({
        apiKey: process.env.BNET_API_KEY!,
        runService: Boolean(process.env.RUN_SERVICE),
      }),
    },
  ],
  projectRoot: path.resolve(__dirname, ".."),
})
})
```

Reads from the envfile and populates a settings object which is meant to be used throughout the project.

A "context mapper" describes the mapping from the `env` keys to the resulting object. A couple of default `defaultMappers` are provided.

The context type is globally defined in `Nextpress.Context`, and shall be declaration-merged through `Nextpress.CustomContext` when necessary.

```typescript
declare global {
  namespace Nextpress {
    interface CustomContext {
      newKeys: goHere
    }
  }
}
```

## Route setup

The scaffold comes with something like:

```typescript
import { Server, ContextFactory } from "nextpress"
const context = ContextFactory(...)
const server = new Server(context)
server.run()
```

`Server` expects its context to have the `website` default mapper. It already bundles session middleware, and if the `database` default mapper is present, uses it.

`server` has an OOPish interceptor pattern, you may set it up by overriding its available methods.

```ts
//default route setup
async routeSetup(app: ExpressApp, helper: RouteSetupHelper): Promise<void> {
  app.use(await helper.htmlRoutes())
}
```

Adding routes must be done inside this. `helper` comes with a couple of predefined templates and useful functions. See signatures while using the editor.

Ex

- htmlRoutes (create an express router with includes next.js, required middleware and next.js is already included, just set up the additional routes)
- jsonRoutes (express router for json apis, common middleware already included)

The 2 methods above RETURN a router, you still has to write `app.use(router)` to bind it to the main express instance.

```js
{
  tryMw,
  /** a reference to the next.js app, which has the renderer */
  nextApp: this.nextApp,
  /** next.js default middleware */
  nextMw,
  /** declare json routes in a simplified way */
  jsonRouteDict,
  /** for use on jsonRouteDict - set http method, default is POST */
  withMethod,
  /** for use on jsonRouteDict - run middleware before */
  withMiddleware,
  /** for use on jsonRouteDict - validate with yup before */
  withValidation,
  /** yup link for creating validation rules */
  yup,
}
```

Cut-down sample:

```ts
const server = new Server(ctx)
server.routeSetup = async (app, setup) => {
  const html = await setup.htmlRoutes(async router => {
    router.get(
      "/",
      setup.tryMw((req, res) => {
        if (!req.session!.user) {
          return setup.nextApp.render(req, res, "/unauth")
        }
        return res.redirect("/dashboard")
      }),
    )
    //...
  })
  app.use(html)

  const api = setup.jsonRoutes(async router => {
    Setup.jsonRouteDict(router, {
      "/createuser": async req => {
        await User.create({
          email: req.body.newUserEmail,
          password: req.body.newUserPwd,
        })
        return { status: "OK" }
      },
    })
  })
  app.use("/api", api)
}
server.run()
```

## Auth boilerplate

```ts
import UserAuth from "nextpress/built/user-auth"
const userAuth = new UserAuth(ctx, knex)
await userAuth.init()
```

Contains common session auth workflow things.

This is shaped as an OOPish interceptor pattern. Override methods to customize things.

- **init()** This creates an `user` table in the database;

- Auth workflow

  1.  `create()` creates an unvalidated user and a validation token
  2.  `validate()` validates an user with the provided hash
  3.  `find()` looks up an user given email and password. Fails on unvalidated user
  4.  `createResetPwdRequest()`
  5.  `findResetPwdRequest()` finds but wont do nothing
  6.  `performResetPwd()`

- JSON routes
  - `gatewayMw` (to be used on express routes)
  - `userRoutes(opts).json` generates an express router with a set of routes from the above workflow methods (all them POST + JSON)
    - `/createUser` `{ newUserEmail, newUserPwd }`
    - `/login` `{ existingUserEmail, existingUserPwd }`
    - `/request-password-reset` `{ email }`
    - `/perform-password-reset` `{ pwd1, pwd2, requestId }`
    - `/logout`
  - `userRoutes(opts).html` generates preset next.js routes for the workflow (add to root app)
    - `/auth/password-reset` password reset form the email will link to. Create the
      layout on `./pages/auth/password-reset.tsx`. May be overriden.
    - `/auth/validate?seq=<hash>` validation route the email will link to.
- GET routes
- `/auth/validate?seq=`
- `/auth/forgotPassword?seq=`

TODO

all of the rest

## Big fat caveat

Modules/dependencies currently rely on yarn, will prob not work under npm or pnpm.
