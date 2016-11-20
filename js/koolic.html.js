(function(koolic) {
    KoolicElement.prototype.hide = function() {
        this._originalDisplay = element.style.display;
        element.style.display = 'none';
        return true;
    };

    KoolicElement.prototype.show = function() {
        element.style.display = (typeof _originalDisplay === 'undefined' || _originalDisplay == 'none' ? 'inline-block' : _originalDisplay);
        return true;
    };

    KoolicElement.prototype.text = function(text) {
        if (typeof text !== "undefined") {
            this.el.innerText = text;
        } else {
            return this.el.innerText;
        }
    };

    KoolicElement.prototype.html = function(html) {
        if (typeof html !== "undefined") {
            this.el.innerHTML = html;
        } else {
            return this.el.innerHTML;
        }
    };


})(koolic);