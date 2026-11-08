/**
 * @OnlyCurrentDoc
 * ↑ Beschränkt das Skript auf genau diese eine Tabelle (Berechtigung
 *   "spreadsheets.currentonly"). Es kann keine anderen Dateien in Drive
 *   sehen oder bearbeiten.
 */

/**
 * Hochzeit Hannah & Peter – Gästeliste, persönliche Codes und Rückmeldungen
 *
 * Einrichtung bzw. Aktualisierung:
 * 1. In der Google-Tabelle: Erweiterungen → Apps Script.
 *    Den vorhandenen Code komplett löschen, diesen Code einfügen, speichern.
 * 2. Bereitstellen → Bereitstellungen verwalten → Stift (Bearbeiten)
 *    → Version: "Neue Version" → Bereitstellen. (Die Web-App-Adresse bleibt gleich.)
 * 3. Tabelle neu laden → oben erscheint das Menü "Hochzeit".
 *    "Hochzeit → Gästeliste einrichten" legt das Blatt "Gäste" an.
 * 4. Gäste eintragen (Anrede, Namen, Personen) und
 *    "Hochzeit → Codes erzeugen" klicken.
 */

// Schlüssel der verschlüsselten Webseite. Nur hier eintragen, niemals veröffentlichen.
const HP_KEY = 'HIER_SCHLÜSSEL_EINTRAGEN';

const RSVP_SHEET = 'Rückmeldungen';
const GUEST_SHEET = 'Gäste';
const RSVP_HEADERS = ['Zeitpunkt', 'Name', 'Einladung', 'Antwort', 'Personen', 'Ernährung',
                      'Allergien', 'Nachricht'];
const GUEST_HEADERS = ['Code', 'Anrede', 'Namen', 'Personen', 'Antwort', 'Zusagen',
                       'Letzte Rückmeldung'];
// Bisherige Einzel-/Paar-Links bleiben gültig, bis die neue Seite online ist
const LEGACY = { '7fd2': { art: 'Einzel', max: 1 }, '9qx4': { art: 'Paar', max: 2 } };

/* ---------- Menü in der Tabelle ---------- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Hochzeit')
    .addItem('Gästeliste einrichten', 'gaesteEinrichten')
    .addItem('Codes erzeugen', 'codesErzeugen')
    .addToUi();
}

function gaesteEinrichten() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(GUEST_SHEET);
  if (!sh) sh = ss.insertSheet(GUEST_SHEET, 0);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, GUEST_HEADERS.length).setValues([GUEST_HEADERS])
      .setFontWeight('bold').setBackground('#f3ebdb');
    sh.getRange(2, 2, 2, 3).setValues([
      ['Liebe Anna, lieber Max', 'Anna & Max', 2],
      ['Liebe Oma Rosi', 'Rosi Muster', 1]
    ]);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');            // Codes als Text
    sh.getRange('D2:D').setDataValidation(SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 12).setAllowInvalid(false)
      .setHelpText('Wie viele Personen sind mit dieser Einladung eingeladen?').build());
    sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 200);
    sh.setColumnWidth(4, 80);  sh.setColumnWidth(5, 90);  sh.setColumnWidth(6, 80);
    sh.setColumnWidth(7, 150);
    sh.getRange('B1').setNote('Begrüßung auf der Webseite, z. B. „Liebe Anna, lieber Max“');
    sh.getRange('C1').setNote('Wird im Rückmeldeformular vorausgefüllt');
    sh.getRange('D1').setNote('Höchstzahl an Personen. 1 = Ansprache mit „du“, ab 2 mit „ihr“');
    sh.getRange('E1:G1').setNote('Wird automatisch ausgefüllt');
  }
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('Das Blatt „Gäste“ ist bereit. Die zwei Beispielzeilen könnt ihr überschreiben.');
}

function codesErzeugen() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUEST_SHEET);
  if (!sh) return SpreadsheetApp.getUi().alert('Bitte zuerst „Gästeliste einrichten“ ausführen.');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, 3).getDisplayValues();
  const used = {};
  rows.forEach(r => { if (r[0]) used[norm_(r[0])] = true; });
  let neu = 0;
  rows.forEach((r, i) => {
    if (r[0] || !r[2]) return;                         // schon Code vorhanden oder leere Zeile
    let c;
    do { c = String(10000000 + Math.floor(Math.random() * 90000000)); } while (used[c]);
    used[c] = true;
    sh.getRange(i + 2, 1).setValue(c.slice(0, 4) + ' ' + c.slice(4));
    neu++;
  });
  SpreadsheetApp.getUi().alert(neu ? neu + ' neue Codes erzeugt.' : 'Alle Gäste haben bereits einen Code.');
}

/* ---------- Webseite: Code prüfen ---------- */

function doGet(e) {
  const code = norm_((e && e.parameter && e.parameter.code) || '');
  const g = code.length === 8 ? findGuest_(code) : null;
  if (!g) {
    Utilities.sleep(1200);                             // bremst systematisches Durchprobieren
    return json_({ ok: false });
  }
  return json_({ ok: true, key: HP_KEY, anrede: g.anrede, namen: g.namen, personen: g.personen });
}

/* ---------- Webseite: Rückmeldung speichern ---------- */

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true });         // Spam-Schutz (unsichtbares Feld)

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(RSVP_SHEET);
    if (!sh) sh = ss.insertSheet(RSVP_SHEET);
    if (sh.getLastRow() === 0) {
      sh.appendRow(RSVP_HEADERS);
      sh.getRange(1, 1, 1, RSVP_HEADERS.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }

    const g = p.code ? findGuest_(norm_(p.code)) : null;
    let max, einladung;
    if (g) { max = g.personen; einladung = 'Code ' + g.code; }
    else {
      const inv = LEGACY[p.k];
      if (!inv) return json_({ ok: false });          // unbekannter Code → nichts speichern
      max = inv.max; einladung = inv.art;
    }
    const ja = p.antwort === 'ja';
    const personen = Math.min(Math.max(parseInt(p.personen, 10) || 1, 1), max);
    const now = new Date();
    sh.appendRow([
      now,
      clean_(p.name || (g && g.namen)),
      einladung,
      ja ? 'Zusage' : 'Absage',
      ja ? personen : 0,
      ja ? (clean_(p.ernaehrung) || 'keine Besonderheiten') : '',
      ja ? clean_(p.allergien) : '',
      clean_(p.nachricht)
    ]);
    if (g) {                                          // Status direkt in der Gästeliste
      ss.getSheetByName(GUEST_SHEET).getRange(g.row, 5, 1, 3)
        .setValues([[ja ? 'Zusage' : 'Absage', ja ? personen : 0, now]]);
    }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Hilfsfunktionen ---------- */

function findGuest_(code) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUEST_SHEET);
  if (!sh || sh.getLastRow() < 2) return null;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && norm_(rows[i][0]) === code && rows[i][2]) {
      return { row: i + 2, code: rows[i][0], anrede: rows[i][1], namen: rows[i][2],
               personen: Math.max(parseInt(rows[i][3], 10) || 1, 1) };
    }
  }
  return null;
}

function norm_(v) { return String(v || '').replace(/\D/g, ''); }

// Kürzt Eingaben und verhindert, dass Text als Tabellen-Formel ausgeführt wird
function clean_(v) {
  v = String(v || '').trim().slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
