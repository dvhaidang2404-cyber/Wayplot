// Shared page-level pieces: destination autocomplete, trip cards, page header.
import { html, useState, useEffect, useRef } from "./lib.js";
import { Icon } from "./icons.js";
import { Scene } from "./scenes.js";
import { AvatarStack } from "./ui.js";
import { api, store, useStore } from "./store.js";
import { t, L, fmtRange, ago, monthLabel } from "./i18n.js";

let destCache = null;
export async function getDestinations() {
  if (!destCache) destCache = api("/destinations").then((r) => r.destinations).catch((e) => { destCache = null; throw e; });
  return destCache;
}
export const strip = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();

export function DestinationInput({ value, onChange, error, id = "destination" }) {
  const [all, setAll] = useState([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  useStore();
  useEffect(() => { getDestinations().then(setAll).catch(() => {}); }, []);
  useEffect(() => {
    const d = all.find((x) => x.id === value);
    if (d) setText(L(d.name));
  }, [value, all, store.lang]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = strip(text);
  const list = all.filter((d) => !q || strip(d.name.vi).includes(q) || strip(d.name.en).includes(q) || strip(d.region.vi).includes(q)).slice(0, 8);
  const pick = (d) => { onChange(d.id); setText(L(d.name)); setOpen(false); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((hi + 1) % Math.max(1, list.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + list.length) % Math.max(1, list.length)); }
    else if (e.key === "Enter" && open && list[hi]) { e.preventDefault(); pick(list[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };
  return html`<div class="input-wrap" ref=${box} style="position:relative">
    <input id=${id} class=${"input " + (error ? "invalid" : "")} role="combobox" aria-expanded=${open} aria-autocomplete="list"
      aria-controls=${id + "-list"} aria-invalid=${!!error} aria-describedby=${error ? id + "-err" : null} autocomplete="off"
      placeholder=${t("pf.dest_ph")} value=${text}
      onClick=${() => setOpen(true)} onBlur=${() => setOpen(false)} onKeyDown=${onKey}
      onInput=${(e) => { setText(e.target.value); setOpen(true); setHi(0);
        const exact = all.find((d) => strip(d.name.vi) === strip(e.target.value) || strip(d.name.en) === strip(e.target.value));
        onChange(exact ? exact.id : e.target.value ? "?" + e.target.value : ""); }} />
    <span class="in-btn faint" style="pointer-events:none;padding-right:8px"><${Icon} n="pin" s=${17} /></span>
    ${open && list.length > 0 && html`<div class="autocomplete" role="listbox" id=${id + "-list"}>${list.map((d, i) => html`
      <button type="button" role="option" aria-selected=${i === hi} class=${i === hi ? "hi" : ""} onMouseDown=${(e) => { e.preventDefault(); pick(d); }}>
        <span class="mini"><${Scene} id=${d.id} /></span>
        <span><strong>${L(d.name)}</strong><br /><span class="tiny faint">${L(d.region)} · ${L(d.tagline)}</span></span>
      </button>`)}</div>`}
    ${open && q && list.length === 0 && html`<div class="autocomplete"><div class="small muted" style="padding:10px">${t("err.unsupported_destination")}</div></div>`}
  </div>`;
}

export function tripHref(c) {
  if (c.type === "group" && c.group) {
    if (c.group.room_status === "finalized" && c.finalized_option_id) return "/itinerary/" + c.finalized_option_id;
    return "/rooms/" + c.group.id;
  }
  const oid = c.finalized_option_id || (c.option_ids || [])[0];
  return oid ? "/itinerary/" + oid : "/trips/" + c.id;
}

export function tripStatus(c) {
  if (c.type === "group" && c.group) return t("room." + c.group.room_status);
  return t("status." + c.status);
}

export function TripCard({ c, actions }) {
  return html`<div class="card trip-card">
    <a class="trip-thumb" href=${tripHref(c)} aria-label=${c.title}>
      <${Scene} id=${c.destination} />
      <div class="over"><span class="badge solid">${t("type." + c.type)}</span><span class="badge solid">${tripStatus(c)}</span></div>
    </a>
    <div class="row between" style="align-items:flex-start">
      <div style="min-width:0">
        <a href=${tripHref(c)} style="text-decoration:none"><div class="card-title" style="font-size:16px">${c.title}</div></a>
        <div class="small muted row" style="gap:6px;margin-top:3px"><${Icon} n="pin" s=${13} />${L(c.destination_name)}</div>
        <div class="small faint row" style="gap:6px"><${Icon} n="calendar" s=${13} />${fmtRange(c.start_date, c.end_date)}</div>
      </div>
      ${actions}
    </div>
    <div class="row between">
      ${c.group ? html`<${AvatarStack} people=${c.group.members} />` : html`<span class="small faint">${t("travelers_n", { n: c.travelers })}</span>`}
      <span class="tiny faint">${t("dash.updated", { when: ago(c.updated_at) })}</span>
    </div>
  </div>`;
}

export function PageHead({ eyebrow, title, right, children }) {
  useStore();
  return html`<div class="page-head">
    <div>${eyebrow && html`<p class="eyebrow">${eyebrow}</p>`}<h1 class="h1">${title}</h1></div>
    <div class="right">${right != null ? right : monthLabel()}</div>
    ${children}
  </div>`;
}

export function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
