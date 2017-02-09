import re
import logging
import random
import xml.etree.ElementTree as XMLTree

from google.appengine.api import urlfetch

GET_SESSION_KEY_URL = "http://ext.last.fm/1.0/webclient/xmlrpc.php"
GET_SESSION_KEY_DATA = "<methodCall><methodName>getSession</methodName><params /></methodCall>"
CHANGE_STATION_URL = "http://ws.audioscrobbler.com/radio/adjust.php/?session=SESSION_KEY&url=lastfm://artist/ARTIST/similarartists"
GET_POSSIBLE_TRACKS_URL = "http://ws.audioscrobbler.com/radio/xspf.php?sk=SESSION_KEY&desktop=1.5.1&lang=en"

#XPATH_SESSION_KEY = "params/param/value/array/data/value[1]/string"
RE_STATION_CHANGE_OK = "response=OK"
RE_STATION_NAME = "^stationname=(.*)$"
XPATH_TRACKS = "trackList/track"
XPATH_TRACK_TITLE = "title"
XPATH_TRACK_ARTIST = "creator"
XPATH_TRACK_URL = "location"
XPATH_TRACK_DURATION = "duration"

class LastFM:
    """YouTube search object."""
    
    def __init__(self, urlFetch):
        """Initialiser."""
        self.__urlFetch = urlFetch    # The URL fetch processor
        self.mp3URL = ''
        self.title = ''
        self.duration = 0
        
    def clearUrlFetch(self):
        self.__urlFetch = None
        
    def selectRadioTrack(self, artist):
        """Selects a radio track for the artist."""
        # Get the token.
        sessionKey = self.__getSessionKey()
        if not sessionKey:
            # Failure.
            return
        logging.info(sessionKey)
        
        # Change the station to the desired artist.
        stationName = self.__changeStation(artist, sessionKey)
        if not stationName:
            # Failure.
            return
        logging.info(stationName)
        
        # Get a list of possible tracks to return.
        possibleTracks = self.__getPossibleTracks(sessionKey)
        
        # Pick one track at random.
        self.__pickRandomTrack(possibleTracks, stationName)
        
        # Success
        return True
    
    def __getSessionKey(self):
        """Gets the session key."""
        # Get the page content.
        result = self.__urlFetch.fetch(GET_SESSION_KEY_URL, GET_SESSION_KEY_DATA, urlfetch.POST, {"Content-Type":""}, True, True)
        if result.status_code != 200:
            # Website did not respond correctly. Report error.
            logging.error('Could not get session key from LastFM.')
            return
        
        # Retrieve the token ID. xPath not properly implemented.
        root = XMLTree.XML(result.content)
        if root:
            return root[0][0][0][0][0][1][0].text
        return None
        
    def __changeStation(self, artist, sessionKey):
        """Changes the station to the specified artist."""
        url = CHANGE_STATION_URL.replace('SESSION_KEY', sessionKey).replace('ARTIST', artist.replace(' ', '+'))
        result = self.__urlFetch.fetch(url, None, urlfetch.GET, {}, True, False)
        logging.info(result.content)
        if result.status_code != 200:
            # LastFM did not respond as expected.
            return False
        
        # Check that all is OK.
        match = re.search(RE_STATION_CHANGE_OK, result.content, re.I)
        if match:
            # Success.
            match = re.search(RE_STATION_NAME, result.content, re.I | re.M)
            if match:
                return match.group(1)
            else:
                return None
        else:
            # Failure.
            return None
        
    def __getPossibleTracks(self, sessionKey):
        """ Fills the possible tracks object. """
        url = GET_POSSIBLE_TRACKS_URL.replace('SESSION_KEY', sessionKey)
        result = self.__urlFetch.fetch(url, None, urlfetch.GET, {}, True, False)
        if result.status_code != 200:
            # LastFM did not respond as expected.
            return None
        
        # Retrieve the tracks.
        tracks = []
        root = XMLTree.XML(result.content)
        for xmlTrack in root.findall(XPATH_TRACKS):
            track = Track()
            track.name = xmlTrack.find(XPATH_TRACK_ARTIST).text + " - " + xmlTrack.find(XPATH_TRACK_TITLE).text
            track.url = xmlTrack.find(XPATH_TRACK_URL).text
            track.length = int(xmlTrack.find(XPATH_TRACK_DURATION).text)/1000
            tracks.append(track)
            
        return tracks
        
    def __pickRandomTrack(self, possibleTracks, stationName):
        """ Picks a track at random and fills in this object. """
        if len(possibleTracks) > 0:
            track = possibleTracks[random.randint(0, len(possibleTracks)-1)]
            self.duration = track.length
            self.mp3URL = track.url
            self.title = stationName + ": " + track.name
        
        
class Track:
    """Used to hold track data."""
    def __init__(self):
        """Initialiser."""
        self.url = ''
        self.name = ''
        self.length = 0