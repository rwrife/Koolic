# DOM Binding

> Link a DOM element to a reactive property. Two-way for inputs, one-way
> for everything else.

## Quick reference

```js
$$('#input').bind($$(person).name);                       // default attribute
$$('#div').bind($$(person).name, 'innerText');             // explicit attribute
$$('#box').bind($$(style).color, 'style.backgroundColor'); // dotted-path attribute
$$('#box').bind($$(model).x, 'left');                      // style alias + auto 'px'
$$('#input').bind($$(model).age, 'placeholder', '> ', '');  // prefix / suffix
$$('#input').bind(person, 'name');                          // shorthand for $$(person).name
```

## Selecting elements

```js
$$('#single')          // single match  -> KoolElement
$$('.many')            // many matches  -> Array<KoolElement>
$$(domNode)            // existing node -> KoolElement
```

If the selector matches nothing, `$$()` returns `undefined`.

## Default attributes

If you don't specify which attribute to bind, Koolic picks one based on the
element type:

| Element | Default |
| --- | --- |
| `<input>` | `value` |
| `<select>` | `value` |
| `<textarea>` | `value` |
| Any other `HTMLElement` | `innerHTML` |
| Plain DOM node | `innerText` |

So in 90% of cases you just write `$$('#field').bind($$(obj).x)` and it
"does the right thing".

## Style aliases

Four shortcut names auto-translate to `style.<name>` **and** add a `px`
suffix:

| You write | Expands to | Suffix |
| --- | --- | --- |
| `'left'` | `'style.left'` | `'px'` |
| `'top'` | `'style.top'` | `'px'` |
| `'right'` | `'style.right'` | `'px'` |
| `'bottom'` | `'style.bottom'` | `'px'` |

```js
$$('#box').bind($$(model).x, 'left');
// sets element.style.left = `${model.x}px`
```

Other style properties take their full dotted path with no suffix:

```js
$$('#box').bind($$(s).color, 'style.backgroundColor');
$$('#box').bind($$(s).opacity, 'style.opacity');
$$('#box').bind($$(s).rot, 'style.transform', 'rotate(', 'deg)');
```

## Prefix and suffix

The 3rd and 4th arguments wrap the value on the way to the DOM and are
stripped on the way back:

```js
$$('#box').bind($$(s).w, 'style.width', '', '%');
// model.w = 25  ->  style.width = '25%'

$$('#box').bind($$(m).rot, 'style.transform', 'rotate(', 'deg)');
// model.rot = 45  ->  style.transform = 'rotate(45deg)'
```

## Two-way binding for inputs

For form controls (`<input>`, `<select>`, `<textarea>`) bound on `value` or
`checked`, Koolic listens for the native `input` and `change` events. As the
user types, the bound property updates.

> ⚠️ **Programmatic mutation of `el.value` does not trigger `input` in any
> browser.** If your code sets the value directly, dispatch the event
> yourself:
>
> ```js
> input.value = 'new';
> input.dispatchEvent(new Event('input', { bubbles: true }));
> ```
>
> This matches the way every modern framework handles the same case.

For non-input elements, the binding is one-way (property → DOM).

## Multiple bindings to one property

A single property can drive any number of DOM bindings — they all stay in
sync:

```js
const person = { name: 'Ryan' };

$$('#a').bind($$(person).name);
$$('#b').bind($$(person).name);
$$('#greeting').bind($$(person).name);

person.name = 'Bob';   // all three update
```

## Initial sync

When you call `bind()`:

- If the property's current value is **not null/undefined**, it's written to
  the element.
- Otherwise, Koolic reads the element's current attribute value and writes it
  into the property (so existing DOM content seeds the model).

## `KoolElement` methods

Beyond `.bind()`, the wrapper provides:

| Method | Description |
| --- | --- |
| `.text([t])` | Get/set `textContent` |
| `.html([h])` | Get/set `innerHTML` |
| `.hide()` | Remember current `display`, set to `'none'` |
| `.show()` | Restore the remembered `display` |
| `.parent()` | Wrapped parent element |
| `.on(evt, fn)` | Add event listener |
| `.off(evt, fn)` | Remove event listener |
| `.el` | The raw DOM node |

## See also

- [Example 03 — DOM binding](../../examples/03-dom-binding.html)
- [Example 04 — Style binding](../../examples/04-style-binding.html)
- [Property binding](property-binding.md)
