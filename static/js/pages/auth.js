import { html, useState, useEffect } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Field, Modal, Alert, Avatar, fieldErrors } from "../ui.js";
import { api, store, useStore, navigate, afterLogin } from "../store.js";
import { t, errText } from "../i18n.js";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const nextPath = () => {
  const n = store.route.query.get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
};

function PasswordInput({ id, value, onInput, invalid, autocomplete }) {
  const [show, setShow] = useState(false);
  return html`<div class="input-wrap">
    <input id=${id} class=${"input " + (invalid ? "invalid" : "")} type=${show ? "text" : "password"} value=${value} onInput=${onInput}
      autocomplete=${autocomplete} aria-invalid=${!!invalid} aria-describedby=${invalid ? id + "-err" : null} />
    <button type="button" class="icon-btn in-btn" aria-label=${show ? t("auth.hide") : t("auth.show")} aria-pressed=${show} onClick=${() => setShow(!show)}>
      <${Icon} n=${show ? "eyeOff" : "eye"} s=${17} /></button>
  </div>`;
}

function AuthFrame({ children, scene = "hoian" }) {
  return html`<div class="auth-wrap glass">
    <div class="auth-art"><${Scene} id=${scene} />
      <div class="cap"><span class="kicker" style="color:#E9CD8F">Wayplot</span><div class="h2 mt1" style="color:#FBF3EA;text-transform:none;letter-spacing:.02em">${t("auth.art")}</div></div></div>
    <div class="auth-form">${children}</div>
  </div>`;
}

function DemoAccounts() {
  const s = useStore();
  const [list, setList] = useState([]);
  useEffect(() => { if (s.demo) api("/demo/accounts").then((r) => setList(r.accounts)).catch(() => {}); }, [s.demo]);
  if (!list.length) return null;
  const go = async (a) => {
    const r = await api("/demo/switch", { method: "POST", body: { email: a.email } });
    afterLogin(r.user);
    navigate(nextPath(), { replace: true });
  };
  return html`<div class="card tight">
    <div class="kicker">${t("menu.demo")}</div>
    <div class="row wrap mt1">${list.slice(0, 5).map((a) => html`<button class="chip sm" onClick=${() => go(a)}><${Avatar} name=${a.name} initials=${a.initials} size="sm" />${a.name}</button>`)}</div>
  </div>`;
}

export function Login() {
  useStore();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState(null);
  const [forgot, setForgot] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.email) er.email = t("err.required"); else if (!EMAIL.test(f.email)) er.email = t("err.email_format");
    if (!f.password) er.password = t("err.required");
    setErr(er); setGeneral(null);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await api("/auth/login", { method: "POST", body: f });
      afterLogin(r.user);
      navigate(nextPath(), { replace: true });
    } catch (x) { setGeneral(errText(x)); setBusy(false); }
  };
  return html`<${AuthFrame}>
    <div><span class="kicker">${t("auth.welcome")}</span><h1 class="h1 mt1">${t("auth.login")}</h1></div>
    ${general && html`<${Alert} kind="danger">${general}<//>`}
    <form class="stack lg" onSubmit=${submit} novalidate>
      <${Field} id="email" label=${t("auth.email")} error=${err.email}>
        <input id="email" class=${"input " + (err.email ? "invalid" : "")} type="email" autocomplete="email" value=${f.email} aria-invalid=${!!err.email}
          aria-describedby=${err.email ? "email-err" : null} onInput=${(e) => setF({ ...f, email: e.target.value })} /><//>
      <${Field} id="password" label=${t("auth.password")} error=${err.password}>
        <${PasswordInput} id="password" value=${f.password} invalid=${err.password} autocomplete="current-password" onInput=${(e) => setF({ ...f, password: e.target.value })} /><//>
      <div class="row between"><button type="button" class="link-btn small" onClick=${() => setForgot(true)}>${t("auth.forgot")}</button></div>
      <${Btn} type="submit" size="lg" block loading=${busy}>${t("auth.login")}<//>
    </form>
    <p class="small muted" style="margin:0">${t("auth.no_account")} <a class="link-btn" href=${"/register" + location.search}>${t("nav.register")}</a></p>
    <${DemoAccounts} />
    ${forgot && html`<${ForgotModal} onClose=${() => setForgot(false)} initial=${f.email} />`}
  <//>`;
}

function ForgotModal({ onClose, initial }) {
  const [email, setEmail] = useState(initial || "");
  const [state, setState] = useState({});
  const send = async () => {
    if (!EMAIL.test(email)) { setState({ err: t("err.email_format") }); return; }
    setState({ busy: true });
    try { await api("/auth/forgot", { method: "POST", body: { email } }); setState({ sent: true }); }
    catch (e) { setState({ err: errText(e) }); }
  };
  return html`<${Modal} title=${t("auth.forgot_title")} onClose=${onClose} actions=${state.sent ? html`<${Btn} onClick=${onClose}>${t("close")}<//>` : html`
      <${Btn} kind="ghost" onClick=${onClose}>${t("cancel")}<//><${Btn} loading=${state.busy} onClick=${send}>${t("auth.send")}<//>`}>
    ${state.sent ? html`<${Alert} icon="check">${t("auth.forgot_sent")}<//>` : html`
      <p class="muted" style="margin-top:0">${t("auth.forgot_text")}</p>
      <${Field} id="forgot-email" label=${t("auth.email")} error=${state.err}>
        <input id="forgot-email" class=${"input " + (state.err ? "invalid" : "")} type="email" autofocus value=${email} onInput=${(e) => setEmail(e.target.value)} /><//>`}
  <//>`;
}

export function RegisterForm({ onDone, compact }) {
  const [f, setF] = useState({ name: store.user && store.user.provider === "guest" ? store.user.name : "", email: "", password: "", confirm: "", agree: false });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState(null);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = t("err.required");
    if (!EMAIL.test(f.email)) er.email = t("err.email_format");
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = t("err.password_weak");
    if (f.confirm !== f.password) er.confirm = t("err.password_mismatch");
    if (!f.agree) er.agree = t("err.agree_required");
    setErr(er); setGeneral(null);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await api("/auth/register", { method: "POST", body: f });
      afterLogin(r.user, false);
      onDone(r);
    } catch (x) {
      if (x.code === "validation") setErr(fieldErrors(x)); else setGeneral(errText(x));
      setBusy(false);
    }
  };
  return html`<form class="stack lg" onSubmit=${submit} novalidate>
    ${general && html`<${Alert} kind="danger">${general}<//>`}
    <${Field} id="name" label=${t("auth.name")} error=${err.name}>
      <input id="name" class=${"input " + (err.name ? "invalid" : "")} autocomplete="name" value=${f.name} onInput=${up("name")} aria-invalid=${!!err.name} /><//>
    <${Field} id="remail" label=${t("auth.email")} error=${err.email}>
      <input id="remail" class=${"input " + (err.email ? "invalid" : "")} type="email" autocomplete="email" value=${f.email} onInput=${up("email")} aria-invalid=${!!err.email} /><//>
    <div class=${compact ? "stack lg" : "grid g2"} style="gap:16px">
      <${Field} id="rpw" label=${t("auth.password")} error=${err.password} hint=${t("auth.pw_hint")}>
        <${PasswordInput} id="rpw" value=${f.password} invalid=${err.password} autocomplete="new-password" onInput=${up("password")} /><//>
      <${Field} id="rpw2" label=${t("auth.confirm")} error=${err.confirm}>
        <${PasswordInput} id="rpw2" value=${f.confirm} invalid=${err.confirm} autocomplete="new-password" onInput=${up("confirm")} /><//>
    </div>
    <div class="field"><label class="check"><input type="checkbox" checked=${f.agree} onChange=${up("agree")} /><span>${t("auth.agree")}</span></label>
      ${err.agree && html`<div class="err" role="alert"><${Icon} n="alert" s=${14} />${err.agree}</div>`}</div>
    <${Btn} type="submit" size="lg" block loading=${busy}>${t("auth.register")}<//>
  </form>`;
}

export function Register() {
  useStore();
  return html`<${AuthFrame} scene="sapa">
    <div><span class="kicker">${t("auth.join_us")}</span><h1 class="h1 mt1">${t("auth.register")}</h1></div>
    <${RegisterForm} onDone=${() => navigate(nextPath(), { replace: true })} />
    <p class="small muted" style="margin:0">${t("auth.have_account")} <a class="link-btn" href=${"/login" + location.search}>${t("nav.login")}</a></p>
  <//>`;
}
