/**
 * A selectable list that can invoke functions on double or right click.
 * If there is to be a context menu then double click and multi-select is allowed; otherwise single click acts like a double click.
 * If there is to be "more" functionality then pass a function as "fnMore" parameter.
 */
var SelectableTableUI = Base.extend(
{
	/**
	 * The data table.
	 */
	__dataTable: null,
	
	/**
	 * The element ID of the HTML element to contain the list.
	 */
	__containerId: null,
	
	/**
	 * The column definitions (see DataTable YUI).
	 */
	__columns: null,
	
	/**
	 * The data schema.
	 */
	__schema: null,
	
	/**
	 * The method to call on selection.
	 */
	__fnSelect: null,
	
	/**
	 * The right-click context menu text to activate the select function.
	 */
	__contextMenuTxt: null,
	
	/**
	 * The method to call to get more results. 
	 */
	__fnMore: null,
	
	/**
	 * Constructor.
	 * If there is to be a context menu then double click and multi-select is allowed; otherwise single click acts like a double click.
	 * Adding "fnMore" enables callback to add more results.
	 *
	 * @param containerId The element ID of the HTML element to contain the list.
	 * @param columns The column definitions (see DataTable YUI).
	 * @param schema The schema.
	 * @param fnSelect The method to call on selection.
	 * @param contextMenuTxt The right-click context menu text to activate the select function.
	 * @param fnMore The method to get more results (sends the current data as a parameter).
	 */
	constructor: function(containerId, columns, schema, fnSelect, contextMenuTxt, fnMore)
	{
		// Assign properties.
		this.__containerId = containerId;
		this.__columns = columns;
		this.__schema = schema;
		this.__fnSelect = fnSelect;
		this.__contextMenuTxt = contextMenuTxt;
		this.__fnMore = fnMore;
	},
	
	/**
	 * Adds data to the existing table.
	 * 
	 * @param data The data to add.
	 */
	addRow: function(data)
	{
		if (!this.__dataTable)	// If table does not exist the create a new one...
		{
			// Create array of data..
			var tmpData = new Array();
			tmpData[0] = data;
		
			// Create the table.
			this.__createTable(tmpData);
			this.__dataTable.hideMore();	// Can't be bothered to re-write YouTubeUI, so 1 result (e.g. "Scanning...") means there is no more.
		}
		else	// ...else add row.
		{
			this.__dataTable.addRow(data);
			this.__dataTable.showMore();
		}
	},
	
	/**
	 * Adds data to the existing table.
	 * 
	 * @param data The data to add.
	 */
	addRows: function(data)
	{
		if (!this.__dataTable)	// If table does not exist the create a new one...
		{
			this.__createTable(data);
		}
		else	// ...else add rows.
		{
			this.__dataTable.addRows(data);
		}
	},
	
	/**
	 * Selects a row by number.
	 * 
	 * @param rowNum The row number.
	 */
	selectRow: function(rowNum)
	{
		this.__dataTable.selectRow(rowNum);
	},
		
	/**
	 * Clears the table.
	 */
	clear: function()
	{
		// Destroy existing table.
		if (this.__dataTable)
		{
			this.__dataTable.destroy();
			this.__dataTable = null;
		}
	},
	
	/**
	 * Creates a new table.
	 * 
	 * @param data The row data.
	 */
	__createTable: function(data)
	{
		// Setup data source.	
		var dataSource = new YAHOO.util.LocalDataSource(data);
		dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_JSARRAY;
		dataSource.responseSchema = this.__schema;
		
		// Create new table.
		this.__dataTable = new SelectableDataTable(this.__containerId, this.__columns,
				dataSource, this.__fnSelect, this.__contextMenuTxt, this.__fnMore);
	}
});


/**
 * A selectable table that can invoke functions on double or right click.
 * If there is to be a context menu then double click and multi-select is allowed; otherwise single click acts like a double click.
 *
 * @param containerId The element ID of the HTML element to contain the list.
 * @param columns The column definitions (see DataTable YUI).
 * @param dataSource The data source.
 * @param fnSelect The method to call on selection.
 * @param contextMenuTxt The right-click context menu text to activate the select function.
 * @param fnMore The method to get more results (sends the current data as a parameter).
 */
SelectableDataTable = function(containerId, columns, dataSource, fnSelect, contextMenuTxt, fnMore)
{
	SelectableDataTable.superclass.constructor.call(this, containerId, columns, dataSource, {renderLoopSize: 10});
	this.setup(containerId, fnSelect, contextMenuTxt, fnMore);
};

YAHOO.extend(SelectableDataTable, YAHOO.widget.DataTable,
{
	/**
	 * The HTML for a "more..." button.
	 */
	MORE_HTML: '<a id="ID" href="#more_results">more...</a>',
	
	/**
	 * The container ID.
	 */
	__containerId: null,
	
	/**
	 * The method to call on selection.
	 */
	__fnSelect: null,
	
	/**
	 * The right-click context menu text to activate the select function.
	 */
	__contextMenuTxt: null,
	
	/**
	 * The context menu object.
	 */
	__contextMenu: null,
	
	/**
	 * The "more..." ID.
	 */
	__moreID: null,
	
	/**
     * Setup the selectable table.
     *
     * @param containerId The element ID of the HTML element to contain the list.
	 * @param fnSelect The method to call on selection.
	 * @param contextMenuTxt The right-click context menu text to activate the select function.
	 * @param fnMore The method to get more results (sends the current data as a parameter).
     */
    setup: function(containerId, fnSelect, contextMenuTxt, fnMore)
    {
    	// Assign properties.
    	this.__containerId = containerId;
    	this.__fnSelect = fnSelect;
    	this.__contextMenuTxt = contextMenuTxt;
    	
    	// Setup events based on context menu functionality.
    	if (contextMenuTxt)
    	{
    		// Single click just highlights row.
    		this.subscribe("rowClickEvent", this.__singleClick);
    		this.subscribe("rowDblclickEvent", this.__dblClick);
    	}
    	else
    	{
    		// Single click acts selects row if there is no context menu.
    		this.subscribe("rowClickEvent", this.__singleClickAndSelect);
    		// Disable multi-select if there is no context menu.
    		this.set("selectionMode","single");
    	}
    	
    	// Add "more" functionality, if required.
    	if (fnMore)
    	{
    		this.__moreID = containerId + '_a';
    		$('#' + containerId).append(this.MORE_HTML.replace('ID', this.__moreID));
    		$('#' + this.__moreID).bind('click', fnMore);
    	}
    },
    
    /**
     * Shows the "more...".
     */
    showMore: function()
    {
    	if (this.__moreID)
    	{
    		$('#' + this.__moreID).show();
    	}
    },
    
    /**
     * Hides the "more...".
     */
    hideMore: function()
    {
    	if (this.__moreID)
    	{
    		$('#' + this.__moreID).hide();
    	}
    },
    
    /**
     * Destroys the selectable data table.
     */
    destroy: function()
    {
    	// Destroy context menu.
    	if (this.__contextMenu)
    	{
    		this.__contextMenu.destroy();
    		this.__contextMenu = null;
    	}

    	// Invoke super method.
    	YAHOO.widget.DataTable.prototype.destroy.apply(this);
    },
    
    /**
     * Row selected.
     * 
     * @param event The event.
     * @param target The target.
     */
    __singleClick: function(event, target)
    {
    	// Invoke event select row method on parent object.
    	this.onEventSelectRow(event, target);
    	
    	// Create a context menu object (now that a row has been selected), if required.
    	if (this.__contextMenuTxt && !this.__contextMenu)
    	{
    		var dataTable = this;
    		this.__contextMenu = new YAHOO.widget.ContextMenu(this.__containerId + "_context",
                {trigger:dataTable.getTbodyEl()});
        	this.__contextMenu.addItem(this.__contextMenuTxt);
        	this.__contextMenu.render(this.__containerId);
        	this.__contextMenu.clickEvent.subscribe(dataTable.__contextClick, dataTable);
    	}
    },
    
    /**
     * Row selected.
     * 
     * @param event The event.
     * @param target The target.
     */
    __singleClickAndSelect: function(event, target)
    {
    	// Invoke event select row method on parent object.
    	this.onEventSelectRow(event, target);
    	
    	this.__rowsSelected(this.getSelectedRows());
    },
    
    /**
     * Double click event.
     * 
     * @param event The event object.
     * @param target The TD element.
     */
    __dblClick: function(event, target)
    {
    	this.__rowsSelected(this.getSelectedRows());
    },
    
    /**
     * Right-click context selection.
     */
    __contextClick: function(type, args, dataTable)
    {
    	dataTable.__rowsSelected(dataTable.getSelectedRows());
    },
    
    /**
     * Rows have been selected.
     * 
     * @selectedRowIds The selected row IDs.
     */
    __rowsSelected: function(selectedRowIds)
    {
    	var record;
    	var data = new Array();
    	for (var rowId in selectedRowIds)
    	{
    		record = this.getRecord(selectedRowIds[rowId]);
    		data[data.length] = record.getData();
    	}
    	this.__fnSelect(data);
    }
});
