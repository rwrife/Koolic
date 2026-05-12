# Migrating from Koolic 1.x to 2.0

## TL;DR

Most existing code keeps working. The visible API is the same:

```js
$$(person).name.value();
$$(person).name.bind($$(employee).name);
$$('input').bind($$(person).name);
$$('#box').bind($$(model).x, 'left');
$$(myFn).bind($$(p).a, $$(p).b);
$$(model).x.animate(0, 100, 1000);
```

The big change is internal: no more 10ms polling loop.

## What changed

### Reactive model

**1.x.** A `setTimeout` loop polled every `KoolicProperty` 100 times per second,
comparing the wrapper's cached value against the underlying object and
reconciling. Direct mutation (`person.name = "x"`) was picked up on the next
tick.

**2.0.** Properties are instrumented with `Object.defineProperty` get/set. The
setter fires change handlers synchronously. No polling — direct mutation is
seen immediately, and CPU usage is zero when nothing is happening.

There's no need to change any code; this just makes everything faster and more
responsive.

### DOM updates

**1.x.** DOM input changes were detected by the polling loop reading
`el.value`.

**2.0.** Koolic listens for `input` and `change` events. **If you mutate
`el.value` from JavaScript**, dispatch an `input` event:

```js
el.value = "x";
el.dispatchEvent(new Event('input', { bubbles: true }));
```

This matches how every modern framework behaves.

### Animation

**1.x.** Animations were driven by the same 10ms polling loop.

**2.0.** Animations use `requestAnimationFrame`. They auto-start on the next
microtask (so chained `.onDone` handlers register before the first frame).
Final value is now exactly `stop`, not a near-miss interpolation.

`.animate()` gains an optional 4th argument: an easing name, function, or
array of segments. See [api.md](api.md#easings).

### Globals & module loading

**1.x.** Required four script tags (`koolic.js`, `koolic.bind.js`,
`koolic.html.js`, `koolic.animate.js`).

**2.0.** Two tags:

```html
<script src="js/koolic.js"></script>           <!-- everything: core, DOM, binding -->
<script src="js/koolic.animate.js"></script>   <!-- optional, for .animate() -->
```

The library is also `require`-able under Node (jsdom in tests).

### Bug fixes

The following bugs in 1.x are fixed in 2.0:

- `koolic.IsString` referenced an undefined `o`.
- `KoolicElement.hide()` / `show()` referenced free variables (`element`,
  `_originalDisplay`) and threw.
- `KoolicFunction.afterExec` pushed into `_before` instead of `_after`.
- `KoolicProperty.animate(existingAnimation)` returned the wrong value.
- `KoolicProperty.validate` could lose changes when both the wrapper and the
  underlying object were written between polls.
- Polling-based animations could overshoot the final value or never settle.

### Removed

- IE polyfills (`Array.prototype.indexOf` shim) — modern browsers only.
- The `koolic._watch` global array — no longer needed without polling.
- The `_frameTimer` 10ms loop.

## Migration checklist

1. Replace your four `<script>` tags with the two new ones.
2. If you set form input values programmatically, dispatch an `input` event after.
3. Anything else: probably already works.

That's it.
