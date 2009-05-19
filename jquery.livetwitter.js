/*
 * jQuery LiveTwitter 1.2
 * - Live updating Twitter plugin for jQuery
 *
 * Copyright (c) 2009 Inge Jørgensen (elektronaut.no)
 * Licensed under the MIT license (MIT-LICENSE.txt)
 *
 * $Date: 2009/05/20 $
 */

/*
 * Usage example:
 * $("#twitterSearch").liveTwitter('bacon', {limit: 10, rate: 15000});
 */

(function($){
	if(!$.fn.reverse){
		$.fn.reverse = function() {
			return this.pushStack(this.get().reverse(), arguments);
		};
	}
	$.fn.liveTwitter = function(query, options){
		var settings = jQuery.extend({
			mode:      'search', // Mode, valid options are: 'search', 'user_timeline'
			rate:      15000,    // Refresh rate in ms
			limit:     10        // Limit number of results
		}, options);
		window.twitter_callback = function(){return true;};
		if(this.twitter){
			clearInterval(this.twitter.interval);
		}
		this.twitter = {
			query:     query,
			limit:     settings.limit,
			mode:      settings.mode,
			interval:  false,
			container: this,
			tweetIds:  [],
			relativeTime: function(timeString){
				var parsedDate = Date.parse(timeString);
				var delta = (Date.parse(Date()) - parsedDate) / 1000;
				var r = '';
				if (delta < 60) {
					r = 'a moment ago';
				} else if(delta < 120) {
					r = 'a couple of minutes ago';
				} else if(delta < (45*60)) {
					r = (parseInt(delta / 60, 10)).toString() + ' minutes ago';
				} else if(delta < (90*60)) {
					r = 'an hour ago';
				} else if(delta < (24*60*60)) {
					r = '' + (parseInt(delta / 3600, 10)).toString() + ' hours ago';
				} else if(delta < (48*60*60)) {
					r = 'a day ago';
				} else {
					r = (parseInt(delta / 86400, 10)).toString() + ' days ago';
				}
				return r;
			},
			refresh:  function(initialize){
				var encodedQuery = encodeURIComponent(this.query);
				var twitter = this;
				var url = '';
				if(twitter.mode == 'search'){
					url = "http://search.twitter.com/search.json?q="+encodedQuery+"&callback=?";
				} else if(twitter.mode == 'user_timeline') {
					url = "http://twitter.com/statuses/user_timeline/"+encodedQuery+".json?count=5&callback=?";
				}
				$.getJSON(url, function(json) {
					var results = null;
					if(twitter.mode == 'search'){
						results = json.results;
					} else {
						results = json;
					}
					$(results).reverse().each(function(){
						var linkified_text = this.text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function(m) { return m.link(m); });
						linkified_text = linkified_text.replace(/@[A-Za-z0-9_]+/, function(u){return u.link('http://twitter.com/'+u.replace(/^@/,''));});
						if($.inArray(this.id, twitter.tweetIds) < 0) {
							var tweetHTML = '<div class="tweet tweet-'+this.id+'">';
							if(twitter.mode == 'search') {
								tweetHTML += 
									'<img width="24" height="24" src="'+this.profile_image_url+'" />' +
									'<p class="text"><span class="username"><a href="http://twitter.com/'+this.from_user+'">'+this.from_user+'</a>:</span> ';
							} else {
								tweetHTML += 
									'<p class="text"> ';
							}
							tweetHTML += 
								linkified_text +
								' <span class="time">'+twitter.relativeTime(this.created_at)+'</span>' +
								'</p>' +
								'</div>';
							$(twitter.container).prepend(tweetHTML);
							if(!initialize) {
								$(twitter.container).find('.tweet-'+this.id).hide().fadeIn();
							}
							twitter.tweetIds.push(this.id);
						}
					});
					// Limit number of entries
					$(twitter.container).find('div.tweet:gt('+(twitter.limit-1)+')').remove();
			     });
			}
		};
		var twitter = this.twitter;
		twitter.interval = setInterval(function(){twitter.refresh();}, settings.rate);
		twitter.refresh(true);
		return this;
	};
})(jQuery);