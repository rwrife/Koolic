# Koolic API Reference

Two libraries:

- `js/koolic.js` — base library (entrypoint, reactive objects, DOM binding, function binding). Always required.
- `js/koolic.animate.js` — animation add-on. Loads on top of `koolic.js`.

Globals exposed by the base library: `koolic`, `$$` (alias), `KoolicObject`, `KoolicProperty`, `KoolicElement`, `KoolicFunction`. The animation library adds `KoolicAnimation` and `koolic.easings`.

---

## Entrypoint: `koolic(x)` / `$$(x)`

A single dispatch function whose return type depends on `x`.

| Argument type | Returns |
| --- | --- |
| CSS selector string matching one element | `KoolElement` |
| CSS selector string matching many elements | `Array<KoolElement>` |
| DOM `Node` | `KoolElement` |
| plain object (`{...}`) | Proxy facade over a `KoolObject` |
| function | `KoolFunction` |
| `null` / `undefined` / no match | `undefined` |

Wrapping the same plain object twice returns the same Proxy facade (cached on the object via a hidden symbol).

### Static helpers on `koolic`

| Name | Description |
| --- | --- |
| `koolic.IsPlainObject(v)` | `true` for `{...}`-style objects only |
| `koolic.IsDOMElement(v)` | `true` for DOM `Node`s |
| `koolic.IsDOMObject(v)` | `true` for any `EventTarget` |
| `koolic.IsListObject(v)` | `true` for `Array` or `NodeList` |
| `koolic.IsFunction(v)` | `true` for functions |
| `koolic.IsNumber(v)` | `true` for finite numbers or numeric strings |
| `koolic.IsString(v)` | `true` for strings |
| `koolic.objVal(obj, path)` | Dotted-path getter: `koolic.objVal(o, 'a.b.c')` |
| `koolic.objVal(obj, path, v)` | Dotted-path setter |
| `koolic.ready(fn[, ctx])` | Runs `fn(ctx)` when the DOM is ready |

---

## Reactive objects

### `$$(plainObject)` → Proxy facade

Property access on the facade returns a **`KoolProperty`** handle. The
underlying plain object is also instrumented in place, so:

```js
const person = { name: 'Ryan' };
const $p = $$(person);

$p.name.value()    // "Ryan"  (handle getter)
$p.name.value('Bob');
person.name        // "Bob"   (defineProperty intercept)
person.name = 'Sue';
$p.name.value()    // "Sue"
```

Both routes fire `onChange` handlers identically.

### `KoolProperty` — the binding handle

A handle to a single property of a `KoolObject`.

| Method | Description |
| --- | --- |
| `.value()` | Read the current value |
| `.value(v)` | Write the value (also fires change events) |
| `.parent()` | The `KoolObject` this property belongs to |
| `.onChange(fn)` | Register `fn(oldVal, newVal)`. Called on every change. |
| `.isInteger()` | `true` if the value is an integer |
| `.isFloat()` | `true` if the value is a finite, non-integer number |
| `.bind(other)` | Two-way bind to another `KoolProperty`. See below. |
| `.bind(plainObj, propName)` | Shorthand for `bind($$(plainObj)[propName])` |
| `.animate(start, stop, duration[, easing])` | Animation library — see below |

### Property-to-property binding

```js
$$(employee).name.bind($$(person).name);
```

Semantics:
- The **argument side wins** the initial sync — `employee.name` becomes
  whatever `person.name` is.
- Both directions are linked: mutating either side updates the other.
- Loop avoidance: a write is suppressed when the new value is `Object.is`-equal
  to the current value, and an origin token prevents the change from bouncing
  back through the same edge.
- Binding the same pair twice is a no-op.

### Nested objects

Nested plain objects are recursively wrapped:

```js
const profile = { user: { name: 'Ada' } };
$$(profile).user.name.onChange(...);
profile.user.name = 'Grace';   // fires
```

### Listening at the object level

The underlying `KoolObject` exposes `.on(fn)` / `.off(fn)`. The handler is
called as `fn(propertyPath, oldVal, newVal)`. Access it through the hidden
`__koolic__` slot (or capture the result of `new KoolObject(...)`):

```js
const obj = { a: 1 };
$$(obj);
obj.__koolic__.on((path, o, n) => console.log(path, o, '->', n));
```

### Dynamic property names: `.prop(name)`

Property names that aren't valid identifiers, or that you compute at runtime:

```js
$$(obj).prop('weird key').value();
$$(obj).prop(name).bind(...);
```

---

## DOM: `KoolElement`

Returned by `$$('selector')` and `$$(domNode)`.

| Method | Description |
| --- | --- |
| `.el` | The underlying DOM node |
| `.parent()` | `KoolElement` wrapping the parent node |
| `.text([t])` | Get/set `textContent` |
| `.html([h])` | Get/set `innerHTML` |
| `.hide()` | Remember current `display` and set to `none` |
| `.show()` | Restore the previously remembered `display` |
| `.on(evt, fn)` | Add an event listener |
| `.off(evt, fn)` | Remove an event listener |
| `.bind(...)` | Two-way DOM ↔ property binding (below) |

### `KoolElement.bind(...)`

Signatures:

```js
el.bind(koolProperty);
el.bind(koolProperty, attr);
el.bind(koolProperty, attr, prefix, suffix);

el.bind(plainObj, propName);
el.bind(plainObj, propName, attr);
el.bind(plainObj, propName, attr, prefix, suffix);
```

`attr` may be a dotted path (`'style.backgroundColor'`). If omitted, the
default depends on the element type:

| Element | Default attribute |
| --- | --- |
| `<input>`, `<select>`, `<textarea>` | `value` |
| Any other `HTMLElement` | `innerHTML` |
| Other DOM node | `innerText` |

`prefix` and `suffix` wrap the property value on the way to the DOM (and are
stripped on the way back).

#### Style aliases

For convenience, four `attr` values are auto-translated and given a `px` suffix:

| Alias | Expands to | Suffix |
| --- | --- | --- |
| `'left'` | `'style.left'` | `'px'` |
| `'top'` | `'style.top'` | `'px'` |
| `'right'` | `'style.right'` | `'px'` |
| `'bottom'` | `'style.bottom'` | `'px'` |

```js
$$('#box').bind($$(model).x, 'left');   // sets style.left = `${value}px`
```

#### Two-way DOM updates

For form elements (`<input>`, `<select>`, `<textarea>`) bound on `value` /
`checked`, Koolic listens for the native `input` and `change` events.

> **Note.** If your code mutates `el.value` programmatically, dispatch an
> `input` event so Koolic notices:
> ```js
> el.value = "x";
> el.dispatchEvent(new Event('input', { bubbles: true }));
> ```
> Setting `el.value` does not fire `input` by itself in any browser.

---

## Functions: `KoolFunction`

```js
const kf = $$(myFunction);
```

| Method | Description |
| --- | --- |
| `.exec(...args)` | Call the wrapped function. `KoolProperty` args are unwrapped to values. Returns the result. |
| `.value()` | Last return value |
| `.beforeExec(fn)` | Hook called before each `exec(...)` |
| `.afterExec(fn)` | Hook called after each `exec(...)` |
| `.bind(...koolProperties)` | Re-invoke the function whenever any of these properties change. Fires once immediately with current values. |

```js
function render(name, age) { ... }
$$(render).bind($$(person).name, $$(person).age);
```

---

## Animation library (`koolic.animate.js`)

Adds `.animate()` to `KoolProperty`, exposes `koolic.easings`, and registers
the global `KoolicAnimation` constructor.

### `KoolProperty.animate(start, stop, duration[, easing])`

| Argument | Type | Notes |
| --- | --- | --- |
| `start` | number | Initial value |
| `stop` | number | Final value (snapped to exactly at completion) |
| `duration` | number | Milliseconds |
| `easing` | _optional_ | string \| function \| segments — see below |

Returns a `KoolAnimation` which auto-starts on the next microtask (so you can
chain `.onDone(...)` immediately).

Alternate signature — replay an existing animation:

```js
const flight = $$(ball).y.animate(0, 200, 800, 'easeOutBounce');
flight.onDone(() => $$(ball).y.animate(flight));   // re-run
```

### `KoolAnimation`

| Method | Description |
| --- | --- |
| `.value()` | Current animated value |
| `.onChange(fn)` | `fn(animation, value)` every frame |
| `.onDone(fn)` | `fn(animation, value)` once at completion. If attached after completion, runs immediately. |
| `.reset()` | Restart from `start` |
| `.start()` | Begin (called automatically; safe to re-call after `stop()`) |
| `.stop()` | Cancel pending frames |

Animations are driven by `requestAnimationFrame`.

### Easings

`koolic.easings` is the registry. Add your own at any time:

```js
koolic.easings.snap = t => (t < 0.9 ? 0 : 1);
$$(model).x.animate(0, 100, 1000, 'snap');
```

Built-ins (all `f(0) === 0`, `f(1) === 1`):

| Name | Curve |
| --- | --- |
| `linear` | `t` |
| `easeInSine` / `easeOutSine` / `easeInOutSine` | Sine wave segments |
| `easeInQuad` / `easeOutQuad` / `easeInOutQuad` | Quadratic |
| `easeInCubic` / `easeOutCubic` / `easeInOutCubic` | Cubic |
| `easeOutBounce` | Bouncing-ball decay (Robert Penner) |
| `easeOutElastic` | Spring overshoot then settle |

### Custom easing

```js
$$(model).x.animate(0, 100, 1000, t => t * t * (3 - 2*t));   // smoothstep
```

### Segmented (piecewise) easing

Compose multiple easings across the timeline:

```js
$$(model).x.animate(0, 720, 2500, [
  { to: 0.20, easing: 'easeInSine'  },   // 0..20%   ease-in
  { to: 0.80, easing: 'linear'      },   // 20..80%  linear
  { to: 1.00, easing: 'easeOutSine' }    // 80..100% ease-out
]);
```

Rules:

- Each segment has `to` (a fraction in `(0, 1]`) and `easing` (name or function).
- `to` values must be strictly increasing.
- The last segment must end at `to: 1.0` exactly.
- Each segment's easing is **compressed** into its band — so its 0→1 curve fits
  exactly within that slice of the timeline, and the overall curve stays
  continuous and reaches the final value at exactly `t=1`.

Violations throw a descriptive error.

### One-off animations (not bound to a property)

```js
const a = koolic.animate(0, 100, 1000, 'easeOutBounce');
a.onChange((_, v) => console.log(v));
```
