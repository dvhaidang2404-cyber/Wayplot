"""Demo data so every screen has something to show on first run.

Demo accounts (all use the password in DEMO_PASSWORD) live on the reserved
`.test` domain and can be switched from the account menu while WAYPLOT_DEMO=1.
"""
from datetime import date, timedelta

from . import ai, db, engine, services
from .db import jdump, new_id, now_iso, q1, ex

DEMO_PASSWORD = "Wayplot2026"

USERS = [
    ("minh", "Minh Anh", "minh@wayplot.test"),
    ("mai", "Mai Phương", "mai@wayplot.test"),
    ("huy", "Quốc Huy", "huy@wayplot.test"),
    ("linh", "Thảo Linh", "linh@wayplot.test"),
    ("bao", "Gia Bảo", "bao@wayplot.test"),
]

PREFS = {
    "minh": dict(interests=["culture", "food", "cafe", "photo"], style="explore", pace="balanced", transport="mixed",
                 avoid=[], budget_amount=6000000, budget_hard=False, special=""),
    "mai": dict(interests=["cafe", "relax", "photo", "food"], style="relax", pace="slow", transport="car",
                avoid=["hiking"], budget_amount=5000000, budget_hard=True, special="Mình ăn chay vào ngày rằm."),
    "huy": dict(interests=["adventure", "nature", "nightlife", "food"], style="experience", pace="fast",
                transport="motorbike", avoid=[], budget_amount=8000000, budget_hard=False, special=""),
    "linh": dict(interests=["culture", "shopping", "food"], style="mixed", pace="balanced", transport="mixed",
                 avoid=["late"], budget_amount=4500000, budget_hard=True, special=""),
    "bao": dict(interests=["nature", "photo", "adventure"], style="explore", pace="fast", transport="mixed",
                avoid=[], budget_amount=7000000, budget_hard=False, special=""),
}


def d(offset):
    return (date.today() + timedelta(days=offset)).isoformat()


def _trip(owner, ttype, title, dest, start, end, travelers, status, prefs=None):
    tid = new_id("t")
    budget = engine.normalize_prefs(prefs or {}, travelers)["budget"] if prefs else None
    ex("""INSERT INTO trips(id,owner_id,trip_type,title,destination,start_date,end_date,travelers,budget_amount,budget_mode,
          currency,prefs_json,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
       (tid, owner, ttype, title, dest, start, end, travelers, budget, "per_person", "VND", jdump(prefs or {}), status,
        now_iso(), now_iso()))
    return tid


def _group(tid, leader, name, max_members, status, member_specs):
    gid = new_id("g")
    ex("""INSERT INTO groups(id,trip_id,leader_id,group_name,max_members,room_status,notes,created_at)
          VALUES(?,?,?,?,?,?,?,?)""", (gid, tid, leader, name, max_members, status, "", now_iso()))
    for uid, role, submitted, ready, can_edit in member_specs:
        ex("""INSERT INTO group_members(id,group_id,user_id,role,joined_at,member_status,ready_status,ready_at,can_edit)
              VALUES(?,?,?,?,?,?,?,?,?)""",
           (new_id("m"), gid, uid, role, now_iso(), "active", 1 if ready else 0, now_iso() if ready else None,
            1 if can_edit or role == "leader" else 0))
    return gid


def _submit(gid, uid, prefs, status="submitted"):
    sid = new_id("s")
    ex("""INSERT INTO member_submissions(id,group_id,user_id,preference_json,submission_status,version,updated_at)
          VALUES(?,?,?,?,?,?,?)""", (sid, gid, uid, jdump(prefs), status, 1, now_iso()))
    ex("""INSERT INTO submission_history(id,submission_id,version,preference_json,submission_status,created_at)
          VALUES(?,?,?,?,?,?)""", (new_id("h"), sid, 1, jdump(prefs), status, now_iso()))


def _generate(tid, gid, requester, plan_count, entries, travelers, seed):
    t = q1("SELECT * FROM trips WHERE id=?", (tid,))
    snap = {"kind": "group" if gid else "personal", "trip_id": tid, "group_id": gid, "dest": t["destination"],
            "start_date": t["start_date"], "end_date": t["end_date"], "travelers": travelers, "plan_count": plan_count,
            "entries": entries, "excluded": [], "seed": seed}
    syn = engine.synthesize(entries, {"start": t["start_date"], "end": t["end_date"]}) if gid else None
    gen_id = new_id("gen")
    ex("""INSERT INTO generations(id,trip_id,group_id,requested_by,plan_count,status,stage,snapshot_json,synthesis_json,
          engine,counted,started_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)""",
       (gen_id, tid, gid, requester, plan_count, "completed", "done", jdump(snap), jdump(syn) if syn else None, "local",
        now_iso(), now_iso()))
    orig = ai.claude_ready
    ai.claude_ready = lambda: False  # seed data is always generated locally
    try:
        plans = ai.generate_plans(snap)
    finally:
        ai.claude_ready = orig
    ids = []
    for i, data in enumerate(plans):
        oid = new_id("o")
        ids.append(oid)
        ex("""INSERT INTO itinerary_options(id,trip_id,group_id,generation_id,option_number,title_json,description_json,
              status,version,data_json,updated_by,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
           (oid, tid, gid, gen_id, i + 1, jdump(data["title"]), jdump(data["description"]), "active", 1, jdump(data),
            requester, now_iso(), now_iso()))
        ex("INSERT INTO itinerary_versions(id,option_id,version,data_json,author_id,note,created_at) VALUES(?,?,?,?,?,?,?)",
           (new_id("v"), oid, 1, jdump(data), requester, "ai", now_iso()))
        services._store_budget_items(oid, data)
    return ids


def _entry(uid, name, key):
    return {"user_id": uid, "name": name, "version": 1, "prefs": engine.normalize_prefs(PREFS[key])}


def _comment(oid, uid, body, kind="comment", activity_id=None, status="open"):
    ex("""INSERT INTO comments(id,itinerary_option_id,activity_id,user_id,body,kind,status,edited,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,0,?,?)""", (new_id("c"), oid, activity_id, uid, body, kind, status, now_iso(), now_iso()))


def _notify(uid, ntype, payload):
    ex("INSERT INTO notifications(id,user_id,type,payload_json,read,created_at) VALUES(?,?,?,?,0,?)",
       (new_id("n"), uid, ntype, jdump(payload), now_iso()))


def seed_if_empty():
    if q1("SELECT 1 FROM users LIMIT 1"):
        return False
    U = {}
    for key, name, email in USERS:
        U[key] = services.create_user(name, email, DEMO_PASSWORD)["id"]
        services.save_defaults(U[key], PREFS[key])
    N = {k: n for k, n, _ in USERS}

    # 1) Minh – personal Hà Nội trip, generated and saved
    p_hn = dict(PREFS["minh"], budget_amount=3500000, budget_mode="per_person", special="")
    t1 = _trip(U["minh"], "personal", "Hà Nội cuối tuần", "hanoi", d(14), d(16), 2, "saved", p_hn)
    o1 = _generate(t1, None, U["minh"], 1, [{"user_id": U["minh"], "name": N["minh"], "version": 1,
                                             "prefs": engine.normalize_prefs(p_hn, 2)}], 2, "hn")
    ex("UPDATE trips SET finalized_option_id=? WHERE id=?", (o1[0], t1))

    # 2) Minh leads a Đà Nẵng group that is still collecting preferences
    t2 = _trip(U["minh"], "group", "Đà Nẵng cuối năm cùng hội bạn", "danang", d(35), d(38), 6, "collecting")
    g2 = _group(t2, U["minh"], "Đà Nẵng cuối năm cùng hội bạn", 6, "open", [
        (U["minh"], "leader", True, True, True), (U["mai"], "member", True, True, False),
        (U["huy"], "member", True, False, False), (U["linh"], "member", False, False, False)])
    for k in ("minh", "mai", "huy"):
        _submit(g2, U[k], PREFS[k])
    services.issue_code(g2)
    for k, act in (("mai", "member.joined"), ("huy", "member.joined"), ("linh", "member.joined"), ("mai", "member.ready")):
        services.log(U[k], act, g2, t2, {"name": N[k]})

    # 3) Huy leads a Hội An group with two plans under review; Minh may edit
    t3 = _trip(U["huy"], "group", "Hội An – Phố đèn lồng", "hoian", d(21), d(23), 6, "planned")
    g3 = _group(t3, U["huy"], "Hội An – Phố đèn lồng", 6, "reviewing", [
        (U["huy"], "leader", True, True, True), (U["minh"], "member", True, True, True),
        (U["mai"], "member", True, True, False), (U["bao"], "member", True, True, False)])
    for k in ("huy", "minh", "mai", "bao"):
        _submit(g3, U[k], PREFS[k])
    services.issue_code(g3)
    ents3 = [_entry(U[k], N[k], k) for k in ("huy", "minh", "mai", "bao")]
    o3 = _generate(t3, g3, U["huy"], 2, ents3, 4, "hoian")
    data = db.jload(q1("SELECT data_json FROM itinerary_options WHERE id=?", (o3[0],))["data_json"])
    first_act = data["days"][0]["activities"][0]
    _comment(o3[0], U["mai"], "Ngày 2 cho mình thêm thời gian ở biển An Bàng được không? Mình muốn ngồi cà phê ngắm biển lâu hơn.",
             "suggestion")
    _comment(o3[0], U["minh"], f"{first_act['name']['vi']} đi sớm trước 8h sẽ vắng và chụp ảnh đẹp hơn đó!",
             "comment", first_act["id"])
    _comment(o3[1], U["bao"], "Kế hoạch này hợp với mình hơn, có Mỹ Sơn!", "comment")
    services.log(U["huy"], "generation.completed", g3, t3, {"plans": 2})

    # 4) Linh leads a Hạ Long group; invite code WAY-8K2P9 lets Minh join
    t4 = _trip(U["linh"], "group", "Hạ Long – Một ngày trên vịnh", "halong", d(60), d(61), 8, "collecting")
    g4 = _group(t4, U["linh"], "Hạ Long – Một ngày trên vịnh", 8, "open", [
        (U["linh"], "leader", True, False, True), (U["bao"], "member", True, True, False)])
    _submit(g4, U["linh"], PREFS["linh"])
    _submit(g4, U["bao"], PREFS["bao"])
    services.issue_code(g4, hours=24 * 7, code="WAY-8K2P9")

    # 5) Past finalized group trip (Đà Lạt) and past personal trip (Huế)
    t5 = _trip(U["mai"], "group", "Đà Lạt mùa dã quỳ", "dalat", d(-30), d(-28), 3, "finalized")
    g5 = _group(t5, U["mai"], "Đà Lạt mùa dã quỳ", 5, "finalized", [
        (U["mai"], "leader", True, True, True), (U["minh"], "member", True, True, False),
        (U["huy"], "member", True, True, False)])
    for k in ("mai", "minh", "huy"):
        _submit(g5, U[k], PREFS[k])
    o5 = _generate(t5, g5, U["mai"], 2, [_entry(U[k], N[k], k) for k in ("mai", "minh", "huy")], 3, "dalat")
    ex("UPDATE itinerary_options SET status='finalized' WHERE id=?", (o5[0],))
    ex("UPDATE itinerary_options SET status='superseded' WHERE id=?", (o5[1],))
    ex("UPDATE trips SET finalized_option_id=? WHERE id=?", (o5[0], t5))
    _comment(o5[0], U["huy"], "Chốt kế hoạch này nhé cả nhà!", "comment")

    p_hue = dict(PREFS["minh"], budget_amount=3000000)
    t6 = _trip(U["minh"], "personal", "Huế – Cố đô trầm mặc", "hue", d(-60), d(-58), 1, "saved", p_hue)
    o6 = _generate(t6, None, U["minh"], 1, [{"user_id": U["minh"], "name": N["minh"], "version": 1,
                                             "prefs": engine.normalize_prefs(p_hue, 1)}], 1, "hue")
    ex("UPDATE trips SET finalized_option_id=? WHERE id=?", (o6[0], t6))

    # Notifications for the main demo account
    _notify(U["minh"], "invite", {"trip_title": "Hạ Long – Một ngày trên vịnh", "from": N["linh"], "code": "WAY-8K2P9"})
    _notify(U["minh"], "plans_ready", {"group_id": g3, "trip_title": "Hội An – Phố đèn lồng"})
    _notify(U["minh"], "comment", {"option_id": o3[0], "trip_title": "Hội An – Phố đèn lồng", "by": N["mai"],
                                   "kind": "suggestion", "excerpt": "Ngày 2 cho mình thêm thời gian ở biển An Bàng…"})
    _notify(U["minh"], "member_joined", {"group_id": g2, "trip_title": "Đà Nẵng cuối năm cùng hội bạn", "name": N["linh"]})
    _notify(U["linh"], "ready_reminder", {"group_id": g2, "trip_title": "Đà Nẵng cuối năm cùng hội bạn", "from": N["minh"]})
    return True
