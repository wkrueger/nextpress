---
id: intro
title: What is this about?
---

Nextpress is a personal website scaffold over next.js, which bundles a couple of helpers:

- `npx nextpress --scaffold` creates a scaffold in the current folder
- `context` groups singletons like database, website and e-mail settings. It also provides a default way to read settings from environment variables and to register new settings;
- `Server` offers an express + next.js setup, with some common middleware (like authentication) added, and a set of default next.js plugins.
- `RouterBuilder` offers preset methods for building routes for either API or HTML pages which include the proper middleware;
- `UserAuth` offers a preset authentication flow.
