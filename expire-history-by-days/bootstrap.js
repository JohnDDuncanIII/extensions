/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

const PREF_BRANCH = "extensions.bonardonet.expire-history-by-days.";

const DAYS_PREF = PREF_BRANCH + "days";
const DISABLE_EXPIRATION_PREF = PREF_BRANCH + "disable_expiration";
const MIRROR_PREF = PREF_BRANCH + "max_pages_mirror";

// Expire after 3 minutes of idle.
const IDLE_SECONDS = 180;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Task",
                                  "resource://gre/modules/Task.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils",
                                  "resource://gre/modules/PlacesUtils.jsm");
XPCOMUtils.defineLazyServiceGetter(this, "idle",
                                   "@mozilla.org/widget/idleservice;1",
                                   "nsIIdleService");

var observer = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic == "idle") {
      this.expire().catch(Cu.reportError);
    } else {
      let disableExpiration = false;
      try {
        disableExpiration = Services.prefs.getBoolPref(DISABLE_EXPIRATION_PREF);
      } catch (ex) {
        // Do nothing.
      }
      if (disableExpiration) {
        Services.prefs.setIntPref("places.history.expiration.max_pages", 999999);
      } else {
        Services.prefs.clearUserPref("places.history.expiration.max_pages");
      }
    }
  },

  expire: Task.async(function* () {
    let days = 0;
    try {
      days = Services.prefs.getIntPref(DAYS_PREF);
    } catch (ex) {
      // Do nothing.
    }
    if (days) {
      let endDate = new Date();
      endDate.setHours(0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);
      endDate.setDate(endDate.getDate() - days);
      if (PlacesUtils.history.removeVisitsByFilter) {
        yield PlacesUtils.history.removeVisitsByFilter({ endDate });
      } else {
        PlacesUtils.history.removeVisitsByTimeframe(0, (endDate.getTime() * 1000));
      }
    }
  }),

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIObserver
  ]),
};

function startup() {
  idle.addIdleObserver(observer, IDLE_SECONDS);
  Services.prefs.addObserver(DISABLE_EXPIRATION_PREF, observer, false);
}

function shutdown() {
  idle.removeIdleObserver(observer, IDLE_SECONDS);
  Services.prefs.removeObserver(DISABLE_EXPIRATION_PREF, observer);
}

function install({}, reason) {
  if (reason == ADDON_INSTALL) {
    try {
      let max_pages =
        Services.prefs.getIntPref("places.history.expiration.max_pages");
      Services.prefs.setIntPref(MIRROR_PREF, max_pages);
    } catch (ex) {
      // Do nothing.
    }
    Services.prefs.setBoolPref(DISABLE_EXPIRATION_PREF, false);
  }
}

function uninstall({}, reason)
{
  if (reason == ADDON_UNINSTALL) {
    Services.prefs.clearUserPref(DISABLE_EXPIRATION_PREF);
    Services.prefs.clearUserPref(DAYS_PREF);
    try {
      let max_pages = Services.prefs.getIntPref(MIRROR_PREF);
      Services.prefs.setIntPref("places.history.expiration.max_pages", max_pages);
      Services.prefs.clearUserPref(MIRROR_PREF);
    } catch (ex) {
      Services.prefs.clearUserPref("places.history.expiration.max_pages");
    }
  }
}
