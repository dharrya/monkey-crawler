var EventCollector =  {
    mouseEvents: [ 'click', 'dblclick', 'mousedown', 'mousemove', 'mouseout', 'mouseover',
                'mouseup', 'change', 'focus', 'blur', 'scroll', 'select', 'submit', 'keydown', 'keypress',
                'keyup' ],
    init: function() {
        "use strict";

        if (HTMLElement.prototype._origAddEventListener) {
            return;
        }

        HTMLElement.prototype._origAddEventListener = HTMLElement.prototype.addEventListener;
        HTMLElement.prototype.addEventListener = function(event, callback, capture) {
            if (EventCollector.mouseEvents.indexOf(event) >= 0) {
                if (!this.dom2Events)
                    this.dom2Events = [];

                    this.dom2Events.push({
                        event:event,
                        callback: callback
                    });
            }
            HTMLElement.prototype._origAddEventListener.apply(this, arguments);
        }
    },
    getAll: function(allElements) {
        "use strict";

        var result = [];
        [].forEach.call(allElements, function(element) {
            result = result.concat(this.getDom0Events(element));
            if (!!element.dom2Events)
                result = result.concat(this.getDom2Events(element));
        }, this);

        return result;
    },
    getDom0Events: function(element) {
        "use strict";

        var result = [];
        this.mouseEvents.forEach(function(event) {
            if(typeof element['on' + event] != 'function')
                return;

            result.push({
                event: event,
                path: buildElementXPath(element)
            });
        }, this);
	    return result;
    },
    getDom2Events: function(element) {
        "use strict";

        var result = [];
        if (!element.dom2Events)
            return result;

        element.dom2Events.forEach(function(event) {
            result.push({
                event: event.event,
                path: buildElementXPath(element)
            });
        }, this);
        return result;
    }
};

EventCollector.init();

