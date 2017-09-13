Components.utils.import("resource://moretools/itemsArrays.jsm");

(function () {
  'use strict';

  var toolsMenuPopup,
    moreToolsMenuPopup,
    prefs = {
      showWhenEmpty: false,
      sortItems: false,
      toolsToKeep: '',
      toolsToMove: ''
    },
    itemsToKeep,
    nativeTools = 'activityManager|addonsManager|addonsmgr|addressBook|'
      + 'applyFilters|applyFiltersToSelection|browserToolsSeparator|'
      + 'cmd_switchprofile|deleteJunk|devToolsSeparator|downloadmgr|filtersCmd|'
      + 'image|javascriptConsole|menu_accountmgr|menu_cookieManager|'
      + 'menu_Filters|menu_imageManager|menu_import|menu_openAddons|'
      + 'menu_openDownloads|menu_openSavedFilesWnd|menu_pageInfo|'
      + 'menu_passwordManager|menu_popupManager|menu_preferences|menu_search|'
      + 'menu_search_addresses|menu_SearchAddresses|menu_SearchMail|'
      + 'menu_searchWeb|menu_translate|menu_validate|navBeginGlobalItems|popup|'
      + 'prefSep|privateBrowsingItem|runJunkControls|sanitizeItem|'
      + 'sanitizeSeparator|sep_switchprofile|sep_validate|sync-setup|'
      + 'sync-syncnowitem|tasksDataman|tasksMenuAddressBook|'
      + 'tasksMenuAfterAddressesSeparator|tasksMenuAfterApplySeparator|'
      + 'tasksMenuAfterDeleteSeparator|tasksMenuMail|webDeveloperMenu';

  String.prototype.trimPipes = function () {
    return this.replace(/\|{2,}/g, '|').replace(/^\||\|$/g, '');
  };

  function updateItemsToKeep() {
    var pattern;

    // Keep the native items.
    pattern = nativeTools;

    // Move the native items selected by the user.
    if (prefs.toolsToMove) {
      pattern = pattern.replace(new RegExp(
        '\\b' + prefs.toolsToMove.replace(/\|/g, '\\b|\\b') + '\\b',
        'g'
      ), '').trimPipes();
    }

    // Keep the extension items selected by the user.
    if (prefs.toolsToKeep) {
      pattern += '|' + prefs.toolsToKeep;
    }

    // Keep the items that doesn't have an id.
    pattern += '|';

    itemsToKeep = new RegExp('^(' + pattern + ')$');
  }

  function getMenu(node, type) {
    var doc, xpath;

    function nsResolver() {
      return 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
    }

    doc = node.ownerDocument || node;
    if (type === 'tools') {
      xpath = '//xul:menupopup[@id="menu_ToolsPopup" or @id="taskPopup"]/*';
    } else if (type === 'moreTools') {
      xpath = '//xul:menupopup[@id="more-tools-menupopup"]/*';
    }
    return doc.evaluate(
      xpath,
      doc,
      nsResolver,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
  }

  function isMoreToolsEmpty() {
    //var menu, a, b, item, allItemsHidden;

    if (moreToolsMenuPopup.childNodes.length === 2) {
      return true;
    }

    //allItemsHidden = true;
    //menu = getMenu(document, 'moreTools');
    //for (a = 0, b = menu.snapshotLength - 1; a <= b; a += 1) {
    //  item = menu.snapshotItem(a);
    //  if (item) {
    //    if (!(item.hasAttribute('hidden') && item.getAttribute('hidden'))) {
    //      allItemsHidden = false;
    //    }
    //  }
    //}
    //if (allItemsHidden) {
    //  return true;
    //}

    return false;
  }

  function toggleMoreTools() {
    if (isMoreToolsEmpty()) {
      document.getElementById('more-tools-label').setAttribute('hidden', false);
      document.getElementById('more-tools-sep').setAttribute('hidden', false);
    } else {
      document.getElementById('more-tools-label').setAttribute('hidden', true);
      document.getElementById('more-tools-sep').setAttribute('hidden', true);
    }

    if (isMoreToolsEmpty() && !prefs.showWhenEmpty) {
      document.getElementById('more-tools-menu').setAttribute('hidden', true);
    } else {
      document.getElementById('more-tools-menu').setAttribute('hidden', false);
    }
  }

  function sortMoreTools() {
    var sortService;

    sortService = Components.classes['@mozilla.org/xul/xul-sort-service;1']
      .getService(Components.interfaces.nsIXULSortService);
    if (prefs.sortItems && !isMoreToolsEmpty()) {
      sortService.sort(moreToolsMenuPopup, 'label', 'ascending');
    } else {
      sortService.sort(moreToolsMenuPopup, 'defaultOrder', 'integer');
    }
  }

  function toggleSeparators(menu) {
    var a, b, item, prevItem, nextItem;

    for (a = 0, b = menu.snapshotLength - 1; a <= b; a += 1) {
      item = menu.snapshotItem(a);
      if (item.tagName === 'menuseparator' && item.id) {
        prevItem = item.previousSibling;
        nextItem = item.nextSibling;
        if (prevItem && prevItem.tagName !== 'menuseparator' &&
            nextItem && nextItem.tagName !== 'menuseparator') {
          document.getElementById(item.id).setAttribute('hidden', false);
        } else {
          document.getElementById(item.id).setAttribute('hidden', true);
        }
      }
    }
  }

  function moveTools() {
    var a, b, menu, item, nextItem;

    // Move items to More Tools menu.
    menu = getMenu(document, 'tools');
    for (a = 0, b = menu.snapshotLength - 1; a <= b; a += 1) {
      item = menu.snapshotItem(a);
      if (!item.hasAttribute('defaultOrder')) {
        item.setAttribute('defaultOrder', a);
      }
      if (!itemsToKeep.test(item.id)) {
        nextItem = item.nextSibling;
        if (nextItem) {
          item.setAttribute('nextItemID', nextItem.id);
        }
        moreToolsMenuPopup.appendChild(item);
      }
    }

    // Move items back to Tools menu.
    menu = getMenu(document, 'moreTools');
    for (a = menu.snapshotLength - 1, b = 0; a >= b; a -= 1) {
      item = menu.snapshotItem(a);
      if (itemsToKeep.test(item.id)) {
        if (item.hasAttribute('nextItemID')) {
          nextItem = document.getElementById(item.getAttribute('nextItemID'));
        } else {
          nextItem = null;
        }
        if (nextItem) {
          toolsMenuPopup.insertBefore(item, nextItem);
        } else {
          toolsMenuPopup.appendChild(item);
        }
      }
    }
    toggleSeparators(getMenu(document, 'tools'));

    // Finish More Tools menu.
    sortMoreTools();
    toggleSeparators(getMenu(document, 'moreTools'));
    toggleMoreTools();
  }

  function dumpTools() {
    var i, l, menu, message1, message2;

    message1 = 'Items found in Tools menu at startup:\n';
    message2 = '\n\ntoolsToMove: ';
    menu = getMenu(document, 'tools');
    for (i = 0, l = menu.snapshotLength; i < l; i += 1) {
      message1 += '\t' + menu.snapshotItem(i).id
        + '\t' + menu.snapshotItem(i).label + '\n';
      message2 += menu.snapshotItem(i).id + ', ';
    }
    Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService)
      .logStringMessage(message1 + message2);
  }

  function makePattern(s) {
    return s.replace(/(\-)/g, '\\$1').replace(/\s*[,|]\s*/g, '|').trimPipes();
  }

  function loadPrefs() {
    var prefBranch;

    prefBranch = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefService)
      .getBranch('extensions.moretools.');
    prefs.showWhenEmpty = prefBranch.getBoolPref('showWhenEmpty');
    prefs.sortItems = prefBranch.getBoolPref('sortItems');
    prefs.toolsToMove = makePattern(prefBranch.getCharPref('toolsToMove'));
    prefs.toolsToKeep = makePattern(prefBranch.getCharPref('toolsToKeep'));
  }

  function observePrefs() {
    var prefBranch;

    prefBranch = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefBranch);
    prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    prefBranch.addObserver('extensions.moretools.', {
      observe: function (aSubject, aTopic, aData) {
        if (aTopic === 'nsPref:changed') {
          loadPrefs();
          switch (aData) {
          case 'extensions.moretools.showWhenEmpty':
            toggleMoreTools();
            break;
          case 'extensions.moretools.sortItems':
            sortMoreTools();
            toggleSeparators(getMenu(document, 'moreTools'));
            toggleMoreTools();
            break;
          case 'extensions.moretools.toolsToMove':
          case 'extensions.moretools.toolsToKeep':
            updateItemsToKeep();
            moveTools();
            break;
          }
        }
      }
    }, false);
    prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch);
  }

  function updateItemsArrays() {
    var i, l, menu, item, nativeToolsRegExp;

    while (appItemsArray.length) {
      appItemsArray.pop();
    }

    while (extItemsArray.length) {
      extItemsArray.pop();
    }

    nativeToolsRegExp = new RegExp('^(' + nativeTools + ')$');
    menu = getMenu(document, 'tools');
    for (i = 0, l = menu.snapshotLength; i < l; i += 1) {
      item = menu.snapshotItem(i);
      if (nativeToolsRegExp.test(item.id)) {
        appItemsArray.push(item);
      } else {
        extItemsArray.push(item);
      }
    }
  }

  window.addEventListener('load', function () {
    // This line must be commented out to make the extension work properly.
    // return dumpTools();

    // Look up nodes now that getElementById() is safe.
    toolsMenuPopup =
      document.getElementById('menu_ToolsPopup') || // Firefox
      document.getElementById('taskPopup');         // Thunderbird, SeaMonkey
    moreToolsMenuPopup = document.getElementById('more-tools-menupopup');

    // Load user-configured options and monitor changes made to them.
    loadPrefs();
    observePrefs();

    // Update the list of items to be kept in Tools menu.
    updateItemsToKeep();

    // Update the arrays used by options window.
    updateItemsArrays();

    // Move any tools not in the list of items to keep.
    moveTools();

      // Move tools that are added later.
      //toolsMenuPopup.addEventListener('DOMNodeInserted', moveTools, true);
      new MutationObserver(function(aMutations) {
	  moveTools();
      }).observe(toolsMenuPopup,
		 {childList: true, subtree: true});
  }, true);
}());
