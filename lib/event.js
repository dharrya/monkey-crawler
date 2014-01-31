
(function(exports) {
    "use strict";

    var helper = require('lib/helper').Helper;

    var PageEvent = function(eventType, path) {
        this.eventType = eventType;
        this.path = path;
        this.parentEvent = null;
        this.depth = 0;
        this.status = 'new';
        this.completed = false;
        this.deleted = false;
        this.xss = [];
        this.xssHashMap = [];
        this.events = [];
        this.resourses = [];
    };

    PageEvent.prototype.addEvent = function(event) {
        this.events.push(event);
    };

    PageEvent.prototype.extendEvents = function(events) {
        this.events = this.events.concat(events);
    };

    PageEvent.prototype.addMultipleXss = function(xssArray) {
        if (helper.isEmpty(xssArray))
            return;

        xssArray.forEach(this.processNewXss, this);
    };

    PageEvent.prototype.processNewXss = function(xss) {
        var hash = xss.initiator + xss.dbRecord;

        if (this.xssHashMap.indexOf(hash) >= 0)
            return;

        this.xss.push(xss);
        this.xssHashMap.push(hash);
    };

    exports.PageEvent = PageEvent;

})(exports);