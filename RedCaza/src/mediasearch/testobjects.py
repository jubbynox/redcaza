class AnyObject:
    """Used to hold any data."""
    pass

class TestUrlFetch:
    """A dummy URL fetch class."""
    
    def __init__(self):
        """Initialiser."""
        self.__statusCode = 200
        self.__content = self.content1
        pass
        
    def setStatusCode(self, statusCode):
        self.__statusCode = statusCode
        
    def setContent(self, content):
        self.__content = content
    
    def fetch(self, a, b, c, d, e, f):
        result = AnyObject()
        result.status_code = self.__statusCode
        result.content = self.__content
        return result
        
    content1 = """
        <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN"> 
<html> 
 <head> 
  <title>Index of /mp3/Pearl Jam</title> 
 </head> 
 <body> 
<h1>Index of /mp3/Pearl Jam</h1> 
 
<table style="width:100%;"> 
<tr> 
<td style="vertical-align:top;"> 
 
<pre> 
<table> 
<tr> 
<td><a href="?C=N;O=D">Name</a></td> 
<td><a href="?C=M;O=A">Last modified</a></td> 
<td><a href="?C=S;O=A">Size</a></td> 
<td><a href="?C=D;O=A">Description</a></td> 
</tr> 
<tr> 
    <td><img src="/icons/back.gif" alt="[DIR]"></td> 
    <td><a href="../">Parent Directory</a></td> 
    <td>-</td> 
    <td></td> 
    <td></td> 
</tr>   
<tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Better Man.mp3">Pearl Jam - Better Man.mp3</a></td> 
                <td>1-Oct-2007 1:14</td> 
                <td>3.5M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Cropduster.mp3">Pearl Jam - Cropduster.mp3</a></td> 
                <td>1-Oct-2007 1:18</td> 
                <td>6.5M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Daughter.mp3">Pearl Jam - Daughter.mp3</a></td> 
                <td>1-Oct-2007 1:12</td> 
                <td>5.7M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Im Still Alive.mp3">Pearl Jam - Im Still Alive.mp3</a></td> 
                <td>1-Oct-2007 1:16</td> 
                <td>5.6M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Jeremy.mp3">Pearl Jam - Jeremy.mp3</a></td> 
                <td>1-Oct-2007 1:10</td> 
                <td>4.7M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Last Kiss.mp3">Pearl Jam - Last Kiss.mp3</a></td> 
                <td>1-Oct-2007 1:18</td> 
                <td>4.4M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Nothing As It Seems.mp3">Pearl Jam - Nothing As It Seems.mp3</a></td> 
                <td>1-Oct-2007 1:19</td> 
                <td>3.3M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Sitting on the Dock of the Bay [live].mp3">Pearl Jam - Sitting on the Dock of the Bay [live].mp3</a></td> 
                <td>1-Oct-2007 1:12</td> 
                <td>3.6M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="Pearl Jam - Trouble.mp3">Pearl Jam - Trouble.mp3</a></td> 
                <td>1-Oct-2007 1:12</td> 
                <td>3.7M </td> 
                <td></td> 
                </tr><tr> 
                <td>[SND]</td> 
                <td><a href="http://Pearl Jam - Yellow Ledbetter.mp3">Pearl Jam - Yellow Ledbetter.mp3</a></td> 
                <td>1-Oct-2007 1:17</td> 
                <td>3.6M </td> 
                <td></td> 
                </tr></table></pre> 
 
</td> 
</tr> 
</table> 
 
<hr> 
</body></html> 
        """
        
    content2 = """
        <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN"> 
<HTML> 
 <HEAD> 
  <TITLE>Index of /music/Not Us/Pearl Jam</TITLE> 
 </HEAD> 
 <BODY> 
<H1>Index of /music/Not Us/Pearl Jam</H1> 
<UL><LI><A HREF="/music/Not%20Us/"> Parent Directory</A> 
<LI><A HREF="Binaural"> Binaural</A> 
<LI><A HREF="Lost%20Dogs%20(B-Sides)"> Lost Dogs (B-Sides)</A> 
<LI><A HREF="No%20Code"> No Code</A> 
<LI><A HREF="Pearl%20Jam"> Pearl Jam</A> 
<LI><A HREF="Riot%20Act"> Riot Act</A> 
<LI><A HREF="Singles%20-%2002%20-%20Breath.mp3"> Singles - 02 - Breath.mp3</A> 
<LI><A HREF="Singles%20-%2008%20-%20State%20Of%20Love%20And%20Trust.mp3"> Singles - 08 - State Of Love And Trust.mp3</A> 
<LI><A HREF="Sweet%20Relief%20%20A%20Benefit%20For%20Victoria%20Williams%20-%2003%20-%20Crazy%20Mary.mp3"> Sweet Relief  A Benefit For Victoria Williams - 03 - Crazy Mary.mp3</A> 
<LI><A HREF="Ten"> Ten</A> 
<LI><A HREF="UNKNOWN%20-%2000%20-%20I%20Got%20You.mp3"> UNKNOWN - 00 - I Got You.mp3</A> 
<LI><A HREF="Vitalogy"> Vitalogy</A> 
<LI><A HREF="Vs"> Vs</A> 
<LI><A HREF="Yield"> Yield</A> 
</UL><ADDRESS>Apache/1.3.29 Server at www.hiddenrebelbase.net Port 80</ADDRESS> 
</BODY></HTML>"""


    content3 = """<!CRAP!">""" 
