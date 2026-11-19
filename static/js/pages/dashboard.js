import { html, useState } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Alert, Empty, ErrorBlock, Skel, SkelCards } from "../ui.js";
import { api, store, useStore, navigate, useLoad, useEvents } from "../store.js";
import { t, L, ago, fmtDate } from "../i18n.js";
import { TripCard, tripHref, todayISO } from "../common.js";
import { notifText, notifLink } from "../shell.js";

function JoinInline() {
  const [code, setCode] = useState("");
  return html`<form class="join-row" onSubmit=${(e) => { e.preventDefault(); navigate("/join?code=" + encodeURIComponent(code)); }}>
    <input class="input" aria-label=${t("jn.code")} placeholder="WAY-8K2P9" value=${code} maxlength="16" onInput=${(e) => setCode(e.target.value.toUpperCase())} />
    <${Btn} type="submit" kind="secondary">${t("dash.join_btn")}<//>
  </form>`;
}

export function Dashboard() {
  const s = useStore();
  const trips = useLoad(() => api("/users/me/trips?filter=upcoming"));
  const quota = useLoad(() => api("/users/me/subscription"));
  useEvents({ "generation.completed": () => trips.reload(), "itinerary.finalized": () => trips.reload(), "member.joined": () => trips.reload() });
  const first = s.user.name.trim();
  const list = trips.data ? trips.data.trips : [];
  const today = todayISO(0);
  return html`<div class="frame glass">
    <div class="page-head">
      <div><p class="eyebrow">${t("dash.hello", { name: first })} ${t("dash.where")}</p><h1 class="h1">${t("nav.overview")}</h1></div>
      <div class="right">${fmtDate(today)}</div>
    </div>

    ${s.user.provider === "guest" && html`<div class="mb3"><${Alert} icon="user" action=${html`<${Btn} size="sm" onClick=${() => navigate("/register?next=/")}>${t("nav.register")}<//>`}>${t("gs.banner")}<//></div>`}
    <div class="grid g3">
      <a class="card link action-card" href="/plan/personal">
        <div class="art"><${Scene} id="hoian" /></div>
        <div class="body"><span class="kicker">01</span><div class="h3">${t("dash.personal")}</div><p class="small muted" style="margin:0">${t("dash.personal_d")}</p></div>
        <span class="round-btn go"><${Icon} n="arrowR" s=${16} /></span>
      </a>
      <a class="card link action-card" href=${s.user.provider === "guest" ? "/register?next=/groups/new" : "/groups/new"}>
        <div class="art"><${Scene} id="halong" /></div>
        <div class="body"><span class="kicker">02</span><div class="h3">${t("dash.group")}</div><p class="small muted" style="margin:0">${t("dash.group_d")}</p></div>
        <span class="round-btn go"><${Icon} n="arrowR" s=${16} /></span>
      </a>
      <div class="burgundy action-card" style="padding:0">
        <div class="body" style="padding:22px">
          <span class="kicker" style="color:#D9B56B">03</span>
          <div class="h3" style="color:#FBF3EA">${t("dash.join")}</div>
          <p class="small muted" style="margin:0 0 10px">${t("dash.join_d")}</p>
          <div class="mt1"><${JoinInline} /></div>
        </div>
      </div>
    </div>

    <div class="grid g-main mt4">
      <section>
        <div class="card-head"><h2 class="h2" style="font-size:22px">${t("dash.upcoming")}</h2><a class="link-btn small" href="/my-trips">${t("view_all")}</a></div>
        ${trips.loading ? html`<${SkelCards} n=${2} />` : trips.error ? html`<${ErrorBlock} error=${trips.error} onRetry=${() => trips.reload(false)} />`
          : list.length === 0 ? html`<div class="card"><${Empty} scene="sapa" title=${t("dash.empty_t")} text=${t("dash.empty_d")}>
              <${Btn} icon="plus" onClick=${() => navigate("/plan")}>${t("dash.first")}<//><//></div>`
          : html`<div class="grid g2">${list.slice(0, 4).map((c) => html`<${TripCard} c=${c} />`)}</div>`}
      </section>
      <aside class="stack lg">
        <div class="card">
          <div class="card-head"><div class="card-title">${t("dash.updates")}</div>${s.unread > 0 && html`<span class="badge flag">${s.unread}</span>`}</div>
          ${s.notifs.length === 0 ? html`<p class="small muted" style="margin:0">${t("notif.empty")}</p>` : html`
          <div class="list">${s.notifs.slice(0, 5).map((n) => html`
            <a class="list-item" href=${notifLink(n)} style="text-decoration:none;color:inherit">
              <span class="tile-ic"><${Icon} n=${n.type === "comment" ? "message" : n.type === "invite" ? "key" : n.type === "plans_ready" ? "sparkle" : "users"} s=${16} /></span>
              <div class="grow"><div class="small" style="line-height:1.4">${notifText(n)}</div><div class="tiny faint">${ago(n.created_at)}</div></div>
            </a>`)}</div>`}
        </div>
        <div class="burgundy">
          <div class="row between"><span class="kicker" style="color:#D9B56B">${t("pr.plan")}</span><span class="badge solid">${s.user.plan === "vip" ? "VIP" : t("pr.free")}</span></div>
          ${quota.data ? html`
            <div class="big-num mt1" style="color:#FBF3EA">${quota.data.personal_quota.remaining}<span class="small faint" style="font-weight:400"> / ${quota.data.personal_quota.limit}</span></div>
            <div class="small muted">${t("pf.quota", { n: quota.data.personal_quota.remaining, limit: quota.data.personal_quota.limit })}</div>
            <div class="small faint mt1">${t("pr.ent", { p: quota.data.entitlement.max_plans, g: quota.data.entitlement.group_generations })}</div>`
          : html`<${Skel} h=${40} w="50%" style="margin-top:10px" />`}
          <div class="small faint mt2 row" style="gap:6px"><${Icon} n="sparkle" s=${13} />${t("dash.engine", { engine: t("engine." + s.engine) })}</div>
        </div>
      </aside>
    </div>
  </div>`;
}

export function PlanChooser() {
  const s = useStore();
  const groupHref = s.user && s.user.provider !== "guest" ? "/groups/new" : "/register?next=/groups/new";
  return html`<div class="frame glass narrow">
    <div class="page-head"><div><p class="eyebrow">${t("nav.plan")}</p><h1 class="h1">${t("plan.choose")}</h1></div></div>
    <div class="grid g2">
      <a class="card link action-card" href="/plan/personal">
        <div class="art"><${Scene} id="dalat" /></div>
        <div class="body"><div class="h3">${t("dash.personal")}</div><p class="small muted" style="margin:0">${t("dash.personal_d")}</p></div>
        <span class="round-btn go"><${Icon} n="arrowR" s=${16} /></span></a>
      <a class="card link action-card" href=${groupHref}>
        <div class="art"><${Scene} id="danang" /></div>
        <div class="body"><div class="h3">${t("dash.group")}</div><p class="small muted" style="margin:0">${t("dash.group_d")}</p></div>
        <span class="round-btn go"><${Icon} n="arrowR" s=${16} /></span></a>
    </div>
    <div class="card mt3 row wrap between">
      <div><div class="card-title">${t("dash.join")}</div><div class="small muted">${t("dash.join_d")}</div></div>
      <div style="min-width:280px;flex:1;max-width:420px"><${JoinInline} /></div>
    </div>
  </div>`;
}
