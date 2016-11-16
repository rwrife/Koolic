var $$ = document.koolic = function(selector) {

    if (selector != null && selector.length > 0) {
        var elements = document.querySelectorAll(selector);
        if (elements.length == 1) { return kool(elements[0]); } else {
            var kools = [];
            for (var i = 0; i < elements.length; i++) {
                kools.push(kool(elements[i]));
            }
            return kools;
        }
    }

    return {
        test: function() {
            console.log("test");
        }
    };


};


function kool(element) {
    return {
        element: element,
        hide: function() {
            element.style.display = 'none';
            return true;
        },
        show: function() {
            element.style.display = 'block';
            return true;
        }
    }
}


document.koolic();