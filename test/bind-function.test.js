const { koolic } = require('../js/koolic.js');

describe('KoolFunction', () => {
    test('wraps a function and exec runs it', () => {
        const fn = (a, b) => a + b;
        const kf = koolic(fn);
        expect(kf.exec(2, 3)).toBe(5);
        expect(kf.value()).toBe(5);
    });

    test('bind to properties re-invokes on change', () => {
        const person = { name: 'ryan', age: 21 };
        const calls = [];
        const greet = (name, age) => calls.push(`${name}/${age}`);
        koolic(greet).bind(koolic(person).name, koolic(person).age);
        expect(calls).toEqual(['ryan/21']);
        person.name = 'bob';
        expect(calls).toEqual(['ryan/21', 'bob/21']);
        person.age = 30;
        expect(calls).toEqual(['ryan/21', 'bob/21', 'bob/30']);
    });

    test('beforeExec and afterExec hooks run in order', () => {
        const order = [];
        const kf = koolic(() => order.push('fn'));
        kf.beforeExec(() => order.push('before'));
        kf.afterExec(() => order.push('after'));
        kf.exec();
        expect(order).toEqual(['before', 'fn', 'after']);
    });
});
