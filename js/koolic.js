/*!
 * Koolic 2.0 — base library
 *
 * Simple data-binding library for HTML. Event-driven (no polling).
 *
 *   $$(plainObject)        -> Proxy facade; properties are KoolProperty handles
 *   $$('css selector')     -> KoolElement | KoolElement[]
 *   $$(domElement)         -> KoolElement
 *   $$(function)           -> KoolFunction
 *
 *   plainObj.name = "x"    -> intercepted, fires change, updates bound targets
 *   $$(plainObj).name.bind($$(otherObj).other)
 *   $$('input').bind($$(person).name)        // two-way DOM binding
 *   $$('#box').bind($$(s).color, 'style.backgroundColor')
 *
 * The library is dual-published:
 *   - In a browser, it attaches to window.koolic / window.$$ and exposes the
 *     legacy KoolicElement / KoolicObject / KoolicProperty / KoolicFunction.
 *   - Under CommonJS (e.g. jest+jsdom) it also exports the same API.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (typeof window !== 'undefined') {
        window.koolic = api.koolic;
        window.$$ = api.koolic;
        window.KoolicElement = api.KoolElement;
        window.KoolicObject = api.KoolObject;
        window.KoolicProperty = api.KoolProperty;
        window.KoolicFunction = api.KoolFunction;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---- type helpers ----------------------------------------------------

    function IsPlainObject(o) {
        if (o === null || typeof o !== 'object') return false;
        if (typeof Node !== 'undefined' && o instanceof Node) return false;
        if (typeof EventTarget !== 'undefined' && o instanceof EventTarget) return false;
        if (Array.isArray(o)) return false;
        var proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
    }
    function IsDOMElement(o) { return typeof Node !== 'undefined' && o instanceof Node; }
    function IsDOMObject(o) { return typeof EventTarget !== 'undefined' && o instanceof EventTarget; }
    function IsListObject(o) {
        return Array.isArray(o) || (typeof NodeList !== 'undefined' && o instanceof NodeList);
    }
    function IsFunction(o) { return typeof o === 'function'; }
    function IsNumber(o) {
        if (typeof o === 'number') return isFinite(o);
        if (typeof o === 'string' && o.length > 0) return /^-?[\d.]+(?:e-?\d+)?$/.test(o);
        return false;
    }
    function IsString(o) { return typeof o === 'string' || o instanceof String; }

    // ---- objVal: dotted-path get/set ------------------------------------

    function objVal(obj, path, val) {
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (cur == null) return undefined;
            cur = cur[parts[i]];
        }
        if (cur == null) return undefined;
        var last = parts[parts.length - 1];
        if (arguments.length >= 3) { cur[last] = val; return true; }
        return cur[last];
    }

    // ---- ready -----------------------------------------------------------

    var readyList = [];
    var readyFired = false;
    var readyInstalled = false;

    function fireReady() {
        if (readyFired) return;
        readyFired = true;
        for (var i = 0; i < readyList.length; i++) {
            readyList[i].fn.call(typeof window !== 'undefined' ? window : null, readyList[i].ctx);
        }
        readyList = [];
    }

    function ready(callback, context) {
        if (readyFired) { setTimeout(function () { callback(context); }, 1); return; }
        readyList.push({ fn: callback, ctx: context });
        if (typeof document === 'undefined') return;
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(fireReady, 1);
        } else if (!readyInstalled) {
            document.addEventListener('DOMContentLoaded', fireReady, false);
            window.addEventListener('load', fireReady, false);
            readyInstalled = true;
        }
    }

    // ---- KoolProperty ----------------------------------------------------
    //
    // A handle to a single property on a KoolObject. Reads and writes pass
    // through the underlying object (which is itself instrumented with
    // defineProperty), so:
    //
    //   person.name = "x"   <=>   $$(person).name.value("x")
    //
    // produce identical results and identical change notifications.

    function KoolProperty(koolObject, name) {
        this._obj = koolObject;        // KoolObject wrapper (has ._raw, ._listeners)
        this._name = name;
        this._onchange = [];
        this._bindings = [];           // KoolProperty handles bound to this one
    }

    KoolProperty.prototype.parent = function () { return this._obj; };

    KoolProperty.prototype.value = function (v) {
        if (arguments.length === 0) return this._obj._raw[this._name];
        // Going through the setter triggers defineProperty, which calls _notify.
        this._obj._raw[this._name] = v;
        return true;
    };

    KoolProperty.prototype.isInteger = function () {
        var n = this.value();
        return typeof n === 'number' && isFinite(n) && Math.floor(n) === n;
    };

    KoolProperty.prototype.isFloat = function () {
        var n = this.value();
        return typeof n === 'number' && isFinite(n) && Math.floor(n) !== n;
    };

    KoolProperty.prototype.onChange = function (fn) {
        if (arguments.length === 0) return this._onchange.slice();
        if (IsFunction(fn)) { this._onchange.push(fn); return true; }
        return false;
    };

    // Two-way property<->property binding.
    // Loop-avoidance: a per-update origin token + Object.is equality check.
    KoolProperty.prototype.bind = function (other, property) {
        var self = this;
        if (IsPlainObject(other) && arguments.length === 2) {
            return this.bind(koolic(other)[property]);
        }
        if (!(other instanceof KoolProperty)) return false;

        // Already bound? no-op.
        for (var i = 0; i < this._bindings.length; i++) {
            if (this._bindings[i] === other) return this;
        }

        // Sync initial value: caller's side wins.
        if (this.value() !== other.value()) {
            this.value(other.value());
        }

        var token = null;
        var fromOther = function (oldV, newV, origin) {
            if (origin === token) return; // ignore echo
            if (Object.is(self.value(), newV)) return;
            token = origin || {};
            self.value(newV);
            token = null;
        };
        var fromSelf = function (oldV, newV, origin) {
            if (origin === token) return;
            if (Object.is(other.value(), newV)) return;
            token = origin || {};
            other.value(newV);
            token = null;
        };

        other._onchange.push(fromOther);
        this._onchange.push(fromSelf);

        this._bindings.push(other);
        other._bindings.push(this);
        return this;
    };

    // ---- KoolObject -----------------------------------------------------
    //
    // Instrument every own property of the underlying object with
    // defineProperty get/set hooks, recursively wrapping nested plain
    // objects. The wrapper itself is internal; users interact through the
    // Proxy facade returned by koolic(plainObject), which yields
    // KoolProperty handles on attribute access.

    var KOOL_OBJ = '__koolic__';
    var INSTRUMENTED = '__koolic_instrumented__';

    function KoolObject(raw, parent, parentKey) {
        this._raw = raw;
        this._parent = parent || null;
        this._parentKey = parentKey || null;
        this._properties = Object.create(null);   // name -> KoolProperty
        this._children = Object.create(null);     // name -> KoolObject (nested)
        this._listeners = [];                     // (name, oldV, newV) listeners

        Object.defineProperty(raw, KOOL_OBJ, { value: this, enumerable: false, configurable: true });
        this._instrument();
    }

    KoolObject.prototype._instrument = function () {
        var raw = this._raw;
        if (raw[INSTRUMENTED]) return;
        Object.defineProperty(raw, INSTRUMENTED, { value: true, enumerable: false, configurable: true });

        var self = this;
        var ownNames = Object.keys(raw);
        for (var i = 0; i < ownNames.length; i++) {
            this._instrumentProp(ownNames[i]);
        }
    };

    KoolObject.prototype._instrumentProp = function (name) {
        var raw = this._raw;
        var self = this;
        var initial = raw[name];

        if (IsPlainObject(initial)) {
            this._children[name] = new KoolObject(initial, this, name);
        }

        // Backing store lives on a hidden slot so the defineProperty
        // accessor doesn't recurse.
        var slotKey = '__k_' + name;
        Object.defineProperty(raw, slotKey, {
            value: initial, writable: true, enumerable: false, configurable: true
        });

        Object.defineProperty(raw, name, {
            configurable: true,
            enumerable: true,
            get: function () { return raw[slotKey]; },
            set: function (v) {
                var old = raw[slotKey];
                if (Object.is(old, v)) return;
                // If the new value is a plain object, wrap it too.
                if (IsPlainObject(v)) {
                    raw[slotKey] = v;
                    self._children[name] = new KoolObject(v, self, name);
                } else {
                    raw[slotKey] = v;
                    if (self._children[name]) delete self._children[name];
                }
                self._notify(name, old, v);
            }
        });
    };

    KoolObject.prototype._notify = function (name, oldV, newV) {
        // Property-level listeners
        var prop = this._properties[name];
        if (prop) {
            var listeners = prop._onchange.slice();
            for (var i = 0; i < listeners.length; i++) {
                listeners[i](oldV, newV);
            }
        }
        // Object-level listeners (used by examples/docs; cheap)
        for (var j = 0; j < this._listeners.length; j++) {
            this._listeners[j](name, oldV, newV);
        }
        // Bubble to parent
        if (this._parent) this._parent._notify(this._parentKey + '.' + name, oldV, newV);
    };

    KoolObject.prototype.on = function (handler) {
        if (IsFunction(handler)) this._listeners.push(handler);
        return this;
    };
    KoolObject.prototype.off = function (handler) {
        var idx = this._listeners.indexOf(handler);
        if (idx >= 0) this._listeners.splice(idx, 1);
        return this;
    };

    KoolObject.prototype.prop = function (name) {
        if (this._children[name]) return koolic(this._children[name]._raw);
        if (!this._properties[name]) {
            // Allow creating handles on properties not present at wrap time.
            if (!Object.prototype.hasOwnProperty.call(this._raw, name)) {
                this._raw[name] = undefined;
                this._instrumentProp(name);
            }
            this._properties[name] = new KoolProperty(this, name);
        }
        return this._properties[name];
    };

    function makeFacade(koolObj) {
        return new Proxy(koolObj, {
            get: function (target, prop) {
                if (prop === '_koolObject') return target;
                if (prop in target && typeof target[prop] === 'function') return target[prop].bind(target);
                if (typeof prop === 'symbol') return target[prop];
                return target.prop(prop);
            }
        });
    }

    // ---- KoolElement -----------------------------------------------------

    function KoolElement(element) {
        this.el = element;
    }

    KoolElement.prototype.parent = function () {
        return this.el.parentNode ? new KoolElement(this.el.parentNode) : null;
    };

    KoolElement.prototype.hide = function () {
        if (typeof this._originalDisplay === 'undefined') {
            this._originalDisplay = this.el.style.display || '';
        }
        this.el.style.display = 'none';
        return this;
    };

    KoolElement.prototype.show = function () {
        this.el.style.display = (this._originalDisplay && this._originalDisplay !== 'none')
            ? this._originalDisplay : '';
        return this;
    };

    KoolElement.prototype.text = function (t) {
        if (arguments.length === 0) return this.el.innerText !== undefined ? this.el.innerText : this.el.textContent;
        if (this.el.innerText !== undefined) this.el.innerText = t;
        else this.el.textContent = t;
        return this;
    };

    KoolElement.prototype.html = function (h) {
        if (arguments.length === 0) return this.el.innerHTML;
        this.el.innerHTML = h;
        return this;
    };

    KoolElement.prototype.on = function (evt, handler) { this.el.addEventListener(evt, handler, false); return this; };
    KoolElement.prototype.off = function (evt, handler) { this.el.removeEventListener(evt, handler, false); return this; };

    // DOM <-> property binding.
    //
    // Signatures supported (matching 1.x):
    //   bind(koolProperty)                                 default attr
    //   bind(koolProperty, attr)
    //   bind(koolProperty, attr, prefix, suffix)
    //   bind(plainObj, propName)                           shorthand
    //   bind(plainObj, propName, attr)
    //   bind(plainObj, propName, attr, prefix, suffix)
    var STYLE_ALIAS = { left: 'style.left', top: 'style.top', right: 'style.right', bottom: 'style.bottom' };
    var STYLE_PX_SUFFIX = { 'style.left': 'px', 'style.top': 'px', 'style.right': 'px', 'style.bottom': 'px' };

    KoolElement.prototype.bind = function (bindable, attrOrProp, a, b) {
        var args = Array.prototype.slice.call(arguments);
        if (IsPlainObject(bindable)) {
            var propName = args[1];
            var rest = args.slice(2);
            return this.bind.apply(this, [koolic(bindable)[propName]].concat(rest));
        }
        if (!(bindable instanceof KoolProperty)) return false;

        var attr = args[1];
        var prefix = args[2] || '';
        var suffix = args[3] || '';

        var defaultAttr = 'innerText';
        if (typeof HTMLInputElement !== 'undefined' && this.el instanceof HTMLInputElement) defaultAttr = 'value';
        else if (typeof HTMLSelectElement !== 'undefined' && this.el instanceof HTMLSelectElement) defaultAttr = 'value';
        else if (typeof HTMLTextAreaElement !== 'undefined' && this.el instanceof HTMLTextAreaElement) defaultAttr = 'value';
        else if (typeof HTMLElement !== 'undefined' && this.el instanceof HTMLElement) defaultAttr = 'innerHTML';
        if (typeof attr === 'undefined') attr = defaultAttr;

        if (STYLE_ALIAS[attr]) {
            attr = STYLE_ALIAS[attr];
            if (!suffix) suffix = STYLE_PX_SUFFIX[attr] || '';
        }

        var el = this.el;
        var token = null;

        function writeToEl(v) {
            objVal(el, attr, prefix + (v == null ? '' : v) + suffix);
        }
        function readFromEl() {
            var raw = objVal(el, attr);
            if (typeof raw === 'string') {
                if (prefix && raw.indexOf(prefix) === 0) raw = raw.slice(prefix.length);
                if (suffix && raw.length >= suffix.length && raw.slice(-suffix.length) === suffix) raw = raw.slice(0, -suffix.length);
            }
            return raw;
        }

        // Initial sync: property wins if it has a non-null value, else DOM seeds property.
        if (bindable.value() != null) {
            writeToEl(bindable.value());
        } else {
            var seed = readFromEl();
            if (seed !== '' && seed != null) bindable.value(seed);
        }

        bindable.onChange(function (o, n, origin) {
            if (origin === token) return;
            token = {};
            writeToEl(n);
            token = null;
        });

        var isInput = (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) ||
                      (typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement) ||
                      (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement);
        if (isInput && (attr === 'value' || attr === 'checked')) {
            var onDomChange = function () {
                var v = readFromEl();
                if (Object.is(bindable.value(), v)) return;
                token = {};
                bindable.value(v);
                token = null;
            };
            el.addEventListener('input', onDomChange, false);
            el.addEventListener('change', onDomChange, false);
        }

        return this;
    };

    // ---- KoolFunction ----------------------------------------------------

    function KoolFunction(fn) {
        this._fn = fn;
        this._before = [];
        this._after = [];
        this._value = undefined;
    }
    KoolFunction.prototype.beforeExec = function (fn) { if (IsFunction(fn)) this._before.push(fn); return this; };
    KoolFunction.prototype.afterExec = function (fn) { if (IsFunction(fn)) this._after.push(fn); return this; };
    KoolFunction.prototype.value = function () { return this._value; };
    KoolFunction.prototype.exec = function () {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            args.push(a instanceof KoolProperty ? a.value() : a);
        }
        for (var b = 0; b < this._before.length; b++) this._before[b].apply(null, args);
        this._value = this._fn.apply(null, args);
        for (var c = 0; c < this._after.length; c++) this._after[c].apply(null, args);
        return this._value;
    };
    KoolFunction.prototype.bind = function () {
        var self = this;
        var props = Array.prototype.slice.call(arguments);
        for (var i = 0; i < props.length; i++) {
            if (!(props[i] instanceof KoolProperty)) return false;
        }
        function reinvoke() { self.exec.apply(self, props); }
        for (var j = 0; j < props.length; j++) {
            props[j].onChange(reinvoke);
        }
        // Fire once with initial values.
        reinvoke();
        return this;
    };

    // ---- entrypoint ------------------------------------------------------

    function koolic(selector) {
        if (selector == null) return undefined;

        // string -> querySelectorAll
        if (typeof selector === 'string') {
            if (typeof document === 'undefined') return undefined;
            var nodes = document.querySelectorAll(selector);
            if (nodes.length === 0) return undefined;
            if (nodes.length === 1) return new KoolElement(nodes[0]);
            var out = [];
            for (var i = 0; i < nodes.length; i++) out.push(new KoolElement(nodes[i]));
            return out;
        }

        if (IsDOMElement(selector)) return new KoolElement(selector);

        if (IsFunction(selector)) return new KoolFunction(selector);

        if (IsPlainObject(selector)) {
            var existing = selector[KOOL_OBJ];
            var ko = existing || new KoolObject(selector);
            // Cache the facade on the KoolObject itself.
            if (!ko._facade) ko._facade = makeFacade(ko);
            return ko._facade;
        }

        return undefined;
    }

    // type helpers exposed as static-style API
    koolic.IsPlainObject = IsPlainObject;
    koolic.IsDOMObject = IsDOMObject;
    koolic.IsDOMElement = IsDOMElement;
    koolic.IsListObject = IsListObject;
    koolic.IsFunction = IsFunction;
    koolic.IsNumber = IsNumber;
    koolic.IsString = IsString;
    koolic.objVal = objVal;
    koolic.ready = ready;
    koolic.find = koolic; // legacy alias

    return {
        koolic: koolic,
        KoolObject: KoolObject,
        KoolProperty: KoolProperty,
        KoolElement: KoolElement,
        KoolFunction: KoolFunction
    };
});
