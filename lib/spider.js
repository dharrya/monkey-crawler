
(function(exports, require) {
    "use strict";

    var utils = require('utils');
    var x = require('casper').selectXPath;
    var Casper = require('casper').Casper;

    var IterifyArray = require('lib/helper').IterifyArray;
    var helper = require('lib/helper').Helper;
    var Page = require('lib/page').Page;
    var PageEvent = require('lib/event').PageEvent;

    var Spider = function(casperOptions){

         var defaults = {
            clientScripts: [
               'client_scripts/event-collector.js',
               'client_scripts/mutation-summary.js',
               'client_scripts/mutation-utils.js',
               'client_scripts/helper.js'
            ],
            verbose: false,
            logLevel: 'warning',
            exitOnError: false,
            pageSettings: {
                loadImages: false,
                loadPlugins: false,
                webSecurityEnabled: false
            }
        };

        Spider.super_.apply(this,
            [utils.mergeObjects(defaults, casperOptions)]
        );
    };

    utils.inherits(Spider, Casper);

    Spider.prototype.initialize = function(properties) {
        this.initializeProperties(properties);
        this.attachEvents();
    };

    Spider.prototype.initializeProperties = function(properties) {

        var defaults = {
            targetUri: 'test_content/index.html',
            maxEventDepth: 50,
            eventContainer: undefined, //'div#workarea'
            skipEventPath: '^id\\("(lhe_|lfm_)',
            singlePage: false,
            maxPages: 0
        };
        this.properties = utils.mergeObjects(defaults, properties);
        this.properties.targetHost = this.properties.targetUri.replace(/^(http[s]?:\/\/[^\/]+).*$/, '$1');
        if (this.properties.skipEventPath !== null)
            this.properties.skipEventPath = new RegExp(this.properties.skipEventPath, 'i');

        if (!this.properties.acceptableUrlPattern) {
            var escapedUri = helper.escapeRegExpPattern(this.properties.targetUri);
            var escapedDir = this.properties.targetUri.replace(/^(http[s]?:\/\/[^\/]+)(.*)$/, '$2');
            if (!escapedDir)
                escapedDir = '/';
            escapedDir = helper.escapeRegExpPattern(escapedDir);

            this.properties.acceptableUrlPattern = '^(?:' + escapedUri + '|' + escapedDir + '|\\?|[a-z_\\-]*\\.)';
            this.properties.acceptableUrlRegExp = new RegExp(this.properties.acceptableUrlPattern, 'i');
        }

        this.mouseEvents = {
            click: true,
            dblclick: true,
            mousedown: true,
            mousemove: true,
            mouseout: true,
            mouseover: true,
            mouseup: true
        };

        this.status = '';
        this.completed = false;

        this.pages = [new Page(this.properties.targetUri)];
        this.pagesQueue = IterifyArray([this.pages[0]]);

        this.networkActivity = 0;
        this.requestsIDs = [];
        this.reloadNeeded = false;
        this.reloaded = false;

        this.context = this.pages[0];
    };


    Spider.prototype.setStatus = function(status) {
        this.status = status;
        this.info('Current Status', status);
    };

    Spider.prototype.isOpened = function() {
        return this.currentPage.opened;
    };

    Spider.prototype.process = function() {
        this.then(this.prepare);
        this.then(this.initializePage);

        this.then(this.parsePage);
        this.then(this.retrieveNewEvents);
        this.then(this.restoreLastCondition);
        this.then(this.processEvents);


        this.then(function complete() {
            if (this.reloadNeeded) {
                this.then(this.process);
            }
            else {
              this.currentPage.onComplete();

              if (!this.properties.singlePage && !this.completed && !this.pagesQueue.isEnd())
                    this.then(this.process);
                else
                    this.completed = true;
            }
        });
    };

    Spider.prototype.prepare = function() {
        if (this.reloadNeeded) {
            this.reloaded = true;
            this.reload();
        } else {
            this.reloaded = false;
            this.openNextPage();
        }
        this.reloadNeeded = false;
    };

    Spider.prototype.initializePage = function() {
        if (!this.isOpened())
            return;

        this.setStatus('page initialization');

        if (!this.reloaded)
            this.currentPage.status_code = this.currentHTTPStatus;

        this.page.navigationLocked = true;

        this.evaluate(function(pattern) {
            MutationUtils.init();
//            EventCollector.init();
            window.filterPattern = pattern;
        }, {arg1: this.properties.acceptableUrlPattern});
    };

    Spider.prototype.parsePage = function() {
        if (!this.isOpened())
            return;

        if (this.reloaded)
            return;

        this.setStatus('parsePage');

        var links = this.evaluate(function() {
           return getLinks(document.body);
        });

        this.newLinks(links);
        var xssMarks = this.evaluate(function() {
           return searchXss(document.body);
        });

        this.currentPage.addMultipleXss(xssMarks);
    };

    Spider.prototype.retrieveNewEvents = function() {
        if (!this.isOpened())
            return;

        if (this.reloaded)
            return;

        this.setStatus('newEventRetrieving');

        this.getPageEvents(this.properties.eventContainer, function(newEvents) {
            newEvents.forEach(function(item) {
                var pageEvent = new PageEvent(item.event, item.path);

                if (!this.isInterestedEvent(pageEvent))
                    return;

                if (this.currentPage.isEventExists(pageEvent))
                    return;

                this.currentPage.events.push(pageEvent);
                this.currentPage.eventsQueue.push(pageEvent);
                this.currentPage.allEvents.push(pageEvent);
            }, this);
        });
    };

    Spider.prototype.restoreLastCondition = function() {

    };

    Spider.prototype.processEvents = function() {
        if (!this.isOpened())
            return;

        this.setStatus('newEventProcessing');

        if (!this.currentPage.eventsQueue.isEmpty())
            this.processEachEvent();
    };

    Spider.prototype.processEachEvent = function() {

        this.then(function prepare() {
            this.currentPage.currentEvent = this.currentPage.eventsQueue.next();
            this.info('Processing event', JSON.stringify(this.currentPage.currentEvent));
            //ToDo: remove this!
            this.context = this.currentPage.currentEvent;
        });

        this.then(function() {
            var event = this.currentPage.currentEvent;

            if (event.depth > this.properties.maxEventDepth) {
                this.info('Skip event (max depth reached)', JSON.stringify(event));
                return;
            }


            if (!this.mouseEvents.hasOwnProperty(event.eventType) || !this.mouseEvents[event.eventType])
                return;

            this.clearNetworkActivity();
            this.mouseEvent(event.eventType, x(event.path));
            this.currentPage.currentEvent.status = 'triggered';

            this.then(function() {
                this.waitFor(
                    this.isNetworkActive,
                    this.onEventComplete,
                    this.onEventTimedOut,
                    10000
                );
            });
        });

        this.then(function complete() {
            if (!this.currentPage.eventsQueue.isEnd())
                this.then(this.processEachEvent);
        });
    };

    Spider.prototype.isNetworkActive = function() {
        return this.networkActivity <= 0;
    };

    Spider.prototype.onEventTimedOut = function() {
        this.info('   TimeOut wait ajax request:-(. Skip this events:-(');
        this.currentPage.currentEvent.status = 'timedOut';
        this.currentPage.currentEvent.completed = true;
    };

    Spider.prototype.onEventComplete = function() {
        this.setStatus('processEventMutations');

        this.currentPage.currentEvent.status = 'completed';
        this.currentPage.currentEvent.completed = true;

        var mutations = this.evaluate(function() {
            return MutationUtils.pumpChanges();
        });


        this.newLinks(mutations.addedLinks);
        this.currentPage.currentEvent.addMultipleXss(mutations.xss);

        mutations.addedEvents.forEach(this.processAddedEvent, this);
        mutations.removedEvents.forEach(this.processRemovedEvent, this);
    };

    Spider.prototype.processAddedEvent = function(event) {
        var pageEvent = new PageEvent(event.event, event.path);

        if (!this.isInterestedEvent(pageEvent))
            return;

        if (this.currentPage.isEventExists(pageEvent))
            return;

        pageEvent.depth = this.currentPage.currentEvent.depth + 1;

        this.currentPage.currentEvent.addEvent(pageEvent);
        this.currentPage.eventsQueue.insertNear(pageEvent);
        this.currentPage.allEvents.push(pageEvent);
    };

    Spider.prototype.processRemovedEvent = function(event) {
        if (event.path === null)
            return;

        var pageEvent = new PageEvent(event.event, event.path);
        var savedEvent = this.currentPage.removeNextEvent(pageEvent);
        if (savedEvent === null)
                return;

        this.currentPage.deferredEvents.push(savedEvent);
        //ToDo: implement reload&restoreCondition future!
//        this.reloadNeeded = true;
    };

    Spider.prototype.getPageEvents = function(container, callBack) {
        this.then(function() {
            callBack.call(this, this.evaluate(function(container) {
                container = container || 'body';
                return EventCollector.getAll(document.querySelectorAll(container + ' *'));
            }, {arg1: container}));
        });
    };

    Spider.prototype.newLinks = function(links) {
        links.forEach(this.processNewLink, this);
    };

    Spider.prototype.processNewLink = function(link) {
        var linkToAdd = this.normalizeUrl(link);
        if (
                (
                    this.properties.maxPages === 0
                    || this.pagesQueue.length < this.properties.maxPages
                )
                && this.isInterestedUrl(linkToAdd)
                && !this.isUrlExists(linkToAdd)
            ) {
            var page = new Page(linkToAdd);
            this.currentPage.addPage(page);
            this.pagesQueue.insertNear(page);
        }
    };

    Spider.prototype.normalizeUrl = function(url) {
        if (url === 'about:blank')
            return url;

//        url = url
//                .replace(/#.+$/, '')
                //.replace(/\?.+$/, '')
//                .replace(/(\?|&)(set_filter=|lang=|logout=|back_url=|back_url_settings=|backurl_settings=|backurl=|PAGEN_|print=|filter=|filter_[^=]*=|find=|find_[^=]*=)[^&]+(&|$)/g, '$1')
                //.replace(/(\?|&)+$/, '');
//                .replace(/(\?|&)$/, '')
//                .replace(/&{2,}/g, '&');

        if (/^https?:\/\//.test(url))
            return url;

        if (url.indexOf('/') === 0)
            return this.properties.targetHost + url;

        if (url.indexOf('?') === 0)
            return this.currentPage.url.replace(/(\?|#).+$/, '') + url;

        return this.currentPage.url.replace(/\/[^\/]*((\?|#).*)*$/, '') + '/' + url;
    };

    Spider.prototype.isInterestedUrl = function(url) {
        return (
                !/excel=/i.test(url)
                && !/week_start=/i.test(url)
                && url !== 'about:blank'
                && this.properties.acceptableUrlRegExp.test(url)
                //&& !/^https?:\/\/[^\/]*(google|facebook|youtube|twitter|yandex)/.test(url)
            );
    };

    Spider.prototype.isUrlExists = function(url) {
        for (var i = 0, length = this.pagesQueue.length; i < length; i++) {
            if (this.pagesQueue[i].url === url)
                return true;
        }
        return false;
    };

    Spider.prototype.info = function(title, message) {
        if (!this.options.verbose)
            return;

        if (!!message)
            this.echo(title + ': ' + message);
        else
            this.echo(title);
    };

    Spider.prototype.debugDump = function(value) {
        if (!this.options.verbose)
            return;

        utils.dump(value);
    };

    Spider.prototype.attachEvents = function() {
        this.on('url.changed', this.onUrlChanged);
        this.on('load.failed', this.onLoadError);
        this.on('http.status.404', this.onLoadError);
        this.on('http.status.500', this.onLoadError);
        this.on('error', this.onError);
        this.on('step.error', this.onError);
        this.on('page.error', this.onPageError);
        this.on('navigation.requested', this.onNavigation);
        this.on('resource.requested', this.onResourceRequested);
        this.on('resource.received', this.onResourceReceived);
    };

    Spider.prototype.onLoadError = function(resource) {
        this.info('Load failed', resource.url);
        this.currentPage.opened = false;
    };

    Spider.prototype.onError = function(message, trace) {
        this.info('Error occurred', message);
        if (!!trace)
            this.debugDump(trace);
    };

    Spider.prototype.onPageError = function(message, trace) {
        var error = {
            message: message
        };

        if (!!trace && trace.length !== 0) {
            error.file = trace[0].file;
            error.line = trace[0].line;
        }

        this.currentPage.addJsError(error);
    };

    Spider.prototype.onNavigation = function(url, navigationType, willNavigate, isMainFrame) {
         if (!willNavigate)
            this.newLinks([url]);
    };

    Spider.prototype.onUrlChanged = function() {
        //We need EventCollector injection here, for AddEventListener overriding:(
        //ToDo: think something better! :)
        this.page.injectJs('client_scripts/event-collector.js');
    };

    Spider.prototype.onResourceRequested = function(request) {
        if (!this.isInterestedResourceUrl(request.url))
            return;

        this.info('New request (' + this.networkActivity + ')', request.url);

        this.networkActivity++;
        this.requestsIDs.push(request.id);
        //ToDo: remove this!
        this.context.resourses.push(request.url);
    };

    Spider.prototype.onResourceReceived = function(request) {
        if (request.stage !== 'end')
            return;

        if (!this.isInterestedResourceUrl(request.url))
            return;

        if (this.requestsIDs.indexOf(request.id) < 0)
            return;

        this.networkActivity--;
        this.info('Request received (' + this.networkActivity + ')', request.url);
    };

    Spider.prototype.isInterestedResourceUrl = function(url) {
        return (
            /^http[s]*:\/\/([^\/]*(google|facebook|youtube|twitter|yandex))?/i.test(url)
            && !/\.(css|jpg|png|js)(\?|$)/i.test(url)
        );
    };

    Spider.prototype.clear = function() {
        this.checkStarted();
        this.page.content = '';
        return this;
    };

    Spider.prototype.clearNetworkActivity = function() {
        this.networkActivity = 0;
        this.requestsIDs = [];
    };

    Spider.prototype.reload = function() {
        this.setStatus('reloading');
        this.page.navigationLocked = false;
        this.info('<----------reload "' + this.currentPage.url + '"---------->');
        this.open(this.currentPage.url);
        this.currentPage.eventsQueue = IterifyArray(this.currentPage.deferredEvents);
        this.currentPage.deferredEvents = [];
        this.currentPage.reloadCount += 1;
    };

    Spider.prototype.openNextPage = function() {
        this.currentPage = this.pagesQueue.next();
        this.currentPage.processed = true;
        this.currentPage.opened = true;
        this.currentPage.startTime = new Date().getTime();
        this.info('<----------proccess "' + this.currentPage.url + '"---------->');

        this.setStatus('opening');
        this.page.navigationLocked = false;
        this.open(this.currentPage.url);
    };

    Spider.prototype.isInterestedEvent = function(event) {
        return (
            this.properties.skipEventPath === null
            || !this.properties.skipEventPath.test(event.path)
        );
    };

    Spider.prototype.getResults = function() {
        var xssMarks = [];
        var failedPages = [];
        var jsErrors = [];
        var failedEvents = [];

        var page = null;
        for (var i = 0, count = this.pagesQueue.length; i < count; i++) {
            page = this.pagesQueue[i];
            if (!helper.isEmpty(page.jsErrors)) {
                page.jsErrors.forEach(function(item) {
                    jsErrors.push({
                        'url': this.url,
                        'error': item
                    })
                }, page);
            }

            if (!helper.isEmpty(page.xss)) {
                page.xss.forEach(function(item) {
                    xssMarks.push({
                        'url': this.url,
                        'xss': item
                    })
                }, page);
            }

            if (!helper.isEmpty(page.allEvents)) {
                page.allEvents.forEach(function(event) {
                    if (!helper.isEmpty(event.xss)) {
                        this.xss.forEach(function(xss) {
                            xssMarks.push({
                                'url': page.url,
                                'event': {
                                    'type': event.eventType,
                                    'path': event.path
                                },
                                'xss': xss
                            })
                        }, event);
                    }

                    if (event.status != 'completed') {
                        failedEvents.push(event);
                    }
                }, page);
            }
        }

        return {
            'xssMarks': xssMarks,
            'failedPages': failedPages,
            'jsErrors': jsErrors,
            'failedEvents': failedEvents
        }
    };


    exports.Spider = Spider;

})(exports, patchRequire(require));