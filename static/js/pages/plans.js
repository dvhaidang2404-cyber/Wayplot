import { html } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Avatar, AvatarStack, Alert, ErrorBlock, Skel, Empty } from "../ui.js";
import { api, useStore, navigate, useLoad, useEvents } from "../store.js";
import { t, L, money, fmtRange } from "../i18n.js";

const COMPAT_CLS = { ok: "ready", over_soft: "submitted", over_hard: "warn", unknown: "pending" };

export function CompatList({ list }) {
  return html`<div class="list">${list.map((c) => html`
    <div class="list-item" style="padding:9px 0">
      <${Avatar} name=${c.name} size="sm" />
      <div class="grow"><div class="small" style="font-weight:600">${c.name}</div>
        <div class="tiny faint">${c.budget ? money(c.budget) + (c.hard ? " · " + t("sy.hard") : "") : t("pl.c.unknown")}</div></div>
      <span class=${"status " + COMPAT_CLS[c.status]}>${t("pl.c." + c.status)}</span>
    </div>`)}</div>`;
}

function PlanCard({ o, members, gid, single }) {
  const sug = members.filter((m) => o.suggested_members.includes(m.id));
  return html`<article class="card plan-card">
    <div class="row between"><span class="badge solid">${t("pl.option", { n: o.option_number })}</span>
      ${o.status === "finalized" ? html`<span class="badge flag"><${Icon} n="check" s=${11} />${t("pl.finalized")}</span>`
        : html`<span class="tiny faint">${t("pl.engine", { e: t("engine." + (o.engine || "local")) })}</span>`}</div>
    <div><h2 class="h3">${L(o.title)}</h2><p class="small muted" style="margin:6px 0 0">${L(o.description)}</p></div>
    <div class="plan-meta">
      <div><div class="k">${t("pl.pace")}</div><div class="v">${t("p." + o.pace)}</div></div>
      <div><div class="k">${t("pl.row.days")}</div><div class="v">${o.days} · ${o.activity_count}</div></div>
      <div><div class="k">${t("pl.pp")}</div><div class="v accent">${money(o.per_person)}</div></div>
    </div>
    <div><div class="kicker mb2">${t("pl.highlights")}</div>
      <ul class="hl-list">${o.highlights.slice(0, 4).map((h, i) => html`<li><span class="n">${i + 1}</span>${L(h.name)}</li>`)}</ul></div>
    ${o.fit && html`<div><div class="kicker mb2">${t("pl.fit")}</div><p class="small" style="margin:0">${L(o.fit)}</p></div>`}
    ${!single && sug.length > 0 && html`<div><div class="kicker mb2">${t("pl.members")}</div><div class="row wrap">${sug.map((m) => html`<span class="chip static"><${Avatar} name=${m.name} initials=${m.initials} size="sm" />${m.name}</span>`)}</div></div>`}
    ${o.compatibility.length > 0 && html`<details><summary class="small accent" style="cursor:pointer">${t("pl.compat")}</summary><${CompatList} list=${o.compatibility} /></details>`}
    ${o.unverified > 0 && html`<div class="small" style="color:var(--danger)"><${Icon} n="alert" s=${13} /> ${t("it.unverified_n", { n: o.unverified })}</div>`}
    <div class="row wrap mt1" style="margin-top:auto">
      <${Btn} iconR="arrowR" onClick=${() => navigate("/itinerary/" + o.id)}>${t("pl.view")}<//>
      <${Btn} kind="secondary" icon="message" onClick=${() => navigate("/itinerary/" + o.id + "?tab=talk")}>${t("pl.discuss")}<//>
    </div>
  </article>`;
}

export function Plans({ gid }) {
  useStore();
  const { data: d, error, loading, reload } = useLoad(() => api("/groups/" + gid + "/status"), [gid]);
  useEvents({
    "generation.completed": (x) => x.group_id === gid && reload(),
    "itinerary.updated": (x) => x.group_id === gid && reload(),
    "itinerary.finalized": (x) => x.group_id === gid && reload(),
  }, [gid]);
  if (loading) return html`<div class="frame glass wide stack lg"><${Skel} h=${40} w="40%" /><div class="grid g2"><${Skel} h=${460} r=${20} /><${Skel} h=${460} r=${20} /></div></div>`;
  if (error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${error} onRetry=${() => reload(false)} /></div>`;
  const { trip, options, members } = d;
  const back = html`<a class="link-btn" href=${"/rooms/" + gid}>← ${trip.title}</a>`;
  if (!options.length) return html`<div class="frame glass narrow"><p class="eyebrow">${back}</p><${Empty} scene=${trip.destination} title=${t("pl.title")} text=${t("pl.none")} /></div>`;
  const single = options.length === 1;
  const g = options.length >= 3 ? "g3" : options.length === 2 ? "g2" : "";
  const rows = [
    ["pl.pace", (o) => t("p." + o.pace)],
    ["pl.row.days", (o) => o.days],
    ["pl.row.acts", (o) => o.activity_count],
    ["pl.pp", (o) => money(o.per_person)],
    ["pl.row.interests", (o) => (o.interests || []).slice(0, 3).map((i) => t("i." + i)).join(", ")],
    ["pl.members", (o) => members.filter((m) => o.suggested_members.includes(m.id)).map((m) => m.name).join(", ")],
  ];
  return html`<div class="frame glass wide">
    <div class="page-head"><div><p class="eyebrow">${back}</p><h1 class="h1">${single ? t("pl.one") : t("pl.title")}</h1></div>
      <div class="right">${L(trip.destination_name)} · ${fmtRange(trip.start_date, trip.end_date)}</div></div>
    ${!single && html`<div class="mb3"><${Alert} icon="users">${t("pl.ai_note")}<//></div>`}
    ${single ? html`<div class="grid g-main"><${PlanCard} o=${options[0]} members=${members} gid=${gid} single />
        <div class="card" style="padding:0;overflow:hidden;min-height:260px"><${Scene} id=${trip.destination} /></div></div>`
      : html`<div class=${"grid " + g}>${options.map((o) => html`<${PlanCard} o=${o} members=${members} gid=${gid} />`)}</div>`}
    ${!single && html`<div class="card mt4" style="overflow-x:auto">
      <div class="card-title mb2">${t("pl.compare")}</div>
      <table class="diff-table"><thead><tr><th scope="col"></th>${options.map((o) => html`<th scope="col">${t("pl.option", { n: o.option_number })}</th>`)}</tr></thead>
        <tbody>${rows.map(([k, f]) => {
          const vals = options.map(f);
          const diff = new Set(vals.map(String)).size > 1;
          return html`<tr><th scope="row">${t(k)}</th>${vals.map((v) => html`<td class=${diff ? "diff" : ""}>${v || "—"}</td>`)}</tr>`;
        })}</tbody></table>
    </div>`}
  </div>`;
}
