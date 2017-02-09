import re
import logging

from google.appengine.api import urlfetch
from mediasearch.db.dao import DaoBadMedia

RE_RESULT_TITLE_SEARCH = r"<title>index\s*of\s*(.*)</title>"
RE_MP3_SEARCH = "(?:<a href=\"([^\\n|\"|\\?]*?\\.mp3)\">([^\\n|<]*?)</a>)|(?:<a href='([^\\n|'|\\?]*?\\.mp3)'>([^\\n|<]*?)</a>)";
RE_CHILD_DIRECTORY_SEARCH = "(?:<a href=\"([^\\n|\"|\\?|\\.]*)\">([^\\n|<]*?)</a>)|(?:<a href='([^\\n|'|\\?|\\.]*)'>([^\\n|<]*?)</a>)";

        
class Branch:
    """Main branch object."""
    
    def __init__(self, urlFetch):
        """Initialiser."""
        self.__urlFetch = urlFetch    # The URL fetch processor
        self.searchCriteria = ''
        self.url = ''
        self.title = ''
        self.tracks = []
        self.directories = []
        
    def clearUrlFetch(self):
        self.__urlFetch = None
        
    def build(self, url, searchCriteria):
        """Builds the tree from the supplied URL."""
        # Set the search criteria.
        self.searchCriteria = searchCriteria
        
        # Check that the URL isn't a query string.
        if re.search(r'\?', url):
            return
        
        # Set the URL.
        self.url = url
        
        try:
            # Get the Web page content.
            result = self.__urlFetch.fetch(url, None, urlfetch.GET, {}, True, True)
            if result.status_code != 200:
                # Website did not respond correctly. Report error.
                logging.error('Could not get MP3 information from site: ' + url + ' (' + str(result.status_code) + ')')
                DaoBadMedia.add(url, 1)
                return False
            # Ensure the content is in the right format.
            result.content = result.content.decode('utf-8', 'ignore')
            
            # Set the branch title.
            if not self.__setTitle(result.content):
                return False
            
            # Find the MP3s.
            self.__findMP3s(result.content, searchCriteria, url)
            
            # Find any child directories.
            self.__findChildDirectories(result.content)
            
            # No tracks or directories means nothing of worth.
            #if len(self.tracks) == 0 and len(self.directories) == 0:
            #    return
            
            # Success
            return True
        except:
            # Log bad site and return error.
            logging.error('Site did not respond successfully: ' + url)
            DaoBadMedia.add(url, 2)
            return False
        
    def __setTitle(self, content):
        """Sets the branch title."""
        match = re.search(RE_RESULT_TITLE_SEARCH, content, re.I | re.S)
        if match:
            self.title = match.group(1)
            return True
        else:
            return
            
    def __findMP3s(self, content, searchCriteria, url):
        """Finds the MP3s, from the content, and flags those that match the search criteria."""
        # Remove trailing '/'.
        url = re.match(r'(.*?)/?$', url).group(1)
        
        # Find the site URL.
        siteUrl = re.search(r'https?://[^/]+', url, re.I).group(0)
        
        # Make the search criteria match any of the supplied words.
        reNameMatch = '(' + re.sub('\s+', ')|(', searchCriteria.strip()) + ')'
        
        # Find MP3s
        iterator = re.finditer(RE_MP3_SEARCH, content, re.I)
        if iterator:
            for match in iterator:
                track = Track()
                if match.group(1):
                    track.url = match.group(1)
                    track.name = match.group(2)
                else:
                    track.url = match.group(3)
                    track.name = match.group(4)
                if re.search(reNameMatch, track.name, re.I):
                    track.isMatched = True
                else:
                    track.isMatched = False
                track.url = self.__convertToFullUrl(track.url, url, siteUrl)
                self.tracks.append(track)
            return len(self.tracks)
        else:
            return 0
        
    def __convertToFullUrl(self, link, url, siteUrl):
        """Gets the full URL for a supplied link."""
        if re.search(r'^/', link): # Link relative to site URL.
            # Append site link to the site URL.
            return siteUrl + link
        if re.search(r'^http', link, re.I):
            # Full URL matched - return as is.
            return link
        # Append relative link to the supplied URL.
        return url + '/' + link
        
    def __findChildDirectories(self, content):
        """Finds any child directories from the content."""
        iterator = re.finditer(RE_CHILD_DIRECTORY_SEARCH, content, re.I)
        if iterator:
            for match in iterator:
                directory = Directory()
                if match.group(1):
                    directory.context = match.group(1)
                    directory.name = match.group(2)
                else:
                    directory.context = match.group(3)
                    directory.name = match.group(4)
                    
                # Ensure only relative links are returned.
                if directory.context:
                    matches = re.search(r'([^/]+)/?$', directory.context)
                    if matches:
                        directory.context = matches.group(1)
                        # Only add directories that are not the parent.
                        if not re.search('parent', directory.name, re.I):
                            self.directories.append(directory)
                
                
class Track:
    """Used to hold track data."""
    def __init__(self):
        """Initialiser."""
        self.url = ''
        self.name = ''
        self.type = 'gmedia'
        self.isMatched = False
        
        
class Directory:
    """Used to hold directory data."""
    def __init__(self):
        """Initialiser."""
        self.context = ''
        self.name = ''