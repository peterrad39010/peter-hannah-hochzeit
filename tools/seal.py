#!/usr/bin/env python3
"""
Hochzeitsseite Hannah & Peter – Inhalt ver- und entschlüsseln.

Jeder Gast hat einen persönlichen 8-stelligen Code (Blatt „Gäste“ der Google-Tabelle).
Die Webseite fragt beim Google Apps Script nach, ob der Code gültig ist; nur dann
liefert das Skript den Schlüssel (HP_KEY) und Anrede/Namen des Gasts zurück.

  Verschlüsseln:  HP_KEY="<Base64-Schlüssel>" python3 tools/seal.py seal QUELLE.html index.html
  Entschlüsseln:  HP_KEY="<Base64-Schlüssel>" python3 tools/seal.py unseal index.html QUELLE.html

Der Schlüssel steht nur im Apps Script (Google-Konto) und lokal – NIEMALS im Repo.
Die Quelle (lesbares HTML mit eingebetteten Fotos) gehört ebenfalls NICHT ins Repo.
Verfahren: AES-256-GCM mit festem Inhaltsschlüssel.
"""
import base64, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
MARK = re.compile(r'<script id="sealed" type="application/json">(.*?)</script>', re.S)
b64 = lambda b: base64.b64encode(b).decode()

def key():
    k = base64.b64decode(os.environ['HP_KEY'])
    assert len(k) == 32, 'HP_KEY muss 32 Bytes (Base64) sein'
    return k

def seal(src, dst):
    iv = os.urandom(12)
    blob = json.dumps({'i': b64(iv), 'c': b64(AESGCM(key()).encrypt(iv, open(src, 'rb').read(), None))})
    shell = open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
    open(dst, 'w', encoding='utf-8').write(
        shell.replace('<!--SEALED-->', '<script id="sealed" type="application/json">' + blob + '</script>'))

def unseal(src, dst):
    blob = json.loads(MARK.search(open(src, encoding='utf-8').read()).group(1))
    d = base64.b64decode
    open(dst, 'wb').write(AESGCM(key()).decrypt(d(blob['i']), d(blob['c']), None))

if __name__ == '__main__':
    mode, a, b = sys.argv[1:4]
    (seal if mode == 'seal' else unseal)(a, b)
    print('fertig:', b)
