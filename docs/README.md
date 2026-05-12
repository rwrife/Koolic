# Koolic Documentation

Koolic is a small, no-dependency JavaScript library for **simple data binding
in HTML**. This documentation is organized into three layers:

1. **Tutorials** — start here if you're new.
2. **Guides** — one topic per page, in depth.
3. **Reference** — exhaustive API surface.

---

## Tutorials

- [Getting started](getting-started.md) — install, your first reactive object, your first DOM binding.

## Guides

| Guide | Covers |
| --- | --- |
| [Reactive objects](guide/reactive-objects.md) | `$$(obj)`, properties, change events, nested objects |
| [Property binding](guide/property-binding.md) | Linking one property to another, two-way semantics |
| [DOM binding](guide/dom-binding.md) | Linking properties to elements, inputs, style attributes |
| [Function binding](guide/function-binding.md) | Re-running a function when its inputs change |
| [Animation](guide/animation.md) | `KoolAnimation`, lifecycle, chaining |
| [Easings](guide/easings.md) | Named easings, custom functions, segmented easings |

## Reference

- [API reference](api.md) — every function, every method, every option.
- [Recipes](recipes.md) — common patterns and complete snippets.
- [npm / bundler usage](npm.md) — installing and importing via npm.
- [Migration from 1.x](migration.md) — what changed and what stayed the same.

## Examples

The [`examples/`](../examples) folder contains nine standalone HTML files —
no build step, no dependencies, just open them in a browser:

| # | File | Topic |
| --- | --- | --- |
| 01 | [`01-quickstart.html`](../examples/01-quickstart.html) | Wrap an object; react to changes |
| 02 | [`02-binding.html`](../examples/02-binding.html) | Property ↔ property |
| 03 | [`03-dom-binding.html`](../examples/03-dom-binding.html) | Inputs/selects/labels share one property |
| 04 | [`04-style-binding.html`](../examples/04-style-binding.html) | Input ↔ `style.backgroundColor` |
| 05 | [`05-function-binding.html`](../examples/05-function-binding.html) | Re-invoke a function on change |
| 06 | [`06-animation-basics.html`](../examples/06-animation-basics.html) | Linear ping-pong |
| 07 | [`07-animation-easings.html`](../examples/07-animation-easings.html) | 12 easings racing side-by-side |
| 08 | [`08-animation-bounce.html`](../examples/08-animation-bounce.html) | Bouncing ball with `easeOutBounce` |
| 09 | [`09-animation-segmented.html`](../examples/09-animation-segmented.html) | Segmented (piecewise) easing |
| 10 | [`10-advanced-form.html`](../examples/10-advanced-form.html) | **Checkout-style form** — validation, computed totals, JSON submit |
| —  | [`npm-usage/`](../examples/npm-usage) | **Install from npm + use in browser and Node** |

## Mental model in 30 seconds

> Plain objects stay plain. `$$(obj)` is the **binding handle facade**.

```js
const person = { name: 'Ryan' };

person.name = 'Bob';            // raw value, reactive in place
$$(person).name.value();         // "Bob"  -- handle getter
$$(person).name.onChange(fn);    // listen
$$(person).name.bind(other);     // bind to another property
$$('#input').bind($$(person).name); // bind to a DOM element
```

That's the entire core idea. Everything else is sugar.
