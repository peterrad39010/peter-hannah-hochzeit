# Hannah & Peter – Hochzeitswebseite

Statische Webseite über GitHub Pages (Branch `main`, Ordner `/`).

**Der Inhalt ist verschlüsselt.** `index.html` enthält nur eine Startseite mit Code-Feld
und den verschlüsselten Seiteninhalt (inkl. Fotos). Ohne gültigen Code ist nichts lesbar.

**Persönliche Codes:** Jeder Gast hat einen eigenen 8-stelligen Code (Blatt „Gäste“ der
Google-Tabelle, erzeugt über das Menü „Hochzeit → Codes erzeugen“). Die Startseite fragt beim
Google Apps Script nach; nur bei einem gültigen Code liefert es den Schlüssel sowie Anrede,
Namen und Personenzahl des Gasts. Rückmeldungen landen beim richtigen Gast in der Tabelle.

- `index.html` – Startseite + verschlüsselter Inhalt (AES-256-GCM)
- `tools/shell.html` – Vorlage der Startseite (Code-Eingabe)
- `tools/seal.py` – ver-/entschlüsseln (`seal` / `unseal`, Schlüssel über `HP_KEY`)
- `tools/rsvp-apps-script.gs` – Google Apps Script (Gästeliste, Code-Prüfung, Rückmeldungen);
  der Schlüssel ist hier bewusst nur ein Platzhalter
- `404.html` – Fehlerseite

Auf allen Einladungen ist derselbe QR-Code (Link auf die Startseite); der persönliche Code
steht zusätzlich auf jeder Karte. Ein persönlicher Direktlink ist auch möglich: `…/#z=<Code>`
(der Teil nach `#` wird nie an einen Server übertragen und sofort aus der Adresszeile entfernt).

Die lesbare Quelle und der Schlüssel liegen bewusst **nicht** im Repo.
