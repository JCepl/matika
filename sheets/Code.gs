/**
 * Matika → Google Sheet.
 *
 * The Matika apps send every answered problem and every finished round here; any device with
 * the link can read them back (that is how a parent's phone shows the child's map).
 *
 * Setup (once): in the Google Sheet open Extensions → Apps Script, replace everything with this
 * file, save, then Deploy → New deployment → type "Web app", Execute as: Me,
 * Who has access: Anyone. Copy the Web app URL (ends with /exec) into the Matika app.
 *
 * Tabs it creates:
 *   profily            – one row per child (id, name, resets)
 *   <app>_<records>    – e.g. nasobilka_attempts, nasobilka_sessions; one row per record.
 *                        Columns: kdy (when), dítě (child), klíč (unique key), then the record fields.
 * Don't rename tabs or header cells; adding your own tabs (without "_" in the name) is fine.
 */

var PROFILES = 'profily';

function doGet() {
  return json_(pull_());
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    push_(JSON.parse(e.postData.contents));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function first_(obj, keys) {
  for (var i = 0; i < keys.length; i++) if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) return obj[keys[i]];
  return undefined;
}

// body: { profile: {id, name, created}, resets: {app: timestamp}, records: {"<app>_<kind>": [record, ...]} }
function push_(body) {
  var p = body.profile;
  upsertProfile_(p, body.resets || {});

  var records = body.records || {};
  Object.keys(records).forEach(function (name) {
    var recs = records[name];
    if (!recs.length) return;
    var sh = sheet_(name, ['kdy', 'dítě', 'klíč']);
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

    var newKeys = [];
    recs.forEach(function (r) {
      Object.keys(r).forEach(function (k) { if (header.indexOf(k) < 0 && newKeys.indexOf(k) < 0) newKeys.push(k); });
    });
    if (newKeys.length) {
      sh.getRange(1, header.length + 1, 1, newKeys.length).setValues([newKeys]).setFontWeight('bold');
      header = header.concat(newKeys);
    }

    var last = sh.getLastRow();
    var existing = {};
    if (last > 1) sh.getRange(2, 3, last - 1, 1).getValues().forEach(function (row) { existing[row[0]] = true; });

    var rows = [];
    recs.forEach(function (r) {
      var key = p.id + '|' + first_(r, ['id', 't']);
      if (existing[key]) return;          // already here (e.g. sent twice on a flaky connection)
      existing[key] = true;
      rows.push(header.map(function (h, i) {
        if (i === 0) return new Date(first_(r, ['t', 'end']) || Date.now());
        if (i === 1) return p.name;
        if (i === 2) return key;
        var v = r[h];
        return v === undefined || v === null ? '' : v;
      }));
    });
    if (rows.length) sh.getRange(last + 1, 1, rows.length, header.length).setValues(rows);
  });
}

function upsertProfile_(p, resets) {
  var sh = sheet_(PROFILES, ['id', 'jméno', 'vytvořeno', 'resety']);
  var last = sh.getLastRow();
  var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var i = ids.indexOf(p.id);
  var row = [p.id, p.name, p.created || '', JSON.stringify(resets)];
  if (i < 0) sh.appendRow(row);
  else sh.getRange(i + 2, 1, 1, 4).setValues([row]);
}

function pull_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { ok: true, profiles: [], records: {} };

  var ps = ss.getSheetByName(PROFILES);
  if (ps && ps.getLastRow() > 1) {
    ps.getRange(2, 1, ps.getLastRow() - 1, 4).getValues().forEach(function (r) {
      out.profiles.push({ id: String(r[0]), name: String(r[1]), created: Number(r[2]) || 0, resets: r[3] ? JSON.parse(r[3]) : {} });
    });
  }

  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (name === PROFILES || name.indexOf('_') < 0 || sh.getLastRow() < 2) return;
    var values = sh.getDataRange().getValues();
    var header = values[0];
    out.records[name] = values.slice(1).map(function (row) {
      var rec = { _p: String(row[2]).split('|')[0] };
      for (var i = 3; i < header.length; i++) if (row[i] !== '') rec[header[i]] = row[i];
      return rec;
    });
  });
  return out;
}
