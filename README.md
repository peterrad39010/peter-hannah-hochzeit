# Hannah & Peter – Hochzeitswebseite

Statische Webseite über GitHub Pages (Branch `main`, Ordner `/`).

**Der Inhalt ist verschlüsselt.** `index.html` enthält nur eine Startseite mit Zugangscode-Feld
und den verschlüsselten Seiteninhalt (inkl. Fotos). Ohne Zugangscode ist nichts lesbar.

- `index.html` – Startseite + verschlüsselter Inhalt (AES-256-GCM, Schlüssel per PBKDF2 aus dem Zugangscode)
- `tools/shell.html` – Vorlage der Startseite
- `tools/seal.py` – ver-/entschlüsseln (`seal` / `unseal`)
- `tools/rsvp-apps-script.gs` – Google-Apps-Script für die Rückmeldungen
- `404.html` – Fehlerseite

QR-Links auf den Einladungen: `…/#z=<Zugangscode>` – es gibt einen Code für Einzel- und einen für Paar-Einladungen; der Code bestimmt die Einladungsart im Formular.
(der Code im `#`-Teil wird nie an einen Server übertragen und sofort aus der Adresszeile entfernt).

Die lesbare Quelle liegt bewusst **nicht** im Repo. Zum Bearbeiten: `unseal` → ändern → `seal`.
