/**
 * Function to be invoked on page load. Sets up the required objects.
 */
function onLoadExtended()
{
	// Setup tabs.
	//var tabs = new YAHOO.widget.TabView("tabs");
	$("#tabs").tabs();
	
	// Setup change history etc. accordion.
	$("#changeHistoryAccordion").accordion({ autoHeight: false, animated: false });
	
	// Hide the feedback.
	$("#feedbackSent").hide();
	
    // Bind onclick for comments submission.
    $("#sendFeedback").click(
        function ()
        {
        	// Get the comments.
        	var comments = $('#feedback')[0].value;
        	
        	if (comments.length > 0)
        	{
	        	// Disable.
	        	$(this).attr("disabled", true);
	        	
	        	// Add the comments.
	            addComments(comments);
	            
	            // Clear text area.
	            $('#feedback')[0].value = "";
	            
	            // Show the feedback.
	            $("#feedbackSent").show();
	            
	            // Enable.
	            $(this).removeAttr("disabled");
        	}
        });
        
    // Limit input size.
    $("#feedback").click(
        function ()
        {
        	// Hide the feedback.
            $("#feedbackSent").hide();
            
            // Do nothing more.
            return false;
        });
        
    // Limit input size.
    $("#feedback").keypress(
        function (e)
        {
        	// Get size of textarea.
        	var textarea = $('#feedback')[0];
        	var size = textarea.value.length;
        	if (size > 511)
        	{
        		textarea.value = textarea.value.substring(0, 511);
        	}
        });
}
