var objOSB =
{
	InArray: function(objItem, aTestArray)
	{
		for (var objIndex in aTestArray)
		{
			if (objItem == aTestArray[objIndex]) return objIndex;
		}

		return false;
	},

	InitServices: function()
	{
		window.removeEventListener('load', objOSB.InitServices, false);

		objOSB.prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('organizestatusbar.');
		objOSB.ndStatusBar = document.getElementById('status-bar');

		objOSB.connectObserver(objOSB.ndStatusBar);

		objOSB.aDefaultItemList = [];
		objOSB.aDefaultCollapsed = {};

		objOSB.InitOrganize();
	},

	InitOrganize: function()
	{
		objOSB.Init();
		objOSB.Organize(null);

		return true;
	},

	Init: function()
	{
		//Alexancarlproject: Hide status bar
		var aHidePref = 'false';
		if (objOSB.prefService.prefHasUserValue('HideStatusBar'))
		{
			aHidePref = objOSB.prefService.getCharPref('HideStatusBar');
			if (aHidePref == 'true')
			{
				objOSB.ndStatusBar.setAttribute('hide','true');
			}
		}

		//Alexancarlproject: Original Code
		objOSB.aDefaultCollapsed = {};

		var nIndex;
		var nNoID = 0;
		var aPref = [];
		var aCurrentID = [];

		if (objOSB.prefService.prefHasUserValue('StatusBar'))
		{
			aPref = objOSB.prefService.getCharPref('StatusBar').split(',');
			for (nIndex = 0; aPref[nIndex]; ++nIndex)
			{
				aCurrentID.push(aPref[nIndex].split(':')[0]);
			}
		}

		var aStatusBarPanels = objOSB.ndStatusBar.childNodes;
		for (nIndex = 0; aStatusBarPanels[nIndex]; ++nIndex)
		{
			if ((aStatusBarPanels[nIndex].nodeName == 'keyset')
			|| (aStatusBarPanels[nIndex].nodeName == 'toolbar')
			|| (aStatusBarPanels[nIndex].nodeName == 'stringbundle')
			|| (aStatusBarPanels[nIndex].nodeName == 'menupopup')
			|| (aStatusBarPanels[nIndex].nodeName == 'popupset')
			|| (aStatusBarPanels[nIndex].nodeName == 'popup'))
			{
				continue;
			}

			if ((aStatusBarPanels[nIndex].id == null) || (!aStatusBarPanels[nIndex].id.length)) aStatusBarPanels[nIndex].id = 'osb-noid-' + nNoID++;
			objOSB.aDefaultCollapsed[aStatusBarPanels[nIndex].id] = (objOSB.InArray(aStatusBarPanels[nIndex].id + ':0', aPref) === false) && (aStatusBarPanels[nIndex].getAttribute('collapsed') == 'true');
			if (objOSB.InArray(aStatusBarPanels[nIndex].id, objOSB.aDefaultItemList) === false) objOSB.aDefaultItemList.push(aStatusBarPanels[nIndex].id);
			if (objOSB.InArray(aStatusBarPanels[nIndex].id, aCurrentID) === false) aPref.push(aStatusBarPanels[nIndex].id + ':1');
		}

		objOSB.prefService.setCharPref('HideStatusBar', aHidePref);//TODO AlexancarlProject: Save state
		objOSB.prefService.setCharPref('StatusBar', aPref.join(','));

		return true;
	},

	Organize: function(aItemList)
	{
		if (!aItemList) aItemList = objOSB.prefService.getCharPref('StatusBar').split(',');
		var aStatusBar = objOSB.ndStatusBar.childNodes;

		var bSort = false, nOrder, nNext, ndOrderItem, ndNextItem;
		for (var nIndex = 0; aItemList[nIndex]; ++nIndex)
		{
			ndOrderItem = document.getElementById(aItemList[nIndex].split(':')[0]);
			if (!ndOrderItem || !ndOrderItem.parentNode || !(ndOrderItem.parentNode == objOSB.ndStatusBar)) continue;

			objOSB.disconnectObserver(ndOrderItem);
			ndOrderItem.setAttribute('collapsed', ((aItemList[nIndex].split(':')[1] == '0') || objOSB.aDefaultCollapsed[ndOrderItem.id]));
			objOSB.connectObserver(ndOrderItem);

			if (bSort || !aItemList[nIndex + 1]) continue;

			ndNextItem = document.getElementById(aItemList[nIndex + 1].split(':')[0]);
			if (!ndNextItem) continue;

			nOrder = objOSB.InArray(ndOrderItem, aStatusBar);
			nNext = objOSB.InArray(ndNextItem, aStatusBar);
			bSort = (nOrder !== false) && (nNext !== false) && (nOrder > nNext);
		}

		if (bSort)
		{
			objOSB.disconnectObserver(objOSB.ndStatusBar);

			var ndInserted;
			for (nIndex = 0; nIndex < aItemList.length; ++nIndex)
			{
				ndOrderItem = document.getElementById(aItemList[nIndex].split(':')[0]);
				if (!ndOrderItem || !ndOrderItem.parentNode || !(ndOrderItem.parentNode == objOSB.ndStatusBar)) continue;

				objOSB.disconnectObserver(ndOrderItem);
				ndInserted = objOSB.ndStatusBar.appendChild(objOSB.ndStatusBar.removeChild(ndOrderItem));
				objOSB.connectObserver(ndOrderItem);
			}

			objOSB.connectObserver(objOSB.ndStatusBar);
		}

		return true;
	},

	//TODO AlexancarlProject: Start MutationObserver. Remove ModifiedAttribute and ModifiedStatusBar because "DOMAttr Modified", "DOMNode Inserted", "DOMNode Removed" are deprecated

	createObserver: function()
	{
		// create an observer instance
		return new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if(mutation.type == 'attributes'){
					if (!mutation.target.parentNode) {return true};
					if (mutation.target.parentNode.id != 'status-bar') {return true};

					var aPref = objOSB.prefService.getCharPref('StatusBar').split(',');

					objOSB.disconnectObserver(mutation.target);
					if ((objOSB.InArray(mutation.target.id + ':0', aPref) !== false) && (mutation.attributeName == 'collapsed') && (!mutation.target.getAttribute(mutation.attributeName) || (mutation.target.getAttribute(mutation.attributeName) == 'false'))) mutation.target.setAttribute('collapsed', true);
					objOSB.connectObserver(mutation.target);

					return true;
				} else if(mutation.type == 'childList'){
					if (!mutation.target.parentNode) return true;
					if (mutation.target.parentNode.id != 'status-bar') return true;

					objOSB.Init();
					if ((objOSB.InArray(mutation.target.id, objOSB.aDefaultItemList) !== false)) objOSB.Organize(null);

					return true;
				} else {
					return true;
				}
			});
		});
	},

	connectObserver: function(target)
	{
		objOSB.disconnectObserver(target);

		var obsr = objOSB.createObserver();
		// configuration of the observer:
		var config = { attributes: true, childList: true, characterData: true };
		// pass in the target node, as well as the observer options
		obsr.observe(target, config);
		//
		target.observer = obsr;
	},

	disconnectObserver: function(target)
	{
		if (typeof(target.observer) != 'undefined' && target.observer != null)
		{
			// later, you can stop observing
			target.observer.disconnect();
			target.observer = null;
		}
	},

	//TODO AlexancarlProject: End Use MutationObserver

	Options: function()
	{
		window.openDialog('chrome://osbrev/content/osbOptions.xul', 'osb-options-dialog', 'centerscreen,chrome,modal');

		return true;
	}
};

window.addEventListener('load', objOSB.InitServices, false);
