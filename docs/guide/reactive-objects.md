# Reactive Objects

> Wrap a plain object once. Every property becomes observable, in place, with
> no syntactic overhead at the call site.

## Wrapping

```js
const person = { name: 'Ryan', age: 21 };
$$(person);
```

After this call:

- `person` is still the same object reference.
- `person.name` is still `"Ryan"`.
- `person.name = "x"` now **fires change events**.
- `$$(person)` returns a binding-handle facade (cached on the object).

You can wrap the same object multiple times — you'll get the same facade back:

```js
$$(person) === $$(person);   // true
```

## What gets instrumented

Koolic walks the **own enumerable properties** of the object you pass in and
replaces each one with an `Object.defineProperty` get/set pair. Nested plain
objects are recursively wrapped:

```js
const profile = {
    user: { first: 'Ada', last: 'Lovelace' },
    prefs: { theme: 'dark' }
};
$$(profile);

profile.user.first = 'Grace';
// -> fires change handlers on profile.user.first
```

Wrapping happens once, at the time you first call `$$(obj)`. Properties you
add to the raw object **after** that point are not auto-instrumented. Use
`.prop(name)` (see below) to add them explicitly.

## What does *not* get wrapped

- Arrays (`Array.isArray` returns true → skipped).
- DOM nodes / `EventTarget` instances.
- Class instances (any object whose prototype is not `Object.prototype`).
- Functions.

These remain as-is on the underlying object.

## Listening for changes

Every property has a handle, reachable via `$$(obj).<name>`:

```js
$$(person).name.onChange((oldVal, newVal) => {
    console.log(oldVal, '->', newVal);
});

person.name = 'Bob';          // logs: Ryan -> Bob
$$(person).name.value('Sue');  // logs: Bob -> Sue
```

Both routes — direct mutation and `.value()` — go through the same setter and
fire the same handlers. They are interchangeable.

### Multiple listeners

Each `onChange()` appends a listener. There is no automatic dedupe.

```js
const k = $$(person).name;
k.onChange(handler1);
k.onChange(handler2);
person.name = 'x';   // both handlers run, in registration order
```

### No-op writes are suppressed

If the new value is `Object.is`-equal to the current one, **no listeners
fire**:

```js
$$({x: 5}).x.onChange(() => console.log('!'));
obj.x = 5;          // nothing
obj.x = NaN;        // fires
obj.x = NaN;        // does NOT fire (Object.is(NaN, NaN) === true)
```

## The handle API: `KoolProperty`

| Method | Purpose |
| --- | --- |
| `.value()` | Read the current value |
| `.value(v)` | Write the value (fires change events) |
| `.onChange(fn)` | Register a change listener `fn(oldVal, newVal)` |
| `.parent()` | Return the `KoolObject` the property belongs to |
| `.isInteger()` | `true` if current value is an integer |
| `.isFloat()` | `true` if current value is a finite non-integer number |
| `.bind(other)` | Two-way bind to another property (see [Property binding](property-binding.md)) |
| `.animate(...)` | Animate the value (requires `koolic.animate.js`) |

`$$(person).name === $$(person).name` — handles are cached per-property, so
identity comparisons work.

## Dynamic property names: `.prop(name)`

For property names that aren't valid JavaScript identifiers, or that you
compute at runtime, use `.prop()` instead of dot access:

```js
const config = { 'max-width': 800 };
$$(config).prop('max-width').onChange(...);

const which = computeWhich();        // returns 'name' or 'age'
$$(person).prop(which).value();
```

`.prop()` also **adds the property** if it isn't already on the object. This
lets you instrument properties that get attached later:

```js
const obj = {};
$$(obj);                       // wraps; obj has no own properties yet
$$(obj).prop('lazy').onChange(fn);
obj.lazy = 42;                 // fires
```

## Object-level listeners

Sometimes you want to react to *any* change on the object, not a specific
property. The underlying `KoolObject` exposes `.on(handler)`:

```js
$$(person);
person.__koolic__.on((path, oldVal, newVal) => {
    console.log(path, oldVal, '->', newVal);
});
person.name = 'Bob';
// -> "name", "Ryan", "Bob"
```

Paths for nested changes are dotted (`"user.first"`).

## Identifying handles

```js
$$(person).name instanceof KoolicProperty;   // true
```

Use this when writing functions that accept "either a property handle or a raw
value".

## See also

- [Property binding](property-binding.md) — linking two handles together.
- [DOM binding](dom-binding.md) — linking handles to elements.
- [Example 01 — Quickstart](../../examples/01-quickstart.html)
