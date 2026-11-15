import { html, render, useState, useEffect, useRef, useMemo, useLayoutEffect } from "./lib.js";
import { Icon } from "./icons.js";
import { Scene } from "./scenes.js";
import { store, dismissToast, useStore } from "./store.js";
import { t, errText } from "./i18n.js";

export function Btn({ kind = "primary", size, icon, iconR, loading, block, cls = "", children, ...rest }) {
  const c = `btn btn-${kind} ${size ? "btn-" + size : ""} ${block ? "btn-block" : ""} ${loading ? "loading" : ""} ${cls}`;
  if (rest.href) return html`<a class=${c} ...${rest}>${icon && html`<${Icon} n=${icon} s=${16} />`}${children}${iconR && html`<${Icon} n=${iconR} s=${16} />`}</a>`;
  return html`<button type="button" class=${c} aria-busy=${loading ? "true" : null} ...${rest}>
    ${icon && html`<${Icon} n=${icon} s=${16} />`}${children}${iconR && html`<${Icon} n=${iconR} s=${16} />`}</button>`;
}

export function Field({ label, req, opt, hint, error, children, id, cls = "" }) {
  return html`<div class=${"field " + cls}>
    ${label && html`<label class="label" for=${id}>${label}${req && html`<span class="req">*</span>`}${opt && html`<span class="opt">${t("optional")}</span>`}</label>`}
    ${children}
    ${error ? html`<div class="err" role="alert" id=${id ? id + "-err" : null}><${Icon} n="alert" s=${14} /><span>${error}</span></div>`
      : hint && html`<div class="hint">${hint}</div>`}
  </div>`;
}

export function Alert({ kind = "", icon = "info", children, action }) {
  return html`<div class=${"alert " + kind} role=${kind === "danger" ? "alert" : "status"}>
    <span class="alert-icon"><${Icon} n=${kind === "danger" ? "alert" : icon} s=${18} /></span>
    <div style="flex:1;min-width:0">${children}</div>${action}</div>`;
}

export function ErrorBlock({ error, onRetry }) {
  if (!error) return null;
  const offline = error.code === "network";
  return html`<div class="empty">
    <div class="tile-ic"><${Icon} n=${offline ? "wifiOff" : "alert"} /></div>
    <p>${errText(error)}</p>
    ${onRetry && html`<${Btn} kind="secondary" size="sm" icon="refresh" onClick=${onRetry}>${t("retry")}<//>`}
  </div>`;
}

export function Empty({ scene = "hoian", title, text, children }) {
  return html`<div class="empty">
    <div class="art"><${Scene} id=${scene} /></div>
    ${title && html`<div class="h3">${title}</div>`}
    ${text && html`<p>${text}</p>`}
    ${children}
  </div>`;
}

export function Skel({ h = 16, w = "100%", r, style = "" }) {
  return html`<div class="skeleton" style=${`height:${h}px;width:${typeof w === "number" ? w + "px" : w};${r ? "border-radius:" + r + "px;" : ""}${style}`} />`;
}
export function SkelCards({ n = 3, h = 150 }) {
  return html`<div class="grid g3">${Array.from({ length: n }, () => html`<div class="card stack"><${Skel} h=${h} r=${14} /><${Skel} h=${14} w="60%" /><${Skel} h=${12} w="40%" /></div>`)}</div>`;
}

export function Avatar({ name, initials, size = "", leader }) {
  const ini = initials || (name || "?").split(/\s+/).filter(Boolean).slice(-2).map((x) => x[0]).join("").toUpperCase();
  return html`<span class=${`avatar ${size} ${leader ? "leader" : ""}`} title=${name} aria-label=${name}>${ini}</span>`;
}
export function AvatarStack({ people = [], max = 4 }) {
  const extra = people.length - max;
  return html`<div class="avatar-stack">${people.slice(0, max).map((p) => html`<${Avatar} name=${p.name} initials=${p.initials} size="sm" />`)}
    ${extra > 0 && html`<span class="avatar sm">+${extra}</span>`}</div>`;
}

export function StatusChip({ status }) {
  const icon = status === "ready" ? "check" : status === "submitted" ? "send" : "clock";
  return html`<span class=${"status " + status}><${Icon} n=${icon} s=${13} />${t("rm.st." + status)}</span>`;
}

export function Progress({ value, max = 100, label }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return html`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax=${max} aria-valuenow=${value} aria-label=${label}><span style=${`width:${pct}%`} /></div>`;
}

export function Switch({ on, onChange, label, id }) {
  return html`<button type="button" role="switch" id=${id} aria-checked=${on ? "true" : "false"} aria-label=${label}
    class=${"switch " + (on ? "on" : "")} onClick=${() => onChange(!on)} />`;
}

export function Seg({ value, options, onChange, label }) {
  return html`<div class="seg" role="tablist" aria-label=${label}>
    ${options.map((o) => html`<button type="button" role="tab" aria-selected=${value === o.value ? "true" : "false"}
      class=${value === o.value ? "on" : ""} onClick=${() => onChange(o.value)}>${o.icon && html`<${Icon} n=${o.icon} s=${14} />`}${o.label}${o.count != null && html`<span class="count">${o.count}</span>`}</button>`)}
  </div>`;
}

// Renders children straight into <body>. Glass panels use backdrop-filter, which turns them into the
// containing block for position:fixed descendants, so overlays must live outside them.
export function Portal({ children }) {
  const host = useMemo(() => document.createElement("div"), []);
  useLayoutEffect(() => { document.body.appendChild(host); return () => { render(null, host); host.remove(); }; }, []);
  useLayoutEffect(() => { render(children, host); });
  return null;
}

export function Modal(props) {
  return html`<${Portal}><${ModalBody} ...${props} /><//>`;
}

function ModalBody({ title, onClose, children, actions, wide, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const focusables = () => el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusables()[0];
    (el.querySelector("[autofocus]") || first || el).focus();
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = Array.from(focusables());
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = ""; prev && prev.focus && prev.focus(); };
  }, []);
  return html`<div class="modal-back" onMouseDown=${(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
    <div class=${"modal " + (wide ? "wide" : "")} role="dialog" aria-modal="true" aria-label=${label || title} ref=${ref} tabindex="-1">
      <div class="modal-head"><div class="h3">${title}</div>
        ${onClose && html`<button class="icon-btn" aria-label=${t("close")} onClick=${onClose}><${Icon} n="x" /></button>`}</div>
      ${children}
      ${actions && html`<div class="modal-actions">${actions}</div>`}
    </div></div>`;
}

export function Confirm({ title, text, confirmLabel, danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  return html`<${Modal} title=${title} onClose=${onClose} actions=${html`
      <${Btn} kind="ghost" onClick=${onClose}>${t("cancel")}<//>
      <${Btn} kind=${danger ? "danger" : "primary"} loading=${busy} onClick=${async () => {
        setBusy(true); setErr(null);
        try { await onConfirm(); onClose(); } catch (e) { setErr(e); setBusy(false); }
      }}>${confirmLabel || t("confirm")}<//>`}>
    <p class="muted" style="margin:0">${text}</p>
    ${err && html`<div class="mt2"><${Alert} kind="danger">${errText(err)}<//></div>`}
  <//>`;
}

export function Toasts() {
  const s = useStore();
  return html`<div class="toasts" aria-live="polite">${s.toasts.map((x) => html`
    <div class=${"toast " + (x.kind === "danger" ? "danger" : "")} role="status">
      <span class="ic"><${Icon} n=${x.kind === "danger" ? "alert" : x.kind === "success" ? "check" : "info"} /></span>
      <span>${x.text}</span>
      ${x.action ? html`<button class="link-btn" onClick=${() => { x.action.fn(); dismissToast(x.id); }}>${x.action.label}</button>`
        : html`<button class="icon-btn" style="width:28px;height:28px" aria-label=${t("close")} onClick=${() => dismissToast(x.id)}><${Icon} n="x" s=${14} /></button>`}
    </div>`)}</div>`;
}

export function Countdown({ to, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const ms = new Date(to).getTime() - now;
  useEffect(() => { if (ms <= 0 && onExpire) onExpire(); }, [ms <= 0]);
  if (ms <= 0) return html`<span class="countdown">00:00:00</span>`;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return html`<span class="countdown">${d > 0 ? d + (store.lang === "en" ? "d " : " ngày ") : ""}${p(hh)}:${p(mm)}:${p(ss)}</span>`;
}

export function Stages({ stage, failed }) {
  const order = ["check", "common", "budget", "options", "done"];
  const idx = order.indexOf(stage || "check");
  return html`<div class="stages" aria-live="polite">${order.map((s, i) => {
    const st = failed && i === idx ? "failed" : i < idx || stage === "done" ? "done" : i === idx ? "active" : "";
    return html`<div class=${"stage " + st}><span class="ic"><${Icon} n=${st === "done" ? "check" : st === "failed" ? "alert" : st === "active" ? "refresh" : "dots"} s=${15} /></span>${t("sy.s." + s)}</div>`;
  })}</div>`;
}

export function useOutside(ref, onOut, active) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    const k = (e) => { if (e.key === "Escape") onOut(); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [active]);
}

export function OfflineBanner() {
  const s = useStore();
  if (s.online) return null;
  return html`<div class="announce" role="status" style="background:#7E0A1E;color:#FBF3EA">${t("err.network")}</div>`;
}

/** Map API field errors {field: code} to localized strings */
export function fieldErrors(e) {
  const out = {};
  if (e && e.fields) for (const k in e.fields) out[k] = errText(e.fields[k], k === "special" || k === "body" ? "text" : undefined);
  return out;
}
