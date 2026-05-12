const { koolic } = require('../js/koolic.js');

function dispatchInput(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('KoolElement.bind (DOM <-> property)', () => {
    beforeEach(() => { document.body.innerHTML = ''; });

    test('input value <-> property, both directions', () => {
        document.body.innerHTML = '<input id="i" />';
        const person = { name: 'ryan' };
        koolic('#i').bind(koolic(person).name);

        const i = document.getElementById('i');
        expect(i.value).toBe('ryan');

        person.name = 'bob';
        expect(i.value).toBe('bob');

        i.value = 'sue';
        dispatchInput(i);
        expect(person.name).toBe('sue');
    });

    test('div innerHTML defaults', () => {
        document.body.innerHTML = '<div id="d"></div>';
        const o = { msg: 'hello' };
        koolic('#d').bind(koolic(o).msg);
        expect(document.getElementById('d').innerHTML).toBe('hello');
        o.msg = 'world';
        expect(document.getElementById('d').innerHTML).toBe('world');
    });

    test('style alias left adds px suffix', () => {
        document.body.innerHTML = '<div id="d" style="position:absolute;"></div>';
        const a = { left: 0 };
        koolic('#d').bind(koolic(a).left, 'left');
        a.left = 42;
        expect(document.getElementById('d').style.left).toBe('42px');
    });

    test('explicit style.backgroundColor binding', () => {
        document.body.innerHTML = '<div id="d"></div>';
        const s = { color: 'red' };
        koolic('#d').bind(koolic(s).color, 'style.backgroundColor');
        expect(document.getElementById('d').style.backgroundColor).toBe('red');
        s.color = 'blue';
        expect(document.getElementById('d').style.backgroundColor).toBe('blue');
    });

    test('shorthand bind(obj, propName, attr) works', () => {
        document.body.innerHTML = '<input id="i" />';
        const o = { name: 'x' };
        koolic('#i').bind(o, 'name', 'placeholder');
        expect(document.getElementById('i').placeholder).toBe('x');
        o.name = 'y';
        expect(document.getElementById('i').placeholder).toBe('y');
    });
});
