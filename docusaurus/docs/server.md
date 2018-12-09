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
