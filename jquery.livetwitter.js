/*
 * jQuery LiveTwitter 1.6.5
 * - Live updating Twitter plugin for jQuery
 *
 * Copyright (c) 2009-2011 Inge Jørgensen (elektronaut.no)
 * Licensed under the MIT license (MIT-LICENSE.txt)
 *
 * $Date: 2011/02/23$
 */

/*jslint browser: true, devel: true, onevar: false, immed: false, regexp: false */
/*global window: false, jQuery: false */

/*
 * Usage example:
 * $("#twitterSearch").liveTwitter('bacon', {limit: 10, rate: 15000});
 */


(function ($) {

	// Extend jQuery with a reverse function if it isn't already defined
	if (!$.fn.reverse) {
		$.fn.reverse = function () {
			return this.pushStack(this.get().reverse(), arguments);
		};
	}
	
	$.fn.liveTwitter = function (query, options, callback) {
		var domNode = this;
		$(this).each(function () {
			var settings = {};

			// Does this.twitter already exist? Let's just change the settings.
			if (this.twitter) {
				settings = $.extend(this.twitter.settings, options);
				this.twitter.settings = settings;
				if (query) {
					this.twitter.query = query;
				}
				if (this.twitter.interval) {
					this.twitter.refresh();
				}
				if (callback) {
					this.twitter.callback = callback;
				}

			// ..if not, let's initialize.
			} else {

				// These are the default settings.
				settings = $.extend({
					mode:      'search', // Mode, valid options are: 'search', 'user_timeline', 'list', 'home_timeline'
					rate:      15000,    // Refresh rate in ms
					limit:     10,       // Limit number of results
					imageSize: 24,       // Size of image in pixels
					refresh:   true,
					timeLinks: true,
					retweets:  false,
					service:   false
				}, options);

				// showAuthor should default to true unless mode is 'user_timeline'.
				if (typeof settings.showAuthor === "undefined") {
					settings.showAuthor = (settings.mode === 'user_timeline') ? false : true;
				}

				// Set up a dummy function for the Twitter API callback.
				if (!window.twitter_callback) {
					window.twitter_callback = function () {
						return true;
					};
				}

				this.twitter = {
					settings:      settings,
					query:         query,
					interval:      false,
					container:     this,
					lastTimeStamp: 0,
					callback:      callback,

					// Convert the time stamp to a more human readable format
					relativeTime: function (timeString) {
						var parsedDate = Date.parse(timeString);
						var delta = (Date.parse(Date()) - parsedDate) / 1000;
						var r = '';
						if  (delta < 60) {
							r = delta + ' seconds ago';
						} else if (delta < 120) {
							r = 'a minute ago';
						} else if (delta < (45 * 60)) {
							r = (parseInt(delta / 60, 10)).toString() + ' minutes ago';
						} else if (delta < (90 * 60)) {
							r = 'an hour ago';
						} else if (delta < (24 * 60 * 60)) {
							r = '' + (parseInt(delta / 3600, 10)).toString() + ' hours ago';
						} else if (delta < (48 * 60 * 60)) {
							r = 'a day ago';
						} else {
							r = (parseInt(delta / 86400, 10)).toString() + ' days ago';
						}
						return r;
					},

					// Update the timestamps in realtime
					refreshTime: function () {
						var twitter = this;
						$(twitter.container).find('span.time').each(function () {
							var time_element = twitter.settings.timeLinks ? $(this).find('a') : $(this);
							time_element.html(twitter.relativeTime(this.timeStamp));
						});
					},
					
					apiURL: function () {
						var params = {};

						var protocol = (window.location.protocol === 'https:') ? 'https:' : 'http:';
						var baseURL  = 'api.twitter.com/1/';
						var endpoint = '';
						
						// Status.net
						if (this.settings.service) {
							baseURL = this.settings.service + '/api/';
						}
						
						// Search mode
						if (this.settings.mode === 'search') {
							baseURL  = (this.settings.service) ? this.settings.service + '/api/' : 'search.twitter.com/';
							endpoint = 'search';
							params   = {
								q:        (this.query && this.query !== '') ? this.query : null,
								geocode:  this.settings.geocode,
								lang:     this.settings.lang,
								rpp:      (this.settings.rpp) ? this.settings.rpp : this.settings.limit
							};
							
						// User/home timeline mode
						} else if (this.settings.mode === 'user_timeline' || this.settings.mode === 'home_timeline') {
							endpoint = 'statuses/' + this.settings.mode + '/' + encodeURIComponent(this.query);
							params   = {
								count:       this.settings.limit,
								include_rts: (this.settings.mode === 'user_timeline' && this.settings.retweets) ? '1' : null
							};

						// List mode
						} else if (this.settings.mode === 'list') {
							endpoint = encodeURIComponent(this.query.user) + 
							           '/lists/' + 
							           encodeURIComponent(this.query.list) + 
							           '/statuses';
							params   = {
								per_page: this.settings.limit
							};
						}

						// Construct the query string
						var queryString = [];
						for (var param in params) {
							if (params.hasOwnProperty(param) && typeof params[param] !== 'undefined' && params[param] !== null) {
								queryString[queryString.length] = param + '=' + encodeURIComponent(params[param]);
							}
						}
						queryString = queryString.join("&");
						

						// Return the full URL
						return protocol + '//' + baseURL + endpoint + '.json?' + queryString + '&callback=?';
					},

					// Handle reloading
					refresh: function (initialize) {
						var twitter = this;
						var settings = this.settings;
						if (settings.refresh || initialize) {
							$.getJSON(twitter.apiURL(), function (json) {
								var results = null;
								if (settings.mode === 'search') {
									results = json.results;
								} else {
									results = json;
								}
								var newTweets = 0;
								$(results).reverse().each(function () {
									var tweet_id = this.id;
									// Deal with the new Twitter IDSs
									if (this.id_str) {
										tweet_id = this.id_str;
									}
									var screen_name = '';
									var profile_image_url = '';
									var created_at_date = '';
									var tweet_url = '';
									if (settings.mode === 'search') {
										screen_name = this.from_user;
										profile_image_url = this.profile_image_url;
										created_at_date = this.created_at;
									} else {
										screen_name = this.user.screen_name;
										profile_image_url = this.user.profile_image_url;
										// Fix for IE
										created_at_date = this.created_at.replace(/^(\w+)\s(\w+)\s(\d+)(.*)(\s\d+)$/, "$1, $3 $2$5$4");
									}
									// support https
									// someday, twitter will add https support to twimg.com, but until then
									// we have to rewrite the profile image urls to the old Amazone S3 urls
									if (window.location.protocol === 'https:') {
										var matches = profile_image_url.match(/http[s]?:\/\/a[0-9]\.twimg\.com\/(\w+)\/(\w+)\/(.*?)\.(\w+)/i);
										if (matches) {
											profile_image_url = "https://s3.amazonaws.com/twitter_production/" + matches[1] + "/" + matches[2] + "/" + matches[3] + "." + matches[4];
										} else {
											// failsafe, if profile image url does not match the pattern above
											// then, at least, change the protocol to https
											// the image may not load, but at least the page stays secure
											profile_image_url = profile_image_url.replace('http:', 'https:');
										}
									}
									if (settings.service.length > 0) {
										tweet_url = 'http://' + settings.service + '/notice/' + tweet_id;
									} else {
										tweet_url = 'http://twitter.com/' + screen_name + '/statuses/' + tweet_id;
									}
									var userInfo = this.user;
									var linkified_text = this.text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/, function (m) { 
										return m.link(m); 
									});
									if (settings.service.length > 0) {
										linkified_text = linkified_text.replace(/@[A-Za-z0-9_]+/g, function (u) {
											return u.link('http://' + settings.service + '/' + u.replace(/^@/, ''));
										});
									} else {
										linkified_text = linkified_text.replace(/@[A-Za-z0-9_]+/g, function (u) {
											return u.link('http://twitter.com/' + u.replace(/^@/, ''));
										});
									}
									if (settings.service.length > 0) {
										linkified_text = linkified_text.replace(/#[A-Za-z0-9_\-]+/g, function (u) {
											return u.link('http://' + settings.service + '/search/notice?q=' + u.replace(/^#/, '%23'));
										});
									} else {
										linkified_text = linkified_text.replace(/#[A-Za-z0-9_\-]+/g, function (u) {
											return u.link('http://search.twitter.com/search?q=' + u.replace(/^#/, '%23'));
										});
									}
									
									if (!settings.filter || settings.filter(this)) {
										if (Date.parse(created_at_date) > twitter.lastTimeStamp) {
											newTweets += 1;
											var tweetHTML = '<div class="tweet tweet-' + tweet_id + '">';
											if (settings.showAuthor) {
												var profile_url = '';
												if (settings.service.length > 0) {
													profile_url = 'http://' + settings.service + '/' + screen_name;
												} else {
													profile_url = 'http://twitter.com/' + screen_name;
												}
												tweetHTML += 
													'<img width="' + settings.imageSize + '" height="' + settings.imageSize + '" src="' + profile_image_url + '" />' +
													'<p class="text"><span class="username"><a href="' + profile_url + '">' + screen_name + '</a>:</span> ';
											} else {
												tweetHTML += 
													'<p class="text"> ';
											}

											var timeText = twitter.relativeTime(created_at_date);
											var timeHTML = settings.timeLinks ? '<a href="' + tweet_url + '">' + timeText + '</a>' : timeText;

											tweetHTML += 
												linkified_text +
												' <span class="time">' + timeHTML + '</span>' +
												'</p>' +
												'</div>';
											$(twitter.container).prepend(tweetHTML);
											var timeStamp = created_at_date;
											$(twitter.container).find('span.time:first').each(function () {
												this.timeStamp = timeStamp;
											});
											if (!initialize) {
												$(twitter.container).find('.tweet-' + tweet_id).hide().fadeIn();
											}
											twitter.lastTimeStamp = Date.parse(created_at_date);
										}
									}
								});
								if (newTweets > 0) {
									// Limit number of entries
									$(twitter.container).find('div.tweet:gt(' + (settings.limit - 1) + ')').remove();
									// Run callback
									if (twitter.callback) {
										twitter.callback(domNode, newTweets);
									}
									// Trigger event
									$(domNode).trigger('tweets');
								}
							});
						}	
					},
					start: function () {
						var twitter = this;
						if (!this.interval) {
							this.interval = setInterval(function () {
								twitter.refresh();
							}, twitter.settings.rate);
							this.refresh(true);
						}
					},
					stop: function () {
						if (this.interval) {
							clearInterval(this.interval);
							this.interval = false;
						}
					},
					clear: function () {
						$(this.container).find('div.tweet').remove();
						this.lastTimeStamp = null;
					}
				};
				var twitter = this.twitter;
				this.timeInterval = setInterval(function () {
					twitter.refreshTime();
				}, 5000);
				this.twitter.start();
			}
		});
		return this;
	};
})(jQuery);
