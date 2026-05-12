# Koolic

A small, no-dependency JavaScript library for **simple data binding in HTML** —
jQuery's pragmatism, React's reactivity, kept intentionally tiny.

```js
const person = { name: "Ryan", age: 21 };

$$('#nameInput').bind($$(person).name);   // input <-> property
$$('#greeting').bind($$(person).name);    // span <-> property
person.name = "Bob";                       // updates the input AND the span
```

No build step, no JSX, no virtual DOM. Just two scripts and plain HTML.

---

## Install

### Via npm (Node / bundlers)

```sh
npm install koolic
```

```js
const { koolic } = require('koolic');
require('koolic/animate');           // optional
```

…or with ESM:

```js
import koolicMod from 'koolic';
import 'koolic/animate';
const $$ = koolicMod.koolic;
```

See [docs/npm.md](docs/npm.md) for bundler-specific notes.

### Via `<script>` tag

Drop the two files into your page. The animation library is optional.

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.animate.js"></script>   <!-- only if you want animation -->
```

Globals exposed: `koolic`, `$$` (alias), and `KoolicElement` / `KoolicObject` /
`KoolicProperty` / `KoolicFunction` / `KoolicAnimation` (for `instanceof` checks).

## The 60-second tour

```js
// 1. Wrap a plain object. The original object is reactive in-place.
const person = { name: "Ryan", age: 21 };
const $person = $$(person);

// 2. Listen for changes.
$person.name.onChange((oldVal, newVal) => console.log(oldVal, "->", newVal));

// 3. Direct mutation works.
person.name = "Bob";   // logs: Ryan -> Bob

// 4. Bind one property to another.
const employee = { name: "John" };
$$(employee).name.bind($$(person).name);   // employee.name is now "Bob"
person.name = "Sue";                        // employee.name is now "Sue"

// 5. Bind a DOM element.
$$('#nameInput').bind($$(person).name);     // two-way: typing updates person.name

// 6. Bind a CSS property (style aliases auto-suffix px).
$$('#box').bind($$(person).age, 'left');    // <- maps to style.left + 'px'
$$('#box').bind($$(person).age, 'style.opacity');

// 7. Re-run a function when any of its inputs change.
function render(name, age) { console.log(`${name} is ${age}`); }
$$(render).bind($$(person).name, $$(person).age);
```

## Animation

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.animate.js"></script>
```

```js
// Linear move
$$(model).x.animate(0, 100, 1000);

// Named easing
$$(model).x.animate(0, 100, 1000, 'easeOutBounce');

// Custom easing (t in [0,1] -> [0,1])
$$(model).x.animate(0, 100, 1000, t => t * t);

// Segmented: slow start, fast middle, slow finish
$$(model).x.animate(0, 100, 1000, [
  { to: 0.2, easing: 'easeInSine'  },
  { to: 0.8, easing: 'linear'      },
  { to: 1.0, easing: 'easeOutSine' }
]);

// Chain
$$(model).x.animate(0, 100, 1000).onDone(() => {
  $$(model).x.animate(100, 0, 1000);
});
```

Built-in easings: `linear`, `easeIn/Out/InOutSine`, `easeIn/Out/InOutQuad`,
`easeIn/Out/InOutCubic`, `easeOutBounce`, `easeOutElastic`. Add your own:

```js
koolic.easings.snap = t => (t < 0.9 ? 0 : 1);
```

## Examples

Open these directly in a browser — no server required.

| File | Topic |
| --- | --- |
| [`examples/01-quickstart.html`](examples/01-quickstart.html) | Wrap an object; react to changes |
| [`examples/02-binding.html`](examples/02-binding.html) | Property ↔ property |
| [`examples/03-dom-binding.html`](examples/03-dom-binding.html) | Inputs, selects, labels all share one property |
| [`examples/04-style-binding.html`](examples/04-style-binding.html) | Bind an input value to `style.backgroundColor` |
| [`examples/05-function-binding.html`](examples/05-function-binding.html) | Re-invoke a function on change |
| [`examples/06-animation-basics.html`](examples/06-animation-basics.html) | Linear ping-pong |
| [`examples/07-animation-easings.html`](examples/07-animation-easings.html) | All 12 easings racing side-by-side |
| [`examples/08-animation-bounce.html`](examples/08-animation-bounce.html) | Bouncing ball with `easeOutBounce` |
| [`examples/09-animation-segmented.html`](examples/09-animation-segmented.html) | Segmented (piecewise) easing |
| [`examples/10-advanced-form.html`](examples/10-advanced-form.html) | **Checkout-style form** — multi-field validation, computed totals, JSON payload for REST submit |
| [`examples/npm-usage/`](examples/npm-usage) | **Install Koolic from npm** and use it in a browser page + a Node script |
| [`examples/11-space-invaders.html`](examples/11-space-invaders.html) | **Space Invaders** — full SVG arcade game; entities are reactive Koolic models, game loop just mutates state |

## Documentation

- **[docs/api.md](docs/api.md)** — full API reference
- **[docs/migration.md](docs/migration.md)** — migrating from Koolic 1.x

## Testing

```sh
npm install
npm test
```

44 unit tests covering type helpers, reactive objects, property/DOM binding,
function binding, animation, and easings.

## How it works

Two key ideas, zero polling:

1. **`Object.defineProperty`** rewrites every property on the wrapped object
   with a get/set pair. Assigning `person.name = "x"` fires the setter, which
   notifies listeners synchronously.
2. **A `Proxy` facade** turns `$$(person).name` into a binding handle (a
   `KoolProperty`) while leaving `person.name` as a regular value. You get the
   ergonomics of "real properties" without the cost of polling.

DOM ↔ property binding listens for `input` / `change` events.
Animation is driven by `requestAnimationFrame`.

## License

MIT
