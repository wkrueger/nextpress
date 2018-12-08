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

Hmm, what else:

- Written in typescript, written for typescript (although, since we dont use fancy decorator stuff,
  js shall just work out of the box)

For those who don't know, next.js is sort of a react configuration package,
that simplifies hard things (such as SSR and routing) through the use of some opinionated setup (ex,
a file-system router). So that in the end you can just focus on writing the pages, intead of fiddling
with webpack.

Nextpress does not aim to be a "very-complete framework that works for everything", since that would
become just complicated and pointless to exist in face of the already existing alternatives. It is
mostly just a step further from manually sewing dozens of packages and settings, and in order to keep
that simple, it has to be purposely opinionated and limited.
