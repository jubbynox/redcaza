/**
 * The LastFM Results Pane UI.
 */
var LastFMResultsPaneUI = Base.extend(
{
    /**
     * Thumbnail HTML.
     */
    THUMBNAIL_HTML: '<img src="SRC" alt="ALT">',
    
    /**
     * Definition of result columns.
     */
    __columnDefs: [{key:"thumbnail", label:"Thumbnail"}, {key:"artist", label:"Artist"}],
                    
    /**
     * The data schema.
     */             
    __schema: ["thumbnail", "artist"],
    
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
    searchObject = new LastFMSearch('ResultsPane');
    
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
 * The LastFM Search functionality.
 */
var LastFMSearch = Base.extend(
{
    /**
     * The search URL for LastFM tracks.
     */
    SEARCH_URL: 'http://ws.audioscrobbler.com/2.0',
    
    /**
     * Track search method.
     */
    TRACK_SEARCH: 'track.search',
    
    /**
     * Artist search method.
     */
    ARTIST_SEARCH: 'artist.search',
    
    /**
     * The API key.
     */
    API_KEY: 'da6ae1e99462ee22e81ac91ed39b43a4',
    
    /**
     * The API response format.
     */
    JSON_FORMAT: 'json',
        
    /**
     * The search criteria.
     */
    __searchCriteria: null,
    
    /**
     * The results UI.
     */
    __lastfmUI: null,
    
    /**
     * The search page from which to retrieve results.
     */
    __searchPage: null,
    
    /**
     * A list of artists found. The artist name is the key of the list. The values in the list are tracks that may have been found.
     */
    __artistsFound: null,
    
    /**
     * Constructor for LastFMSearch.
     * 
     * @param resultsId The ID of the results pane.
     */
    constructor: function(resultsId)
    {
        // Create the YouTube UI.
        this.__lastfmUI = new LastFMUI(resultsId,
            function(self)
            {
                return function()
                {
                    self.__getMoreResults();
                };
            }(this));
        
        // Setup the search page.
        this.__searchPage = 1;
    },
    
    /**
     * Main search function.
     *
     * @param searchString The search string.
     */
    search: function(searchString)
    {
        // Track search.
        pageTracker._trackEvent('Radio', 'Search', searchString);
            
        // Clear results.
        this.clearResults();
        
        // Store the search string.
        this.__searchCriteria = searchString;
        
        // Indicate that the search has started.
        this.__lastfmUI.searchStarted();
        
        // Perform the (tracks) search.
        this.__performSearch(this.__searchCriteria, true);
    },
    
    /**
     * Performs the LastFM search.
     * 
     * @param searchCriteria The search criteria.
     * @param searchTracks Whether or not a track search is to be performed (otherwise it is an artist search).
     */
    __performSearch: function(searchCriteria, searchTracks)
    {
        var data = this.__createSearchObject(searchCriteria, searchTracks);
        var processingFunction = this.__processLastFMTrackResults;   // By default this processes track search results.
        if (!searchTracks)
        {
        	// Process artist search results.
        	processingFunction = this.__processLastFMArtistResults;
        }
        getXDomainJSON(this.SEARCH_URL, data,
            function(self, func, searchTracks)
            {
                return function(data)
                {
                    func(self, data, searchCriteria);
                };
            }(this, processingFunction, searchTracks),
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
        this.__searchPage = 1;
        this.__lastfmUI.clear();
        this.__artistsFound = new Object();
    },
    
    /**
     * Processes the LastFM track search results.
     * 
     * @param self The object scope.
     * @param data The data returned from the LastFM search.
     * @param searchCriteria The original search criteria.
     */
    __processLastFMTrackResults: function(self, data, searchCriteria)
    {
        // Setup result set.
        var resultIndex = 0;
        var resultSet = new Array();

        var tracks = data.results.trackmatches.track;
        var index;
        for (index in tracks)
        {
        	// Check if artist has already been processed.
        	var artist = self.__artistsFound[tracks[index].artist];
        	if (artist && artist.found)
        	{
        		// This artist has already been found, so possibly the search was an artist name rather than a track.
        		// Remove track info.
        		artist.track = '';
        	}
        	else
        	{
        		// This is a new artist. Add them to the results.
        		artist = new Object();
        		self.__artistsFound[tracks[index].artist] = artist;
        		artist.found = true;
        		artist.track = tracks[index].name;
        		
        		// Create new result entry.
	            resultSet[resultIndex] = tracks[index].artist;
	            resultIndex++;
        	}
        }
        
        // Load the artist info, if any.
        if (self.__searchPage == 1 && resultSet.length == 0)
        {
        	// No results.
            self.__lastfmUI.noResults();
        }
        else
        {
        	// Process results.
            for (index in resultSet)
	        {
	        	self.__performSearch(resultSet[index], false);
	        }
        }
    },
    
    /**
     * Processes the LastFM artist search results.
     * Adds the first match to the output results.
     * 
     * @param self The object scope.
     * @param data The data returned from the LastFM search.
     * @param searchCriteria The original search criteria.
     */
    __processLastFMArtistResults: function(self, data, searchCriteria)
    {
    	// Get the first result (the matched artist).
    	var artists = data.results.artistmatches.artist;
    	var artist;
    	
    	// Get first artist object. If single match then an array is not returned.
    	if (null != artists.length && 'number' == typeof(artists.length))
        {
            artist = artists[0];
        }
        else
        {
            artist = artists;
        }
    	
    	if (artist)
    	{
    		// Construct the result object.
    		var result = new Object();
    		result.artist = artist.name;
    		result.thumbnailURL = self.__getMediumImageURL(artist.image);
    		
    		// Check if this artist had a matching track.
    		if ('' != self.__artistsFound[searchCriteria].track)   // searchCriteria used as artist name from new search may not match.
    		{
    			// Append the matching track.
    			result.artist += ' (' + self.__artistsFound[searchCriteria].track + ')';
    		}
    		
    		// Add result.
            self.__lastfmUI.addResult(result);
    	}  	
    },
    
    /**
     * Gets the small image URL.
     * 
     * @param imageData The image data.
     * @return The small image URL.
     */
    __getMediumImageURL: function(imageData)
    {
    	var url;
    	for (index in imageData)
    	{
    		if (imageData[index].size == 'medium')
    		{
    			url = imageData[index]['#text'];
    			break;
    		}
    	}
    	return url;
    },
    
    /**
     * Creates a search object to submit to the XDomain JSON request.
     * 
     * @param searchCriteria The search criteria.
     * @param searchTracks Whether or not a track search is to be performed (otherwise it is an artist search).
     * @return A LastFM search object.
     */
    __createSearchObject: function(searchCriteria, searchTracks)
    {
        var searchObject = new Object();
        if (searchTracks)
        {
        	// Track search.
            searchObject.method = this.TRACK_SEARCH;
            searchObject.track = searchCriteria;
            searchObject.page = this.__searchPage;  // Only use paging for track searches.
            searchObject.limit = 10;
        }
        else
        {
        	// Artist search. Only the first result of the first page is going to be used.
        	searchObject.method = this.ARTIST_SEARCH;
        	searchObject.artist = searchCriteria;
        	searchObject.limit = 2;
        }
        searchObject.api_key = this.API_KEY;
        searchObject.format = this.JSON_FORMAT;
        return searchObject;
    },
    
    /**
     * Gets more results.
     */
    __getMoreResults: function()
    {
        // Move the search index.
        this.__searchPage += 1;
        
        // Perform the (track) search.
        this.__performSearch(this.__searchCriteria, true);
    }
});
/**
 * The LastFM Search UI.
 */
var LastFMUI = Base.extend(
{
	/**
     * The App Engine request string to get mode info about the video.
     */
    APP_ENGINE_REQUEST: 'http://' + location.host + '/lastfm/getRadioTrack?artist=ARTIST',
    
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
     * Constructor for LastFMUI.
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
        this.__resultsPaneUI = new LastFMResultsPaneUI(resultsId, fnGetMoreResults,
            function(self)
                {
                    return function(artists)
                    {
                        self.artistsSelected(artists);
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
     * Artists selected.
     * 
     * @param artists The artists.
     */
    artistsSelected: function(artists)
    {
        // Only continue if there are results.
        if (!this.__noResults)
        {
            var fmt = $('#Quality').val();
            var artist;
            var index;
            for (index in artists)
            {
                // Enqueue the artist.
                artist = artists[index];
                var artistName = artist.artist.replace(/ \(.*\)$/, ''); // Remove and track match information.
                var trackName = artistName + ' Radio';
                var appEngineRequest = this.APP_ENGINE_REQUEST.replace(/ARTIST/, artistName);
                enqueueMedia(2, appEngineRequest, trackName, -1);
                
                // Radio track enqueue event.
                pageTracker._trackEvent('Radio', 'Enqueue', artistName);
            }
        }
    }
});
