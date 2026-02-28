/**
 * Tippy Javascript handler for the scite extension
 */

/*global jQuery, mediaWiki, onoi, tippy */
/*global confirm */

(function ($, mw, onoi) {
	'use strict';

	$(function ($) {
		var configuration = mw.config.get('ext.scite.config');
		var blobstore = new onoi.blobstore(
			'scite' +
				':' +
				mw.config.get('wgCookiePrefix') +
				':' +
				mw.config.get('wgUserLanguage'),
		);

		/**
		 * API instance
		 *
		 * @since 1.0
		 */
		var doApiRequestFor = function (reference, tipInstance) {
			var api = new mw.Api();

			api
				.get({
					action: 'ask',
					format: 'json',
					query: '[[Citation key::' + reference + ']]|?Citation text|limit=1',
				})
				.done(function (content) {
					var citationText = '';

					$.each(content.query.results, function (subjectName, subject) {
						if ($.inArray('printouts', subject)) {
							$.each(subject.printouts, function (property, values) {
								citationText =
									$.type(values) === 'array' ? values.toString() : values[0];
							});
						}
					});

					if (citationText === '') {
						var msgKey = content.hasOwnProperty('query-continue-offset')
							? 'sci-tooltip-citation-lookup-failure-multiple'
							: 'sci-tooltip-citation-lookup-failure';
						tipInstance.setContent(mw.msg(msgKey, reference));
						return;
					}

					api
						.parse('<div class="scite-api-parse">' + citationText + '</div>')
						.done(function (html) {
							html = $(html).find('.scite-api-parse').html() || citationText;

							blobstore.set(
								reference,
								html,
								configuration.tooltipRequestCacheTTL,
							);

							tipInstance.setContent(html);
						});
				})
				.fail(function (xhr, status, error) {
					tipInstance.setContent(status + ': ' + error);
				});
		};

		/**
		 * Initialize Tippy tooltips
		 */
		$.map(configuration.showTooltipForCitationReference, function (selector) {
			switch (selector) {
				case 2:
					selector = '.scite-citeref-key';
					break;
				case 1:
				default:
					selector = '.scite-citeref-number';
			}

			$(selector).each(function () {
				var el = this;
				var reference = $(el).data('reference');
				
/* TODO, use something like that
// @see ext.smw.tooltip.tippy.js
				var tip = smw.Factory.newTooltip();
				tip.show({
					context: el, // element contains the smw-highlighter class now
					title: reference,
					content: '<div class="scite-tooltip"><span class="scite-tooltip-loading" alt="Loading..."></span></div>'
				});

				var tipInstance = el._tippy;

				// Async: check cache or fetch
				blobstore.get(reference, function(value) {
					if (configuration.tooltipRequestCacheTTL === 0 || value === null) {
						doApiRequestFor(reference, tipInstance);
					} else {
						tipInstance.setContent(
							'<span>' + reference + '</span>' +
							'<div class="scite-tooltip-cache-indicator scite-tooltip-cache-browser"></div>' +
							value
						);
					}
				});
*/

				blobstore.get(reference, function (value) {
					tippy(el, {
						content: value || '',
						allowHTML: true,
						placement: 'top',
						interactive: true,
						onShow: function (tipInstance) {
							if (configuration.tooltipRequestCacheTTL === 0 || !value) {
								doApiRequestFor(reference, tipInstance);
							}
						},
					});
				});
			});
		});
	});
})(jQuery, mediaWiki, onoi);
