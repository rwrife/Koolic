(function() {
    var inputs = document.getElementsByClassName("input-field");
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        var orgval = input.querySelector(".text").innerHTML;
        var label = input.querySelector(".label");
        var oldval = input.querySelector("input[name=oldval]");
        if (orgval.length >= 0) {
            label.className = label.className.replace("hasvalue", "");
            label.className = label.className.replace("  ", " ");
        } else {
            label.className = label.className += " hasvalue";
        }
        oldval.value = orgval;
        input.querySelector(".text").addEventListener("input", function(event) {
            var input = event.target;
            let curval = input.innerHTML;
            let oldval = input.parentElement.querySelector("input[name=oldval]").value;

            if (oldval != curval) {
                if (!input.parentElement.parentElement.className.includes(" changed")) {
                    input.parentElement.parentElement.className += " changed";
                }
            } else {
                input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("changed", "");
                input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("  ", " ");
            }
        }, false);

        input.querySelector("form").addEventListener("submit", function(event) {
            event.preventDefault();
            return false;
        }, false);

        input.querySelector("button.confirm").addEventListener("click", function(event) {
            var input = event.target.parentElement.querySelector(".text");
            input.parentElement.querySelector("input[name=oldval]").value = input.innerHTML;
            input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("changed", "");
            input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("  ", " ");
        }, false);

        input.querySelector(".text").addEventListener('keypress', function(event) {
            var key = event.which || event.keyCode;
            if (key === 13) { // 13 is enter                
                var input = event.target;
                input.blur();                
                input.parentElement.querySelector("input[name=oldval]").value = input.innerHTML;
                input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("changed", "");
                input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("  ", " ");
                event.preventDefault();
                return false;
            }
            return true;
        }, false);

        input.querySelector("button.cancel").addEventListener("click", function(event) {
            var input = event.target.parentElement.querySelector(".text");
            let oldval = input.parentElement.querySelector("input[name=oldval]").value;
            input.innerHTML = oldval;
            input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("changed", "");
            input.parentElement.parentElement.className = input.parentElement.parentElement.className.replace("  ", " ");
        }, false);
    }
})();