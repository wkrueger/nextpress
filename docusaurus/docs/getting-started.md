---
id: getting-started
title: Getting started
---

1. Install nextpress into the javascript project. `yarn add @proerd/nextpress`
2. Run the scaffold. `npx nextpress --scaffold`
3. Start the server in development mode. `yarn run dev`.
4. The script will complain about missing environment configurations. Edit the generated `envfile.env`, then start the server again.

You may need to additionally install peer dependencies (like mysql or bcrypt) depending on which context modules are enabled.
