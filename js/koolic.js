(function() {
    window.koolic = function(selector) {
        return $$.find(selector);
    };

    window.koolic.IsPlainObject = function(obj) { return obj instanceof Object && !(obj instanceof Function || obj.toString() !== '[object Object]' || obj.constructor.name !== 'Object'); };
    window.koolic.IsDOMObject = function(obj) { return obj instanceof EventTarget; };
    window.koolic.IsDOMElement = function(obj) { return obj instanceof Node; };
    window.koolic.IsListObject = function(obj) { return obj instanceof Array || obj instanceof NodeList; };

    window.koolic._koolObjs = [];
    window.koolic._boundObjs = [];

    window.koolic._checkBound = function() {
        if (window.koolic._boundObjs != null && window.koolic._boundObjs.length > 0) {
            for (var i = 0; i < window.koolic._boundObjs.length; i++) {
                var obj = window.koolic._boundObjs[i];
                if (obj.target instanceof KoolicElement) {
                    obj.bindable.setValue(window.koolic.objVal(obj.target.el, obj.targetProperty));
                } else {
                    obj.bindable.setValue(window.koolic.objVal(obj.target, obj.targetProperty));
                }
                obj.bindable.validateObject();
            }
        }
        setTimeout(koolic._checkBound, 10);
    }

    setTimeout(koolic._checkBound, 10);

    if (typeof Array.prototype.indexOf !== "function") {
        Array.prototype.indexOf = function(item) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === item) {
                    return i;
                }
            }
            return -1;
        };
    }

    window.koolic.objVal = function(object, prop, val) {
        var props = prop.split('.');
        if (props.length > 1) {
            var proplist = '';
            for (var i = 1; i < props.length; i++) {
                proplist += props[i] + (i < props.length - 1 ? '.' : '');
            }
            return window.koolic.objVal(object[props[0]], proplist, val);
        } else {

            if (typeof val !== 'undefined') {
                object[props[0]] = val;
                return true;
            } else {
                return object[props[0]];
            }


        }
        return null;
    }

    window.$$ = window.koolic;
})();



(function(koolic) {
    koolic.find = function(selector) {
        if (selector != null && typeof selector === 'string' && selector.length > 0) {
            var elements = document.querySelectorAll(selector);
            if (elements.length == 1) { return new KoolicElement(elements[0]); } else {
                var kools = [];
                for (var i = 0; i < elements.length; i++) {

                    kools.push(new KoolicElement(elements[i]));
                }
                return kools;
            }
        } else if (selector != null && $$.IsPlainObject(selector)) {
            return new KoolicObject(selector);
        }
    };
})(window.koolic);


function KoolicElement(element) {
    var _originalDisplay = element.style.display;

    this.el = element;

    this.length = 0;

    this.hide = function() {
        element.style.display = 'none';
        return true;
    };

    this.show = function() {
        element.style.display = (_originalDisplay == 'none' ? 'inline-block' : _originalDisplay);
        return true;
    };

    this.parent = function() {
        return this.el.parentNode;
    };

    this.text = function(text) {
        if (typeof text !== "undefined") {
            this.el.innerText = text;
        } else {
            return this.el.innerText;
        }
    };

    this.html = function(html) {
        if (typeof html !== "undefined") {
            this.el.innerHTML = html;
        } else {
            return this.el.innerHTML;
        }
    };

    this.bind = function(koolicBindable, property) {
        if (!(koolicBindable instanceof KoolicBindable)) return false;
        var defaultProp = 'innerText';

        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
            defaultProp = 'value';
        } else if (element instanceof HTMLElement) {
            defaultProp = 'innerHTML';
        };

        var prop = (typeof property === 'undefined' ? defaultProp : property);

        if (koolicBindable.value != null) { //ehh??
            element[prop] = koolicBindable.value;
        } else {
            koolicBindable.value = element[prop];
        }
        koolic._boundObjs.push(new KoolicBinding(koolicBindable, this, prop));
        koolicBindable.bind(this, prop);
        return true;
    };
}

function KoolicBinding(koolicBindable, targetObject, targetProperty) {
    this.bindable = {};
    this.target = {};
    this.targetProperty = '';

    this.bindable = koolicBindable;
    this.target = targetObject;
    this.targetProperty = targetProperty;

    if (koolicBindable instanceof KoolicBindable) {
        return this;
    } else return null;
}

function KoolicObject(object) {
    for (var i = 0; i < koolic._koolObjs.length; i++) {
        if (koolic._koolObjs[i]._obj == object) {
            return koolic._koolObjs[i];
        }
    }

    this._obj = object;

    this.GetObject = function() { return _obj; };

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            if (typeof object[property] === "string" || typeof object[property] === "number") {
                this[property] = new KoolicBindable(object, property);
            } else if (typeof object[property] === "object") {
                this[property] = new KoolicObject(object[property]);
            } else {
                this[property] = object[property];
            }
        }
    }

    koolic._koolObjs.push(this);
};

function KoolicBindable(object, property) {
    var _name = property,
        _obj = object,
        _oldval = object[property],
        _notify = [];

    var bindable = this;

    this.value = object[property];

    var hasChange = function() {
        if (_oldval != koolic.objVal(_obj, _name) || koolic.objVal(_obj, _name) != this.value) return true;
        else return false;
    }

    this.validateObject = function() {
        if (!hasChange()) {
            for (var i = 0; i < _notify.length; i++) {
                var bnd = _notify[i];
                if (koolic.objVal(bnd.target, bnd.targetProperty) != this.value) {
                    this.setValue(koolic.objVal(bnd.target, bnd.targetProperty));
                    break; //1st change wins
                }
            }
        } else if (hasChange()) {
            if (this.value != _oldval) {
                this.setValue(this.value);
                _oldval = this.value;
            } else if (koolic.objVal(_obj, _name) != this.value) {
                this.setValue(koolic.objVal(_obj, _name));
            }
        }
    }

    this.setValue = function(value) {
        if (value != this.value) {
            koolic.objVal(_obj, _name, value);
            this.value = value;
            for (var i = 0; i < _notify.length; i++) {
                var bnd = _notify[i];
                if (bnd.target instanceof KoolicElement) {
                    console.log(bnd.targetProperty);
                    koolic.objVal(bnd.target.el, bnd.targetProperty, value);
                } else if (bnd.target instanceof KoolicBindable) {
                    bnd.target.setValue(value);
                } else {
                    koolic.objVal(bnd.target, bnd.targetProperty, value);
                }
            }

            if (this && this.onchange) {
                this.onchange(_oldval, value);
            }
        }
    }

    this.isBound = function(koolicBindable) {
        for (var i = 0; i < _notify.length; i++) {
            var bindable = _notify[i].target;
            if (bindable === koolicBindable) {
                return true;
            }
        }
        return false;
    }

    this.bind = function(koolicObj, property) {
        if (koolicObj instanceof KoolicElement) {
            var koolBinding = new KoolicBinding(this, koolicObj, property);
            _notify.push(koolBinding);
            return this;
        }

        if (koolicObj instanceof KoolicBindable) {
            this.setValue(koolicObj.value);
            var koolBinding = new KoolicBinding(this, koolicObj, 'value');
            _notify.push(koolBinding);

            if (!koolicObj.isBound(this)) {
                koolicObj.bind(this);
            }

            koolic._boundObjs.push(koolBinding);

            return this;
        }

        return false;
    };
};