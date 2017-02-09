from google.appengine.ext import webapp
from google.appengine.api import urlfetch
from mediasearch import commonservlets
from mediasearch import jsonpickle
from mediasearch import mediabranch
from mediasearch import testobjects
from mediasearch.db.dao import DaoBadMedia
from mediasearch.db.dao import DaoIgnoredSites


class SearchUrl(webapp.RequestHandler):
    """Entry point for processing query."""
    def get(self):
        # Set the headers.
        commonservlets.set24HExpiryHeaders(self.response)
        
        test = self.request.get("test")
        if test:
            urlFetch = testobjects.TestUrlFetch()
            if test == '2':
                urlFetch.setContent(urlFetch.content2)
            elif test == '3':
                urlFetch.setContent(urlFetch.content3)
        else:
            urlFetch = urlfetch
        url = self.request.get("url").replace(' ', '%20')
        branch = mediabranch.Branch(urlFetch)
        if branch.build(url, self.request.get("searchCriteria")):
            branch.clearUrlFetch()
            jsonOut = jsonpickle.encode(branch, unpicklable=False)
            self.response.out.write(jsonOut)
        else:
            self.response.clear()
            self.response.set_status(500)
            self.response.out.write("This operation failed; most likely there was a problem at: " + url)
        
        
class AddBadMedia(webapp.RequestHandler):
    """Entry point for adding bad media."""
    def post(self):
        mediaUrl = self.request.get("mediaUrl")
        cause = int(self.request.get("cause"))
        if mediaUrl and cause:
            DaoBadMedia.add(mediaUrl, cause)
            
            
class GetIgnoredSites(webapp.RequestHandler):
    """Entry point for retrieving a list of ignored sites."""
    def get(self):
        # Set the headers.
        commonservlets.set24HExpiryHeaders(self.response)
        
        boIgnoredSites = DaoIgnoredSites.getAll()
        ignoredSites = []
        for ignoredSite in boIgnoredSites:
            ignoredSites.append(ignoredSite.siteUrl)
        jsonOut = jsonpickle.encode(ignoredSites, unpicklable=False)
        self.response.out.write(jsonOut)