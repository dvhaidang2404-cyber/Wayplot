import { html, useState, useEffect, useRef } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Field, Alert, Stages, ErrorBlock, Skel, fieldErrors } from "../ui.js";
import { api, store, useStore, navigate, useLoad, useEvents, LS, toast } from "../store.js";
import { t, L, fmtRange, errText, money } from "../i18n.js";
import { DestinationInput, getDestinations, todayISO } from "../common.js";
import { BudgetFields, InterestFields, SpecialField, PrefSummary, emptyPrefs, fromDefaults, checkPrefs } from "../prefs.js";

const STEP_FIELDS = [["destination", "start_date", "end_date", "travelers", "title"], ["budget_amount", "currency", "budget_mode"],
  ["interests", "style", "pace", "transport", "avoid"], ["special"]];

/** Live generation tracker: SSE first, polling as a fallback. */
export function useGeneration(genId, { onDone, onFail } = {}) {
  const [gen, setGen] = useState(null);
  const done = useRef(false);
  const cb = useRef({ onDone, onFail });
  cb.current = { onDone, onFail };
  const apply = (g) => {
    setGen(g);
    if (done.current) return;
    if (g.status === "completed") { done.current = true; cb.current.onDone && cb.current.onDone(g); }
    if (g.status === "failed") { done.current = true; cb.current.onFail && cb.current.onFail(g); }
  };
  const poll = async () => {
    if (!genId) return;
    try { const r = await api("/generations/" + genId); apply(r.generation); } catch { /* keep trying */ }
  };
  useEffect(() => {
    done.current = false;
    setGen(null);
    if (!genId) return;
    poll();
    const i = setInterval(() => { if (!done.current) poll(); }, 2500);
    return () => clearInterval(i);
  }, [genId]);
  useEvents({
    "generation.progress": (d) => d.generation_id === genId && setGen((g) => ({ ...(g || {}), status: "running", stage: d.stage })),
    "generation.completed": (d) => d.generation_id === genId && apply({ ...(gen || {}), status: "completed", stage: "done", option_ids: d.option_ids, trip_id: d.trip_id, group_id: d.group_id }),
    "generation.failed": (d) => d.generation_id === genId && apply({ ...(gen || {}), status: "failed", error: d.error }),
  }, [genId]);
  return gen;
}

export function GenerationCard({ gen, onRetry, retrying, title }) {
  const failed = gen && gen.status === "failed";
  return html`<div class="card" aria-live="polite">
    <div class="row between mb2"><div class="h3">${title || t("pf.generating")}</div>
      ${gen && gen.engine && html`<span class="badge muted"><${Icon} n="sparkle" s=${12} />${t("engine." + gen.engine)}</span>`}</div>
    <${Stages} stage=${gen ? gen.stage : "check"} failed=${failed} />
    ${failed && html`<div class="mt3"><${Alert} kind="danger" action=${onRetry && html`<${Btn} kind="secondary" size="sm" icon="refresh" loading=${retrying} onClick=${onRetry}>${t("retry")}<//>`}>${t("rm.gen_failed")}<//></div>`}
  </div>`;
}

export function PersonalForm() {
  useStore();
  const presetDest = store.route.query.get("dest");
  const saved = LS.get("wayplot.draft.personal", null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => saved && !presetDest ? saved : {
    destination: presetDest || "", start_date: todayISO(14), end_date: todayISO(16), travelers: 2, title: "", ...emptyPrefs(),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState(null);
  const [prefilled, setPrefilled] = useState(false);
  const quota = useLoad(() => api("/users/me/subscription"));
  const [dests, setDests] = useState([]);
  useEffect(() => { getDestinations().then(setDests).catch(() => {}); }, []);
  useEffect(() => {
    if (saved && !presetDest) return;
    api("/users/me/preferences").then((r) => {
      if (r.preferences) { setF((x) => ({ ...x, ...fromDefaults(r.preferences), budget_mode: x.budget_mode, currency: x.currency })); setPrefilled(true); }
    }).catch(() => {});
  }, []);
  useEffect(() => { LS.set("wayplot.draft.personal", f); }, [f]);
  const set = (p) => { setF((x) => ({ ...x, ...p })); setErrors((e) => { const n = { ...e }; Object.keys(p).forEach((k) => delete n[k]); return n; }); };
  const dest = dests.find((d) => d.id === f.destination);

  const validate = (s) => {
    const e = {};
    if (s === 0) {
      if (!f.destination) e.destination = "err.required";
      else if (!dest) e.destination = "err.unsupported_destination";
      if (!f.start_date) e.start_date = "err.required";
      else if (f.start_date < todayISO(0)) e.start_date = "err.in_past";
      if (!f.end_date) e.end_date = "err.required";
      else if (f.start_date && f.end_date < f.start_date) e.end_date = "err.date_order";
      else if (f.start_date && (new Date(f.end_date) - new Date(f.start_date)) / 864e5 + 1 > 10) e.end_date = "err.too_long";
      const tv = +f.travelers;
      if (!Number.isInteger(tv) || tv < 1 || tv > 20) e.travelers = "err.range";
    }
    if (s === 1) Object.assign(e, checkPrefs(f, { requireBudget: true, requireInterests: false }));
    if (s === 2) Object.assign(e, checkPrefs({ ...f, budget_amount: "" }, { requireInterests: true }));
    if (s === 3) Object.assign(e, checkPrefs({ ...f, budget_amount: "" }, { requireInterests: false }));
    return e;
  };
  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) { focusFirst(e); return; }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const focusFirst = (e) => setTimeout(() => { const k = Object.keys(e)[0]; const el = document.getElementById(k); el && el.focus(); }, 30);

  const submit = async () => {
    for (let s = 0; s < 4; s++) { const e = validate(s); if (Object.keys(e).length) { setErrors(e); setStep(s); focusFirst(e); return; } }
    setBusy(true); setGeneral(null);
    let trip;
    try {
      const r = await api("/trips", { method: "POST", body: { ...f, travelers: +f.travelers } });
      trip = r.trip;
    } catch (x) {
      setBusy(false);
      if (x.code === "validation") {
        const fe = fieldErrors(x);
        const keyed = {};
        for (const k in x.fields) keyed[k] = "err." + (x.fields[k] === "too_long" && k === "special" ? "too_long_text" : x.fields[k]);
        setErrors(keyed);
        const s = STEP_FIELDS.findIndex((fs) => fs.some((k) => fe[k]));
        if (s >= 0) setStep(s);
      } else setGeneral(errText(x));
      return;
    }
    LS.set("wayplot.draft.personal", null);
    try {
      await api("/trips/" + trip.id + "/generate", { method: "POST" });
    } catch (x) {
      toast(errText(x), { kind: "danger" });
    }
    navigate("/trips/" + trip.id, { replace: true });
  };

  const steps = ["pf.s1", "pf.s2", "pf.s3", "pf.s4"];
  const E = (k) => errors[k] && t(errors[k]);
  const q = quota.data && quota.data.personal_quota;
  return html`<div class="frame glass wide">
    <div class="page-head">
      <div><p class="eyebrow">${t("nav.plan")}</p><h1 class="h1">${t("pf.title")}</h1></div>
      <nav class="steps" aria-label="Steps">${steps.map((s, i) => html`
        ${i > 0 && html`<span class="step-line" />`}
        <button type="button" class=${"step " + (i === step ? "on" : i < step ? "done" : "")} aria-current=${i === step ? "step" : null}
          onClick=${() => i < step && setStep(i)}><span class="n">${i < step ? html`<${Icon} n="check" s=${13} />` : i + 1}</span><span class="hide-sm">${t(s)}</span></button>`)}</nav>
    </div>
    <div class="form-shell">
      <div class="card">
        ${general && html`<div class="mb2"><${Alert} kind="danger">${general}<//></div>`}
        ${prefilled && step === 2 && html`<div class="mb2"><${Alert} icon="info">${t("pf.prefill")}<//></div>`}
        ${step === 0 && html`<div class="form-section">
          <${Field} id="destination" label=${t("pf.dest")} req error=${E("destination")}>
            <${DestinationInput} value=${dest ? f.destination : ""} error=${errors.destination} onChange=${(v) => set({ destination: v.startsWith("?") ? v.slice(1) : v })} /><//>
          <div class="grid g2" style="gap:16px">
            <${Field} id="start_date" label=${t("pf.start")} req error=${E("start_date")}>
              <input id="start_date" type="date" class=${"input " + (errors.start_date ? "invalid" : "")} min=${todayISO(0)} value=${f.start_date} onInput=${(e) => set({ start_date: e.target.value })} aria-invalid=${!!errors.start_date} /><//>
            <${Field} id="end_date" label=${t("pf.end")} req error=${E("end_date")}>
              <input id="end_date" type="date" class=${"input " + (errors.end_date ? "invalid" : "")} min=${f.start_date || todayISO(0)} value=${f.end_date} onInput=${(e) => set({ end_date: e.target.value })} aria-invalid=${!!errors.end_date} /><//>
          </div>
          <div class="grid g2" style="gap:16px">
            <${Field} id="travelers" label=${t("pf.travelers")} req error=${E("travelers")}>
              <input id="travelers" type="number" min="1" max="20" class=${"input " + (errors.travelers ? "invalid" : "")} value=${f.travelers} onInput=${(e) => set({ travelers: e.target.value })} /><//>
            <${Field} id="title" label=${t("pf.title_opt")} opt>
              <input id="title" class="input" maxlength="120" placeholder=${dest ? L(dest.name) : ""} value=${f.title} onInput=${(e) => set({ title: e.target.value })} /><//>
          </div>
        </div>`}
        ${step === 1 && html`<div class="form-section"><${BudgetFields} value=${f} set=${set} errors=${errors} personal label=${t("pf.amount")} /></div>`}
        ${step === 2 && html`<div class="form-section"><${InterestFields} value=${f} set=${set} errors=${errors} /></div>`}
        ${step === 3 && html`<div class="form-section">
          <${SpecialField} value=${f} set=${set} errors=${errors} />
          <div class="card tight"><div class="kicker mb2">${t("pf.review")}</div>
            <div class="summary-list">
              <div><div class="k">${t("pf.dest")}</div><div>${dest ? L(dest.name) : f.destination} · ${fmtRange(f.start_date, f.end_date)} · ${t("travelers_n", { n: f.travelers })}</div></div>
            </div>
            <div class="mt2"><${PrefSummary} p=${f} /></div>
          </div>
        </div>`}
        <div class="form-foot">
          ${step > 0 ? html`<${Btn} kind="ghost" icon="arrowL" onClick=${() => setStep(step - 1)}>${t("back")}<//>` : html`<span />`}
          ${step < 3 ? html`<${Btn} iconR="arrowR" onClick=${next}>${t("next")}<//>`
            : html`<${Btn} size="lg" icon="sparkle" loading=${busy} disabled=${q && q.remaining <= 0} onClick=${submit}>${t("pf.submit")}<//>`}
        </div>
        ${step === 3 && q && q.remaining <= 0 && html`<div class="mt2"><${Alert} kind="danger">${t("err.quota_exceeded")}<//></div>`}
      </div>
      <aside class="sticky-side stack lg">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="height:150px;overflow:hidden;border-bottom:1px solid var(--line)"><${Scene} id=${dest ? dest.id : "halong"} /></div>
          <div style="padding:18px" class="stack">
            <div class="h3">${dest ? L(dest.name) : t("pf.dest")}</div>
            ${dest && html`<div class="small muted">${L(dest.tagline)}</div>`}
            <div class="small faint row" style="gap:6px"><${Icon} n="calendar" s=${13} />${fmtRange(f.start_date, f.end_date)}</div>
            <div class="small faint row" style="gap:6px"><${Icon} n="users" s=${13} />${t("travelers_n", { n: f.travelers || 1 })}</div>
          </div>
        </div>
        ${q && html`<div class="small faint row" style="gap:6px;padding:0 6px"><${Icon} n="sparkle" s=${13} />${t("pf.quota", { n: q.remaining, limit: q.limit })}</div>`}
      </aside>
    </div>
  </div>`;
}

export function TripView({ id }) {
  useStore();
  const [retrying, setRetrying] = useState(false);
  const [genId, setGenId] = useState(null);
  const { data, error, loading, reload } = useLoad(() => api("/trips/" + id), [id]);
  useEffect(() => {
    if (!data) return;
    const { trip, options, generation } = data;
    if (trip.type === "group" && trip.group) { navigate("/rooms/" + trip.group.id, { replace: true }); return; }
    if (generation && (generation.status === "running" || generation.status === "failed")) { setGenId(generation.id); return; }
    if (options.length) navigate("/itinerary/" + (trip.finalized_option_id || options[0].id), { replace: true });
  }, [data]);
  const gen = useGeneration(genId, {
    onDone: (g) => { const oid = (g.option_ids || [])[0]; if (oid) navigate("/itinerary/" + oid, { replace: true }); else reload(); },
  });
  const retry = async () => {
    setRetrying(true);
    try { const r = await api("/generations/" + genId + "/retry", { method: "POST" }); setGenId(r.generation_id); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setRetrying(false);
  };
  const start = async () => {
    setRetrying(true);
    try { const r = await api("/trips/" + id + "/generate", { method: "POST" }); setGenId(r.generation_id); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setRetrying(false);
  };
  if (loading) return html`<div class="frame glass narrow stack lg"><${Skel} h=${40} w="60%" /><${Skel} h=${220} r=${18} /></div>`;
  if (error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${error} onRetry=${() => reload(false)} /></div>`;
  const trip = data.trip;
  return html`<div class="frame glass narrow">
    <div class="page-head"><div><p class="eyebrow">${L(trip.destination_name)} · ${fmtRange(trip.start_date, trip.end_date)}</p><h1 class="h1">${trip.title}</h1></div></div>
    <div class="trip-thumb mb3" style="height:180px"><${Scene} id=${trip.destination} /></div>
    ${genId ? html`<${GenerationCard} gen=${gen} onRetry=${retry} retrying=${retrying} />
        ${gen && gen.status === "failed" && data.options.length > 0 && html`<div class="row end mt2"><a class="link-btn small" href=${"/itinerary/" + data.options[0].id}>${t("pl.view")} →</a></div>`}`
      : html`<div class="card row between wrap"><div><div class="card-title">${t("tr.no_plan")}</div><div class="small muted">${t("status." + trip.status)}</div></div>
          <${Btn} icon="sparkle" loading=${retrying} onClick=${start}>${t("pf.submit")}<//></div>`}
  </div>`;
}
