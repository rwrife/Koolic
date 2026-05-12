/**
 * @jest-environment jsdom
 */
const { koolic } = require('../js/koolic.js');
const { router } = require('../js/koolic.router.js');

const flush = () => new Promise(r => setTimeout(r, 0));

function resetDOM(html) {
    document.body.innerHTML = html;
    router._reset();
    // Use replaceState (NOT hash=) so we don't fire a stray hashchange
    // event that would re-trigger sync after the next test starts.
    window.history.replaceState({}, '', window.location.pathname);
}

describe('koolic.router — pattern matching', () => {
    beforeEach(() => resetDOM(''));

    test('matches a static path', async () => {
        await router({
            routes: [
                { path: '/',      view: null },
                { path: '/about', view: null }
            ]
        });
        const m = router.match('/about');
        expect(m).not.toBeNull();
        expect(m.route.path).toBe('/about');
    });

    test('matches :param and decodes', async () => {
        await router({ routes: [{ path: '/users/:id', view: null }] });
        const m = router.match('/users/42');
        expect(m.params).toEqual({ id: '42' });
        const m2 = router.match('/users/' + encodeURIComponent('a b'));
        expect(m2.params.id).toBe('a b');
    });

    test('matches multiple :params', async () => {
        await router({ routes: [{ path: '/posts/:year/:slug', view: null }] });
        const m = router.match('/posts/2024/hello');
        expect(m.params).toEqual({ year: '2024', slug: 'hello' });
    });

    test('falls back to wildcard route', async () => {
        await router({
            routes: [
                { path: '/',  view: null },
                { path: '*',  view: null, meta: { name: 'nf' } }
            ]
        });
        const m = router.match('/nope');
        expect(m.route.meta.name).toBe('nf');
    });

    test('returns null when nothing matches and no wildcard', async () => {
        await router({ routes: [{ path: '/', view: null }] });
        expect(router.match('/missing')).toBeNull();
    });
});

describe('koolic.router — view show/hide', () => {
    test('shows the matched view, hides the rest', async () => {
        resetDOM(`
            <section id="home">home</section>
            <section id="about">about</section>
            <section id="contact">contact</section>
        `);

        await router({
            routes: [
                { path: '/',        view: '#home' },
                { path: '/about',   view: '#about' },
                { path: '/contact', view: '#contact' }
            ]
        });

        // Default hash is '' -> '/' -> #home visible
        expect(document.getElementById('home').style.display).not.toBe('none');
        expect(document.getElementById('about').style.display).toBe('none');
        expect(document.getElementById('contact').style.display).toBe('none');

        router.navigate('/about');
        await flush();
        expect(document.getElementById('home').style.display).toBe('none');
        expect(document.getElementById('about').style.display).not.toBe('none');
    });
});

describe('koolic.router — navigate / replace', () => {
    beforeEach(() => resetDOM('<section id="a"></section><section id="b"></section>'));

    test('navigate pushes a new hash', async () => {
        await router({
            routes: [
                { path: '/',   view: '#a' },
                { path: '/b',  view: '#b' }
            ]
        });
        router.navigate('/b');
        await flush();
        expect(window.location.hash).toBe('#/b');
        expect(router.current.path).toBe('/b');
    });

    test('replace updates the hash without pushing', async () => {
        await router({
            routes: [
                { path: '/',   view: '#a' },
                { path: '/b',  view: '#b' }
            ]
        });
        router.replace('/b');
        await flush();
        expect(router.current.path).toBe('/b');
    });

    test('navigating to the current path still re-runs sync', async () => {
        let enters = 0;
        await router({
            routes: [{ path: '/x', view: '#a', enter: () => { enters++; } }]
        });
        router.navigate('/x');
        await flush();
        const before = enters;
        router.navigate('/x');
        await flush();
        expect(enters).toBe(before + 1);
    });
});

describe('koolic.router — enter / leave hooks', () => {
    beforeEach(() => resetDOM('<section id="a"></section><section id="b"></section>'));

    test('enter receives params; leave receives previous params', async () => {
        const seen = [];
        await router({
            routes: [
                { path: '/users/:id',
                  view: '#a',
                  enter: (p) => seen.push(['enter-a', p.id]),
                  leave: (p) => seen.push(['leave-a', p.id]) },
                { path: '/about',
                  view: '#b',
                  enter: () => seen.push(['enter-b']) }
            ]
        });
        router.navigate('/users/42');
        await flush(); await flush();
        router.navigate('/about');
        await flush(); await flush();

        expect(seen).toEqual([
            ['enter-a', '42'],
            ['leave-a', '42'],
            ['enter-b']
        ]);
    });

    test('async hooks are awaited before the view changes', async () => {
        let resolveEnter;
        await router({
            routes: [
                { path: '/',  view: '#a' },
                { path: '/b', view: '#b', enter: () => new Promise(r => resolveEnter = r) }
            ]
        });
        router.navigate('/b');
        await flush();
        // Still old view because enter hasn't resolved.
        expect(document.getElementById('b').style.display).toBe('none');
        resolveEnter();
        await flush(); await flush();
        expect(document.getElementById('b').style.display).not.toBe('none');
    });
});

describe('koolic.router — beforeEach guard', () => {
    beforeEach(() => resetDOM('<section id="a"></section><section id="b"></section>'));

    test('returning false cancels navigation', async () => {
        await router({
            routes: [
                { path: '/',  view: '#a' },
                { path: '/b', view: '#b' }
            ],
            beforeEach: () => false
        });
        router.navigate('/b');
        await flush();
        expect(router.current.path).not.toBe('/b');
    });

    test('returning a string redirects', async () => {
        await router({
            routes: [
                { path: '/',      view: '#a' },
                { path: '/admin', view: '#b' },
                { path: '/login', view: '#a' }
            ],
            beforeEach: ({ to }) => to.path === '/admin' ? '/login' : true
        });
        router.navigate('/admin');
        await flush(); await flush();
        expect(router.current.path).toBe('/login');
    });
});

describe('koolic.router — reactive current', () => {
    beforeEach(() => resetDOM('<section id="a"></section><section id="b"></section>'));

    test('binding to current.path updates on navigation', async () => {
        await router({
            routes: [
                { path: '/',  view: '#a' },
                { path: '/b', view: '#b' }
            ]
        });
        const seen = [];
        koolic(router.current).path.onChange((_, n) => seen.push(n));
        router.navigate('/b');
        await flush();
        expect(seen).toEqual(['/b']);
    });
});

describe('koolic.router — data-route click delegation', () => {
    beforeEach(() => resetDOM(`
        <a id="link" data-route="/x">x</a>
        <a id="rlink" data-route="/y" data-route-replace>y</a>
        <a id="plain" href="/z">plain</a>
        <section id="px"></section>
        <section id="py"></section>
    `));

    test('clicking a [data-route] link navigates without reload', async () => {
        await router({
            routes: [
                { path: '/x', view: '#px' },
                { path: '/y', view: '#py' }
            ]
        });
        document.getElementById('link').click();
        await flush();
        expect(router.current.path).toBe('/x');
    });

    test('data-route-replace triggers replace()', async () => {
        await router({
            routes: [
                { path: '/x', view: '#px' },
                { path: '/y', view: '#py' }
            ]
        });
        document.getElementById('rlink').click();
        await flush();
        expect(router.current.path).toBe('/y');
    });

    test('plain anchors without data-route are not intercepted', async () => {
        await router({ routes: [{ path: '/x', view: '#px' }] });
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        const result = document.getElementById('plain').dispatchEvent(evt);
        // dispatchEvent returns true if not preventDefaulted.
        expect(result).toBe(true);
    });
});

describe('koolic.router — history mode', () => {
    beforeEach(() => {
        resetDOM('<section id="a"></section><section id="b"></section>');
        window.history.replaceState({}, '', '/');
    });

    test('navigate uses pushState in history mode', async () => {
        await router({
            mode: 'history',
            routes: [
                { path: '/',  view: '#a' },
                { path: '/b', view: '#b' }
            ]
        });
        router.navigate('/b');
        await flush();
        expect(window.location.pathname).toBe('/b');
        expect(router.current.path).toBe('/b');
    });
});
