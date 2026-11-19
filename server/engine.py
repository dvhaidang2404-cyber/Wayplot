"""Planning engine: normalisation, group synthesis, deterministic clustering,
itinerary layout, budget estimation and local refinements.

The AI orchestrator (server/ai.py) uses these building blocks: deterministic
code decides groupings, times, travel and money; the language model (when
configured) only chooses and explains activities from verified places.
"""
import hashlib
import math
import re
from collections import Counter
from datetime import date, timedelta

from . import catalog, maps
from .catalog import INTERESTS, STYLES, PACES, TRANSPORTS, AVOIDS

USD_RATE = 25400
MAX_DAYS = 10
PACE_COUNT = {"slow": 2, "balanced": 3, "fast": 4}
PACE_START = {"slow": 9 * 60, "balanced": 8 * 60 + 30, "fast": 7 * 60 + 30}
PACE_DUR = {"slow": 1.2, "balanced": 1.0, "fast": 0.85}
PACE_NUM = {"slow": 0.0, "balanced": 0.5, "fast": 1.0}
BREAKFAST = 40000

INTEREST_NAMES = {
    "food": ("ẩm thực", "food"), "cafe": ("cà phê", "cafés"), "nature": ("thiên nhiên", "nature"),
    "culture": ("văn hóa", "culture"), "shopping": ("mua sắm", "shopping"), "photo": ("nhiếp ảnh", "photography"),
    "adventure": ("phiêu lưu", "adventure"), "nightlife": ("cuộc sống về đêm", "nightlife"),
    "relax": ("thư giãn", "relaxation"),
}
PACE_NAMES = {"slow": ("chậm", "slow"), "balanced": ("cân bằng", "balanced"), "fast": ("nhanh", "fast")}
THEMES = {
    "culture": ("Di sản & phố cũ", "Heritage & old streets"),
    "nature": ("Thiên nhiên & khoảng trời", "Nature & open skies"),
    "food": ("Hương vị địa phương", "Local flavours"),
    "adventure": ("Khám phá & vận động", "Explore & move"),
    "photo": ("Những khung hình đẹp", "Picture-perfect moments"),
    "relax": ("Chậm lại & tận hưởng", "Slow down & unwind"),
    "shopping": ("Chợ phiên & quà tặng", "Markets & keepsakes"),
    "nightlife": ("Phố đêm rực rỡ", "Vibrant night streets"),
    "cafe": ("Cà phê & góc phố", "Cafés & street corners"),
}


# ---------------------------------------------------------------- utilities
def _h(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def hm(m):
    m = int(m) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


def to_min(s):
    try:
        h, m = s.split(":")
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return None


def round5(m):
    return int(math.ceil(m / 5.0) * 5)


def date_list(start, end):
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    n = min((e - s).days + 1, MAX_DAYS)
    return [(s + timedelta(days=i)).isoformat() for i in range(max(n, 1))]


def money_round(v):
    return int(round(v / 1000.0) * 1000)


def fmt_vnd(n):
    return f"{int(n):,}".replace(",", ".") + "đ"


def fmt_en(n):
    return f"{int(n):,} VND"


# ----------------------------------------------------------- preferences
def validate_prefs(raw, require_budget=False):
    errors = {}
    b = raw.get("budget_amount")
    if b not in (None, ""):
        try:
            bv = int(str(b).replace(".", "").replace(",", "").strip())
            if bv < 0 or bv > 10_000_000_000:
                errors["budget_amount"] = "budget_range"
        except ValueError:
            errors["budget_amount"] = "budget_format"
    elif require_budget:
        errors["budget_amount"] = "required"
    for key, allowed in (("style", STYLES), ("pace", PACES), ("transport", TRANSPORTS)):
        v = raw.get(key)
        if v and v not in allowed:
            errors[key] = "invalid"
    if len(str(raw.get("special") or "")) > 1000:
        errors["special"] = "too_long"
    return errors


def normalize_prefs(raw, travelers=1):
    raw = raw or {}
    interests = []
    for i in raw.get("interests") or []:
        if i in INTERESTS and i not in interests:
            interests.append(i)
    budget = raw.get("budget_amount")
    try:
        budget = int(str(budget).replace(".", "").replace(",", "").strip()) if budget not in (None, "") else None
    except ValueError:
        budget = None
    if budget is not None and raw.get("currency") == "USD":
        budget *= USD_RATE
    if budget and raw.get("budget_mode") == "total" and travelers and travelers > 1:
        budget = budget // int(travelers)
    return {
        "interests": interests or ["culture", "food"],
        "style": raw.get("style") if raw.get("style") in STYLES else "mixed",
        "pace": raw.get("pace") if raw.get("pace") in PACES else "balanced",
        "transport": raw.get("transport") if raw.get("transport") in TRANSPORTS else "mixed",
        "avoid": [a for a in (raw.get("avoid") or []) if a in AVOIDS],
        "budget": budget or None,
        "budget_hard": bool(raw.get("budget_hard")),
        "special": str(raw.get("special") or "").strip()[:1000],
    }


# ------------------------------------------------------------- synthesis
def synthesize(entries, hard_dates=None):
    """entries: [{user_id, name, prefs(normalized)}] -> aggregate summary.
    Never includes free-text answers; only counts."""
    n = max(1, len(entries))
    counts = Counter(i for e in entries for i in e["prefs"]["interests"])
    threshold = max(1, math.ceil(n * 0.6)) if n > 1 else 1
    common = [i for i, c in counts.most_common() if c >= threshold]
    if not common:
        common = [i for i, _ in counts.most_common(2)]
    diffs = [{"type": "interest", "key": i, "count": c, "of": n}
             for i, c in counts.most_common() if c < threshold]
    paces = Counter(e["prefs"]["pace"] for e in entries)
    if len(paces) > 1:
        diffs.insert(0, {"type": "pace", "values": dict(paces)})
    budgets = sorted(e["prefs"]["budget"] for e in entries if e["prefs"].get("budget"))
    if len(budgets) >= 2 and budgets[-1] > budgets[0] * 1.5:
        diffs.insert(0, {"type": "budget", "min": budgets[0], "max": budgets[-1]})
    hard_caps = [e["prefs"]["budget"] for e in entries if e["prefs"].get("budget") and e["prefs"].get("budget_hard")]
    avoid = sorted({a for e in entries for a in e["prefs"]["avoid"]})
    return {
        "member_count": len(entries),
        "common": common,
        "differences": diffs[:6],
        "interest_counts": dict(counts),
        "pace": dict(paces),
        "styles": dict(Counter(e["prefs"]["style"] for e in entries)),
        "transport": dict(Counter(e["prefs"]["transport"] for e in entries)),
        "budget": {"min": budgets[0] if budgets else None, "max": budgets[-1] if budgets else None,
                   "median": budgets[len(budgets) // 2] if budgets else None},
        "hard": {"dates": hard_dates, "max_budget": min(hard_caps) if hard_caps else None, "avoid": avoid},
        "soft": {"interests": common, "pace": paces.most_common(1)[0][0] if paces else "balanced"},
        "special_count": sum(1 for e in entries if e["prefs"].get("special")),
    }


def aggregate_profile(entries, all_entries=None):
    all_entries = all_entries or entries
    n = max(1, len(entries))
    counts = Counter(i for e in entries for i in e["prefs"]["interests"])
    weights = {i: c / n for i, c in counts.items()}
    pace_vals = sorted(PACE_NUM[e["prefs"]["pace"]] for e in entries) or [0.5]
    med = pace_vals[len(pace_vals) // 2]
    pace = min(PACE_NUM, key=lambda k: abs(PACE_NUM[k] - med))
    styles = Counter(e["prefs"]["style"] for e in entries)
    style = styles.most_common(1)[0][0] if styles else "mixed"
    tr = Counter(e["prefs"]["transport"] for e in entries).most_common()
    transport = tr[0][0] if tr and (len(tr) == 1 or tr[0][1] > tr[1][1]) else "mixed"
    hard = [e["prefs"]["budget"] for e in entries if e["prefs"].get("budget") and e["prefs"].get("budget_hard")]
    soft = sorted(e["prefs"]["budget"] for e in entries if e["prefs"].get("budget"))
    budget = min(hard) if hard else (soft[len(soft) // 2] if soft else None)
    avoid = sorted({a for e in all_entries for a in e["prefs"]["avoid"]})
    return {"weights": weights, "pace": pace, "style": style, "transport": transport,
            "budget": budget, "avoid": avoid, "members": [e["user_id"] for e in entries]}


def _features(p):
    budget = p.get("budget") or 2_000_000
    return [1.0 if i in p["interests"] else 0.0 for i in INTERESTS] + [
        PACE_NUM[p["pace"]] * 1.5, math.log10(max(budget, 200_000)) - 6]


def _dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def cluster_two(entries):
    """Deterministic 2-way split: farthest pair as seeds, nearest assignment."""
    if len(entries) < 2:
        return entries, entries, True
    ents = sorted(entries, key=lambda e: e["user_id"])
    feats = [_features(e["prefs"]) for e in ents]
    best, pair = -1, (0, 1)
    for i in range(len(ents)):
        for j in range(i + 1, len(ents)):
            d = _dist(feats[i], feats[j])
            if d > best + 1e-9:
                best, pair = d, (i, j)
    if best < 0.5:
        return ents, ents, True
    A, B = [ents[pair[0]]], [ents[pair[1]]]
    for k, e in enumerate(ents):
        if k in pair:
            continue
        da, db = _dist(feats[k], feats[pair[0]]), _dist(feats[k], feats[pair[1]])
        if abs(da - db) < 1e-9:
            (A if len(A) <= len(B) else B).append(e)
        else:
            (A if da < db else B).append(e)
    return A, B, False


# ------------------------------------------------------------ plan naming
def _top(weights, k=3):
    return [i for i, _ in sorted(weights.items(), key=lambda kv: (-kv[1], INTERESTS.index(kv[0])))[:k]]


def plan_title(prof, avoid_title=None):
    w, pace, style = prof["weights"], prof["pace"], prof["style"]
    g = lambda k: w.get(k, 0)
    traits = [
        (2.5 if style == "saving" else 0, "Tiết kiệm mà trọn vẹn", "Smart & Complete"),
        ((1.2 if pace == "slow" else 0) + g("relax") + g("cafe") * 0.5, "Chậm rãi & Thơ mộng", "Slow & Poetic"),
        ((1.2 if pace == "fast" else 0) + g("adventure") + g("nature") * 0.3, "Khám phá & Phiêu lưu", "Explore & Adventure"),
        (g("food") * 0.7 + g("nightlife"), "Ẩm thực & Phố đêm", "Food & Night Streets"),
        (g("culture") + g("photo") * 0.6, "Di sản & Ống kính", "Heritage & Lens"),
        (g("nature") + g("photo") * 0.3 + g("relax") * 0.2, "Thiên nhiên & Gió trời", "Nature & Open Air"),
        (0.9, "Hành trình cân bằng", "The Balanced Journey"),
    ]
    traits.sort(key=lambda x: -x[0])
    for _, vi, en in traits:
        if vi != avoid_title:
            return {"vi": vi, "en": en}
    return {"vi": "Hành trình cân bằng II", "en": "The Balanced Journey II"}


def plan_description(prof, days):
    top = _top(prof["weights"], 3)
    pv, pe = PACE_NAMES[prof["pace"]]
    n = PACE_COUNT[prof["pace"]]
    return {
        "vi": f"Nhịp {pv}, ưu tiên {', '.join(INTEREST_NAMES[i][0] for i in top)}; khoảng {n} điểm chính mỗi ngày trong {len(days)} ngày.",
        "en": f"A {pe} pace focused on {', '.join(INTEREST_NAMES[i][1] for i in top)}; about {n} key stops a day over {len(days)} days.",
    }


# ------------------------------------------------------------- scoring
def violates(p, avoid, dest):
    d = catalog.DESTINATIONS[dest]
    if "hiking" in avoid and p["intensity"] >= 3:
        return True
    for flag in ("crowd", "seafood", "water", "late"):
        if flag in avoid and flag in p["flags"]:
            return True
    if "long_transfer" in avoid and maps.haversine_km(d["lat"], d["lng"], p["lat"], p["lng"]) > 25:
        return True
    return False


def score_place(p, prof, seed, n_days):
    if violates(p, prof["avoid"], p["dest"]):
        return None
    s = 0.25 + sum(prof["weights"].get(t, 0) for t in p["tags"])
    style = prof["style"]
    if style == "relax" and set(p["tags"]) & {"relax", "cafe", "nature"}:
        s += 0.4
    elif style == "explore" and set(p["tags"]) & {"culture", "photo", "nature"}:
        s += 0.4
    elif style == "experience" and set(p["tags"]) & {"adventure", "food", "nightlife"}:
        s += 0.4
    elif style == "saving":
        s += 0.5 if p["cost"] == 0 else (-0.3 if p["cost"] > 200000 else 0)
    if prof["pace"] == "slow" and p["intensity"] >= 3:
        s -= 0.9
    if prof["pace"] == "fast" and p["intensity"] >= 2:
        s += 0.15
    if prof.get("budget"):
        per_day = prof["budget"] / max(1, n_days)
        if p["cost"] > per_day * 0.45:
            s -= 0.8
    return s + _h(seed + p["id"]) * 0.3


# ------------------------------------------------------- itinerary layout
def _act_from_place(p, kind, start, duration, note=None):
    return {
        "id": "a" + hashlib.md5(f"{p['id']}{start}{_h(str(start)+p['id'])}".encode()).hexdigest()[:8],
        "kind": kind, "place_id": p["id"], "name": p["name"], "address": p["address"],
        "lat": p["lat"], "lng": p["lng"], "tags": p["tags"], "start": hm(start), "duration": duration,
        "cost": p["cost"], "verified": p.get("verified", True), "note": note or p.get("desc"),
        "pinned": False, "slot": p["slot"],
    }


def free_meal(dest, which, start):
    d = catalog.DESTINATIONS[dest]
    title = {"lunch": ("Ăn trưa tự chọn quanh khu vực", "Lunch of your choice nearby"),
             "dinner": ("Ăn tối tự chọn quanh khu vực", "Dinner of your choice nearby")}[which]
    return {"id": "a" + hashlib.md5(f"free{which}{start}{dest}".encode()).hexdigest()[:8], "kind": "free",
            "place_id": None, "name": {"vi": title[0], "en": title[1]}, "address": "", "lat": None, "lng": None,
            "tags": ["food"], "start": hm(start), "duration": 60, "cost": d["meal"], "verified": True,
            "note": {"vi": "Khoảng trống linh hoạt để thử quán gần đó.", "en": "Flexible slot to try somewhere nearby."},
            "pinned": False}


def free_time(start):
    return {"id": "a" + hashlib.md5(f"rest{start}".encode()).hexdigest()[:8], "kind": "rest", "place_id": None,
            "name": {"vi": "Thời gian tự do", "en": "Free time"}, "address": "", "lat": None, "lng": None,
            "tags": ["relax"], "start": hm(round5(start)), "duration": 120, "cost": 0, "verified": True,
            "note": {"vi": "Nghỉ ngơi hoặc tự khám phá quanh nơi lưu trú.",
                     "en": "Rest or explore around your stay at your own pace."}, "pinned": False}


def build_days(dest, dates, prof, seed, used_global=None, forced=None):
    """Lay out days. `forced` = list per day of ordered place_ids (from AI)."""
    d = catalog.DESTINATIONS[dest]
    pool = catalog.PLACES_BY_DEST[dest]
    scores = {p["id"]: score_place(p, prof, seed, len(dates)) for p in pool}
    used = set()
    penal = set(used_global or ())  # places used by a sibling plan: allowed, but discouraged
    pace = prof["pace"]
    hotel = {"lat": d["lat"], "lng": d["lng"]}
    days = []
    for di, day_date in enumerate(dates):
        if forced is not None:
            ids = forced[di] if di < len(forced) else None
            if ids:
                days.append(_layout_forced(dest, day_date, di, ids, prof))
                used.update(ids)
                continue
        acts = []
        t = PACE_START[pace]
        cur = hotel
        visits = 0
        target = PACE_COUNT[pace]
        had_long = False

        def best(slots, meal=False, need_tags=None, max_dur=None):
            cands = []
            for p in pool:
                sc = scores[p["id"]]
                if sc is None or p["id"] in used or p["meal"] != meal:
                    continue
                if max_dur and p["duration"] > max_dur:
                    continue
                if p["slot"] not in slots:
                    continue
                if need_tags and not set(p["tags"]) & need_tags:
                    continue
                km = maps.haversine_km(cur["lat"], cur["lng"], p["lat"], p["lng"])
                adj = sc - 0.06 * km - (0.9 if km > 25 and acts else 0) - (0.7 if p["id"] in penal else 0)
                cands.append((adj, p["id"], p))
            if not cands:
                return None
            cands.sort(key=lambda x: (-x[0], x[1]))
            return cands[0][2]

        def place(p, kind):
            nonlocal t, cur, visits
            if acts and acts[-1].get("lat") is not None:
                lg = maps.leg(acts[-1], p, prof["transport"])
                t += lg["minutes"] if lg else 10
            elif acts:
                t += 10
            start = round5(t)
            dur = round5(p["duration"] * PACE_DUR[pace])
            acts.append(_act_from_place(p, kind, start, dur))
            used.add(p["id"])
            t = start + dur
            cur = p
            if kind == "visit":
                visits += 1

        # Morning
        morning_quota = 1 if pace == "slow" else 2
        while visits < morning_quota and t < 11 * 60:
            p = best(("morning", "day", "any"))
            if p and p["duration"] >= 200 and visits:
                p = best(("morning", "any"))
            if not p:
                break
            place(p, "visit")
            if p["duration"] >= 200:
                had_long = True
                break
        # Lunch
        t = max(t, 11 * 60 + 30)
        p = best(("lunch", "meal"), meal=True)
        if p:
            place(p, "meal")
        else:
            acts.append(free_meal(dest, "lunch", round5(t)))
            t = round5(t) + 60
        # Afternoon
        if pace == "slow":
            t += 30  # siesta / check-in buffer
        aft_quota = target - visits
        aft_added = 0
        while (aft_quota > 0 and t < 17 * 60) or (pace != "slow" and t < 15 * 60 + 30):
            p = best(("afternoon", "day", "any"), max_dur=150)
            if not p or (had_long and p["duration"] >= 200):
                break
            place(p, "visit")
            aft_quota -= 1
            aft_added += 1
        if not aft_added and t < 15 * 60:
            acts.append(free_time(t))
            t = round5(t + 10) + 120
        if pace != "fast" and prof["weights"].get("cafe", 0) > 0 and t < 17 * 60 + 30:
            p = best(("any", "afternoon"), need_tags={"cafe"})
            if p:
                place(p, "visit")
        # Dinner
        t = max(t, 18 * 60)
        p = best(("dinner", "meal"), meal=True)
        if p:
            place(p, "meal")
        else:
            acts.append(free_meal(dest, "dinner", round5(t)))
            t = round5(t) + 60
        # Evening
        wants_night = prof["weights"].get("nightlife", 0) > 0 or prof["weights"].get("photo", 0) > 0
        if (pace != "slow" or wants_night) and "late" not in prof["avoid"] and t < 21 * 60:
            p = best(("evening", "any"), need_tags={"nightlife", "photo", "culture", "relax"})
            if p:
                place(p, "visit")
        days.append(_finish_day(dest, di, day_date, acts, prof))
    return days


def _layout_forced(dest, day_date, di, ids, prof):
    d = catalog.DESTINATIONS[dest]
    pace = prof["pace"]
    acts, t = [], PACE_START[pace]
    have_lunch = have_dinner = False
    for pid in ids:
        p = catalog.PLACES.get(pid)
        if not p or p["dest"] != dest:
            continue
        if p["meal"] and t < 15 * 60:
            t = max(t, 11 * 60 + 30)
        if p["meal"] and t >= 15 * 60:
            t = max(t, 18 * 60)
        if not have_lunch and not p["meal"] and t >= 12 * 60 + 30 and t < 15 * 60:
            acts.append(free_meal(dest, "lunch", round5(t)))
            t = round5(t) + 60
            have_lunch = True
        if not have_dinner and not p["meal"] and t >= 18 * 60 + 30:
            acts.append(free_meal(dest, "dinner", round5(t)))
            t = round5(t) + 60
            have_dinner = True
        if acts and acts[-1].get("lat") is not None:
            lg = maps.leg(acts[-1], p, prof["transport"])
            t += lg["minutes"] if lg else 10
        start = round5(t)
        dur = round5(p["duration"] * PACE_DUR[pace])
        acts.append(_act_from_place(p, "meal" if p["meal"] else "visit", start, dur))
        if p["meal"]:
            if start < 15 * 60:
                have_lunch = True
            else:
                have_dinner = True
        t = start + dur
    if not have_dinner and t <= 20 * 60:
        acts.append(free_meal(dest, "dinner", round5(max(t, 18 * 60))))
    _ = d
    return _finish_day(dest, di, day_date, acts, prof)


def _theme(acts):
    c = Counter(t for a in acts if a["kind"] == "visit" for t in a.get("tags", []))
    if not c:
        return {"vi": "Ngày tự do", "en": "Free day"}
    top = c.most_common(1)[0][0]
    v, e = THEMES.get(top, ("Khám phá", "Discover"))
    return {"vi": v, "en": e}


def _finish_day(dest, di, day_date, acts, prof, travelers=1, theme=None):
    day = {"day": di + 1, "date": day_date, "theme": theme or _theme(acts), "activities": acts,
           "start": acts[0]["start"] if acts else hm(PACE_START[prof["pace"]])}
    return day


# ------------------------------------------------------------ reflow & money
def reflow(data, transport, travelers):
    """Recompute travel legs, start times (respecting pinned times and meal/evening
    anchors), overlap warnings. Costs are recomputed by compute_budget."""
    for day in data["days"]:
        acts = day["activities"]
        t = None
        meals_seen = 0
        for i, a in enumerate(acts):
            a.pop("overlap", None)
            a.pop("late", None)
            fixed = to_min(a.get("start"))
            earliest = None
            if a["kind"] in ("meal", "free"):
                base = t if t is not None else (fixed if fixed is not None else 8 * 60 + 30)
                earliest = 11 * 60 + 30 if (meals_seen == 0 and base < 15 * 60) else 18 * 60
                meals_seen += 1
            elif a.get("slot") == "evening":
                earliest = 18 * 60 + 30
            if t is None:
                day_start = to_min(day.get("start") or "")
                start = fixed if (a.get("pinned") and fixed is not None) else (
                    day_start if day_start is not None else (fixed if fixed is not None else 8 * 60 + 30))
                if earliest and not a.get("pinned") and start < earliest:
                    start = earliest
            elif a.get("pinned") and fixed is not None:
                if fixed < t:
                    a["overlap"] = True
                start = fixed
            else:
                start = max(t, earliest) if earliest else t
            start = start if a.get("pinned") else round5(start)
            if start + max(5, int(a.get("duration") or 60)) > 24 * 60:
                a["late"] = True  # runs past midnight: shown as a warning, never silently wrapped
            a["start"] = hm(min(start, 23 * 60 + 55))
            a["duration"] = max(5, int(a.get("duration") or 60))
            end = start + a["duration"]
            nxt = acts[i + 1] if i + 1 < len(acts) else None
            lg = None
            if nxt is not None and a.get("lat") is not None and nxt.get("lat") is not None:
                lg = maps.leg(a, nxt, transport)
            a["travel_to_next"] = lg
            t = end + (lg["minutes"] if lg else (10 if nxt is not None else 0))
    return data


def stay_level(prof, n_days):
    if prof["style"] == "saving":
        return 0
    if prof.get("budget"):
        per_day = prof["budget"] / max(1, n_days)
        return 0 if per_day < 1_000_000 else (1 if per_day < 2_400_000 else 2)
    return 1


def compute_budget(dest, data, prof, travelers):
    d = catalog.DESTINATIONS[dest]
    days = data["days"]
    nights = max(0, len(days) - 1)
    level = data.get("stay_level", stay_level(prof, len(days)))
    stay_night = d["stay"][level]
    cat = {"stay": stay_night * nights, "transport": 0, "food": 0, "tickets": 0, "other": 0}
    for day in days:
        day_cost = {"stay": stay_night if day["day"] <= nights else 0, "transport": 0, "food": BREAKFAST, "tickets": 0}
        for a in day["activities"]:
            c = int(a.get("cost") or 0)
            if a["kind"] in ("meal", "free"):
                day_cost["food"] += c
            else:
                day_cost["tickets"] += c
            day_cost["transport"] += maps.leg_cost(a.get("travel_to_next"), travelers)
        day["cost"] = sum(day_cost.values())
        day["cost_breakdown"] = day_cost
        cat["transport"] += day_cost["transport"]
        cat["food"] += day_cost["food"]
        cat["tickets"] += day_cost["tickets"]
    cat["other"] = money_round(0.08 * (cat["stay"] + cat["transport"] + cat["food"] + cat["tickets"]))
    cat = {k: money_round(v) for k, v in cat.items()}
    per_person = sum(cat.values())
    levels = [("phòng tiết kiệm", "budget rooms"), ("khách sạn tầm trung", "mid-range hotels"),
              ("khách sạn cao cấp", "upscale hotels")]
    data["stay_level"] = level
    data["budget"] = {
        "currency": "VND", "per_person": per_person, "travelers": travelers,
        "group_total": per_person * max(1, travelers), "categories": cat,
        "assumptions": [
            {"vi": f"Lưu trú {nights} đêm, {levels[level][0]}, ở ghép 2 người/phòng.",
             "en": f"{nights} night(s) in {levels[level][1]}, two people sharing a room."},
            {"vi": "Di chuyển nội thành ước tính theo khoảng cách và phương tiện ưu tiên.",
             "en": "Local transport estimated from distance and preferred mode."},
            {"vi": "Giá vé tham quan và ăn uống là mức tham khảo, có thể thay đổi.",
             "en": "Tickets and meals are reference prices and may change."},
            {"vi": "Chi phí khác gồm 8% dự phòng.", "en": "Other costs include an 8% buffer."},
        ],
        "unknown": [
            {"vi": f"Vé máy bay/tàu/xe đến {d['vi']} và quay về chưa được tính.",
             "en": f"Flights/trains/buses to and from {d['en']} are not included."},
            {"vi": "Mua sắm cá nhân, tiền tip và phụ thu mùa cao điểm.",
             "en": "Personal shopping, tips and peak-season surcharges."},
        ],
        "estimate_only": True,
    }
    return data


def compatibility(data, entries):
    out = []
    pp = data["budget"]["per_person"]
    for e in entries:
        b = e["prefs"].get("budget")
        hard = bool(e["prefs"].get("budget_hard"))
        if not b:
            status = "unknown"
        elif pp <= b:
            status = "ok"
        else:
            status = "over_hard" if hard else "over_soft"
        out.append({"user_id": e["user_id"], "name": e["name"], "budget": b, "hard": hard, "status": status})
    return out


def highlights(data, prof):
    acts = [a for day in data["days"] for a in day["activities"] if a["kind"] == "visit"]
    acts.sort(key=lambda a: (-sum(prof["weights"].get(t, 0) for t in a.get("tags", [])) - a.get("cost", 0) / 2e6, a["id"]))
    seen, out = set(), []
    for a in acts:
        if a.get("place_id") in seen:
            continue
        seen.add(a.get("place_id"))
        out.append({"place_id": a.get("place_id"), "name": a["name"]})
        if len(out) >= 5:
            break
    return out


def fit_summary(prof, data, compat):
    top = _top(prof["weights"], 3)
    pv, pe = PACE_NAMES[prof["pace"]]
    pp = data["budget"]["per_person"]
    ok = sum(1 for c in compat if c["status"] in ("ok", "unknown", "over_soft"))
    n = len(compat)
    vi = (f"Ưu tiên {', '.join(INTEREST_NAMES[i][0] for i in top)} với nhịp {pv}; "
          f"ước tính {fmt_vnd(pp)}/người.")
    en = (f"Prioritises {', '.join(INTEREST_NAMES[i][1] for i in top)} at a {pe} pace; "
          f"estimated {fmt_en(pp)} per person.")
    if n > 1:
        vi += f" Phù hợp giới hạn ngân sách cứng của {ok}/{n} thành viên."
        en += f" Fits the hard budget limits of {ok}/{n} members."
    return {"vi": vi, "en": en}


def assemble_plan(dest, dates, prof, entries, travelers, seed, used_global=None, forced=None, ai_text=None,
                  avoid_title=None, engine="local"):
    days = build_days(dest, dates, prof, seed, used_global, forced)
    data = {"dest": dest, "pace": prof["pace"], "style": prof["style"], "transport": prof["transport"],
            "days": days, "engine": engine}
    reflow(data, prof["transport"], travelers)
    compute_budget(dest, data, prof, travelers)
    compat = compatibility(data, entries)
    title = plan_title(prof, avoid_title)
    desc = plan_description(prof, days)
    fit = fit_summary(prof, data, compat)
    if ai_text:
        title = ai_text.get("title") or title
        desc = ai_text.get("description") or desc
        fit = ai_text.get("fit") or fit
        for i, th in enumerate(ai_text.get("themes") or []):
            if i < len(days) and th:
                days[i]["theme"] = th
    data.update({
        "title": title, "description": desc, "fit": fit, "compatibility": compat,
        "suggested_members": prof["members"], "highlights": highlights(data, prof),
        "interests": _top(prof["weights"], 4),
        "unverified": sum(1 for d in days for a in d["activities"] if not a.get("verified", True)),
    })
    return data


# ------------------------------------------------------------ local refinements
def refine_local(dest, data, op, prof, travelers):
    pool = catalog.PLACES_BY_DEST[dest]
    used = {a.get("place_id") for d in data["days"] for a in d["activities"]}
    n_days = len(data["days"])
    for day in data["days"]:
        acts = day["activities"]
        visits = [a for a in acts if a["kind"] == "visit"]
        if op == "lighter" and len(visits) >= 3:
            worst = min(visits, key=lambda a: sum(prof["weights"].get(t, 0) for t in a.get("tags", [])))
            acts.remove(worst)
        elif op == "cheaper" and visits:
            dear = max(visits, key=lambda a: a.get("cost", 0))
            if dear.get("cost", 0) >= 100000:
                alt = _best_alternative(dest, dear, prof, used, n_days, max_cost=dear["cost"] // 2)
                if alt:
                    _replace(acts, dear, alt)
                    used.add(alt["id"])
        elif op in ("more_food", "more_culture", "more_nature") and visits:
            tag = {"more_food": "food", "more_culture": "culture", "more_nature": "nature"}[op]
            if any(tag in a.get("tags", []) for a in visits) and op != "more_food":
                continue
            target = min(visits, key=lambda a: (tag in a.get("tags", []), sum(prof["weights"].get(t, 0) for t in a.get("tags", []))))
            alt = _best_alternative(dest, target, prof, used, n_days, need_tag=tag if tag != "food" else None,
                                    tag_any={"food", "cafe"} if tag == "food" else None)
            if alt:
                _replace(acts, target, alt)
                used.add(alt["id"])
        elif op == "route":
            _route_optimize(acts)
    reflow(data, data.get("transport", prof["transport"]), travelers)
    compute_budget(dest, data, prof, travelers)
    _ = pool
    return data


def _best_alternative(dest, act, prof, used, n_days, max_cost=None, need_tag=None, tag_any=None):
    cands = []
    for p in catalog.PLACES_BY_DEST[dest]:
        if p["id"] in used or p["meal"]:
            continue
        sc = score_place(p, prof, "alt", n_days)
        if sc is None:
            continue
        if max_cost is not None and p["cost"] > max_cost:
            continue
        if need_tag and need_tag not in p["tags"]:
            continue
        if tag_any and not set(p["tags"]) & tag_any:
            continue
        km = maps.haversine_km(act["lat"], act["lng"], p["lat"], p["lng"]) if act.get("lat") is not None else 0
        cands.append((sc - 0.08 * km, p["id"], p))
    cands.sort(key=lambda x: (-x[0], x[1]))
    return cands[0][2] if cands else None


def _replace(acts, old, p):
    i = acts.index(old)
    new = _act_from_place(p, "meal" if p["meal"] else "visit", to_min(old["start"]) or 9 * 60, p["duration"])
    new["id"] = old["id"] + "r"
    acts[i] = new


def _route_optimize(acts):
    # keep meals/free blocks as anchors, reorder visits between anchors by nearest neighbour
    segs, cur = [], []
    for a in acts:
        if a["kind"] in ("meal", "free"):
            segs.append(("seg", cur))
            segs.append(("anchor", a))
            cur = []
        else:
            cur.append(a)
    segs.append(("seg", cur))
    out, last = [], None
    for kind, val in segs:
        if kind == "anchor":
            out.append(val)
            last = val if val.get("lat") is not None else last
            continue
        rest = [a for a in val if a.get("lat") is not None]
        nogeo = [a for a in val if a.get("lat") is None]
        while rest:
            if last is None:
                nxt = rest[0]
            else:
                nxt = min(rest, key=lambda a: maps.haversine_km(last["lat"], last["lng"], a["lat"], a["lng"]))
            rest.remove(nxt)
            out.append(nxt)
            last = nxt
        out.extend(nogeo)
    first_start = acts[0]["start"] if acts else None
    acts[:] = out
    if acts and first_start:
        acts[0]["start"] = first_start
    for a in acts[1:]:
        a["pinned"] = False


def alternatives(dest, data, activity_id, prof, limit=6):
    used = {a.get("place_id") for d in data["days"] for a in d["activities"]}
    act = None
    for d in data["days"]:
        for a in d["activities"]:
            if a["id"] == activity_id:
                act = a
    if not act:
        return []
    want_meal = act["kind"] in ("meal", "free")
    cands = []
    for p in catalog.PLACES_BY_DEST[dest]:
        if p["id"] in used or p["meal"] != want_meal:
            continue
        sc = score_place(p, prof, "alt", len(data["days"]))
        if sc is None:
            continue
        overlap = len(set(p["tags"]) & set(act.get("tags", [])))
        km = maps.haversine_km(act["lat"], act["lng"], p["lat"], p["lng"]) if act.get("lat") is not None else 0
        cands.append((sc + 0.3 * overlap - 0.05 * km, p["id"], p, round(km * maps.ROAD_FACTOR, 1)))
    cands.sort(key=lambda x: (-x[0], x[1]))
    return [dict(c[2], distance_km=c[3]) for c in cands[:limit]]


def activity_from_place(p, start="09:00"):
    return _act_from_place(p, "meal" if p["meal"] else "visit", to_min(start) or 9 * 60, p["duration"])


def custom_activity(name, start="09:00", duration=60, cost=0):
    return {"id": "a" + hashlib.md5(f"custom{name}{start}".encode()).hexdigest()[:8], "kind": "custom",
            "place_id": None, "name": {"vi": name, "en": name}, "address": "", "lat": None, "lng": None,
            "tags": [], "start": start, "duration": duration, "cost": cost, "verified": False,
            "note": {"vi": "Không xác minh được địa điểm — cần xem lại.",
                     "en": "Place could not be verified — needs review."}, "pinned": False}


# ------------------------------------------------- free-text refinements (local)
# Without Claude, a free-text request is read for known intents (keywords) and
# for place names to drop or add. Anything not understood is reported back.
_INTENTS = {
    "lighter": ["nhẹ nhàng", "nhẹ hơn", "thong thả", "chậm", "ít điểm", "bớt điểm", "giảm điểm", "đỡ mệt", "mệt",
                "nghỉ ngơi", "nghỉ nhiều", "thư giãn", "relax", "slower", "lighter", "fewer", "less busy", "rest"],
    "cheaper": ["rẻ", "tiết kiệm", "ít tiền", "giảm chi", "bớt tốn", "đỡ tốn", "đắt", "cheap", "cheaper", "budget",
                "save money", "less money"],
    "more_food": ["ăn", "ẩm thực", "món", "đặc sản", "quán", "cà phê", "cafe", "coffee", "food", "eat", "dining"],
    "more_culture": ["văn hóa", "lịch sử", "bảo tàng", "di tích", "chùa", "đền", "phố cổ", "culture", "history",
                     "museum", "temple", "heritage"],
    "more_nature": ["thiên nhiên", "biển", "núi", "thác", "rừng", "công viên", "cảnh đẹp", "nature", "beach",
                    "mountain", "park", "outdoor"],
    "route": ["tuyến đường", "lộ trình", "đường đi", "gần nhau", "ít di chuyển", "đỡ di chuyển", "bớt di chuyển", "giảm di chuyển", "đi lại",
              "quãng đường", "thuận đường", "route", "closer", "travel less", "less travel"],
}
_INTENT_LABEL = {
    "lighter": ("Nhẹ nhàng hơn", "Lighter pace"), "cheaper": ("Tiết kiệm hơn", "Cheaper"),
    "more_food": ("Thêm ẩm thực & cà phê", "More food & cafes"), "more_culture": ("Thêm văn hóa", "More culture"),
    "more_nature": ("Thêm thiên nhiên", "More nature"), "route": ("Tối ưu tuyến đường", "Optimise route"),
}
_DROP_VERBS = ["bỏ", "xóa", "xoá", "loại", "không đi", "không muốn đi", "không thích", "remove", "skip",
               "drop", "without"]
_ADD_VERBS = ["thêm", "muốn đi", "đi thêm", "cho thêm", "ghé", "add", "include", "visit"]
_GENERIC = {"cho", "toi", "minh", "voi", "nhe", "nha", "di", "o", "the", "a", "an", "to", "please", "them", "bo", "va",
            "giup", "dum", "luon", "nua", "ha", "nhi", "vao", "ra", "lai", "the", "nao"}


def _kw_hit(text_raw, text_flat, kw):
    if re.search(r"(?<!\w)" + re.escape(kw) + r"(?!\w)", text_raw):
        return True
    flat = catalog.strip_accents(kw)
    return len(flat) >= 4 and re.search(r"(?<!\w)" + re.escape(flat) + r"(?!\w)", text_flat) is not None


def _phrases_after(text_raw, verbs):
    """Phrases following any of `verbs`, as (accent-free phrase, (start, end) span in text_raw)."""
    out = []
    for v in verbs:
        for m in re.finditer(r"(?<!\w)" + re.escape(v) + r"(?!\w)\s+([^,.;!?\n]+)", text_raw):
            pos = m.start(1)
            for part in re.split(r"(\s+(?:và|and|với|hoặc|or)\s+)", m.group(1)):
                if re.fullmatch(r"\s+(?:và|and|với|hoặc|or)\s+", part):
                    pos += len(part)
                    continue
                words = [w for w in catalog.strip_accents(part).split() if w]
                while words and words[0] in _GENERIC:
                    words.pop(0)
                while words and words[-1] in _GENERIC:
                    words.pop()
                if len(" ".join(words)) >= 3:
                    out.append((" ".join(words), (m.start(), pos + len(part))))
                pos += len(part)
    return out


def _name_match(phrase, place_name):
    names = [catalog.strip_accents(place_name.get("vi", "")), catalog.strip_accents(place_name.get("en", ""))]
    return any(phrase in n or (len(n) >= 4 and n in phrase) for n in names if n)


def refine_text(dest, data, text, prof, travelers):
    """Apply a free-text request locally. Returns (data, applied) where `applied`
    lists what was understood as {vi, en} labels; empty means nothing matched."""
    raw = re.sub(r"\s+", " ", (text or "").lower()).strip()
    flat = catalog.strip_accents(raw)
    applied = []

    consumed = []  # spans naming specific places; ignored when reading general intents

    # 1. drop named stops already in the plan. Every drop phrase is set aside for intent
    #    reading, so "bỏ quán ăn" never reads as "more food".
    for phrase, span in _phrases_after(raw, _DROP_VERBS):
        consumed.append(span)
        for day in data["days"]:
            for a in list(day["activities"]):
                if a.get("kind") in ("visit", "meal", "custom") and _name_match(phrase, a.get("name") or {}):
                    day["activities"].remove(a)
                    n = a.get("name") or {}
                    applied.append({"vi": "Bỏ " + n.get("vi", ""), "en": "Removed " + n.get("en", n.get("vi", ""))})

    # 2. add named places from the destination's directory
    used = {a.get("place_id") for d in data["days"] for a in d["activities"]}
    for phrase, span in _phrases_after(raw, _ADD_VERBS):
        p = next((p for p in catalog.PLACES_BY_DEST[dest] if p["id"] not in used and _name_match(phrase, p["name"])), None)
        if not p:
            continue
        consumed.append(span)
        day = min(data["days"], key=lambda d: sum(1 for a in d["activities"] if a["kind"] == "visit"))
        acts = day["activities"]
        last_visit = max((i for i, a in enumerate(acts) if a["kind"] == "visit"), default=len(acts) - 1)
        prev = acts[last_visit] if acts else None
        start = to_min(prev["start"]) + prev["duration"] + 20 if prev else 9 * 60
        acts.insert(last_visit + 1, _act_from_place(p, "meal" if p["meal"] else "visit", start, p["duration"]))
        used.add(p["id"])
        applied.append({"vi": "Thêm " + p["name"]["vi"], "en": "Added " + p["name"]["en"]})

    for a, b in consumed:
        raw = raw[:a] + " " * (b - a) + raw[b:]
    flat = catalog.strip_accents(raw)

    # 3. general intents
    for op, kws in _INTENTS.items():
        if any(_kw_hit(raw, flat, k) for k in kws):
            data = refine_local(dest, data, op, prof, travelers)
            applied.append({"vi": _INTENT_LABEL[op][0], "en": _INTENT_LABEL[op][1]})

    if applied:
        reflow(data, data.get("transport", prof["transport"]), travelers)
        compute_budget(dest, data, prof, travelers)
    return data, applied
