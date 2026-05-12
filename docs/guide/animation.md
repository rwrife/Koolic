# Animation

> Smoothly interpolate a numeric property over a duration, optionally shaped
> by an easing function. Driven by `requestAnimationFrame` — zero polling.

The animation library lives in a separate file. Load it after the base
library:

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.animate.js"></script>
```

This adds `.animate()` to `KoolProperty`, registers `koolic.easings`, and
exposes `KoolicAnimation` as a global.

## The basics

```js
const model = { x: 0 };
$$('#box').bind($$(model).x, 'left');

$$(model).x.animate(0, 400, 1000);
// Animates model.x from 0 to 400 over 1 second (linear).
// The bound element follows automatically.
```

Signature:

```
KoolProperty.animate(start, stop, duration[, easing])
```

| Arg | Type | Description |
| --- | --- | --- |
| `start` | number | Initial value |
| `stop` | number | Final value (the property is set to **exactly** this at completion) |
| `duration` | number | Milliseconds |
| `easing` | _optional_ | Name, function, or segment array — see [Easings](easings.md) |

Returns a `KoolAnimation` you can attach lifecycle callbacks to.

## Auto-start

Animations start on the next microtask. This is so you can chain calls
synchronously:

```js
$$(model).x.animate(0, 100, 500).onDone(() => {
    // This handler is registered before the first frame, so it fires
    // exactly once when the animation reaches 100.
});
```

If you stop an animation (`.stop()`) and want to restart, call `.start()` or
`.reset()`.

## Lifecycle: `onChange` and `onDone`

```js
const a = $$(model).x.animate(0, 100, 1000, 'easeOutBounce');

a.onChange((animation, value) => {
    // Called every frame. value is the current interpolated number.
});

a.onDone((animation, finalValue) => {
    // Called once when the animation completes.
});
```

`onDone` handlers registered **after** the animation has already finished
fire immediately. That makes the following pattern safe even if the animation
is very short:

```js
const a = $$(model).x.animate(0, 100, 0);    // duration 0 = "snap to value"
a.onDone(() => doNext());                     // still fires
```

## Chaining (ping-pong)

```js
function pingPong() {
    $$(model).x.animate(0, 400, 1000).onDone(() => {
        $$(model).x.animate(400, 0, 1000).onDone(pingPong);
    });
}
pingPong();
```

See [Example 06 — Animation basics](../../examples/06-animation-basics.html)
for a runnable version.

## Replay an existing animation

The single-argument form re-runs an animation against the same property:

```js
const flight = $$(ball).y.animate(0, 250, 800, 'easeOutBounce');
flight.onDone(() => {
    setTimeout(() => $$(ball).y.animate(flight), 500);   // replay after 500ms
});
```

Useful for repeated identical effects without re-allocating animation state.

## Manual control: `KoolAnimation`

| Method | Description |
| --- | --- |
| `.value()` | Current animated value (the latest frame's interpolation) |
| `.onChange(fn)` | `fn(animation, value)` every frame |
| `.onDone(fn)` | `fn(animation, value)` once at completion |
| `.reset()` | Restart from `start` |
| `.start()` | Begin (auto-called once; safe after `stop()`) |
| `.stop()` | Cancel pending frames; no `onDone` fires |

You can construct one without binding it to a property:

```js
const a = koolic.animate(0, 100, 1000, 'easeOutSine');
a.onChange((_, v) => doSomething(v));
```

Or with the class directly:

```js
const a = new KoolicAnimation(0, 100, 1000, 'easeOutSine');
```

## Parallel animations

Multiple properties of the same object can animate at the same time — they
don't conflict:

```js
$$(ball).x.animate(0, 400, 2000, 'easeOutSine');
$$(ball).y.animate(0, 250, 2000, 'easeOutBounce');
```

See [Example 08 — Bouncing ball](../../examples/08-animation-bounce.html).

## Cancelling

```js
const a = $$(model).x.animate(0, 100, 5000);
// ... later
a.stop();   // halts at current value; no further frames or events
```

`onDone` does **not** fire when an animation is stopped.

## Sub-frame precision

Frame timestamps come from `requestAnimationFrame`'s argument. The final
value is **always exactly `stop`**, regardless of frame timing — no near-miss
floats from interpolation drift.

## See also

- [Easings](easings.md) — pick or define a curve.
- [Example 06](../../examples/06-animation-basics.html), [07](../../examples/07-animation-easings.html), [08](../../examples/08-animation-bounce.html), [09](../../examples/09-animation-segmented.html)
