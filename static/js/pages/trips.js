import { html, useState, useRef } from "../lib.js";
import { Icon } from "../icons.js";
import { Btn, Seg, Confirm, ErrorBlock, SkelCards, Empty, useOutside } from "../ui.js";
import { api, store, useStore, navigate, useLoad, toast } from "../store.js";
import { t, errText } from "../i18n.js";
import { TripCard, tripHref, PageHead } from "../common.js";

function TripMenu({ c, reload, filter }) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false), open);
  const owner = c.owner_id === s.user.id;
  const act = async (fn, msg) => {
    setOpen(false);
    try { await fn(); msg && toast(msg, { kind: "success" }); reload(); } catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  return html`<div class="menu-wrap" ref=${ref}>
    <button class="icon-btn" aria-label=${t("rm.manage") + " " + c.title} aria-haspopup="menu" aria-expanded=${open} onClick=${() => setOpen(!open)}><${Icon} n="dots" /></button>
    ${open && html`<div class="menu" role="menu">
      <button role="menuitem" onClick=${() => navigate(tripHref(c))}><${Icon} n="arrowR" s=${16} />${t("open")}</button>
      ${c.type === "personal" && html`<button role="menuitem" onClick=${() => act(() => api("/trips/" + c.id + "/duplicate", { method: "POST" }), t("tr.duplicated"))}><${Icon} n="duplicate" s=${16} />${t("tr.duplicate")}</button>`}
      ${owner && html`<button role="menuitem" onClick=${() => act(() => api("/trips/" + c.id + "/archive", { method: "POST", body: { restore: c.archived } }), t("pr.saved"))}>
        <${Icon} n="archive" s=${16} />${c.archived ? t("tr.unarchive") : t("tr.archive")}</button>`}
      ${owner && html`<div class="sep" /><button role="menuitem" class="danger" onClick=${() => { setOpen(false); setDel(true); }}><${Icon} n="trash" s=${16} />${t("tr.delete")}</button>`}
    </div>`}
    ${del && html`<${Confirm} danger title=${t("tr.delete_t")} text=${t("tr.delete_d", { t: c.title })} confirmLabel=${t("tr.delete")} onClose=${() => setDel(false)}
      onConfirm=${async () => { await api("/trips/" + c.id, { method: "DELETE" }); reload(); }} />`}
  </div>`;
}

export function MyTrips() {
  useStore();
  const [filter, setFilter] = useState(store.route.query.get("filter") || "all");
  const { data, error, loading, reload } = useLoad(() => api("/users/me/trips?filter=" + filter), [filter]);
  const filters = ["all", "personal", "group", "upcoming", "past", "archived"];
  return html`<div class="frame glass wide">
    <${PageHead} eyebrow=${t("brand.sub")} title=${t("tr.title")} right=${html`<${Btn} icon="plus" size="sm" onClick=${() => navigate("/plan")}>${t("nav.plan")}<//>`} />
    <div class="mb3" style="overflow-x:auto"><${Seg} value=${filter} onChange=${(v) => { setFilter(v); history.replaceState({}, "", "/my-trips?filter=" + v); }} label=${t("tr.title")}
      options=${filters.map((f) => ({ value: f, label: t("tr.f." + f) }))} /></div>
    ${loading ? html`<${SkelCards} n=${3} />` : error ? html`<${ErrorBlock} error=${error} onRetry=${() => reload(false)} />`
      : data.trips.length === 0 ? html`<div class="card"><${Empty} scene="dalat" title=${filter === "all" ? t("dash.empty_t") : null} text=${filter === "all" ? t("dash.empty_d") : t("tr.empty")}>
          ${filter === "all" && html`<${Btn} icon="plus" onClick=${() => navigate("/plan")}>${t("dash.first")}<//>`}<//></div>`
      : html`<div class="grid g3">${data.trips.map((c) => html`<${TripCard} c=${c} actions=${html`<${TripMenu} c=${c} reload=${reload} />`} />`)}</div>`}
  </div>`;
}
