class RedCazaResponse:
    """RedCaza response object."""
    
    def __init__(self, operation, url):
        """Initialiser."""
        self.operation = operation
        self.url = url
        
    def setOperation(self, operation):
        """Sets the operation."""
        self.operation = operation
        
    def setUrl(self, url):
        """Sets the URL."""
        self.url = url
        
    def setTitle(self, title):
        """Sets the title."""
        self.title = title
        
    def setDuration(self, duration):
        """Sets the duration."""
        self.duration = duration
        
    def setSeekable(self, seekable):
        """Sets the seekable flag (-1, 0, 1)."""
        self.seekable = seekable
        
    def setTranscodeDetails(self, transcoded, transcodeConfig, transcoderOptions):
        """Sets the: transcoded flag (true, false); transcoding configuration; transcoder options."""
        self.transcoded = transcoded
        self.transcodeConfig = transcodeConfig
        self.transcoderOptions = transcoderOptions