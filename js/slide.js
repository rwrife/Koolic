(function() {
    var sliders = document.getElementsByClassName("slider");
    for (var i = 0; i < sliders.length; i++) {
        var slider = sliders[i];
        slider.panelContainer = slider.querySelector(".panel-root");
        slider.panelContainer.stack = [];

        var rootPanel = slider.querySelector(".panel[name=root]");
        showPanel(getPanelRoot(rootPanel), "root");

        var childButtons = slider.querySelectorAll("button.show-child");
        for (var c = 0; c < childButtons.length; c++) {
            var button = childButtons[c];
            button.addEventListener("click", showChild, false);
        }

        var backButton = slider.querySelector("button.back");
        backButton.addEventListener("click", goBack, false);



    }

})();

function goBack(event) {

    var slider = getSlider(event.target);
    console.log(slider.panelContainer.stack);
    if (slider.panelContainer.stack.length > 1) {
        var oldPanel = slider.panelContainer.stack.pop();
        oldPanel.setAttribute("active", "false");

        var prePanel = slider.panelContainer.stack.slice(-1)[0];
        prePanel.setAttribute("active", "true");
        slidePanelBack(prePanel, oldPanel);
    }
}

function showChild(event) {
    var panelName = event.target.getAttribute("panel");
    showPanel(getPanelRoot(event.target), panelName);
}

function showPanel(rootPanel, panelName) {
    var slider = getSlider(rootPanel);
    console.log(slider);
    var childPanels = rootPanel.querySelectorAll(".panel");
    var oldPanel = slider.panelContainer.stack.slice(-1)[0];
    for (var i = 0; i < childPanels.length; i++) {
        var panel = childPanels[i];
        panel.setAttribute("active", "false");
        if (panel.getAttribute("name") == panelName) {
            rootPanel.stack.push(panel);
            panel.setAttribute("active", "true");
            if (oldPanel != null) {
                slidePanel(panel, oldPanel);
            }
            setTitle(slider, panel.getAttribute("title"));
        }
    }
}

function setTitle(slider, title) {
    console.log(title);
}

function getSlider(element) {
    var pEl = element;
    while (pEl != null && pEl != document) {
        if (typeof pEl.className !== 'undefined' && pEl.className.includes("slider") && pEl.tagName.toLowerCase() == "div") {
            return pEl;
        }
        pEl = pEl.parentElement;
    }
    return null;
}

function getPanel(element) {
    var pEl = element;
    while (pEl != null && pEl != document) {
        if (typeof pEl.className !== 'undefined' && pEl.className.includes("panel") && pEl.tagName.toLowerCase() == "div") {
            return pEl;
        }
        pEl = pEl.parentElement;
    }
    return null;
}

function getPanelRoot(element) {
    var panel = getPanel(element);
    return panel.parentElement;
}

function slidePanelBack(panel, oldpanel) {
    var sliderWidth = getSlider(panel).offsetWidth;
    panel.style.left = (0 - sliderWidth) + "px";
    var id = setInterval(frame, 5);
    var startTime = new Date().getTime();

    addClass(panel, "animating");
    addClass(oldpanel, "animating");

    function frame() {
        var timeDiff = new Date().getTime() - startTime;
        var timePercent = timeDiff / 200; //.2 seconds;
        if (panel.offsetLeft >= 0) {
            panel.style.left = "0px";
            clearInterval(id);
            removeClass(panel, "animating");
            removeClass(oldpanel, "animating");
        } else {
            var moveBy = parseInt(panel.offsetWidth * timePercent) + 1;
            if (panel.offsetWidth < moveBy)
                moveBy = panel.offsetWidth;
            panel.style.left = 0 - panel.offsetWidth + moveBy + "px";
            oldpanel.style.left = (panel.offsetLeft + sliderWidth) + "px";
        }
    }
}

function slidePanel(panel, oldpanel) {
    var sliderWidth = getSlider(panel).offsetWidth;
    panel.style.left = sliderWidth + "px";
    var id = setInterval(frame, 5);
    var startTime = new Date().getTime();

    addClass(panel, "animating");
    addClass(oldpanel, "animating");

    function frame() {
        var timeDiff = new Date().getTime() - startTime;
        var timePercent = timeDiff / 200; //.2 seconds;        
        if (panel.offsetLeft <= 0) {
            panel.style.left = "0px";
            clearInterval(id);
            removeClass(panel, "animating");
            removeClass(oldpanel, "animating");
        } else {
            var moveBy = parseInt(panel.offsetWidth * timePercent) + 1;
            if (panel.offsetWidth < moveBy)
                moveBy = panel.offsetWidth;
            panel.style.left = panel.offsetWidth - moveBy + "px";
            oldpanel.style.left = (0 - (sliderWidth - panel.offsetLeft)) + "px";
        }
    }
}

function addClass(element, className) {
    element.className += ' ' + className;
}

function removeClass(element, className) {
    element.className = element.className.replace(className, "");
    element.className = element.className.replace("  ", " ");
}