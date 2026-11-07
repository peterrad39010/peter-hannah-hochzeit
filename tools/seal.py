#!/usr/bin/env python3
"""
Hochzeitsseite Hannah & Peter – Inhalt ver- und entschlüsseln.

Es gibt zwei Zugangscodes, beide öffnen dieselbe Seite. Der Code verrät dem
Rückmeldeformular zugleich die Einladungsart (Einzel oder Paar).

  Verschlüsseln:  HP_CODES="7fd2:EINZELCODE,9qx4:PAARCODE" python3 tools/seal.py seal QUELLE.html index.html
  Entschlüsseln:  HP_CODE="EINEN_DER_CODES"                python3 tools/seal.py unseal index.html QUELLE.html

  7fd2 = Einzeleinladung, 9qx4 = Paar-Einladung (wie im Formular und im Apps Script)

Die Quelle (lesbares HTML mit eingebetteten Fotos) gehört NICHT ins Repo.
Verfahren: zufälliger Inhaltsschlüssel (AES-256-GCM); dieser wird für jeden Code
mit einem per PBKDF2-HMAC-SHA256 (600 000 Runden) abgeleiteten Schlüssel verpackt.
Codes werden vereinfacht: Kleinbuchstaben, ohne Leerzeichen und Bindestriche.
"""
import base64, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 600_000
HERE = os.path.dirname(os.path.abspath(__file__))
MARK = re.compile(r'<script id="sealed" type="application/json">(.*?)</script>', re.S)
b64 = lambda b: base64.b64encode(b).decode()

def norm(code):
    return re.sub(r'[\s\-–_]+', '', code.strip().lower())

def kdf(code, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(norm(code).encode())

def seal(src, dst, codes):
    plain = open(src, 'rb').read()
    k, iv = AESGCM.generate_key(256), os.urandom(12)
    wraps = []
    for art, code in codes:
        salt, wiv = os.urandom(16), os.urandom(12)
        wraps.append({'s': b64(salt), 'i': b64(wiv),
                      'c': b64(AESGCM(kdf(code, salt)).encrypt(wiv, k + art.encode(), None))})
    blob = json.dumps({'n': ITER, 'i': b64(iv), 'c': b64(AESGCM(k).encrypt(iv, plain, None)), 'w': wraps})
    shell = open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
    open(dst, 'w', encoding='utf-8').write(
        shell.replace('<!--SEALED-->', '<script id="sealed" type="application/json">' + blob + '</script>'))

def unseal(src, dst, code):
    blob = json.loads(MARK.search(open(src, encoding='utf-8').read()).group(1))
    d = base64.b64decode
    for w in blob['w']:
        try:
            kk = AESGCM(kdf(code, d(w['s']))).decrypt(d(w['i']), d(w['c']), None)
        except Exception:
            continue
        open(dst, 'wb').write(AESGCM(kk[:32]).decrypt(d(blob['i']), d(blob['c']), None))
        return kk[32:].decode()
    raise SystemExit('Code passt nicht.')

if __name__ == '__main__':
    mode, a, b = sys.argv[1:4]
    if mode == 'seal':
        codes = [tuple(x.split(':', 1)) for x in os.environ['HP_CODES'].split(',')]
        seal(a, b, codes); print('fertig:', b)
    else:
        print('fertig:', b, '| Einladungsart:', unseal(a, b, os.environ['HP_CODE']))
