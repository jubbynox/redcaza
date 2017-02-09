import re
import logging
import urllib

from google.appengine.api import urlfetch

GET_VIDEO_INFO_URL = "http://www.youtube.com/watch?v=VIDEO_ID"
RE_FMT_URL_MAP = '"fmt_url_map":.*?"(.*?)"'

class YouTube:
    """YouTube search object."""
    
    def __init__(self, urlFetch):
        """Initialiser."""
        self.__urlFetch = urlFetch    # The URL fetch processor
        self.getVideoURL = ''
        
    def clearUrlFetch(self):
        self.__urlFetch = None
        
    def constructVideoURL(self, videoID, fmt):
        """Constructs the video URL."""
        
        # Get the raw FMT URL map.
        rawFmtUrlMap = self.__getRawFmtUrlMap(videoID)
        if not rawFmtUrlMap:
            # Failure
            return
        
        # Convert to something more useful.
        fmtUrlMap = self.__convertRawMapToFull(rawFmtUrlMap)
        
        # Select appropriate URL.
        self.getVideoURL = self.__selectAppropriateUrl(fmtUrlMap, fmt)
        
        # Success
        return True
    
    def __getRawFmtUrlMap(self, videoID):
        """Gets the raw FMT URL map from the video ID."""
        # Construct URL.
        url = GET_VIDEO_INFO_URL.replace('VIDEO_ID', videoID)
        
        # Get the page content.
        result = self.__urlFetch.fetch(url, None, urlfetch.GET, {}, True, True)
            
        if result.status_code != 200:
            # Website did not respond correctly. Report error.
            logging.error('Could not get video information from site: ' + url + ' (' + str(result.status_code) + ')')
            logging.debug('result.content = ' + result.content)
            return
        # Ensure the content is in the right format.
        result.content = result.content.decode('utf-8', 'ignore')
        
        # Retrieve the FMT URL map..
        match = re.search(RE_FMT_URL_MAP, result.content, re.I)
        if match:
            return urllib.unquote_plus(match.group(1))
        logging.error("Unable to get information from YouTube.")
        
    def __convertRawMapToFull(self, rawFmtUrlMap):
        """Converts the raw FMT URL map into something that is more manageable."""
        # Split on ","
        fmtUrlPairs = rawFmtUrlMap.split(',')
        
        # Create map of FMT against URL.
        fmtUrlMap = {}
        for fmtUrlPair in fmtUrlPairs:
            tmp = fmtUrlPair.split('|')
            fmtUrlMap[tmp[0]] = tmp[1]
            
        return fmtUrlMap
    
    def __selectAppropriateUrl(self, fmtUrlMap, fmt):
        """Selects the appropriate URL for the supplied format."""
        # Search for specified format.
        if fmt in fmtUrlMap:
            logging.debug("Found format: " + fmt)
            return fmtUrlMap[fmt]
        elif '5' in fmtUrlMap:
            logging.debug("Using default format.")
            return fmtUrlMap['5']   # Default.
        logging.debug("No matching formats.")