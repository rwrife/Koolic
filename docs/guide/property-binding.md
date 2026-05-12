# Property Binding

> Link two reactive properties so that they always have the same value.

## The basics

```js
const person   = { name: 'Ryan' };
const employee = { name: 'John' };

$$(employee).name.bind($$(person).name);
```

After this single line:

- `employee.name` is now `"Ryan"` (the **argument** side wins the initial
  sync).
- Any mutation on either side propagates to the other.

```js
person.name = 'Bob';        // employee.name === 'Bob'
employee.name = 'Sue';      // person.name === 'Sue'
```

## Shorthand

Skip the second `$$()` if you'd rather pass the object and a property name:

```js
$$(employee).name.bind(person, 'name');
```

These two forms are identical.

## Initial sync semantics

The argument wins:

```js
const a = { v: 1 };
const b = { v: 2 };
$$(a).v.bind($$(b).v);
// a.v === 2, b.v === 2  (b is the argument, b wins)
```

If you want `a` to win instead, write a value into `a` *after* the bind:

```js
$$(a).v.bind($$(b).v);
a.v = 1;       // both are now 1
```

## Loop avoidance

Koolic prevents infinite ping-pong updates with two mechanisms:

1. **`Object.is` equality check.** A write whose new value equals the current
   one is a no-op.
2. **Per-update origin token.** When a change crosses a bound edge, that edge
   refuses to propagate the same change back.

The practical consequence: each mutation produces **exactly one** notification
per listener, even with deep binding graphs:

```js
const a = { v: 1 };
const b = { v: 2 };
const c = { v: 3 };
$$(a).v.bind($$(b).v);
$$(b).v.bind($$(c).v);

let count = 0;
$$(a).v.onChange(() => count++);
a.v = 99;
// count === 1, b.v === 99, c.v === 99
```

## Re-binding is a no-op

Binding the same pair twice doesn't double-link them:

```js
$$(a).v.bind($$(b).v);
$$(a).v.bind($$(b).v);   // ignored
```

## Chained bindings

Bindings are transitive in the obvious way:

```js
$$(a).v.bind($$(b).v);
$$(b).v.bind($$(c).v);

a.v = 'x';
// b.v === 'x'
// c.v === 'x'
```

## Type coercion

Koolic doesn't coerce. If `person.name` is a string and you bind it to a
property containing a number, the next write replaces the value without
conversion. Convert at the source if you need to:

```js
$$(form).age.onChange((_, v) => {
    if (typeof v === 'string') form.age = parseInt(v, 10);
});
```

## When *not* to use property binding

- If one side is a DOM element, use [DOM binding](dom-binding.md) instead.
- If you want to compute one value from several others, use [function
  binding](function-binding.md). A bound *function* is the right abstraction
  for derived state; a bound *property* is for mirrored state.

## See also

- [DOM binding](dom-binding.md)
- [Function binding](function-binding.md)
- [Example 02 — Property binding](../../examples/02-binding.html)
