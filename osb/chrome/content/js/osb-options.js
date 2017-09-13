var objOSBOptions =
{
	Init: function()
	{
		this.ndWindow = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser');
		this.ndWindow.objOSB.Init();
		this.sHideStatusBar = this.ndWindow.objOSB.prefService.getCharPref('HideStatusBar');//TODO AlexancarlProject: Init variable to show
		this.sCurrentItemList = this.ndWindow.objOSB.prefService.getCharPref('StatusBar');
		this.aPref = this.sCurrentItemList.split(',');

		this.ndHideSbCheck = document.getElementById('obs-hidestatusbar');//TODO AlexancarlProject: Check to hide statusbar
		this.ndOrgList = document.getElementById('orgstatusbar-list');

		this.bLocked = false;

		this.ndMoveUp = document.getElementById('osb-moveup');
		this.ndMoveDown = document.getElementById('osb-movedown');
		this.ndShow = document.getElementById('osb-showitem');
		this.ndHide = document.getElementById('osb-hideitem');

		this.ndMoveUp.disabled = 'disabled';
		this.ndMoveDown.disabled = 'disabled';
		this.ndShow.disabled = 'disabled';
		this.ndHide.disabled = 'disabled';

		this.ndWindow.objOSB.ndStatusBar.setAttribute('osbconfig', true);
		this.ndLastSelected = null;

		var nIndex;
		for (nIndex = 0; this.aPref[nIndex]; ++nIndex)
		{
			if (this.ndWindow.objOSB.InArray(this.aPref[nIndex].split(':')[0], this.ndWindow.objOSB.aDefaultItemList) === false) this.aPref.splice(nIndex--, 1);
		}

		this.RefreshList();

		return true;
	},

	HideStatusBar: function(p_Flag)
	{
		this.ndWindow.document.getElementById('status-bar').setAttribute('hide',p_Flag+'');
		return true;
	},

	RefreshList: function()
	{
		//TODO AlexancarlProject: Start
		if (this.sHideStatusBar == 'true')
		{
			this.ndHideSbCheck.checked = true;
		}
		//TODO AlexancarlProject: End

		while (this.ndOrgList.getElementsByTagName('listitem').length > 0)
		{
			this.ndOrgList.removeChild(this.ndOrgList.getElementsByTagName('listitem')[0]);
		}

		var ndListItem, ndListCell;
		for (var nIndex = 0; this.aPref[nIndex]; ++nIndex)
		{
			ndListItem = document.createElement('listitem');
			if (this.aPref[nIndex].split(':')[1] == '0') ndListItem.style.color = '#888888';
			ndListCell = document.createElement('listcell');
			ndListCell.setAttribute('label', this.aPref[nIndex].split(':')[0]);
			ndListItem.appendChild(ndListCell);
			this.ndOrgList.appendChild(ndListItem);
		}

		return true;
	},

	ToggleButtons: function()
	{
		var nIndex = this.ndOrgList.selectedIndex;
		var ndSelected = this.ndOrgList.selectedItem;
		var nRowCount = this.ndOrgList.getElementsByTagName('listitem').length;

		if (!ndSelected) return true;

		this.ndMoveUp.disabled = '';
		this.ndMoveDown.disabled = '';
		if (nIndex == 0)
		{
			this.ndMoveUp.disabled = 'disabled';
		}
		else if (nIndex == (nRowCount - 1))
		{
			this.ndMoveDown.disabled = 'disabled';
		}

		if (ndSelected.style.color.length > 0)
		{
			this.ndShow.disabled = '';
			this.ndHide.disabled = 'disabled';
		}
		else
		{
			this.ndShow.disabled = 'disabled';
			this.ndHide.disabled = '';
		}

		if (this.ndLastSelected) this.ndLastSelected.removeAttribute('osbselected');
		this.ndLastSelected = this.ndWindow.document.getElementById(ndSelected.firstChild.getAttribute('label'));
		if (this.ndLastSelected) this.ndLastSelected.setAttribute('osbselected', true);

		return true;
	},

	MoveUp: function()
	{
		if (this.bLocked) return true;
		this.bLocked = true;

		var nIndex = this.ndOrgList.selectedIndex;
		var ndSelected = this.ndOrgList.selectedItem;
		if (ndSelected && (nIndex != 0)) this.ndOrgList.selectItem(this.ndOrgList.insertBefore(ndSelected, this.ndOrgList.getPreviousItem(ndSelected, 1)));
		this.ToggleButtons();
		this.ndWindow.objOSB.Organize(this.GetItemList());

		this.bLocked = false;
		return true;
	},

	MoveDown: function()
	{
		if (this.bLocked) return true;
		this.bLocked = true;

		var nIndex = this.ndOrgList.selectedIndex;
		var ndSelected = this.ndOrgList.selectedItem;
		var nRowCount = this.ndOrgList.getElementsByTagName('listitem').length;
		if (ndSelected && (nIndex != (nRowCount - 1))) this.ndOrgList.selectItem(this.ndOrgList.insertBefore(ndSelected, this.ndOrgList.getNextItem(ndSelected, 2)));
		this.ToggleButtons();
		this.ndWindow.objOSB.Organize(this.GetItemList());

		this.bLocked = false;
		return true;
	},

	ShowItem: function()
	{
		if (this.bLocked) return true;
		this.bLocked = true;

		var ndSelected = this.ndOrgList.selectedItem;
		if (ndSelected) ndSelected.style.color = '';
		this.ToggleButtons();
		this.ndWindow.objOSB.Organize(this.GetItemList());

		this.bLocked = false;
		return true;
	},

	HideItem: function()
	{
		if (this.bLocked) return true;
		this.bLocked = true;

		var ndSelected = this.ndOrgList.selectedItem;
		if (ndSelected) ndSelected.style.color = '#888888';
		this.ToggleButtons();
		this.ndWindow.objOSB.Organize(this.GetItemList());

		this.bLocked = false;
		return true;
	},

	Cancel: function()
	{
		if (this.ndLastSelected) this.ndLastSelected.removeAttribute('osbselected');
		this.ndWindow.objOSB.ndStatusBar.removeAttribute('osbconfig');

		if (this.bLocked) return true;
		this.bLocked = true;

		this.ndWindow.objOSB.Organize(this.ndWindow.objOSB.prefService.getCharPref('StatusBar').split(','));

		this.bLocked = false;
		return true;
	},

	Update: function()
	{
		if (this.ndLastSelected) this.ndLastSelected.removeAttribute('osbselected');
		this.ndWindow.objOSB.ndStatusBar.removeAttribute('osbconfig');

		if (this.bLocked) return true;
		this.bLocked = true;

		var aItems = this.GetItemList();		
		this.ndWindow.objOSB.prefService.setCharPref('StatusBar', aItems.join(','));
		this.ndWindow.objOSB.prefService.setCharPref('HideStatusBar', this.ndHideSbCheck.checked);//TODO AlexancarlProject: Save hide statusbar state
		this.ndWindow.objOSB.Organize(aItems);

		this.bLocked = false;
		return true;
	},

	GetItemList: function()
	{
		var sItem;
		var aListItems = this.ndOrgList.getElementsByTagName('listcell');
		var aItemList = [];

		for (var nIndex = 0; aListItems[nIndex]; ++nIndex)
		{
			sItem  = aListItems[nIndex].getAttribute('label') + ':';
			sItem += (aListItems[nIndex].parentNode.style.color.length > 0) ? '0' : '1';
			aItemList.push(sItem);
		}

		return aItemList;
	},

	DefaultItemList: function()
	{
		this.aPref = [];
		for (var nIndex = 0; this.ndWindow.objOSB.aDefaultItemList[nIndex]; ++nIndex)
		{
			this.aPref.push(this.ndWindow.objOSB.aDefaultItemList[nIndex] + ':1');
		}

		this.sCurrentItemList = this.aPref.join(',');
		this.RefreshList();
		this.ndWindow.objOSB.Organize(this.aPref);

		return true;
	}
};