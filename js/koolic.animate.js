(function(koolic) {


    KoolicProperty.prototype.animate = function(start, stop, duration) {
        if (this.isInteger() || this.isFloat()) {
            var koolicProperty = this;
            var ani = new KoolicAnimation(start, stop, duration);
            ani.onChange(function(val) {
                koolicProperty.value(val);
            });
            $$._watch.push(ani);
            return ani;
        } else {
            return false;
        }
    };

    function KoolicAnimation(start, stop, duration) {
        var _val,
            _diff = (stop - start),
            _startTime = (new Date).getTime(),
            _val = start,
            _onChange = [],
            _onDone = [];

        var koolicAnimation = this;

        this.onChange = function(func) {
            if (typeof func !== 'undefined' && koolic.IsFunction(func)) {
                _onChange.push(func);
            }
        };

        this.onDone = function(func) {
            if (typeof func !== 'undefined' && koolic.IsFunction(func)) {
                _onDone.push(func);
            }
        };

        this.value = function() {
            return _val;
        }

        this.validate = function() {
            var curTime = (new Date).getTime();
            if (curTime < _startTime + duration) {
                var timeDiff = curTime - _startTime;
                var timePerc = timeDiff / duration;
                var cVal = start + (_diff * timePerc);
                _val = cVal;
                for (var i = 0; i < _onChange.length; i++) {
                    _onChange[i](_val);
                }
            } else { //it's dead jim
                _val = stop;
                for (var i = 0; i < $$._watch.length; i++) {
                    if ($$._watch[i] === koolicAnimation) {
                        $$._watch.splice(i, 1);
                        break;
                    }
                }
                for (var i = 0; i < _onChange.length; i++) {
                    _onChange[i](_val);
                }
                for (var i = 0; i < _onDone.length; i++) {
                    _onDone[i](_val);
                }
            }
        };
    }
})(koolic);