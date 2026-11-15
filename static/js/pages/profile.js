import { html, useState, useEffect } from "../lib.js";
import { Icon } from "../icons.js";
import { Btn, Field, Alert, Switch, Seg, Avatar, ErrorBlock, Skel, Progress, fieldErrors } from "../ui.js";
import { api, store, set, useStore, setLang, logout, useLoad, toast } from "../store.js";
import { t, errText, fmtDate } from "../i18n.js";
import { PageHead } from "../common.js";
import { BudgetFields, InterestFields, fromDefaults, checkPrefs } from "../prefs.js";
import { RegisterForm } from "./auth.js";

function Account() {
  const s = useStore();
  const [name, setName] = useState(s.user.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    if (name.trim().length < 2) { setErr(t("err.required")); return; }
    setBusy(true); setErr(null);
    try { const r = await api("/users/me", { method: "PUT", body: { name } }); set({ user: r.user }); toast(t("pr.saved"), { kind: "success" }); }
    catch (x) { setErr(errText(x)); }
    setBusy(false);
  };
  return html`<section class="card stack lg">
    <div class="row"><${Avatar} name=${s.user.name} initials=${s.user.initials} size="lg" />
      <div><div class="card-title" style="font-size:16px">${s.user.name}</div><div class="small faint">${s.user.email || t("pr.guest_acct")} · ${t("pr.since", { date: fmtDate(s.user.created_at) })}</div></div></div>
    <${Field} id="pname" label=${t("auth.name")} error=${err}><input id="pname" class="input" value=${name} onInput=${(e) => setName(e.target.value)} /><//>
    <${Field} id="pemail" label=${t("auth.email")}><input id="pemail" class="input" value=${s.user.email || ""} disabled /><//>
    <div class="field"><span class="label">${t("pr.lang")}</span>
      <${Seg} value=${s.lang} onChange=${setLang} options=${[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]} /></div>
    <div class="row end"><${Btn} loading=${busy} onClick=${save}>${t("save")}<//></div>
  </section>`;
}

function Password() {
  const [f, setF] = useState({ current: "", new: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const e = {};
    if (!f.current) e.current = t("err.required");
    if (f.new.length < 8 || !/[A-Za-z]/.test(f.new) || !/\d/.test(f.new)) e.new = t("err.password_weak");
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await api("/users/me/password", { method: "PUT", body: f }); setF({ current: "", new: "" }); toast(t("pr.pw_saved"), { kind: "success" }); }
    catch (x) { setErr(fieldErrors(x)); }
    setBusy(false);
  };
  return html`<section class="card stack lg">
    <div class="card-title">${t("pr.password")}</div>
    <div class="grid g2" style="gap:16px">
      <${Field} id="cur" label=${t("pr.current")} error=${err.current}><input id="cur" type="password" autocomplete="current-password" class=${"input " + (err.current ? "invalid" : "")} value=${f.current} onInput=${(e) => setF({ ...f, current: e.target.value })} /><//>
      <${Field} id="npw" label=${t("pr.new")} error=${err.new} hint=${t("auth.pw_hint")}><input id="npw" type="password" autocomplete="new-password" class=${"input " + (err.new ? "invalid" : "")} value=${f.new} onInput=${(e) => setF({ ...f, new: e.target.value })} /><//>
    </div>
    <div class="row end"><${Btn} kind="secondary" loading=${busy} onClick=${save}>${t("save")}<//></div>
  </section>`;
}

function Defaults() {
  const res = useLoad(() => api("/users/me/preferences"));
  const [p, setP] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (res.data && !p) setP(fromDefaults(res.data.preferences)); }, [res.data]);
  if (res.error) return html`<section class="card"><${ErrorBlock} error=${res.error} onRetry=${() => res.reload(false)} /></section>`;
  if (!p) return html`<section class="card"><${Skel} h=${200} /></section>`;
  const setX = (x) => setP({ ...p, ...x });
  const save = async () => {
    const e = checkPrefs(p, { requireInterests: false });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await api("/users/me/preferences", { method: "PUT", body: p }); toast(t("pr.saved"), { kind: "success" }); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(false);
  };
  return html`<section class="card stack lg">
    <div><div class="card-title">${t("pr.defaults")}</div><div class="small faint">${t("pr.defaults_d")}</div></div>
    <${InterestFields} value=${p} set=${setX} errors=${errors} />
    <${BudgetFields} value=${p} set=${setX} errors=${errors} label=${t("mp.budget")} optional />
    <div class="row end"><${Btn} loading=${busy} onClick=${save}>${t("save")}<//></div>
  </section>`;
}

function Subscription() {
  const s = useStore();
  const res = useLoad(() => api("/users/me/subscription"));
  const [busy, setBusy] = useState(false);
  if (!res.data) return html`<section class="burgundy"><${Skel} h=${120} /></section>`;
  const { plan, entitlement: e, personal_quota: q } = res.data;
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await api("/users/me/subscription", { method: "POST", body: { plan: plan === "vip" ? "free" : "vip" } });
      res.setData(r); set({ user: { ...s.user, plan: r.plan } });
      toast(t("pr.saved"), { kind: "success" });
    } catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(false);
  };
  return html`<section class="burgundy stack lg">
    <div class="row between"><span class="kicker" style="color:#D9B56B">${t("pr.plan")}</span><span class="badge solid"><${Icon} n=${plan === "vip" ? "crown" : "star"} s=${11} />${plan === "vip" ? "VIP" : t("pr.free")}</span></div>
    <div><div class="small muted mb2">${t("pr.usage", { u: q.used, l: q.limit })}</div><${Progress} value=${q.used} max=${q.limit} label=${t("pr.usage", { u: q.used, l: q.limit })} /></div>
    <div class="small" style="color:#FBF3EA">${t("pr.ent", { p: e.max_plans, g: e.group_generations })}</div>
    ${s.demo && html`<div class="stack"><${Btn} kind="gold" icon=${plan === "vip" ? "star" : "crown"} loading=${busy} onClick=${toggle}>${plan === "vip" ? t("pr.back_free") : t("pr.try_vip")}<//>
      <div class="tiny faint">${t("pr.vip_note")}</div></div>`}
  </section>`;
}

function Privacy() {
  const s = useStore();
  const st = s.user.settings || {};
  const val = (k, d = true) => (st[k] === undefined ? d : st[k]);
  const upd = async (k, v) => {
    const settings = { ...st, [k]: v };
    set({ user: { ...s.user, settings } });
    try { const r = await api("/users/me", { method: "PUT", body: { settings: { [k]: v } } }); set({ user: r.user }); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  const rows = [["notify_invites", "pr.n.invites"], ["notify_ready", "pr.n.ready"], ["notify_comments", "pr.n.comments"], ["notify_updates", "pr.n.updates"]];
  return html`<section class="card stack">
    <div class="card-title mb2">${t("pr.privacy")}</div>
    ${rows.map(([k, l]) => html`<div class="row between list-item" style="padding:10px 0"><label class="small" for=${k}>${t(l)}</label><${Switch} id=${k} on=${val(k)} label=${t(l)} onChange=${(v) => upd(k, v)} /></div>`)}
    <div class="row between list-item" style="padding:10px 0"><label class="small" for="share_free_text">${t("pr.share_text")}</label><${Switch} id="share_free_text" on=${val("share_free_text", false)} label=${t("pr.share_text")} onChange=${(v) => upd("share_free_text", v)} /></div>
  </section>`;
}

export function Profile() {
  const s = useStore();
  const guest = s.user.provider === "guest";
  return html`<div class="frame glass wide">
    <${PageHead} eyebrow=${s.user.name} title=${t("pr.title")} right=${html`<${Btn} kind="ghost" icon="logout" onClick=${logout}>${t("pr.logout")}<//>`} />
    ${guest && html`<section class="card mb3"><div class="card-title">${t("pr.guest_t")}</div><p class="small muted">${t("pr.guest_d")}</p>
      <${RegisterForm} compact onDone=${() => toast(t("pr.saved"), { kind: "success" })} /></section>`}
    <div class="grid g-main">
      <div class="stack lg"><${Account} />${!guest && html`<${Password} />`}<${Defaults} /></div>
      <div class="stack lg"><${Subscription} /><${Privacy} /></div>
    </div>
  </div>`;
}
