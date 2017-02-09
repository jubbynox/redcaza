/**
 * The YouTube Results Pane UI.
 */
var YouTubeResultsPaneUI = Base.extend(
{
	/**
	 * Thumbnail HTML.
	 */
	THUMBNAIL_HTML: '<img src="SRC" alt="ALT" width="60">',
	
	/**
	 * Definition of result columns.
	 */
	__columnDefs: [{key:"thumbnail", label:"Thumbnail"}, {key:"title", label:"Title"}
		, {key:"strDuration", label:"Duration"}],
				    
	/**
	 * The data schema.
	 */			    
	__schema: ["thumbnail", "title", "strDuration", "duration", "videoID"],
	
	/**
	 * The list UI.
	 */
	__listUI: null,
	
	/**
	 * Constructor for YouTubeResultsPaneUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnGetMoreResults Callback function to get more results. 
	 * @param fnTracksSelected The function to invoke when tracks are selected.
	 */
	constructor: function(containerId, fnGetMoreResults, fnTracksSelected)
	{
		// Setup the sites pane UI.
		this.__listUI = new SelectableTableUI(containerId, this.__columnDefs, this.__schema,
			fnTracksSelected, "Enqueue selection", fnGetMoreResults);
	},
	
	/**
	 * Clears the list.
	 */
	clear: function()
	{
		this.__listUI.clear();
	},
	
	/**
	 * Adds a result.
	 * 
	 * @param result The result.
	 */
	addResult: function(result)
	{
		this.__listUI.addRow(this.__parseResult(result));
	},
	
	/**
	 * Adds results.
	 * 
	 * @param results The results.
	 */
	addResults: function(results)
	{
		// Update list UI.
		if (results.length > 0)
		{
			this.__listUI.addRows(this.__parseResults(results));
		}
		else
		{
			this.clear();
		}
	},
	
	/**
     * Parse the result object.
     * 
     * @param result The result.
     * 
     * @return The result object.
     */
    __parseResult: function(result)
    {
		if (!result.thumbnail)
		{
    		// Create HTML for thumbnail.
    		var thumbnailHTML = this.THUMBNAIL_HTML.replace('SRC', result.thumbnailURL);
    		result.thumbnail = thumbnailHTML.replace('ALT', result.title);
		}
    	
    	return result;
    },
	
	/**
     * Parse the result objects.
     * 
     * @param results The results.
     * 
     * @return The result objects.
     */
    __parseResults: function(results)
    {
    	for (var index in results)
    	{
    		var result = results[index];
    		result = this.__parseResult(result);
    	}
    	
    	return results;
    }
});
/**
 * Function to be invoked on page load. Sets up the required objects.
 */
function onLoadExtended()
{
	// Load the base media search.
    onLoadMediaSearch();
    
	// Setup YouTube search.
	searchObject = new YouTubeSearch('ResultsPane');
	
	// Bind enter key to search input.
	$("#SearchInput").keypress(
		function (e)
		{
			if (e.which == 13)
			{
				search($('#SearchInput')[0].value)
			}
		});
}


/**
 * The YouTube Search functionality.
 */
var YouTubeSearch = Base.extend(
{
	/**
	 * The search URL for YouTube videos.
	 */
	SEARCH_URL: 'http://gdata.youtube.com/feeds/api/videos',
	
	/**
	 * Regular expression to extract video ID from player URL.
	 */
	VIDEO_ID_RE: /watch\?v=(.+)$/,
	
	/**
	 * Maximum number of results per search.
	 */
	__maxResults: 10,
	
	/**
	 * The search criteria.
	 */
	__searchCriteria: null,
	
	/**
	 * The results UI.
	 */
	__youtubeUI: null,
	
	/**
	 * The search index from which to retrieve results.
	 */
	__searchIndex: null,
	
	/**
	 * Constructor for YouTubeSearch.
	 * 
	 * @param resultsId The ID of the results pane.
	 */
	constructor: function(resultsId)
	{
		// Create the YouTube UI.
		this.__youtubeUI = new YouTubeUI(resultsId,
			function(self)
			{
				return function()
				{
					self.__getMoreResults();
				};
			}(this));
		
		// Setup the search index.
		this.__searchIndex = 1;
	},
	
	/**
	 * Main search function.
	 *
	 * @param searchString The search string.
	 */
	search: function(searchString)
	{
		// Track search.
        pageTracker._trackEvent('Video', 'Search', searchString);
            
		// Clear results.
		this.clearResults();
		
		// Store the search string.
		this.__searchCriteria = searchString;
		
		// Indicate that the search has started.
		this.__youtubeUI.searchStarted();
		
		// Perform the search.
		this.__performSearch();
	},
	
	/**
	 * Performs the YouTube search.
	 */
	__performSearch: function()
	{
		var data = this.__createSearchObject();
		getXDomainJSON(this.SEARCH_URL, data,
			function(self)
			{
				return function(data)
				{
					self.__processYouTubeResults(data);
				};
			}(this),
			function()
			{
				// Do nothing;
			});
	},
	
	/**
	 * Clears results.
	 */
	clearResults: function()
	{
		this.__searchIndex = 1;
		this.__youtubeUI.clear();
	},
	
	/**
	 * Processes the YouTube results.
	 * 
	 * @param data The data returned from the YouTube search.
	 */
	__processYouTubeResults: function(data)
	{
		// Setup result set.
		var resultIndex = 0;
		var resultSet = new Array();
		for (index in data.feed.entry)
		{
			// Create result entry.
			resultSet[resultIndex] = new Object();
			resultSet[resultIndex].videoID = this.VIDEO_ID_RE.exec(data.feed.entry[index].media$group.media$player[0].url)[1];
			resultSet[resultIndex].title = "" + data.feed.entry[index].media$group.media$title.$t;
			resultSet[resultIndex].strDuration = this.__formatTime(data.feed.entry[index].media$group.yt$duration.seconds);
			resultSet[resultIndex].duration = parseInt(data.feed.entry[index].media$group.yt$duration.seconds);
			resultSet[resultIndex].thumbnailURL = data.feed.entry[index].media$group.media$thumbnail[0].url;
			resultIndex++;
		}
		
		if (this.__searchIndex == 1 && resultSet.length == 0)
		{
			// No results.
			this.__youtubeUI.noResults();
		}
		else
		{
			// Show the results.
			this.__youtubeUI.addResults(resultSet);
		}
	},
	
	/**
	 * Formats seconds into m:ss
	 * 
	 * @param seconds
	 * 
	 * @return The formatted time as a string.
	 */
	__formatTime: function(seconds)
	{
		var minutes = Math.floor(seconds / 60);
		seconds = seconds % 60;
		seconds = seconds < 10 ? '0' + seconds : seconds;
		return minutes + ':' + seconds;
	},
	
	/**
	 * Creates a search object to submit to the XDomain JSON request.
	 * 
	 * @return A YouTube search object.
	 */
	__createSearchObject: function()
	{
		var searchObject = new Object();
		searchObject.alt = 'json-in-script';	// Requests a response that wraps JSON in a script tag.
		searchObject['start-index'] = this.__searchIndex;	// The start index of the results.
		searchObject['max-results'] = this.__maxResults;	// The maximum number of results to retrieve.
		searchObject['format'] = 5;   // Only return embeddable results.
		searchObject.q = this.__searchCriteria;
		return searchObject;
	},
	
	/**
	 * Gets more results.
	 */
	__getMoreResults: function()
	{
		// Move the search index.
		this.__searchIndex += this.__maxResults;
		
		// Perform the search.
		this.__performSearch();
	}
});
/**
 * The YouTube Search UI.
 */
var YouTubeUI = Base.extend(
{
	/**
	 * The App Engine request string to get mode info about the video.
	 */
	APP_ENGINE_REQUEST: 'http://' + location.host + '/youtube/getVideo?videoID=VIDEO_ID&fmt=FMT',
	
	/**
	 * The layout.
	 */
	__layout: null,
	
	/**
	 * The results pane UI.
	 */
	__resultsPaneUI: null,
	
	/**
	 * A flag to indicate whether or results were found.
	 */
	__noResults: false,
	
	/**
	 * Constructor for YouTubeUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnGetMoreResults Callback function to get more results.
	 */
	constructor: function(containerId, fnGetMoreResults)
	{
		// Setup IDs for panes.
		var resultsId = containerId + "_resultsPane";
		
		// Setup sizes.
		var elContainer = $('#' + containerId);
		var height = $(window).height() - elContainer.offset().top + 20;// - 40; // Leave gap at bottom.
		var width = $(window).width();
		
		// Create the layout.
		this.__layout = new YAHOO.widget.Layout(containerId, {height: height, width: width,
			units: [
        		{ position: 'center', scroll: true, body: '<div id="' + resultsId + '"></div>' }]});
		this.__layout.render();
		
		// Create the results pane.
		this.__resultsPaneUI = new YouTubeResultsPaneUI(resultsId, fnGetMoreResults,
			function(self)
				{
					return function(tracks)
					{
						self.tracksSelected(tracks);
					};
				}(this));
	},
	
	/**
	 * Clears all results.
	 */
	clear: function()
	{
		// Clear the results pane UI.
		this.__resultsPaneUI.clear();
		
		// Set no results.
		this.__noResults = true;
	},
	
	/**
	 * Adds details to the pane to indicate that searching has started.
	 */
	searchStarted: function()
	{
		var tmp = new Object();
		tmp.thumbnail = 'Scanning...';
		this.__resultsPaneUI.addResult(tmp);
	},
	
	/**
	 * Adds indication that there were no results.
	 */
	noResults: function()
	{
		this.__resultsPaneUI.clear();
		var tmp = new Object();
		tmp.thumbnail = 'No results.';
		this.__resultsPaneUI.addResult(tmp);
	},
	
	/**
	 * Adds a result.
	 * 
	 * @param result The result.
	 */
	addResult: function(result)
	{
		if (this.__noResults == true)
		{
			// Clear the sites pane UI and searching indicator.
			this.__resultsPaneUI.clear();
			this.__noResults = false;
		}
		this.__resultsPaneUI.addResult(result);
	},
	
	/**
	 * Adds results.
	 * 
	 * @param results The results.
	 */
	addResults: function(results)
	{
		if (this.__noResults == true)
		{
			// Clear the sites pane UI and searching indicator.
			this.__resultsPaneUI.clear();
			this.__noResults = false;
		}
		this.__resultsPaneUI.addResults(results);
	},
	
	/**
	 * Tracks selected.
	 * 
	 * @param tracks The tracks.
	 */
	tracksSelected: function(tracks)
	{
		// Only continue if there are results.
		if (!this.__noResults)
		{
			var fmt = $('#Quality').val();
			var track;
			var index;
			for (index in tracks)
			{
				// Enqueue the track.
				track = tracks[index];
				var appEngineRequest = this.APP_ENGINE_REQUEST.replace(/VIDEO_ID/, track.videoID);
				appEngineRequest = appEngineRequest.replace(/FMT/, fmt);
				enqueueMedia(2, appEngineRequest, track.title, track.duration);
				
				// Video track enqueue event.
                pageTracker._trackEvent('Video', 'Enqueue', track.title + "; " + track.videoID);
			}
		}
	}
});
