/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Old Default Image Style.
 *
 * The Initial Developer of the Original Code is
 *   Dagger <dagger.bugzilla+olddefaultimagestyle@gmail.com>.
 * Portions created by the Initial Developer are Copyright (C) 2011-2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   The Mozilla Foundation
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, manager: Cm, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const PREF_PAGEBACKGROUND = "extensions.olddefaultimagestyle.backgroundColor";
const PREF_IMGBACKGROUND  = "extensions.olddefaultimagestyle.imageBackgroundColor";
const PREF_TEXT           = "extensions.olddefaultimagestyle.textColor";
const PREF_CENTER         = "extensions.olddefaultimagestyle.centerImage";
const PREF_NOMARGIN       = "extensions.olddefaultimagestyle.noMargin";
const PREF_REMOVEDEFAULT  = "extensions.olddefaultimagestyle.removeDefaultStylesheet";
const PREF_CHECKERBOARD_F = "extensions.olddefaultimagestyle.checkerboard";
const PREF_CHECKERBOARD   = "extensions.olddefaultimagestyle.checkerboardCSS";
const PREF_CHECKERCOLOR   = "extensions.olddefaultimagestyle.checkerboardCSSColor";
const PREF_CHECKERSIZE    = "extensions.olddefaultimagestyle.checkerboardCSSSize";
const PREF_HOVERBORDER    = "extensions.olddefaultimagestyle.hoverBorder";
const PREF_PREFVERSION    = "extensions.olddefaultimagestyle.PrefsVersion";

const CHECKERBOARD = "data:image/gif;base64,R0lGODlhCgAKAIABAN3d3f///yH5BAEKAAEALAAAAAAKAAoAAAIRjA2Zhwoc3GMSykqd1VltzxQAOw==";
const DEBUG = 0;

var ss = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsIWebProgressListener,
                                         Ci.nsISupportsWeakReference,
                                         Ci.nsISupports]),

  prefs: [PREF_PAGEBACKGROUND, PREF_TEXT, PREF_CENTER, PREF_NOMARGIN, PREF_REMOVEDEFAULT,
          PREF_CHECKERBOARD_F, PREF_CHECKERBOARD, PREF_CHECKERCOLOR, PREF_CHECKERSIZE,
          PREF_HOVERBORDER, PREF_IMGBACKGROUND],
  href: "",
  revision: 1,

  updateSheet: function() {
    function getColorFromPref(pref) {
      var bgColor = Preferences.get(pref, false);
      if (bgColor) {
        bgColor = bgColor.replace(/^ */, "").replace(/ *$/, "");
        if (bgColor.match(/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i))
          bgColor = "#" + bgColor;

        bgColor = bgColor.replace(/((^| ))(checker|chequer)board(( |$))/i, "$1url(" + CHECKERBOARD + ")$2");
      }
      return bgColor;
    }

    var color, sheet = "@media not print {\n";
    if (Preferences.get(PREF_CENTER, false)) {
      sheet += "  img { \n" +
        "    text-align: center;\n" +
        "    position: absolute;\n" +
        "    margin: auto;\n" +
        "    top: 0;\n" +
        "    right: 0;\n" +
        "    bottom: 0;\n" +
        "    left: 0;\n" +
        "  }\n";
    }
    if (color = Preferences.get(PREF_TEXT, false))
      sheet += "  img { color: " + color + "; }\n";
    if (color = getColorFromPref(PREF_IMGBACKGROUND))
      sheet += "  img.decoded { background: " + color + "; }\n";
      sheet += " img.overflowingVertical { margin-top: 0; }";
    if (color = getColorFromPref(PREF_PAGEBACKGROUND))
      sheet += "  body { background: " + color + "; }\n";
    if (Preferences.get(PREF_NOMARGIN, false))
      sheet += "  body { margin: 0; }\n";
    if (Preferences.get(PREF_CHECKERBOARD, false)) {
      let checkerColor = Preferences.get(PREF_CHECKERCOLOR, "#ddd");
      let tileSize     = Preferences.get(PREF_CHECKERSIZE, "5px");
      if (tileSize.match(/^\d+$/)) tileSize += "px";
      sheet += "  body {\n" +
        "    background-image:\n" +
        "      -moz-linear-gradient(45deg, "+checkerColor+" 25%, transparent 25%),\n" +
        "      -moz-linear-gradient(-45deg, "+checkerColor+" 25%, transparent 25%),\n" +
        "      -moz-linear-gradient(45deg, transparent 75%, "+checkerColor+" 75%),\n" +
        "      -moz-linear-gradient(-45deg, transparent 75%, "+checkerColor+" 75%);\n" +
        "    background-size: -moz-calc(2*"+tileSize+") -moz-calc(2*"+tileSize+");\n" +
        "    background-position: 0 0, "+tileSize+" 0, "+tileSize+
          " -"+tileSize+", 0 "+tileSize+";\n" +
        "  }\n";
    } else if (Preferences.get(PREF_CHECKERBOARD_F, false)) {
      sheet += "  body {\n" +
        "    background-image: url(" + CHECKERBOARD + ");\n" +
        "    background-repeat: repeat;\n" +
        "  }\n";
    }
    if (Preferences.get(PREF_HOVERBORDER, false)) {
      sheet += "  img { border: 1px solid transparent; }\n";
      sheet += "  img:hover { border: 1px dotted #c0c0c0; background: rgba(0, 0, 0, 0.05); }\n";
    }
    sheet += "}\n\n";
    sheet += "@media print { img { display: block; } }\n";
    this.href = "data:text/css;charset=utf-8," + escape(sheet);
    this.revision += 1;
  },

  defaultSheetURLs: ["resource://gre/res/TopLevelImageDocument.css",
                     "chrome://global/skin/media/TopLevelImageDocument.css",
                     "chrome://global/skin/TopLevelImageDocument.css"],

  getSheetByURL: function(doc, href) {
    var linknodes = doc.head.getElementsByTagName('link');
    for (let node of linknodes)
      if (node.href == href) return node;

    return false;
  },

  removeDefaultSheets: function(doc) {
    var nodes = doc.getElementsByTagName('link');
    for (var i = nodes.length - 1; i >= 0; i--)
      if (this.defaultSheetURLs.indexOf(nodes[i].getAttribute("href")) != -1)
        nodes[i].parentNode.removeChild(nodes[i]);
  },

  addDefaultSheets: function(doc) {
    function addSheet(href) {
      var link = doc.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", href);
      doc.head.insertBefore(link, doc.head.firstChild);
    }

    for (let href of this.defaultSheetURLs)
      if (!this.getSheetByURL(doc, href))
        addSheet(href);
  },

  updateDocument: function(doc) {
    var oursheet = doc.getElementById("olddefaultimagestyle-stylesheet");
    if (oursheet) {
      if (oursheet.getAttribute("olddefaultimagestyle-revision") != ss.revision) {
        oursheet.setAttribute("href", ss.href);
        oursheet.setAttribute("olddefaultimagestyle-revision", ss.revision);

        /* Minor bug: if running on pre-Firefox 14, this code will add <link>s
           for at least one CSS sheet that doesn't exist. Since missing CSS
           files are silently ignored, this shouldn't be a problem. */
        if (Preferences.get(PREF_REMOVEDEFAULT, true))
          this.removeDefaultSheets(doc);
        else
          this.addDefaultSheets(doc);
      }

      return;
    }

    // The rest of this function should only ever run once for each ImageDocument.
    var imgnode = doc.getElementsByTagName('img')[0];

    // Insert Javascript version of the image resizer.
    //
    // Only insert the resizer if getBrowserForContentDocument() can find it. This will
    // prevent <iframes>, frames, and the browser in the DOM Inspector from being hooked.
    //
    // (The resizer doesn't currently handle frames properly, and none of the above document
    // types will be unhooked on shutdown. This is a workaround until the resizer is fixed.)
    if (resizer.getBrowserForContentDocument(doc))
      resizer.hookDocument(doc);

    var link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("id", "olddefaultimagestyle-stylesheet");
    link.setAttribute("olddefaultimagestyle-revision", ss.revision);
    link.setAttribute("href", ss.href);
    doc.head.appendChild(link);

    if (Preferences.get(PREF_REMOVEDEFAULT, true))
      this.removeDefaultSheets(doc);

    doc.body.classList.add("olddefaultimagestyle-body");
    imgnode.classList.add("olddefaultimagestyle-img");
  },

  updateImageStyle: function() {
    this.updateSheet();

    var windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      var window = windows.getNext();
      if (window.document.readyState == "complete") {
        let {documentElement} = window.document;
        let type = documentElement.getAttribute("windowtype");
        if (type == "navigator:browser") {
          window.gBrowser.browsers.forEach(function(browser) {
            if (browser.contentDocument instanceof window.ImageDocument)
              this.updateDocument(browser.contentDocument);
          }, this);
        } else if (type == "navigator:view-source") {
          let doc = window.document.getElementById("content").contentDocument;
          if (doc && doc instanceof window.ImageDocument)
            this.updateDocument(doc);
        }
      }
    }
  },

  disableInAllTabs: function() {
    function disableTab(doc) {
      var imgnode = doc.getElementsByTagName("img")[0];

      resizer.unhookDocument(doc);

      // Remove our stylesheet and readd the default ones.
      var oursheet = doc.getElementById("olddefaultimagestyle-stylesheet");
      if (oursheet) oursheet.parentNode.removeChild(oursheet);
      ss.addDefaultSheets(doc);

      // Remove classes from body and img nodes.
      doc.body.classList.remove("olddefaultimagestyle-body");
      imgnode.classList.remove("olddefaultimagestyle-img");
    }

    var windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      var window = windows.getNext();
      if (window.document.readyState == "complete") {
        var {documentElement} = window.document;
        var type = documentElement.getAttribute("windowtype");

        if (type == "navigator:browser") {
          for (var index = window.gBrowser.browsers.length - 1; index >= 0; index--) {
            var doc = window.gBrowser.browsers[index].contentDocument;
            if (doc instanceof window.ImageDocument)
              disableTab(doc);
          }
        } else if (type == "navigator:view-source") {
          let doc = window.document.getElementById("content").contentDocument;
          if (doc && doc instanceof window.ImageDocument)
            disableTab(window.document.getElementById("content").contentDocument);
        }
      }
    }
  },

  observe: function(subject, topic, data) {
    if (topic == "content-document-global-created") {
      var doc = subject.document;
      if (doc.defaultView && doc instanceof Ci.nsIImageDocument)
        this.updateDocument(doc);
    } else if (topic == "nsPref:changed") {
      this.updateImageStyle();
    } else if (topic == "addon-options-displayed") {
      if (data == "olddefaultimagestyle@dagger2-addons.mozilla.org") {
        subject.getElementById("help-button").addEventListener("command", loadHelp);
      }
    } else if (topic == "addon-options-hidden") {
      if (data == "olddefaultimagestyle@dagger2-addons.mozilla.org") {
        subject.getElementById("help-button").removeEventListener("command", loadHelp);
      }
    }
  },

  onLocationChange: function(aProgress, aRequest, aURI) {
    var window = aProgress.DOMWindow;
    if (window.document instanceof Ci.nsIImageDocument)
      this.updateDocument(window.document);
  },

  register: function() {
    this.prefs.forEach(function(pref) Preferences.observe(pref, ss));

    Services.obs.addObserver(this, "content-document-global-created", false);
    Services.obs.addObserver(this, "addon-options-displayed", false);
  },

  unregister: function() {
    this.prefs.forEach(function(pref) Preferences.ignore(pref, ss));

    Services.obs.removeObserver(this, "content-document-global-created");
    Services.obs.removeObserver(this, "addon-options-displayed");
  },
}

function setDefaultPrefs() {
  var branch = Services.prefs.getDefaultBranch("");
  branch.setCharPref(PREF_PAGEBACKGROUND, "");
  branch.setCharPref(PREF_IMGBACKGROUND, "white");
  branch.setCharPref(PREF_TEXT, "");
  branch.setBoolPref(PREF_CENTER, false);
  branch.setBoolPref(PREF_NOMARGIN, false);
  branch.setBoolPref(PREF_REMOVEDEFAULT, true);
  branch.setBoolPref(PREF_CHECKERBOARD_F, false);
  branch.setBoolPref(PREF_CHECKERBOARD, false);
  branch.setCharPref(PREF_CHECKERCOLOR, "#ddd");
  branch.setCharPref(PREF_CHECKERSIZE, "8px");
  branch.setBoolPref(PREF_HOVERBORDER, false);
}

function migratePrefs() {
  var previousVersion = Preferences.get(PREF_PREFVERSION, 1);

  if (previousVersion == 1) {
    if (Preferences.get(PREF_CHECKERBOARD_F, false))
      Preferences.set(PREF_IMGBACKGROUND, "");
    previousVersion++;
  }

  Preferences.set(PREF_PREFVERSION, 2);
}

/**
 * Handle the extension being activated on install/enable
 */
function startup(data, reason) {
  Cu.import("chrome://olddefaultimagestyle/content/modules/util.jsm");
  Cu.import("chrome://olddefaultimagestyle/content/modules/preferences.jsm");
  Cu.import("chrome://olddefaultimagestyle/content/modules/watchwindows.jsm");
  Cu.import("chrome://olddefaultimagestyle/content/modules/resizer.jsm");
  setDefaultPrefs();
  migratePrefs();

  ss.updateImageStyle();
  ss.register();

  watchWindows(function(window) {
    window.gBrowser.addProgressListener(ss);
    unload(function() window.gBrowser.removeProgressListener(ss), window);
  });
}

/**
 * Handle the extension being deactivated on uninstall/disable
 */
function shutdown(data, reason) {
  // Clean up with unloaders when we're deactivating
  if (reason != APP_SHUTDOWN) {
    ss.unregister();
    ss.disableInAllTabs();
    unload();
    Cu.unload("chrome://olddefaultimagestyle/content/modules/resizer.jsm");
    Cu.unload("chrome://olddefaultimagestyle/content/modules/watchwindows.jsm");
    Cu.unload("chrome://olddefaultimagestyle/content/modules/preferences.jsm");
    Cu.unload("chrome://olddefaultimagestyle/content/modules/util.jsm");
  }
}

/**
 * Handle the extension being installed
 */
function install(data, reason) {}

/**
 * Handle the extension being uninstalled
 */
function uninstall(data, reason) {}

function debuglog(aMessage) {
  if (DEBUG) logmsg.apply(this, arguments);
}

function logmsg(aMessage) {
  var args = Array.slice(arguments, 0);
  if (args && typeof(aMessage) === "string")
    aMessage = aMessage.replace(/\{(\d+)\}/g, function ($0, $1) args[$1]);
  Services.console.logStringMessage("Old Default Image Style: " + aMessage);
}
