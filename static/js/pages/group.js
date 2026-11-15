import { html, useState, useEffect } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Field, Alert, Modal, Countdown, fieldErrors } from "../ui.js";
import { api, store, useStore, navigate, afterLogin, toast } from "../store.js";
import { t, L, fmtRange, errText } from "../i18n.js";
import { DestinationInput, getDestinations, todayISO } from "../common.js";

export async function copyText(text, okMsg) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast(okMsg || t("rm.copied"), { kind: "success" });
  } catch { toast(text); }
}
export const inviteLink = (code) => location.origin + "/join?code=" + encodeURIComponent(code);
export async function shareInvite(code, title) {
  const url = inviteLink(code);
  if (navigator.share) {
    try { await navigator.share({ title: "Wayplot – " + (title || ""), text: `${t("jn.code")}: ${code}`, url }); return; } catch { /* cancelled */ }
  }
  copyText(url, t("rm.link_copied"));
}

export function InviteCodeBlock({ invite, title, compact }) {
  const [expired, setExpired] = useState(invite && invite.expired);
  useEffect(() => setExpired(invite && invite.expired), [invite && invite.code, invite && invite.expires_at]);
  if (!invite) return null;
  return html`<div>
    <div class="kicker" style="color:#D9B56B">${t("rm.code")}</div>
    <div class="invite-code" aria-label=${t("rm.code") + " " + invite.code}>${invite.code}</div>
    <div class="small" style="color:rgba(251,243,234,.75)">
      ${expired ? html`<span class="badge flag">${t("rm.expired")}</span>`
        : html`${t("rm.expires", { t: "" })}<strong style="color:#FBF3EA"><${Countdown} to=${invite.expires_at} onExpire=${() => setExpired(true)} /></strong>`}
    </div>
    ${!compact && html`<div class="row wrap mt2">
      <${Btn} kind="gold" size="sm" icon="copy" disabled=${expired} onClick=${() => copyText(invite.code)}>${t("rm.copy")}<//>
      <${Btn} kind="secondary" size="sm" icon="share" disabled=${expired} onClick=${() => shareInvite(invite.code, title)} style="color:#F0D8A4;border-color:rgba(217,181,107,.6)">${t("rm.share")}<//>
    </div>`}
  </div>`;
}

export function CreateGroup() {
  useStore();
  const [f, setF] = useState({ title: "", destination: store.route.query.get("dest") || "", start_date: todayISO(21), end_date: todayISO(24), max_members: 6, notes: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState(null);
  const [created, setCreated] = useState(null);
  const [dests, setDests] = useState([]);
  useEffect(() => { getDestinations().then(setDests).catch(() => {}); }, []);
  const dest = dests.find((d) => d.id === f.destination);
  const set = (p) => { setF({ ...f, ...p }); const e = { ...errors }; Object.keys(p).forEach((k) => delete e[k]); setErrors(e); };
  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!f.title.trim()) e.title = t("err.required");
    if (!f.destination) e.destination = t("err.required"); else if (!dest) e.destination = t("err.unsupported_destination");
    if (!f.start_date) e.start_date = t("err.required"); else if (f.start_date < todayISO(0)) e.start_date = t("err.in_past");
    if (!f.end_date) e.end_date = t("err.required"); else if (f.end_date < f.start_date) e.end_date = t("err.date_order");
    else if ((new Date(f.end_date) - new Date(f.start_date)) / 864e5 + 1 > 10) e.end_date = t("err.too_long");
    const mm = +f.max_members;
    if (!Number.isInteger(mm) || mm < 2 || mm > 15) e.max_members = t("err.range");
    setErrors(e); setGeneral(null);
    if (Object.keys(e).length) { const el = document.getElementById(Object.keys(e)[0]); el && el.focus(); return; }
    setBusy(true);
    try {
      const r = await api("/groups", { method: "POST", body: { ...f, max_members: mm } });
      setCreated(r);
    } catch (x) {
      if (x.code === "validation") setErrors(fieldErrors(x)); else setGeneral(errText(x));
    }
    setBusy(false);
  };
  return html`<div class="frame glass wide">
    <div class="page-head"><div><p class="eyebrow">${t("nav.plan")}</p><h1 class="h1">${t("gc.title")}</h1></div></div>
    <div class="form-shell">
      <form class="card form-section" onSubmit=${submit} novalidate>
        ${general && html`<${Alert} kind="danger">${general}<//>`}
        <${Field} id="title" label=${t("gc.name")} req error=${errors.title}>
          <input id="title" class=${"input " + (errors.title ? "invalid" : "")} maxlength="120" placeholder=${t("gc.name_ph")} value=${f.title} onInput=${(e) => set({ title: e.target.value })} /><//>
        <${Field} id="destination" label=${t("pf.dest")} req error=${errors.destination}>
          <${DestinationInput} value=${dest ? f.destination : ""} error=${errors.destination} onChange=${(v) => set({ destination: v.startsWith("?") ? v.slice(1) : v })} /><//>
        <div class="grid g2" style="gap:16px">
          <${Field} id="start_date" label=${t("pf.start")} req error=${errors.start_date}>
            <input id="start_date" type="date" class=${"input " + (errors.start_date ? "invalid" : "")} min=${todayISO(0)} value=${f.start_date} onInput=${(e) => set({ start_date: e.target.value })} /><//>
          <${Field} id="end_date" label=${t("pf.end")} req error=${errors.end_date}>
            <input id="end_date" type="date" class=${"input " + (errors.end_date ? "invalid" : "")} min=${f.start_date} value=${f.end_date} onInput=${(e) => set({ end_date: e.target.value })} /><//>
        </div>
        <${Field} id="max_members" label=${t("gc.max")} req error=${errors.max_members} hint=${t("gc.max_hint")}>
          <input id="max_members" type="number" min="2" max="15" class=${"input " + (errors.max_members ? "invalid" : "")} style="max-width:160px" value=${f.max_members} onInput=${(e) => set({ max_members: e.target.value })} /><//>
        <${Field} id="notes" label=${t("gc.notes")} opt>
          <textarea id="notes" class="textarea" maxlength="600" value=${f.notes} onInput=${(e) => set({ notes: e.target.value })} /><//>
        <${Alert} icon="users">${t("gc.explain")}<//>
        <div class="form-foot"><${Btn} kind="ghost" icon="arrowL" onClick=${() => history.back()}>${t("back")}<//><${Btn} type="submit" size="lg" icon="users" loading=${busy}>${t("gc.submit")}<//></div>
      </form>
      <aside class="sticky-side">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="height:160px;overflow:hidden"><${Scene} id=${dest ? dest.id : "danang"} /></div>
          <div style="padding:18px" class="stack"><div class="h3">${f.title || t("gc.name")}</div>
            <div class="small faint">${dest ? L(dest.name) : "—"} · ${fmtRange(f.start_date, f.end_date)}</div>
            <div class="small faint">${t("members_n", { n: f.max_members || "—" })}</div></div>
        </div>
      </aside>
    </div>
    ${created && html`<${Modal} title=${t("gc.created")} onClose=${() => navigate("/rooms/" + created.group_id)} actions=${html`
        <${Btn} iconR="arrowR" onClick=${() => navigate("/rooms/" + created.group_id)}>${t("jn.open_room")}<//>`}>
      <p class="muted" style="margin-top:0">${t("gc.created_d")}</p>
      <div class="burgundy"><${InviteCodeBlock} invite=${created.invite} title=${f.title} /></div>
    <//>`}
  </div>`;
}

export function Join() {
  const s = useStore();
  const [code, setCode] = useState(store.route.query.get("code") || "");
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState(null);
  const check = async (ev) => {
    ev && ev.preventDefault();
    setErr(null); setPreview(null);
    const c = code.replace(/[^A-Za-z0-9]/g, "");
    if (c.length < 5) { setErr({ code: "code_not_found" }); return; }
    setBusy(true);
    try { const r = await api("/groups/join/preview", { method: "POST", body: { code } }); setPreview(r.group); }
    catch (x) { setErr(x); }
    setBusy(false);
  };
  useEffect(() => { if (code && s.user !== undefined) check(); }, [s.user === undefined]);
  const join = async () => {
    if (!s.user && name.trim().length < 2) { setNameErr(t("err.required")); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api("/groups/join", { method: "POST", body: { code, display_name: name } });
      if (!s.user && r.user) afterLogin(r.user, false);
      toast(t("jn.joined", { trip: r.group.title }), { kind: "success" });
      navigate("/rooms/" + r.group.group_id, { replace: true });
    } catch (x) { setErr(x); setBusy(false); }
  };
  const fmt = (v) => {
    const raw = v.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    return raw;
  };
  const already = err && err.code === "already_member" && err.details.group;
  return html`<div class="frame glass narrow">
    <div class="page-head"><div><p class="eyebrow">${t("dash.join_d")}</p><h1 class="h1">${t("jn.title")}</h1></div></div>
    <form class="card stack lg" onSubmit=${check} novalidate>
      <${Field} id="code" label=${t("jn.code")} hint=${t("jn.example")} error=${err && !already ? errText(err) : null}>
        <div class="join-row">
          <input id="code" class=${"input " + (err && !already ? "invalid" : "")} style="font-family:var(--serif);font-size:22px;font-weight:600;letter-spacing:.14em"
            autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="16" placeholder="WAY-8K2P9" value=${code}
            aria-invalid=${!!(err && !already)} aria-describedby=${err ? "code-err" : null}
            onInput=${(e) => { setCode(fmt(e.target.value)); setPreview(null); setErr(null); }} />
          <${Btn} type="submit" kind="secondary" loading=${busy && !preview}>${t("jn.check")}<//>
        </div>
      <//>
      ${already && html`<${Alert} icon="check" action=${html`<${Btn} size="sm" onClick=${() => navigate("/rooms/" + already.group_id)}>${t("jn.open_room")}<//>`}>${t("err.already_member")}<//>`}
    </form>
    ${preview && html`<div class="card mt3" style="padding:0;overflow:hidden">
      <div class="trip-thumb" style="height:150px;border-radius:0;border:0"><${Scene} id=${preview.destination} /></div>
      <div style="padding:22px" class="stack lg">
        <div><div class="h3" style="font-size:26px">${preview.title}</div>
          <div class="small muted mt1">${L(preview.destination_name)} · ${fmtRange(preview.start_date, preview.end_date)}</div></div>
        <dl class="kv">
          <dt>${t("jn.leader")}</dt><dd>${preview.leader_name}</dd>
          <dt>${t("jn.members")}</dt><dd>${preview.member_count} / ${preview.max_members}</dd>
        </dl>
        <div class="small faint row" style="gap:6px"><${Icon} n="lock" s=${13} />${t("jn.private")}</div>
        ${!s.user && html`<div class="stack">
          <${Alert} icon="user">${t("jn.guest")} <a class="link-btn" href=${"/login?next=" + encodeURIComponent("/join?code=" + code)}>${t("nav.login")}</a><//>
          <${Field} id="display_name" label=${t("jn.display_name")} req error=${nameErr}>
            <input id="display_name" class=${"input " + (nameErr ? "invalid" : "")} maxlength="60" value=${name} onInput=${(e) => { setName(e.target.value); setNameErr(null); }} /><//>
        </div>`}
        <div class="row end"><${Btn} size="lg" icon="check" loading=${busy} onClick=${join}>${t("jn.confirm")}<//></div>
      </div>
    </div>`}
  </div>`;
}
