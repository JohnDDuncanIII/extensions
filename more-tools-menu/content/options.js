Components.utils.import("resource://moretools/itemsArrays.jsm");

var options = {
  getListItem: function (menuItem) {
    'use strict';

    var listItem, checkbox, checkboxLabel;

    listItem = document.createElement('richlistitem');
    listItem.setAttribute('align', 'center');

    checkbox = document.createElement('checkbox');
    checkbox.setAttribute('itemId', menuItem.id);
    if (menuItem.tagName === 'menuseparator') {
      checkboxLabel = '————————————';
    } else {
      checkboxLabel = (menuItem.label || menuItem.id);
    }
    checkbox.setAttribute('label', checkboxLabel);

    listItem.appendChild(checkbox);

    return listItem;
  },

  load: function () {
    'use strict';

    var list, a, b;

    list = document.getElementById('toolsToKeep');
    for (a = 0, b = extItemsArray.length - 1; a <= b; a += 1) {
      list.appendChild(this.getListItem(extItemsArray[a]));
    }

    list = document.getElementById('toolsToMove');
    for (a = 0, b = appItemsArray.length - 1; a <= b; a += 1) {
      list.appendChild(this.getListItem(appItemsArray[a]));
    }
  }
};
