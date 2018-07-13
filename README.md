# nextpress

Package website things that could become commmon between projects into a module.

Trying not to worry much about config options, it is of intention to have one big monolythic package.

Currently bundling:

- express
- next.js as a view layer
- a default configs setup with `dotenv`
- some scaffolding (I'd like less but huh)
- front-end reacty common things (react, react-dom, redux, redutser, formik...)
  - moved to `nextpress-client` package
- all with typescript in mind

Limitations (FIXMEs)

- Design for a coupled "monolithic" small server (API and website in the same project, not necessarily in the same script)
- The wesite part uses session for auth, which in is directly coupled to the database

## scaffolding

```
yarn add @proerd/nextpress
```

> ps: we rely upon yarn, npm client is not much tested and may not work due to node_modules
> folder structur differences.

Add to your package.json:

```json
{
  "scripts": {
    "nextpress": "nextpress"
  }
}
```

Invoke:

```
yarn run nextpress --scaffold
```

There will be two `tsconfig.json`s around. The one on the root is invoked by next.js when you start the server. The one inside the `server` folder needs to be manually built.

On VSCode: F1 > Run build task > Watch at server/tsconfig.json.

Server (compiled) will be available at `./nextpress/<file>.js`. The first time you run it it may complain something and create an `envfile.env` which you should edit.

```
WEBSITE_ROOT="http://localhost:8080"
WEBSITE_PORT=8080
WEBSITE_SESSION_SECRET=iamsecret
```

If you don't want it to create an envfile (ex: netlify, heroku), set `NO_ENVFILE=1`. Required envvar check still takes place.

Folder structure goes like this:

```
  |_ .next (next.js things)
  |_ .nextpress (the compiled server)
  |_ app (put your client-side here)
  |_ pages (next.js suggested "pages" folder for router entries)
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

**Website root**

While on the server the website root path can be easily acessed through the context, on the client `process.env.WEBSITE_ROOT` is used (it is replaced on the build stage -- see the `.babelrc` for details).

### Database context

- `ctx.database.db()` gets a knex instance;
- optional `ctx.database.init({ currentVersion, migration })` contains a helper regarding table creation and migrations.

### Mailgun context

- Ready-to-use `sendMail()` shortcut for the mailgun API. Required is using the `UserAuth` module.

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

- `htmlRoutes` (create an express router with includes next.js, and etcetera. Next.js is already included on the end of the stack, additional routes you write are added BEFORE the next.js route)
- `jsonRoutes` (express router for json apis, common middleware already included)

The 2 methods above RETURN a router, you still has to write `app.use(router)` to bind it to the main express instance. The helper also contains things like:

```js
{
  /** wrap a middleware in a try-catch-next */
  tryMw,
  /** declare json routes in a simplified way */
  jsonRouteDict,
  /** for use on jsonRouteDict - set another http method, default is POST */
  withMethod,
  /** for use on jsonRouteDict - run middleware before */
  withMiddleware,
  /** for use on jsonRouteDict - validate with yup before */
  withValidation,
  /** yup link for creating validation rules */
  yup,
  /** a reference to the next.js app, which has the renderer */
  nextApp: this.nextApp,
  /** next.js default middleware */
  nextMw,  
}
```

Cut-down sample:

```ts
const server = new Server(ctx)
server.routeSetup = async (app, setup) => {
  const html = await setup.htmlRoutes(async router => {
    router.get(
      "/",
      //dont do this.
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

`jsonRouteDict` and the `withX` are candy for declaring JSON routes.

## Auth boilerplate

```ts
import UserAuth from "nextpress/built/user-auth"
const userAuth = new UserAuth(ctx, knex)
await userAuth.init()
```

Contains common session auth workflow things.

This is shaped as an OOPish interceptor pattern with a bunch of extension points. Override methods to customize things.

- `init()` This creates an `user` table in the database;

- `routineCleanup()` is meant to be manually added to some scheduled job (hourly expected),
  cleans up unvalidated users and unused password reset requests. It also is ran along with `init()`

- JSON routes

  - `throwOnUnauthMw` (to be used on express routes behind an auth/session gate)
  - `userRoutes(opts).json` generates an express router with a set of routes from the workflow methods (all them POST + JSON). You are supposed to create your auth forms then AJAX-invoke these.
    - `/createUser` `{ newUserEmail, newUserPwd }`
    - `/login` `{ existingUserEmail, existingUserPwd }`
    - `/request-password-reset` `{ email }`
    - `/perform-password-reset` `{ pwd1, pwd2, requestId }`
    - `/logout`
  - `userRoutes(opts).html` generates preset next.js (html+GET) routes which are called back from e-mails:

    - `/auth/validate?seq=<hash>` redirects to a success message (see below)
    - `/auth/forgotPassword?seq=` redirects to a custom form (see below)

  - Required additional setup:
    - Create a route for displaying simple messages (default path `/auth/message.tsx`), this receives the `title` and `content` props.
    - Create a route for the password reset form (default at `/auth/password-reset-form`). This route receives the `requestId` prop.

- Auth workflow (underlying methods for the routes, in case one wants to override them)

  1.  `create()` creates an unvalidated user and a validation token
  2.  `validate()` validates an user with the provided hash
  3.  `find()` looks up an user given email and password. Fails on unvalidated user
  4.  `createResetPwdRequest()`
  5.  `findResetPwdRequest()` finds but wont do nothing
  6.  `performResetPwd()`

_Behavior:_ By default, auth requests are capped at 10 reqs / 10 sec (most) and 30 reqs / 10 sec
(login). Each email may see 1 login attempt every 15 seconds. Overrideables to change that are:

- `_userRequestCap`
- `_getRequestThrottleMws`

TODO

all of the rest

## Big fat caveat

Modules/dependencies currently rely on flat node_modules.
