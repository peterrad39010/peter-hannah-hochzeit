/**
 * @OnlyCurrentDoc
 * ↑ Beschränkt das Skript auf genau diese eine Tabelle (Berechtigung
 *   "spreadsheets.currentonly"). Es kann keine anderen Dateien in Drive
 *   sehen oder bearbeiten.
 */

/**
 * Hochzeit Hannah & Peter – Rückmeldungen in Google-Tabelle speichern
 *
 * Einrichtung:
 * 1. Neue Google-Tabelle anlegen (z. B. "Hochzeit Hannah & Peter – Gäste").
 * 2. Menü: Erweiterungen → Apps Script. Den vorhandenen Code löschen
 *    und diesen gesamten Code einfügen. Speichern.
 * 3. Oben rechts: Bereitstellen → Neue Bereitstellung → Typ "Web-App".
 *      Beschreibung: Rückmeldungen
 *      Ausführen als: Ich
 *      Zugriff: Jeder
 *    → Bereitstellen → Zugriff erlauben (mit eigenem Google-Konto bestätigen).
 * 4. Die angezeigte Web-App-URL (endet auf /exec) kopieren und an Claude schicken
 *    bzw. in index.html bei RSVP_URL eintragen.
 */

const SHEET_NAME = 'Rückmeldungen';
// Einladungsart aus dem QR-Code-Link: maximale Personenzahl
const INVITES = { '7fd2': { art: 'Einzel', max: 1 }, '9qx4': { art: 'Paar', max: 2 } };
const HEADERS = ['Zeitpunkt', 'Name', 'Einladung', 'Antwort', 'Personen', 'Ernährung',
                 'Allergien', 'Nachricht'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return json_({ ok: true }); // Spam-Schutz (unsichtbares Feld)

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    const ja = p.antwort === 'ja';
    const inv = INVITES[p.k] || INVITES['7fd2'];
    const personen = Math.min(Math.max(parseInt(p.personen, 10) || 1, 1), inv.max);
    sh.appendRow([
      new Date(),
      clean_(p.name),
      inv.art,
      ja ? 'Zusage' : 'Absage',
      ja ? personen : 0,
      ja ? (clean_(p.ernaehrung) || 'keine Besonderheiten') : '',
      ja ? clean_(p.allergien) : '',
      clean_(p.nachricht)
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Kürzt Eingaben und verhindert, dass Text als Tabellen-Formel ausgeführt wird
function clean_(v) {
  v = String(v || '').trim().slice(0, 1000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
