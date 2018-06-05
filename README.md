# nextpress

Package website things into a module.

Currently bundling:

- express
- next.js as a view layer
- a default configs setup with `dotenv`
- some scaffolding (I'd like less but huh)
- front-end reacty common things (react, react-dom, redux, redutser, formik...)
- all with typescript in mind

## scaffolding

```
npm i <some-nextpress-source> (currently not on npm)
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

Server (compiled) will be available at `./nextpress/index.js`. The first time you run it it may complain something and create an `envfile.env` which you should edit.

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
  projectRoot: path.resolve(__dirname, ".."),
})
```

Reads from the envfile and populates a settings object which is meant to be used throughout the project.

```typescript
ContextFactory(i: {
    projectRoot: string;
    mappers: ContextMapper[];
}): Nextpress.Context
```

A "context mapper" describes the mapping from the `env` keys to the resulting object. A couple of `defaultMappers` are provided.

The context type if globally defined in `Nextpress.Context`, and shall be declaration-merged through `Nextpress.CustomContext` when necessary.

```typescript
declare global {
  namespace Nextpress {
    interface CustomContext {
      newKeys: goHere
    }
  }
}
```

> Fixme: include `knex` into the database thingy

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

- htmlRoutes (create an next.js-y router, required middleware is already included, just set up the routes)
- jsonRoutes (same thing, but for json apis)

The 2 methods above RETURN a router, you still has to write `app.use(router)` to bind it to the main express instance.

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

TODO

all of the rest

## Big fat caveat

Modules/dependencies are currently a mess, this probably works only with yarn since it relies on the flat `node_modules` structure.
