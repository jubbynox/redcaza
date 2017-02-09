import os
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.api import urlfetch
from mediasearch import commonservlets
from mediasearch import jsonpickle
from mediasearch import youtube
from mediasearch import redcazaresponse

#TRANSCODE_CONFIG = "#transcode{vcodec=DIV3,vb=2048,scale=1,hq,acodec=mp3,ab=320,channels=2}:duplicate{dst=std{access=mmsh,mux=ts,dst=DST}}"
TRANSCODE_CONFIG = "#transcode{vcodec=DIV3,vb=2048,scale=1,acodec=mp3,ab=320,channels=2}:std{access=mmsh,mux=asfh,dst=DST}"


class GetVideo(webapp.RequestHandler):
    """Entry point for processing get video query."""
    def get(self):
        # Ensure no caching.
        commonservlets.setNoCacheHeaders(self.response)
        
        jsonOut = None
        urlFetch = urlfetch
        yt = youtube.YouTube(urlFetch)
        if yt.constructVideoURL(self.request.get("videoID"), self.request.get("fmt")):
            response = redcazaresponse.RedCazaResponse(1, yt.getVideoURL)
            response.setSeekable(1) # Is seekable.
            response.setTranscodeDetails(True, TRANSCODE_CONFIG, "")
            jsonOut = jsonpickle.encode(response, unpicklable=False)
            
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