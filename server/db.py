"""SQLite storage. One connection per request/thread (WAL mode)."""
import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("WAYPLOT_DATA_DIR", os.path.join(BASE_DIR, "instance"))
DB_PATH = os.path.join(DATA_DIR, "wayplot.db")

_local = threading.local()
_write_lock = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'password', lang TEXT NOT NULL DEFAULT 'vi',
  settings_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY, interests TEXT NOT NULL DEFAULT '[]', travel_style TEXT, pace TEXT,
  transport TEXT, avoid TEXT NOT NULL DEFAULT '[]', budget_per_person INTEGER, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, trip_type TEXT NOT NULL, title TEXT NOT NULL,
  destination TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, travelers INTEGER NOT NULL DEFAULT 1,
  budget_amount INTEGER, budget_mode TEXT, currency TEXT DEFAULT 'VND', prefs_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', finalized_option_id TEXT, archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, leader_id TEXT NOT NULL, group_name TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 8, room_status TEXT NOT NULL DEFAULT 'open', notes TEXT,
  plan_count INTEGER, ready_deadline TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL, member_status TEXT NOT NULL DEFAULT 'active', ready_status INTEGER NOT NULL DEFAULT 0,
  ready_at TEXT, can_edit INTEGER NOT NULL DEFAULT 0, UNIQUE(group_id, user_id)
);
CREATE TABLE IF NOT EXISTS invitation_codes (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL, code_hash TEXT NOT NULL, code_sealed TEXT NOT NULL,
  expires_at TEXT NOT NULL, revoked_at TEXT, usage_limit INTEGER NOT NULL, used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invite_hash ON invitation_codes(code_hash);
CREATE TABLE IF NOT EXISTS join_attempts (user_key TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS member_submissions (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL, user_id TEXT NOT NULL, preference_json TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
  UNIQUE(group_id, user_id)
);
CREATE TABLE IF NOT EXISTS submission_history (
  id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, version INTEGER NOT NULL, preference_json TEXT NOT NULL,
  submission_status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, group_id TEXT, requested_by TEXT NOT NULL, plan_count INTEGER NOT NULL,
  status TEXT NOT NULL, stage TEXT, snapshot_json TEXT NOT NULL, synthesis_json TEXT, error TEXT, engine TEXT,
  counted INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS itinerary_options (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, group_id TEXT, generation_id TEXT, option_number INTEGER NOT NULL,
  title_json TEXT NOT NULL, description_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1, data_json TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS itinerary_versions (
  id TEXT PRIMARY KEY, option_id TEXT NOT NULL, version INTEGER NOT NULL, data_json TEXT NOT NULL,
  author_id TEXT, note TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, itinerary_option_id TEXT NOT NULL, activity_id TEXT, user_id TEXT NOT NULL, body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'comment', status TEXT NOT NULL DEFAULT 'open', edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY, itinerary_option_id TEXT NOT NULL, category TEXT NOT NULL, amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'VND', assumption TEXT
);
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'active',
  entitlement TEXT NOT NULL DEFAULT '{}', expires_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, payload_json TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY, actor_id TEXT, group_id TEXT, trip_id TEXT, action TEXT NOT NULL,
  payload_summary TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter (email TEXT PRIMARY KEY, created_at TEXT NOT NULL);
"""


def now():
    return datetime.now(timezone.utc)


def now_iso():
    return now().isoformat(timespec="seconds")


def iso_in(**kw):
    return (now() + timedelta(**kw)).isoformat(timespec="seconds")


def parse_iso(s):
    if not s:
        return None
    return datetime.fromisoformat(s)


def new_id(prefix=""):
    return prefix + uuid.uuid4().hex[:12]


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=15000")
    return conn


def get_conn():
    c = getattr(_local, "conn", None)
    if c is None:
        c = connect()
        _local.conn = c
    return c


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = connect()
    conn.executescript(SCHEMA)
    conn.close()


def q(sql, params=()):
    return [dict(r) for r in get_conn().execute(sql, params).fetchall()]


def q1(sql, params=()):
    r = get_conn().execute(sql, params).fetchone()
    return dict(r) if r else None


def ex(sql, params=()):
    with _write_lock:
        cur = get_conn().execute(sql, params)
        return cur.rowcount


class tx:
    """Serialized write transaction: `with tx(): ...`"""

    def __enter__(self):
        _write_lock.acquire()
        get_conn().execute("BEGIN IMMEDIATE")
        return self

    def __exit__(self, et, ev, tb):
        try:
            get_conn().execute("ROLLBACK" if et else "COMMIT")
        finally:
            _write_lock.release()
        return False


def jload(s, default=None):
    if s is None:
        return default
    try:
        return json.loads(s)
    except (TypeError, ValueError):
        return default


def jdump(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))
