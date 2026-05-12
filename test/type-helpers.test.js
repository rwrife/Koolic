const { koolic } = require('../js/koolic.js');

describe('type helpers', () => {
    test('IsPlainObject', () => {
        expect(koolic.IsPlainObject({})).toBe(true);
        expect(koolic.IsPlainObject({ a: 1 })).toBe(true);
        expect(koolic.IsPlainObject([])).toBe(false);
        expect(koolic.IsPlainObject(null)).toBe(false);
        expect(koolic.IsPlainObject('x')).toBe(false);
        expect(koolic.IsPlainObject(document.createElement('div'))).toBe(false);
    });

    test('IsDOMElement', () => {
        expect(koolic.IsDOMElement(document.createElement('div'))).toBe(true);
        expect(koolic.IsDOMElement({})).toBe(false);
    });

    test('IsListObject', () => {
        expect(koolic.IsListObject([])).toBe(true);
        expect(koolic.IsListObject(document.querySelectorAll('body'))).toBe(true);
        expect(koolic.IsListObject({})).toBe(false);
    });

    test('IsFunction', () => {
        expect(koolic.IsFunction(() => 0)).toBe(true);
        expect(koolic.IsFunction({})).toBe(false);
    });

    test('IsNumber', () => {
        expect(koolic.IsNumber(1)).toBe(true);
        expect(koolic.IsNumber(1.5)).toBe(true);
        expect(koolic.IsNumber('1.5')).toBe(true);
        expect(koolic.IsNumber('abc')).toBe(false);
        expect(koolic.IsNumber(NaN)).toBe(false);
    });

    test('IsString', () => {
        expect(koolic.IsString('x')).toBe(true);
        expect(koolic.IsString(1)).toBe(false);
    });

    test('objVal get/set with dotted path', () => {
        const o = { a: { b: { c: 5 } } };
        expect(koolic.objVal(o, 'a.b.c')).toBe(5);
        koolic.objVal(o, 'a.b.c', 9);
        expect(o.a.b.c).toBe(9);
    });
});
