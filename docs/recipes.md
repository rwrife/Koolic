# Recipes

Short, self-contained patterns for common UI tasks. Each recipe is a complete
snippet — paste into an HTML file with `koolic.js` (and `koolic.animate.js`
where indicated) loaded.

---

## 1. Form state mirrored to a model

```html
<form id="signup">
    <input name="email" />
    <input name="password" type="password" />
    <input name="agree" type="checkbox" />
</form>
<pre id="state"></pre>

<script>
    const form = { email: '', password: '', agree: false };

    $$('input[name=email]').bind($$(form).email);
    $$('input[name=password]').bind($$(form).password);
    $$('input[name=agree]').bind($$(form).agree, 'checked');

    // Render the model live whenever anything changes.
    $$(state => state).bind(
        $$(form).email, $$(form).password, $$(form).agree
    );
    // ...or simpler:
    function show() { document.getElementById('state').textContent = JSON.stringify(form, null, 2); }
    $$(show).bind($$(form).email, $$(form).password, $$(form).agree);
</script>
```

## 2. Computed/derived value

> Use **function binding** when one value depends on others.

```js
const cart = { qty: 1, price: 9.99 };
function recompute(qty, price) {
    cart.total = qty * price;
}
$$(recompute).bind($$(cart).qty, $$(cart).price);

// later
cart.qty = 3;          // cart.total automatically updates to 29.97
```

## 3. Validation indicator

```html
<input id="email" />
<span id="ok" style="color:green; display:none">✓</span>
<span id="bad" style="color:red; display:none">enter a valid email</span>

<script>
    const form = { email: '' };
    $$('#email').bind($$(form).email);

    function validate(email) {
        const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
        document.getElementById('ok').style.display  = ok ? 'inline' : 'none';
        document.getElementById('bad').style.display = (email && !ok) ? 'inline' : 'none';
    }
    $$(validate).bind($$(form).email);
</script>
```

## 4. Two inputs, locked to the same model

```html
<input id="a" />
<input id="b" />

<script>
    const model = { name: '' };
    $$('#a').bind($$(model).name);
    $$('#b').bind($$(model).name);
    // typing in either input updates the other through the model.
</script>
```

## 5. Live color picker

```html
<input id="color" value="cornflowerblue" />
<div id="swatch" style="width:100%;height:100px;border-radius:6px"></div>

<script>
    const style = { color: 'cornflowerblue' };
    $$('#color').bind($$(style).color);
    $$('#swatch').bind($$(style).color, 'style.backgroundColor');
</script>
```

## 6. Reveal/hide based on a flag

```js
const state = { showAdvanced: false };

$$(state).showAdvanced.onChange((_, on) => {
    if (on) $$('#advanced').show();
    else    $$('#advanced').hide();
});

document.getElementById('toggle').onclick = () => {
    state.showAdvanced = !state.showAdvanced;
};
```

## 7. Animated reveal (requires `koolic.animate.js`)

```html
<div id="panel" style="overflow:hidden;height:0">…content…</div>
<button id="toggle">Toggle</button>

<script>
    const panel = { h: 0 };
    $$('#panel').bind($$(panel).h, 'style.height', '', 'px');

    let open = false;
    document.getElementById('toggle').onclick = () => {
        open = !open;
        $$(panel).h.animate(panel.h, open ? 200 : 0, 300, 'easeInOutSine');
    };
</script>
```

## 8. Parallax (parallel animations at different rates)

```js
const scene = { bg: 0, mid: 0, fg: 0 };

$$('#layer-bg').bind($$(scene).bg, 'left');
$$('#layer-mid').bind($$(scene).mid, 'left');
$$('#layer-fg').bind($$(scene).fg, 'left');

document.getElementById('pan').onclick = () => {
    $$(scene).bg.animate(0, 100, 2000, 'easeInOutSine');
    $$(scene).mid.animate(0, 250, 2000, 'easeInOutSine');
    $$(scene).fg.animate(0, 500, 2000, 'easeInOutSine');
};
```

## 9. Bouncing ball with horizontal travel

```html
<div id="ball" style="position:absolute;width:40px;height:40px;border-radius:50%;background:#c0392b"></div>

<script>
    const ball = { x: 0, y: 0 };
    $$('#ball').bind($$(ball).x, 'left');
    $$('#ball').bind($$(ball).y, 'top');

    function hop() {
        ball.x = 0; ball.y = 0;
        $$(ball).x.animate(0, 600, 2000, 'easeOutSine');
        $$(ball).y.animate(0, 260, 2000, 'easeOutBounce');
    }
</script>
```

## 10. Slow-in, linear, slow-out using segmented easing

> The "feels professional" curve for medium-distance moves.

```js
$$(panel).x.animate(0, 800, 1500, [
    { to: 0.15, easing: 'easeInQuad'  },
    { to: 0.85, easing: 'linear'       },
    { to: 1.00, easing: 'easeOutQuad' }
]);
```

## 11. Rotating element via prefix/suffix

```js
const ani = { rot: 0 };
$$('#dial').bind($$(ani).rot, 'style.transform', 'rotate(', 'deg)');

$$(ani).rot.animate(0, 360, 1000, 'easeInOutSine');
```

## 12. Loop an animation

```js
function loop() {
    $$(model).x.animate(0, 100, 800).onDone(() => {
        $$(model).x.animate(100, 0, 800).onDone(loop);
    });
}
loop();
```

To stop mid-loop, hold on to the latest `KoolAnimation` and call `.stop()`,
plus a guard flag in your scheduling code.

## 13. Conditional binding (bind only some of the time)

There's no built-in "unbind". The cleanest pattern is to bind to a
*proxy* property and toggle whether your handler propagates the value:

```js
const real = { x: 0 };
const proxy = { x: 0, enabled: true };

$$(real).x.onChange((_, n) => { if (proxy.enabled) proxy.x = n; });
$$(proxy).x.onChange((_, n) => { if (proxy.enabled) real.x = n; });

proxy.enabled = false;   // bindings now silently no-op
```

## 14. Save & restore (snapshot a wrapped object)

The wrapped object is still serializable — `JSON.stringify(person)` works
normally:

```js
const snapshot = JSON.stringify(person);
// ... later
Object.assign(person, JSON.parse(snapshot));
// Each property write fires change events as expected.
```

## See also

- [Examples](../examples) — runnable HTML versions of many of these.
- [API reference](api.md) — every method.
