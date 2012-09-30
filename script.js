// This blob is just a prototype 

modules['wikiReferrer'] = {
	moduleID: 'wikiReferrer',
	moduleName: 'Wiki Section Link Comment Tool',
	description: "Commenting tool which shows a dropdown menu to generate quick links to sections in a wiki page, determined by the wiki's table of contents."
	category: 'Comments',
	options: {
		url: {
			type: 'text',
			value: '/r/noahjk/faq',
			description: 'URL of wiki page'
		},
		tocSelector: {
			type: 'text',
			value: '.wiki-toc',
			description: 'jQuery selector for DOM element containing Table(s) of Contents'
		},
		,
		toolText: {
			type: 'text',
			value: 'wiki',
			description: 'Text to display in toolbar'
		},
		refreshAfter: { 
			type: number,
			value: 7,
			description: 'How many days to wait to refresh the table of contents list from the original wiki page'
		}
	},
	isEnabled: function() { return RESConsole.getModulePrefs(this.moduleID); },

	include: Array(
		/https?:\/\/([a-z]+).reddit.com\/[-\w\.\/]+\/comments\/[-\w\.]+/i,
		/https?:\/\/([a-z]+).reddit.com\/comments\/[-\w\.]+/i,
		/https?:\/\/([a-z]+).reddit.com\/message\/[-\w\.]*\/?[-\w\.]*/i,
		/https?:\/\/([a-z]+).reddit.com\/r\/[-\w\.]*\/submit\/?/i,
		/https?:\/\/([a-z]+).reddit.com\/user\/[-\w\.\/]*\/?/i,
		/https?:\/\/([a-z]+).reddit.com\/submit\/?/i
	),
	isMatchURL: function() {
		return RESUtils.isMatchURL(this.moduleID);
	},
	go: function() {
 
	}
}






function RESWikiReferrer(controlBox, targetTextArea) {
	var settings = getSettings();

	function getSettings() {
		return {
			toolText: 'wiki'
			url: "/r/noahjk/faq",
			tocSelector: '.wiki-toc',
			macroText = '\n\n---\n\nMore information can be found in the [%%name%% section of my FAQ](%%link%%)',
			refreshAfter: 7 // days, once a week
		}

	}

	var tocProvider = RESWikiReferrer.TableOfContents(settings);
	var textMangler = RESWikiReferrer.TextMangler(settings);
	var dialog = RESWikiReferrer.Dialog(settings, tocProvider);
	var commenter = RESWikiReferrer.Commenter(settings, addTextToTextarea);
	var control = RESWikiReferrer.TextControl(settings, controlBox, onClickControl);
	

	function onClickControl(evt) {
		dialog.show(control.element, onSelectItem);
	}

	function onSelectItem(tcoItem) {
		if (!(tcoItem && tcoItem instanceof TableOfContentItem)) {
			var commentText = textMangler(settings.macroText, {
				name: tcoItem.display,
				link: tcoItem.href
			});

			commenter(commentText);
		}
	}

	function addTextToTextarea(text) {
		prefixSelectionLines( targetTextArea, text );
		refreshPreview( preview, targetTextArea );
		targetTextArea.focus();
	}


	// Utility function copied from RES
	function prefixSelectionLines( targetTextArea, prefix )
	{
		var scrollTop = targetTextArea.scrollTop;
		var selectionStart = targetTextArea.selectionStart;
		var selectionEnd = targetTextArea.selectionEnd;

		var selectedText = targetTextArea.value.substring( selectionStart, selectionEnd );

		var lines = selectedText.split( '\n' );

		var newValue = '';

		for( var i = 0; i < lines.length; i++ )
		{
			// newValue += prefix + lines[i] + '\n';
			newValue += prefix + lines[i];
			if ( ( i + 1 ) != lines.length ) {newValue += '\n';}
		}

		targetTextArea.value = 
			targetTextArea.value.substring( 0, selectionStart ) + //text leading up to the selection start
			newValue + 
			targetTextArea.value.substring( selectionEnd ); //text after the selection end

		targetTextArea.scrollTop = scrollTop;
	}

	function refreshPreview(preview, targetTextArea) { /* stub */ }
})();

RESWikiReferrer.prototype.TextControl = function(settings, controlBox, onClickControl) {
	var textControl = function() {
		return textControl.create.apply(textControl, Arguments.prototype.slice.call(arguments, 0))		
	}

	textControl.create = function() {
		if (!$.isFunction(onClickControl)) return;
		
		var $html = $(textControl.html);
		if (settings.toolText) {
			$html.text(settings.toolText);
		}

		$html.appendTo(controlBox);

		$html.click(onClickControl)
	}

	textControl.html = '<a tabindex="1" href="javascript:;">wiki</a>';
}



RESWikiReferrer.prototype.Commenter = function(settings, addTextDelegate) {
	var commenter() {
		return commenter.comment.apply(commenter, Arguments.prototype.slice.call(arguments, 0))
	}

	commenter.comment = function(text) {
		if (!targetTextArea) return;

		addTextDelegate(text);
	}
}

RESWikiReferrer.prototype.Dialog = function(settings, tocProvider) {
	var $html, _onSelect;

	function dialog() {
		return dialog.create.apply(dialog, Arguments.prototype.slice.call(arguments, 0))
	}
	
	dialog.create = function() {
		var $html = $("#RESWikiReferrerDialog");
		if ($html.length) return;

		$html = $(dialog.html);
		$html.appendTo('body');
	

		$html.css({
			'position': 'absolute',
			'z-index': 50,
			'display': 'none'
		});

		$html.live('click', 'button', function(e) {
			switch (e.target.attr('value')) {
				case 0:
					dialog.cancel();
					break;
				case 1:
				default:
					dialog.select();
					break;
			}
		})
	}

	dialog.show = function($relativeTo, onSelect) {
		dialog.create();
		_onSelect = onSelect;

		if ($relativeTo) {
			var offset = $relativeTo.offset();
			offset.top += $relativeTo.height();
		}

		var $select = $html.find('select');

		$html.offset(offset);
		$html.show();

		if (!$select.children().length) {
			dialog.loading();
			tocProvider(dialog.populate, dialog.error);
			return;
		}

		dialog.loaded();
	}

	dialog.hide = function() {
		$html.hide();
	}

	dialog.toggle = function() {
		$html.toggle();
	}

	dialog.cancel = function() {
		dialog.hide();
	}

	dialog.select = function() {
		var $selected = $html.find('select option:selected');
		var tocItem = $selected.data('res-wiki-referrer-item');

		dialog.hide();

		if (!$.isFunction(_onSelect)) {
			_onSelect(tocItem);
		}
	}

	dialog.populate = function(toc) {
		toc.forEach(function (element, index, array) {
			var $option = $('<option></option>', { value: element.href });
			$option.data('res-wiki-referrer-item', element);
			$option.text(element.display || element.href);
			$option.appendTo($select);
		});

		dialog.loaded();
	};

	dialog.loading = function() {
		$html.find('.res-wiki-referrer-throbber').show();
		$html.find('select').hide();
		$html.find('button[value=1]').attr('disabled', 'disabled');
	};

	dialog.loaded = function() {
		$html.find('.res-wiki-referrer-throbber').hide();
		$html.find('select').show();
		$html.find('button[value=1]').removeAttr('disabled');
	};


	dialog.error = function() {
		$html.find('.res-wiki-referrer-throbber').hide();
		$html.find('select').empty();
		$html.find('select').after('<div>Well, this is embarrassing.</div>');
	};


	dialog.html = ['<div id="RESWikiReferrerDialog" class"res-wiki-referrer-dialog>',
			'<div class="res-wiki-referrer-throbber"></div>'
			'<select></select>' ,
			'<div><button value="0">cancel</button> <button value="1">ok</button></div>',
		'</div>',
		].join('\n');

}


RESWikiReferrer.prototype.TextMangler = (settings) {
	function textMangler() {
		return textMangler.replaceHolders.apply(textMangler, Array.prototype.slice.call(arguments, 0));
	}

	textMangler.replaceHolders = function(text, replacements) {
		for (var replacementKey in replacements) {
			if (replacements.hasOwnProperty(replacementKey)) {
				var replacementValue = replacements[replacementKey]
				text = text.replace('%%' + replacementKey + '%%', replacementValue)
			}
		}
	}

	return textMangler;
}



RESWikiReferrer.prototype.TableOfContents = function(settings) {
	var tableContents = function() {
		return tableContents.mangle.apply(tableContents, Array.prototype.slice.call(arguments, 0));
	}

    tableContents.get = function (onSuccess, onError) {
		var toc = tableContents.fromStorage();
		if (toc && tableContents.isValid(toc)) {
			onSuccess(toc);
		}

		var saveAndSuccess = function(toc) {
			tableContents.toStorage(toc);
			if ($.isFunction(onSuccess)) {
				onSuccess(toc);
			}
		}
		tableContents.fromWiki(saveAndSuccess, onError);
		
		
	}

	tableContents.storageKey = 'RES.TOCWiki:' + settings.url;
	tableContents.fromStorage = function() {
		return localStorage.getItem(tableContents.storageKey);
	}

	tableContents.toStorage = function(toc) {
		localStorage.setItem(tableContents.storageKey, toc);
	}

	tableContents.fromWiki = function(onSuccess, onError) {
		$.ajax({
			url: settings.url,
			dataType: "html",

			success: function(data) {
				var toc = tableContents.parseWiki(data);
				if (toc) {
					if ($.isFunction(onSuccess)) {
						onSuccess(toc);
					}
				} else if ($.isFunction(onError)) {
					onError();
				}
			},
			error: function() {
				if ($.isFunction(onError)) {
					onError();
				}
			}
		})
	}

	tableContents.parseWiki = function(html) {
		var $html = $($(html);
		var $toc = $html.find(settings.tocSelector).find('li a');
		if (!$toc.length) return;

		var toc = new TableOfContents;
		toc.items = $.map($toc, domToTop)
		return toc;

		function domToTocItem(element) {
			var $item = $(element);
			var display = $item.text();
			var href = $item.attr('href');
			var tocItem = new TableOfContentItem(href, display, settings.url);

			return tocItem;
		}

	}

	tableContents.isValid = function (toc) {
		if (!toc || !toc instanceof TableOfContents) {
			return false;
		}

		return toc.isValid();
	}


	function TableOfContents() {
		this.items = [];
		this.lastSaved = new Date();
	}
	TableOfContents.prototype.isValid = function() {
		if (!this.lastSaved) return false;

		var refreshAfter = Math.max(0, settings.refreshAfter);

		var expiresOn = this.lastSaved + (refreshAfter * 86400000);
		if (expiresOn > new Date) {
			return true;
		}
	};

	function TableOfContentItem(href, display, baseUrl) {
		this.href = href.indexOf('://') > 0 ? href : baseUrl + href;
		this.display = display;
	}

	return tableContents;
}
