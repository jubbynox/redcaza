import os
import wsgiref.handlers

from google.appengine.ext import webapp
from mediasearch import commonservlets
from mediasearch import mediaservlets
from mediasearch import youtubeservlets
from mediasearch import lastfmservlets


def main():
    application = webapp.WSGIApplication(
                                         [('/google/searchUrl', mediaservlets.SearchUrl),
                                          ('/google/getIgnoredSites', mediaservlets.GetIgnoredSites),
                                          ('/google/addBadMedia', mediaservlets.AddBadMedia),
                                          ('/youtube/getVideo', youtubeservlets.GetVideo),
                                          ('/lastfm/getRadioTrack', lastfmservlets.GetRadioTrack),
                                          ('/addComments', commonservlets.AddComments),
                                          ('/getSupportedApps', commonservlets.GetSupportedApps),
                                          ('/pluginPage.*', commonservlets.PluginPage),
                                          ('/winamp.css', commonservlets.GetWinAmpCSS)],
                                          debug=True)
    wsgiref.handlers.CGIHandler().run(application)
  
  
if __name__ == "__main__":
    main()