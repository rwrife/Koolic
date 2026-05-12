# Using Koolic with npm / bundlers

Koolic is published as a UMD module — it works as a browser global, a
CommonJS `require`, or an ES module `import` (when your bundler honors
`exports`).

## Install

```sh
npm install koolic
```

## Plain `<script>` in a browser

```html
<script src="node_modules/koolic/js/koolic.js"></script>
<script src="node_modules/koolic/js/koolic.animate.js"></script>
<script>
    const person = { name: 'Ryan' };
    $$('#field').bind($$(person).name);
</script>
```

`koolic` and `$$` are attached to `window`.

## CommonJS (Node, Jest, older bundlers)

```js
const { koolic } = require('koolic');
const { KoolAnimation, easings } = require('koolic/animate');
```

## ESM (Vite, webpack, esbuild, Rollup, Parcel)

```js
import koolicMod from 'koolic';
import animateMod from 'koolic/animate';

const $$ = koolicMod.koolic;
const person = { name: 'Ryan' };
$$('#field').bind($$(person).name);
```

> **Note**: Koolic's `koolic.animate.js` expects the base library to have
> defined the `KoolicProperty` class — it does, through `koolic.js`'s
> module.exports. The subpath import order doesn't matter; both files export
> the same shared class.

## What's in the published package

The `files` field in `package.json` is the allow-list:

```
koolic/
├── js/
│   ├── koolic.js
│   └── koolic.animate.js
├── docs/
│   └── ...
├── README.md
└── LICENSE
```

`test/`, `examples/`, `node_modules/`, etc. are excluded.

## Verifying before publish

```sh
npm pack --dry-run
```

Lists exactly what will end up in the tarball, so you can confirm before
running `npm publish`.

## Versioning

The library follows semver. Breaking changes bump the major version. See
[migration.md](migration.md) for the 1.x → 2.0 differences.
