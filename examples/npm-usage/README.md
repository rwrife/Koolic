# Koolic from npm — minimal example

A complete, runnable example that installs Koolic from the npm registry and
uses it in both a browser and a Node script.

## Install

From this folder:

```sh
npm install
```

This pulls `koolic` from npm into `./node_modules/koolic/`.

## Run the browser demo

Just open `index.html` in a browser. The HTML loads Koolic directly via
`<script>` tags pointing at the installed package:

```html
<script src="./node_modules/koolic/js/koolic.js"></script>
<script src="./node_modules/koolic/js/koolic.animate.js"></script>
```

Type in the input — the greeting and the page title update live. Click the
button to bounce a box across the screen.

> If your OS blocks `file://` for local scripts, serve the folder with any
> static server, e.g. `npx serve .` or `python -m http.server`.

## Run the Node demo

```sh
npm run node-demo
```

…or directly:

```sh
node node-example.js
```

This script `require()`s the npm package, demonstrates property observation,
property-to-property binding, function binding, and a small animation —
**all of it in a headless Node process**, no browser involved.

Expected output:

```
[event] person.name: Ryan -> Bob
[event] person.name: Bob -> Alice
employee.name after bind = "Alice"
[event] person.name: Alice -> Grace
after person.name = "Grace":  employee.name = "Grace"
[derived] Grace is 21 years old
[derived] Grace is 22 years old
[anim done] model.progress = 100
```

## What's in here

```
npm-usage/
├── package.json     # declares "koolic": "^2.0.0" as a dependency
├── index.html       # browser demo (loads node_modules/koolic via <script>)
├── node-example.js  # Node demo (require('koolic') + require('koolic/animate'))
└── README.md        # you are here
```

## Using a bundler instead

If you're using Vite / webpack / esbuild / Parcel, replace the `<script>`
tags with imports:

```js
import koolicMod from 'koolic';
import 'koolic/animate';
const $$ = koolicMod.koolic;
```

See [`docs/npm.md`](../../docs/npm.md) in the main repo for details.
