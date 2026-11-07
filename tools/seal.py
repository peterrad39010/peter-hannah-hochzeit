#!/usr/bin/env python3
"""
Hochzeitsseite Hannah & Peter – Inhalt ver- und entschlüsseln.

  Verschlüsseln:  python3 tools/seal.py seal   QUELLE.html  index.html   (fragt nach dem Zugangscode)
  Entschlüsseln:  python3 tools/seal.py unseal index.html   QUELLE.html

Die Quelle (lesbares HTML mit eingebetteten Fotos) gehört NICHT ins Repo.
Verfahren: PBKDF2-HMAC-SHA256 (600 000 Runden) + AES-256-GCM, entschlüsselt im Browser per WebCrypto.
Der Code wird vor der Ableitung vereinfacht: Kleinbuchstaben, ohne Leerzeichen und Bindestriche.
"""
import base64, getpass, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 600_000
HERE = os.path.dirname(os.path.abspath(__file__))
MARK = re.compile(r'<script id="sealed" type="application/json">(.*?)</script>', re.S)

def norm(code):
    return re.sub(r'[\s\-–_]+', '', code.strip().lower())

def key(code, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(norm(code).encode())

def seal(src, dst, code):
    plain = open(src, 'rb').read()
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(key(code, salt)).encrypt(iv, plain, None)
    blob = json.dumps({'s': base64.b64encode(salt).decode(), 'i': base64.b64encode(iv).decode(),
                       'n': ITER, 'c': base64.b64encode(ct).decode()})
    shell = open(os.path.join(HERE, 'shell.html'), encoding='utf-8').read()
    out = shell.replace('<!--SEALED-->', '<script id="sealed" type="application/json">' + blob + '</script>')
    open(dst, 'w', encoding='utf-8').write(out)

def unseal(src, dst, code):
    blob = json.loads(MARK.search(open(src, encoding='utf-8').read()).group(1))
    salt, iv, ct = (base64.b64decode(blob[k]) for k in ('s', 'i', 'c'))
    open(dst, 'wb').write(AESGCM(key(code, salt)).decrypt(iv, ct, None))

if __name__ == '__main__':
    mode, a, b = sys.argv[1:4]
    code = os.environ.get('HP_CODE') or getpass.getpass('Zugangscode: ')
    (seal if mode == 'seal' else unseal)(a, b, code)
    print('fertig:', b)
