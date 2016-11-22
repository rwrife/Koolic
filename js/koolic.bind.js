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


    KoolicElement.prototype.bind = function(bindable, property, targetProperty) {
        var koolicElement = this;

        if (koolic.IsPlainObject(bindable) && arguments.length == 3) {
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

        if (bindable.value() != null) { //ignore null?
            koolic.objVal(this.el, prop, bindable.value());
        } else {
            bindable.value(koolic.objVal(this.el, prop));
        }


        var _oldval = koolic.objVal(this.el, prop);

        this.validate(function() {
            var _val = koolic.objVal(koolicElement.el, prop);
            if (_oldval != _val) {
                bindable.value(koolic.objVal(koolicElement.el, prop));
            }
        });

        bindable.onChange(function(o, n) {
            koolic.objVal(koolicElement.el, prop, n);
            _oldval = n;
        });

        return true;
    };


})(koolic);