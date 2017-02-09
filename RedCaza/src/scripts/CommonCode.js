/*
	Base.js, version 1.1
	Copyright 2006-2007, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
	
	Extended - JAL - to have a method to help with callbacks.
*/

/**
 * Regular expression to count function arguments. Over complicated to avoid using non-greedy operator that may not be supported.
 */
var COUNT_FUNCTION_ARGS = new RegExp(/function\s*\(([^\)]*)\)/);

var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass
	var extend = Base.prototype.extend;
	
	// build the prototype
	Base._prototyping = true;
	var proto = new this;
	extend.call(proto, _instance);
	delete Base._prototyping;
	
	// create th wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] != null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};
	
	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {	
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
				value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
			// Add 'getForCallback' functionality.
			// Add 'name' to functions.
			if (typeof value == "function")
			{
				this[source].fnName = source;
			}
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	},

	base: function() {
		// call this method from any other method to invoke that method's ancestor
	},
	
	/**
	 * Gets the number of arguments in a function definition.
	 *
	 * @param functionSource The function source.
	 *
	 * @return The number of arguments.
	 */
	__getNumberOfArguments: function(functionSource)
	{
		var argsMatch = COUNT_FUNCTION_ARGS.exec(functionSource);
		if (!argsMatch || argsMatch.length < 1)
		{
			return 0;
		}
		
		var matchedArgs = argsMatch[1].split(',');
		
		// Test for 0 arguments.
		if (matchedArgs[0].length == 0)
		{
			return 0;
		}
		else
		{
			return matchedArgs.length;
		}
	},

	/**
	 * Creates an argument list.
	 *
	 * @param numArgs The number of arguments.
	 *
	 * @return The argument list.
	 */
	__createArgumentList: function(numArgs)
	{
		var argString = '';
		if (numArgs == 0)
		{
			return argString;
		}
		
		var argNum = 0;
		argString += 'arg' + argNum;
		while (++argNum < numArgs)
		{
			argString += ',arg' + argNum;
		}
		return argString;
	},
	
	/**
	 * Returns a function to be used in callback routines.
	 *
	 * @param callingContext The calling context to execute the function from.
	 * @param theFunction The function to execute.
	 *
	 * @return The callback function.
	 */
	getForCallback: function(callingContext, theFunction)
	{
		var callbackFunction;
		var argList = this.__createArgumentList(this.__getNumberOfArguments(theFunction));
		
		var functionCreateStr = 'callbackFunction = function(' + argList + ')';
		functionCreateStr += '{callingContext.' + theFunction.fnName + '(' + argList + ');';
		functionCreateStr += '};';
		return eval(functionCreateStr);
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",
	
	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},
		
	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},
	
	toString: function() {
		return String(this.valueOf());
	}
});
/**
 * Load common libraries.
 * Requires hosting page to include Google's AJAX APIs.
 */
google.load("jquery", "1");
google.load("jqueryui", "1");

/** Application loader. **/
google.setOnLoadCallback(onLoad);

/**
 * Function to be invoked on page load. Sets up the required objects.
 */
function onLoad()
{
    // Setup default JQuery AJAX settings. Default 10 seconds timeout. Ensure utf-8 used throughout.
    $.ajaxSetup({timeout: 10000, scriptCharset: "utf-8", contentType: "application/json; charset=utf-8"});

    // Call application onLoad method.
    onLoadExtended();
    
    // Check that the latest plugin is being used.
    checkPlugin();
}

/**
 * URL to report bad media.
 */
var BAD_MEDIA_URL = 'google/addBadMedia';

/**
 * URL to send comments to.
 */
var COMMENTS_URL = 'addComments';

/**
 * Stylesheet HTML snippet to insert dynamically.
 */
var STYLESHEET_LINK = '/winamp.css?font=FONT&fontsize=FONT_SIZE&' +
	'itemBackground=ITEM_BACKGROUND&itemForeground=ITEM_FOREGROUND&windowBackground=WINDOW_BACKGROUND&' +
	'buttonForeground=BUTTON_FOREGROUND&hilite=HILITE&' +
	'listHeaderBackground=LIST_HEADER_BACKGROUND&listHeaderText=LIST_HEADER_TEXT&' +
	'selectionBarForeground=SELECTION_BAR_FOREGROUND&selectionBarBackground=SELECTION_BAR_BACKGROUND&' +
	'inactiveSelectionBarBackground=INACTIVE_SELECTION_BAR_BACKGROUND&' +
	'alternateItemBackground=ALTERNATE_ITEM_BACKGROUND&' +
	'alternateItemForeground=ALTERNATE_ITEM_FOREGROUND';
	
/**
 * Request string for enqueuing media.
 */
var ENQUEUE_MEDIA = 'redcaza://{"operation": OPERATION, "url": "URL", "title": "TITLE", "duration": DURATION}';

/**
 * Gets JSON from the same domain.
 * 
 * @param url The request URL.
 * @param data The request data to send.
 * @param fnCallbackSuccess Function to call on success, e.g. fn(data, textStatus)
 * @param fnCallbackError Function to call on error, e.g. fn(XMLHttpRequest, textStatus, errorThrown)
 */
function getDomainJSON(url, data, fnCallbackSuccess, fnCallbackError)
{
	$.ajax({
		dataType: "json",
		data: data,
		error: fnCallbackError,
		success: fnCallbackSuccess,
		url: url});
}

/**
 * Gets JSON from another domain that supports JSONP.
 * 
 * @param url The full request URL.
 * @param data The request data to send.
 * @param fnCallbackSuccess Function to call on success, e.g. fn(data, textStatus)
 * @param fnCallbackError Function to call on error, e.g. fn(XMLHttpRequest, textStatus, errorThrown)
 */
function getXDomainJSON(url, data, fnCallbackSuccess, fnCallbackError)
{
	$.ajax({
		dataType: "jsonp",
		data: data,
		error: fnCallbackError,
		success: fnCallbackSuccess,
		url: url});
}

/**
 * Posts JSON data to the same domain.
 * 
 * @param url The post url.
 * @param data The post data to send.
 */
function postDomainJSON(url, data)
{
	$.ajax({
		dataType: "json",
		data: data,
		type: "POST",
		url: url});
}

/**
 * Reports bad media to the App Engine.
 * 
 * @param mediaUrl The URL to the media that caused a problem.
 * @param cause The cause of the problem. 1 = Bad response fetching URL content; 2 = App Engine timed out;
 */
function reportBadMedia(mediaUrl, cause)
{
	// Setup object.
	var data = new Object();
	data.mediaUrl = mediaUrl;
	data.cause = cause.toString();	// Cast to string.
	
	// Post the data.
	postDomainJSON(BAD_MEDIA_URL, data);
}


/**
 * Adds comments.
 *
 * @param comments The comments.
 */
function addComments(comments)
{
	if (comments.length && comments.length > 0)
	{
		// Make comments safe.
		comments = comments.replace(/("|\\)/g, '\\$1');
		if (comments.length > 512)
		{
			comments = comments.substring(0, 512);
		}
		
		// Construct object.
		var data = new Object();
		data.comments = comments;
		
		// Post data.
		postDomainJSON(COMMENTS_URL, data);
	}
}


/**
 * Class loops through an array, <code>batchSize</code> elements at a time, invoking <code>fnToSendArrayElementsTo</code> with the array elements.
 * It waits <code>timerInterval</code> between each batch.
 */
var ThreadedLoop = Base.extend(
{
	/**
	 * Constructor.
	 * 
	 * @param array	The array to loop through.
	 * @param fnToSendArrayElementsTo The function to send array elements to.
	 * @param timerInterval Time between each timer call.
	 * @param batchSize The size of each batch processed within the array.
	 * @param fnFinished The function to call when each iteration finishes.
	 */
	constructor: function(array, fnToSendArrayElementsTo, timerInterval, batchSize, fnFinished)
	{
		// Setup variables.
		this.__arrayIndex = 0;
		this.__array = array;
		this.__batchSize = batchSize;
		this.__fnToSendArrayElementsTo = fnToSendArrayElementsTo;
		this.__fnFinished = fnFinished;
		
		// Start the timer.
		var self = this;
		this.__timerId = setInterval(function(){self.onTimer();}, timerInterval);
	},
	
	/**
	 * ID of timer.
	 */
	__timerId: null,
	
	/**
	 * The array.
	 */
	__array: null,
	
	/**
	 * Function to send array elements to.
	 */
	__fnToSendArrayElementsTo: null,
	
	/**
	 * Current array index.
	 */
	__arrayIndex: null,
	
	/**
	 * Size of batches.
	 */
	__batchSize: null,
	
	/**
	 * Function to call when each iteration finishes.
	 */
	__fnFinished: null,
	
	/**
	 * Timer function; loops this.__batchSize times through the array.
	 */
	onTimer: function()
	{
		// Calculate end index.
		var indexEnd = this.__arrayIndex + this.__batchSize;
		if (indexEnd >= this.__array.length)
		{
			indexEnd = this.__array.length;
			clearInterval(this.__timerId);	// Stop the timer.
		}
		
		// Loop through this.__batchSize elements.
		while(this.__arrayIndex < indexEnd)
		{
			this.__fnToSendArrayElementsTo(this.__array[this.__arrayIndex]);
			this.__arrayIndex++;
		}
		
		this.__fnFinished();
	}
});


/**
 * Sets up the stylesheet.
 */
function setupStylesheet()
{
	// Perform IE hacks.
	var inputCSS = getInputCSS(winampGetClassicColour(1), winampGetClassicColour(0), winampGetClassicColour(2),
		winampGetClassicColour(5), winampGetClassicColour(2), winampGetClassicColour(5));
	var buttonCSS = getInputCSS("#000000", "#CBCBCB", winampGetClassicColour(0),
		winampGetClassicColour(0), winampGetClassicColour(0), winampGetClassicColour(0));
	$('input[type="text"]').css(inputCSS);
	$('input[type="button"]').css(buttonCSS);
	$('input[type="submit"]').css(buttonCSS);
	
	stylesheetLink = STYLESHEET_LINK.replace(/FONT/, winampGetFont());
	stylesheetLink = stylesheetLink.replace(/FONT_SIZE/, winampGetFontSize());
	stylesheetLink = stylesheetLink.replace(/ITEM_BACKGROUND/, winampGetClassicColour(0));
	stylesheetLink = stylesheetLink.replace(/ITEM_FOREGROUND/, winampGetClassicColour(1));
	stylesheetLink = stylesheetLink.replace(/WINDOW_BACKGROUND/, winampGetClassicColour(2));
	stylesheetLink = stylesheetLink.replace(/BUTTON_FOREGROUND/, winampGetClassicColour(3));
	stylesheetLink = stylesheetLink.replace(/HILITE/, winampGetClassicColour(5));
	stylesheetLink = stylesheetLink.replace(/LIST_HEADER_BACKGROUND/, winampGetClassicColour(7));
	stylesheetLink = stylesheetLink.replace(/LIST_HEADER_TEXT/, winampGetClassicColour(8));
	stylesheetLink = stylesheetLink.replace(/SELECTION_BAR_FOREGROUND/, winampGetClassicColour(18));
	stylesheetLink = stylesheetLink.replace(/SELECTION_BAR_BACKGROUND/, winampGetClassicColour(19));
	stylesheetLink = stylesheetLink.replace(/INACTIVE_SELECTION_BAR_BACKGROUND/, winampGetClassicColour(21));
	stylesheetLink = stylesheetLink.replace(/ALTERNATE_ITEM_BACKGROUND/, winampGetClassicColour(22));
	stylesheetLink = stylesheetLink.replace(/ALTERNATE_ITEM_FOREGROUND/, winampGetClassicColour(23));
	stylesheetLink = stylesheetLink.replace(/#/g, '%23');
	
	var headID = document.getElementsByTagName("head")[0];         
	var cssNode = document.createElement('link');
	cssNode.type = 'text/css';
	cssNode.rel = 'stylesheet';
	cssNode.href = stylesheetLink;
	cssNode.media = 'screen';
	headID.appendChild(cssNode);
}

/**
 * Returns a CSS object for an input box.
 */
function getInputCSS(foreground, background, borderTop, borderBottom, borderLeft, borderRight)
{
	var inputCSS = new Object();
	inputCSS['color'] = foreground;
	inputCSS['background-color'] = background;
	inputCSS['border-top'] = '1px solid ' + borderTop;
	inputCSS['border-bottom'] = '1px solid ' + borderBottom;
	inputCSS['border-left'] = '1px solid ' + borderLeft;
	inputCSS['border-right'] = '1px solid ' + borderRight;
	return inputCSS;
}

/**
 * Enqueues media.
 * 
 * @param operation Operation to perform: 0: use WinAmp module; 1: use transcoding; 2: ask app engine for more information.
 * @param url The URL of the media (or app engine request).
 * @param title The title of the media.
 * @param duration The duration of the media.
 */
function enqueueMedia(operation, url, title, duration)
{
	var enqueueMedia = ENQUEUE_MEDIA.replace(/OPERATION/, operation);
	enqueueMedia = enqueueMedia.replace(/URL/, url);
	enqueueMedia = enqueueMedia.replace(/TITLE/, title.replace(/"/g, '\\"'));	// Ensure " is escaped.
	enqueueMedia = enqueueMedia.replace(/DURATION/, duration);
	winampEnqueue(enqueueMedia, title, duration);
}

/**
 * Gets a request parameter from the URL.
 * 
 * @param name The name of the request parameter.
 * @return The request parameter value.
 */
function getRequestParameter(name)
{
    name = name.replace(/[\[]/, "'\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(window.location.href);
    if( results == null )
    {
        return "";
    }
    else
    {
        return results[1];
    }
}

/**
 * Checks that the latest plugin is being used. Displays a message if it is not.
 */
function checkPlugin()
{
	var dllVer = getRequestParameter('dllVer');
	if (!dllVer || pageData.latestVersion != getRequestParameter('dllVer'))
	{
		$('#newPlugin').show();
	}
}	
/** Global variables **/
var test = 0; // 0, 1, 2
var searchObject;

/**
 * Function to be invoked on page load. Sets up the media search.
 */
function onLoadMediaSearch()
{
	// Check WinAmp API available.
    checkForWinAmpAPI();
    
	// Setup stylesheet.
	setupStylesheet();
	
	// Set focus on input box.
	$('#SearchInput')[0].focus();
}

/**
 * Main search function.
 *
 * @param searchString The search string.
 */
function search(searchString)
{
	// Do the search.
	searchObject.search(searchString);
	
	// Ensure that the invoking form doesn't cause a page load.
	return false;
}

/**
 * Clears the results.
 */
function clearResults()
{
	// Clear search objects.
	searchObject.clearResults();
	
	// Clear the input box.
	$('#SearchInput')[0].value = '';
}
/** Global variables. **/
var winAmpAPI = false;

var CLASSIC_COLOUR_SCHEME = {'0': '#000000',
							'1': '#00FF00',
							'2': '#292939',
							'3': '#000000',
							'4': '#00FF00',
							'5': '#3F3F58',
							'6': '#0000C3',
							'7': '#3F3F58',
							'8': '#CBCBCB',
							'9': '#4A4A67',
							'10': '#2E2E3F',
							'11': '#000000',
							'12': '#2E2E3F',
							'13': '#000000',
							'14': '#000000',
							'15': '#000000',
							'16': '#000000',
							'17': '#292939',
							'18': '#00FF00',
							'19': '#0000C3',
							'20': '#00FF00',
							'21': '#000082',
							'22': '#000000',
							'23': '#000000'};

// Check that hosting application has WinAmp API.
/*if (window.external &&
	"PlayQueue" in window.external &&
	"Enqueue" in window.external.PlayQueue &&
	"Skin" in window.external &&
	"GetClassicColor" in window.external.Skin &&
	"MediaCore" in window.external &&
	"IsRegisteredExtension" in window.external.MediaCore)*/
function checkForWinAmpAPI()
{
	if (window.external &&
		"Enqueue" in window.external &&
		"GetClassicColor" in window.external &&
		"font" in window.external &&
		"fontsize" in window.external &&
		"IsRegisteredExtension" in window.external &&
		"GetMetadata" in window.external)	// Can't be bothered yet to work out how to pass objects back from C++.
	{
		winAmpAPI = true;
	}
	else
	{
		alert("The hosting container does not expose the redcaza JavaScript API, e.g.: window.external.Method.\n You will not be able to listen to or view media.");
    }
}

/**
 * Queues a song in WinAmp.
 * 
 * @param url The URL to the song.
 * @param name The name of the song.
 * @param length the length of the song.
 */
function winampEnqueue(url, name, length)
{
	if (winAmpAPI)
	{
		window.external.Enqueue(url, name, length);
	}
}

/**
 * Gets skin colour of UI elements.
 * 
 * @param classicColourNumber A number in the range 0-23 (see: http://dev.winamp.com/wiki/Complete_JavaScript_API_technology_framework#GetClassicColor.28.29).
 */
function winampGetClassicColour(classicColourNumber)
{
	if (winAmpAPI)
	{
		var colourRef = window.external.GetClassicColor(classicColourNumber);
		if (colourRef)
		{
			return colourRef;
		}
		else
		{
			// Error.
			return -1;
		}
	}
	else
	{
		// No data; WinAmp API not accessible. Use classic colour scheme as default.
		if (classicColourNumber in CLASSIC_COLOUR_SCHEME)
		{
			return CLASSIC_COLOUR_SCHEME[classicColourNumber];
		}
		else
		{
			return '#000000';
		}
	}
}

/**
 * Gets the font name.
 */
function winampGetFont()
{
	if (winAmpAPI)
	{
		return window.external.font();
	}
	else
	{
		return "arial";
	}
}

/**
 * Gets the font size.
 */
function winampGetFontSize()
{
	if (winAmpAPI)
	{
		return window.external.fontsize() + "px";
	}
	else
	{
		return "1em";
	}
}

/**
 * Gets the specified meta data info.
 * 
 * @param url The URL to the song.
 * @param tag The tag name of the meta data.
 * 
 * @return -1 error; 0 OK, but no data; 1 No WinAmp API.
 */
function winampGetMetadata(url, tag)
{
	if (winAmpAPI)
	{
		var metadata = window.external.GetMetadata(url, tag);
		if (metadata)
		{
			// Test whether a number has been returned.
			if (isNaN(parseInt(metadata)))
			{
				// Remove all the crap that my WinAmp API is leaving on the strings.
				var tmp = $.trim(metadata);
				if (tmp.length > 1)
				{
					return tmp.substring(0, tmp.length-1);
				}
				else
				{
					return "";
				}
			}
			else
			{
				// Return the number.
				return metadata;
			}
		}
		else
		{
			// Error retrieving meta data.
			return -1;
		}
	}
	else
	{
		// No data; WinAmp API not accessible.
		return 0;
	}
}
