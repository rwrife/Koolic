(function() {
    window.koolic = function(selector) {
        return $$.find(selector);
    };

    window.koolic.IsPlainObject = function(obj) { return obj instanceof Object && !(obj instanceof Function || obj.toString() !== '[object Object]' || obj.constructor.name !== 'Object'); };
    window.koolic.IsDOMObject = function(obj) { return obj instanceof EventTarget; };
    window.koolic.IsDOMElement = function(obj) { return obj instanceof Node; };
    window.koolic.IsListObject = function(obj) { return obj instanceof Array || obj instanceof NodeList; };
    window.koolic.IsFunction = function(obj) { var getType = {}; return typeof obj !== 'undefined' && obj && getType.toString.call(obj) === '[object Function]'; };
    window.koolic.IsNumber = function(obj) { return /^-?[\d.]+(?:e-?\d+)?$/.test(obj); };
    window.koolic.IsString = function(obj) { return typeof o == "string" || (typeof o == "object" && o.constructor === String); }

    window.koolic._elems = [];
    window.koolic._objs = [];
    window.koolic._props = [];


    window.koolic._frameTimer = function() {
        for (var i = 0; i < koolic._props.length; i++) {
            koolic._props[i].validate();
        }

        for (var i = 0; i < koolic._elems.length; i++) {
            koolic._elems[i].validate();
        }

        setTimeout(koolic._frameTimer, 10);
    }

    setTimeout(koolic._frameTimer, 10);

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
    }

    window.$$ = window.koolic;
})();

(function(koolic) {
    koolic.find = function(selector) {
        if (selector != null) {
            if (typeof selector === 'string' && selector.length > 0) {
                var elements = document.querySelectorAll(selector);
                if (elements.length == 1) { return new KoolicElement(elements[0]); } else {
                    var kools = [];
                    for (var i = 0; i < elements.length; i++) {
                        kools.push(new KoolicElement(elements[i]));
                    }
                    return kools;
                }
            } else if ($$.IsDOMElement(selector)) {
                return new KoolicElement(selector);
            } else if ($$.IsPlainObject(selector)) {
                return new KoolicObject(selector);
            } else if ($$.IsFunction(selector)) {
                //koolic funciton
            }
        }
    };
})(window.koolic);


function KoolicElement(element) {
    var _validates = [];

    this.el = element;

    this.parent = function() {
        return $$(this.el.parentNode);
    };

    this.validate = function(func) {
        if (koolic.IsFunction(func)) {
            _validates.push(func);
        } else {
            for (var i = 0; i < _validates.length; i++) {
                _validates[i]();
            }
        }
        return true;
    }

    koolic._elems.push(this);
}

function KoolicObject(object) {
    var _obj = object;

    for (var i = 0; i < koolic._objs.length; i++) {
        if (koolic._objs[i].equals(object)) {
            return koolic._objs[i];
        }
    }

    this.equals = function(object) {
        if (object instanceof KoolicObject) {
            return this === object;
        } else {
            return _obj === object;
        }
    }

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            if (typeof object[property] === "object") {
                this[property] = new KoolicObject(object[property]);
            } else if (typeof object[property] === "string" || typeof object[property] === "number" || typeof object[property] === "boolean") {
                this[property] = new KoolicProperty(object, property);
                $$._props.push(this[property]);
            } else {
                this[property] = object[property];
            }
        }
    }

    koolic._objs.push(this);
}

function KoolicProperty(object, property) {
    var _name = property,
        _obj = object,
        _oldval = object[property],
        _isnum = false,
        _val = null,
        _onchange = [];

    _val = koolic.objVal(object, property);

    this.hasChange = function() {
        if (_oldval != koolic.objVal(_obj, _name) || koolic.objVal(_obj, _name) != _val) return true;
        else return false;
    };

    this.onChange = function(func) {
        if (typeof func !== 'undefined') {
            _onchange.push(func);
            return true;
        } else {
            return _onchange;
        }
    }

    this.validate = function() {
        var objVal = koolic.objVal(_obj, _name);
        if (objVal !== _oldval) {
            this.value(koolic.objVal(_obj, _name));
        } else if (objVal === _oldval && objVal !== _val) {
            koolic.objVal(_obj, _name, _val);
            _oldval = _val;
        }
        return true;
    }

    this.value = function(value) {
        if (typeof value === 'undefined') return _val;

        if (koolic.IsNumber(value) && !_isnum) {
            _isnum = true;
        } else if (_isnum && !koolic.IsNumber(value) && value != null) {
            return false;
        }

        if (value != _val) {
            koolic.objVal(_obj, _name, value);
            _val = value;

            var c = this.onChange();
            if (_onchange.length > 0) {
                for (var i = 0; i < _onchange.length; i++) {
                    _onchange[i](_oldval, _val);
                }
            }

            _oldval = value;
        }
        return true;
    };
}

function KoolicFunction(func) {
    var _func = func,
        _notify = [];


    //return existing

    this.exec = function() {
        var _bindables = [];

        for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] instanceof KoolicBindableObject) {
                _bindables.push(arguments[i]);
            }
        }
        var val = _func.apply(_func, _bindables);
        return val;
    };

    this.bind = function(koolicObj, property) {
        //koolic.objVal(koolicObj, property, this.update());
        var koolBinding = new KoolicBinding(this, koolicObj, property);
        _notify.push(koolBinding);
        koolic._boundObjs.push(koolBinding);
    }
}