"""Maps service: place verification + travel estimates.

Default provider is the built-in directory (server/catalog.py).  When
GOOGLE_MAPS_API_KEY is set, free-text stops are verified through the Google
Places API (New) Text Search. The rule from the PRD is enforced everywhere:
if a place cannot be verified we never invent coordinates — the activity is
flagged `verified: false` for the user to review.
"""
import json
import math
import os
import urllib.request

from . import catalog

ROAD_FACTOR = 1.3
MODE_SPEED = {"walk": 4.5, "public": 16, "car": 24, "motorbike": 22}
MODE_OVERHEAD = {"walk": 0, "public": 8, "car": 4, "motorbike": 3}


def haversine_km(a_lat, a_lng, b_lat, b_lng):
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def pick_mode(pref, km):
    if pref == "walk":
        return "walk" if km <= 2.5 else "car"
    if pref == "public":
        return "walk" if km <= 1.0 else "public"
    if pref == "motorbike":
        return "walk" if km <= 0.6 else "motorbike"
    if pref == "car":
        return "walk" if km <= 0.5 else "car"
    return "walk" if km <= 1.2 else "car"  # mixed


def leg(a, b, pref="mixed"):
    """Estimated travel between two points with lat/lng."""
    if not a or not b or a.get("lat") is None or b.get("lat") is None:
        return None
    km = haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]) * ROAD_FACTOR
    mode = pick_mode(pref, km)
    minutes = km / MODE_SPEED[mode] * 60 + MODE_OVERHEAD[mode]
    minutes = max(5, int(math.ceil(minutes / 5.0) * 5))
    return {"km": round(km, 1), "minutes": minutes, "mode": mode, "estimated": True}


def leg_cost(lg, travelers):
    """Rough per-person local transport cost for one leg (VND)."""
    if not lg:
        return 0
    km, mode = lg["km"], lg["mode"]
    if mode == "walk":
        return 0
    if mode == "public":
        return 10000 if km < 15 else 40000
    if mode == "motorbike":
        return int(round((12000 + km * 5000) / 1000.0) * 1000)
    share = max(1, min(int(travelers or 1), 4))
    return int(round((15000 + km * 13000) / share / 1000.0) * 1000)


def search_directory(dest, text, limit=8):
    q = catalog.strip_accents(text or "")
    out = []
    for p in catalog.PLACES_BY_DEST.get(dest, []):
        hay = catalog.strip_accents(p["name"]["vi"] + " " + p["name"]["en"] + " " + p["address"])
        if not q or all(tok in hay for tok in q.split()):
            out.append(p)
    return out[:limit]


def verify_custom_place(dest, text):
    """Return a verified place dict or None. Never fabricates coordinates."""
    hits = search_directory(dest, text, 1)
    if hits:
        return dict(hits[0])
    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        return None
    d = catalog.DESTINATIONS[dest]
    body = {
        "textQuery": f"{text}, {d['vi']}, Việt Nam",
        "languageCode": "vi",
        "locationBias": {"circle": {"center": {"latitude": d["lat"], "longitude": d["lng"]}, "radius": 40000.0}},
    }
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read().decode())
    except Exception:  # network / quota problems -> treat as unverified, never guess
        return None
    places = data.get("places") or []
    if not places:
        return None
    p = places[0]
    loc = p.get("location") or {}
    if "latitude" not in loc:
        return None
    name = (p.get("displayName") or {}).get("text") or text
    return {
        "id": "g-" + p.get("id", "")[:40], "dest": dest, "name": {"vi": name, "en": name},
        "lat": loc["latitude"], "lng": loc["longitude"], "address": p.get("formattedAddress", ""),
        "tags": [], "slot": "any", "duration": 60, "cost": 0, "intensity": 1,
        "desc": {"vi": "", "en": ""}, "flags": [], "meal": False, "verified": True, "source": "google-places",
    }
