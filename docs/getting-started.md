# Getting Started

This page walks you from zero to a working two-way data binding in about five
minutes. No build step, no package manager, no framework.

## 1. Install

Drop the two files into your project's `js/` folder and reference them from
your HTML:

```html
<!doctype html>
<html>
<head>
    <script src="js/koolic.js"></script>
    <!-- Optional - only needed if you use .animate() -->
    <script src="js/koolic.animate.js"></script>
</head>
<body>
    ...
</body>
</html>
```

That's it. Koolic exposes two globals:

- `koolic` — the library namespace.
- `$$` — alias for `koolic`. Use whichever you prefer.

## 2. Your first reactive object

Wrap any plain JavaScript object. The wrapper makes its properties
**observable** — you can listen for changes, and you can bind them to other
properties or to the DOM.

```js
const person = { name: 'Ryan', age: 21 };

// Listen for changes to person.name
$$(person).name.onChange((oldValue, newValue) => {
    console.log(`name changed from ${oldValue} to ${newValue}`);
});

// Mutate as you normally would. Koolic notices.
person.name = 'Bob';
// -> "name changed from Ryan to Bob"
```

Two important properties of this design:

1. **`person.name` is still a plain string.** No `.value()` calls needed when
   you're using it as data — `person.name.toUpperCase()` works exactly like it
   would on a bare object.
2. **`$$(person).name` is a *binding handle*** (a `KoolProperty`), not the
   value. Use it when you want to attach behavior: listening, binding, or
   animating.

## 3. Your first DOM binding

Two-way bind an input element to a property:

```html
<input id="nameField" />
<p>Hello, <span id="greeting"></span>!</p>

<script>
    const person = { name: 'Ryan' };

    $$('#nameField').bind($$(person).name);   // input value <-> person.name
    $$('#greeting').bind($$(person).name);    // span text <-> person.name
</script>
```

Open this page in a browser and type in the input. The greeting updates as you
type. Set `person.name = "Alice"` from the console — the input and the
greeting both change instantly.

## 4. Your first property-to-property binding

Bind two object properties together so they always have the same value:

```js
const person = { name: 'Ryan' };
const employee = { name: 'John' };

$$(employee).name.bind($$(person).name);
// Initial sync: the argument wins. employee.name is now "Ryan".

person.name = 'Bob';       // employee.name is now "Bob"
employee.name = 'Sue';     // person.name is now "Sue"
```

## 5. Your first animation

```html
<script src="js/koolic.js"></script>
<script src="js/koolic.animate.js"></script>

<div id="box" style="position:relative;width:40px;height:40px;background:red;"></div>

<script>
    const model = { x: 0 };
    $$('#box').bind($$(model).x, 'left');  // 'left' is sugar for 'style.left' + 'px'

    // Animate from 0 to 400 over 1 second, with a bounce.
    $$(model).x.animate(0, 400, 1000, 'easeOutBounce');
</script>
```

## 6. Where to next?

You now know the four core patterns:

- **Observe** a property with `.onChange()`.
- **Bind** two properties together with `$$(a).x.bind($$(b).y)`.
- **Bind** a DOM element to a property with `$$('selector').bind(...)`.
- **Animate** a property with `.animate(start, stop, duration, easing)`.

Go deeper with the topic guides:

- [Reactive objects](guide/reactive-objects.md)
- [Property binding](guide/property-binding.md)
- [DOM binding](guide/dom-binding.md)
- [Function binding](guide/function-binding.md)
- [Animation](guide/animation.md)
- [Easings](guide/easings.md)

Or browse the [recipe book](recipes.md) for complete patterns.
