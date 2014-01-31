var MutationUtils = {
    observer: null,
    changes: {
        addedEvents: [],
        removedEvents: [],
        addedLinks: [],
        xss: []
    },
    init: function(element) {
        "use strict";
        this.observer = new MutationSummary({
            callback: this.handler.bind(this),
            rootNode: element || window.document,
            queries: [
                {element: '*'},
                {element: 'a'},
                {element: 'xssmark'}
            ]
        });
    },
    handler: function(changes) {
        this.changes.addedEvents = this.changes.addedEvents.concat(
            EventCollector.getAll(changes[0].added)
        );

        this.changes.removedEvents = this.changes.removedEvents.concat(
            EventCollector.getAll(changes[0].removed)
        );

        this.changes.addedLinks = this.changes.addedLinks.concat(
            getLinkFromTags(changes[1].added)
        );
        this.changes.xss = this.changes.xss.concat(
            formatFoundXss(changes[2].added)
        );
    },
    pumpChanges: function() {
        var changes = this.changes;
        this.changes = {
            addedEvents: [],
            removedEvents: [],
            addedLinks: [],
            xss: []
        };
        return changes;
    }
};