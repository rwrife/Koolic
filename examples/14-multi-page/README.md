# Multi-page SPA example

A demonstration of `koolic.router`'s **HTML page fetching** mode: each "page"
is a separate `.html` file, fetched on demand, swapped into a persistent
shell without a full page reload.

## Run it

The browser's `fetch` API doesn't work for `file://` URLs, so this example
needs a tiny static server. Any of these work:

```sh
# Python (built-in)
python -m http.server 8080

# Node (npx)
npx serve

# PHP (built-in)
php -S localhost:8080
```

Then open <http://localhost:8080/examples/14-multi-page/>.

## What's in here

```
14-multi-page/
├── index.html          # the persistent shell (header, footer, mount point, router config)
├── pages/
│   ├── home.html       # individual pages — body-only is what gets injected
│   ├── about.html
│   ├── blog.html
│   ├── post.html       # template for /blog/:slug
│   ├── contact.html
│   └── 404.html
└── README.md
```

`index.html` is the only "real" page the browser ever loads. The header,
nav, footer, and the `<main id="app">` mount point persist across every
navigation. The router fetches `pages/*.html`, parses out the
`<body>` contents, and drops them into `#app`.

## What to look for

1. **The Network tab.** Click around — each page is fetched exactly once,
   then cached. Subsequent visits are instant with no network call.
2. **The URL.** Every page change updates the URL (`#/`, `#/about`,
   `#/blog/hello-koolic`, …) and is in the browser history. Back/forward
   work normally.
3. **The title.** Watch the browser tab — each fetched page sets the
   document title from its own `<title>` element.
4. **Inline scripts.** `about.html` and `contact.html` include their own
   `<script>` blocks (timestamp + form binding). The router re-executes
   these every time the page is shown.
5. **Cross-page state.** The `Blog` page reads a "visit count" from a
   `koolic.store` memory singleton declared in the shell — proving that
   in-memory state persists between fetched pages just like in the
   single-file router example.
6. **Dynamic params.** `pages/post.html` is a single template shared by
   every blog post URL; the route's `enter` hook fills in the slug.

See the [router guide](../../docs/guide/router.md) for the full feature
reference.
