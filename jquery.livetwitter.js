/*
 * jQuery LiveTwitter 1.3.2
 * - Live updating Twitter plugin for jQuery
 *
 * Copyright (c) 2009 Inge Jørgensen (elektronaut.no)
 * Licensed under the MIT license (MIT-LICENSE.txt)
 *
 * $Date: 2009/09/16 $
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
		$(this).each(function(){
			var settings = {};
			if(this.twitter){
				settings = jQuery.extend(this.twitter.settings, options);
				this.twitter.settings = settings;
				if(query) {
					this.twitter.query = query;
				}
				this.twitter.limit    = settings.limit;
				this.twitter.mode     = settings.mode;
				if(this.twitter.interval){
					this.twitter.refresh();
				}
			} else {
				settings = jQuery.extend({
					mode:      'search', // Mode, valid options are: 'search', 'user_timeline'
					rate:      15000,    // Refresh rate in ms
					limit:     10,       // Limit number of results
					refresh:   true
				}, options);
				if(typeof settings.showAuthor == "undefined"){
					if(settings.mode == 'search'){
						settings.showAuthor = true;
					} else {
						settings.showAuthor = false;
					}
				}
				window.twitter_callback = function(){return true;};
				this.twitter = {
					settings:      settings,
					query:         query,
					limit:         settings.limit,
					mode:          settings.mode,
					interval:      false,
					container:     this,
					lastTimeStamp: 0,
					relativeTime: function(timeString){
						var parsedDate = Date.parse(timeString);
						var delta = (Date.parse(Date()) - parsedDate) / 1000;
						var r = '';
						if (delta < 60) {
							r = delta + ' seconds ago';
						} else if(delta < 120) {
							r = 'a minute ago';
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
					refreshTime: function() {
						var twitter = this;
						$(twitter.container).find('span.time').each(function(){
							$(this).html(twitter.relativeTime(this.timeStamp));
						});
					},
					refresh:  function(initialize){
						var twitter = this;
						if(this.settings.refresh || initialize) {
							var encodedQuery = encodeURIComponent(this.query);
							var url = '';
							if(twitter.mode == 'search'){
								url = "http://search.twitter.com/search.json?q="+encodedQuery+"&callback=?";
							} else if(twitter.mode == 'user_timeline') {
								url = "http://twitter.com/statuses/user_timeline/"+encodedQuery+".json?count="+twitter.limit+"&callback=?";
							}
							$.getJSON(url, function(json) {
								var results = null;
								if(twitter.mode == 'search'){
									results = json.results;
								} else {
									results = json;
								}
								$(results).reverse().each(function(){
									var screen_name = '';
									var profile_image_url = '';
									if(twitter.mode == 'search') {
										screen_name = this.from_user;
										profile_image_url = this.profile_image_url;
									} else {
										screen_name = this.user.screen_name;
										profile_image_url = this.user.profile_image_url;
									}
									var userInfo = this.user;
									var linkified_text = this.text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function(m) { return m.link(m); });
									linkified_text = linkified_text.replace(/@[A-Za-z0-9_]+/, function(u){return u.link('http://twitter.com/'+u.replace(/^@/,''));});
									if(Date.parse(this.created_at) > twitter.lastTimeStamp) {
										var tweetHTML = '<div class="tweet tweet-'+this.id+'">';
										if(twitter.settings.showAuthor) {
											tweetHTML += 
												'<img width="24" height="24" src="'+profile_image_url+'" />' +
												'<p class="text"><span class="username"><a href="http://twitter.com/'+screen_name+'">'+screen_name+'</a>:</span> ';
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
										var timeStamp = this.created_at;
										$(twitter.container).find('span.time:first').each(function(){
											this.timeStamp = timeStamp;
										});
										if(!initialize) {
											$(twitter.container).find('.tweet-'+this.id).hide().fadeIn();
										}
										twitter.lastTimeStamp = Date.parse(this.created_at);
									}
								});
								// Limit number of entries
								$(twitter.container).find('div.tweet:gt('+(twitter.limit-1)+')').remove();
							});
						}	
					},
					start: function(){
						var twitter = this;
						if(!this.interval){
							this.interval = setInterval(function(){twitter.refresh();}, twitter.settings.rate);
							this.refresh(true);
						}
					},
					stop: function(){
						if(this.interval){
							clearInterval(this.interval);
							this.interval = false;
						}
					}
				};
				var twitter = this.twitter;
				this.timeInterval = setInterval(function(){twitter.refreshTime();}, 5000);
				this.twitter.start();
			}
		});
		return this;
	};
})(jQuery);