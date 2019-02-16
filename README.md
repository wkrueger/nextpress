# nextpress

<p align="center"><img src="./docs/img/sanic.png" width="100"/></p>

Package website things that could become commmon between projects into a module.

Trying not to worry much about config options, it is of intention to have one big opinionated monolythic package.

Currently bundling:

- dotenv
- express
- next.js as a view layer
- a default configs setup with `dotenv`
- some scaffolding (I'd like less but huh)
- DB support: knex/redis
- an auth workflow
- jest
- with typescript in mind

v2 is definitely a napkin draft. Decent version (v3) worth sharing and real docs are a WIP.

  - Carefully write docs for everything
  - Decent test coverage
  - Review best ways to implement each functionality from the ground
