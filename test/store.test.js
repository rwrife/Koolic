const { koolic } = require('../js/koolic.js');
const { store } = require('../js/koolic.store.js');

// Each test gets a clean slate.
beforeEach(() => {
    // Clean up any keys created by prior tests.
    for (const k of store.keys()) store.clear(k);
    localStorage.clear();
    sessionStorage.clear();
});

const flushAsync = () => new Promise(r => setTimeout(r, 0));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

describe('koolic.store — basics', () => {
    test('returns reactive plain object pre-filled with defaults', () => {
        const s = store('cart', { items: 0, total: 9.99 });
        expect(s.items).toBe(0);
        expect(s.total).toBe(9.99);

        // It's a Koolic-wrapped object: $$() returns a binding facade.
        const changes = [];
        koolic(s).total.onChange((o, n) => changes.push([o, n]));
        s.total = 19.99;
        expect(changes).toEqual([[9.99, 19.99]]);
    });

    test('requires a non-empty string key', () => {
        expect(() => store('')).toThrow();
        expect(() => store(null)).toThrow();
        expect(() => store(123)).toThrow();
    });

    test('rejects unknown storage backend', () => {
        expect(() => store('x', {}, { storage: 'cloud' })).toThrow();
    });

    test('repeated calls with same key return the same instance', () => {
        const a = store('cart', { x: 1 });
        const b = store('cart', { x: 999 });   // defaults ignored, live wins
        expect(a).toBe(b);
        expect(a.x).toBe(1);
    });
});

describe('koolic.store — memory backend', () => {
    test('survives store.clear(key, {live:false}) by keeping live state', () => {
        const s = store('m', { v: 1 }, { storage: 'memory' });
        s.v = 5;
        store.clear('m', { live: true });
        expect(s.v).toBe(5);                  // live object untouched
    });

    test('full clear wipes the live entry', () => {
        store('m', { v: 1 }, { storage: 'memory' });
        store.clear('m');
        expect(store.has('m')).toBe(false);
    });
});

describe('koolic.store — sessionStorage backend', () => {
    test('persists immediately when debounce=0', () => {
        const s = store('sess', { v: 1 }, { storage: 'session', debounce: 0 });
        s.v = 42;
        const raw = JSON.parse(sessionStorage.getItem('koolic:sess'));
        expect(raw.v).toBe(42);
    });

    test('seeds storage on first creation', () => {
        store('seed', { hello: 'world' }, { storage: 'session', debounce: 0 });
        expect(JSON.parse(sessionStorage.getItem('koolic:seed'))).toEqual({ hello: 'world' });
    });

    test('rehydrates from storage on subsequent creation', () => {
        sessionStorage.setItem('koolic:rehy', JSON.stringify({ x: 'restored', y: 7 }));
        const s = store('rehy', { x: 'default', y: 0 }, { storage: 'session' });
        expect(s.x).toBe('restored');
        expect(s.y).toBe(7);
    });

    test('debounce coalesces multiple writes', async () => {
        const s = store('deb', { v: 0 }, { storage: 'session', debounce: 50 });
        s.v = 1; s.v = 2; s.v = 3;
        expect(sessionStorage.getItem('koolic:deb')).toBe(JSON.stringify({ v: 0 }));   // seed only
        await wait(80);
        expect(JSON.parse(sessionStorage.getItem('koolic:deb')).v).toBe(3);
    });

    test('flush forces a pending write to happen synchronously', async () => {
        const s = store('flush', { v: 0 }, { storage: 'session', debounce: 1000 });
        s.v = 99;
        store.flush('flush');
        expect(JSON.parse(sessionStorage.getItem('koolic:flush')).v).toBe(99);
    });
});

describe('koolic.store — localStorage backend', () => {
    test('writes go to localStorage', () => {
        const s = store('local', { theme: 'dark' }, { storage: 'local', debounce: 0 });
        s.theme = 'light';
        expect(JSON.parse(localStorage.getItem('koolic:local')).theme).toBe('light');
    });

    test('cross-tab sync: incoming storage event updates the live model', () => {
        const s = store('xtab', { count: 0 }, { storage: 'local', debounce: 0 });
        const changes = [];
        koolic(s).count.onChange((o, n) => changes.push(n));

        // Simulate another tab writing.
        const next = JSON.stringify({ count: 7 });
        localStorage.setItem('koolic:xtab', next);
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'koolic:xtab',
            newValue: next,
            oldValue: JSON.stringify({ count: 0 }),
            storageArea: localStorage
        }));

        expect(s.count).toBe(7);
        expect(changes).toEqual([7]);
    });

    test('cross-tab incoming write does NOT echo back to storage', () => {
        const s = store('echo', { n: 1 }, { storage: 'local', debounce: 0 });
        const next = JSON.stringify({ n: 5 });
        localStorage.setItem('koolic:echo', next);
        const before = localStorage.getItem('koolic:echo');
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'koolic:echo', newValue: next, oldValue: null, storageArea: localStorage
        }));
        // Storage has the externally-set value, not a re-serialized round trip.
        expect(localStorage.getItem('koolic:echo')).toBe(before);
        expect(s.n).toBe(5);
    });
});

describe('koolic.store — versioning', () => {
    test('matching version is restored', () => {
        localStorage.setItem('koolic:v',
            JSON.stringify({ __kv: 2, data: { x: 'kept' } }));
        const s = store('v', { x: 'default' }, { storage: 'local', version: 2 });
        expect(s.x).toBe('kept');
    });

    test('mismatched version falls back to defaults', () => {
        localStorage.setItem('koolic:v',
            JSON.stringify({ __kv: 1, data: { x: 'stale' } }));
        const s = store('v', { x: 'default' }, { storage: 'local', version: 2 });
        expect(s.x).toBe('default');
    });

    test('untagged stored data is rejected when version is requested', () => {
        localStorage.setItem('koolic:v', JSON.stringify({ x: 'raw' }));
        const s = store('v', { x: 'default' }, { storage: 'local', version: 1 });
        expect(s.x).toBe('default');
    });
});

describe('koolic.store — snapshot / reset / clear', () => {
    test('snapshot is a detached copy', () => {
        const s = store('snap', { a: 1, b: { c: 2 } });
        const copy = store.snapshot('snap');
        expect(copy).toEqual({ a: 1, b: { c: 2 } });
        copy.a = 99;
        expect(s.a).toBe(1);   // mutation of snapshot doesn't leak back
    });

    test('reset restores defaults', () => {
        const s = store('rst', { v: 0 });
        s.v = 9;
        store.reset('rst');
        expect(s.v).toBe(0);
    });

    test('clear() removes from storage and the live registry', () => {
        store('c', { v: 1 }, { storage: 'local', debounce: 0 });
        expect(localStorage.getItem('koolic:c')).not.toBeNull();
        store.clear('c');
        expect(localStorage.getItem('koolic:c')).toBeNull();
        expect(store.has('c')).toBe(false);
    });
});

describe('koolic.store — nested objects', () => {
    test('mutations on nested properties persist', async () => {
        const s = store('nest', { user: { name: 'Ada' } }, { storage: 'local', debounce: 0 });
        s.user.name = 'Grace';
        expect(JSON.parse(localStorage.getItem('koolic:nest')).user.name).toBe('Grace');
    });

    test('listeners fire on nested mutations', () => {
        const s = store('nest', { user: { name: 'Ada' } });
        const changes = [];
        koolic(s).user.name.onChange((_, n) => changes.push(n));
        s.user.name = 'Grace';
        expect(changes).toEqual(['Grace']);
    });
});

describe('koolic.store — onChange callback', () => {
    test('options.onChange fires once per debounce window with batched changes', async () => {
        const seen = [];
        const s = store('oc', { a: 0, b: 0 }, {
            storage: 'memory',
            debounce: 30,
            onChange: (state, info) => seen.push({ state: { ...state }, info })
        });
        s.a = 1; s.b = 2; s.a = 5;
        expect(seen.length).toBe(0);            // debounced
        await wait(60);
        expect(seen.length).toBe(1);
        expect(seen[0].state).toEqual({ a: 5, b: 2 });
        expect(seen[0].info.changes.map(c => c.path)).toEqual(['a', 'b', 'a']);
        expect(seen[0].info.changes[2]).toEqual({ path: 'a', oldValue: 1, newValue: 5 });
    });

    test('debounce=0 fires onChange synchronously per mutation', () => {
        const seen = [];
        const s = store('ocSync', { v: 0 }, {
            storage: 'memory',
            debounce: 0,
            onChange: (_, info) => seen.push(info.changes.length)
        });
        s.v = 1;
        s.v = 2;
        expect(seen).toEqual([1, 1]);
    });

    test('imperative subscribe + unsubscribe', async () => {
        const s = store('oc2', { v: 0 }, { storage: 'memory', debounce: 0 });
        const seen = [];
        const off = store.subscribe('oc2', (state, info) => seen.push([state.v, info.changes.length]));
        s.v = 1;
        s.v = 2;
        off();
        s.v = 3;
        expect(seen).toEqual([[1, 1], [2, 1]]);
    });

    test('onChange does NOT fire for cross-tab incoming syncs', () => {
        const seen = [];
        const s = store('xtabOC', { v: 0 }, {
            storage: 'local',
            debounce: 0,
            onChange: (state) => seen.push(state.v)
        });
        // Confirm baseline: local writes do fire.
        s.v = 1;
        expect(seen).toEqual([1]);

        // Simulate cross-tab incoming.
        const next = JSON.stringify({ v: 99 });
        localStorage.setItem('koolic:xtabOC', next);
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'koolic:xtabOC', newValue: next, oldValue: null, storageArea: localStorage
        }));
        expect(s.v).toBe(99);                  // live state updated
        expect(seen).toEqual([1]);             // but onChange NOT invoked
    });

    test('async onChange (REST-style) errors are caught, not thrown', async () => {
        const errs = [];
        const origConsole = console.error;
        console.error = (...args) => errs.push(args);
        try {
            const s = store('ocAsync', { v: 0 }, {
                storage: 'memory',
                debounce: 0,
                onChange: async () => { throw new Error('boom'); }
            });
            expect(() => { s.v = 1; }).not.toThrow();
            // Let the rejected promise's catch handler run.
            await wait(0);
            expect(errs.length).toBeGreaterThan(0);
            expect(String(errs[0])).toContain('boom');
        } finally {
            console.error = origConsole;
        }
    });

    test('onChange receives info.changes paths for nested writes', () => {
        const seen = [];
        const s = store('nestOC', { user: { name: 'Ada', age: 21 } }, {
            storage: 'memory',
            debounce: 0,
            onChange: (_, info) => seen.push(info.changes.map(c => c.path))
        });
        s.user.name = 'Grace';
        s.user.age = 30;
        // KoolObject bubbles nested paths with dotted notation.
        expect(seen).toEqual([['user.name'], ['user.age']]);
    });

    test('subscribe throws if store does not exist', () => {
        expect(() => store.subscribe('does-not-exist', () => {})).toThrow();
    });
});
