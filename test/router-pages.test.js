/**
 * @jest-environment jsdom
 */
const { koolic } = require('../js/koolic.js');
const { router } = require('../js/koolic.router.js');

const flush = () => new Promise(r => setTimeout(r, 0));

// ----------------- fetch mock -----------------------------------------------

const pages = {};   // url -> html string
const fetchCalls = [];

beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    router._reset();
    window.history.replaceState({}, '', window.location.pathname);
    fetchCalls.length = 0;
    Object.keys(pages).forEach(k => delete pages[k]);

    global.fetch = jest.fn((url) => {
        fetchCalls.push(url);
        if (pages[url] === undefined) {
            return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
        }
        return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(pages[url])
        });
    });
});

afterEach(() => {
    delete global.fetch;
});

describe('koolic.router — page fetching', () => {
    test('fetches a page and injects its body into the container', async () => {
        pages['/pages/about.html'] = `
            <!doctype html>
            <html>
            <head><title>About us</title></head>
            <body><h1 id="aboutTitle">About</h1><p>hi</p></body>
            </html>`;

        await router({
            container: '#app',
            pages: '/pages/',
            routes: [{ path: '/about', page: 'about.html' }]
        });

        router.navigate('/about');
        await flush(); await flush(); await flush();

        expect(fetchCalls).toContain('/pages/about.html');
        expect(document.getElementById('aboutTitle').textContent).toBe('About');
        expect(document.title).toBe('About us');
    });

    test('honors per-route target override', async () => {
        document.body.innerHTML = '<div id="primary"></div><div id="secondary"></div>';
        pages['/p/b.html'] = '<html><body><span id="x">in B</span></body></html>';

        await router({
            container: '#primary',
            pages: '/p/',
            routes: [{ path: '/b', page: 'b.html', target: '#secondary' }]
        });
        router.navigate('/b');
        await flush(); await flush();

        expect(document.getElementById('primary').innerHTML).toBe('');
        expect(document.getElementById('secondary').querySelector('#x').textContent).toBe('in B');
    });

    test('extract grabs only a specific sub-tree', async () => {
        pages['/x.html'] = `<html><body>
            <header>chrome</header>
            <main id="content"><p>wanted</p></main>
            <footer>also chrome</footer>
        </body></html>`;

        await router({
            container: '#app',
            routes: [{ path: '/x', page: '/x.html', extract: '#content' }]
        });
        router.navigate('/x');
        await flush(); await flush();

        const app = document.getElementById('app');
        expect(app.querySelector('p').textContent).toBe('wanted');
        expect(app.querySelector('header')).toBeNull();
        expect(app.querySelector('footer')).toBeNull();
    });

    test('inline scripts in fetched pages are executed', async () => {
        pages['/run.html'] = `<html><body>
            <div id="target"></div>
            <script>window.__ran = (window.__ran || 0) + 1; document.getElementById('target').textContent = 'ran';</script>
        </body></html>`;

        delete window.__ran;
        await router({
            container: '#app',
            routes: [{ path: '/r', page: '/run.html' }]
        });
        router.navigate('/r');
        await flush(); await flush();

        expect(document.getElementById('target').textContent).toBe('ran');
        expect(window.__ran).toBe(1);
    });

    test('scripts: false suppresses script execution', async () => {
        pages['/q.html'] = `<html><body>
            <script>window.__shouldNot = (window.__shouldNot || 0) + 1;</script>
        </body></html>`;
        delete window.__shouldNot;
        await router({
            container: '#app',
            routes: [{ path: '/q', page: '/q.html', scripts: false }]
        });
        router.navigate('/q');
        await flush(); await flush();
        expect(window.__shouldNot).toBeUndefined();
    });

    test('stylesheets from fetched page are added to host head', async () => {
        pages['/styled.html'] = `<html>
            <head><link rel="stylesheet" href="/css/page.css"></head>
            <body><div>styled</div></body>
        </html>`;

        await router({
            container: '#app',
            routes: [{ path: '/s', page: '/styled.html' }]
        });
        router.navigate('/s');
        await flush(); await flush();

        const links = document.head.querySelectorAll('link[rel="stylesheet"][href="/css/page.css"]');
        expect(links.length).toBe(1);
    });

    test('page cache prevents a second fetch for the same URL', async () => {
        pages['/once.html'] = '<html><body><span id="ok">x</span></body></html>';

        await router({
            container: '#app',
            routes: [
                { path: '/a', page: '/once.html' },
                { path: '/b', view: null }
            ]
        });

        document.body.innerHTML += '<section id="back"></section>';

        router.navigate('/a');
        await flush(); await flush();
        router.navigate('/a');
        await flush(); await flush();
        router.navigate('/a');
        await flush(); await flush();

        const hits = fetchCalls.filter(u => u === '/once.html').length;
        expect(hits).toBe(1);
    });

    test('pageCache: false disables caching', async () => {
        pages['/nocache.html'] = '<html><body><div>fresh</div></body></html>';

        await router({
            container: '#app',
            pageCache: false,
            routes: [
                { path: '/a', page: '/nocache.html' },
                { path: '/b', view: null }
            ]
        });

        router.navigate('/a'); await flush(); await flush();
        router.navigate('/a'); await flush(); await flush();
        router.navigate('/a'); await flush(); await flush();

        const hits = fetchCalls.filter(u => u === '/nocache.html').length;
        expect(hits).toBe(3);
    });

    test('clearPageCache forces a refetch on next visit', async () => {
        pages['/c.html'] = '<html><body><div>c</div></body></html>';

        await router({
            container: '#app',
            routes: [{ path: '/c', page: '/c.html' }]
        });

        router.navigate('/c'); await flush(); await flush();
        router.clearPageCache();
        router.navigate('/c'); await flush(); await flush();

        const hits = fetchCalls.filter(u => u === '/c.html').length;
        expect(hits).toBe(2);
    });

    test('enter hook runs AFTER the page is injected', async () => {
        pages['/with-target.html'] = '<html><body><span id="filled"></span></body></html>';

        let seenInEnter = '';
        await router({
            container: '#app',
            routes: [{
                path: '/x',
                page: '/with-target.html',
                enter: () => {
                    const el = document.getElementById('filled');
                    seenInEnter = el ? 'found' : 'missing';
                    if (el) el.textContent = 'enter-ran';
                }
            }]
        });
        router.navigate('/x');
        await flush(); await flush(); await flush();

        expect(seenInEnter).toBe('found');
        expect(document.getElementById('filled').textContent).toBe('enter-ran');
    });

    test('404 from the server propagates as a rejection (logged)', async () => {
        // No page registered -> mock returns 404.
        const errs = [];
        const orig = console.error;
        console.error = (...a) => errs.push(a);
        try {
            await router({
                container: '#app',
                routes: [{ path: '/missing', page: '/does-not-exist.html' }]
            });
            router.navigate('/missing');
            await flush(); await flush(); await flush();
            expect(errs.some(e => String(e).includes('HTTP 404'))).toBe(true);
        } finally {
            console.error = orig;
        }
    });

    test('page route without container throws on enter', async () => {
        document.body.innerHTML = ''; // no #app
        const errs = [];
        const orig = console.error;
        console.error = (...a) => errs.push(a);
        try {
            pages['/p.html'] = '<html><body><div></div></body></html>';
            await router({
                routes: [{ path: '/p', page: '/p.html' }]
            });
            router.navigate('/p');
            await flush(); await flush();
            expect(errs.length).toBeGreaterThan(0);
        } finally {
            console.error = orig;
        }
    });
});
