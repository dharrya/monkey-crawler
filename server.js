var server = require('webserver').create();
var Spider = require('lib/spider').Spider;
var utils = require('utils');

var dispatcher = {
	_spider: null,
    _startTime: null,
    _lastResults: null,
	action: {
		start: function(request) {
            if (!!dispatcher._spider)
				return {status: 'failed', message: 'Already started! Fuck off!'};

            var post = {};
            if (phantom.casperEngine !== "slimerjs")
                post = request.post;
            else
                post = this._parseQuery(request.post);

			if (!post.url)
				return {status: 'failed', message: 'Url not present!'};

            var properties = {
                targetUri: post.url
            };

            if (post.eventContainer)
                properties.eventContainer = post.eventContainer !== 'None' ? post.eventContainer: null;
            if (post.skipEventPath)
                properties.skipEventPath = post.skipEventPath !== 'None' ? post.skipEventPath: null;

            dispatcher._lastResults = null;
            dispatcher._startTime = new Date().getTime();
			dispatcher._spider = new Spider();
			dispatcher._spider.initialize(properties);
			dispatcher._spider.start(post.url + '?clear_all_cache=Y');
			dispatcher._spider.then(function auth() {
				if (!post.login || !post.password)
					return;

				if (!this.exists('form[name="form_auth"]'))
					return;

				this.fill('form[name="form_auth"]', {
					USER_LOGIN: post.login ,
					USER_PASSWORD: post.password
				}, true);
			});
			dispatcher._spider.then(dispatcher._spider.process);
			dispatcher._spider.run(function() {
                this.echo('\n<---------- COMPLETED ---------->\n');


                var deltaTime = new Date().getTime() - dispatcher._startTime;
                deltaTime = (deltaTime / 1000).toFixed(2);
                this.echo('time: ' + deltaTime + 'sec');
				this.echo('Processed pages:' + this.pagesQueue.length);
                this.currentPage.eventsQueue = [];
                this.currentPage.deferredEvents = [];
                dispatcher._lastResults = this.getResults();
//                utils.dump(this.pages);
                utils.dump(dispatcher._lastResults);
                dispatcher._spider.clear();
                dispatcher._spider = null;
			});

			return {status: 'started', message: 'You\'re rock!'};
		},
		stop: function() {
			if (!dispatcher._spider)
				return {status: 'failed', message: 'Spider not started'};

			dispatcher._spider.completed = true;
            dispatcher._lastResults = this.getResults();
			return {'status': 'stopped'};
		}
	},
	info: {
		status: function() {
			if (!dispatcher._spider)
				return {status: 'completed', completed: true};

			return {
				'currentUrl': dispatcher._spider.currentPage.url,
				'pagesInfo': {
					'done': dispatcher._spider.pagesQueue.currentIndex,
					'all' : dispatcher._spider.pagesQueue.length
				},
                'eventsInfo': {
					'done': dispatcher._spider.currentPage.eventsQueue.currentIndex,
					'all' : dispatcher._spider.currentPage.eventsQueue.length
				},
                'status': dispatcher._spider.status,
				'completed': dispatcher._spider.completed
			}
		},
        results: function() {
            return dispatcher._lastResults;
        }
	},
    _parseQuery: function(query){
                var qs = query.substring(query.indexOf('?') + 1).split('&');
                for(var i = 0, result = {}; i < qs.length; i++){
                    qs[i] = qs[i].split('=');
                    result[qs[i][0]] = decodeURIComponent(qs[i][1]);
                }
                return result;
            }
};

var ip_server = '127.0.0.1:8585';
server.listen(ip_server, function(request, response) {

	var action = request.url.substr(1);
	var result = null;
	if (request.method === 'POST' && !!dispatcher.action[action]) {
		result = dispatcher.action[action](request, response);
	} else if (request.method === 'GET' && !!dispatcher.info[action]) {
		result = dispatcher.info[action](request, response);
	} else if (request.method !== 'OPTIONS'){
		response.statusCode = 418;
		result = {'status': 'failed'};
	}

	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept, x-csrftoken');
	response.write(JSON.stringify(result, null, null));
	response.close();
});
console.log('Server running at http://' + ip_server+'/');