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
                obj.validateObject();
            }
        }
        setTimeout(koolic._checkBound, 5);
    }

    setTimeout(koolic._checkBound, 5);

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
    var _ele = element;

    this._boundObjs = [];

    this.length = 0;

    this.hide = function() {
        element.style.display = 'none';
        return true;
    };

    this.show = function() {
        element.style.display = 'block';
        return true;
    };

    this.parent = function() {
        return this.getElement().parentNode;
    }

    this.getElement = function() {
        return _ele;
    };

    this.text = function(text) {
        if (typeof text !== "undefined") {
            this.getElement().innerText = text;
        } else {
            return this.getElement().innerText;
        }
    };

    this.html = function(html) {
        if (typeof html !== "undefined") {
            this.getElement().innerHTML = html;
        } else {
            return this.getElement().innerHTML;
        }
    };

    this.bind = function(koolicBindable) {
        if (!(koolicBindable instanceof KoolicBindable)) return false;
        if (element instanceof HTMLInputElement && element.type == 'text') {
            element.value = koolicBindable.value;
            var that = this;
            element.addEventListener("input", function(event) {
                for (var i = 0; i < that._boundObjs.length; i++) {
                    var bindable = that._boundObjs[i];
                    bindable.setValue(element.value);
                }
            });
        } else if (element instanceof HTMLSelectElement) {
            element.value = koolicBindable.value;
            var that = this;
            element.addEventListener("input", function(event) {
                for (var i = 0; i < that._boundObjs.length; i++) {
                    var bindable = that._boundObjs[i];
                    bindable.setValue(element.value);
                }
            });
        } else if (element instanceof HTMLElement) {
            element.innerHTML = koolicBindable.value;
        }

        this._boundObjs.push(koolicBindable);
        koolicBindable.bind(this);
        return true;
    };
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

    this.hasChange = function() {
        if (_oldval != _obj[_name] || _obj[_name] != this.value) return true;
        else return false;
    }

    this.validateObject = function() {
        if (this.hasChange()) {
            if (this.value != _oldval) {
                this.setValue(this.value);
                _oldval = this.value;
            } else if (_obj[_name] != this.value) {
                this.setValue(_obj[_name]);
            }
        }
    }

    this.setValue = function(value) {
        if (value != this.value) {
            _obj[_name] = value;
            this.value = value;
            if (_notify && _notify.length > 0) {
                for (var i = 0; i < _notify.length; i++) {
                    var koolicObj = _notify[i];
                    if (koolicObj instanceof KoolicElement) {
                        var element = _notify[i].getElement();
                        if ((element instanceof HTMLInputElement && element.type == 'text') || element instanceof HTMLSelectElement) {
                            element.value = this.value;
                        } else if (element instanceof HTMLElement) {
                            element.innerHTML = this.value;
                        }
                    } else if (koolicObj instanceof KoolicBindable) {
                        koolicObj.setValue(this.value);
                    }
                }
            }

            if (this && this.onchange) {
                this.onchange(_oldval, value);
            }
        }
    }

    this.isBound = function(koolicBindable) {
        for (var i = 0; i < _notify.length; i++) {
            if (_notify[i] == koolicBindable) {
                return true;
            }
        }
        return false;
    }

    this.bind = function(koolicObj) {
        if (koolicObj instanceof KoolicElement) {
            _notify.push(koolicObj);
            return true;
        }

        if (!(koolicObj instanceof KoolicBindable)) return false;

        this.value = koolicObj.value;
        _notify.push(koolicObj);
        if (!koolicObj.isBound(this)) {
            koolicObj.bind(this);
        }

        return true;
    };

    koolic._boundObjs.push(this);
};