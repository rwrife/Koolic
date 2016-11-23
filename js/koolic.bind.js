(function(koolic) {

    window.KoolicBinding = function(koolicBindable, targetObject, targetProperty) {
        this.bindable = {};
        this.target = {};
        this.targetProperty = '';

        this.bindable = koolicBindable;
        this.target = targetObject;
        this.targetProperty = targetProperty;

        if (koolicBindable instanceof KoolicBindableObject) {
            return this;
        } else return null;
    }

    KoolicProperty.prototype.bind = function(bindable, property) {
        var koolicProperty = this;

        if (koolic.IsPlainObject(bindable) && arguments.length == 2) {
            return this.bind($$(bindable)[property]);
        }

        if (typeof this.bindings === 'undefined') { this.bindings = []; }

        if (bindable instanceof KoolicProperty && !isBound(bindable)) {
            this.value(bindable.value());

            bindable.onChange(function(o, n) {
                koolicProperty.value(n);
            });

            this.bindings.push(bindable);
            bindable.bind(this);

            return this;
        } else {
            return false;
        }

        function isBound(bindable) {
            var t = koolicProperty;
            for (var i = 0; i < koolicProperty.bindings.length; i++) {
                if (koolicProperty.bindings[i] == bindable) return true;
            }
            return false;
        }
    };

    KoolicElement.prototype.bindOnCommit = false;

    KoolicElement.prototype.bind = function(bindable, property, targetProperty, prefix, suffix) {
        var _pre = '';
        var _suf = '';
        if (arguments.length == 5) {
            _pre = (arguments[3] ? arguments[3] : '');
            _suf = (arguments[4] ? arguments[4] : '');
        } else if (arguments.length == 4) {
            _pre = (arguments[2] ? arguments[2] : '');
            _suf = (arguments[3] ? arguments[3] : '');
        }

        var koolicElement = this;

        if (koolic.IsPlainObject(bindable) && (arguments.length == 3 || arguments.length == 5)) {
            return this.bind($$(bindable)[property], targetProperty);
        }

        if (!(bindable instanceof KoolicProperty)) return false;

        var defaultProp = 'innerText';

        if (this.el instanceof HTMLInputElement || this.el instanceof HTMLSelectElement) {
            defaultProp = 'value';
        } else if (this.el instanceof HTMLElement) {
            defaultProp = 'innerHTML';
        }
        var prop = (typeof property === 'undefined' ? defaultProp : property);

        console.log(_pre);
        if (bindable.value() != null) { //ignore null?                        
            koolic.objVal(this.el, prop, _pre + bindable.value() + _suf);
        } else {
            bindable.value(koolic.objVal(this.el, prop));
        }

        var _oldval = koolic.objVal(this.el, prop.replace(_suf, '').replace(_pre, ''));

        this.validate(function() {
            var _val = koolic.objVal(koolicElement.el, prop).replace(_suf, '').replace(_pre, '');
            if (_oldval != _val) {
                bindable.value(_val);
            }
        });

        bindable.onChange(function(o, n) {            
            koolic.objVal(koolicElement.el, prop, _pre + n + _suf);
            _oldval = n;
        });

        return true;
    };

    KoolicFunction.prototype.bind = function() {
        var koolicFunction = this;
        for (var i = 0; i < arguments.length; i++) {
            var b = arguments[i];
            if (!(b instanceof KoolicProperty)) return false;
        }

        var args = arguments;

        for (var i = 0; i < arguments.length; i++) {
            var b = arguments[i];
            if (b instanceof KoolicProperty) {
                b.onChange(function(o, n) {
                    var f = koolicFunction.exec;
                    f.apply(f, args);
                });
            }
        }

        return true;
    };

})(koolic);