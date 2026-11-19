// Leaflet map with numbered burgundy pins and a route polyline. Only verified
// coordinates are plotted; stops without coordinates are listed as "no map location".
import { html, useEffect, useRef, useState } from "./lib.js";
import { Icon } from "./icons.js";
import { t, L as tr } from "./i18n.js";

// Tile providers, tried in order. Keyless providers only. tile.openstreetmap.org and CARTO
// are not used: OSM's usage policy blocks apps like this one and CARTO now needs an API key,
// and both answer with an image ("Access blocked" / "API key required") that never
// triggers the fallback.
const PROVIDERS = [
  { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", max: 19,
    attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community" },
  { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", max: 19, subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles: HOT / OSM France' },
];
// Remember a fallback for a day so a network that blocks the first provider doesn't retry it on every map.
const TILE_KEY = "wayplot.tiles3";
let providerIdx = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(TILE_KEY) || "null");
    return v && Date.now() - v.at < 864e5 && v.idx > 0 && v.idx < PROVIDERS.length ? v.idx : 0;
  } catch { return 0; }
})();
function addTiles(m, idx) {
  const p = PROVIDERS[idx];
  const layer = window.L.tileLayer(p.url, { maxZoom: p.max, attribution: p.attribution, subdomains: p.subdomains || "abc", detectRetina: false });
  let ok = false, errs = 0;
  layer.on("tileload", () => { ok = true; });
  layer.on("tileerror", () => {
    errs++;
    if (!ok && errs >= 2 && idx + 1 < PROVIDERS.length && providerIdx === idx) {
      providerIdx = idx + 1;
      try { localStorage.setItem(TILE_KEY, JSON.stringify({ idx: providerIdx, at: Date.now() })); } catch {}
      m.removeLayer(layer);
      addTiles(m, providerIdx);
    }
  });
  layer.addTo(m);
}

export function MapView({ points, center, activeId, onPick }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const markers = useRef({});
  const [full, setFull] = useState(false);
  const fitKey = useRef(null);
  const geoKey = JSON.stringify(points.map((p) => [p.id, p.lat, p.lng, p.n]));

  useEffect(() => {
    if (!window.L || !el.current) return;
    const m = window.L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    addTiles(m, providerIdx);
    m.setView(center ? [center.lat, center.lng] : [16.05, 108.2], 13);
    layer.current = window.L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    markers.current = {};
    const geo = points.filter((p) => p.lat != null && p.lng != null);
    geo.forEach((p) => {
      const icon = window.L.divIcon({
        className: "",
        html: `<div class="pin ${p.meal ? "meal" : ""} ${p.id === activeId ? "active" : ""}"><span>${p.n}</span></div>`,
        iconSize: [30, 30], iconAnchor: [15, 34], popupAnchor: [0, -30],
      });
      const mk = window.L.marker([p.lat, p.lng], { icon, title: tr(p.name), keyboard: true, riseOnHover: true }).addTo(layer.current);
      const pop = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${p.n}. ${tr(p.name)}`;
      const small = document.createElement("div");
      small.style.cssText = "font-size:12px;color:#5A4A44;margin-top:2px";
      small.textContent = `${p.start || ""} · ${p.address || ""}`;
      pop.append(strong, small);
      mk.bindPopup(pop);
      mk.on("click", () => onPick && onPick(p.id));
      markers.current[p.id] = mk;
    });
    if (geo.length > 1) {
      window.L.polyline(geo.map((p) => [p.lat, p.lng]), { color: "#5C0F1F", weight: 3, opacity: 0.75, dashArray: "6 7" }).addTo(layer.current);
    }
    const fit = () => {
      m.invalidateSize();
      if (geo.length > 1) m.fitBounds(window.L.latLngBounds(geo.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 15 });
      else if (geo.length === 1) m.setView([geo[0].lat, geo[0].lng], 15);
      else if (center) m.setView([center.lat, center.lng], 13);
    };
    if (fitKey.current !== geoKey) { fitKey.current = geoKey; fit(); setTimeout(fit, 120); }
  }, [geoKey, activeId]);

  useEffect(() => {
    const mk = activeId && markers.current[activeId];
    if (mk && map.current) { map.current.panTo(mk.getLatLng(), { animate: true }); }
  }, [activeId]);

  useEffect(() => {
    setTimeout(() => map.current && map.current.invalidateSize(), 60);
    if (!full) return;
    const k = (e) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [full]);

  const missing = points.filter((p) => p.lat == null).length;
  return html`<div class=${"map-box " + (full ? "fullscreen" : "")}>
    <div class="map-el" ref=${el} role="region" aria-label=${t("land.feat2")} />
    <div class="map-tools">
      <button class="round-btn" onClick=${() => setFull(!full)} aria-label=${full ? t("it.map_close") : t("it.map_full")} title=${full ? t("it.map_close") : t("it.map_full")}>
        <${Icon} n=${full ? "minimize" : "maximize"} s=${16} /></button>
    </div>
    ${missing > 0 && html`<div style="position:absolute;left:12px;bottom:26px;z-index:500" class="badge solid"><${Icon} n="pin" s=${12} />${missing} · ${t("it.no_geo")}</div>`}
    ${!window.L && html`<div class="empty" style="position:absolute;inset:0;color:#5A4A44"><p>Map unavailable</p></div>`}
  </div>`;
}
