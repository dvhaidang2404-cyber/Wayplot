"""AI orchestrator.

Pipeline (PRD 6.4):
  1. normalise every submission to one schema           (engine.normalize_prefs)
  2. split hard constraints from soft preferences        (engine.synthesize)
  3. compute common interests and key differences        (engine.synthesize)
  4. two/three-plan mode: deterministic clustering       (engine.cluster_two)
  5. model chooses & explains activities from VERIFIED places only,
     returning strict JSON (structured outputs); server validates every id
  6. server lays out times, travel legs and budget       (engine.assemble_plan)

Engines:
  * "claude" – Claude API via the official `anthropic` SDK (needs ANTHROPIC_API_KEY
               or another SDK credential source, and `pip install anthropic`).
  * "local"  – deterministic built-in planner (default when Claude is unavailable).
Select with WAYPLOT_AI_ENGINE=auto|claude|local (default auto).
"""
import json
import logging
import os

from . import catalog, engine

log = logging.getLogger("wayplot.ai")
MODEL = os.environ.get("WAYPLOT_CLAUDE_MODEL", "claude-opus-5-5")


class AIError(Exception):
    pass


def claude_ready():
    mode = os.environ.get("WAYPLOT_AI_ENGINE", "auto")
    if mode == "local":
        return False
    has_cred = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return has_cred or mode == "claude"


def engine_name():
    return "claude" if claude_ready() else "local"


# ------------------------------------------------------------------ Claude
SYSTEM = (
    "You are Wayplot's itinerary planner for trips in Vietnam. You receive a destination, dates, "
    "one or more plan briefs (aggregated, anonymised group preferences with hard constraints) and a list of "
    "VERIFIED candidate places. Choose and order places for each day of each plan using ONLY ids from the "
    "candidate list. Respect hard constraints strictly (dates, avoid-list, maximum budget). Match pace: "
    "slow ≈ 2 sights/day, balanced ≈ 3, fast ≈ 4, plus a lunch place and a dinner place when suitable "
    "meal places exist (meal places have slot lunch/dinner/meal). Group geographically close places on the "
    "same day, never repeat a place within a plan, and make different plans genuinely different. Write short, "
    "warm, concrete texts in both Vietnamese (with full diacritics) and English. Never invent places."
)


def _schema(place_ids, n_plans, n_days):
    day = {
        "type": "object",
        "properties": {
            "theme_vi": {"type": "string"}, "theme_en": {"type": "string"},
            "place_ids": {"type": "array", "items": {"type": "string", "enum": place_ids}},
        },
        "required": ["theme_vi", "theme_en", "place_ids"], "additionalProperties": False,
    }
    plan = {
        "type": "object",
        "properties": {
            "title_vi": {"type": "string"}, "title_en": {"type": "string"},
            "description_vi": {"type": "string"}, "description_en": {"type": "string"},
            "fit_vi": {"type": "string"}, "fit_en": {"type": "string"},
            "days": {"type": "array", "items": day},
        },
        "required": ["title_vi", "title_en", "description_vi", "description_en", "fit_vi", "fit_en", "days"],
        "additionalProperties": False,
    }
    return {"type": "object", "properties": {"plans": {"type": "array", "items": plan}},
            "required": ["plans"], "additionalProperties": False}


def _brief(i, prof, entries, specials):
    return {
        "plan_number": i + 1,
        "members": len(entries),
        "interest_weights": {k: round(v, 2) for k, v in sorted(prof["weights"].items())},
        "pace": prof["pace"], "style": prof["style"], "transport": prof["transport"],
        "max_budget_per_person_vnd": prof["budget"],
        "avoid": prof["avoid"],
        "special_requests": specials,
    }


def _call_claude(user_payload, schema):
    import anthropic

    client = anthropic.Anthropic()
    try:
        resp = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": schema}},
            system=SYSTEM,
            messages=[{"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)}],
        )
    except anthropic.RateLimitError as e:
        raise AIError("rate_limited") from e
    except anthropic.APIStatusError as e:
        raise AIError(f"api_status_{e.status_code}") from e
    except anthropic.APIConnectionError as e:
        raise AIError("network") from e
    if resp.stop_reason == "refusal":
        raise AIError("refusal")
    if resp.stop_reason == "max_tokens":
        raise AIError("truncated")
    text = next((b.text for b in resp.content if b.type == "text"), None)
    if not text:
        raise AIError("empty")
    try:
        return json.loads(text)
    except ValueError as e:
        raise AIError("invalid_json") from e


def _candidates(dest, avoid):
    out = []
    for p in catalog.PLACES_BY_DEST[dest]:
        if engine.violates(p, avoid, dest):
            continue
        out.append({"id": p["id"], "name_vi": p["name"]["vi"], "name_en": p["name"]["en"], "tags": p["tags"],
                    "slot": p["slot"], "minutes": p["duration"], "cost_vnd": p["cost"],
                    "lat": p["lat"], "lng": p["lng"], "intensity": p["intensity"]})
    return out


def _validated_days(plan_json, n_days, dest):
    """Keep only known, non-repeated ids that belong to the destination."""
    days, seen, dropped = [], set(), 0
    for d in (plan_json.get("days") or [])[:n_days]:
        ids = []
        for pid in d.get("place_ids") or []:
            p = catalog.PLACES.get(pid)
            if not p or p["dest"] != dest or pid in seen:
                dropped += 1
                continue
            seen.add(pid)
            ids.append(pid)
        days.append(ids)
    return days, dropped


def _ai_text(pj):
    themes = [{"vi": d.get("theme_vi"), "en": d.get("theme_en")} for d in pj.get("days") or []]
    return {
        "title": {"vi": pj["title_vi"], "en": pj["title_en"]},
        "description": {"vi": pj["description_vi"], "en": pj["description_en"]},
        "fit": {"vi": pj["fit_vi"], "en": pj["fit_en"]},
        "themes": themes,
    }


# ---------------------------------------------------------------- generation
def plan_profiles(snapshot):
    """Deterministic grouping -> list of (profile, entries) per requested plan."""
    entries = snapshot["entries"]
    count = snapshot["plan_count"]
    whole = engine.aggregate_profile(entries)
    if count == 1:
        return [(whole, entries)]
    A, B, same = engine.cluster_two(entries)
    pa, pb = engine.aggregate_profile(A, entries), engine.aggregate_profile(B, entries)
    if same:
        # identical tastes: plan B leans on secondary interests and a contrasting pace
        top = engine._top(pb["weights"], 9)
        pb["weights"] = {k: (0.4 if k in top[:2] else 0.8) for k in engine.INTERESTS}
        pb["pace"] = "fast" if pa["pace"] != "fast" else "slow"
    plans = [(pa, A), (pb, B)]
    if count >= 3:
        plans.append((whole, entries))
    return plans


def generate_plans(snapshot, progress=lambda stage: None):
    dest = snapshot["dest"]
    dates = engine.date_list(snapshot["start_date"], snapshot["end_date"])
    travelers = snapshot.get("travelers") or len(snapshot["entries"]) or 1
    entries = snapshot["entries"]
    if os.environ.get("WAYPLOT_SIMULATE_AI_FAILURE") == "1":
        raise AIError("simulated")

    progress("check")
    profiles = plan_profiles(snapshot)
    progress("common")
    progress("budget")
    use_claude = claude_ready()
    ai_out = None
    if use_claude:
        avoid = profiles[0][0]["avoid"]
        cands = _candidates(dest, avoid)
        specials = [e["prefs"]["special"] for e in entries if e["prefs"].get("special")]
        payload = {
            "destination": catalog.DESTINATIONS[dest]["vi"], "dates": dates,
            "plans": [_brief(i, p, ents, specials) for i, (p, ents) in enumerate(profiles)],
            "candidates": cands,
            "instructions": f"Return exactly {len(profiles)} plan(s), each with exactly {len(dates)} day(s).",
        }
        schema = _schema([c["id"] for c in cands], len(profiles), len(dates))
        try:
            ai_out = _call_claude(payload, schema)
        except AIError:
            raise
        except Exception as e:  # SDK not installed correctly, etc.
            raise AIError(str(e)[:120]) from e
    progress("options")
    plans = []
    used = set()
    prev_title = None
    for i, (prof, ents) in enumerate(profiles):
        forced, text, eng = None, None, "local"
        if ai_out:
            ai_plans = ai_out.get("plans") or []
            pj = ai_plans[i] if i < len(ai_plans) else None
            if pj:
                forced, dropped = _validated_days(pj, len(dates), dest)
                text = _ai_text(pj)
                eng = "claude"
                if dropped:
                    log.warning("AI returned %d unknown/duplicate place ids (dropped)", dropped)
        seed = f"{snapshot.get('seed', '')}:{i}"
        data = engine.assemble_plan(dest, dates, prof, entries, travelers, seed,
                                    used_global=used if len(profiles) > 1 and i < 2 else None,
                                    forced=forced, ai_text=text, avoid_title=prev_title, engine=eng)
        if len(profiles) > 1:
            used |= {a["place_id"] for d in data["days"] for a in d["activities"]
                     if a.get("place_id") and a["kind"] == "visit"}
        data["suggested_members"] = [e["user_id"] for e in ents] if len(profiles) > 1 else [e["user_id"] for e in entries]
        prev_title = data["title"]["vi"]
        plans.append(data)
    return plans


def refine(snapshot_like, data, op, instruction=None):
    """Return a refined copy of `data` (not saved)."""
    dest = data["dest"]
    prof = snapshot_like["profile"]
    travelers = snapshot_like.get("travelers", 1)
    if instruction and claude_ready():
        dates = [d["date"] for d in data["days"]]
        cands = _candidates(dest, prof["avoid"])
        payload = {
            "destination": catalog.DESTINATIONS[dest]["vi"], "dates": dates,
            "current_plan": [{"day": d["day"], "place_ids": [a["place_id"] for a in d["activities"] if a.get("place_id")]}
                             for d in data["days"]],
            "plans": [_brief(0, prof, [None], [])],
            "change_request": instruction[:500],
            "candidates": cands,
            "instructions": "Return exactly 1 plan applying the change request with minimal other changes.",
        }
        out = _call_claude(payload, _schema([c["id"] for c in cands], 1, len(dates)))
        pj = (out.get("plans") or [None])[0]
        if not pj:
            raise AIError("empty")
        forced, _ = _validated_days(pj, len(dates), dest)
        prof2 = dict(prof, members=data.get("suggested_members", []))
        new = engine.assemble_plan(dest, dates, prof2, snapshot_like.get("entries", []), travelers, "refine",
                                   forced=forced, ai_text=_ai_text(pj), engine="claude")
        for k in ("title", "description", "fit", "suggested_members"):
            new[k] = data.get(k, new.get(k))
        return new
    applied = []
    if instruction:
        data, applied = engine.refine_text(dest, data, instruction, prof, travelers)
        if not applied and not op:
            raise RefineNotUnderstood()
    if op:
        data = engine.refine_local(dest, data, op, prof, travelers)
    data["_applied"] = applied
    return data


class RefineNotUnderstood(Exception):
    pass
