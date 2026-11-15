import { html, useState, useEffect } from "../lib.js";
import { Icon, Logo } from "../icons.js";
import { Scene, Poster, Silk } from "../scenes.js";
import { Btn, Field, SkelCards, ErrorBlock } from "../ui.js";
import { api, store, useStore, navigate, useLoad } from "../store.js";
import { t, L, money } from "../i18n.js";
import { getDestinations, PageHead } from "../common.js";

function DestCircles({ list }) {
  return html`<div class="dest-circles">${list.map((d) => html`
    <button class="dest-circle" onClick=${() => navigate((store.user ? "/plan/personal?dest=" : "/register?next=" + encodeURIComponent("/plan/personal?dest=")) + d.id)}>
      <span class="ring"><${Scene} id=${d.id} label=${L(d.name)} /></span><span class="name">${L(d.name)}</span>
    </button>`)}</div>`;
}

function Featured({ items, dests }) {
  return html`<div class="grid g4">${items.map((f) => {
    const d = dests.find((x) => x.id === f.dest);
    return html`<a class="card link featured-card" href=${store.user ? "/plan/personal?dest=" + f.dest : "/register"}>
      <div class="thumb"><${Scene} id=${f.dest} />${f.new && html`<span class="corner-tag">${t("land.new")}</span>`}</div>
      <div class="body">
        <div class="card-title" style="font-size:15.5px">${L(f.name)}</div>
        <div class="small faint row" style="gap:6px"><${Icon} n="pin" s=${13} />${d ? L(d.name) : ""} · ${t("land.days", { n: f.days })}</div>
        <div class="row between mt1"><span class="accent" style="font-weight:600">${money(f.price)}<span class="faint small">${t("land.per_person")}</span></span>
          <span class="round-btn" style="width:30px;height:30px"><${Icon} n="arrowR" s=${14} /></span></div>
      </div></a>`;
  })}</div>`;
}

export function Landing() {
  useStore();
  const { data, error, loading, reload } = useLoad(async () => {
    const [dests, f] = await Promise.all([getDestinations(), api("/featured")]);
    return { dests, featured: f.itineraries };
  });
  const [email, setEmail] = useState("");
  const [news, setNews] = useState({});
  const subscribe = async (e) => {
    e.preventDefault();
    setNews({ busy: true });
    try { await api("/newsletter", { method: "POST", body: { email } }); setNews({ ok: true }); setEmail(""); }
    catch (er) { setNews({ err: er.code === "validation" ? t("err.email_format") : t("err.network") }); }
  };
  const feats = ["land.feat1", "land.feat2", "land.feat3", "land.feat4"];
  return html`<div class="landing">
    <section class="hero glass">
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center">
        <span class="kicker">${t("brand.sub")} · AI</span>
        <h1 class="hero-title">${t("land.title1")}<span class="gold">${t("land.title2")}</span></h1>
        <div class="hero-feats">${feats.map((k) => html`<span>${t(k)}</span>`)}</div>
        <p class="muted" style="max-width:560px;font-size:15px;margin:20px 0 26px">${t("land.lead")}</p>
        <div class="row wrap">
          <${Btn} size="lg" iconR="arrowR" onClick=${() => navigate(store.user ? "/plan" : "/register?next=/plan")}>${t("land.cta")}<//>
          <${Btn} kind="secondary" size="lg" icon="key" onClick=${() => navigate("/join")}>${t("land.join")}<//>
        </div>
      </div>
      <div class="poster"><${Poster} /></div>
    </section>

    <section class="frame glass" style="max-width:none;width:100%">
      <div class="section-rule"><h2 class="h2">${t("land.dest")}</h2></div>
      ${loading ? html`<${SkelCards} n=${4} h=${120} />` : error ? html`<${ErrorBlock} error=${error} onRetry=${() => reload(false)} />`
        : html`<${DestCircles} list=${data.dests.filter((d) => d.featured)} />`}
      <div class="section-rule mt6"><h2 class="h2">${t("land.featured")}</h2></div>
      ${data && html`<${Featured} items=${data.featured} dests=${data.dests} />`}
      <div class="row end mt2"><a class="link-btn small" href="/explore">${t("land.see_all")} →</a></div>
    </section>

    <section class="benefits glass">
      ${[["land.b1", "sparkle"], ["land.b2", "map"], ["land.b3", "wallet"], ["land.b4", "users"]].map(([k, ic]) => html`
        <div class="benefit"><span class="ic"><${Icon} n=${ic} s=${20} /></span><div class="card-title" style="font-size:15px">${t(k)}</div><div class="small muted">${t(k + "d")}</div></div>`)}
    </section>

    <section class="big-blocks">
      <div class="burgundy big-block"><${Silk} />
        <div style="position:relative"><span class="kicker">01</span><h2 class="h2 mt1">${t("land.block1")}</h2><p class="muted">${t("land.block1d")}</p></div>
        <div style="position:relative"><${Btn} kind="gold" iconR="arrowR" onClick=${() => navigate(store.user ? "/plan/personal" : "/register?next=/plan/personal")}>${t("land.explore")}<//></div>
      </div>
      <div class="burgundy deep big-block"><${Silk} />
        <div style="position:relative"><span class="kicker">02</span><h2 class="h2 mt1">${t("land.block2")}</h2><p class="muted">${t("land.block2d")}</p></div>
        <div style="position:relative"><${Btn} kind="gold" iconR="arrowR" onClick=${() => navigate(store.user ? "/groups/new" : "/register?next=/groups/new")}>${t("land.create_room")}<//></div>
      </div>
    </section>

    <footer class="footer burgundy deep">
      <div class="stack">
        <div class="row"><span class="brand-mark"><${Logo} s=${20} /></span><span class="brand-name" style="color:#FBF3EA">WAYPLOT</span></div>
        <div class="card-title mt1" style="color:#FBF3EA">${t("land.news")}</div>
        <form class="row" style="max-width:440px" onSubmit=${subscribe} novalidate>
          <input class="input" type="email" aria-label=${t("land.news_ph")} placeholder=${t("land.news_ph")} value=${email} onInput=${(e) => setEmail(e.target.value)} style="background:rgba(255,238,225,.08);color:#FBF3EA" />
          <${Btn} kind="gold" type="submit" loading=${news.busy}>${t("land.subscribe")}<//>
        </form>
        ${news.ok && html`<div class="small" style="color:#D9B56B" role="status">${t("land.subscribed")}</div>`}
        ${news.err && html`<div class="err" role="alert">${news.err}</div>`}
      </div>
      <div class="stack" style="justify-content:space-between">
        <div class="footer-links">${["about", "help", "terms", "privacy", "contact"].map((k) => html`<a href="/explore">${t("foot." + k)}</a>`)}</div>
        <div class="tiny faint" style="text-align:right">© 2026 Wayplot · ${t("land.sample")}</div>
      </div>
    </footer>
  </div>`;
}

export function Explore() {
  useStore();
  const { data, error, loading, reload } = useLoad(async () => {
    const [dests, f] = await Promise.all([getDestinations(), api("/featured")]);
    return { dests, featured: f.itineraries };
  });
  return html`<div class="frame glass">
    <${PageHead} eyebrow=${t("brand.sub")} title=${t("ex.title")} />
    ${loading ? html`<${SkelCards} n=${6} />` : error ? html`<${ErrorBlock} error=${error} onRetry=${() => reload(false)} />` : html`
      <div class="grid g4">${data.dests.map((d) => html`
        <div class="card featured-card">
          <div class="thumb"><${Scene} id=${d.id} label=${L(d.name)} />${d.featured && html`<span class="corner-tag">★</span>`}</div>
          <div class="body">
            <div class="h3">${L(d.name)}</div>
            <div class="small faint">${L(d.region)} · ${t("ex.places", { n: d.place_count })}</div>
            <p class="small muted" style="margin:4px 0 10px">${L(d.tagline)}</p>
            <${Btn} kind="secondary" size="sm" iconR="arrowR" onClick=${() => navigate((store.user ? "" : "/register?next=") + "/plan/personal?dest=" + d.id)}>${t("ex.plan_here")}<//>
          </div></div>`)}</div>
      <div class="section-rule mt6"><h2 class="h2">${t("land.featured")}</h2></div>
      <${Featured} items=${data.featured} dests=${data.dests} />
      <div class="foot-note">${t("land.sample")}</div>`}
  </div>`;
}
