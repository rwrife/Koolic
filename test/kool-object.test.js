const { koolic } = require('../js/koolic.js');

describe('KoolObject', () => {
    test('wraps a plain object and exposes property handles', () => {
        const person = { name: 'ryan', age: 21 };
        const kp = koolic(person);
        expect(kp.name.value()).toBe('ryan');
        expect(kp.age.value()).toBe(21);
    });

    test('direct mutation fires change handlers', () => {
        const obj = { x: 0 };
        const k = koolic(obj);
        const changes = [];
        k.x.onChange((o, n) => changes.push([o, n]));
        obj.x = 5;
        expect(changes).toEqual([[0, 5]]);
    });

    test('handle mutation also fires change handlers', () => {
        const obj = { x: 0 };
        const k = koolic(obj);
        const changes = [];
        k.x.onChange((o, n) => changes.push([o, n]));
        k.x.value(7);
        expect(changes).toEqual([[0, 7]]);
        expect(obj.x).toBe(7);
    });

    test('no-op write (Object.is equal) does not fire change', () => {
        const obj = { x: 5 };
        const k = koolic(obj);
        const changes = [];
        k.x.onChange(() => changes.push('!'));
        obj.x = 5;
        k.x.value(5);
        expect(changes).toEqual([]);
    });

    test('same handle returned on repeated access (identity)', () => {
        const obj = { a: 1 };
        const k = koolic(obj);
        expect(k.a).toBe(k.a);
    });

    test('wrapping the same object twice returns the same facade', () => {
        const obj = { a: 1 };
        expect(koolic(obj)).toBe(koolic(obj));
    });

    test('nested plain object is recursively wrapped', () => {
        const obj = { inner: { v: 1 } };
        const k = koolic(obj);
        const changes = [];
        k.inner.v.onChange((o, n) => changes.push([o, n]));
        obj.inner.v = 9;
        expect(changes).toEqual([[1, 9]]);
    });

    test('isInteger / isFloat', () => {
        const k = koolic({ i: 3, f: 2.5, s: 'x' });
        expect(k.i.isInteger()).toBe(true);
        expect(k.i.isFloat()).toBe(false);
        expect(k.f.isInteger()).toBe(false);
        expect(k.f.isFloat()).toBe(true);
        expect(k.s.isInteger()).toBe(false);
    });

    test('prop() escape hatch works for dynamic names', () => {
        const obj = { 'weird key': 1 };
        const k = koolic(obj);
        expect(k.prop('weird key').value()).toBe(1);
    });
});
