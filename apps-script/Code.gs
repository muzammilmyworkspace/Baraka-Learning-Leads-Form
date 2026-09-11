/**
 * Baraka Learning — lead capture backend (Google Apps Script)
 *
 * Receives registrations POSTed by index.html, appends each one as a row in a
 * Google Sheet that lives inside the Drive folder FOLDER_NAME, and emails
 * NOTIFY_EMAIL about every new lead.
 *
 * One-time setup (full steps in README.md):
 *   1. Open https://script.google.com while signed in as the Google account
 *      that should own the leads folder, create a new project, paste this file.
 *   2. Run  setup()  once from the editor and approve the permissions. It
 *      creates the folder + spreadsheet (or finds them if they already exist).
 *   3. Deploy > New deployment > Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Copy the web app URL into SCRIPT_URL in index.html.
 */

// ── Configuration ──────────────────────────────────────────────────────────
var FOLDER_NAME  = "Baraka Learning Leads";          // Drive folder shared with the client
var FILE_NAME    = "Baraka Learning Leads";          // spreadsheet inside that folder
var TAB_NAME     = "Leads";
var NOTIFY_EMAIL = "snz.ventures2025@gmail.com";     // gets an email per lead ("" to disable)
var FORM_TOKEN   = "";                               // optional shared secret; must match index.html
var TIME_ZONE    = "Europe/Vilnius";
// ───────────────────────────────────────────────────────────────────────────

var HEADERS = [
  "Timestamp", "Name", "WhatsApp", "Email", "Nationality", "City",
  "Level", "Availability", "Preferred start", "Hindi/Urdu", "Notes",
  "Reference", "Consent", "Source", "Status"
];

/** Run this once from the editor to authorise the script and create the sheet. */
function setup() {
  var sheet = getSheet_();
  var ss = sheet.getParent();
  Logger.log("Folder:      " + getFolder_().getUrl());
  Logger.log("Spreadsheet: " + ss.getUrl());
  Logger.log("Setup complete. Now deploy as a web app (see README.md).");
}

/** Handles form submissions from index.html. */
function doPost(e) {
  try {
    var data = parse_(e);

    if (FORM_TOKEN && data.token !== FORM_TOKEN) {
      return json_({ ok: false, error: "Unauthorised" });
    }
    if (data.website) {                       // honeypot filled → bot; pretend success
      return json_({ ok: true });
    }
    if (!data.name || !data.phone || !data.email) {
      return json_({ ok: false, error: "Missing required fields" });
    }

    var sheet = getSheet_();
    var row = [
      new Date(),
      clean_(data.name),
      clean_(data.phone),
      clean_(data.email),
      clean_(data.nationality),
      clean_(data.city),
      clean_(data.level),
      clean_(data.availability),
      clean_(data.start),
      clean_(data.hindi),
      clean_(data.notes),
      clean_(data.ref),
      data.consent ? "Yes" : "No",
      clean_(data.source),
      "New"
    ];

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var r = sheet.getLastRow() + 1;
      sheet.getRange(r, 1, 1, row.length).setValues([row]);
    } finally {
      lock.releaseLock();
    }

    notify_(data, sheet.getParent().getUrl());
    return json_({ ok: true });

  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Lets you open the web app URL in a browser to check it is alive. */
function doGet() {
  return json_({ ok: true, service: "Baraka Learning leads", folder: FOLDER_NAME });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parse_(e) {
  var raw = e && e.postData && e.postData.contents;
  if (raw) {
    try { return JSON.parse(raw); } catch (_) { /* fall through to form fields */ }
  }
  return (e && e.parameter) || {};
}

function clean_(v) {
  if (v === undefined || v === null) return "";
  var s = String(v).trim();
  // A leading apostrophe makes Sheets store the value as plain text, so
  // "+92 300…" phone numbers and anything starting with "=" are never formulas
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) { /* recreate below */ }
  }
  var it = DriveApp.getRootFolder().getFoldersByName(FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty("FOLDER_ID", folder.getId());
  return folder;
}

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var folder = getFolder_();
  var ss = null;

  var id = props.getProperty("SPREADSHEET_ID");
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (_) { ss = null; }
  }
  if (!ss) {
    var files = folder.getFilesByName(FILE_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(FILE_NAME);
      DriveApp.getFileById(ss.getId()).moveTo(folder);
      ss.setSpreadsheetTimeZone(TIME_ZONE);
    }
    props.setProperty("SPREADSHEET_ID", ss.getId());
  }

  var sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(TAB_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var head = sheet.getRange(1, 1, 1, HEADERS.length);
    head.setFontWeight("bold").setBackground("#1F4D2B").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
    sheet.setColumnWidth(1, 140);   // Timestamp
    sheet.setColumnWidth(2, 180);   // Name
    sheet.setColumnWidth(11, 260);  // Notes
    sheet.setColumnWidth(14, 200);  // Source
  }
  return sheet;
}

function notify_(data, sheetUrl) {
  if (!NOTIFY_EMAIL) return;
  var subject = "New Lithuanian class lead: " + String(data.name || "").trim() + " (" + String(data.level || "").trim() + ")";
  var rows = [
    ["Name", data.name], ["WhatsApp", data.phone], ["Email", data.email],
    ["Nationality", data.nationality], ["City", data.city], ["Level", data.level],
    ["Availability", data.availability], ["Preferred start", data.start],
    ["Hindi/Urdu", data.hindi], ["Notes", data.notes], ["Reference", data.ref],
    ["Source", data.source]
  ];
  var html = '<p>A new registration just arrived from the Baraka Learning form.</p>' +
    '<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">' +
    rows.map(function (r) {
      return '<tr><td style="border:1px solid #ddd;font-weight:bold">' + esc_(r[0]) +
             '</td><td style="border:1px solid #ddd">' + esc_(r[1]) + '</td></tr>';
    }).join("") +
    '</table>' +
    '<p><a href="' + sheetUrl + '">Open the leads sheet</a></p>';
  var text = rows.map(function (r) { return r[0] + ": " + (r[1] || ""); }).join("\n") +
             "\n\nSheet: " + sheetUrl;
  try {
    MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, body: text, htmlBody: html });
  } catch (err) {
    console.error("Email failed: " + err);   // the lead is already saved; do not fail the request
  }
}

function esc_(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
