"""Business rules for trips, group rooms, readiness, generation and collaboration."""
import copy
import threading
import time
from datetime import date

from . import ai, catalog, db, engine, realtime, security
from .db import jdump, jload, new_id, now_iso, q, q1, ex, tx

FREE = {"personal_per_month": 10, "group_generations": 3, "max_plans": 2}
VIP = {"personal_per_month": 50, "group_generations": 10, "max_plans": 3}
INVITE_HOURS = 24
JOIN_ATTEMPTS = (10, 600)  # attempts per seconds


class ServiceError(Exception):
    def __init__(self, code, status=400, **details):
        super().__init__(code)
        self.code, self.status, self.details = code, status, details


# ------------------------------------------------------------------ helpers
def initials(name):
    parts = [p for p in (name or "?").split() if p]
    if not parts:
        return "?"
    return (parts[-1][0] if len(parts) == 1 else parts[0][0] + parts[-1][0]).upper()


def first_name(name):
    parts = (name or "").split()
    return parts[-1] if parts else name


def user_plan(user_id):
    s = q1("SELECT * FROM subscriptions WHERE user_id=?", (user_id,))
    return s["plan"] if s and s["status"] == "active" else "free"


def entitlement(user_id):
    return VIP if user_plan(user_id) == "vip" else FREE


def user_public(u):
    if not u:
        return None
    return {"id": u["id"], "name": u["name"], "email": u["email"], "initials": initials(u["name"]),
            "provider": u["auth_provider"], "lang": u["lang"], "plan": user_plan(u["id"]),
            "settings": jload(u["settings_json"], {}), "created_at": u["created_at"]}


def notify(user_ids, ntype, payload):
    for uid in set(user_ids):
        nid = new_id("n")
        ex("INSERT INTO notifications(id,user_id,type,payload_json,read,created_at) VALUES(?,?,?,?,0,?)",
           (nid, uid, ntype, jdump(payload), now_iso()))
        realtime.publish([uid], "notification", {"id": nid, "type": ntype, "payload": payload, "created_at": now_iso()})


def log(actor_id, action, group_id=None, trip_id=None, summary=None):
    ex("INSERT INTO activity_logs(id,actor_id,group_id,trip_id,action,payload_summary,created_at) VALUES(?,?,?,?,?,?,?)",
       (new_id("l"), actor_id, group_id, trip_id, action, jdump(summary or {}), now_iso()))


def member_ids(group_id, active_only=True):
    sql = "SELECT user_id FROM group_members WHERE group_id=?" + (" AND member_status='active'" if active_only else "")
    return [r["user_id"] for r in q(sql, (group_id,))]


def publish_group(group_id, event, data):
    realtime.publish(member_ids(group_id), event, dict(data, group_id=group_id))


def today():
    return date.today().isoformat()


# -------------------------------------------------------------------- users
def create_user(name, email, password=None, provider="password", settings=None):
    uid = new_id("u")
    ex("INSERT INTO users(id,name,email,password_hash,auth_provider,lang,settings_json,created_at) VALUES(?,?,?,?,?,?,?,?)",
       (uid, name.strip(), (email or None) and email.strip().lower(),
        security.hash_password(password) if password else None, provider, "vi",
        jdump(settings or {"notify_invites": True, "notify_ready": True, "notify_comments": True,
                           "notify_updates": True, "share_free_text": False}), now_iso()))
    ex("INSERT OR IGNORE INTO subscriptions(user_id,plan,status,entitlement) VALUES(?,?,?,?)",
       (uid, "free", "active", jdump(FREE)))
    return q1("SELECT * FROM users WHERE id=?", (uid,))


def get_defaults(user_id):
    p = q1("SELECT * FROM user_preferences WHERE user_id=?", (user_id,))
    if not p:
        return None
    return {"interests": jload(p["interests"], []), "style": p["travel_style"], "pace": p["pace"],
            "transport": p["transport"], "avoid": jload(p["avoid"], []), "budget_amount": p["budget_per_person"],
            "updated_at": p["updated_at"]}


def save_defaults(user_id, raw):
    pr = engine.normalize_prefs(raw)
    ex("""INSERT INTO user_preferences(user_id,interests,travel_style,pace,transport,avoid,budget_per_person,updated_at)
          VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET interests=excluded.interests,
          travel_style=excluded.travel_style, pace=excluded.pace, transport=excluded.transport, avoid=excluded.avoid,
          budget_per_person=excluded.budget_per_person, updated_at=excluded.updated_at""",
       (user_id, jdump(raw.get("interests") or []), pr["style"], pr["pace"], pr["transport"], jdump(pr["avoid"]),
        pr["budget"], now_iso()))
    return get_defaults(user_id)


# -------------------------------------------------------------------- trips
def validate_trip_basics(p, need_travelers=True):
    errs = {}
    dest = catalog.find_destination(p.get("destination") or "")
    if not p.get("destination"):
        errs["destination"] = "required"
    elif not dest:
        errs["destination"] = "unsupported_destination"
    try:
        s = date.fromisoformat(p.get("start_date") or "")
    except ValueError:
        s = None
        errs["start_date"] = "required"
    try:
        e = date.fromisoformat(p.get("end_date") or "")
    except ValueError:
        e = None
        errs["end_date"] = "required"
    if s and e:
        if e < s:
            errs["end_date"] = "date_order"
        elif (e - s).days + 1 > engine.MAX_DAYS:
            errs["end_date"] = "too_long"
        if s.isoformat() < today():
            errs["start_date"] = "in_past"
    if need_travelers:
        try:
            t = int(p.get("travelers") or 1)
            if t < 1 or t > 20:
                errs["travelers"] = "range"
        except (TypeError, ValueError):
            errs["travelers"] = "range"
    return dest, errs


def create_personal_trip(user, p):
    dest, errs = validate_trip_basics(p)
    errs.update(engine.validate_prefs(p))
    if errs:
        raise ServiceError("validation", 422, fields=errs)
    travelers = int(p.get("travelers") or 1)
    tid = new_id("t")
    title = (p.get("title") or "").strip() or catalog.DESTINATIONS[dest]["vi"]
    prefs = {k: p.get(k) for k in ("interests", "style", "pace", "transport", "avoid", "special",
                                   "budget_amount", "budget_mode", "currency", "budget_hard")}
    budget = engine.normalize_prefs(prefs, travelers)["budget"]
    ex("""INSERT INTO trips(id,owner_id,trip_type,title,destination,start_date,end_date,travelers,budget_amount,
          budget_mode,currency,prefs_json,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
       (tid, user["id"], "personal", title[:120], dest, p["start_date"], p["end_date"], travelers, budget,
        p.get("budget_mode") or "per_person", p.get("currency") or "VND", jdump(prefs), "draft", now_iso(), now_iso()))
    log(user["id"], "trip.created", trip_id=tid)
    return q1("SELECT * FROM trips WHERE id=?", (tid,))


def trip_access(trip_id, user_id):
    t = q1("SELECT * FROM trips WHERE id=?", (trip_id,))
    if not t:
        raise ServiceError("not_found", 404)
    if t["trip_type"] == "personal":
        if t["owner_id"] != user_id:
            raise ServiceError("forbidden", 403)
        return t, None, None
    g = q1("SELECT * FROM groups WHERE trip_id=?", (trip_id,))
    m = q1("SELECT * FROM group_members WHERE group_id=? AND user_id=?", (g["id"], user_id)) if g else None
    if not m or m["member_status"] != "active":
        if not (m and g["room_status"] == "finalized"):
            raise ServiceError("forbidden", 403)
    return t, g, m


def options_for_trip(trip_id, include_superseded=False):
    sql = "SELECT * FROM itinerary_options WHERE trip_id=?" + ("" if include_superseded else " AND status!='superseded'")
    return q(sql + " ORDER BY created_at DESC, option_number", (trip_id,))


def option_card(o):
    d = jload(o["data_json"], {})
    return {"id": o["id"], "option_number": o["option_number"], "title": jload(o["title_json"]),
            "description": jload(o["description_json"]), "status": o["status"], "version": o["version"],
            "pace": d.get("pace"), "style": d.get("style"), "per_person": d.get("budget", {}).get("per_person"),
            "group_total": d.get("budget", {}).get("group_total"), "highlights": d.get("highlights", []),
            "suggested_members": d.get("suggested_members", []), "fit": d.get("fit"),
            "compatibility": d.get("compatibility", []), "interests": d.get("interests", []),
            "days": len(d.get("days", [])), "engine": d.get("engine"), "updated_at": o["updated_at"],
            "activity_count": sum(len(x["activities"]) for x in d.get("days", [])),
            "unverified": d.get("unverified", 0)}


def trip_card(t, user_id):
    g = q1("SELECT * FROM groups WHERE trip_id=?", (t["id"],))
    out = {"id": t["id"], "type": t["trip_type"], "title": t["title"], "destination": t["destination"],
           "destination_name": {"vi": catalog.DESTINATIONS[t["destination"]]["vi"],
                                "en": catalog.DESTINATIONS[t["destination"]]["en"]},
           "start_date": t["start_date"], "end_date": t["end_date"], "travelers": t["travelers"],
           "status": t["status"], "archived": bool(t["archived"]), "updated_at": t["updated_at"],
           "owner_id": t["owner_id"], "is_past": t["end_date"] < today(),
           "finalized_option_id": t["finalized_option_id"]}
    opts = options_for_trip(t["id"])
    out["option_ids"] = [o["id"] for o in opts]
    if g:
        mem = q("""SELECT gm.user_id, gm.role, u.name FROM group_members gm JOIN users u ON u.id=gm.user_id
                   WHERE gm.group_id=? AND gm.member_status='active' ORDER BY gm.joined_at""", (g["id"],))
        out["group"] = {"id": g["id"], "room_status": g["room_status"], "leader_id": g["leader_id"],
                        "member_count": len(mem), "max_members": g["max_members"],
                        "members": [{"id": m["user_id"], "name": m["name"], "initials": initials(m["name"])} for m in mem[:6]],
                        "is_leader": g["leader_id"] == user_id}
    return out


def list_trips(user_id, flt="all"):
    rows = q("""SELECT DISTINCT t.* FROM trips t LEFT JOIN groups g ON g.trip_id=t.id
                LEFT JOIN group_members gm ON gm.group_id=g.id AND gm.user_id=?
                WHERE (t.trip_type='personal' AND t.owner_id=?)
                   OR (t.trip_type='group' AND gm.user_id IS NOT NULL
                       AND (gm.member_status='active' OR g.room_status='finalized'))
                ORDER BY t.start_date""", (user_id, user_id))
    cards = [trip_card(t, user_id) for t in rows]
    if flt == "archived":
        return [c for c in cards if c["archived"]]
    cards = [c for c in cards if not c["archived"]]
    if flt == "personal":
        cards = [c for c in cards if c["type"] == "personal"]
    elif flt == "group":
        cards = [c for c in cards if c["type"] == "group"]
    elif flt == "upcoming":
        cards = [c for c in cards if not c["is_past"]]
    elif flt == "past":
        cards = sorted([c for c in cards if c["is_past"]], key=lambda c: c["end_date"], reverse=True)
    return cards


# ------------------------------------------------------------------- groups
def create_group(user, p):
    dest, errs = validate_trip_basics(p, need_travelers=False)
    if not (p.get("title") or "").strip():
        errs["title"] = "required"
    try:
        mm = int(p.get("max_members") or 6)
        if mm < 2 or mm > 15:
            errs["max_members"] = "range"
    except (TypeError, ValueError):
        errs["max_members"] = "range"
        mm = 6
    if errs:
        raise ServiceError("validation", 422, fields=errs)
    tid, gid = new_id("t"), new_id("g")
    with tx():
        ex("""INSERT INTO trips(id,owner_id,trip_type,title,destination,start_date,end_date,travelers,prefs_json,status,
              created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
           (tid, user["id"], "group", p["title"].strip()[:120], dest, p["start_date"], p["end_date"], mm, "{}",
            "collecting", now_iso(), now_iso()))
        ex("""INSERT INTO groups(id,trip_id,leader_id,group_name,max_members,room_status,notes,created_at)
              VALUES(?,?,?,?,?,?,?,?)""",
           (gid, tid, user["id"], p["title"].strip()[:120], mm, "open", (p.get("notes") or "")[:600], now_iso()))
        ex("""INSERT INTO group_members(id,group_id,user_id,role,joined_at,member_status,ready_status,can_edit)
              VALUES(?,?,?,?,?,?,?,?)""", (new_id("m"), gid, user["id"], "leader", now_iso(), "active", 0, 1))
    code = issue_code(gid, actor=user["id"])
    log(user["id"], "group.created", gid, tid)
    return q1("SELECT * FROM groups WHERE id=?", (gid,)), code


def issue_code(group_id, hours=INVITE_HOURS, actor=None, code=None):
    g = q1("SELECT * FROM groups WHERE id=?", (group_id,))
    ex("UPDATE invitation_codes SET revoked_at=? WHERE group_id=? AND revoked_at IS NULL", (now_iso(), group_id))
    for _ in range(10):
        c = code or security.random_code()
        if not q1("SELECT 1 FROM invitation_codes WHERE code_hash=? AND revoked_at IS NULL", (security.code_hash(c),)):
            break
    iid = new_id("i")
    ex("""INSERT INTO invitation_codes(id,group_id,code_hash,code_sealed,expires_at,usage_limit,used_count,created_at)
          VALUES(?,?,?,?,?,?,0,?)""",
       (iid, group_id, security.code_hash(c), security.seal_code(iid, c), db.iso_in(hours=hours),
        g["max_members"] * 2, now_iso()))
    if actor:
        log(actor, "invite.issued", group_id, g["trip_id"])
    return {"code": c, "expires_at": db.iso_in(hours=hours)}


def current_invite(group_id):
    i = q1("SELECT * FROM invitation_codes WHERE group_id=? AND revoked_at IS NULL ORDER BY created_at DESC", (group_id,))
    if not i:
        return None
    return {"code": security.unseal_code(i["id"], i["code_sealed"]), "expires_at": i["expires_at"],
            "expired": db.parse_iso(i["expires_at"]) < db.now(), "usage_limit": i["usage_limit"],
            "used_count": i["used_count"]}


def extend_code(group_id, hours=INVITE_HOURS):
    i = q1("SELECT * FROM invitation_codes WHERE group_id=? AND revoked_at IS NULL ORDER BY created_at DESC", (group_id,))
    if not i:
        return issue_code(group_id)
    ex("UPDATE invitation_codes SET expires_at=? WHERE id=?", (db.iso_in(hours=hours), i["id"]))
    return current_invite(group_id)


def _rate_limit(user_key, limits=None):
    limit, window = limits or JOIN_ATTEMPTS
    since = db.iso_in(seconds=-window)
    ex("DELETE FROM join_attempts WHERE created_at<?", (since,))
    n = q1("SELECT COUNT(*) n FROM join_attempts WHERE user_key=? AND created_at>=?", (user_key, since))["n"]
    if n >= limit:
        raise ServiceError("rate_limited", 429)
    ex("INSERT INTO join_attempts(user_key,created_at) VALUES(?,?)", (user_key, now_iso()))


def resolve_code(raw, user_key, user_id=None):
    _rate_limit(user_key)
    code = security.normalize_code(raw)
    if len(code) != 9:
        raise ServiceError("code_not_found", 404)
    inv = q1("SELECT * FROM invitation_codes WHERE code_hash=? ORDER BY created_at DESC", (security.code_hash(code),))
    if not inv:
        raise ServiceError("code_not_found", 404)
    g = q1("SELECT * FROM groups WHERE id=?", (inv["group_id"],))
    t = q1("SELECT * FROM trips WHERE id=?", (g["trip_id"],))
    leader = q1("SELECT name FROM users WHERE id=?", (g["leader_id"],))
    count = len(member_ids(g["id"]))
    summary = {"group_id": g["id"], "trip_id": t["id"], "title": t["title"], "destination": t["destination"],
               "destination_name": {"vi": catalog.DESTINATIONS[t["destination"]]["vi"],
                                    "en": catalog.DESTINATIONS[t["destination"]]["en"]},
               "start_date": t["start_date"], "end_date": t["end_date"], "leader_name": leader["name"],
               "member_count": count, "max_members": g["max_members"], "room_status": g["room_status"]}
    if user_id:
        m = q1("SELECT * FROM group_members WHERE group_id=? AND user_id=?", (g["id"], user_id))
        if m and m["member_status"] == "active":
            raise ServiceError("already_member", 409, group=summary)
    if g["room_status"] in ("closed", "finalized"):
        raise ServiceError("room_closed", 409)
    if inv["revoked_at"] or db.parse_iso(inv["expires_at"]) < db.now():
        raise ServiceError("code_expired", 410, leader_name=leader["name"])
    if count >= g["max_members"] or inv["used_count"] >= inv["usage_limit"]:
        raise ServiceError("room_full", 409, max_members=g["max_members"])
    return inv, g, summary


def join_group(user, raw_code, user_key):
    inv, g, summary = resolve_code(raw_code, user_key, user["id"])
    with tx():
        m = q1("SELECT * FROM group_members WHERE group_id=? AND user_id=?", (g["id"], user["id"]))
        if m:  # re-join after leaving
            ex("UPDATE group_members SET member_status='active', ready_status=0, role='member', joined_at=? WHERE id=?",
               (now_iso(), m["id"]))
        else:
            ex("""INSERT INTO group_members(id,group_id,user_id,role,joined_at,member_status,ready_status,can_edit)
                  VALUES(?,?,?,?,?,?,?,?)""", (new_id("m"), g["id"], user["id"], "member", now_iso(), "active", 0, 0))
        ex("UPDATE invitation_codes SET used_count=used_count+1 WHERE id=?", (inv["id"],))
    log(user["id"], "member.joined", g["id"], g["trip_id"], {"name": user["name"]})
    publish_group(g["id"], "member.joined", {"user_id": user["id"], "name": user["name"]})
    notify([uid for uid in member_ids(g["id"]) if uid != user["id"]], "member_joined",
           {"group_id": g["id"], "trip_title": summary["title"], "name": user["name"]})
    _check_ready_transition(g["id"], was_all=None)
    return summary


def membership(group_id, user_id):
    g = q1("SELECT * FROM groups WHERE id=?", (group_id,))
    if not g:
        raise ServiceError("not_found", 404)
    m = q1("SELECT * FROM group_members WHERE group_id=? AND user_id=?", (group_id, user_id))
    if not m or m["member_status"] != "active":
        raise ServiceError("forbidden", 403)
    return g, m


def require_leader(group_id, user_id):
    g, m = membership(group_id, user_id)
    if g["leader_id"] != user_id:
        raise ServiceError("leader_only", 403)
    return g, m


def ready_state(group_id):
    rows = q("""SELECT gm.*, u.name, u.settings_json, s.submission_status, s.version AS sub_version,
                       s.updated_at AS sub_updated, s.preference_json
                FROM group_members gm JOIN users u ON u.id=gm.user_id
                LEFT JOIN member_submissions s ON s.group_id=gm.group_id AND s.user_id=gm.user_id
                WHERE gm.group_id=? AND gm.member_status='active' ORDER BY gm.role='leader' DESC, gm.joined_at""",
             (group_id,))
    ready = [r for r in rows if r["ready_status"]]
    return {"active": len(rows), "ready": len(ready), "all_ready": bool(rows) and len(ready) == len(rows),
            "waiting": [{"id": r["user_id"], "name": r["name"]} for r in rows if not r["ready_status"]], "rows": rows}


def shared_note(row):
    """Special-request text a member chose to show the group (Profile > Privacy); otherwise None."""
    if row["submission_status"] != "submitted" or not jload(row["settings_json"], {}).get("share_free_text"):
        return None
    return (jload(row["preference_json"], {}).get("special") or "").strip() or None


def _check_ready_transition(group_id, was_all):
    st = ready_state(group_id)
    if st["all_ready"] and was_all is False:
        g = q1("SELECT * FROM groups WHERE id=?", (group_id,))
        publish_group(group_id, "group.ready_to_generate", {"ready": st["ready"], "active": st["active"]})
        notify([g["leader_id"]], "all_ready", {"group_id": group_id, "trip_title": g["group_name"]})
    return st


def room(group_id, viewer):
    g, m = membership(group_id, viewer["id"])
    t = q1("SELECT * FROM trips WHERE id=?", (g["trip_id"],))
    st = ready_state(group_id)
    is_leader = g["leader_id"] == viewer["id"]
    members = []
    for r in st["rows"]:
        members.append({"id": r["user_id"], "name": r["name"], "initials": initials(r["name"]), "role": r["role"],
                        "is_leader": r["user_id"] == g["leader_id"], "can_edit": bool(r["can_edit"]),
                        "submitted": r["submission_status"] == "submitted",
                        "draft": r["submission_status"] == "draft",
                        "ready": bool(r["ready_status"]), "joined_at": r["joined_at"], "shared_note": shared_note(r),
                        "status": "ready" if r["ready_status"] else ("submitted" if r["submission_status"] == "submitted" else "pending")})
    my_sub = q1("SELECT * FROM member_submissions WHERE group_id=? AND user_id=?", (group_id, viewer["id"]))
    gen = q1("SELECT * FROM generations WHERE group_id=? ORDER BY started_at DESC", (group_id,))
    opts = [option_card(o) for o in options_for_trip(t["id"])]
    # Plans are a snapshot: preferences sent after the last completed generation are not in them.
    last_done = q1("SELECT started_at, snapshot_json FROM generations WHERE group_id=? AND status='completed' "
                   "ORDER BY started_at DESC", (group_id,)) if opts else None
    if last_done:
        snap_ids = {e.get("user_id") for e in (jload(last_done["snapshot_json"], {}) or {}).get("entries", [])}
        for mem, r in zip(members, st["rows"]):
            mem["after_plan"] = bool(r["submission_status"] == "submitted" and (
                (r["sub_updated"] or "") > last_done["started_at"] or (snap_ids and r["user_id"] not in snap_ids)))
    ent = entitlement(g["leader_id"])
    used = q1("SELECT COUNT(*) n FROM generations WHERE group_id=? AND counted=1", (group_id,))["n"]
    feed = q("""SELECT l.*, u.name FROM activity_logs l LEFT JOIN users u ON u.id=l.actor_id
                WHERE l.group_id=? ORDER BY l.created_at DESC LIMIT 12""", (group_id,))
    return {
        "group": {"id": g["id"], "name": g["group_name"], "room_status": g["room_status"], "leader_id": g["leader_id"],
                  "max_members": g["max_members"], "notes": g["notes"], "ready_deadline": g["ready_deadline"],
                  "created_at": g["created_at"]},
        "trip": trip_card(t, viewer["id"]),
        "members": members,
        "ready": {"active": st["active"], "ready": st["ready"], "all_ready": st["all_ready"],
                  "waiting": st["waiting"]},
        "me": {"id": viewer["id"], "is_leader": is_leader, "can_edit": bool(m["can_edit"]) or is_leader,
               "ready": bool(m["ready_status"]),
               "submission_status": my_sub["submission_status"] if my_sub else None,
               "submission_updated": my_sub["updated_at"] if my_sub else None},
        "invite": current_invite(group_id) if is_leader else None,
        "generation": generation_public(gen) if gen else None,
        "options": opts,
        "plans_at": last_done["started_at"] if last_done else None,
        "after_plan": [{"id": mem["id"], "name": mem["name"]} for mem in members if mem.get("after_plan")],
        "quota": {"used": used, "limit": ent["group_generations"], "max_plans": ent["max_plans"],
                  "plan": user_plan(g["leader_id"])},
        "feed": [{"action": f["action"], "name": f["name"], "summary": jload(f["payload_summary"], {}),
                  "created_at": f["created_at"]} for f in feed],
        "engine": ai.engine_name(),
    }


def get_submission(group_id, user_id):
    s = q1("SELECT * FROM member_submissions WHERE group_id=? AND user_id=?", (group_id, user_id))
    if not s:
        return None
    return {"preferences": jload(s["preference_json"], {}), "status": s["submission_status"], "version": s["version"],
            "updated_at": s["updated_at"],
            "history": [{"version": h["version"], "status": h["submission_status"], "created_at": h["created_at"]}
                        for h in q("SELECT * FROM submission_history WHERE submission_id=? ORDER BY version DESC LIMIT 10",
                                   (s["id"],))]}


def save_submission(group_id, user, prefs, status):
    g, m = membership(group_id, user["id"])
    if g["room_status"] in ("closed", "finalized"):
        raise ServiceError("room_closed", 409)
    errs = engine.validate_prefs(prefs, require_budget=(status == "submitted"))
    if status == "submitted" and not (prefs.get("interests") or []):
        errs["interests"] = "required"
    if errs:
        raise ServiceError("validation", 422, fields=errs)
    clean = {k: prefs.get(k) for k in ("interests", "style", "pace", "transport", "avoid", "special",
                                       "budget_amount", "budget_hard", "currency")}
    was_all = ready_state(group_id)["all_ready"]
    reset_ready = False
    with tx():
        s = q1("SELECT * FROM member_submissions WHERE group_id=? AND user_id=?", (group_id, user["id"]))
        if s:
            changed = jload(s["preference_json"], {}) != clean or s["submission_status"] != status
            ver = s["version"] + (1 if changed else 0)
            ex("UPDATE member_submissions SET preference_json=?, submission_status=?, version=?, updated_at=? WHERE id=?",
               (jdump(clean), status, ver, now_iso(), s["id"]))
            sid = s["id"]
            if changed and m["ready_status"]:
                ex("UPDATE group_members SET ready_status=0, ready_at=NULL WHERE id=?", (m["id"],))
                reset_ready = True
        else:
            sid, ver, changed = new_id("s"), 1, True
            ex("""INSERT INTO member_submissions(id,group_id,user_id,preference_json,submission_status,version,updated_at)
                  VALUES(?,?,?,?,?,?,?)""", (sid, group_id, user["id"], jdump(clean), status, 1, now_iso()))
        if changed:
            ex("""INSERT INTO submission_history(id,submission_id,version,preference_json,submission_status,created_at)
                  VALUES(?,?,?,?,?,?)""", (new_id("h"), sid, ver, jdump(clean), status, now_iso()))
    if status == "submitted":
        log(user["id"], "submission.updated", group_id, g["trip_id"], {"version": ver})
    publish_group(group_id, "submission.updated", {"user_id": user["id"], "status": status, "ready_reset": reset_ready})
    if reset_ready:
        publish_group(group_id, "member.ready", {"user_id": user["id"], "ready": False})
    return {"submission": get_submission(group_id, user["id"]), "ready_reset": reset_ready, "was_all": was_all}


def set_ready(group_id, user, ready):
    g, m = membership(group_id, user["id"])
    if g["room_status"] in ("closed", "finalized"):
        raise ServiceError("room_closed", 409)
    s = q1("SELECT * FROM member_submissions WHERE group_id=? AND user_id=?", (group_id, user["id"]))
    if ready and (not s or s["submission_status"] != "submitted"):
        raise ServiceError("submission_required", 409)
    was_all = ready_state(group_id)["all_ready"]
    ex("UPDATE group_members SET ready_status=?, ready_at=? WHERE id=?", (1 if ready else 0, now_iso() if ready else None, m["id"]))
    log(user["id"], "member.ready" if ready else "member.unready", group_id, g["trip_id"], {"name": user["name"]})
    publish_group(group_id, "member.ready", {"user_id": user["id"], "name": user["name"], "ready": bool(ready)})
    return _check_ready_transition(group_id, was_all)


def remind(group_id, leader, deadline=None):
    g, _ = require_leader(group_id, leader["id"])
    st = ready_state(group_id)
    if deadline:
        ex("UPDATE groups SET ready_deadline=? WHERE id=?", (deadline, group_id))
    ids = [w["id"] for w in st["waiting"] if w["id"] != leader["id"]]
    notify(ids, "ready_reminder", {"group_id": group_id, "trip_title": g["group_name"], "from": leader["name"],
                                   "deadline": deadline})
    log(leader["id"], "reminder.sent", group_id, g["trip_id"], {"count": len(ids)})
    return {"reminded": len(ids)}


def remove_member(group_id, leader, user_id):
    g, _ = require_leader(group_id, leader["id"])
    if user_id == leader["id"]:
        raise ServiceError("cannot_remove_self", 409)
    ex("UPDATE group_members SET member_status='inactive', ready_status=0 WHERE group_id=? AND user_id=?",
       (group_id, user_id))
    u = q1("SELECT name FROM users WHERE id=?", (user_id,))
    log(leader["id"], "member.removed", group_id, g["trip_id"], {"name": u and u["name"]})
    publish_group(group_id, "member.left", {"user_id": user_id})
    realtime.publish([user_id], "member.left", {"user_id": user_id, "group_id": group_id})
    _check_ready_transition(group_id, False)


def set_editor(group_id, leader, user_id, can_edit):
    g, _ = require_leader(group_id, leader["id"])
    ex("UPDATE group_members SET can_edit=? WHERE group_id=? AND user_id=?", (1 if can_edit else 0, group_id, user_id))
    publish_group(group_id, "member.updated", {"user_id": user_id, "can_edit": bool(can_edit)})


def transfer_leader(group_id, leader, user_id):
    g, _ = require_leader(group_id, leader["id"])
    target = q1("SELECT * FROM group_members WHERE group_id=? AND user_id=? AND member_status='active'", (group_id, user_id))
    if not target:
        raise ServiceError("not_member", 404)
    with tx():
        ex("UPDATE groups SET leader_id=? WHERE id=?", (user_id, group_id))
        ex("UPDATE group_members SET role='member' WHERE group_id=? AND user_id=?", (group_id, leader["id"]))
        ex("UPDATE group_members SET role='leader', can_edit=1 WHERE group_id=? AND user_id=?", (group_id, user_id))
        ex("UPDATE trips SET owner_id=? WHERE id=?", (user_id, g["trip_id"]))
    u = q1("SELECT name FROM users WHERE id=?", (user_id,))
    log(leader["id"], "leader.transferred", group_id, g["trip_id"], {"name": u["name"]})
    publish_group(group_id, "member.updated", {"leader_id": user_id})
    notify([user_id], "leader_transferred", {"group_id": group_id, "trip_title": g["group_name"], "from": leader["name"]})


def leave_group(group_id, user, successor_id=None):
    g, m = membership(group_id, user["id"])
    if g["leader_id"] == user["id"]:
        others = [uid for uid in member_ids(group_id) if uid != user["id"]]
        if not others:
            raise ServiceError("last_member_close_instead", 409)
        if not successor_id:
            raise ServiceError("leader_must_transfer", 409)
        transfer_leader(group_id, user, successor_id)
    ex("UPDATE group_members SET member_status='inactive', ready_status=0 WHERE id=?", (m["id"],))
    log(user["id"], "member.left", group_id, g["trip_id"], {"name": user["name"]})
    publish_group(group_id, "member.left", {"user_id": user["id"], "name": user["name"]})
    _check_ready_transition(group_id, False)


def close_group(group_id, leader):
    g, _ = require_leader(group_id, leader["id"])
    ex("UPDATE groups SET room_status='closed' WHERE id=?", (group_id,))
    ex("UPDATE invitation_codes SET revoked_at=? WHERE group_id=? AND revoked_at IS NULL", (now_iso(), group_id))
    ex("UPDATE trips SET status='closed', updated_at=? WHERE id=?", (now_iso(), g["trip_id"]))
    log(leader["id"], "room.closed", group_id, g["trip_id"])
    publish_group(group_id, "room.updated", {"room_status": "closed"})


# --------------------------------------------------------------- generation
def generation_public(gen):
    return {"id": gen["id"], "status": gen["status"], "stage": gen["stage"], "plan_count": gen["plan_count"],
            "error": gen["error"], "engine": gen["engine"], "started_at": gen["started_at"],
            "finished_at": gen["finished_at"], "synthesis": jload(gen["synthesis_json"]),
            "excluded": jload(gen["snapshot_json"], {}).get("excluded", [])}


def group_entries(group_id, include):
    st = ready_state(group_id)
    entries, excluded = [], []
    for r in st["rows"]:
        s = q1("SELECT * FROM member_submissions WHERE group_id=? AND user_id=?", (group_id, r["user_id"]))
        usable = s and s["submission_status"] == "submitted"
        if include == "ready_only" and not r["ready_status"]:
            excluded.append({"user_id": r["user_id"], "name": r["name"]})
            continue
        if not usable:
            excluded.append({"user_id": r["user_id"], "name": r["name"]})
            continue
        entries.append({"user_id": r["user_id"], "name": r["name"], "version": s["version"],
                        "prefs": engine.normalize_prefs(jload(s["preference_json"], {}))})
    return entries, excluded, st


def synthesis_preview(group_id, leader, include="all"):
    g, _ = require_leader(group_id, leader["id"])
    t = q1("SELECT * FROM trips WHERE id=?", (g["trip_id"],))
    entries, excluded, st = group_entries(group_id, include)
    if include == "all" and not st["all_ready"]:
        raise ServiceError("not_all_ready", 409, waiting=st["waiting"])
    if not entries:
        raise ServiceError("no_ready_members", 409)
    syn = engine.synthesize(entries, {"start": t["start_date"], "end": t["end_date"]})
    ids = {e["user_id"] for e in entries}
    syn["shared_notes"] = [{"name": r["name"], "text": n} for r in st["rows"] if r["user_id"] in ids and (n := shared_note(r))]
    ent = entitlement(g["leader_id"])
    used = q1("SELECT COUNT(*) n FROM generations WHERE group_id=? AND counted=1", (group_id,))["n"]
    return {"synthesis": syn, "excluded": excluded, "included": [{"user_id": e["user_id"], "name": e["name"]} for e in entries],
            "quota": {"used": used, "limit": ent["group_generations"], "remaining": max(0, ent["group_generations"] - used),
                      "max_plans": ent["max_plans"], "plan": user_plan(g["leader_id"])}}


def personal_quota(user_id):
    ent = entitlement(user_id)
    month = today()[:7]
    used = q1("""SELECT COUNT(*) n FROM generations g JOIN trips t ON t.id=g.trip_id
                 WHERE t.owner_id=? AND g.group_id IS NULL AND g.counted=1 AND substr(g.started_at,1,7)=?""",
              (user_id, month))["n"]
    return {"used": used, "limit": ent["personal_per_month"], "remaining": max(0, ent["personal_per_month"] - used)}


def start_personal_generation(trip, user):
    if trip["owner_id"] != user["id"]:
        raise ServiceError("forbidden", 403)
    qt = personal_quota(user["id"])
    if qt["remaining"] <= 0:
        raise ServiceError("quota_exceeded", 402, quota=qt)
    running = q1("SELECT * FROM generations WHERE trip_id=? AND status='running'", (trip["id"],))
    if running:
        return running["id"]
    prefs = jload(trip["prefs_json"], {})
    entry = {"user_id": user["id"], "name": user["name"], "version": 1,
             "prefs": engine.normalize_prefs(prefs, trip["travelers"])}
    snapshot = {"kind": "personal", "trip_id": trip["id"], "dest": trip["destination"], "start_date": trip["start_date"],
                "end_date": trip["end_date"], "travelers": trip["travelers"], "plan_count": 1, "entries": [entry],
                "excluded": [], "seed": trip["id"]}
    return _launch(trip, None, user, snapshot, None)


def start_group_generation(group_id, leader, plan_count, include):
    g, _ = require_leader(group_id, leader["id"])
    if g["room_status"] in ("closed", "finalized"):
        raise ServiceError("room_closed", 409)
    t = q1("SELECT * FROM trips WHERE id=?", (g["trip_id"],))
    ent = entitlement(g["leader_id"])
    try:
        plan_count = int(plan_count)
    except (TypeError, ValueError):
        plan_count = 1
    if plan_count not in (1, 2, 3):
        raise ServiceError("invalid_plan_count", 422)
    if plan_count > ent["max_plans"]:
        raise ServiceError("vip_required", 402)
    used = q1("SELECT COUNT(*) n FROM generations WHERE group_id=? AND counted=1", (group_id,))["n"]
    if used >= ent["group_generations"]:
        raise ServiceError("quota_exceeded", 402)
    running = q1("SELECT * FROM generations WHERE group_id=? AND status='running'", (group_id,))
    if running:
        return running["id"]
    entries, excluded, st = group_entries(group_id, include)
    if include != "ready_only" and not st["all_ready"]:
        raise ServiceError("not_all_ready", 409, waiting=st["waiting"])
    if not entries:
        raise ServiceError("no_ready_members", 409)
    syn = engine.synthesize(entries, {"start": t["start_date"], "end": t["end_date"]})
    snapshot = {"kind": "group", "trip_id": t["id"], "group_id": group_id, "dest": t["destination"],
                "start_date": t["start_date"], "end_date": t["end_date"], "travelers": len(entries),
                "plan_count": plan_count, "entries": entries, "excluded": excluded, "mode": include,
                "seed": t["id"] + str(used)}
    ex("UPDATE groups SET room_status='generating', plan_count=? WHERE id=?", (plan_count, group_id))
    return _launch(t, g, leader, snapshot, syn)


def _launch(trip, group, user, snapshot, synthesis):
    gid = new_id("gen")
    ex("""INSERT INTO generations(id,trip_id,group_id,requested_by,plan_count,status,stage,snapshot_json,synthesis_json,
          engine,counted,started_at) VALUES(?,?,?,?,?,?,?,?,?,?,0,?)""",
       (gid, trip["id"], group and group["id"], user["id"], snapshot["plan_count"], "running", "check",
        jdump(snapshot), jdump(synthesis) if synthesis else None, ai.engine_name(), now_iso()))
    ex("UPDATE trips SET status=CASE WHEN status IN ('draft','collecting','planned','saved') THEN status ELSE status END, updated_at=? WHERE id=?",
       (now_iso(), trip["id"]))
    targets = member_ids(group["id"]) if group else [user["id"]]
    realtime.publish(targets, "generation.started", {"generation_id": gid, "trip_id": trip["id"],
                                                     "group_id": group and group["id"], "plan_count": snapshot["plan_count"]})
    if group:
        log(user["id"], "generation.started", group["id"], trip["id"], {"plans": snapshot["plan_count"]})
    th = threading.Thread(target=run_generation, args=(gid,), daemon=True)
    th.start()
    return gid


def run_generation(gen_id):
    gen = q1("SELECT * FROM generations WHERE id=?", (gen_id,))
    snap = jload(gen["snapshot_json"])
    group_id = gen["group_id"]
    targets = member_ids(group_id) if group_id else [gen["requested_by"]]
    last = [time.time()]

    def progress(stage):
        elapsed = time.time() - last[0]
        if elapsed < 0.55:
            time.sleep(0.55 - elapsed)
        last[0] = time.time()
        ex("UPDATE generations SET stage=? WHERE id=?", (stage, gen_id))
        realtime.publish(targets, "generation.progress", {"generation_id": gen_id, "stage": stage,
                                                          "trip_id": gen["trip_id"], "group_id": group_id})

    try:
        plans = ai.generate_plans(snap, progress)
        progress("done")
        with tx():
            ex("UPDATE itinerary_options SET status='superseded' WHERE trip_id=? AND status='active'", (gen["trip_id"],))
            ids = []
            for i, data in enumerate(plans):
                oid = new_id("o")
                ids.append(oid)
                ex("""INSERT INTO itinerary_options(id,trip_id,group_id,generation_id,option_number,title_json,
                      description_json,status,version,data_json,updated_by,updated_at,created_at)
                      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                   (oid, gen["trip_id"], group_id, gen_id, i + 1, jdump(data["title"]), jdump(data["description"]),
                    "active", 1, jdump(data), gen["requested_by"], now_iso(), now_iso()))
                ex("""INSERT INTO itinerary_versions(id,option_id,version,data_json,author_id,note,created_at)
                      VALUES(?,?,?,?,?,?,?)""", (new_id("v"), oid, 1, jdump(data), gen["requested_by"], "ai", now_iso()))
                _store_budget_items(oid, data)
            ex("UPDATE generations SET status='completed', stage='done', counted=1, engine=?, finished_at=? WHERE id=?",
               (plans[0].get("engine", "local") if plans else "local", now_iso(), gen_id))
            ex("UPDATE trips SET status=CASE WHEN status='saved' THEN 'saved' ELSE 'planned' END, updated_at=? WHERE id=?",
               (now_iso(), gen["trip_id"]))
            if group_id:
                ex("UPDATE groups SET room_status='reviewing' WHERE id=?", (group_id,))
        if group_id:
            log(gen["requested_by"], "generation.completed", group_id, gen["trip_id"], {"plans": len(ids)})
            notify([u for u in targets if u != gen["requested_by"]], "plans_ready",
                   {"group_id": group_id, "trip_title": q1("SELECT title FROM trips WHERE id=?", (gen["trip_id"],))["title"]})
        realtime.publish(targets, "generation.completed", {"generation_id": gen_id, "trip_id": gen["trip_id"],
                                                           "group_id": group_id, "option_ids": ids})
    except Exception as e:  # keep the snapshot, do not count quota, allow retry
        code = str(e) if isinstance(e, ai.AIError) else "internal"
        import logging
        logging.getLogger("wayplot").exception("generation failed")
        ex("UPDATE generations SET status='failed', error=?, counted=0, finished_at=? WHERE id=?", (code, now_iso(), gen_id))
        if group_id:
            ex("UPDATE groups SET room_status=CASE WHEN EXISTS(SELECT 1 FROM itinerary_options WHERE group_id=? AND status='active') THEN 'reviewing' ELSE 'open' END WHERE id=?",
               (group_id, group_id))
        realtime.publish(targets, "generation.failed", {"generation_id": gen_id, "trip_id": gen["trip_id"],
                                                        "group_id": group_id, "error": code})


def retry_generation(gen_id, user):
    gen = q1("SELECT * FROM generations WHERE id=?", (gen_id,))
    if not gen or gen["requested_by"] != user["id"] and not (
            gen["group_id"] and q1("SELECT 1 FROM groups WHERE id=? AND leader_id=?", (gen["group_id"], user["id"]))):
        raise ServiceError("forbidden", 403)
    if gen["status"] != "failed":
        raise ServiceError("not_failed", 409)
    snap = jload(gen["snapshot_json"])
    t = q1("SELECT * FROM trips WHERE id=?", (gen["trip_id"],))
    g = q1("SELECT * FROM groups WHERE id=?", (gen["group_id"],)) if gen["group_id"] else None
    if g:
        ex("UPDATE groups SET room_status='generating' WHERE id=?", (g["id"],))
    return _launch(t, g, user, snap, jload(gen["synthesis_json"]))


def _store_budget_items(option_id, data):
    ex("DELETE FROM budget_items WHERE itinerary_option_id=?", (option_id,))
    for cat, amount in (data.get("budget", {}).get("categories") or {}).items():
        ex("INSERT INTO budget_items(id,itinerary_option_id,category,amount,currency,assumption) VALUES(?,?,?,?,?,?)",
           (new_id("b"), option_id, cat, amount, "VND", None))


# ---------------------------------------------------------------- itineraries
def option_access(option_id, user):
    o = q1("SELECT * FROM itinerary_options WHERE id=?", (option_id,))
    if not o:
        raise ServiceError("not_found", 404)
    t, g, m = trip_access(o["trip_id"], user["id"])
    if t["trip_type"] == "personal":
        can_edit = o["status"] != "finalized"
        can_finalize = False
    else:
        is_leader = g["leader_id"] == user["id"]
        locked = o["status"] == "finalized" or g["room_status"] in ("finalized", "closed")
        can_edit = (is_leader or bool(m and m["can_edit"])) and not locked
        can_finalize = is_leader and not locked and o["status"] == "active"
    return o, t, g, m, {"can_edit": can_edit, "can_finalize": can_finalize,
                        "can_comment": t["trip_type"] == "group" and g["room_status"] != "closed",
                        "is_leader": bool(g and g["leader_id"] == user["id"]),
                        "can_save_trip": t["trip_type"] == "personal" and t["status"] != "saved"}


def profile_for_option(t, g, data):
    """Rebuild the planning profile used for refinements/alternatives."""
    if t["trip_type"] == "personal":
        entries = [{"user_id": t["owner_id"], "name": "", "prefs": engine.normalize_prefs(jload(t["prefs_json"], {}), t["travelers"])}]
    else:
        entries = [{"user_id": r["user_id"], "name": r["name"], "prefs": engine.normalize_prefs(jload(r["preference_json"], {}))}
                   for r in q("""SELECT s.*, u.name FROM member_submissions s JOIN users u ON u.id=s.user_id
                                  WHERE s.group_id=? AND s.submission_status='submitted'""", (g["id"],))]
        sug = set(data.get("suggested_members") or [])
        if sug:
            sub = [e for e in entries if e["user_id"] in sug]
            entries_for_prof = sub or entries
            prof = engine.aggregate_profile(entries_for_prof, entries)
            prof["pace"] = data.get("pace", prof["pace"])
            return prof, entries
    prof = engine.aggregate_profile(entries) if entries else engine.aggregate_profile(
        [{"user_id": "x", "name": "", "prefs": engine.normalize_prefs({})}])
    prof["pace"] = data.get("pace", prof["pace"])
    prof["transport"] = data.get("transport", prof["transport"])
    return prof, entries


def option_public(option_id, user):
    o, t, g, m, perms = option_access(option_id, user)
    data = jload(o["data_json"], {})
    versions = q("""SELECT v.version, v.note, v.created_at, u.name FROM itinerary_versions v
                    LEFT JOIN users u ON u.id=v.author_id WHERE v.option_id=? ORDER BY v.version DESC""", (o["id"],))
    siblings = [option_card(x) for x in options_for_trip(t["id"])]
    members = []
    if g:
        members = [{"id": r["user_id"], "name": r["name"], "initials": initials(r["name"]),
                    "is_leader": r["user_id"] == g["leader_id"]}
                   for r in q("""SELECT gm.user_id, u.name FROM group_members gm JOIN users u ON u.id=gm.user_id
                                 WHERE gm.group_id=? AND gm.member_status='active'""", (g["id"],))]
    ccount = q1("SELECT COUNT(*) n FROM comments WHERE itinerary_option_id=?", (o["id"],))["n"]
    return {"option": {"id": o["id"], "option_number": o["option_number"], "status": o["status"],
                       "version": o["version"], "title": jload(o["title_json"]), "description": jload(o["description_json"]),
                       "updated_at": o["updated_at"], "data": data},
            "trip": trip_card(t, user["id"]), "group_id": g and g["id"], "permissions": perms,
            "versions": [dict(v) for v in versions], "siblings": siblings, "members": members,
            "comment_count": ccount, "destination": catalog.destination_public(t["destination"])}


def sanitize_days(dest, days_in):
    """Accept edited days from the client but rebuild trusted fields."""
    out = []
    for i, d in enumerate(days_in or []):
        acts = []
        for a in d.get("activities") or []:
            pid = a.get("place_id")
            p = catalog.PLACES.get(pid) if pid else None
            base = {
                "id": str(a.get("id") or new_id("a"))[:24],
                "start": a.get("start") if engine.to_min(a.get("start")) is not None else "09:00",
                "duration": max(5, min(600, int(a.get("duration") or 60))),
                "pinned": bool(a.get("pinned")),
            }
            if p and p["dest"] == dest:
                act = engine.activity_from_place(p, base["start"])
                act.update(base)
                if isinstance(a.get("note"), dict):
                    act["note"] = {"vi": str(a["note"].get("vi", ""))[:300], "en": str(a["note"].get("en", ""))[:300]}
            elif a.get("kind") == "rest":
                act = engine.free_time(engine.to_min(base["start"]))
                act.update(base)
            elif a.get("kind") == "free":
                act = engine.free_meal(dest, "lunch" if engine.to_min(base["start"]) < 15 * 60 else "dinner",
                                       engine.to_min(base["start"]))
                act.update(base)
                if isinstance(a.get("name"), dict):
                    act["name"] = {"vi": str(a["name"].get("vi", ""))[:120], "en": str(a["name"].get("en", ""))[:120]}
            elif a.get("source") == "google-places" and a.get("verified") and a.get("lat") is not None:
                act = dict(engine.custom_activity(str((a.get("name") or {}).get("vi", ""))[:120]), **base)
                act.update({"kind": "custom", "lat": float(a["lat"]), "lng": float(a["lng"]), "verified": True,
                            "address": str(a.get("address", ""))[:200], "source": "google-places",
                            "note": {"vi": "Đã xác minh qua Google Places.", "en": "Verified via Google Places."}})
            else:
                name = a.get("name") or {}
                act = engine.custom_activity(str(name.get("vi") or name.get("en") or "Điểm dừng")[:120], base["start"],
                                             base["duration"], max(0, min(50_000_000, int(a.get("cost") or 0))))
                act.update(base)
            if a.get("kind") in ("visit", "meal", "free", "custom") and act.get("kind") != "free":
                act["cost"] = max(0, min(50_000_000, int(a.get("cost", act.get("cost", 0)) or 0)))
            acts.append(act)
        out.append({"day": i + 1, "date": d.get("date"), "theme": d.get("theme") or {"vi": "", "en": ""},
                    "activities": acts})
    return out


def recompute(o, t, g, data_in, user):
    data = copy.deepcopy(jload(o["data_json"], {}))
    if len(data_in.get("days") or []) != len(data.get("days") or []):
        raise ServiceError("invalid_days", 422)
    data["days"] = sanitize_days(t["destination"], data_in["days"])
    for nd, od in zip(data["days"], jload(o["data_json"], {}).get("days", [])):
        nd["date"] = od["date"]
        nd["start"] = od.get("start") or (od["activities"][0]["start"] if od.get("activities") else "08:30")
        if not nd.get("theme") or not nd["theme"].get("vi"):
            nd["theme"] = od.get("theme")
    prof, entries = profile_for_option(t, g, data)
    travelers = (data.get("budget") or {}).get("travelers") or t["travelers"]
    engine.reflow(data, data.get("transport", prof["transport"]), travelers)
    engine.compute_budget(t["destination"], data, prof, travelers)
    if entries:
        data["compatibility"] = engine.compatibility(data, entries)
    data["highlights"] = engine.highlights(data, prof)
    data["unverified"] = sum(1 for d in data["days"] for a in d["activities"] if not a.get("verified", True))
    return data


def save_option(option_id, user, data_in, base_version, note=None, force=False):
    o, t, g, m, perms = option_access(option_id, user)
    if not perms["can_edit"]:
        raise ServiceError("edit_forbidden", 403)
    data = recompute(o, t, g, data_in, user)
    with tx():
        cur = q1("SELECT version FROM itinerary_options WHERE id=?", (option_id,))
        if int(base_version or 0) != cur["version"] and not force:
            latest = q1("SELECT v.*, u.name FROM itinerary_versions v LEFT JOIN users u ON u.id=v.author_id WHERE option_id=? ORDER BY version DESC",
                        (option_id,))
            raise ServiceError("version_conflict", 409, current_version=cur["version"],
                               by=latest and latest["name"], at=latest and latest["created_at"])
        ver = cur["version"] + 1
        ex("UPDATE itinerary_options SET data_json=?, version=?, updated_by=?, updated_at=? WHERE id=?",
           (jdump(data), ver, user["id"], now_iso(), option_id))
        ex("INSERT INTO itinerary_versions(id,option_id,version,data_json,author_id,note,created_at) VALUES(?,?,?,?,?,?,?)",
           (new_id("v"), option_id, ver, jdump(data), user["id"], (note or "")[:200], now_iso()))
        ex("UPDATE trips SET updated_at=? WHERE id=?", (now_iso(), t["id"]))
    _store_budget_items(option_id, data)
    if g:
        log(user["id"], "itinerary.updated", g["id"], t["id"], {"version": ver})
        publish_group(g["id"], "itinerary.updated", {"option_id": option_id, "version": ver, "by": user["name"],
                                                     "by_id": user["id"]})
        notify([u for u in member_ids(g["id"]) if u != user["id"]], "itinerary_updated",
               {"option_id": option_id, "trip_title": t["title"], "by": user["name"], "version": ver})
    return option_public(option_id, user)


def restore_version(option_id, user, version):
    o, t, g, m, perms = option_access(option_id, user)
    if not perms["can_edit"]:
        raise ServiceError("edit_forbidden", 403)
    v = q1("SELECT * FROM itinerary_versions WHERE option_id=? AND version=?", (option_id, int(version)))
    if not v:
        raise ServiceError("not_found", 404)
    return save_option(option_id, user, jload(v["data_json"]), o["version"], note=f"restore v{version}")


def finalize_option(option_id, user):
    o, t, g, m, perms = option_access(option_id, user)
    if t["trip_type"] == "personal":
        ex("UPDATE trips SET status='saved', finalized_option_id=?, updated_at=? WHERE id=?", (option_id, now_iso(), t["id"]))
        return option_public(option_id, user)
    if not perms["can_finalize"]:
        raise ServiceError("leader_only", 403)
    with tx():
        ex("UPDATE itinerary_options SET status='superseded' WHERE trip_id=? AND id!=? AND status='active'", (t["id"], option_id))
        ex("UPDATE itinerary_options SET status='finalized', updated_at=? WHERE id=?", (now_iso(), option_id))
        ex("UPDATE trips SET status='finalized', finalized_option_id=?, updated_at=? WHERE id=?", (option_id, now_iso(), t["id"]))
        ex("UPDATE groups SET room_status='finalized' WHERE id=?", (g["id"],))
        ex("UPDATE invitation_codes SET revoked_at=? WHERE group_id=? AND revoked_at IS NULL", (now_iso(), g["id"]))
    log(user["id"], "itinerary.finalized", g["id"], t["id"], {"option_id": option_id})
    publish_group(g["id"], "itinerary.finalized", {"option_id": option_id, "trip_id": t["id"]})
    notify([u for u in member_ids(g["id"]) if u != user["id"]], "finalized",
           {"option_id": option_id, "trip_title": t["title"], "by": user["name"]})
    return option_public(option_id, user)


# ------------------------------------------------------------------ comments
def comment_public(c, viewer_id):
    return {"id": c["id"], "activity_id": c["activity_id"], "user_id": c["user_id"], "name": c["name"],
            "initials": initials(c["name"]), "body": c["body"], "kind": c["kind"], "status": c["status"],
            "edited": bool(c["edited"]), "created_at": c["created_at"], "updated_at": c["updated_at"],
            "mine": c["user_id"] == viewer_id}


def list_comments(option_id, user):
    option_access(option_id, user)
    rows = q("""SELECT c.*, u.name FROM comments c JOIN users u ON u.id=c.user_id
                WHERE c.itinerary_option_id=? ORDER BY c.created_at""", (option_id,))
    return [comment_public(r, user["id"]) for r in rows]


def add_comment(option_id, user, body, kind="comment", activity_id=None):
    o, t, g, m, perms = option_access(option_id, user)
    body = (body or "").strip()
    if not body:
        raise ServiceError("validation", 422, fields={"body": "required"})
    if len(body) > 2000:
        raise ServiceError("validation", 422, fields={"body": "too_long"})
    if t["trip_type"] == "group" and not perms["can_comment"]:
        raise ServiceError("forbidden", 403)
    cid = new_id("c")
    ex("""INSERT INTO comments(id,itinerary_option_id,activity_id,user_id,body,kind,status,edited,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,0,?,?)""", (cid, option_id, activity_id or None, user["id"], body,
                                           "suggestion" if kind == "suggestion" else "comment", "open", now_iso(), now_iso()))
    c = q1("SELECT c.*, u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?", (cid,))
    if g:
        publish_group(g["id"], "comment.created", {"option_id": option_id, "comment": comment_public(c, "")})
        notify([u for u in member_ids(g["id"]) if u != user["id"]], "comment",
               {"option_id": option_id, "trip_title": t["title"], "by": user["name"], "kind": c["kind"],
                "excerpt": body[:80]})
        log(user["id"], "comment.created", g["id"], t["id"], {"kind": c["kind"]})
    return comment_public(c, user["id"])


def edit_comment(comment_id, user, body):
    c = q1("SELECT * FROM comments WHERE id=?", (comment_id,))
    if not c:
        raise ServiceError("not_found", 404)
    if c["user_id"] != user["id"]:
        raise ServiceError("forbidden", 403)
    body = (body or "").strip()
    if not body:
        raise ServiceError("validation", 422, fields={"body": "required"})
    ex("UPDATE comments SET body=?, edited=1, updated_at=? WHERE id=?", (body[:2000], now_iso(), comment_id))
    o, t, g, m, _ = option_access(c["itinerary_option_id"], user)
    c = q1("SELECT c.*, u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?", (comment_id,))
    if g:
        publish_group(g["id"], "comment.created", {"option_id": c["itinerary_option_id"], "comment": comment_public(c, "")})
    return comment_public(c, user["id"])


def set_comment_status(comment_id, user, status):
    c = q1("SELECT * FROM comments WHERE id=?", (comment_id,))
    if not c:
        raise ServiceError("not_found", 404)
    o, t, g, m, perms = option_access(c["itinerary_option_id"], user)
    if not perms["can_edit"] and not perms["is_leader"]:
        raise ServiceError("edit_forbidden", 403)
    if c["kind"] != "suggestion" or status not in ("applied", "dismissed", "open"):
        raise ServiceError("invalid_status", 422)
    ex("UPDATE comments SET status=?, updated_at=? WHERE id=?", (status, now_iso(), comment_id))
    c = q1("SELECT c.*, u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?", (comment_id,))
    if g:
        publish_group(g["id"], "comment.created", {"option_id": c["itinerary_option_id"], "comment": comment_public(c, "")})
    return comment_public(c, user["id"])
