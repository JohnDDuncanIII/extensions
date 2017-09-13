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
 * Portions created by the Initial Developer are Copyright (C) 2012-2013
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
Cu.import("chrome://olddefaultimagestyle/content/modules/preferences.jsm");

var EXPORTED_SYMBOLS = ["resizer"];
var DEBUG = 0;

var stringBundle = Services.strings.createBundle("chrome://global/locale/layout/MediaDocument.properties");

var strings = {
  "ImageTitleWithDimensionsAndFile": "ImageTitleWithDimensions2AndFile",
  "ImageTitleWithDimensions": "ImageTitleWithDimensions2",
};

// Bug 677912 (mozilla26) renamed these strings.
try {
  stringBundle.GetStringFromName(strings["ImageTitleWithDimensionsAndFile"]);
} catch(e) {
  strings["ImageTitleWithDimensionsAndFile"] = "ImageTitleWithDimensionsAndFile";
  strings["ImageTitleWithDimensions"] = "ImageTitleWithDimensions";
}

var resizer = {
  browsers: new WeakMap(),
  mutationObservers: new WeakMap(),
  shouldClickCache: new WeakMap(),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDOMEventListener,
                                         Ci.nsISupportsWeakReference,
                                         Ci.nsISupports]),

  resizeImg: function(img) {
    var doc = img.ownerDocument;
    var win = doc.defaultView;
    var bodyStyle = win.getComputedStyle(img.ownerDocument.body);
    var imgStyle = win.getComputedStyle(img);

    var originalWidth = this.getOriginalWidth(img);
    var originalHeight = this.getOriginalHeight(img);
    var zoom = this.getZoomForContentDocument(doc);

    if (!originalWidth || !originalHeight || !zoom) return;

    var availableWidth = win.innerWidth -
                  parseInt(bodyStyle.getPropertyValue("margin-left"))      -
                  parseInt(bodyStyle.getPropertyValue("margin-right"))     -
                  parseInt(bodyStyle.getPropertyValue("padding-left"))     -
                  parseInt(bodyStyle.getPropertyValue("padding-right"))    -
                  parseInt(imgStyle.getPropertyValue("border-left-width")) -
                  parseInt(imgStyle.getPropertyValue("border-right-width"));
    var availableHeight = win.innerHeight -
                  parseInt(bodyStyle.getPropertyValue("margin-top"))       -
                  parseInt(bodyStyle.getPropertyValue("margin-bottom"))    -
                  parseInt(bodyStyle.getPropertyValue("padding-top"))      -
                  parseInt(bodyStyle.getPropertyValue("padding-bottom"))   -
                  parseInt(imgStyle.getPropertyValue("border-top-width"))  -
                  parseInt(imgStyle.getPropertyValue("border-bottom-width"));

    availableWidth *= zoom;
    availableHeight *= zoom;

    debuglog("Resizing image. Original image dimensions: {1} x {2}, available space is {3} x {4}",
      originalWidth, originalHeight, availableWidth, availableHeight);

    var currentState = img.getAttribute("ODIS_state");
    if (originalWidth <= availableWidth && originalHeight <= availableHeight) {
      newWidth = "";
      newHeight = "";
      newCursor = "";
    } else {
      if (currentState == "zoomed-in") {
        newWidth = originalWidth + "px";
        newHeight = originalHeight + "px";
        newCursor = "-moz-zoom-out";
      } else {
        // Need to calculate the exact width/height to display, or the
        // high-quality image downscaling algorithm gets it wrong.
        var aspectRatio = originalWidth/originalHeight;

        if (Math.ceil(availableWidth/aspectRatio) > availableHeight) {
          // Height-bound
          newWidth = Math.ceil(availableHeight * aspectRatio) + "px";
          newHeight = availableHeight + "px";
        } else {
          // Width-bound.
          newWidth = availableWidth + "px";
          newHeight = Math.ceil(availableWidth / aspectRatio) + "px";
        }
        newCursor = "-moz-zoom-in";
      }
    }

    if (img.style.width != newWidth)
      img.style.width = newWidth;
    if (img.style.height != newHeight)
      img.style.height = newHeight;
    if (img.style.cursor != newCursor)
      img.style.cursor = newCursor;

    if ((xc = img.getAttribute("ODIS_clicked_x")) &&
        (yc = img.getAttribute("ODIS_clicked_y"))) {

      let sx = (xc * this.getOriginalWidth(img)) - (win.innerWidth/2);
      let sy = (yc * this.getOriginalHeight(img)) - (win.innerHeight/2);

      img.removeAttribute("ODIS_clicked_x");
      img.removeAttribute("ODIS_clicked_y");
      win.scrollTo(sx, sy);
    }

    this.fixupTitle(doc);
    debuglog("Image resized to {1} x {2} -- (actual style properties: {3}, {4})",
      newWidth, newHeight, img.style.width, img.style.height);
  },

  resizeDoc: function(doc) {
    this.resizeImg(doc.getElementsByTagName('img')[0]);
  },

  fixupTitle: function(doc) {
    /* Fetch image's actual width/height. */
    var img = doc.getElementsByTagName('img')[0];
    if (!this.getOriginalWidth(img) || !this.getOriginalHeight(img)) return;

    /* Fetch image's filename. */
    try {
      var url = this.getBrowserForContentDocument(doc).currentURI.QueryInterface(Ci.nsIURL);
      if (url.fileName) {
        const textToSubURI = Cc["@mozilla.org/intl/texttosuburi;1"].getService(Ci.nsITextToSubURI);
        var filename = textToSubURI.unEscapeURIForUI(doc.characterSet, url.fileName);
      }
    } catch(e) { return; }

    /* Fetch the image type */
    try {
      var mime = doc.contentType;
      var type = mime.toUpperCase().replace(/^(IMAGE\/|IMAGE\/X-)/, "");
    } catch(e) { return; }

    if (img.width != this.getOriginalWidth(img)) {
      var ratio = Math.floor(100 * img.width / this.getOriginalWidth(img));
      var status = stringBundle.formatStringFromName("ScaledImage", [ratio], 1)
    }

    if (url.fileName) {
      var title = stringBundle.formatStringFromName(strings["ImageTitleWithDimensionsAndFile"],
        [filename, type, this.getOriginalWidth(img), this.getOriginalHeight(img)], 4);
    } else {
      var title = stringBundle.formatStringFromName(strings["ImageTitleWithDimensions"],
        [type, this.getOriginalWidth(img), this.getOriginalHeight(img)], 3);
    }

    if (status) {
      var newTitle = stringBundle.formatStringFromName("TitleWithStatus", [title, status], 2);
    } else {
      var newTitle = title;
    }

    // The rules for getting document.title are a bit inconsistent with everything else:
    //   http://www.w3.org/html/wg/drafts/html/master/dom.html#document.title
    // If we don't make sure to apply these rules to newTitle, then newTitle won't match doc.title
    // even if newTitle is exactly the same string as it was the last time doc.title was assigned.
    // Which will retrigger the mutation observer and thus cause an infinite loop...
    newTitle = newTitle.replace(/[ \t\n\f\r]+/g, " ")
                       .replace(/^[ \t\n\f\r]+/g, "")
                       .replace(/[ \t\n\f\r]+$/g, "");

    debuglog("New document title: {1} [as result of image dimensions {2} x {3} and styles {4} x {5}]",
      newTitle, img.width, img.height, img.style.width, img.style.height);

    if (doc.title != newTitle) doc.title = newTitle;
  },

  handleEvent: function(e) {
    if (e.type == "resize") {
      this.resizeDoc(e.originalTarget.document);
    } else if (e.type == "click") {
      var img = e.originalTarget;
      var doc = img.ownerDocument;

      if (!this.shouldClickCache.get(doc, true)) return;
      if (img.style.cursor == "") return;

      var browser = resizer.getBrowserForContentDocument(doc);
      if (browser) browser.markupDocumentViewer.fullZoom = 1;

      if (img.getAttribute("ODIS_state") == "zoomed-out") {
        img.setAttribute("ODIS_state", "zoomed-in");
        img.setAttribute("ODIS_clicked_x", (e.pageX - img.offsetLeft) / img.width);
        img.setAttribute("ODIS_clicked_y", (e.pageY - img.offsetTop) / img.height);
      }
      else {
        img.setAttribute("ODIS_state", "zoomed-out");
      }
    } else if (e.type == "keypress") {
      var doc = e.originalTarget.ownerDocument;
      var img = doc.getElementsByTagName('img')[0];
      var browser = this.getBrowserForContentDocument(doc);
      if (browser) var viewer = browser.markupDocumentViewer;

      if (img.style.cursor == "") return;
      if (e.altKey || e.ctrlKey) return;

      if (e.charCode == "+".charCodeAt(0) || e.charCode == "=".charCodeAt(0)) {
        if (viewer) viewer.fullZoom = 1;
        img.setAttribute("ODIS_state", "zoomed-in");
      } else if (e.charCode == "-".charCodeAt(0) || e.charCode == "_".charCodeAt(0)) {
        if (viewer) viewer.fullZoom = 1;
        img.setAttribute("ODIS_state", "zoomed-out");
      }
    } else if (e.type == "load") {
      // A stylesheet finished loading, so we might need to resize the image.
      this.resizeDoc(e.originalTarget.ownerDocument);
    }
  },

  getOriginalWidth: function(img) {
    try { return img.ownerDocument.imageRequest.image.width; }
    catch(e) { return null; }
  },

  getOriginalHeight: function(img) {
    try { return img.ownerDocument.imageRequest.image.height; }
    catch(e) { return null; }
  },

  getBrowserForContentDocument: function(doc) {
    if (this.browsers.has(doc))
      return this.browsers.get(doc);
    else {
      var windows = Services.wm.getEnumerator(null);
      while (windows.hasMoreElements()) {
        var window = windows.getNext();
        if (window.document.readyState == "complete") {
          let {documentElement} = window.document;
          let type = documentElement.getAttribute("windowtype");
          if (type == "navigator:browser") {
            let browser = window.gBrowser.getBrowserForDocument(doc);
            if (browser) {
              this.browsers.set(doc, browser);
              return browser;
            }
          } else if (type == "navigator:view-source") {
            let browser = window.document.getElementById("content");
            if (browser && browser.contentWindow == doc.defaultView) {
              this.browsers.set(doc, browser);
              return browser;
            }
          }
        }
      }
    }
  },

  getZoomForContentDocument: function(doc) {
    var browser = this.getBrowserForContentDocument(doc);
    if (browser)
      return browser.markupDocumentViewer.fullZoom;

    return 1;
  },

  hookDocument: function(doc) {
    var win = doc.defaultView;
    var img = doc.getElementsByTagName('img')[0];

    // This preference is cached per-image, because that's what the built-in image
    // resizer does. Without this, the built-in resizer runs, and sets the document
    // scroll position (and width/height, but those properties are removed by the MO).
    this.shouldClickCache.set(doc, Preferences.get("browser.enable_click_image_resizing", true));

    img.addEventListener("click", resizer);
    doc.addEventListener("keypress", resizer);
    win.addEventListener("resize", resizer);

    for (let node of doc.getElementsByTagName("link"))
      node.addEventListener("load", resizer);

    var MutationObserver = win.MutationObserver;
    var MO = new MutationObserver(function(mutations, observer) {
      mutations.forEach(function(mutation) {
        if (mutation.type == "attributes") {
          var newValue = mutation.target.getAttribute(mutation.attributeName);
          debuglog("Mutation on {1}: {2} -- {3} -> {4}", mutation.target, mutation.attributeName, mutation.oldValue, newValue);
          if (mutation.attributeName == "width" && newValue) {
            mutation.target.setAttribute("odis_saved_width", newValue);
            mutation.target.removeAttribute("width");
          }
          else if (mutation.attributeName == "height" && newValue) {
            mutation.target.setAttribute("odis_saved_height", newValue);
            mutation.target.removeAttribute("height");
          }
          else if (mutation.attributeName == "odis_state")
            resizer.resizeImg(mutation.target);
          else if (mutation.attributeName == "style") {
            if (newValue == "cursor: -moz-zoom-out" ||
                newValue == "cursor: -moz-zoom-in" ||
                newValue == "")
              resizer.resizeImg(mutation.target);
          }
        } else if (mutation.type == "childList") {
          var doc = mutation.target.ownerDocument;
          var win = doc.defaultView;

          // If the title changes, resize the image. This is intended to catch any resize attempts
          // by the built-in resizer, since they'll change the page title.
          if (mutation.target instanceof win.HTMLTitleElement) {
            resizer.resizeDoc(doc);
          }

          // Catch any added or removed stylesheets.
          if (mutation.target instanceof win.HTMLHeadElement) {
            var shouldResize = false;

            // If a <link> is added, resize and add a "load" event listener to resize
            // every time the <link> loads. I can't find a way to check if a CSS sheet
            // has loaded or not, so we can't avoid the unconditional initial resize.
            for (let node of mutation.addedNodes) {
              if (node instanceof win.HTMLLinkElement) {
                node.addEventListener("load", resizer);
                shouldResize = true;
              }
            }

            // If any stylesheets are removed, we should resize.
            for (let node of mutation.removedNodes)
              if (node instanceof win.HTMLLinkElement) shouldResize = true;

            // Do the actual resize.
            if (shouldResize) resizer.resizeDoc(doc);
          }
        }
      });
    });
    MO.observe(doc.head, { childList: true, subtree: true });
    MO.observe(img, { attributes: true, attributeOldValue: true });

    this.mutationObservers.set(doc, MO);

    // Save the resized width/height of the image if available, so we can
    // (try to) restore the built-in resizer's state when we unhook.
    if (img.getAttribute("width"))
      img.setAttribute("odis_saved_width", img.getAttribute("width"));
    if (img.getAttribute("height"))
      img.setAttribute("odis_saved_height", img.getAttribute("height"));

    img.removeAttribute("width");
    img.removeAttribute("height");

    // If the built-in resizer has zoom state, copy it; otherwise, get the default
    // state from the browser.enable_automatic_image_resizing pref.
    if (img.classList.contains("overflowing") || img.classList.contains("shrinkToFit")) {
      if (img.classList.contains("overflowing"))
        img.setAttribute("ODIS_state", "zoomed-in");
      else
        img.setAttribute("ODIS_state", "zoomed-out");
    } else {
      if (Preferences.get("browser.enable_automatic_image_resizing", true))
        img.setAttribute("ODIS_state", "zoomed-out");
      else
        img.setAttribute("ODIS_state", "zoomed-in");
    }
  },

  unhookDocument: function(doc) {
    var img = doc.getElementsByTagName('img')[0];
    var win = doc.defaultView;

    // Remove mutation observer.
    if (this.mutationObservers.has(doc))
      this.mutationObservers.get(doc).disconnect();

    // Remove any load listeners on <link> elements.
    for (let node of doc.getElementsByTagName("link"))
      node.removeEventListener("load", resizer);

    // Remove other event listeners.
    img.removeEventListener("click", resizer);
    doc.removeEventListener("keypress", resizer);
    win.removeEventListener("resize", resizer);

    // Remove our resizing from the image.
    img.style.width = "";
    img.style.height = "";
    img.style.cursor = "";

    // Attempt to restore the built-in resizer's resizing.
    if (img.getAttribute("odis_state") == "zoomed-out") {
      if (img.getAttribute("odis_saved_width"))
        img.setAttribute("width", img.getAttribute("odis_saved_width"));
      if (img.getAttribute("odis_saved_height"))
        img.setAttribute("height", img.getAttribute("odis_saved_height"));
    }
    img.removeAttribute("odis_saved_width");
    img.removeAttribute("odis_saved_height");
  },
}

function debuglog(aMessage) {
  if (DEBUG) logmsg.apply(this, arguments);
}

function logmsg(aMessage) {
  var args = Array.slice(arguments, 0);
  if (args && typeof(aMessage) === "string")
    aMessage = aMessage.replace(/\{(\d+)\}/g, function ($0, $1) args[$1]);
  Services.console.logStringMessage("Old Default Image Style (resizer.jsm): " + aMessage);
}
