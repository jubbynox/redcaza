import os
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch
from mediasearch import commonservlets
from mediasearch import jsonpickle
from mediasearch import lastfm
from mediasearch import redcazaresponse

class GetRadioTrack(webapp.RequestHandler):
    """Entry point for processing get video query."""
    def get(self):
        # Ensure no caching.
        commonservlets.setNoCacheHeaders(self.response)
        
        jsonOut = None
        urlFetch = urlfetch
        lfm = lastfm.LastFM(urlFetch)
        if lfm.selectRadioTrack(self.request.get("artist")):
            response = redcazaresponse.RedCazaResponse(0, lfm.mp3URL)
            response.setSeekable(0) # Is not seekable.
            response.setTitle(lfm.title)
            response.setDuration(lfm.duration)
            jsonOut = jsonpickle.encode(response, unpicklable=False)
            jsonOut = jsonOut.replace("'", "\\'").replace('"','\"')
            
        if not jsonOut:
            jsonOut = '{ }'
            
        fnCallback = self.request.get("callback")
        if fnCallback:
            # Send data to callback function specified in GET parameters.
            # Create template values.
            templateValues = {
                              'fnCallback': fnCallback,
                              'data': jsonOut,
                              }
        
            # Write response.
            path = os.path.join(os.path.dirname(__file__), '../templates/Callback.html')
            self.response.out.write(template.render(path, templateValues))
        else:
            # Return data.
            self.response.out.write(jsonOut)