// Shared preference fields (personal form, member submission, profile defaults).
import { html } from "./lib.js";
import { Icon, INTEREST_ICON, MODE_ICON } from "./icons.js";
import { Field } from "./ui.js";
import { t, money } from "./i18n.js";

export const INTERESTS = ["food", "cafe", "nature", "culture", "shopping", "photo", "adventure", "nightlife", "relax"];
export const STYLES = ["relax", "explore", "experience", "saving", "mixed"];
export const PACES = ["slow", "balanced", "fast"];
export const TRANSPORTS = ["walk", "public", "car", "motorbike", "mixed"];
export const AVOIDS = ["hiking", "crowd", "seafood", "water", "late", "long_transfer"];

export const emptyPrefs = () => ({ interests: [], style: "mixed", pace: "balanced", transport: "mixed", avoid: [],
  budget_amount: "", currency: "VND", budget_mode: "per_person", budget_hard: false, special: "" });

export function fromDefaults(d) {
  const p = emptyPrefs();
  if (!d) return p;
  return { ...p, interests: d.interests || [], style: d.style || p.style, pace: d.pace || p.pace,
    transport: d.transport || p.transport, avoid: d.avoid || [], budget_amount: d.budget_amount ? String(d.budget_amount) : "" };
}

export function parseBudget(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return { ok: true, value: null };
  if (!/^[\d.,\s]+$/.test(raw)) return { ok: false, code: "budget_format" };
  const n = parseInt(raw.replace(/[.,\s]/g, ""), 10);
  if (isNaN(n) || n <= 0 || n > 10_000_000_000) return { ok: false, code: "budget_range" };
  return { ok: true, value: n };
}

/** Client-side check mirroring the server rules. Returns {field: i18n key}. */
export function checkPrefs(p, { requireBudget = false, requireInterests = true } = {}) {
  const e = {};
  const b = parseBudget(p.budget_amount);
  if (!b.ok) e.budget_amount = "err." + b.code;
  else if (requireBudget && b.value == null) e.budget_amount = "err.required";
  if (requireInterests && !(p.interests || []).length) e.interests = "err.required";
  if ((p.special || "").length > 1000) e.special = "err.too_long_text";
  return e;
}

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function BudgetFields({ value: p, set, errors = {}, personal, label, optional }) {
  const parsed = parseBudget(p.budget_amount);
  return html`<div class="stack lg">
    ${personal && html`<div class="field"><span class="label">${t("pf.budget")}</span>
      <div class="seg" role="radiogroup">${["per_person", "total"].map((m) => html`
        <button type="button" role="radio" aria-checked=${p.budget_mode === m} class=${p.budget_mode === m ? "on" : ""} onClick=${() => set({ budget_mode: m })}>${t(m === "total" ? "pf.budget_total" : "pf.budget_pp")}</button>`)}</div></div>`}
    <div class="grid" style="grid-template-columns:minmax(0,1fr) 120px;gap:12px">
      <${Field} id="budget_amount" label=${label || t("pf.amount")} req=${!optional} opt=${!!optional} error=${errors.budget_amount && t(errors.budget_amount)}
        hint=${parsed.ok && parsed.value ? "≈ " + (p.currency === "USD" ? parsed.value.toLocaleString("en-US") + " USD" : money(parsed.value)) + " · " + t("pf.budget_hint") : t("pf.budget_hint")}>
        <input id="budget_amount" class=${"input num " + (errors.budget_amount ? "invalid" : "")} inputmode="numeric" autocomplete="off"
          placeholder=${p.currency === "USD" ? "150" : "3500000"} value=${p.budget_amount}
          aria-invalid=${!!errors.budget_amount} aria-describedby=${errors.budget_amount ? "budget_amount-err" : null}
          onInput=${(e) => set({ budget_amount: e.target.value })} />
      <//>
      <${Field} id="currency" label=${t("pf.currency")}>
        <select id="currency" class="select" value=${p.currency} onChange=${(e) => set({ currency: e.target.value })}>
          <option value="VND">VND</option><option value="USD">USD</option></select>
      <//>
    </div>
    <label class="check"><input type="checkbox" checked=${!!p.budget_hard} onChange=${(e) => set({ budget_hard: e.target.checked })} /><span>${t("pf.hard")}</span></label>
  </div>`;
}

export function InterestFields({ value: p, set, errors = {} }) {
  return html`<div class="stack lg">
    <${Field} label=${t("pf.interests")} req error=${errors.interests && t(errors.interests)}>
      <div class="chips" role="group" aria-label=${t("pf.interests")}>${INTERESTS.map((i) => html`
        <button type="button" class=${"chip " + (p.interests.includes(i) ? "on" : "")} aria-pressed=${p.interests.includes(i)}
          onClick=${() => set({ interests: toggle(p.interests, i) })}><${Icon} n=${INTEREST_ICON[i]} s=${15} />${t("i." + i)}</button>`)}</div>
    <//>
    <${Field} label=${t("pf.style")}>
      <div class="chips" role="radiogroup" aria-label=${t("pf.style")}>${STYLES.map((s) => html`
        <button type="button" role="radio" aria-checked=${p.style === s} class=${"chip " + (p.style === s ? "on" : "")} onClick=${() => set({ style: s })}>${t("s." + s)}</button>`)}</div>
    <//>
    <${Field} label=${t("pf.pace")}>
      <div class="pace-cards" role="radiogroup" aria-label=${t("pf.pace")}>${PACES.map((s) => html`
        <button type="button" role="radio" aria-checked=${p.pace === s} class=${"radio-card " + (p.pace === s ? "on" : "")} onClick=${() => set({ pace: s })}>
          <span class="radio-dot" /><span><strong>${t("p." + s)}</strong><br /><span class="small muted">${t("p." + s + "_d")}</span></span></button>`)}</div>
    <//>
    <${Field} label=${t("pf.transport")}>
      <div class="chips" role="radiogroup" aria-label=${t("pf.transport")}>${TRANSPORTS.map((s) => html`
        <button type="button" role="radio" aria-checked=${p.transport === s} class=${"chip " + (p.transport === s ? "on" : "")} onClick=${() => set({ transport: s })}><${Icon} n=${MODE_ICON[s]} s=${15} />${t("t." + s)}</button>`)}</div>
    <//>
    <${Field} label=${t("pf.avoid")} opt>
      <div class="chips" role="group" aria-label=${t("pf.avoid")}>${AVOIDS.map((a) => html`
        <button type="button" class=${"chip " + (p.avoid.includes(a) ? "on" : "")} aria-pressed=${p.avoid.includes(a)} onClick=${() => set({ avoid: toggle(p.avoid, a) })}>${p.avoid.includes(a) && html`<${Icon} n="x" s=${13} />`}${t("a." + a)}</button>`)}</div>
    <//>
  </div>`;
}

export function SpecialField({ value: p, set, errors = {} }) {
  return html`<${Field} id="special" label=${t("pf.special")} opt error=${errors.special && t(errors.special)}>
    <textarea id="special" class=${"textarea " + (errors.special ? "invalid" : "")} maxlength="1000" placeholder=${t("pf.special_ph")}
      value=${p.special} onInput=${(e) => set({ special: e.target.value })} />
    <div class="row between hint"><span class="row" style="gap:6px"><${Icon} n="lock" s=${13} />${t("pf.special_private")}</span><span class="num">${(p.special || "").length}/1000</span></div>
  <//>`;
}

export function PrefSummary({ p }) {
  const b = parseBudget(p.budget_amount);
  return html`<div class="summary-list">
    <div><div class="k">${t("pf.budget")}</div><div>${b.value ? (p.currency === "USD" ? b.value.toLocaleString("en-US") + " USD" : money(b.value)) + (p.budget_mode === "total" ? " · " + t("pf.budget_total") : "") : "—"}${p.budget_hard ? " · " + t("sy.hard") : ""}</div></div>
    <div><div class="k">${t("pf.interests")}</div><div>${p.interests.length ? p.interests.map((i) => t("i." + i)).join(", ") : "—"}</div></div>
    <div><div class="k">${t("pf.style")} · ${t("pf.pace")}</div><div>${t("s." + p.style)} · ${t("p." + p.pace)}</div></div>
    <div><div class="k">${t("pf.transport")}</div><div>${t("t." + p.transport)}</div></div>
    ${p.avoid.length > 0 && html`<div><div class="k">${t("pf.avoid")}</div><div>${p.avoid.map((a) => t("a." + a)).join(", ")}</div></div>`}
    ${p.special && html`<div><div class="k">${t("pf.special")}</div><div class="row" style="gap:6px"><${Icon} n="lock" s=${13} /><span class="muted">${t("pf.special_private")}</span></div></div>`}
  </div>`;
}
