/*!
 * Koolic 2.0 — animation add-on
 *
 * Requires koolic.js to be loaded first.
 *
 *   $$(obj).x.animate(0, 100, 1000);                       // linear
 *   $$(obj).x.animate(0, 100, 1000, 'easeInOutSine');      // named easing
 *   $$(obj).x.animate(0, 100, 1000, function(t){return t*t;}); // custom
 *   $$(obj).x.animate(0, 100, 1000, [                      // segmented:
 *     { to: 0.2, easing: 'easeInSine'  },                  //  0..20% ease-in
 *     { to: 0.8, easing: 'linear'      },                  // 20..80% linear
 *     { to: 1.0, easing: 'easeOutSine' }                   // 80..100% ease-out
 *   ]);
 *
 * .onChange(fn(animation, value)) — every frame
 * .onDone(fn(animation, value))   — once, at end
 * .reset()                         — restart from start
 *
 * koolic.easings — registry of named easing functions, t in [0,1] -> [0,1].
 * Add your own:  koolic.easings.myCurve = function(t){ ... };
 */
(function (root, factory) {
    var koolicMod = null;
    if (typeof module !== 'undefined' && module.exports) {
        koolicMod = require('./koolic.js');
        var api = factory(koolicMod);
        module.exports = api;
        return;
    }
    factory({
        koolic: root.koolic,
        KoolProperty: root.KoolicProperty,
        KoolObject: root.KoolicObject,
        KoolElement: root.KoolicElement,
        KoolFunction: root.KoolicFunction
    });
})(typeof self !== 'undefined' ? self : this, function (k) {
    'use strict';

    var koolic = k.koolic;
    var KoolProperty = k.KoolProperty;

    // ---- easing registry ------------------------------------------------
    // All easings: f(0) === 0, f(1) === 1, t in [0, 1].

    var PI = Math.PI;

    var easings = {
        linear: function (t) { return t; },

        easeInSine:    function (t) { return 1 - Math.cos((t * PI) / 2); },
        easeOutSine:   function (t) { return Math.sin((t * PI) / 2); },
        easeInOutSine: function (t) { return -(Math.cos(PI * t) - 1) / 2; },

        easeInQuad:    function (t) { return t * t; },
        easeOutQuad:   function (t) { return 1 - (1 - t) * (1 - t); },
        easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },

        easeInCubic:    function (t) { return t * t * t; },
        easeOutCubic:   function (t) { return 1 - Math.pow(1 - t, 3); },
        easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },

        // Classic Robert Penner ease-out-bounce.
        easeOutBounce: function (t) {
            var n1 = 7.5625, d1 = 2.75;
            if (t < 1 / d1)       return n1 * t * t;
            else if (t < 2 / d1)  { t -= 1.5 / d1;   return n1 * t * t + 0.75; }
            else if (t < 2.5 / d1){ t -= 2.25 / d1;  return n1 * t * t + 0.9375; }
            else                  { t -= 2.625 / d1; return n1 * t * t + 0.984375; }
        },

        // Spring-like overshoot then settle. Robert Penner easeOutElastic.
        easeOutElastic: function (t) {
            if (t === 0) return 0;
            if (t === 1) return 1;
            var c4 = (2 * PI) / 3;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
    };

    // Resolve an easing argument into a function.
    //   - undefined / null      -> linear
    //   - function              -> use as-is
    //   - string                -> look up in registry
    //   - array of segments     -> piecewise composition
    function resolveEasing(e) {
        if (e == null) return easings.linear;
        if (typeof e === 'function') return e;
        if (typeof e === 'string') {
            var fn = easings[e];
            if (!fn) throw new Error("koolic.animate: unknown easing '" + e + "'");
            return fn;
        }
        if (Array.isArray(e)) return buildSegmented(e);
        throw new Error('koolic.animate: invalid easing argument');
    }

    // Segmented easing.
    //
    // Each segment is { to: <fraction in (0,1]>, easing: <name|fn> }. The
    // segments tile the full [0, 1] timeline. For an input t, we find which
    // segment it falls in, remap t to a local [0, 1] inside that segment,
    // run the segment's easing, and then map the eased value into the
    // segment's output band so the overall curve is continuous and ends at
    // exactly 1.
    //
    // Example: [{to:0.2,easing:'easeInSine'},{to:0.8,easing:'linear'},{to:1,easing:'easeOutSine'}]
    // produces a slow-start, linear-middle, slow-finish curve where the
    // easing functions are "compressed" into their bands rather than
    // re-running across the whole [0,1] timeline.
    function buildSegmented(segments) {
        if (!segments.length) return easings.linear;
        var prepared = [];
        var prevTo = 0;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            var to = seg.to;
            if (typeof to !== 'number' || to <= prevTo || to > 1.0001) {
                throw new Error('koolic.animate: segment "to" must be strictly increasing and end at 1.0');
            }
            prepared.push({
                from: prevTo,
                to: Math.min(to, 1),
                fn: resolveEasing(seg.easing)
            });
            prevTo = to;
        }
        if (Math.abs(prevTo - 1) > 1e-9) {
            throw new Error('koolic.animate: segments must end at to:1.0 (got ' + prevTo + ')');
        }

        return function (t) {
            if (t <= 0) return 0;
            if (t >= 1) return 1;
            for (var i = 0; i < prepared.length; i++) {
                var s = prepared[i];
                if (t <= s.to) {
                    var localT = (t - s.from) / (s.to - s.from);
                    var localEased = s.fn(localT);
                    return s.from + localEased * (s.to - s.from);
                }
            }
            return 1;
        };
    }

    // ---- rAF shim --------------------------------------------------------

    function getRaf() {
        if (typeof requestAnimationFrame === 'function') return requestAnimationFrame;
        return function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
    }
    function getCaf() {
        if (typeof cancelAnimationFrame === 'function') return cancelAnimationFrame;
        return function (h) { clearTimeout(h); };
    }

    // ---- KoolAnimation ---------------------------------------------------

    function KoolAnimation(start, stop, duration, easing) {
        this._start = start;
        this._stop = stop;
        this._duration = duration;
        this._easing = resolveEasing(easing);
        this._val = start;
        this._startTime = null;
        this._handle = null;
        this._done = false;
        this._onChange = [];
        this._onDone = [];
        this._running = false;
        // Auto-start on next tick so chained .onDone() handlers attach first.
        var self = this;
        Promise.resolve().then(function () { if (!self._running && !self._done) self.start(); });
    }

    KoolAnimation.prototype.value = function () { return this._val; };

    KoolAnimation.prototype.onChange = function (fn) {
        if (typeof fn === 'function') this._onChange.push(fn);
        return this;
    };
    KoolAnimation.prototype.onDone = function (fn) {
        if (typeof fn === 'function') {
            if (this._done) fn(this, this._val);
            else this._onDone.push(fn);
        }
        return this;
    };

    KoolAnimation.prototype.reset = function () {
        this._val = this._start;
        this._startTime = null;
        this._done = false;
        if (!this._running) this.start();
        return this;
    };

    KoolAnimation.prototype.stop = function () {
        if (this._handle != null) getCaf()(this._handle);
        this._handle = null;
        this._running = false;
        return this;
    };

    KoolAnimation.prototype.start = function () {
        if (this._running) return this;
        this._running = true;
        this._done = false;
        var self = this;
        var raf = getRaf();
        var diff = this._stop - this._start;

        function step(ts) {
            if (self._startTime == null) self._startTime = ts;
            var elapsed = ts - self._startTime;
            if (elapsed >= self._duration) {
                self._val = self._stop;
                self._running = false;
                self._done = true;
                self._handle = null;
                for (var i = 0; i < self._onChange.length; i++) self._onChange[i](self, self._val);
                for (var j = 0; j < self._onDone.length; j++) self._onDone[j](self, self._val);
                return;
            }
            var t = self._duration > 0 ? elapsed / self._duration : 1;
            var eased = self._easing(t);
            self._val = self._start + diff * eased;
            for (var i = 0; i < self._onChange.length; i++) self._onChange[i](self, self._val);
            self._handle = raf(step);
        }
        self._handle = raf(step);
        return this;
    };

    // ---- KoolProperty.animate -------------------------------------------

    KoolProperty.prototype.animate = function (start, stop, duration, easing) {
        var self = this;

        // animate(existingAnimation) — re-run an existing animation against this prop.
        if (arguments.length === 1 && start instanceof KoolAnimation) {
            var existing = start;
            existing.onChange(function (a, v) { self.value(v); });
            existing.reset();
            return existing;
        }

        var anim = new KoolAnimation(start, stop, duration, easing);
        anim.onChange(function (a, v) { self.value(v); });
        return anim;
    };

    // ---- exports --------------------------------------------------------

    koolic.easings = easings;
    koolic.animate = function (start, stop, duration, easing) {
        return new KoolAnimation(start, stop, duration, easing);
    };

    if (typeof window !== 'undefined') {
        window.KoolicAnimation = KoolAnimation;
    }

    return {
        KoolAnimation: KoolAnimation,
        easings: easings,
        resolveEasing: resolveEasing
    };
});
