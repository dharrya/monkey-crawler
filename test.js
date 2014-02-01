(function start(require) {
    "use strict";

    var Spider = require('lib/spider').Spider;
    var utils = require('utils');

    var startTime = new Date().getTime();
    var spider = new Spider();
    var url = 'https://github.com/dharrya';
    if (spider.cli.has(0))
        url = spider.cli.get(0);

    spider.initialize({
        targetUri: url,
        eventContainer: undefined
    });

    spider.start(url);
    spider.then(spider.process);
    spider.run(function() {
        this.echo('\n<---------- COMPLETED ---------->\n');

        var deltaTime = new Date().getTime() - startTime;
        deltaTime = (deltaTime / 1000).toFixed(2);
        this.echo('time: ' + deltaTime + 'sec');
        this.echo('Processed pages:' + this.pagesQueue.length);
        utils.dump(this.pages);
        spider.exit();
    });

})(require);