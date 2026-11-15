"""Password hashing, sessions and invite-code sealing (stdlib only)."""
import base64
import hashlib
import hmac
import os
import secrets

from . import db

_SECRET = None
CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def secret():
    global _SECRET
    if _SECRET is None:
        path = os.path.join(db.DATA_DIR, "secret.key")
        if os.environ.get("WAYPLOT_SECRET"):
            _SECRET = os.environ["WAYPLOT_SECRET"].encode()
        elif os.path.exists(path):
            with open(path, "rb") as f:
                _SECRET = f.read()
        else:
            os.makedirs(db.DATA_DIR, exist_ok=True)
            _SECRET = secrets.token_bytes(32)
            with open(path, "wb") as f:
                f.write(_SECRET)
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass
    return _SECRET


# ---------------------------------------------------------------- passwords
def hash_password(pw):
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(dk).decode()


def check_password(pw, stored):
    try:
        algo, s, h = stored.split("$")
        salt, want = base64.b64decode(s), base64.b64decode(h)
        dk = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
        return algo == "scrypt" and hmac.compare_digest(dk, want)
    except (ValueError, AttributeError, TypeError):
        return False


# ----------------------------------------------------------------- sessions
def token_hash(tok):
    return hashlib.sha256(tok.encode()).hexdigest()


def create_session(user_id, days=30):
    tok = secrets.token_urlsafe(32)
    db.ex("INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
          (token_hash(tok), user_id, db.now_iso(), db.iso_in(days=days)))
    return tok


def session_user(tok):
    if not tok:
        return None
    s = db.q1("SELECT * FROM sessions WHERE token_hash=?", (token_hash(tok),))
    if not s or db.parse_iso(s["expires_at"]) < db.now():
        return None
    return db.q1("SELECT * FROM users WHERE id=?", (s["user_id"],))


def drop_session(tok):
    if tok:
        db.ex("DELETE FROM sessions WHERE token_hash=?", (token_hash(tok),))


# ------------------------------------------------------------- invite codes
def random_code():
    return "WAY-" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(5))


def normalize_code(raw):
    s = "".join(ch for ch in (raw or "").upper() if ch.isalnum())
    if s.startswith("WAY"):
        s = s[3:]
    return "WAY-" + s if s else ""


def code_hash(code):
    return hmac.new(secret(), ("code:" + code).encode(), hashlib.sha256).hexdigest()


def _keystream(invite_id, n):
    return hmac.new(secret(), ("seal:" + invite_id).encode(), hashlib.sha256).digest()[:n]


def seal_code(invite_id, code):
    raw = code.encode()
    ks = _keystream(invite_id, len(raw))
    return base64.b64encode(bytes(a ^ b for a, b in zip(raw, ks))).decode()


def unseal_code(invite_id, sealed):
    raw = base64.b64decode(sealed)
    ks = _keystream(invite_id, len(raw))
    return bytes(a ^ b for a, b in zip(raw, ks)).decode()
