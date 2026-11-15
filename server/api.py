"""HTTP API (JSON). Authorization is enforced here and in services — never only in the UI."""
import functools
import os
import re

from flask import Blueprint, Response, g, jsonify, request

from . import ai, catalog, db, engine, maps, realtime, security, services
from .db import jdump, jload, now_iso, q, q1, ex
from .services import ServiceError

bp = Blueprint("api", __name__, url_prefix="/api")
COOKIE = "wayplot_session"
DEMO = os.environ.get("WAYPLOT_DEMO", "1") == "1"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ------------------------------------------------------------------ plumbing
@bp.errorhandler(ServiceError)
def _svc_err(e):
    return jsonify({"error": e.code, **e.details}), e.status


@bp.before_request
def _load_user():
    g.user = security.session_user(request.cookies.get(COOKIE))
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        # CSRF defence: SameSite cookie + custom header that cross-site forms cannot set
        if request.headers.get("X-Requested-With") != "wayplot":
            return jsonify({"error": "csrf"}), 403


def body():
    return request.get_json(silent=True) or {}


def auth_required(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return jsonify({"error": "auth_required"}), 401
        return fn(*a, **kw)
    return wrapper


def _set_cookie(resp, tok):
    resp.set_cookie(COOKIE, tok, max_age=30 * 86400, httponly=True, samesite="Lax",
                    secure=request.is_secure, path="/")
    return resp


def client_key():
    return (g.user and g.user["id"]) or ("ip:" + (request.remote_addr or "?"))


# ---------------------------------------------------------------------- auth
@bp.post("/auth/register")
def register():
    b = body()
    errs = {}
    name, email, pw = (b.get("name") or "").strip(), (b.get("email") or "").strip().lower(), b.get("password") or ""
    if len(name) < 2:
        errs["name"] = "required"
    if not EMAIL_RE.match(email):
        errs["email"] = "email_format"
    elif q1("SELECT 1 FROM users WHERE email=?", (email,)):
        errs["email"] = "email_taken"
    if len(pw) < 8 or not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        errs["password"] = "password_weak"
    if b.get("confirm") != pw:
        errs["confirm"] = "password_mismatch"
    if not b.get("agree"):
        errs["agree"] = "agree_required"
    if errs:
        return jsonify({"error": "validation", "fields": errs}), 422
    if g.user and g.user["auth_provider"] == "guest":
        ex("UPDATE users SET name=?, email=?, password_hash=?, auth_provider='password' WHERE id=?",
           (name, email, security.hash_password(pw), g.user["id"]))
        u = q1("SELECT * FROM users WHERE id=?", (g.user["id"],))
        return jsonify({"user": services.user_public(u), "upgraded": True})
    u = services.create_user(name, email, pw)
    return _set_cookie(jsonify({"user": services.user_public(u)}), security.create_session(u["id"]))


@bp.post("/auth/login")
def login():
    b = body()
    email = (b.get("email") or "").strip().lower()
    u = q1("SELECT * FROM users WHERE email=?", (email,))
    if not u or not u["password_hash"] or not security.check_password(b.get("password") or "", u["password_hash"]):
        return jsonify({"error": "invalid_credentials"}), 401
    return _set_cookie(jsonify({"user": services.user_public(u)}), security.create_session(u["id"]))


@bp.post("/auth/logout")
def logout():
    security.drop_session(request.cookies.get(COOKIE))
    resp = jsonify({"ok": True})
    resp.delete_cookie(COOKIE, path="/")
    return resp


@bp.get("/auth/me")
def me():
    return jsonify({"user": services.user_public(g.user), "engine": ai.engine_name(), "demo": DEMO})


@bp.post("/auth/forgot")
def forgot():
    # MVP: no outbound email service configured; respond identically for any address (no account enumeration)
    return jsonify({"ok": True})


# --------------------------------------------------------------------- users
@bp.put("/users/me")
@auth_required
def update_me():
    b = body()
    name = (b.get("name") or g.user["name"]).strip()
    lang = b.get("lang") if b.get("lang") in ("vi", "en") else g.user["lang"]
    settings = jload(g.user["settings_json"], {})
    if isinstance(b.get("settings"), dict):
        for k in ("notify_invites", "notify_ready", "notify_comments", "notify_updates", "share_free_text"):
            if k in b["settings"]:
                settings[k] = bool(b["settings"][k])
    if len(name) < 2:
        return jsonify({"error": "validation", "fields": {"name": "required"}}), 422
    ex("UPDATE users SET name=?, lang=?, settings_json=? WHERE id=?", (name, lang, jdump(settings), g.user["id"]))
    return jsonify({"user": services.user_public(q1("SELECT * FROM users WHERE id=?", (g.user["id"],)))})


@bp.put("/users/me/password")
@auth_required
def change_password():
    b = body()
    if not g.user["password_hash"] or not security.check_password(b.get("current") or "", g.user["password_hash"]):
        return jsonify({"error": "validation", "fields": {"current": "wrong_password"}}), 422
    pw = b.get("new") or ""
    if len(pw) < 8 or not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        return jsonify({"error": "validation", "fields": {"new": "password_weak"}}), 422
    ex("UPDATE users SET password_hash=? WHERE id=?", (security.hash_password(pw), g.user["id"]))
    return jsonify({"ok": True})


@bp.get("/users/me/preferences")
@auth_required
def get_prefs():
    return jsonify({"preferences": services.get_defaults(g.user["id"])})


@bp.put("/users/me/preferences")
@auth_required
def put_prefs():
    b = body()
    errs = engine.validate_prefs(b)
    if errs:
        return jsonify({"error": "validation", "fields": errs}), 422
    return jsonify({"preferences": services.save_defaults(g.user["id"], b)})


@bp.get("/users/me/subscription")
@auth_required
def subscription():
    plan = services.user_plan(g.user["id"])
    ent = services.entitlement(g.user["id"])
    return jsonify({"plan": plan, "entitlement": ent, "personal_quota": services.personal_quota(g.user["id"])})


@bp.post("/users/me/subscription")
@auth_required
def set_subscription():
    # Demo-only switch (payments are P2). Real deployments must wire a billing provider here.
    if not DEMO:
        return jsonify({"error": "billing_not_configured"}), 501
    plan = "vip" if body().get("plan") == "vip" else "free"
    ex("""INSERT INTO subscriptions(user_id,plan,status,entitlement) VALUES(?,?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan, status='active', entitlement=excluded.entitlement""",
       (g.user["id"], plan, "active", jdump(services.VIP if plan == "vip" else services.FREE)))
    return subscription()


@bp.get("/users/me/trips")
@auth_required
def my_trips():
    return jsonify({"trips": services.list_trips(g.user["id"], request.args.get("filter", "all"))})


# ------------------------------------------------------------------- catalog
@bp.get("/destinations")
def destinations():
    return jsonify({"destinations": [catalog.destination_public(d) for d in catalog.DESTINATIONS]})


@bp.get("/destinations/<did>/places")
def places(did):
    if did not in catalog.DESTINATIONS:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"places": maps.search_directory(did, request.args.get("q", ""), 40)})


@bp.get("/featured")
def featured():
    return jsonify({"itineraries": catalog.FEATURED_ITINERARIES})


@bp.post("/newsletter")
def newsletter():
    email = (body().get("email") or "").strip().lower()
    if not EMAIL_RE.match(email):
        return jsonify({"error": "validation", "fields": {"email": "email_format"}}), 422
    ex("INSERT OR IGNORE INTO newsletter(email,created_at) VALUES(?,?)", (email, now_iso()))
    return jsonify({"ok": True})


# --------------------------------------------------------------------- trips
@bp.post("/trips")
@auth_required
def create_trip():
    t = services.create_personal_trip(g.user, body())
    return jsonify({"trip": services.trip_card(t, g.user["id"])}), 201


@bp.get("/trips/<tid>")
@auth_required
def get_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    gen = q1("SELECT * FROM generations WHERE trip_id=? ORDER BY started_at DESC", (tid,))
    return jsonify({"trip": services.trip_card(t, g.user["id"]),
                    "options": [services.option_card(o) for o in services.options_for_trip(tid)],
                    "generation": services.generation_public(gen) if gen else None,
                    "preferences": jload(t["prefs_json"], {}) if t["trip_type"] == "personal" else None})


@bp.post("/trips/<tid>/generate")
@auth_required
def generate_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    if t["trip_type"] != "personal":
        return jsonify({"error": "use_group_generate"}), 409
    gid = services.start_personal_generation(t, g.user)
    return jsonify({"generation_id": gid}), 202


@bp.get("/generations/<gid>")
@auth_required
def get_generation(gid):
    gen = q1("SELECT * FROM generations WHERE id=?", (gid,))
    if not gen:
        return jsonify({"error": "not_found"}), 404
    services.trip_access(gen["trip_id"], g.user["id"])
    out = services.generation_public(gen)
    out["option_ids"] = [o["id"] for o in q("SELECT id FROM itinerary_options WHERE generation_id=? ORDER BY option_number", (gid,))]
    out["trip_id"] = gen["trip_id"]
    out["group_id"] = gen["group_id"]
    return jsonify({"generation": out})


@bp.post("/generations/<gid>/retry")
@auth_required
def retry(gid):
    return jsonify({"generation_id": services.retry_generation(gid, g.user)}), 202


@bp.post("/trips/<tid>/save")
@auth_required
def save_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    if t["trip_type"] != "personal":
        return jsonify({"error": "use_finalize"}), 409
    opt = q1("SELECT id FROM itinerary_options WHERE trip_id=? AND status='active' ORDER BY created_at DESC", (tid,))
    ex("UPDATE trips SET status='saved', finalized_option_id=?, updated_at=? WHERE id=?",
       (opt and opt["id"], now_iso(), tid))
    return jsonify({"trip": services.trip_card(q1("SELECT * FROM trips WHERE id=?", (tid,)), g.user["id"])})


@bp.post("/trips/<tid>/archive")
@auth_required
def archive_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    if t["owner_id"] != g.user["id"]:
        return jsonify({"error": "owner_only"}), 403
    ex("UPDATE trips SET archived=?, updated_at=? WHERE id=?", (0 if body().get("restore") else 1, now_iso(), tid))
    return jsonify({"ok": True})


@bp.post("/trips/<tid>/duplicate")
@auth_required
def duplicate_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    if t["trip_type"] != "personal":
        return jsonify({"error": "personal_only"}), 409
    nid = db.new_id("t")
    ex("""INSERT INTO trips(id,owner_id,trip_type,title,destination,start_date,end_date,travelers,budget_amount,budget_mode,
          currency,prefs_json,status,created_at,updated_at) SELECT ?,owner_id,trip_type,title || ' (bản sao)',destination,
          start_date,end_date,travelers,budget_amount,budget_mode,currency,prefs_json,'draft',?,? FROM trips WHERE id=?""",
       (nid, now_iso(), now_iso(), tid))
    src = q1("SELECT * FROM itinerary_options WHERE trip_id=? AND status!='superseded' ORDER BY created_at DESC", (tid,))
    if src:
        oid = db.new_id("o")
        ex("""INSERT INTO itinerary_options(id,trip_id,group_id,generation_id,option_number,title_json,description_json,status,
              version,data_json,updated_by,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
           (oid, nid, None, src["generation_id"], 1, src["title_json"], src["description_json"], "active", 1,
            src["data_json"], g.user["id"], now_iso(), now_iso()))
        ex("INSERT INTO itinerary_versions(id,option_id,version,data_json,author_id,note,created_at) VALUES(?,?,?,?,?,?,?)",
           (db.new_id("v"), oid, 1, src["data_json"], g.user["id"], "duplicate", now_iso()))
        ex("UPDATE trips SET status='planned' WHERE id=?", (nid,))
    return jsonify({"trip": services.trip_card(q1("SELECT * FROM trips WHERE id=?", (nid,)), g.user["id"])}), 201


@bp.delete("/trips/<tid>")
@auth_required
def delete_trip(tid):
    t, grp, m = services.trip_access(tid, g.user["id"])
    if t["owner_id"] != g.user["id"]:
        return jsonify({"error": "owner_only"}), 403
    with db.tx():
        opts = [o["id"] for o in q("SELECT id FROM itinerary_options WHERE trip_id=?", (tid,))]
        for oid in opts:
            ex("DELETE FROM itinerary_versions WHERE option_id=?", (oid,))
            ex("DELETE FROM comments WHERE itinerary_option_id=?", (oid,))
            ex("DELETE FROM budget_items WHERE itinerary_option_id=?", (oid,))
        ex("DELETE FROM itinerary_options WHERE trip_id=?", (tid,))
        ex("DELETE FROM generations WHERE trip_id=?", (tid,))
        if grp:
            ex("DELETE FROM member_submissions WHERE group_id=?", (grp["id"],))
            ex("DELETE FROM group_members WHERE group_id=?", (grp["id"],))
            ex("DELETE FROM invitation_codes WHERE group_id=?", (grp["id"],))
            ex("DELETE FROM groups WHERE id=?", (grp["id"],))
        ex("DELETE FROM trips WHERE id=?", (tid,))
    return jsonify({"ok": True})


# -------------------------------------------------------------------- groups
@bp.post("/groups")
@auth_required
def create_group():
    grp, code = services.create_group(g.user, body())
    return jsonify({"group_id": grp["id"], "trip_id": grp["trip_id"], "invite": code}), 201


@bp.post("/groups/join/preview")
def join_preview():
    try:
        inv, grp, summary = services.resolve_code(body().get("code"), client_key(), g.user and g.user["id"])
    except ServiceError as e:
        return jsonify({"error": e.code, **e.details}), e.status
    return jsonify({"group": summary})


@bp.post("/groups/join")
def join():
    b = body()
    resp_cookie = None
    user = g.user
    if not user:
        name = (b.get("display_name") or "").strip()
        if len(name) < 2:
            return jsonify({"error": "validation", "fields": {"display_name": "required"}}), 422
        services.resolve_code(b.get("code"), client_key())  # validate before creating a guest account
        user = services.create_user(name[:60], None, None, provider="guest")
        resp_cookie = security.create_session(user["id"])
    summary = services.join_group(user, b.get("code"), client_key())
    resp = jsonify({"group": summary, "user": services.user_public(user)})
    return _set_cookie(resp, resp_cookie) if resp_cookie else resp


@bp.get("/groups/<gid>/status")
@auth_required
def group_status(gid):
    return jsonify(services.room(gid, g.user))


@bp.post("/groups/<gid>/invite-code")
@auth_required
def invite_code(gid):
    services.require_leader(gid, g.user["id"])
    grp = q1("SELECT * FROM groups WHERE id=?", (gid,))
    if grp["room_status"] in ("closed", "finalized"):
        return jsonify({"error": "room_closed"}), 409
    if body().get("extend"):
        inv = services.extend_code(gid)
    else:
        services.issue_code(gid, actor=g.user["id"])
        inv = services.current_invite(gid)
    services.publish_group(gid, "room.updated", {"invite_changed": True})
    return jsonify({"invite": inv})


@bp.get("/groups/<gid>/submissions/me")
@auth_required
def my_submission(gid):
    services.membership(gid, g.user["id"])
    return jsonify({"submission": services.get_submission(gid, g.user["id"]),
                    "defaults": services.get_defaults(g.user["id"])})


@bp.post("/groups/<gid>/submissions")
@bp.put("/groups/<gid>/submissions/me")
@auth_required
def put_submission(gid):
    b = body()
    status = "submitted" if b.get("status") == "submitted" else "draft"
    res = services.save_submission(gid, g.user, b.get("preferences") or {}, status)
    if b.get("save_as_default") and status == "submitted":
        services.save_defaults(g.user["id"], b.get("preferences") or {})
    return jsonify(res)


@bp.post("/groups/<gid>/ready")
@auth_required
def ready(gid):
    st = services.set_ready(gid, g.user, bool(body().get("ready", True)))
    return jsonify({"ready": {"active": st["active"], "ready": st["ready"], "all_ready": st["all_ready"],
                              "waiting": st["waiting"]}})


@bp.post("/groups/<gid>/remind")
@auth_required
def remind(gid):
    return jsonify(services.remind(gid, g.user, body().get("deadline")))


@bp.post("/groups/<gid>/members/<uid>/remove")
@auth_required
def remove_member(gid, uid):
    services.remove_member(gid, g.user, uid)
    return jsonify({"ok": True})


@bp.post("/groups/<gid>/members/<uid>/editor")
@auth_required
def set_editor(gid, uid):
    services.set_editor(gid, g.user, uid, bool(body().get("can_edit")))
    return jsonify({"ok": True})


@bp.post("/groups/<gid>/transfer")
@auth_required
def transfer(gid):
    services.transfer_leader(gid, g.user, body().get("user_id"))
    return jsonify({"ok": True})


@bp.post("/groups/<gid>/leave")
@auth_required
def leave(gid):
    services.leave_group(gid, g.user, body().get("successor_id"))
    return jsonify({"ok": True})


@bp.post("/groups/<gid>/close")
@auth_required
def close(gid):
    services.close_group(gid, g.user)
    return jsonify({"ok": True})


@bp.post("/groups/<gid>/synthesis")
@auth_required
def synthesis(gid):
    return jsonify(services.synthesis_preview(gid, g.user, body().get("include", "all")))


@bp.post("/groups/<gid>/generate")
@auth_required
def generate_group(gid):
    b = body()
    gen = services.start_group_generation(gid, g.user, b.get("plan_count", 1), b.get("include", "all"))
    return jsonify({"generation_id": gen}), 202


@bp.get("/groups/<gid>/options")
@auth_required
def group_options(gid):
    grp, m = services.membership(gid, g.user["id"])
    return jsonify({"options": [services.option_card(o) for o in services.options_for_trip(grp["trip_id"])]})


# --------------------------------------------------------------- itineraries
@bp.get("/itineraries/<oid>")
@auth_required
def get_itinerary(oid):
    return jsonify(services.option_public(oid, g.user))


@bp.put("/itineraries/<oid>")
@auth_required
def put_itinerary(oid):
    b = body()
    return jsonify(services.save_option(oid, g.user, b.get("data") or {}, b.get("base_version"), b.get("note"),
                                        force=bool(b.get("force"))))


@bp.post("/itineraries/<oid>/preview")
@auth_required
def preview_itinerary(oid):
    o, t, grp, m, perms = services.option_access(oid, g.user)
    if not perms["can_edit"]:
        return jsonify({"error": "edit_forbidden"}), 403
    return jsonify({"data": services.recompute(o, t, grp, body().get("data") or {}, g.user)})


@bp.post("/itineraries/<oid>/refine")
@auth_required
def refine(oid):
    o, t, grp, m, perms = services.option_access(oid, g.user)
    if not perms["can_edit"]:
        return jsonify({"error": "edit_forbidden"}), 403
    b = body()
    data = services.recompute(o, t, grp, b.get("data") or jload(o["data_json"]), g.user)
    prof, entries = services.profile_for_option(t, grp, data)
    travelers = (data.get("budget") or {}).get("travelers") or t["travelers"]
    try:
        new = ai.refine({"profile": prof, "entries": entries, "travelers": travelers}, data, b.get("op"),
                        (b.get("instruction") or "").strip() or None)
    except ai.AIError as e:
        return jsonify({"error": "ai_failed", "detail": str(e)}), 502
    return jsonify({"data": new, "engine": ai.engine_name()})


@bp.get("/itineraries/<oid>/alternatives")
@auth_required
def alternatives(oid):
    o, t, grp, m, perms = services.option_access(oid, g.user)
    data = jload(o["data_json"])
    prof, _ = services.profile_for_option(t, grp, data)
    return jsonify({"places": engine.alternatives(t["destination"], data, request.args.get("activity_id"), prof)})


@bp.post("/itineraries/<oid>/verify-place")
@auth_required
def verify_place(oid):
    o, t, grp, m, perms = services.option_access(oid, g.user)
    p = maps.verify_custom_place(t["destination"], (body().get("text") or "").strip()[:120])
    return jsonify({"place": p})


@bp.get("/itineraries/<oid>/versions/<int:ver>")
@auth_required
def get_version(oid, ver):
    services.option_access(oid, g.user)
    v = q1("SELECT * FROM itinerary_versions WHERE option_id=? AND version=?", (oid, ver))
    if not v:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"version": ver, "data": jload(v["data_json"]), "created_at": v["created_at"], "note": v["note"]})


@bp.post("/itineraries/<oid>/restore")
@auth_required
def restore(oid):
    return jsonify(services.restore_version(oid, g.user, body().get("version")))


@bp.post("/itineraries/<oid>/finalize")
@auth_required
def finalize(oid):
    return jsonify(services.finalize_option(oid, g.user))


@bp.get("/itineraries/<oid>/comments")
@auth_required
def comments(oid):
    return jsonify({"comments": services.list_comments(oid, g.user)})


@bp.post("/itineraries/<oid>/comments")
@auth_required
def add_comment(oid):
    b = body()
    return jsonify({"comment": services.add_comment(oid, g.user, b.get("body"), b.get("kind"), b.get("activity_id"))}), 201


@bp.put("/comments/<cid>")
@auth_required
def edit_comment(cid):
    return jsonify({"comment": services.edit_comment(cid, g.user, body().get("body"))})


@bp.post("/comments/<cid>/status")
@auth_required
def comment_status(cid):
    return jsonify({"comment": services.set_comment_status(cid, g.user, body().get("status"))})


# ------------------------------------------------------- notifications & SSE
@bp.get("/notifications")
@auth_required
def notifications():
    rows = q("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 40", (g.user["id"],))
    return jsonify({"notifications": [{"id": r["id"], "type": r["type"], "payload": jload(r["payload_json"], {}),
                                       "read": bool(r["read"]), "created_at": r["created_at"]} for r in rows],
                    "unread": sum(1 for r in rows if not r["read"])})


@bp.post("/notifications/read")
@auth_required
def read_notifications():
    ids = body().get("ids")
    if ids:
        for i in ids[:100]:
            ex("UPDATE notifications SET read=1 WHERE id=? AND user_id=?", (i, g.user["id"]))
    else:
        ex("UPDATE notifications SET read=1 WHERE user_id=?", (g.user["id"],))
    return jsonify({"ok": True})


@bp.get("/stream")
@auth_required
def stream():
    resp = Response(realtime.stream(g.user["id"]), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


# ---------------------------------------------------------------------- demo
@bp.get("/demo/accounts")
def demo_accounts():
    if not DEMO:
        return jsonify({"accounts": []})
    rows = q("SELECT id, name, email FROM users WHERE email LIKE '%@wayplot.test' ORDER BY created_at")
    return jsonify({"accounts": [dict(r, initials=services.initials(r["name"])) for r in rows]})


@bp.post("/demo/switch")
def demo_switch():
    if not DEMO:
        return jsonify({"error": "not_found"}), 404
    email = (body().get("email") or "").lower()
    if not email.endswith("@wayplot.test"):
        return jsonify({"error": "not_demo_account"}), 403
    u = q1("SELECT * FROM users WHERE email=?", (email,))
    if not u:
        return jsonify({"error": "not_found"}), 404
    security.drop_session(request.cookies.get(COOKIE))
    return _set_cookie(jsonify({"user": services.user_public(u)}), security.create_session(u["id"]))
