
(function(exports, require) {
    "use strict";

    var IterifyArray = require('lib/helper').IterifyArray;
    var utils = require('utils');
    var helper = require('lib/helper').Helper;

    var Page = function(url) {
        this.url = url;
        this.opened = false;
        this.processed = false;
        this.reloadCount = 0;
        this.status_code = 0;
        this.jsErrors = [];
        this.xss = [];
        this.xssHashMap = [];
        this.pages = [];
        this.events = [];
        this.eventsQueue = IterifyArray([]);
        this.deferredEvents = [];
        this.currentEvent = null;
        this.allEvents = [];
        this.startTime = 0;
        this.endTime = 0;
        this.resourses = [];
    };

    Page.prototype.addPage = function(page) {
        this.pages.push(page);
    };

    Page.prototype.addJsError = function(error) {
        this.jsErrors.push(error);
    };

    Page.prototype.addMultipleXss = function(xssArray) {
        if (helper.isEmpty(xssArray))
            return;

        utils.dump(xssArray);
        xssArray.forEach(this.processNewXss, this);
    };

    Page.prototype.processNewXss = function(xss) {
        var hash = xss.initiator + xss.dbRecord;

        if (this.xssHashMap.indexOf(hash) >= 0)
            return;

        this.xss.push(xss);
        this.xssHashMap.push(hash);
    };

    Page.prototype.isEventExists = function(event) {
        for (var i = 0, length = this.allEvents.length; i < length; i++) {
            if (this.allEvents[i].path === event.path && this.allEvents[i].eventType === event.eventType)
                return true;
        }
        return false;
    };

    Page.prototype.removeNextEvent = function(event) {
        for (var i = this.eventsQueue.currentIndex + 1, length = this.eventsQueue.length; i < length; i++) {
            if (this.eventsQueue[i].path === event.path && this.eventsQueue[i].eventType === event.eventType) {
                return this.eventsQueue.splice(i, 1)[0];
            }
        }
        return null;
    };

    Page.prototype.onComplete = function() {
        this.endTime = new Date().getTime();
        delete this.pagesQueue;
        delete this.allEvents;
        delete this.eventsQueue;
        delete this.currentEvent;
    };

    exports.Page = Page;

})(exports, patchRequire(require));