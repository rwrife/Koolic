# Router

> Switch between in-page "views" without a full reload, with a reactive
> current-route state, route parameters, and lifecycle hooks. An optional
> add-on library.

## Loading

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.router.js"></script>
```

Or with npm:

```js
const { koolic } = require('koolic');
require('koolic/router');
```

## Quick start

Markup: each view is a section that the router will show or hide.

```html
<nav>
    <a data-route="/">Home</a>
    <a data-route="/products">Products</a>
    <a data-route="/about">About</a>
</nav>

<section id="home">…</section>
<section id="products">…</section>
<section id="about">…</section>
<section id="notFound">…</section>
```

JavaScript: declare your routes once.

```js
koolic.router({
    routes: [
        { path: '/',          view: '#home' },
        { path: '/products',  view: '#products' },
        { path: '/about',     view: '#about' },
        { path: '*',          view: '#notFound' }
    ]
});
```

That's the whole minimum setup. Click a `[data-route]` link, or call
`koolic.router.navigate('/products')`, and the right view appears while the
others are hidden.

## Routes

Each route is an object:

```js
{
    path:  '/users/:id',     // pattern (see below)
    view:  '#userPage',      // CSS selector for the view's root element
    enter: ({ id }) => loadUser(id),
    leave: ({ id }) => saveUser(id),
    meta:  { /* anything */ }
}
```

### Path patterns

| Pattern | Matches | `params` |
| --- | --- | --- |
| `/`            | `/` only            | `{}` |
| `/about`       | exact `/about`      | `{}` |
| `/users/:id`   | `/users/42`         | `{ id: '42' }` |
| `/posts/:y/:s` | `/posts/2024/hi`    | `{ y: '2024', s: 'hi' }` |
| `*`            | anything (fallback) | `{}` |

- `:param` matches one path segment (no slashes).
- Values are automatically `decodeURIComponent`-ed.
- Trailing slashes are tolerated (`/about` matches `/about/`).
- A `*` route only matches when no other route does — order in the array
  doesn't affect this.

### Lifecycle hooks

- **`enter(params)`** — called when the route is being activated.
  May return a Promise; **the view is not shown until the Promise
  resolves**. This makes `enter` a natural place to fetch data:

  ```js
  { path: '/users/:id', view: '#user',
    enter: async ({ id }) => {
        const data = await fetch('/api/users/' + id).then(r => r.json());
        renderUser(data);
    } }
  ```

- **`leave(params)`** — called when navigating away. Receives the params
  the route was activated with. May also be async.

If a hook throws or rejects, the error is logged and the navigation aborts
cleanly (the view doesn't change, `current` doesn't update).

### Wildcard / 404

```js
{ path: '*', view: '#notFound', enter: () => {
    document.getElementById('badPath').textContent = koolic.router.current.path;
}}
```

Or supply a `notFound` handler on the config to skip the view-swap entirely:

```js
koolic.router({
    routes: [...],
    notFound: (path) => console.warn('Unmatched:', path)
});
```

## Navigation

| Call | Behavior |
| --- | --- |
| `koolic.router.navigate('/about')`  | `pushState`-equivalent; new browser history entry |
| `koolic.router.replace('/login')`   | `replaceState`-equivalent; replaces the current entry |
| `koolic.router.back()`              | `history.back()` |
| `koolic.router.forward()`           | `history.forward()` |

`navigate` and `replace` accept any path string; it's normalized to start
with `/` automatically.

### `data-route` links

The router installs a single click delegate on `document`. Any element with
a `data-route` attribute becomes a navigation trigger:

```html
<a data-route="/products">Products</a>
<button data-route="/cart">Cart</button>
<div class="card" data-route="/products/42">Widget</div>
```

Use `data-route-replace` instead to call `replace()` (good for redirects):

```html
<a data-route="/dashboard" data-route-replace>Skip intro</a>
```

The handler honors modifier keys (Ctrl/Cmd/Shift/Alt click and middle click
fall through to the browser's default, so "open in new tab" still works).

Plain `<a href="...">` links without `data-route` are not intercepted.

## Reactive current state

`koolic.router.current` is a Koolic-instrumented object with four properties:

| Property | Type | Description |
| --- | --- | --- |
| `path`   | string | Current path, normalized (always starts with `/`) |
| `params` | object | Matched route parameters |
| `route`  | object | The route config that matched |
| `view`   | string | The matched view's selector |

It's reactive, so you can bind to it like any other Koolic property:

```js
// Live breadcrumb
$$('#crumb').bind($$(koolic.router.current).path);

// Highlight the active nav link
$$(path => {
    document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === path);
    });
}).bind($$(koolic.router.current).path);

// Log every navigation
$$(koolic.router.current).path.onChange((from, to) => console.log(from, '→', to));
```

## Guards: `beforeEach`

A guard runs before every navigation. Return `false` to cancel, return a
path string to redirect, or return `true`/`undefined` to allow:

```js
koolic.router({
    routes: [
        { path: '/',       view: '#home' },
        { path: '/admin',  view: '#admin' },
        { path: '/login',  view: '#login' }
    ],
    beforeEach: ({ from, to }) => {
        if (to.path === '/admin' && !user.isAdmin) return '/login';
        return true;
    }
});
```

You can also register more guards imperatively:

```js
koolic.router.beforeEach((ctx) => { /* ... */ });
```

The guard runs synchronously **before** any `leave` or `enter` hook. If
multiple guards are registered, they run in order; the first cancellation
or redirect wins.

## Hash mode vs history mode

| Mode | URL shape | Use when |
| --- | --- | --- |
| `'hash'` *(default)* | `/index.html#/products`  | Works from `file://`, no server config needed |
| `'history'`           | `/products`               | Cleaner URLs; requires the server to fall back to your HTML page for unknown paths |

```js
koolic.router({ mode: 'history', base: '/app', routes: [...] });
```

In `history` mode, every URL within `base` (e.g. `/app/products/42`) needs
to be served the same HTML by your backend, so the router can resolve it
client-side. Single-page-app deployments to `nginx`, `Apache`, Vercel,
Netlify, S3+CloudFront, etc. all support this with a single rule.

## Switching between HTML files (no full reload)

A common shape for larger apps: instead of putting every view inline as a
`<section>`, keep each page in its own `.html` file. The router can fetch
them on demand, inject the body into a host container, run any inline
scripts, and update the document title — all without a page reload.

### Setup

In your shell HTML:

```html
<header>…persistent nav…</header>
<main id="app"></main>    <!-- mount point -->

<script src="js/koolic.js"></script>
<script src="js/koolic.router.js"></script>
<script>
koolic.router({
    container: '#app',           // <-- default mount point for fetched pages
    pages: 'pages/',             // <-- base URL for relative page paths
    routes: [
        { path: '/',          page: 'home.html' },
        { path: '/about',     page: 'about.html' },
        { path: '/blog/:slug', page: 'post.html',
          enter: ({ slug }) => { document.getElementById('postSlug').textContent = slug; } },
        { path: '*',          page: '404.html' }
    ]
});
</script>
```

Each fetched HTML file is self-contained — its own `<title>`, body markup,
inline scripts, even its own `<link rel="stylesheet">` references:

```html
<!-- pages/about.html -->
<!doctype html>
<html>
<head><title>About — My App</title></head>
<body>
    <h1>About</h1>
    <p>This page was fetched on demand.</p>
    <script>
        // Runs every time the page is shown.
        document.getElementById('renderedAt').textContent = new Date().toLocaleTimeString();
    </script>
</body>
</html>
```

### Route options for fetched pages

| Option | Description |
| --- | --- |
| `page`    | URL of the HTML file to fetch. Relative paths resolve against the router's `pages` base. |
| `target`  | CSS selector for the mount point. Overrides the config's `container`. |
| `extract` | CSS selector inside the fetched doc; only that sub-tree is injected. Defaults to `<body>`. |
| `scripts` | Set to `false` to suppress re-execution of `<script>` tags found inside the fetched content. |

### Config options

| Option | Description |
| --- | --- |
| `container` | Default mount-point selector for all page-fetching routes. |
| `pages`     | Optional URL prefix for relative `page` values. Absolute URLs and paths starting with `/` are used as-is. |
| `pageCache` | `true` (default) — fetched documents are cached so revisits are instant. Set `false` to refetch every time. |

### Hooks fire after injection

For routes that use `page`, the order is:

1. previous route's `leave` hook runs
2. the HTML is fetched + parsed + injected
3. **the new route's `enter` hook runs** (the DOM is in place; the hook can
   query and bind it freely)
4. the reactive `current` state updates

This is the opposite of the view-based ordering, where `enter` runs before
the view is revealed. The page-fetching ordering means your `enter` hook
can wire up `$$` bindings against the freshly-injected DOM.

### Re-executing scripts

Classic inline scripts (`<script>…</script>` or `<script src="…">`) inside
fetched pages are re-executed every time the page is shown. Module scripts
(`<script type="module">`) are skipped — they dedupe by URL, and the host
page is expected to load them once.

If you want a script to run exactly once, set `scripts: false` on the route
and load the module from your shell HTML instead.

### Cache control

By default, every fetched page is cached. To bust the cache:

```js
koolic.router.clearPageCache('pages/about.html');   // one URL
koolic.router.clearPageCache();                      // all
```

Or disable the cache globally:

```js
koolic.router({ pageCache: false, ... });
```

### Runnable example

[`examples/14-multi-page/`](../../examples/14-multi-page/) is a complete
multi-page shop with a persistent shell, separate HTML files for each
route, and a dynamic post template. Because it uses `fetch`, you'll need
to serve it through a static HTTP server (e.g. `python -m http.server`)
rather than opening it from `file://`.

## Preserving in-memory state across navigations

Because navigation never reloads the page, **any in-memory JavaScript state
survives**. This includes Koolic stores created with `storage: 'memory'`:

```js
// Created once, shared by every view.
const cart = koolic.store('cart', { items: [] });

// Header (always visible)
$$('#cartBadge').bind($$(cart).items);

// Product page
cart.items = cart.items.concat({ sku: 'widget' });

// Navigate to Cart page — cart.items is still there.
koolic.router.navigate('/cart');
```

For persistence across reloads, switch the store backend to `'session'` or
`'local'`. The router doesn't care which.

## Imperative API

| Function | Purpose |
| --- | --- |
| `koolic.router(config)`        | Initialize / reconfigure |
| `koolic.router.navigate(path)` | Push a new history entry |
| `koolic.router.replace(path)`  | Replace the current entry |
| `koolic.router.back()`         | History back |
| `koolic.router.forward()`      | History forward |
| `koolic.router.current`        | Reactive current-route state |
| `koolic.router.match(path)`    | Find the route+params for a path; returns `null` if none match |
| `koolic.router.addRoute(r)`    | Add a single route to the live config |
| `koolic.router.beforeEach(fn)` | Register an additional guard |

## Caveats

- **One router instance per page.** Calling `koolic.router({…})` again
  replaces the route table, not creating a second router. The hashchange/
  popstate listener is registered once for the lifetime of the page.
- **Views must exist in the DOM** when their `enter` hook fires. If you're
  injecting markup dynamically, ensure it's present (or use `enter` to
  build it).
- **Direct array mutations** (`arr.push`, `arr.splice`) on reactive Koolic
  properties are not observable — replace the array reference instead:
  `cart.items = cart.items.concat(item)`. This is a general Koolic rule,
  not router-specific.
- **History mode + deep links** need a server fallback. With hash mode you
  can skip this entirely.

## See also

- [Example 13 — Router](../../examples/13-router.html) — full multi-view
  shop demo with cart, products, dynamic detail page, and 404.
- [State store](state-store.md) — pairs naturally with the router for
  in-memory state that survives navigation.
