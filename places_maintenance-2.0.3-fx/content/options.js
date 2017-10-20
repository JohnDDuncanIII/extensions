/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Task.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils",
                                  "resource://gre/modules/PlacesUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesDBUtils",
                                  "resource://gre/modules/PlacesDBUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Sqlite",
                                  "resource://gre/modules/Sqlite.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "OS",
                                  "resource://gre/modules/osfile.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "AsyncShutdown",
                                  "resource://gre/modules/AsyncShutdown.jsm");

var gCorrupt = false;
var gReplace = false;
var gWizard;
var gNewDbPath;

var start = Task.async(function* () {
  gWizard = document.getElementById("placesMaintenanceWizard");
  gWizard.canRewind = false;
  gWizard.canAdvance = false;
  // Polyfill for Firerfox 55 on
  if ("getLegacyLog" in PlacesDBUtils) {
    let statusMap = yield PlacesDBUtils.runTasks([PlacesDBUtils.stats]);
    let result = document.getElementById("initialStats");
    result.value = PlacesDBUtils.getLegacyLog(statusMap).join("\n");
    result.setAttribute("wrap", "off");
  } else {
    yield new Promise(resolve => {
      PlacesDBUtils.runTasks([PlacesDBUtils.stats], out => {
        let result = document.getElementById("initialStats");
        result.value = out.join("\n");
        result.setAttribute("wrap", "off");
        resolve();
      });
    });
  }
  gWizard.canAdvance = true;
});

var integrity = Task.async(function* () {
  gWizard.canRewind = false;
  gWizard.canAdvance = false;
  let result = document.getElementById("integrityResult");
  let db = yield PlacesUtils.promiseDBConnection();
  let rows = yield db.execute("PRAGMA INTEGRITY_CHECK");
  if (rows[0] != "ok") {
    result.value = "Trying to reindex...";
    if ("getLegacyLog" in PlacesDBUtils) {
      yield PlacesDBUtils.runTasks([PlacesDBUtils.reindex]);
    } else {
      yield new Promise(resolve => {
        PlacesDBUtils.runTasks([PlacesDBUtils.reindex], resolve);
      });
    }
    rows = yield db.execute("PRAGMA INTEGRITY_CHECK");
  }
  if (rows[0].getResultByIndex(0) != "ok") {
    result.value = "The database is corrupt.  I will try to generate a clean one";
    gCorrupt = true;
  }
  else {
    result.value = "The database is sane.  Next I will do some clean-up.";
  }
  gWizard.canAdvance = true;
});

var cleanup = Task.async(function* () {
  if (gCorrupt) {
    gWizard.goTo("clone");
    return;
  }

  gWizard.canRewind = false;
  gWizard.canAdvance = false;
  if ("getLegacyLog" in PlacesDBUtils) {
    let statusMap = yield PlacesDBUtils.runTasks([PlacesDBUtils.expire,
                                                  PlacesDBUtils.checkCoherence,
                                                  PlacesDBUtils.vacuum]);
    let result = document.getElementById("cleanupResult");
    result.value = PlacesDBUtils.getLegacyLog(statusMap).join("\n");
    result.scrollTop = 0;
  } else {
    yield new Promise(resolve => {
      PlacesDBUtils.runTasks([PlacesDBUtils.expire,
                              PlacesDBUtils.checkCoherence,
                              PlacesDBUtils.vacuum], out => {
        let result = document.getElementById("cleanupResult");
        result.value = out.join("\n");
        result.scrollTop = 0;
        resolve();
      });
    });
  }
  gWizard.canAdvance = true;
});

var clone = Task.async(function* () {
  if (!gCorrupt) {
    gWizard.goTo("end");
    return;
  }

  gWizard.canRewind = false;
  gWizard.canAdvance = false;
  let result = document.getElementById("cloneResult");
  let db = yield PlacesUtils.promiseDBConnection();
  let rows = yield db.execute("PRAGMA user_version");
  let schemaVersion = rows[0].getResultByIndex(0);
  let {file, path} = yield OS.File.openUnique(OS.Path.join(OS.Constants.Path.tmpDir, "places.sqlite"));
  yield file.close();
  gNewDbPath = path;
  let newDb = yield Sqlite.openConnection({ path });
  try {
    // Set the proper page size.
    yield newDb.execute("PRAGMA page_size = 32768");
    // Copy the tables.
    yield newDb.executeTransaction(function* () {
      // copy only our tables.
      let tables = yield db.execute("SELECT name, sql FROM main.sqlite_master WHERE type = 'table' AND name BETWEEN 'moz_' AND 'moza'");
      tables = tables.map(t => ({ name: t.getResultByName("name"), sql: t.getResultByName("sql") }));
      for (let table of tables) {
        yield newDb.execute(table.sql);
      }
      // Now copy data.
      // Better to copy one by one?
      result.value += "\n";
      for (let table of tables) {
        result.value += "Copying " + table.name + "...";
        try {
          yield copyTable(db, newDb, table.name);
          result.value += "OK\n";
        } catch (ex) {
          result.value += "FAIL\n";
          gReplace = true;
          break;
        }
      }
      // Now copy indices, triggers and such.
      let queries = yield db.execute("SELECT sql FROM main.sqlite_master WHERE type != 'table' AND name BETWEEN 'moz_' AND 'moza'");
      queries = queries.map(t => t.getResultByName("sql"));
      for (let query of queries) {
        yield newDb.execute(query);
      }
    }, newDb.TRANSACTION_EXCLUSIVE);
    yield newDb.execute("PRAGMA user_version = " + schemaVersion);
    yield newDb.execute("PRAGMA journal_mode = WAL");
  } finally {
    yield newDb.close();
  }
  gWizard.canAdvance = true;
});

function* copyTable(src, dst, tbl) {
  let copied = 0;
  try {
    let rows = yield src.execute("SELECT * FROM " + tbl);
    if (rows.length == 0) {
      // Empty table.
      return;
    }
    let cols = rows[0].numEntries;
    for (let row of rows) {
      let params = Array(cols).fill(1).map((undefined, i) => row.getResultByIndex(i));
      yield dst.execute(`INSERT INTO ${tbl} VALUES(${Array(cols).fill("?").join(",")})`, params);
      copied++;
    }
  } catch (ex) {
    Cu.reportError(ex);
    // Try reverse copy.
    try {
      let rows = yield src.execute("SELECT * FROM " + tbl + " ORDER BY rowid DESC");
      let cols = rows[0].numEntries;
      for (let row of rows) {
        let params = Array(cols).fill(1).map((undefined, i) => row.getResultByIndex(i));
        yield dst.execute(`INSERT INTO ${tbl} VALUES(${Array(cols).fill("?").join(",")})`, params);
        copied++;
      }
    } catch (ex2) {
      Cu.reportError(ex);
      // If nothing has been copied forward the exception.
      if (!copied) {
        throw ex2;
      }
    }
  }
}

var end = Task.async(function* () {
  gWizard.canRewind = false;
  let result = document.getElementById("maintenanceResult");
  if (!gCorrupt) {
    if ("getLegacyLog" in PlacesDBUtils) {
      let statusMap = yield PlacesDBUtils.runTasks([PlacesDBUtils.stats])
      result.value = PlacesDBUtils.getLegacyLog(statusMap).join("\n");
      result.setAttribute("wrap", "off");
    } else {
      yield new Promise(resolve => {
        PlacesDBUtils.runTasks([PlacesDBUtils.stats], out => {
          result.value = out.join("\n");
          result.setAttribute("wrap", "off");
          resolve();
        });
      });
    }
  } else {
    if (gReplace) {
      result.value = "The database was corrupt and it was not possible to fix it. The database will be renamed to places.sqlite-corrupt and a new one will be generated, bookmarks will be restored from the most  recent backup.";
    } else {
      result.value = "The database was corrupt, a new clone has been generated and now the application will restart to replace the database. The old database will be renamed to places.sqlite-corrupt";
      let promise = new Promise(resolve => {
        Services.obs.addObserver(function() {
          resolve();
        }, "places-connection-closed", false);
      });
      AsyncShutdown.profileBeforeChange.addBlocker("Places Maintenance add-on shutdown blocker",
        Task.async(function* () {
          yield promise;
          let placesDbPath = OS.Path.join(OS.Constants.Path.profileDir, "places.sqlite");
          let corruptDbPath = OS.Path.join(OS.Constants.Path.profileDir, "places.sqlite-corrupt");
          yield OS.File.move(placesDbPath, corruptDbPath);
          yield OS.File.move(gNewDbPath, placesDbPath);
        })
      );
    }
  }
});

function finish() {
  if (gCorrupt) {
    if (gReplace) {
      Services.prefs.setBoolPref("places.database.replaceOnStartup", true);
    }
    // Restart application (BrowserUtils.restart not yet available in 38).
    let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"]
                       .getService(Ci.nsIAppStartup);
    let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"]
                       .createInstance(Ci.nsISupportsPRBool);
    Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
    if (cancelQuit.data) { // The quit request has been canceled.
      return true;
    }
    // if already in safe mode restart in safe mode.
    if (Services.appinfo.inSafeMode) {
      appStartup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
      return;
    }
    appStartup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
  }
  return true;
}
