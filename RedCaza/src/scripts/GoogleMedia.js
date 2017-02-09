// Load required libraries
google.load("search", "1")


/**
 * Function to be invoked on page load. Sets up the required objects.
 */
function onLoadExtended()
{
    // Load the base media search.
    onLoadMediaSearch();
	
	// Setup Google media search.
	searchObject = new GoogleMediaSearch('HiddenElement', 'ResultsPane', test);
	
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
 * The Google Media Search functionality.
 */
var GoogleMediaSearch = Base.extend(
{
	/**
	 * The main search Google string to search for MP3 tracks. "SEARCH_STRING" is replaces with the MP3 album or track name.
	 */
	BASE_SEARCH_STRING: 'intitle:"index.of" (mp3) SEARCH_STRING -html -htm -php -asp -cf -jsp -aspx -pdf -doc',
	
	/**
	 * Removes a site from a Google search.
	 */
	SITE_REMOVE_STRING: '-site:',
	
	/**
	 * The location of the Google media search processor App Engine.
	 */
	SEARCH_URL: 'google/searchUrl',
	
	/**
	 * The location of the Google media ignored sites processor App Engine.
	 */
	IGNORED_SITES_URL: 'google/getIgnoredSites',
	
	/**
	 * A list of ignored sites.
	 */
	IGNORED_SITES: null,
	
	/**
	 * The test number.
	 */
	__test: null,
	
	/**
	 * The Google search control.
	 */
	__searchControl: null,
	
	/**
	 * The web search object.
	 */
	__webSearch: null,
	
	/**
	 * The search criteria.
	 */
	__searchCriteria: null,
	
	/**
	 * The current result index.
	 */
	__resultsCounter: null,
	
	/**
	 * The number of processed results.
	 */
	__processedResults: null,
	
	/**
	 * The Google media UI.
	 */
	__mediaUI: null,
	
	/**
	 * Constructor for GoogleMediaSearch.
	 * 
	 * @param hiddenId The ID of a hidden pane.
	 * @param resultsId The ID of the results pane.
	 * @param test A test number or nothing for live.
	 */
	constructor: function(hiddenId, resultsId, test)
	{
		this.__test = test;
		
		// Load the ignored sites.
		var self = this;
		getDomainJSON(this.IGNORED_SITES_URL, null,
			function(data)
				{
					self.IGNORED_SITES = data;
				},
			function()
			{
					self.IGNORED_SITES = new Array();
			});
		
		// Create the media UI.
		this.__mediaUI = new GoogleMediaUI(resultsId, function(self)
													{
														return function(url, fnResultsCallback)
														{
															self.__getMoreResults(url, fnResultsCallback);
														};
													}(this));
		
		// Google Web search setup.
		this.__searchControl = new google.search.SearchControl();
		this.__webSearch = new google.search.WebSearch();
		this.__searchControl.addSearcher(this.__webSearch);
		var options = new google.search.DrawOptions();
		this.__searchControl.draw($('#' + hiddenId)[0], options);
		this.__searchControl.setSearchCompleteCallback(this, this.__onSearchComplete);
		this.__searchControl.setResultSetSize(google.search.Search.LARGE_RESULTSET);
	},
	
	/**
	 * Main search function.
	 *
	 * @param searchString The search string.
	 */
	search: function(searchString)
	{
		// Stop any existing search and clear results.
		this.__searchControl.cancelSearch();
		this.__searchControl.clearAllResults();
		this.clearResults();
		
		// Store the search string.
		this.__searchCriteria = searchString;
		
		// Show that a search is in progress.
		this.__mediaUI.searchStarted();
		
		if (this.__test)
		{
			var search = new Object();
			search.results = [];
			search.results[0] = new Object;
			search.results[0].unescapedUrl = 'http://a/test/search/';
			search.results[1] = new Object;
			search.results[1].unescapedUrl = 'http://another/test/search/';
			
			this.__webSearch = search;
			
			this.__onSearchComplete();
		}
		else
		{
			// Track search.
			pageTracker._trackEvent('Audio', 'Search', searchString);
			
			// Setup the search string for the MP3 search (replaces spaces with ".").
			searchString = searchString.replace(/\s/g, ".");
			
			// Create the full matching string for Google Web search.
			var fullSearchString = this.BASE_SEARCH_STRING.replace(/SEARCH_STRING/, searchString);
			
			// Append ignored sites.
			for (ignoredSite in this.IGNORED_SITES)
			{
				fullSearchString += " " + this.SITE_REMOVE_STRING + this.IGNORED_SITES[ignoredSite];
			}
			
			// Perform the Google Web search.
			this.__searchControl.execute(fullSearchString);
		}
	},
	
	/**
	 * Clears results.
	 */
	clearResults: function()
	{
		// Stop any existing search.
		this.__searchControl.cancelSearch();
		this.__searchControl.clearAllResults();
		
		// Clear search criteria.
		this.__searchCriteria = null;
		
		// Clear results UI.
		this.__mediaUI.clear();
		
		// Clear processed results counter.
		this.__processedResults = 0;
	},
	
	/**
	 * The callback search function.
	 */
	__onSearchComplete: function()
	{
		// Setup result counter.
		this.__resultsCounter = 0;
		
		// Start processing.
		this.__processWebSearch();
	},
	
	/**
	 * Processes the next results of the web search.
	 */
	__processWebSearch: function()
	{
		// Check that there are search results.
		if (this.__webSearch.results && this.__webSearch.results.length > 0)
		{
			// Test index.
			if (this.__resultsCounter >= this.__webSearch.results.length)	// Get next page as all results have been processed.
			{
				// Test if there are more pages to load.
				if (this.__webSearch.cursor &&
					this.__webSearch.cursor.currentPageIndex < this.__webSearch.cursor.pages.length-1)
				{
					// Load next page of results.
					this.__webSearch.gotoPage(this.__webSearch.cursor.currentPageIndex+1);
				}
				else	// No more results to process.
				{
					this.__noMoreResults();
				}
			}
			else	// Process web search.
			{
				var url = this.__webSearch.results[this.__resultsCounter].unescapedUrl;
				// Move to next result.
                this.__resultsCounter++;
				
				// Check if an ignored URL has made it through.
				var ignoredSite;
				var re;
				var isIgnoredSite = false;
				for (ignoredSite in this.IGNORED_SITES)
		        {
		        	re = new RegExp(this.IGNORED_SITES[ignoredSite], "i");   // Case-insensitive match.
		        	if (re.test(url))    // If this is a site to ignore.
		        	{
		        		isIgnoredSite = true;
		        		break;
		        	}
		        }
				
				if (!isIgnoredSite) // Only proceed if this site is not to be ignored.
				{
					var self = this;
					this.__searchURL(url,
										function(data)
										{
											self.__processResult(data);
										},
										function()
										{
											// No need to report anything now that this is handled by webapp.
											//reportBadMedia(url, 2);	// Report the error (app engine took too long to respond).
											self.__processWebSearch();	// Continue to next result.
										});
				}
				else
				{
					this.__processWebSearch();
				}
			}
		}
		else	// No more results to process.
		{
			this.__noMoreResults();
		}
	},
	
	/**
	 * Called when there are no more results to process.
	 */
	__noMoreResults: function()
	{
		if (this.__processedResults == 0)
		{
			// No results.
			this.__mediaUI.noResults();
		}
	},
	
	/**
	 * Gets more results from the URL.
	 *
	 * @param url The URL from which to get more results.
	 * @param fnResultsCallback The function to call with the search results.
	 */
	__getMoreResults: function(url, fnResultsCallback)
	{
		var self = this;
		this.__searchURL(url,
			function(data)
			{
				self.__buildResultNode(data, fnResultsCallback);
			},
			function()
			{
					fnResultsCallback(null);
			});
	},
	
	/**
	 * Searches the URL for media.
	 *
	 * @param url The URL.
	 * @param fnCallbackSuccess Function to call when the search successfully completes.
	 * @param fnCallbackError Function to call when the search completes in error.
	 */
	__searchURL: function(url, fnCallbackSuccess, fnCallbackError)
	{
		var query = new Object();
		query.url = url;
		query.searchCriteria = this.__searchCriteria;
		if (test)
		{
			query.test = test;
		}

		getDomainJSON(this.SEARCH_URL, query, fnCallbackSuccess, fnCallbackError);
	},
	
	/**
	 * Handles the results from the JSON URL branch query.
	 *
	 * @param data The data returned.
	 */
	__processResult: function(data)
	{
		// If there is data (and it is for the current search criteria) then continue.
		if (data.url && data.searchCriteria == this.__searchCriteria
			&& (data.tracks.length > 0 || data.directories.length > 0))
		{
			this.__processedResults++;
			this.__mediaUI.addResult(data);
		}
		
		// Continue processing the web search.
		this.__processWebSearch();
	},
	
	/**
	 * Handles the results from the JSON URL branch query, but only builds a result node.
	 * The results are passed to fnResultsCallback (which is expected to complete the node building).
	 *
	 * @param data The data returned.
	 * @param fnResultsCallback The function to call with the search results.
	 */
	__buildResultNode: function(data, fnResultsCallback)
	{
		if (data.url)
		{
			// Build the results branch.
			fnResultsCallback(data);
		}
		else
		{
			// No results.
			fnResultsCallback(null);
		}
	}
});
/**
 * The Google Media Site Browser Pane UI.
 */
var GoogleMediaSiteBrowserPaneUI = Base.extend(
{
	/**
	 * The container ID.
	 */
	__containerId: null,
	
	/**
	 * The site tree.
	 */
	__siteTree: null,
	
	/**
	 * The asynchronous function to get more results.
	 */
	__fnGetMoreResults: null,
	
	/**
	 * The function to invoke when a context is selected.
	 */
	__fnContextSelected: null,
	
	/**
	 * Constructor for GoogleMediaSiteBrowserPaneUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnGetMoreResults The asynchronous function to get more results.
	 * @param fnContextSelected The function to invoke when a context is selected.
	 */
	constructor: function(containerId, fnGetMoreResults, fnContextSelected)
	{
		this.__containerId = containerId;
		this.__fnGetMoreResults = fnGetMoreResults;
		this.__fnContextSelected = fnContextSelected;
		
		// Create a tree.
		this.__siteTree = new YAHOO.widget.TreeView(this.__containerId);
	},
	
	/**
	 * Clears the site tree.
	 */
	clear: function()
	{
		if (this.__siteTree)
		{
			// Destroy functionality works, but can't re-create tree object. Bug in YUI? Remove children and clear HTML instead.
			this.__siteTree.removeChildren(this.__siteTree.getRoot());
			$('#' + this.__containerId).empty();
		}
	},
	
	/**
	 * Shows a site.
	 * 
	 * @param siteData The site data.
	 */
	showSite: function(siteData)
	{
		// Clear any existing tree.
		this.clear();

		// Get the root and begin setup of node data.
		var currNode = this.__siteTree.getRoot();

		// Separate contexts. Each one will be the base search results for each node.
		var resultNodes = this.__getResultNodes(siteData);

		// Build tree nodes.
		for (resultIndex in resultNodes)
		{
			var oData = new Object();
			oData.expanded = true;
			oData.searchResults = resultNodes[resultIndex];
			currNode = new MediaNode(oData, currNode, this.__fnGetMoreResults, this.__fnContextSelected);
		}

		// Add result directories to last result node.
		currNode.addCollapsedChildren(siteData.directories);

		// Render the tree.
		this.__siteTree.render();
		
		// Select result node.
		currNode.onNodeSelect();
	},
	
	/**
	 * Builds the contexts to the end of the supplied URL.
	 *
	 * @param siteData The site data.
	 *
	 * @return An array of results for each context. The last context node will have the tracks.
	 */
	__getResultNodes: function(siteData)
	{
		// Get the contexts.
		var contexts = this.__getContexts(siteData.url);

		// Loop through all contexts, building result nodes.
		var resultNodes = [];
		var previousFullContext = '';
		var context;
		var lastResultNode;
		for (context in contexts)
		{
			resultNodes[context] = new Object();
			resultNodes[context].name = contexts[context];
			resultNodes[context].url = previousFullContext + contexts[context];
			previousFullContext = resultNodes[context].url + '/';	// The next context to use.
			lastResultNode = resultNodes[context];
		}
		
		// Add response data to the final result node.
		lastResultNode.title = siteData.title;
		lastResultNode.tracks = siteData.tracks;
		lastResultNode.areLoaded = true;
		
		return resultNodes;
	},
	
	/**
	 * Splits the URL into the contexts.
	 *
	 * @param url The URL.
	 *
	 * @return An array of contexts.
	 */
	__getContexts: function getContexts(url)
	{
		// Get protocol.
		var parts = url.split('//');
		
		// Split on delimiter.
		var contexts = parts[1].split('/');
		
		// Recombine protocol with initial context.
		contexts[0] = parts[0] + '//' + contexts[0];
		
		return contexts; 
	}
});


/**
 * A media directory node that contains the search results.
 * Contains data:
 * .__searchResults.name - name of the directory (as set in parent page)
 * .__searchResults.title - title of the page (i.e. "index of")
 * .__searchResults.url - the full URL to the page
 * .__searchResults.tracks - the tracks under the node
 * .__searchResults.areLoaded - whether or not the results have been loaded.
 *
 * @extends YAHOO.widget.TextNode
 *
 * @param oData    {object}  A string or object containing the data that will
 *                           be used to render this node.
 * @param oParent  {Node}    This node's parent node.
 * @param fnGetMoreResults	 The asynchronous function to get more results.
 * @param fnNodeSelected	 The function to invoke when a node is selected.
 */
MediaNode = function(oData, oParent, fnGetMoreResults, fnNodeSelected)
{
	MediaNode.superclass.constructor.call(this,oData,oParent,oData.expanded);
	if (oParent.__type == this.__type)
	{
		oParent.addChildName(oData.searchResults.name);	// Store this child's name in the parent for quick lookup.
	}
	this.setup(oData, fnGetMoreResults, fnNodeSelected);
};

YAHOO.extend(MediaNode, YAHOO.widget.TextNode,
{
	/**
     * The node type
     * @property __type
     * @private
     * @type string
     * @default "MediaNode"
     */
    __type: "MediaNode",
    
    /**
     * An array of child names, keyed by the child name.
     */
    __childNames: null,

    /**
     * The search results.
     */
    __searchResults: null,
    
    /**
     * The method to invoke to get more results.
     */
    __fnGetMoreResults: null,
    
    /**
     * The method to invoke when a node is selected.
     */
    __fnNodeSelected: null,
    
    /**
     * Setup the node.
     *
     * @param oData The node setup data.
     * @param fnGetMoreResults The asynchronous function to get more results.
     * @param fnNodeSelected The function to invoke when a node is selected.
     */
    setup: function(oData, fnGetMoreResults, fnNodeSelected)
    {
    	this.__fnGetMoreResults = fnGetMoreResults;
    	this.__fnNodeSelected = fnNodeSelected;
    	this.__childNames = new Array();
    	this.__searchResults = oData.searchResults;
    	
    	// Setup node select event.
		this.tree.subscribe('clickEvent', this.nodeSelectEvent); 
    },
    
    /**
	 * Get the HTML for the node.
	 */
    getContentHtml: function()
    {                                                                                                                                           
        var sb = [];
        sb[sb.length] = '<table>';
        sb[sb.length] = '<tr>';
        sb[sb.length] = '<td><span id="';
        sb[sb.length] = this.labelElId;
        sb[sb.length] = '" class="';
        sb[sb.length] = this.labelStyle;
        sb[sb.length] = '">';
        sb[sb.length] = this.__searchResults.name;
        if (this.__searchResults.tracks)
        {
        	sb[sb.length] = ' (' + this.__searchResults.tracks.length + ')';
        }                                                                                                                                     
        sb[sb.length] = '</span></td>';
        sb[sb.length] = '</tr>';
        sb[sb.length] = '</table>';
        
        return sb.join("");                                                                                                                                                
    },
    
    /**
     * Adds a child name to the array index.
     * 
     * @param childName The child name.
     */
    addChildName: function(childName)
    {
    	this.__childNames[childName.toUpperCase()] = true;
    },
    
    /**
     * Event when any node is selected.
     *
     * @param oArgs Information about the select event.
     */
    nodeSelectEvent: function(oArgs)
    {
    	var node = oArgs.node;
    	return node.onNodeSelect();
    },
    
    /**
     * Function invoked when the node is selected.
     */
    onNodeSelect: function()
    {
    	if (this.__searchResults.areLoaded)
    	{
    		// Search results have already been loaded for this node. Focus it and callback function with tracks for selected node.
    		this.focus();
    		this.__fnNodeSelected(this.__searchResults);
    		return false;
    	}
    	else
    	{
    		// Search results have not been loaded yet.
    		if (this.expanded)
    		{
    			// Load results for a node that is already expanded.
    			this.__loadNode();
    			return false;	// No further action as this has been managed.
    		}
    		else
    		{
    			return true;	// Let YUI model decide what to do next (invokes dynamic load function).
    		}
    	}
    },
    
    /**
	 * Builds the dynamic children that hang off this node.
	 *
	 * @param resultDirectories An array of result directories.
	 */
    addCollapsedChildren: function(resultDirectories)
	{
		var continueChildCheck = true;

		for (resultDirectoryIndex in resultDirectories)
		{
			// Remove any trailing /.
			var directoryName = resultDirectories[resultDirectoryIndex].name.replace(/\/$/, '');
			
			// Check whether to add this child (it may already exist).
			if (continueChildCheck && this.__doesChildExist(directoryName))
			{
				// The child already exists skip to the next one (no need to check for match after this, as there can only be 1 pre-loaded child).
				continueChildCheck = false;
				continue;
			}
			
			// Construct oData object.
			var tmpData = new Object();
	 		tmpData.expanded = false;
	 		tmpData.searchResults = new Object();
			tmpData.searchResults.name = directoryName;
			tmpData.searchResults.url = this.__searchResults.url + '/' + resultDirectories[resultDirectoryIndex].context;

			//Add the child.
			var childNode = new MediaNode(tmpData, this, this.__fnGetMoreResults, this.__fnNodeSelected);
			
			// Set the function to callback when the child is expanded.
			childNode.setDynamicLoad(
				function(self)
				{
					return function(node, fnLoadComplete)
					{
						self.__nodeExpanded(fnLoadComplete);
					};
				}(childNode));
		}
	},
	
	/**
     * Checks if the child name exists under this node. The child array is used for fast indexing.
     * 
     * @param childName The child name.
     * @return TRUE if the child name exists.
     */
    __doesChildExist: function(childName)
    {
    	// Convert name to upper case.
		childName = childName.toUpperCase();
		
    	if (this.__childNames[childName])
    	{
    		return true;
    	}
    	else
    	{
    		return false;
    	}
    },
    
    /**
     * Loads node data.
     */
    __loadNode: function()
    {
    	this.isLoading = true;
		this.refresh();
		var node = this;
		// Use the expanded functionality to load data.
		this.__nodeExpanded(
			// For when loading is complete.
			function()
			{
				node.isLoading = false;
				node.refresh();
			});
    },
    
    /**
	 * Function called when a dynamic node is expanded.
	 *
	 * @param fnLoadComplete Function to call when the dynamic data insertion has completed.
	 */
	__nodeExpanded: function(fnLoadComplete)
	{
		var self = this;
		// Get more results.
		this.__fnGetMoreResults(this.__searchResults.url,
			function(branchData)
			{
				self.__buildBranchExpandedResults(branchData, fnLoadComplete); 
			});
	},
	
	/**
	 * Function called to add results to a dynamic node.
	 *
	 * @param branchData The branch data.
	 * @param fnLoadComplete Function to call when the dynamic data insertion has completed.
	 */
	__buildBranchExpandedResults: function(branchData, fnLoadComplete)
	{
		// Check that data was returned.
		if (branchData)
		{
			// Update the node data.
			this.__searchResults.title = branchData.title;
			this.__searchResults.tracks = branchData.tracks;
			this.__searchResults.areLoaded = true;
			this.parent.refresh();
			// Add the children (child nodes/directories), if any.
			if (branchData.directories.length > 0)
			{
				this.addCollapsedChildren(branchData.directories);
			}
			else
			{
				this.iconMode = 1;
			}
		}
		else
		{
			// Ensure this node won't load again.
			this.__searchResults.areLoaded = true;
			if (!this.children || this.children.length == 0)
			{
				// Set the icon mode as there are no children.
				this.iconMode = 1;
			}
			this.parent.refresh();
		}
		
		// Loading complete.
		fnLoadComplete();
		this.focus();
		this.__fnNodeSelected(this.__searchResults);
	}
});
/**
 * The Google Media Sites Pane UI.
 */
var GoogleMediaSitesPaneUI = Base.extend(
{
	/**
	 * Definition of result columns.
	 */
	__columnDefs: [{key:"url", label:"Result URL"}],
				    
	/**
	 * The data schema.
	 */			    
	__schema: ["url"],
	
	/**
	 * The list UI.
	 */
	__listUI: null,
	
	/**
	 * The method to invoke when a site is selected.
	 */
	__fnSiteSelected: null,
	
	/**
	 * The number of sites.
	 */
	__numSites: null,
	
	/**
	 * Constructor for GoogleMediaSitesPaneUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnSiteSelected The method to invoke when a site is selected.
	 */
	constructor: function(containerId, fnSiteSelected)
	{
		this.__fnSiteSelected = fnSiteSelected;
		this.__numSites = 0;
		
		// Setup the sites pane UI.
		this.__listUI = new SelectableTableUI(containerId, this.__columnDefs, this.__schema,
				function(self)
				{
					return function(rowData)
							{
								self.selected(rowData);
							};
				}(this));
	},
	
	/**
	 * Clears the list.
	 */
	clear: function()
	{
		this.__listUI.clear();
		this.__numSites = 0;
	},
	
	/**
	 * Invoked when a row is selected.
	 * 
	 * @param rowData The selected row data.
	 */
	selected: function(rowData)
	{
		this.__fnSiteSelected(rowData[0]);
	},
	
	/**
	 * Adds site data.
	 * 
	 * @param siteData The site data.
	 */
	addSite: function(siteData)
	{
		// Remove any trailing /.
		siteData.url = siteData.url.replace(/\/$/, '');
		
		// Replace %20 with space.
		siteData.url = siteData.url.replace(/%20/g, ' ');
		
		// Add row.
		this.__listUI.addRow(siteData);
		this.__numSites++;
	}
});
/**
 * The Google Media Tracks Pane UI.
 */
var GoogleMediaTracksPaneUI = Base.extend(
{
	/**
	 * Definition of result columns.
	 */
	__columnDefs: [{key:"name", label:"Name"}, {key:"url", label:"URL"}],
				    
	/**
	 * The data schema.
	 */			    
	__schema: ["name","url"],
	
	/**
	 * The list UI.
	 */
	__listUI: null,
	
	/**
	 * Constructor for GoogleMediaTracksPaneUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnTracksSelected The function to invoke when tracks are selected.
	 */
	constructor: function(containerId, fnTracksSelected)
	{
		// Setup the sites pane UI.
		this.__listUI = new SelectableTableUI(containerId, this.__columnDefs, this.__schema, fnTracksSelected, "Enqueue selection");
	},
	
	/**
	 * Clears the list.
	 */
	clear: function()
	{
		this.__listUI.clear();
	},
	
	/**
	 * Shows the tracks.
	 */
	showTracks: function(tracks)
	{
		// Update list UI.
		if (null != tracks.length && 'number' == typeof(tracks.length) && tracks.length > 0)
		{
			this.clear();
			this.__listUI.addRows(this.__orderTracks(tracks));
		}
		else
		{
			this.clear();
		}
	},
	
	/**
     * Order the track objects.
     */
    __orderTracks: function(tracks)
    {
    	// Make two lists. One with matched tracks, the other with unmatched tracks.
		var matchedTrack = new Array();
		var unmatchedTrack = new Array();
		var trackIndex;
		var currentTrack;
		for (trackIndex in tracks)
		{
			currentTrack = tracks[trackIndex];
			if (currentTrack.isMatched)
			{
				// A matched track.
				matchedTrack[matchedTrack.length] = currentTrack;
			}
			else
			{
				// An unmatched track.
				unmatchedTrack[unmatchedTrack.length] = currentTrack;
			}
		}
		
		// Recombine into one list.
		var orderedTracks = new Array();
		for (trackIndex in matchedTrack)
		{
			orderedTracks[orderedTracks.length] = matchedTrack[trackIndex];
		}
		for (trackIndex in unmatchedTrack)
		{
			orderedTracks[orderedTracks.length] = unmatchedTrack[trackIndex];
		}
		
		return orderedTracks;
    }
});
/**
 * The Google Media Search UI.
 */
var GoogleMediaUI = Base.extend(
{
	/**
	 * The layout.
	 */
	__layout: null,
	
	/**
	 * The sites pane UI.
	 */
	__sitesPaneUI: null,
	
	/**
	 * The site browser pane UI.
	 */
	__siteBrowserPaneUI: null,
	
	/**
	 * The track pane UI.
	 */
	__tracksPaneUI: null,
	
	/**
	 * A flag to indicate whether or not to allow site browsing.
	 */
	__noResults: false,
	
	/**
	 * Constructor for GoogleMediaSearchUI.
	 * 
	 * @param containerId The ID of the container.
	 * @param fnGetMoreResults The asynchronous function to get more results.
	 */
	constructor: function(containerId, fnGetMoreResults)
	{
		// Setup IDs for panes.
		var sitesId = containerId + "_sitesPane";
		var siteBrowserId = containerId + "_siteBrowserPane";
		var tracksId = containerId + "_tracksPane";
		
		// Setup sizes.
		var elContainer = $('#' + containerId);
		var height = $(window).height() - elContainer.offset().top + 20;// - 40; // Leave gap at bottom.
		var width = $(window).width();
		
		// Create the layout.
		this.__layout = new YAHOO.widget.Layout(containerId, {height: height, width: width,
			units: [
        		{ position: 'left', width: width/2, scroll: true, resize: true, body: '<div id="' + sitesId + '"></div>', gutter: '0 9px 0 0', minWidth: 50, maxWidth: width-50 },
        		{ position: 'center', scroll: true, body: '<div id="' + siteBrowserId + '"></div>' },
        		{ position: 'bottom', height: height/3, scroll: true, resize: true, body: '<div id="' + tracksId + '"></div>', gutter: '9px, 0 0 0', minHeight: 50, maxHeight: height-50 }]});
		this.__layout.render();
		
		// Create the sites pane.
		this.__sitesPaneUI = new GoogleMediaSitesPaneUI(sitesId,
				function(self)
				{
					return function(siteData)
					{
						self.siteSelected(siteData);
					};
				}(this));
				
		// Create the site browser pane.
		this.__siteBrowserPaneUI = new GoogleMediaSiteBrowserPaneUI(siteBrowserId, fnGetMoreResults,
				function(self)
				{
					return function(contextData)
					{
						self.contextSelected(contextData);
					};
				}(this));
				
		// Create the tracks pane.
		this.__tracksPaneUI = new GoogleMediaTracksPaneUI(tracksId,
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
		// Clear the sites pane UI.
		this.__sitesPaneUI.clear();
		// Clear the site browser pane UI.
		this.__siteBrowserPaneUI.clear();
		// Clear the tracks browser pane UI.
		this.__tracksPaneUI.clear();
		
		// Set no results.
		this.__noResults = true;
	},
	
	/**
	 * Adds details to the pane to indicate that searching has started.
	 */
	searchStarted: function()
	{
		var tmp = new Object();
		tmp.url = 'Scanning...';
		this.__sitesPaneUI.addSite(tmp);
	},
	
	/**
	 * Adds indication that there were no results.
	 */
	noResults: function()
	{
		this.__sitesPaneUI.clear();
		var tmp = new Object();
		tmp.url = 'No results.';
		this.__sitesPaneUI.addSite(tmp);
	},
	
	/**
	 * Adds a result.
	 * 
	 * @param result The result data.
	 */
	addResult: function(result)
	{
		if (this.__noResults == true)
		{
			// Clear the sites pane UI.
			this.__sitesPaneUI.clear();
			this.__noResults = false;
		}
		this.__sitesPaneUI.addSite(result);
	},
	
	/**
	 * Selects a site.
	 * 
	 * @param siteData The selected site data.
	 */
	siteSelected: function(siteData)
	{
		// Only continue if there are results.
		if (!this.__noResults)
		{
			this.__tracksPaneUI.clear();
			this.__siteBrowserPaneUI.showSite(siteData);
		}
	},
	
	/**
	 * Selects a context.
	 * 
	 * @param contextData The context data.
	 */
	contextSelected: function(contextData)
	{
		this.__tracksPaneUI.showTracks(contextData.tracks);
	},
	
	/**
	 * Tracks selected.
	 * 
	 * @param tracks The tracks.
	 */
	tracksSelected: function(tracks)
	{
		var tracks;
		for (track in tracks)
		{
			// Get useful info.
			var url = tracks[track].url;
            var title = tracks[track].name;
            
			// Get the track length.
			var songLength = winampGetMetadata(url, "length");
			if (songLength == -1)	// Error.
			{
				// Bad ID3 tag, possible bad site. Report to App engine.
				reportBadMedia(url, 1);
				alert('The track "' + title + '" could not be found on the site.');
			}
			else if (songName == 0)
			{
				// WinAmp API not supported.
				return;
			}
			else
			{
				// Load remaining tag data.
				var songName = winampGetMetadata(url, "title");
				var songArtist = winampGetMetadata(url, "artist");
				
				// Construct title from meta data.
				if (songName.length > 0 && songArtist.length > 0)
				{
					// Truncate songName if there are zeros. Happens occasionallyh, error in Winamp API?
					for (i=0; i<songName.length; i++)
					{
						if (songName.charCodeAt(i) == 0)
						{
							if (i == 0)
							{
								songName = "";
							}
							else
							{
                                songName = songName.substr(0, i)
							}
						}
					}
					title = songArtist + " - " + songName;
				}
	
				// Enqueue the track.
				enqueueMedia(0, url, title, songLength)
				
				// Track enqueue.
                pageTracker._trackEvent('Audio', 'Enqueue', title + "; " + url);
			}
		}
	}
});
