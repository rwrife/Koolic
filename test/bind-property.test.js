const { koolic } = require('../js/koolic.js');

describe('KoolProperty.bind (property <-> property)', () => {
    test('two-way: writing one updates the other', () => {
        const person = { name: 'ryan' };
        const employee = { name: 'john' };
        koolic(employee).name.bind(koolic(person).name);
        expect(employee.name).toBe('ryan');

        person.name = 'bob';
        expect(employee.name).toBe('bob');

        employee.name = 'sue';
        expect(person.name).toBe('sue');
    });

    test('shorthand bind(obj, propName) works', () => {
        const person = { name: 'ryan' };
        const employee = { name: 'john' };
        koolic(employee).name.bind(person, 'name');
        expect(employee.name).toBe('ryan');
        person.name = 'bob';
        expect(employee.name).toBe('bob');
    });

    test('binding does not infinite-loop', () => {
        const a = { v: 1 };
        const b = { v: 2 };
        koolic(a).v.bind(koolic(b).v);
        let count = 0;
        koolic(a).v.onChange(() => count++);
        a.v = 99;
        expect(b.v).toBe(99);
        expect(count).toBe(1);
    });
});
