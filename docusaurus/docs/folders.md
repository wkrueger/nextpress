---
id: folders
title: Folder structure
---

Nextpress inherits the folder structure from next.js, with some additional components. The best way
to check it out is just running the scaffold yourself.

- `.nextpress` is where the server-side code is compiled;
- `pages` is next.js's default file-system router. Every file is supposed to `export default` a react component;
- `pages-content` is where front-end code is supposed to live (not in "pages" because that would expose the files). This name is chosen in order to keep the folder close to "pages" in the file explorer;
- `server` is where the source server TS lives;
- `static` is where static files are served.

* You may notice 2 `tsconfig.json`s. The one in the root folder is for the front-end code, the one inside "server" is for the... server.

Nextpress bundles `babel-module-resolver`. The scaffold comes with some path aliases:

- `pages-content` links absolutely to this folder
- `@common` links to `pages-content/_common`

Edit `.babelrc` and the root `tsconfig.json` ir order to add new require aliases.
