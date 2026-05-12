/*!
 * Koolic 2.0 — router add-on
 *
 * Requires koolic.js to be loaded first.
 *
 *   koolic.router({
 *       mode: 'hash',               // 'hash' (default) | 'history'
 *       container: '#app',          // default mount point for fetched pages
 *       pages: '/pages/',           // optional base path for route.page
 *       routes: [
 *           { path: '/',          view: '#home' },                  // in-page section
 *           { path: '/products',  page: 'products.html' },          // fetched page
 *           { path: '/users/:id', view: '#user', enter: ({id}) => loadUser(id) },
 *           { path: '*',          view: '#notFound' }
 *       ]
 *   });
 *
 *   koolic.router.navigate('/users/42');
 *   koolic.router.replace('/login');
 *   koolic.router.back();
 *
 *   // The current route is a reactive Koolic object you can bind to:
 *   $$('#crumbs').bind($$(koolic.router.current).path);
 *   $$(koolic.router.current).path.onChange((_, p) => console.log('->', p));
 *
 * Click-to-navigate:
 *   <a href="#" data-route="/products">Products</a>
 *
 * Because the router operates without full reloads, any in-memory koolic
 * state (including `koolic.store('...', { storage: 'memory' })` singletons)
 * survives across views automatically.
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./koolic.js'));
        return;
    }
    factory({ koolic: root.koolic });
})(typeof self !== 'undefined' ? self : this, function (k) {
    'use strict';

    var koolic = k.koolic;

    // ---- configuration & state -----------------------------------------

    var mode = 'hash';
    var base = '';
    var pagesBase = '';
    var defaultContainer = null;
    var routes = [];
    var initialized = false;
    var currentEl = null;
    var notFoundHandler = null;
    var beforeHooks = [];
    var pageCache = new Map();
    var pageCacheEnabled = true;

    // The reactive "current route" state. Bound to UI via Koolic.
    var current = {
        path: '',
        params: {},
        route: null,
        view: null
    };
    koolic(current);   // instrument

    // ---- page fetching --------------------------------------------------
    //
    // For routes declared with `page: '...'` the router fetches an HTML
    // document, parses it, and injects either its <body> or a specific
    // sub-tree into a container. Any inline <script> tags in the injected
    // content are re-executed (because innerHTML-inserted scripts don't
    // run on their own) and any <link rel="stylesheet"> from the fetched
    // document's <head> is appended to the host page if not already
    // present. The host document's <title> follows the fetched page.

    function resolvePageUrl(page) {
        if (/^([a-z]+:)?\/\//i.test(page) || page.charAt(0) === '/') return page;
        return (pagesBase || '') + page;
    }

    function loadPageDoc(url) {
        if (pageCacheEnabled && pageCache.has(url)) {
            return Promise.resolve(pageCache.get(url));
        }
        if (typeof fetch !== 'function') {
            return Promise.reject(new Error('koolic.router: fetch is not available'));
        }
        return fetch(url, { credentials: 'same-origin' }).then(function (res) {
            if (!res.ok) throw new Error('koolic.router: HTTP ' + res.status + ' for ' + url);
            return res.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            if (pageCacheEnabled) pageCache.set(url, doc);
            return doc;
        });
    }

    function cssEscape(s) { return String(s).replace(/(["'\\\n\r])/g, '\\$1'); }

    function copyStylesheets(doc) {
        var links = doc.head ? doc.head.querySelectorAll('link[rel="stylesheet"]') : [];
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            if (!href) continue;
            if (!document.head.querySelector('link[rel="stylesheet"][href="' + cssEscape(href) + '"]')) {
                var l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = href;
                document.head.appendChild(l);
            }
        }
    }

    // Re-execute inline / src classic scripts found inside `root`. Module
    // scripts (`type="module"`) are skipped — they dedupe by URL and we
    // expect them to be loaded once by the host page.
    function execScripts(root) {
        var nodes = root.querySelectorAll('script');
        for (var i = 0; i < nodes.length; i++) {
            var s = nodes[i];
            if (s.type === 'module') continue;
            var clone = document.createElement('script');
            for (var a = 0; a < s.attributes.length; a++) {
                clone.setAttribute(s.attributes[a].name, s.attributes[a].value);
            }
            if (s.textContent) clone.textContent = s.textContent;
            s.parentNode.replaceChild(clone, s);
        }
    }

    function getContainer(route) {
        var selector = route.target || defaultContainer;
        if (!selector) {
            throw new Error('koolic.router: route.page requires either route.target or a config-level container');
        }
        var el = document.querySelector(selector);
        if (!el) throw new Error('koolic.router: container "' + selector + '" not found');
        return el;
    }

    function renderFetchedPage(route, doc) {
        var container = getContainer(route);
        var sourceEl;
        if (route.extract) {
            sourceEl = doc.querySelector(route.extract);
            if (!sourceEl) throw new Error('koolic.router: extract "' + route.extract + '" not found in fetched page');
        } else {
            sourceEl = doc.body;
        }

        if (doc.title) document.title = doc.title;
        copyStylesheets(doc);

        container.innerHTML = '';
        if (sourceEl === doc.body) {
            var kids = sourceEl.childNodes;
            for (var i = 0; i < kids.length; i++) {
                container.appendChild(kids[i].cloneNode(true));
            }
        } else {
            container.appendChild(sourceEl.cloneNode(true));
        }

        if (route.scripts !== false) execScripts(container);
        currentEl = container;
    }

    // ---- pattern compilation -------------------------------------------

    function compile(pattern) {
        if (pattern === '*') {
            return { regex: null, names: [], pattern: '*', isWildcard: true };
        }
        var names = [];
        // Escape regex metacharacters BUT leave the colon-params alone.
        var src = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        src = src.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, function (_, name) {
            names.push(name);
            return '([^/]+)';
        });
        return {
            regex: new RegExp('^' + src + '/?$'),
            names: names,
            pattern: pattern,
            isWildcard: false
        };
    }

    function matchRoute(path) {
        var wildcard = null;
        for (var i = 0; i < routes.length; i++) {
            var r = routes[i];
            if (r._compiled.isWildcard) { wildcard = r; continue; }
            var m = r._compiled.regex.exec(path);
            if (m) {
                var params = {};
                for (var j = 0; j < r._compiled.names.length; j++) {
                    try { params[r._compiled.names[j]] = decodeURIComponent(m[j + 1]); }
                    catch (e) { params[r._compiled.names[j]] = m[j + 1]; }
                }
                return { route: r, params: params };
            }
        }
        if (wildcard) return { route: wildcard, params: {} };
        return null;
    }

    function normalize(path) {
        if (!path) return '/';
        if (path.charAt(0) !== '/') path = '/' + path;
        return path;
    }

    // ---- URL <-> path translation --------------------------------------

    function readPath() {
        if (typeof window === 'undefined') return '/';
        if (mode === 'hash') {
            var h = window.location.hash || '';
            if (!h || h === '#') return '/';
            return normalize(h.charAt(0) === '#' ? h.slice(1) : h);
        }
        var p = window.location.pathname || '/';
        if (base && p.indexOf(base) === 0) p = p.slice(base.length);
        return normalize(p || '/');
    }

    function writePath(path, replace) {
        path = normalize(path);
        if (typeof window === 'undefined') return;

        if (mode === 'hash') {
            var target = '#' + path;
            if (replace) {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, '', target);
                } else {
                    window.location.replace(target);
                }
                sync();
            } else {
                if (window.location.hash === target) {
                    // Same hash — no hashchange will fire. Trigger sync manually.
                    sync();
                } else {
                    window.location.hash = path;
                    // hashchange handler will run sync()
                }
            }
        } else {
            var full = (base || '') + path;
            if (replace) window.history.replaceState({}, '', full);
            else        window.history.pushState({}, '', full);
            sync();
        }
    }

    // ---- core: sync the DOM and current state to the URL ---------------

    function runMaybeAsync(fn, arg) {
        if (typeof fn !== 'function') return Promise.resolve();
        try {
            var ret = fn(arg);
            return ret && typeof ret.then === 'function' ? ret : Promise.resolve(ret);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    var syncSeq = 0;

    function sync() {
        var path = readPath();
        var matched = matchRoute(path);

        if (!matched) {
            if (typeof notFoundHandler === 'function') notFoundHandler(path);
            return Promise.resolve();
        }

        var route = matched.route;
        var params = matched.params;

        // Run before-each hooks; any one returning false (or a string) cancels
        // or redirects.
        for (var i = 0; i < beforeHooks.length; i++) {
            var verdict = beforeHooks[i]({
                from: { path: current.path, params: current.params, route: current.route },
                to:   { path: path,         params: params,         route: route }
            });
            if (verdict === false) return Promise.resolve();
            if (typeof verdict === 'string') {
                return Promise.resolve().then(function () { replace(verdict); });
            }
        }

        // Detect re-entrance / racing transitions.
        var mySeq = ++syncSeq;

        var prevRoute = current.route;
        var prevParams = current.params;

        return runMaybeAsync(prevRoute && prevRoute.leave, prevParams)
            .then(function () {
                if (mySeq !== syncSeq) return;
                // For fetched-page routes, retrieve and inject the markup
                // BEFORE running the enter hook — so the hook can query
                // and bind against the freshly-injected DOM. For in-page
                // view routes, the DOM already exists and is just hidden,
                // so we keep the original ordering (enter first, then
                // reveal the view).
                if (route.page) {
                    var url = resolvePageUrl(route.page);
                    return loadPageDoc(url).then(function (doc) {
                        if (mySeq !== syncSeq) return;
                        renderFetchedPage(route, doc);
                    });
                }
            })
            .then(function () {
                if (mySeq !== syncSeq) return;
                return runMaybeAsync(route.enter, params);
            })
            .then(function () {
                if (mySeq !== syncSeq) return;

                if (!route.page) {
                    // Classic view swap.
                    if (currentEl && currentEl.style) currentEl.style.display = 'none';
                    var el = null;
                    if (route.view) el = document.querySelector(route.view);
                    if (el) {
                        el.style.display = '';
                        currentEl = el;
                    }
                }

                current.path = path;
                current.params = params;
                current.route = route;
                current.view = route.view || null;
            })
            .catch(function (err) {
                if (typeof console !== 'undefined') console.error('[koolic.router]', err);
            });
    }

    // ---- click delegation: <a data-route="/x"> ------------------------

    function onClick(e) {
        if (e.defaultPrevented) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var el = e.target;
        while (el && el !== document && el.nodeType === 1) {
            if (el.dataset && el.dataset.route !== undefined) {
                e.preventDefault();
                if (el.dataset.routeReplace !== undefined) replace(el.dataset.route);
                else                                       navigate(el.dataset.route);
                return;
            }
            el = el.parentNode;
        }
    }

    // ---- public functions ----------------------------------------------

    function navigate(path) { writePath(path, false); }
    function replace(path)  { writePath(path, true); }
    function back()         { if (typeof window !== 'undefined') window.history.back(); }
    function forward()      { if (typeof window !== 'undefined') window.history.forward(); }

    function init(config) {
        config = config || {};

        if (config.mode && config.mode !== 'hash' && config.mode !== 'history') {
            throw new Error("koolic.router: mode must be 'hash' or 'history'");
        }
        mode = config.mode || 'hash';
        base = config.base || '';
        pagesBase = config.pages || '';
        defaultContainer = config.container || null;
        if (config.pageCache === false) {
            pageCacheEnabled = false;
            pageCache.clear();
        } else {
            pageCacheEnabled = true;
        }
        notFoundHandler = config.notFound || null;
        beforeHooks = config.beforeEach
            ? (Array.isArray(config.beforeEach) ? config.beforeEach.slice() : [config.beforeEach])
            : [];

        routes = (config.routes || []).map(function (r) {
            return {
                path: r.path,
                view: r.view || null,
                page: r.page || null,
                target: r.target || null,
                extract: r.extract || null,
                scripts: r.scripts !== false,
                enter: r.enter || null,
                leave: r.leave || null,
                meta: r.meta || null,
                _compiled: compile(r.path)
            };
        });

        // Hide every declared view; sync() will reveal the matched one.
        if (typeof document !== 'undefined') {
            for (var i = 0; i < routes.length; i++) {
                var r = routes[i];
                if (!r.view) continue;
                var el = document.querySelector(r.view);
                if (el) el.style.display = 'none';
            }
        }

        if (!initialized && typeof window !== 'undefined') {
            if (mode === 'hash') window.addEventListener('hashchange', sync);
            else                 window.addEventListener('popstate', sync);

            if (typeof document !== 'undefined') {
                document.addEventListener('click', onClick, false);
            }
            initialized = true;
        }

        return sync();
    }

    // The router is callable: koolic.router(config) initializes.
    var router = init;

    router.navigate = navigate;
    router.replace = replace;
    router.back = back;
    router.forward = forward;
    router.current = current;            // reactive
    router.match = matchRoute;

    // Imperative tweaks
    router.addRoute = function (route) {
        var compiled = { path: route.path, view: route.view || null,
                         enter: route.enter || null, leave: route.leave || null,
                         meta: route.meta || null, _compiled: compile(route.path) };
        routes.push(compiled);
        // Hide its view (consistent with init).
        if (route.view && typeof document !== 'undefined') {
            var el = document.querySelector(route.view);
            if (el && current.view !== route.view) el.style.display = 'none';
        }
        return router;
    };

    router.beforeEach = function (fn) {
        if (typeof fn === 'function') beforeHooks.push(fn);
        return router;
    };

    router.clearPageCache = function (url) {
        if (url) pageCache.delete(url);
        else pageCache.clear();
    };

    // For tests: reset everything (does NOT remove window listeners; those are
    // process-wide. Listeners simply find the new `routes` array.)
    router._reset = function () {
        routes = [];
        beforeHooks = [];
        notFoundHandler = null;
        defaultContainer = null;
        pagesBase = '';
        pageCache.clear();
        if (currentEl && currentEl.style) { currentEl.style.display = ''; }
        currentEl = null;
        current.path = '';
        current.params = {};
        current.route = null;
        current.view = null;
        syncSeq = 0;
    };

    koolic.router = router;

    if (typeof window !== 'undefined' && window.koolic) {
        window.koolic.router = router;
    }

    return { router: router };
});
