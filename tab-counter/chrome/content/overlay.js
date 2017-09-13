/* counting */
var tabcc=
{
    count: function()
    {
	document.getElementById('grtabcount').value=gBrowser.browsers.length;
    },
    decrease: function()
    {
	document.getElementById('grtabcount').value=parseInt(document.getElementById('grtabcount').value)-1;
    },
    increase: function()
    {
	document.getElementById('grtabcount').value=parseInt(document.getElementById('grtabcount').value)+1;
    }, 
    wload: function()
    {
	tabcc.count();
	gBrowser.tabContainer.addEventListener("TabOpen",tabcc.increase, false);
	gBrowser.tabContainer.addEventListener("TabClose",tabcc.decrease, false);
    }
};
window.addEventListener("load",tabcc.wload,false);

/* preferences */
if(!tabcountprefsjs)
    {
	var tabcountprefsjs={};
    }
tabcountprefsjs = {
    register: function()
    {
	this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabcounter.");
	this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
	this.prefs.addObserver("", this, false);
    },
    unregister: function()
    {
	if(!this.prefs)
	    {
		return;
	    }
	this.prefs.removeObserver("", this);
    },
    observe: function(aSubject, aTopic, aData)
    {
	aSubject.QueryInterface(Components.interfaces.nsIPrefBranch);
	if(aTopic != "nsPref:changed")
	    {return;}
	switch (aData) 
	    {
	    case "statusbarimage":
	     this.aValue=aSubject.getBoolPref("statusbarimage");
	     if(this.aValue==false)
		 {
		     document.getElementById("tabcounterstatusbarimage").style.display='none';
		 }
	     if(this.aValue==true)
		 {
		     document.getElementById("tabcounterstatusbarimage").style.display='inline';
		     
		 }
	    }
    },
    load: function() // intiate preferences realization at Firefox start //
    {
	var prefService = Components.classes["@mozilla.org/preferences-service;1"]
	.getService(Components.interfaces.nsIPrefService);
	var prefs = prefService.getBranch("extensions.tabcounter.");
	prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
	//now we tell the observer that the prefs are changed, though they aren't, 
	//and it implements them :)
	tabcountprefsjs.observe(prefs,"nsPref:changed","statusbarimage");
    }
    
}
window.addEventListener("load", function(e) {tabcountprefsjs.register();tabcountprefsjs.load();}, false);
