# Easings

> Easing functions shape an animation's curve. They are pure functions of
> normalized time: `f(t)` with `t` in `[0, 1]` returning a value in `[0, 1]`.

## Picking a built-in

Pass a name as the 4th argument to `.animate()`:

```js
$$(model).x.animate(0, 100, 1000, 'easeOutBounce');
```

### The full set

All built-ins satisfy `f(0) === 0` and `f(1) === 1`.

| Name | Feel | Typical use |
| --- | --- | --- |
| `linear` | Constant velocity. | Progress bars, parallax background drift. |
| `easeInSine` | Gentle, accelerating. | "Drawer pulls itself open". |
| `easeOutSine` | Gentle, decelerating. | Settle into final position. |
| `easeInOutSine` | Smooth both ends. | Default "feels nice" choice for short moves. |
| `easeInQuad` | Sharper accelerate. | Object launching. |
| `easeOutQuad` | Sharper decelerate. | Object landing. |
| `easeInOutQuad` | Sharper both ends than sine. | Punchy panel transitions. |
| `easeInCubic` | Steeper still. | Dramatic dives. |
| `easeOutCubic` | Steeper still. | Snappy stops. |
| `easeInOutCubic` | Crispest "S" curve. | Snappy panel transitions. |
| `easeOutBounce` | 4-bounce decay. | Falling objects, drop notifications. |
| `easeOutElastic` | Overshoot + oscillate. | "Pop" on appearance. |

### Live comparison

See [Example 07 — Easings side-by-side](../../examples/07-animation-easings.html).

## Custom easing functions

Any function with the signature `(t: number) -> number` works:

```js
// "smoothstep" — classic graphics-shader smooth interpolation
$$(model).x.animate(0, 100, 1000, t => t * t * (3 - 2 * t));

// "anticipate" — back up a little before going forward
$$(model).x.animate(0, 100, 1000, t => {
    const k = 1.7;
    return t * t * ((k + 1) * t - k);
});
```

Constraints (advisory, not enforced):

- `f(0)` should be `0`.
- `f(1)` should be `1`.

Anything in between is up to you. Values outside `[0, 1]` are allowed (this is
how overshoot easings like `easeOutElastic` work — they briefly produce
values slightly above 1).

## Adding to the registry

If you'll reuse a curve, register it once:

```js
koolic.easings.smoothstep = t => t * t * (3 - 2 * t);

// Now usable by name everywhere:
$$(a).x.animate(0, 100, 1000, 'smoothstep');
$$(b).y.animate(0, 50, 500, 'smoothstep');
```

Asking for an unregistered name throws:

```js
$$(model).x.animate(0, 100, 1000, 'no-such-easing');
// Error: koolic.animate: unknown easing 'no-such-easing'
```

## Segmented (piecewise) easing

Compose multiple easings across the timeline by passing an **array of
segments**:

```js
$$(model).x.animate(0, 720, 2500, [
    { to: 0.20, easing: 'easeInSine'  },   // 0..20%   ease-in
    { to: 0.80, easing: 'linear'      },   // 20..80%  cruise
    { to: 1.00, easing: 'easeOutSine' }    // 80..100% ease-out
]);
```

### Rules

- Each segment is `{ to, easing }`.
- `to` is the **upper bound** of the segment as a fraction of total duration,
  in `(0, 1]`.
- `to` values must be **strictly increasing**.
- The last segment must have `to: 1.0` (or 1.0 within floating-point
  tolerance).
- `easing` can be a name string, a function, or another segments array.

Violating any of these throws a descriptive error at animation-creation time
(not at runtime).

### How it works

Each segment's easing function is **scaled into its band** rather than
replayed across the whole timeline. If your timeline is `0..1`:

- Segment 1 occupies `[0.00, 0.20]`. Its easing's full `0..1` curve fits
  exactly inside that 20%-slice.
- Segment 2 occupies `[0.20, 0.80]`. Its easing fits the 60%-slice.
- Segment 3 occupies `[0.80, 1.00]`. Its easing fits the 20%-slice.

This guarantees the overall curve:

- Starts at exactly 0 (`f(0) = 0`).
- Ends at exactly 1 (`f(1) = 1`).
- Is continuous at each boundary (each segment outputs `0` at its `from` and
  `1` at its `to`).

### Useful recipes

**Slow start, fast middle, slow finish** — a more refined linear:

```js
[
    { to: 0.15, easing: 'easeInQuad'   },
    { to: 0.85, easing: 'linear'        },
    { to: 1.00, easing: 'easeOutQuad'  }
]
```

**Bounce then settle** — drop with a bounce, then a tiny elastic wiggle:

```js
[
    { to: 0.55, easing: 'easeOutBounce'  },
    { to: 1.00, easing: 'easeOutElastic' }
]
```

**Stop-and-go** — multiple ramps, like a stuttering scroll:

```js
[
    { to: 0.30, easing: 'easeOutCubic'  },
    { to: 0.55, easing: 'easeInOutSine' },
    { to: 0.75, easing: 'easeOutCubic'  },
    { to: 1.00, easing: 'easeInOutSine' }
]
```

See [Example 09 — Segmented easings](../../examples/09-animation-segmented.html)
for a runnable version of all of these.

## See also

- [Animation guide](animation.md)
- [Example 07](../../examples/07-animation-easings.html) — visual comparison.
- [Example 09](../../examples/09-animation-segmented.html) — segmented in action.
