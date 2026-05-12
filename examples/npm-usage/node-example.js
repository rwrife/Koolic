// Minimal Node example: prove the npm package works outside of a browser.
// Run with:  node node-example.js   (after `npm install`)

const { koolic } = require('koolic');

// 1. Wrap a plain object and observe a property.
const person = { name: 'Ryan', age: 21 };

koolic(person).name.onChange((oldVal, newVal) => {
    console.log(`[event] person.name: ${oldVal} -> ${newVal}`);
});

// 2. Direct mutation fires the listener.
person.name = 'Bob';
person.name = 'Alice';

// 3. Bind two properties together.
const employee = { name: 'John' };
koolic(employee).name.bind(koolic(person).name);
console.log(`employee.name after bind = "${employee.name}"`);   // "Alice"

person.name = 'Grace';
console.log(`after person.name = "Grace":  employee.name = "${employee.name}"`);

// 4. Function binding — derived/computed state.
function summarize(name, age) {
    console.log(`[derived] ${name} is ${age} years old`);
}
koolic(summarize).bind(koolic(person).name, koolic(person).age);

person.age = 22;

// 5. The animation library works headlessly too (uses setTimeout-rAF fallback).
require('koolic/animate');
const model = { progress: 0 };

const a = koolic(model).progress.animate(0, 100, 200, 'easeInOutCubic');
a.onDone(() => console.log(`[anim done] model.progress = ${model.progress}`));
