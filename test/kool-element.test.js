const { koolic } = require('../js/koolic.js');

describe('KoolElement', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    test('$$(selector) returns a KoolElement for single match', () => {
        document.body.innerHTML = '<div id="a">hi</div>';
        const el = koolic('#a');
        expect(el.el.id).toBe('a');
        expect(el.text()).toBe('hi');
    });

    test('$$(selector) returns array for multiple matches', () => {
        document.body.innerHTML = '<p class="x">1</p><p class="x">2</p>';
        const els = koolic('.x');
        expect(Array.isArray(els)).toBe(true);
        expect(els.length).toBe(2);
    });

    test('text() set/get', () => {
        document.body.innerHTML = '<div id="a"></div>';
        const el = koolic('#a');
        el.text('hello');
        expect(el.el.textContent).toBe('hello');
        expect(el.text()).toBe('hello');
    });

    test('html() set/get', () => {
        document.body.innerHTML = '<div id="a"></div>';
        const el = koolic('#a');
        el.html('<b>x</b>');
        expect(el.el.innerHTML).toBe('<b>x</b>');
    });

    test('hide/show preserves original display', () => {
        document.body.innerHTML = '<div id="a" style="display:flex"></div>';
        const el = koolic('#a');
        el.hide();
        expect(el.el.style.display).toBe('none');
        el.show();
        expect(el.el.style.display).toBe('flex');
    });

    test('parent returns wrapped parent element', () => {
        document.body.innerHTML = '<div id="p"><span id="c"></span></div>';
        const c = koolic('#c');
        expect(c.parent().el.id).toBe('p');
    });
});
