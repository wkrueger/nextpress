# nextpress

Package my own website things into a module.

Currently bundling:

* express
* next.js as a view layer
* mailgun helpers
* a default configs setup with `dotenv`
* some scaffolding (I'd like less but huh)
* front-end reacty common things (react, react-dom, redux, redutser, formik...)
* all with typescript in mind

## scaffolding

```
npm i some-nextpress-source (currently not on npm)
```

Create a `build.js` file with:

```js
const nextpress = require("nextpress")
nextpress.buildscript(__dirname).run()
```

This should scaffold the things, compile the server and start it. The server will then crash and ask you to fill up the newly created `envfile.env`. Example:

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
  |_ pages (next.js suggested "pages" folder. Put top-level "controllers" here)
  |_ server
  |_ static
  | ...
```

## Server context

## Route setup
