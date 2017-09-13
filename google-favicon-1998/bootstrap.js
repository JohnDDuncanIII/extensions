Components.utils.import("resource://gre/modules/Services.jsm");
const Ci=Components.interfaces;
var _gico='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAsTAAALEwEAmpwYAAACg0lEQVQoz43S62vNYQDA8eeF8kIu2Q42W5uxYbmN3Ce3uWYRGZlcU0rxgleSKJSovVCKFyjeEHHizIhELjmzsUNn1tzWYdvZnLNz+Z3n9/wuz/P1wmvl2+dP+IrBe3vrGteubpy//s7m2vsrljdt2Hx/fm1waW1oY3WoZkPTolWP1q57sHDqwyXVoZrqUI2YXv9Zuv2Al7MNsX6MBz8lXd9/ZyCVUo4GCa4i7bybViYC26UCBUloz3D8Snzb/rsTFgQLZ74eNCdYtavp0O2BZ99SFllUd2uFEIG97w0qgXyeY+WRcN6sx1/7iYMPvfC2naJ55yfPOJJMQpa2EYNF6fawIaZg3+nP42df6nMwxFwzgK+VBp+WL9lw5JNNFicbmTRcFO/vyXmcvPR99MILHzscGxTdKWxFl00aG88FnxxpTbylUohxW3ttOHQ5XjQvRA5812DhmhSkAcvywGDZJHD95vxhYuKmaBJddvBR0bagJo5WuGCDDz7kXKPxkRZ9ON7XMSNF/u6uBFTUNxetuYdySUmDlfE1NgaFdj0MGk0c1REtnS7G7mjLwrKDnaLsovIstLbTABb0Il92xsJ9TqSH8MeMJv5mvBBluzpy9B+9ERXlT481vEkiHcDDIF+0mqq5wUDlrfJZjWcaPvjajkwoECV1NtCjKJ32avjIq0/asfEMYCXwcTw+/CJQcuL6zRZDrDW/QBTs7DRYHj9+dPuTKs4NGXXjbENHj4NPdoBsAu5GXJFXd6vxhSEWLRkqAgciAyA1UvNL6i2HnxSWN+RNuZZX9WrU4mfDKpuLlz3Yc+rmTymBtpJiMbc+SgZDjH8kXY0PCqTsLC8Uf6f9T18KxR9B9jJLyV6YOQAAAABJRU5ErkJggg==';
function onPageLoad(event){
	var doc=event.target;
	if(doc.domain&&doc.domain.indexOf('google.')!==-1&&(doc.domain.indexOf('google.')===0||doc.domain.indexOf('www.google.')===0)){
		var link=doc.getElementsByTagName('link');
		for(var i=0; i<link.length; i++){
			if(link[i].rel==='icon'||link[i].rel==='shortcut icon'){
				link[i].setAttribute('type','image/png');
				link[i].setAttribute('href',_gico);
				link[i].parentNode.replaceChild(link[i].cloneNode(true),link[i]);
				return;
			}
		}
		(link=doc.createElement('link')).setAttribute('rel','icon');
		link.setAttribute('type','image/png');
		link.setAttribute('href',_gico);
		doc.getElementsByTagName('head')[0].appendChild(link);
	}
}
var windowListener={
	onOpenWindow:function(win){
		var domWin=win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal||Ci.nsIDOMWindow);
		domWin.addEventListener('load',function(){
			domWin.removeEventListener('load',arguments.callee,false);
			var app=domWin.document.getElementById('appcontent');
			if(app) app.addEventListener('DOMContentLoaded',onPageLoad,true);
		},false);
	},
	onCloseWindow:function(win){},
	onWindowTitleChange:function(win,title){}
};
function startup(data,reason){
	var win,browser=Services.wm.getEnumerator('navigator:browser');
	while(browser.hasMoreElements()){
		win=browser.getNext().QueryInterface(Ci.nsIDOMWindow);
		if(win=win.document.getElementById('appcontent')) win.addEventListener('DOMContentLoaded',onPageLoad,true);
	}
	Services.wm.addListener(windowListener);
}
function shutdown(data,reason){
	Services.wm.removeListener(windowListener);
	var win,browser=Services.wm.getEnumerator('navigator:browser');
	while(browser.hasMoreElements()){
		win=browser.getNext().QueryInterface(Ci.nsIDOMWindow);
		if(win=win.document.getElementById('appcontent')) win.removeEventListener('DOMContentLoaded',onPageLoad,true);
	}
	_gico=null;
}
function install(data,reason){}
function uninstall(data,reason){}
