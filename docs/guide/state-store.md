# State Store

> Persist a Koolic reactive object across page reloads, tabs, or just as
> a process-wide shared singleton. An optional add-on library.

## Loading

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.store.js"></script>
```

Or with npm:

```js
const { koolic } = require('koolic');
require('koolic/store');
```

## The basics

```js
const cart = koolic.store('cart', {
    items: 0,
    total: 0.00
}, { storage: 'local' });

cart.total = 19.99;     // mutate as a normal object — automatically persisted
```

`koolic.store(...)` returns a **regular reactive Koolic object**. It's
already `$$`-wrapped, so binding works the same as anywhere else:

```js
$$('#totalDisplay').bind($$(cart).total);
$$(cart).total.onChange((_, n) => console.log('new total:', n));
```

The defaults you pass are used **only** the first time the store is created
for this key. On subsequent reloads (or on subsequent calls in the same
page), the existing state wins.

## Storage backends

| `storage`   | Lifetime |
| --- | --- |
| `'memory'` *(default)* | Process-wide singleton. Survives in-page navigation between modules; lost on full reload. |
| `'session'` | `sessionStorage`. Survives reload + same-tab navigation. Cleared when the tab closes. |
| `'local'`   | `localStorage`. Persistent forever. Syncs across tabs via the browser's `storage` event. |

## Shared singleton

Calling `koolic.store('cart', …)` a second time with the same key returns
the **same object instance** — defaults are ignored:

```js
const a = koolic.store('cart', { x: 1 });
const b = koolic.store('cart', { x: 999 });   // ignored
a === b;     // true
a.x;          // 1
```

This is the easiest way for two unrelated scripts to share state without
plumbing imports.

## Debouncing

Writes are coalesced. By default, the store waits 100ms after the last
mutation before serializing to storage:

```js
const s = koolic.store('foo', { v: 0 }, { storage: 'local' });
s.v = 1; s.v = 2; s.v = 3;
// ~100ms later: storage gets one write with v=3
```

Set `debounce: 0` for immediate writes, or a larger number for batching:

```js
koolic.store('foo', defaults, { storage: 'local', debounce: 500 });
```

Force a pending write to happen now:

```js
koolic.store.flush('foo');
```

## Versioning (migrations)

When you change the *shape* of your stored object, bump the version. Stale
stored data with a different version is discarded:

```js
// v1
const prefs = koolic.store('prefs', { theme: 'light' }, { version: 1 });

// later — added a new required field:
const prefs = koolic.store('prefs', {
    theme: 'light',
    accent: 'blue'
}, { version: 2 });    // v1 data is discarded; defaults apply
```

Stored data carries its version in a small wrapper:

```json
{ "__kv": 2, "data": { "theme": "dark", "accent": "blue" } }
```

## Cross-tab sync (localStorage)

When `storage: 'local'`, the library listens for the browser's `storage`
event and merges changes from other tabs into the live model. Bindings
fire as if the change had come from the local tab — your UI updates with
no extra code:

```js
const prefs = koolic.store('prefs', { theme: 'light' }, { storage: 'local' });
$$('body').bind($$(prefs).theme, 'className');
// Change theme in tab A -> body className updates in tab B.
```

Echo-prevention is built in: an incoming sync does **not** re-write to
storage.

## Inspection & control

| Function | Purpose |
| --- | --- |
| `koolic.store(key, defaults, opts)` | Create or fetch a store; returns reactive object |
| `koolic.store.has(key)` | `true` if a live store exists |
| `koolic.store.raw(key)` | Get the reactive object without creating one |
| `koolic.store.snapshot(key)` | Return a detached deep copy |
| `koolic.store.reset(key)` | Reset live values to defaults; persists |
| `koolic.store.flush(key)` | Force a debounced write to happen now |
| `koolic.store.subscribe(key, fn)` | Register an `onChange`-style listener; returns unsubscribe |
| `koolic.store.clear(key)` | Remove from storage and the live registry |
| `koolic.store.clear(key, { live: true })` | Wipe storage but keep live state |
| `koolic.store.keys()` | List active store keys |

## Reacting to changes (REST sync, audit logs, …)

Sometimes you want to *do something* whenever the store changes — POST to a
backend, write an audit log, broadcast over a WebSocket. The store has a
dedicated callback for this.

### `options.onChange(state, info)`

```js
const cart = koolic.store('cart', { items: [], total: 0 }, {
    storage: 'local',
    debounce: 500,
    onChange: async (state, info) => {
        // Fires on the debounced persist tick. `state` is the live object,
        // `info.changes` is the batch of mutations since the last call.
        await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    }
});

cart.total = 19.99;       // ~500ms later -> POST /api/cart with the snapshot
```

`info.changes` is an array of `{ path, oldValue, newValue }`. Paths use
dotted notation for nested fields:

```js
state.user.name = 'Grace';
// info.changes == [{ path: 'user.name', oldValue: 'Ada', newValue: 'Grace' }]
```

The callback may be async (return a Promise). It runs fire-and-forget;
rejections are logged via `console.error` and never propagate.

### When does it fire?

- **Only for local mutations.** It does **not** fire for incoming cross-tab
  syncs, because other tabs presumably already issued their own backend
  writes. If you want to react to all changes including cross-tab, use
  `$$(state).x.onChange(...)` or `state.__koolic__.on(...)` instead.
- On **the debounced persist tick** — multiple rapid mutations get coalesced
  into one call with all of them in `info.changes`.
- With `debounce: 0`, it fires **synchronously per mutation**.

### Imperative `subscribe(key, fn)`

For listeners that come and go (component lifecycles, route changes), use
the imperative form:

```js
const off = koolic.store.subscribe('cart', (state, info) => {
    console.log('cart changed:', info.changes);
});

// later, when you're done:
off();
```

`subscribe` throws if no store exists for `key` — make sure you create the
store first.

## Patterns

### Persistent form

```js
const draft = koolic.store('signup.draft', {
    email: '', name: '', plan: 'free'
}, { storage: 'local' });

$$('#email').bind($$(draft).email);
$$('#name').bind($$(draft).name);
$$('#plan').bind($$(draft).plan);

// Now the user can refresh the page mid-signup and not lose their data.
```

### Live theme that follows across tabs

```js
const ui = koolic.store('ui', { theme: 'light' }, { storage: 'local' });
$$(theme => {
    document.documentElement.dataset.theme = theme;
}).bind($$(ui).theme);
```

### Shared cart between header and checkout components

```js
// header.js
const cart = koolic.store('cart', { count: 0 });
$$('#cartBadge').bind($$(cart).count);

// checkout.js
const cart = koolic.store('cart');   // same instance, no defaults needed
cart.count = cart.count + 1;
```

## What gets serialized

Storage uses `JSON.stringify` / `JSON.parse`, so:

- ✅ Strings, numbers, booleans, plain objects, arrays, `null`.
- ❌ Functions, `undefined`, `Symbol`, `Date` (becomes a string),
     `Map`/`Set`, class instances, DOM nodes, circular references.

Stick to plain data and you're fine.

## Caveats

- **New top-level keys added after creation** aren't auto-instrumented
  (Koolic's reactivity is established at wrap time). Either include the
  key in `defaults` from the start, or use `prop('newKey')` to add it.
- **Cross-tab sync replaces nested objects wholesale** when a sub-object
  is swapped on the other side. If you have hand-attached listeners deep
  inside a nested sub-tree, prefer setting individual leaf values instead
  of replacing whole branches.
- **`storage` quota errors are silently swallowed.** If you store
  potentially large data, watch your DevTools console — browsers vary on
  whether they emit a warning before failing the write.

## See also

- [Example 12 — State store](../../examples/12-state-store.html) — runnable demo with all three backends.
- [Reactive objects](reactive-objects.md) — the underlying model.
