var _$$ = null;

var $$ = document.koolic = function(selector) {
    if (selector != null && typeof selector === 'string' && selector.length > 0) {
        var elements = document.querySelectorAll(selector);
        if (elements.length == 1) { return koolelem(elements[0]); } else {
            var kools = [];
            for (var i = 0; i < elements.length; i++) {
                kools.push(koolelem(elements[i]));
            }
            return kools;
        }
    } else if (selector != null && _$$.IsPlainObject(selector)) {
        return koolobj(selector);
    }

    if (_$$ == null) {
        _$$ = {
            test: function() {
                console.log("test");
            },
            IsPlainObject: function(obj) { return obj instanceof Object && !(obj instanceof Function || obj.toString() !== '[object Object]' || obj.constructor.name !== 'Object'); },
            IsDOMObject: function(obj) { return obj instanceof EventTarget; },
            IsDOMElement: function(obj) { return obj instanceof Node; },
            IsListObject: function(obj) { return obj instanceof Array || obj instanceof NodeList; },
            onPropertyChange: function(object, name, value) {},
            _boundObjs: [],
            _checkBound: function() {
                if (_$$._boundObjs != null && _$$._boundObjs.length > 0) {
                    for (var i = 0; i < _$$._boundObjs.length; i++) {
                        var obj = _$$._boundObjs[i];
                        if (obj.value != obj._oldval) {
                            obj._oldval = obj.value;
                            obj._obj[obj._name] = obj.value;
                            obj._onchange(obj._oldval, obj.value);
                            _$$.onPropertyChange(obj, obj._name, obj.value);
                        }
                    }
                }
                setTimeout(_$$._checkBound, 5);
            },
            _boundElems: []
        }
    }

    setTimeout(_$$._checkBound, 5);

    return _$$;
};

function koolobj(object) {
    var ko = {
        _obj: object
    };

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            if (typeof object[property] === "string") {
                ko[property] = koolbindable(object, property);
            } else if (typeof object[property] === "object") {
                ko[property] = koolobj(object[property]);
            } else {
                ko[property] = object[property];
            }
        }
    }

    return ko;
}

function koolbindable(object, property) {
    var kb = {
        _name: property,
        _obj: object,
        _oldval: object[property],
        value: object[property],
        _onchange: function(oldval, newval) {
            if (this._notify && this._notify.length > 0) {
                for (var i = 0; i < this._notify.length; i++) {
                    var element = this._notify[i].element;
                    if (element instanceof HTMLInputElement && element.type == 'text') {
                        element.value = this.value;
                    }
                }
            }


            if (this && this.onchange) {
                this.onchange(oldval, newval);
            }
        },
        _notify: []
    };

    _$$._boundObjs.push(kb);

    return kb;
}

function koolelem(element) {
    var ke = {
        element: element,
        hide: function() {
            element.style.display = 'none';
            return true;
        },
        show: function() {
            element.style.display = 'block';
            return true;
        },
        bind: function(bindable) {
            if (element instanceof HTMLInputElement && element.type == 'text') {
                element.value = bindable.value;
                var that = this;
                element.addEventListener("input", function(event) {
                    for (var i = 0; i < that._boundObjs.length; i++) {
                        var bindable = that._boundObjs[i];
                        bindable.value = element.value;
                    }
                });
            }
            this._boundObjs.push(bindable);
            bindable._notify.push(this);
            return true;
        },
        _boundObjs: [],
        text: function(value) {
            if (typeof value === 'undefined') {
                return this.element.innerHTML;
            } else {
                this.element.innerHTML = value;
                return true;
            }
        }

    };

    _$$._boundElems.push(ke);

    return ke;
}


document.koolic();