import { html, useState, useRef, useEffect } from "./lib.js";
import { Icon, Logo } from "./icons.js";
import { Backdrop, Scene, SCENE_IDS } from "./scenes.js";
import { Avatar, Switch, Seg, Toasts, OfflineBanner, useOutside } from "./ui.js";
import { store, set, useStore, setLang, setGlass, GLASS_DEFAULT, api, navigate, logout, afterLogin, toast, LS } from "./store.js";
import { t, ago, hasKey } from "./i18n.js";

const NAV = [
  { href: "/plan", key: "nav.plan", icon: "compass", match: ["/plan", "/groups", "/join"] },
  { href: "/my-trips", key: "nav.trips", icon: "map", match: ["/my-trips", "/trips", "/rooms", "/itinerary"] },
  { href: "/explore", key: "nav.explore", icon: "globe", match: ["/explore"] },
  { href: "/profile", key: "nav.profile", icon: "user", match: ["/profile"] },
];
const isActive = (item, path) => item.match.some((m) => path === m || path.startsWith(m + "/"));

function LangToggle() {
  const s = useStore();
  return html`<div class="lang" role="group" aria-label=${t("pr.lang")}>
    <button class=${s.lang === "vi" ? "on" : ""} aria-pressed=${s.lang === "vi"} onClick=${() => setLang("vi")}>VI</button>
    <button class=${s.lang === "en" ? "on" : ""} aria-pressed=${s.lang === "en"} onClick=${() => setLang("en")}>EN</button>
  </div>`;
}

function GlassPanel() {
  const s = useStore();
  const g = s.glass;
  return html`<div class="popover" role="dialog" aria-label=${t("glass.title")}>
    <div class="row between mb2"><div class="card-title">${t("glass.title")}</div>
      <button class="link-btn small" onClick=${() => setGlass(GLASS_DEFAULT)}>${t("glass.reset")}</button></div>
    <div class="stack lg">
      <label class="field"><span class="label">${t("glass.blur")} <span class="opt">${g.blur}px</span></span>
        <input class="range" type="range" min="0" max="40" value=${g.blur} onInput=${(e) => setGlass({ blur: +e.target.value })} /></label>
      <label class="field"><span class="label">${t("glass.opacity")} <span class="opt">${g.opacity}%</span></span>
        <input class="range" type="range" min="25" max="92" value=${g.opacity} onInput=${(e) => setGlass({ opacity: +e.target.value })} /></label>
      <div class="field"><span class="label">${t("glass.theme")}</span>
        <${Seg} value=${g.theme} onChange=${(v) => setGlass({ theme: v })} options=${[{ value: "burgundy", label: t("glass.burgundy") }, { value: "cream", label: t("glass.cream") }]} /></div>
      <div class="field"><span class="label">${t("glass.scene")}</span>
        <div class="scene-pick">${["halong", "hoian", "sapa"].map((id) => html`
          <button class=${g.scene === id ? "on" : ""} aria-pressed=${g.scene === id} aria-label=${t("scene." + id)} title=${t("scene." + id)} onClick=${() => setGlass({ scene: id })}><${Scene} id=${id} art /></button>`)}</div></div>
      <div class="row between"><span class="small">${t("glass.reduce")}</span><${Switch} on=${g.reduce} label=${t("glass.reduce")} onChange=${(v) => setGlass({ reduce: v })} /></div>
    </div>
  </div>`;
}

export function notifText(n) {
  const p = n.payload || {};
  const vars = { trip: p.trip_title, from: p.from, code: p.code, name: p.name, by: p.by, version: p.version,
    excerpt: p.excerpt, kind: t("notif.kind." + (p.kind || "comment")) };
  return t("notif." + n.type, vars);
}
export function notifLink(n) {
  const p = n.payload || {};
  if (n.type === "invite") return "/join?code=" + encodeURIComponent(p.code || "");
  if (p.option_id) return "/itinerary/" + p.option_id + (n.type === "comment" ? "?tab=talk" : "");
  if (n.type === "plans_ready" && p.group_id) return "/rooms/" + p.group_id + "/plans";
  if (p.group_id) return "/rooms/" + p.group_id;
  return "/";
}

function NotifPanel({ close }) {
  const s = useStore();
  const markAll = async () => {
    set({ notifs: s.notifs.map((n) => ({ ...n, read: true })), unread: 0 });
    try { await api("/notifications/read", { method: "POST", body: {} }); } catch { /* ignore */ }
  };
  const open = async (n) => {
    if (!n.read) {
      set({ notifs: s.notifs.map((x) => (x.id === n.id ? { ...x, read: true } : x)), unread: Math.max(0, s.unread - 1) });
      api("/notifications/read", { method: "POST", body: { ids: [n.id] } }).catch(() => {});
    }
    close();
    navigate(notifLink(n));
  };
  return html`<div class="popover" role="dialog" aria-label=${t("notif.title")}>
    <div class="row between mb2"><div class="card-title">${t("notif.title")}</div>
      ${s.unread > 0 && html`<button class="link-btn small" onClick=${markAll}>${t("notif.mark")}</button>`}</div>
    ${s.notifs.length === 0 ? html`<p class="muted small" style="margin:6px 0 4px">${t("notif.empty")}</p>` : html`
    <div class="notif-list">${s.notifs.map((n) => html`
      <div class=${"notif " + (n.read ? "" : "unread")} role="button" tabindex="0" onClick=${() => open(n)} onKeyDown=${(e) => e.key === "Enter" && open(n)}>
        <div class="tile-ic" style="width:32px;height:32px"><${Icon} n=${n.type === "comment" ? "message" : n.type === "invite" ? "key" : n.type === "plans_ready" ? "sparkle" : n.type === "finalized" ? "check" : "users"} s=${15} /></div>
        <div style="min-width:0"><div class="t">${notifText(n)}</div><div class="tiny faint">${ago(n.created_at)}</div></div>
      </div>`)}</div>`}
  </div>`;
}

function UserMenu({ close }) {
  const s = useStore();
  const [accounts, setAccounts] = useState([]);
  useEffect(() => { if (s.demo) api("/demo/accounts").then((r) => setAccounts(r.accounts)).catch(() => {}); }, []);
  const go = (p) => { close(); navigate(p); };
  const sw = async (a) => {
    try {
      const r = await api("/demo/switch", { method: "POST", body: { email: a.email } });
      close();
      afterLogin(r.user, false);
      set({ sessionKey: (store.sessionKey || 0) + 1 });
      toast(t("menu.switched", { name: r.user.name }), { kind: "success" });
    } catch (e) { toast(t("err.generic"), { kind: "danger" }); }
  };
  return html`<div class="menu" role="menu">
    <div style="padding:10px 12px 8px"><div class="card-title">${s.user.name}</div><div class="tiny faint">${s.user.email || t("pr.guest_t")}</div></div>
    <div class="sep" />
    <button role="menuitem" onClick=${() => go("/profile")}><${Icon} n="user" s=${16} />${t("menu.account")}</button>
    <button role="menuitem" onClick=${() => go("/my-trips")}><${Icon} n="map" s=${16} />${t("nav.trips")}</button>
    ${accounts.length > 0 && html`<div class="sep" /><div class="menu-label">${t("menu.demo")}</div>
      ${accounts.filter((a) => a.id !== s.user.id).map((a) => html`<button role="menuitem" onClick=${() => sw(a)}><${Avatar} name=${a.name} initials=${a.initials} size="sm" />${a.name}</button>`)}`}
    <div class="sep" />
    <button role="menuitem" class="danger" onClick=${() => { close(); logout(); }}><${Icon} n="logout" s=${16} />${t("menu.logout")}</button>
  </div>`;
}

function Pop({ open, setOpen, btn, children }) {
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false), open);
  return html`<div class="menu-wrap" ref=${ref}>${btn}${open && children}</div>`;
}

function TopBar() {
  const s = useStore();
  const [pop, setPop] = useState(null);
  const toggle = (k) => setPop(pop === k ? null : k);
  const path = s.route.path;
  useEffect(() => setPop(null), [path]);
  return html`<header class="topbar glass">
    <a class="brand" href="/" aria-label="Wayplot">
      <span class="brand-mark"><${Logo} s=${20} /></span>
      <span class="brand-name">WAYPLOT</span>
      <span class="brand-sub">${t("brand.sub")}</span>
    </a>
    <nav class="nav" aria-label="Main">
      ${NAV.map((n) => html`<a href=${n.href} class=${isActive(n, path) ? "active" : ""} aria-current=${isActive(n, path) ? "page" : null}>${t(n.key)}</a>`)}
    </nav>
    <div class="top-actions">
      <span class="hide-sm"><${LangToggle} /></span>
      <${Pop} open=${pop === "glass"} setOpen=${() => setPop(null)} btn=${html`
        <button class="text-btn" aria-expanded=${pop === "glass"} onClick=${() => toggle("glass")} title=${t("glass.title")}><${Icon} n="sliders" /><span class="hide-sm">${t("glass.title")}</span></button>`}>
        <${GlassPanel} /><//>
      ${s.user ? html`
        <${Pop} open=${pop === "notif"} setOpen=${() => setPop(null)} btn=${html`
          <button class="icon-btn" aria-label=${t("notif.title") + (s.unread ? ` (${s.unread})` : "")} aria-expanded=${pop === "notif"} onClick=${() => toggle("notif")}>
            <${Icon} n="bell" />${s.unread > 0 && html`<span class="dot" />`}</button>`}>
          <${NotifPanel} close=${() => setPop(null)} /><//>
        <${Pop} open=${pop === "user"} setOpen=${() => setPop(null)} btn=${html`
          <button class="icon-btn" style="width:auto;padding:0 2px" aria-label=${s.user.name} aria-haspopup="menu" aria-expanded=${pop === "user"} onClick=${() => toggle("user")}>
            <${Avatar} name=${s.user.name} initials=${s.user.initials} /></button>`}>
          <${UserMenu} close=${() => setPop(null)} /><//>
        ${s.user.provider === "guest" && !["/register", "/login"].includes(s.route.path) && html`<a class="btn btn-primary btn-sm" href=${"/register?next=" + encodeURIComponent(s.route.path)}>${t("nav.register")}</a>`}`
      : s.user === null && html`
        <a class="btn btn-ghost btn-sm hide-sm" href="/login">${t("nav.login")}</a>
        <a class="btn btn-primary btn-sm" href="/register">${t("nav.register")}</a>`}
    </div>
  </header>`;
}

function BottomNav() {
  const s = useStore();
  const items = [{ href: "/", key: "nav.home", icon: "home", match: [] }, ...NAV];
  const active = (n) => (n.href === "/" ? s.route.path === "/" : isActive(n, s.route.path));
  return html`<nav class="bottom-nav glass" aria-label="Mobile">
    ${items.map((n) => html`<a href=${n.href} class=${active(n) ? "active" : ""} aria-current=${active(n) ? "page" : null}><${Icon} n=${n.icon} s=${18} /><span>${t(hasKey(n.key + "_s") ? n.key + "_s" : n.key)}</span></a>`)}
  </nav>`;
}

export function Shell({ children }) {
  const s = useStore();
  return html`<div class="app">
    <${Backdrop} id=${s.glass.scene} />
    <${OfflineBanner} />
    ${s.announce && html`<div class="announce">${t("announce")}
      <button aria-label=${t("close")} onClick=${() => { LS.set("wayplot.announce", false); set({ announce: false }); }}><${Icon} n="x" s=${14} /></button></div>`}
    <${TopBar} />
    <main class="main" id="main">${children}</main>
    <${BottomNav} />
    <${Toasts} />
  </div>`;
}

export { LangToggle };
