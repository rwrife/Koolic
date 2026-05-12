/*!
 * Koolic 2.0 — state store add-on
 *
 * Requires koolic.js to be loaded first.
 *
 *   const cart = koolic.store('cart', { items: [], total: 0 });
 *   cart.total = 50;        // mutate normally; auto-persisted
 *
 * Returns the **reactive plain object**, identical in shape to the defaults
 * (or to whatever was previously stored). It is already $$-wrapped, so:
 *
 *   $$(cart).total.onChange(...);
 *   $$('#totalDisplay').bind($$(cart).total);
 *
 * works exactly like any Koolic object.
 *
 *   options.storage:  'memory' (default) | 'session' | 'local'
 *   options.debounce: ms between mutation and persist (default 100)
 *   options.version:  any value; if stored data tags a different version,
 *                     it is discarded and defaults are used
 *   options.onChange: function(state, info) called on the debounced persist
 *                     tick for *local* mutations. `info.changes` is the
 *                     array of {path, oldValue, newValue} accumulated
 *                     since the previous notify. Use this to POST the
 *                     state to a backend, write an audit log, etc.
 *                     Async (Promise-returning) callbacks are fine — they
 *                     run fire-and-forget; rejections are logged.
 *
 * Storage backends:
 *   memory   — process-wide singleton; survives in-page navigation between
 *              <script> blocks and modules, but lost on full reload.
 *   session  — sessionStorage; survives reload + same-tab navigation, lost
 *              when the tab is closed.
 *   local    — localStorage; survives forever, syncs across tabs of the
 *              same origin via the browser `storage` event.
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
    var PREFIX = 'koolic:';
    var memoryStore = new Map();
    var liveStores = new Map();   // key -> entry { raw, defaults, opts, suppress, pending, persist, schedule }

    // ---- backend abstraction --------------------------------------------

    function getWebStorage(kind) {
        try {
            if (kind === 'local' && typeof localStorage !== 'undefined') return localStorage;
            if (kind === 'session' && typeof sessionStorage !== 'undefined') return sessionStorage;
        } catch (e) { /* SecurityError in sandboxed iframes */ }
        return null;
    }

    function readStored(kind, key) {
        if (kind === 'memory') {
            var v = memoryStore.get(key);
            return v === undefined ? undefined : deepClone(v);
        }
        var s = getWebStorage(kind);
        if (!s) return undefined;
        var raw = s.getItem(PREFIX + key);
        if (raw == null) return undefined;
        try { return JSON.parse(raw); } catch (e) { return undefined; }
    }

    function writeStored(kind, key, value) {
        if (kind === 'memory') { memoryStore.set(key, deepClone(value)); return; }
        var s = getWebStorage(kind);
        if (!s) return;
        try { s.setItem(PREFIX + key, JSON.stringify(value)); }
        catch (e) { /* quota exceeded — silently drop */ }
    }

    function removeStored(key) {
        memoryStore.delete(key);
        var ls = getWebStorage('local');   if (ls) try { ls.removeItem(PREFIX + key); } catch (e) {}
        var ss = getWebStorage('session'); if (ss) try { ss.removeItem(PREFIX + key); } catch (e) {}
    }

    // ---- helpers --------------------------------------------------------

    function deepClone(v) {
        if (v == null || typeof v !== 'object') return v;
        return JSON.parse(JSON.stringify(v));
    }

    // applyDeep: copies values from source into target by going through
    // target's Koolic-instrumented setters (so change events fire).
    // For nested objects already present in target, recurses; for everything
    // else (including arrays and replaced sub-objects), uses a top-level
    // assignment. Properties present in target but not in source are left
    // alone (use reset() for a full replacement).
    function applyDeep(target, source) {
        if (!source || typeof source !== 'object') return;
        var keys = Object.keys(source);
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var sv = source[k];
            var tv = target[k];
            if (sv && typeof sv === 'object' && !Array.isArray(sv)
                && tv && typeof tv === 'object' && !Array.isArray(tv)) {
                applyDeep(tv, sv);
            } else {
                if (!Object.is(tv, sv)) target[k] = sv;
            }
        }
    }

    // ---- the main entry point ------------------------------------------

    function store(key, defaults, options) {
        if (typeof key !== 'string' || !key.length) {
            throw new Error('koolic.store: key must be a non-empty string');
        }

        // Already-live store -> return the same instance (shared singleton).
        var existing = liveStores.get(key);
        if (existing) return existing.raw;

        var opts = {
            storage: 'memory',
            debounce: 100,
            version: undefined,
            onChange: null
        };
        if (options) {
            if (options.storage !== undefined)  opts.storage  = options.storage;
            if (options.debounce !== undefined) opts.debounce = options.debounce;
            if (options.version !== undefined)  opts.version  = options.version;
            if (options.onChange !== undefined) opts.onChange = options.onChange;
        }
        if (opts.storage !== 'memory' && opts.storage !== 'session' && opts.storage !== 'local') {
            throw new Error("koolic.store: storage must be 'memory', 'session', or 'local'");
        }

        var stored = readStored(opts.storage, key);

        // Versioning: a tagged envelope only matches when its version equals
        // the requested version. Untagged stored data is accepted iff no
        // version was requested.
        var initial;
        if (opts.version !== undefined) {
            if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored.__kv === opts.version) {
                initial = stored.data;
            } else {
                initial = deepClone(defaults || {});
            }
        } else if (stored !== undefined) {
            initial = stored;
        } else {
            initial = deepClone(defaults || {});
        }

        // Instrument with Koolic in place.
        koolic(initial);

        var entry = {
            raw: initial,
            defaults: deepClone(defaults || {}),
            opts: opts,
            suppress: false,
            pending: null,
            pendingChanges: [],
            listeners: []
        };

        entry.notify = function () {
            if (!entry.pendingChanges.length) return;
            var info = { changes: entry.pendingChanges };
            entry.pendingChanges = [];

            // Invoke options.onChange and any imperative subscribers.
            // Errors are logged but never thrown to the caller.
            var fns = entry.listeners.slice();
            if (opts.onChange) fns.unshift(opts.onChange);
            for (var i = 0; i < fns.length; i++) {
                try {
                    var ret = fns[i](entry.raw, info);
                    if (ret && typeof ret.then === 'function') {
                        ret.catch(function (err) {
                            if (typeof console !== 'undefined') {
                                console.error('[koolic.store onChange]', err);
                            }
                        });
                    }
                } catch (err) {
                    if (typeof console !== 'undefined') {
                        console.error('[koolic.store onChange]', err);
                    }
                }
            }
        };

        entry.persist = function () {
            var value = opts.version !== undefined
                ? { __kv: opts.version, data: initial }
                : initial;
            writeStored(opts.storage, key, value);
            entry.pending = null;
            entry.notify();
        };

        entry.schedule = function (pathOrEvent, oldValue, newValue) {
            if (entry.suppress) return;
            // The KoolObject .on handler signature is (path, oldValue, newValue).
            if (arguments.length >= 3) {
                entry.pendingChanges.push({
                    path: pathOrEvent,
                    oldValue: oldValue,
                    newValue: newValue
                });
            }
            if (opts.debounce <= 0) { entry.persist(); return; }
            if (entry.pending) clearTimeout(entry.pending);
            entry.pending = setTimeout(entry.persist, opts.debounce);
        };

        initial.__koolic__.on(entry.schedule);

        // Cross-tab sync for localStorage. The browser fires `storage` only
        // in *other* tabs of the same origin when a key changes, so we won't
        // hear our own writes. We still suppress persistence during the
        // sync apply to keep the storage write idempotent across n tabs.
        if (opts.storage === 'local' && typeof window !== 'undefined'
            && typeof window.addEventListener === 'function') {
            window.addEventListener('storage', function (e) {
                if (e.key !== PREFIX + key) return;
                if (e.newValue == null) {
                    // Another tab cleared the store. Reset to defaults locally.
                    entry.suppress = true;
                    try { applyDeep(entry.raw, entry.defaults); }
                    finally { entry.suppress = false; }
                    return;
                }
                var incoming;
                try { incoming = JSON.parse(e.newValue); } catch (err) { return; }
                var data = incoming;
                if (opts.version !== undefined) {
                    if (!incoming || incoming.__kv !== opts.version) return;
                    data = incoming.data;
                }
                entry.suppress = true;
                try { applyDeep(entry.raw, data); }
                finally { entry.suppress = false; }
            });
        }

        liveStores.set(key, entry);

        // Eagerly persist if nothing was stored before, so that subsequent
        // tabs / scripts find the seeded value. (Skipped for memory storage
        // since defaults already live in the live map.)
        if (stored === undefined && opts.storage !== 'memory') {
            entry.persist();
        }

        return initial;
    }

    // ---- introspection / control ---------------------------------------

    store.has = function (key) { return liveStores.has(key); };

    store.raw = function (key) {
        var e = liveStores.get(key);
        return e ? e.raw : undefined;
    };

    store.snapshot = function (key) {
        var e = liveStores.get(key);
        return e ? deepClone(e.raw) : undefined;
    };

    store.reset = function (key) {
        var e = liveStores.get(key);
        if (!e) return false;
        e.suppress = true;
        try { applyDeep(e.raw, e.defaults); }
        finally { e.suppress = false; }
        e.persist();
        return true;
    };

    // Flush a debounced pending write right now.
    store.flush = function (key) {
        var e = liveStores.get(key);
        if (e && e.pending) { clearTimeout(e.pending); e.persist(); }
    };

    // Imperative listener registration. Returns an unsubscribe function.
    store.subscribe = function (key, fn) {
        if (typeof fn !== 'function') {
            throw new Error('koolic.store.subscribe: handler must be a function');
        }
        var e = liveStores.get(key);
        if (!e) throw new Error('koolic.store.subscribe: no store registered for "' + key + '"');
        e.listeners.push(fn);
        return function unsubscribe() {
            var idx = e.listeners.indexOf(fn);
            if (idx >= 0) e.listeners.splice(idx, 1);
        };
    };

    // clear(key)               -> remove the live store + wipe all backends
    // clear(key, { live: false }) -> wipe storage only, keep live state
    store.clear = function (key, options) {
        var keepLive = options && options.live === true;
        var e = liveStores.get(key);
        if (e && e.pending) { clearTimeout(e.pending); e.pending = null; }
        if (!keepLive) liveStores.delete(key);
        removeStored(key);
    };

    // List active store keys (useful for debugging/inspection).
    store.keys = function () { return Array.from(liveStores.keys()); };

    // ---- exports --------------------------------------------------------

    koolic.store = store;

    if (typeof window !== 'undefined' && window.koolic) {
        window.koolic.store = store;
    }

    return { store: store };
});
