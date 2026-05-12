# Function Binding

> Re-invoke a function automatically whenever any of its inputs change. The
> right abstraction for derived state and side effects.

## The basics

```js
const person = { first: 'Ada', last: 'Lovelace' };

function render(first, last) {
    document.getElementById('out').textContent = `${first} ${last}`;
}

$$(render).bind($$(person).first, $$(person).last);
```

What happens:

1. **Immediately** the function is invoked once with the current values:
   `render('Ada', 'Lovelace')`.
2. **Thereafter**, any change to `person.first` or `person.last` re-invokes the
   function with the latest values of *all* bound properties.

```js
person.first = 'Grace';
// -> render('Grace', 'Lovelace')

person.last = 'Hopper';
// -> render('Grace', 'Hopper')
```

## Argument order matches bind order

The function receives bound property values in the same order you passed them
to `.bind()`:

```js
$$(fn).bind($$(o).a, $$(o).b, $$(o).c);
// fn is called as fn(o.a, o.b, o.c)
```

## Mixing wrapped and unwrapped arguments

You can call `.exec()` directly with a mix of `KoolProperty` handles and
plain values. Handles are unwrapped to their current value before the function
runs:

```js
const kf = $$((a, b) => a + b);
kf.exec($$(o).x, 5);         // computes o.x + 5
kf.value();                  // last return value
```

## Hooks: `beforeExec` / `afterExec`

```js
$$(render)
    .beforeExec(() => console.time('render'))
    .afterExec(() => console.timeEnd('render'))
    .bind($$(person).first, $$(person).last);
```

Hooks receive the same arguments the wrapped function does. Both fire on every
invocation, in registration order.

## Function binding vs. property binding

|  | Property binding | Function binding |
| --- | --- | --- |
| Use when | Two pieces of state should be **the same** | One value is **derived from** others |
| Direction | Bidirectional | Unidirectional (inputs → output) |
| Code shape | `$$(a).x.bind($$(b).y)` | `$$(fn).bind($$(p).a, $$(p).b)` |
| Trigger | Mutation on either side | Mutation on **any** input |

A common pattern: function binding to render, property binding to keep state
in sync.

## What `$$(fn)` returns

A `KoolFunction` instance with this surface:

| Member | Description |
| --- | --- |
| `.exec(...args)` | Manually invoke with the given args. `KoolProperty` args are unwrapped. Returns the result. |
| `.value()` | Last return value |
| `.beforeExec(fn)` | Register a pre-invocation hook |
| `.afterExec(fn)` | Register a post-invocation hook |
| `.bind(...koolProperties)` | Auto-invoke on input change |

## Caveats

- The function should be **pure with respect to its arguments**. Reading
  unbound state from inside the function works, but those reads don't trigger
  re-invocation. If a value matters, bind it explicitly.
- The function fires on every change, synchronously. If you're doing heavy
  work, debounce inside the function or use the `beforeExec`/`afterExec` hooks
  to gate execution.

## See also

- [Example 05 — Function binding](../../examples/05-function-binding.html)
- [Property binding](property-binding.md)
