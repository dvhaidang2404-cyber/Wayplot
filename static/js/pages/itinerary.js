import { html, useState, useEffect, useRef } from "../lib.js";
import { Icon, INTEREST_ICON, MODE_ICON } from "../icons.js";
import { Btn, Field, Alert, Modal, Confirm, Avatar, Seg, ErrorBlock, Skel, Empty } from "../ui.js";
import { MapView } from "../map.js";
import { api, store, useStore, navigate, useLoad, useEvents, setGuard, toast } from "../store.js";
import { t, L, money, moneyShort, fmtDate, fmtRange, weekday, ago, errText } from "../i18n.js";
import { CompatList } from "./plans.js";

const toMin = (s) => { const [h, m] = (s || "0:0").split(":").map(Number); return h * 60 + m; };
const hm = (n) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const clone = (x) => JSON.parse(JSON.stringify(x));
const newId = () => "n" + Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- timeline
function ActivityItem({ a, n, selected, onSelect, canEdit, canComment, ops, first, last }) {
  const end = hm(toMin(a.start) + (a.duration || 0));
  const numCls = a.kind === "meal" ? "meal" : a.kind === "free" || a.kind === "rest" ? "free" : "";
  const lg = a.travel_to_next;
  return html`<div class="tl-item">
    <div class="tl-time">${a.start}<span class="end">${end}</span></div>
    <div class="tl-rail"><span class=${"tl-num " + numCls}>${a.kind === "rest" ? html`<${Icon} n="wave" s=${13} />` : a.kind === "free" ? html`<${Icon} n="food" s=${13} />` : n}</span></div>
    <div>
      <div class=${"tl-card " + (selected ? "on" : "")} role="button" tabindex="0" aria-expanded=${selected}
        onClick=${() => onSelect(selected ? null : a.id)} onKeyDown=${(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(selected ? null : a.id))}>
        <div class="row between" style="align-items:flex-start">
          <div style="min-width:0"><div class="nm">${L(a.name)}</div>${a.address && html`<div class="addr">${a.address}</div>`}</div>
          ${a.verified === false ? html`<span class="badge flag" title=${t("it.review")}><${Icon} n="alert" s=${11} />${t("it.review")}</span>`
            : a.place_id && html`<span class="badge muted hide-sm" title=${t("it.verified")}><${Icon} n="check" s=${11} />${t("it.verified")}</span>`}
        </div>
        <div class="tl-meta">
          <span><${Icon} n="clock" s=${13} />${t("it.duration", { m: a.duration })}</span>
          <span><${Icon} n="coins" s=${13} />${a.cost ? money(a.cost) : t("it.free")}</span>
          ${(a.tags || []).slice(0, 2).map((tg) => INTEREST_ICON[tg] && html`<span><${Icon} n=${INTEREST_ICON[tg]} s=${13} />${t("i." + tg)}</span>`)}
          ${a.pinned && html`<span title=${t("it.pin_note")}><${Icon} n="lock" s=${13} /></span>`}
        </div>
        ${a.overlap && html`<div class="err mt1"><${Icon} n="alert" s=${13} />${t("it.overlap")}</div>`}
        ${a.late && html`<div class="err mt1"><${Icon} n="moon" s=${13} />${t("it.late")}</div>`}
        ${selected && a.note && L(a.note) && html`<p class="small muted" style="margin:8px 0 0">${L(a.note)}</p>`}
        ${selected && (canEdit || canComment) && html`<div class="tl-actions" onClick=${(e) => e.stopPropagation()}>
          ${canEdit && html`
            <${Btn} kind="ghost" icon="arrowUp" disabled=${first} onClick=${() => ops.move(-1)}>${t("it.up")}<//>
            <${Btn} kind="ghost" icon="arrowDown" disabled=${last} onClick=${() => ops.move(1)}>${t("it.down")}<//>
            <${Btn} kind="ghost" icon="clock" onClick=${ops.time}>${t("it.time")}<//>
            ${(a.kind === "visit" || a.kind === "meal") && html`<${Btn} kind="ghost" icon="swap" onClick=${ops.replace}>${t("it.replace")}<//>`}
            <${Btn} kind="ghost" icon="trash" onClick=${ops.remove}>${t("it.delete")}<//>`}
          ${canComment && html`<${Btn} kind="ghost" icon="message" onClick=${ops.comment}>${t("it.comment_on")}<//>`}
        </div>`}
      </div>
      ${lg && html`<div class="tl-travel"><span class="ln"><${Icon} n=${MODE_ICON[lg.mode] || "route"} s=${13} /></span>${t("it.travel", { m: lg.minutes, mode: t("it.mode." + lg.mode), km: lg.km })}</div>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------------ budget
function BudgetView({ data, isGroup }) {
  const b = data.budget;
  if (!b) return null;
  const cats = [["stay", "bed"], ["transport", "car"], ["food", "food"], ["tickets", "ticket"], ["other", "dots"]];
  const total = Object.values(b.categories).reduce((x, y) => x + y, 0) || 1;
  const days = data.days;
  const max = Math.max(...days.map((d) => d.cost || 0), 1);
  const W = 560, H = 190, bw = Math.min(56, (W - 40) / days.length - 14);
  return html`<div class="grid g-main">
    <div class="stack lg">
      <div class="grid g2">
        <div class="burgundy"><div class="kicker" style="color:#D9B56B">${t("bd.pp")}</div><div class="big-num mt1" style="color:#FBF3EA">${money(b.per_person)}</div></div>
        <div class="card"><div class="kicker">${t("bd.total")}</div><div class="big-num mt1">${money(b.group_total)}</div><div class="small faint">${t("travelers_n", { n: b.travelers })}</div></div>
      </div>
      <div class="card"><div class="budget-bars">${cats.map(([k, ic]) => html`
        <div class="budget-bar"><div class="top"><span class="row" style="gap:8px"><${Icon} n=${ic} s=${15} />${t("bd." + k)}</span>
          <span class="num"><strong>${money(b.categories[k])}</strong> <span class="faint small">${Math.round((b.categories[k] / total) * 100)}%</span></span></div>
          <div class="progress"><span style=${`width:${(b.categories[k] / total) * 100}%`} /></div></div>`)}</div></div>
      <div class="card chart"><div class="card-title mb2">${t("bd.by_day")}</div>
        <svg viewBox=${`0 0 ${W} ${H + 40}`} role="img" aria-label=${t("bd.by_day")}>
          ${[0.25, 0.5, 0.75, 1].map((f) => html`<line x1="30" x2=${W} y1=${H - f * (H - 20)} y2=${H - f * (H - 20)} stroke="currentColor" stroke-opacity=".12" />`)}
          ${days.map((d, i) => {
            const x = 40 + i * ((W - 40) / days.length) + ((W - 40) / days.length - bw) / 2;
            const h = ((d.cost || 0) / max) * (H - 20);
            return html`<g><rect x=${x} y=${H - h} width=${bw} height=${h} rx="5" fill="#D9B56B" fill-opacity=${0.55 + 0.45 * ((d.cost || 0) / max)} />
              <text x=${x + bw / 2} y=${H - h - 6} text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".8">${moneyShort(d.cost)}</text>
              <text x=${x + bw / 2} y=${H + 18} text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".6">${t("it.day", { n: d.day })}</text></g>`;
          })}
          <line x1="30" x2=${W} y1=${H} y2=${H} stroke="currentColor" stroke-opacity=".3" />
        </svg></div>
    </div>
    <div class="stack lg">
      ${isGroup && (data.compatibility || []).length > 0 && html`<div class="card"><div class="card-title mb2">${t("bd.members")}</div><${CompatList} list=${data.compatibility} /></div>`}
      <div class="card"><div class="card-title mb2">${t("bd.assumptions")}</div>
        <ul class="hl-list">${b.assumptions.map((a) => html`<li><${Icon} n="info" s=${15} />${L(a)}</li>`)}</ul>
        <div class="card-title mt3 mb2">${t("bd.unknown")}</div>
        <ul class="hl-list">${b.unknown.map((a) => html`<li><${Icon} n="alert" s=${15} />${L(a)}</li>`)}</ul>
        <div class="foot-note">${t("bd.estimate")}</div></div>
    </div>
  </div>`;
}

// -------------------------------------------------------------- discussion
function Discussion({ oid, perms, data, about, setAbout, onJump, isGroup }) {
  const s = useStore();
  const res = useLoad(() => api("/itineraries/" + oid + "/comments"), [oid]);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("comment");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);
  const listEnd = useRef(null);
  useEvents({
    "comment.created": (x) => {
      if (x.option_id !== oid) return;
      res.setData((d) => {
        if (!d) return d;
        const c = { ...x.comment, mine: x.comment.user_id === s.user.id };
        const has = d.comments.some((y) => y.id === c.id);
        return { comments: has ? d.comments.map((y) => (y.id === c.id ? c : y)) : [...d.comments, c] };
      });
    },
  }, [oid]);
  if (!isGroup) return html`<div class="card"><${Empty} scene="hoian" text=${t("cm.personal")} /></div>`;
  const acts = data.days.flatMap((d) => d.activities.map((a) => ({ ...a, day: d.day })));
  const nameOf = (id) => { const a = acts.find((x) => x.id === id); return a ? `${t("it.day", { n: a.day })} · ${L(a.name)}` : null; };
  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) { setErr(t("err.required")); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api("/itineraries/" + oid + "/comments", { method: "POST", body: { body, kind, activity_id: about || null } });
      res.setData((d) => ({ comments: d.comments.some((c) => c.id === r.comment.id) ? d.comments : [...d.comments, r.comment] }));
      setBody(""); setAbout(null);
      setTimeout(() => listEnd.current && listEnd.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (x) { setErr(errText(x, "text")); }
    setBusy(false);
  };
  const setStatus = async (c, status) => {
    try { const r = await api("/comments/" + c.id + "/status", { method: "POST", body: { status } }); res.setData((d) => ({ comments: d.comments.map((y) => (y.id === c.id ? r.comment : y)) })); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  const saveEdit = async () => {
    try { const r = await api("/comments/" + editing.id, { method: "PUT", body: { body: editing.body } }); res.setData((d) => ({ comments: d.comments.map((y) => (y.id === r.comment.id ? r.comment : y)) })); setEditing(null); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  const list = res.data ? res.data.comments : [];
  return html`<div class="grid g-main">
    <div class="card">
      ${res.loading ? html`<div class="stack"><${Skel} h=${60} /><${Skel} h=${60} /></div>` : res.error ? html`<${ErrorBlock} error=${res.error} onRetry=${() => res.reload(false)} />`
        : list.length === 0 ? html`<${Empty} scene="hoian" text=${t("cm.empty")} />`
        : html`<div>${list.map((c) => html`
          <div class="comment">
            <${Avatar} name=${c.name} initials=${c.initials} size="sm" />
            <div class="bubble">
              <div class="who"><strong>${c.name}</strong><span class="faint tiny">${ago(c.created_at)}${c.edited ? " · " + t("cm.edited") : ""}</span>
                ${c.kind === "suggestion" && html`<span class="badge"><${Icon} n="lightbulb" s=${11} />${t("cm.suggestion")}</span>`}
                ${c.kind === "suggestion" && html`<span class=${"status " + (c.status === "applied" ? "ready" : c.status === "dismissed" ? "pending" : "submitted")}>${t("cm." + c.status)}</span>`}</div>
              ${editing && editing.id === c.id ? html`<div class="stack mt1">
                  <textarea class="textarea" value=${editing.body} onInput=${(e) => setEditing({ ...editing, body: e.target.value })} />
                  <div class="row"><${Btn} size="sm" onClick=${saveEdit}>${t("save")}<//><${Btn} size="sm" kind="ghost" onClick=${() => setEditing(null)}>${t("cancel")}<//></div></div>`
                : html`<div class="body">${c.body}</div>`}
              ${c.activity_id && nameOf(c.activity_id) && html`<button class="ref-chip" onClick=${() => onJump(c.activity_id)}><${Icon} n="pin" s=${11} />${nameOf(c.activity_id)}</button>`}
              <div class="row wrap mt1" style="gap:14px">
                ${c.mine && !editing && html`<button class="link-btn tiny" onClick=${() => setEditing({ id: c.id, body: c.body })}>${t("cm.edit")}</button>`}
                ${c.kind === "suggestion" && (perms.can_edit || perms.is_leader) && c.status === "open" && html`
                  <button class="link-btn tiny" onClick=${() => setStatus(c, "applied")}>${t("cm.mark_applied")}</button>
                  <button class="link-btn tiny" onClick=${() => setStatus(c, "dismissed")}>${t("cm.dismiss")}</button>`}
              </div>
            </div>
          </div>`)}<div ref=${listEnd} /></div>`}
    </div>
    <div>
      ${perms.can_comment ? html`<form class="card stack lg sticky-side" onSubmit=${send} novalidate>
        <${Seg} value=${kind} onChange=${setKind} options=${[{ value: "comment", label: t("cm.comment"), icon: "message" }, { value: "suggestion", label: t("cm.suggestion"), icon: "lightbulb" }]} />
        <${Field} id="about" label=${t("cm.about")}>
          <select id="about" class="select" value=${about || ""} onChange=${(e) => setAbout(e.target.value || null)}>
            <option value="">${t("cm.whole")}</option>
            ${data.days.map((d) => html`<optgroup label=${t("it.day", { n: d.day })}>${d.activities.map((a) => html`<option value=${a.id}>${a.start} · ${L(a.name)}</option>`)}</optgroup>`)}
          </select><//>
        <${Field} id="cbody" error=${err}>
          <textarea id="cbody" class=${"textarea " + (err ? "invalid" : "")} maxlength="2000" placeholder=${t("cm.placeholder")} value=${body} onInput=${(e) => { setBody(e.target.value); setErr(null); }} aria-label=${t("cm.placeholder")} /><//>
        ${kind === "suggestion" && html`<div class="small faint">${t("cm.note")}</div>`}
        <${Btn} type="submit" icon="send" loading=${busy}>${t("cm.send")}<//>
      </form>` : html`<div class="card small muted">${t("rm.closed_note")}</div>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------------ modals
function TimeModal({ a, onSave, onClose }) {
  const [start, setStart] = useState(a.start);
  const [dur, setDur] = useState(a.duration);
  const [err, setErr] = useState(null);
  const ok = () => {
    if (!/^\d{2}:\d{2}$/.test(start)) { setErr(t("err.invalid")); return; }
    const d = parseInt(dur, 10);
    if (!d || d < 5 || d > 600) { setErr(t("err.range")); return; }
    onSave(start, d); onClose();
  };
  return html`<${Modal} title=${t("it.time_title")} onClose=${onClose} actions=${html`<${Btn} kind="ghost" onClick=${onClose}>${t("cancel")}<//><${Btn} onClick=${ok}>${t("save")}<//>`}>
    <p class="small muted" style="margin-top:0">${L(a.name)}</p>
    <div class="grid g2"><${Field} id="tstart" label=${t("it.start")}><input id="tstart" type="time" class="input" value=${start} onInput=${(e) => setStart(e.target.value)} autofocus /><//>
      <${Field} id="tdur" label=${t("it.dur")}><input id="tdur" type="number" min="5" max="600" step="5" class="input" value=${dur} onInput=${(e) => setDur(e.target.value)} /><//></div>
    ${err && html`<div class="err mt1">${err}</div>`}
    <div class="small faint mt2 row" style="gap:6px"><${Icon} n="lock" s=${13} />${t("it.pin_note")}</div>
  <//>`;
}

function PlaceRow({ p, onPick, used }) {
  return html`<div class="list-item">
    <span class="tile-ic"><${Icon} n=${INTEREST_ICON[(p.tags || [])[0]] || "pin"} s=${16} /></span>
    <div class="grow"><div class="title">${L(p.name)}</div>
      <div class="sub">${p.address}${p.distance_km != null ? " · " + p.distance_km + " km" : ""} · ${t("it.duration", { m: p.duration })} · ${p.cost ? money(p.cost) : t("it.free")}</div></div>
    ${used ? html`<span class="badge muted">✓</span>` : html`<${Btn} size="sm" kind="secondary" onClick=${() => onPick(p)}>${t("it.add_btn")}<//>`}
  </div>`;
}

function ReplaceModal({ oid, a, onPick, onClose }) {
  const res = useLoad(() => api(`/itineraries/${oid}/alternatives?activity_id=${encodeURIComponent(a.id)}`), [a.id]);
  return html`<${Modal} wide title=${t("it.alt_title")} onClose=${onClose}>
    <p class="small muted" style="margin-top:0">${L(a.name)}</p>
    ${res.loading ? html`<div class="stack"><${Skel} h=${48} /><${Skel} h=${48} /><${Skel} h=${48} /></div>`
      : res.error ? html`<${ErrorBlock} error=${res.error} onRetry=${() => res.reload(false)} />`
      : res.data.places.length === 0 ? html`<p class="muted">${t("it.alt_none")}</p>`
      : html`<div class="list">${res.data.places.map((p) => html`<${PlaceRow} p=${p} onPick=${(x) => { onPick(x); onClose(); }} />`)}</div>`}
  <//>`;
}

function AddModal({ oid, dest, dayLabel, used, onAdd, onClose }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => {
    const h = setTimeout(() => {
      api(`/destinations/${dest}/places?q=${encodeURIComponent(q)}`).then((r) => setList(r.places)).catch((e) => setErr(errText(e)));
    }, 220);
    return () => clearTimeout(h);
  }, [q]);
  const addCustom = async () => {
    if (custom.trim().length < 2) { setErr(t("err.required")); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api(`/itineraries/${oid}/verify-place`, { method: "POST", body: { text: custom } });
      if (r.place && r.place.source !== "google-places") onAdd({ place: r.place });
      else if (r.place) onAdd({ google: r.place });
      else onAdd({ custom: custom.trim() });
      onClose();
    } catch (x) { setErr(errText(x)); setBusy(false); }
  };
  return html`<${Modal} wide title=${t("it.add_title", { day: dayLabel })} onClose=${onClose}>
    <div class="input-wrap"><input class="input" autofocus placeholder=${t("it.search")} aria-label=${t("it.search")} value=${q} onInput=${(e) => setQ(e.target.value)} />
      <span class="in-btn faint" style="padding-right:8px;pointer-events:none"><${Icon} n="map" s=${16} /></span></div>
    <div class="list mt1" style="max-height:320px;overflow:auto">${list === null ? html`<${Skel} h=${48} />` : list.map((p) => html`<${PlaceRow} p=${p} used=${used.has(p.id)} onPick=${(x) => { onAdd({ place: x }); onClose(); }} />`)}</div>
    <hr class="rule" />
    <${Field} id="custom" label=${t("it.custom")} hint=${t("it.custom_note")} error=${err}>
      <div class="join-row"><input id="custom" class="input" maxlength="120" placeholder=${t("it.custom_ph")} value=${custom} onInput=${(e) => setCustom(e.target.value)} />
        <${Btn} kind="secondary" loading=${busy} onClick=${addCustom}>${t("it.add_btn")}<//></div><//>
  <//>`;
}

function RefineModal({ oid, data, onDone, onClose }) {
  const s = useStore();
  const [op, setOp] = useState("lighter");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const claude = s.engine === "claude";
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api(`/itineraries/${oid}/refine`, { method: "POST", body: { op, instruction: claude ? text : "", data } });
      onDone(r.data); onClose();
    } catch (x) { setErr(errText(x)); setBusy(false); }
  };
  return html`<${Modal} title=${t("it.refine_title")} onClose=${onClose} actions=${html`<${Btn} kind="ghost" onClick=${onClose}>${t("cancel")}<//><${Btn} icon="sparkle" loading=${busy} onClick=${go}>${t("it.r.apply")}<//>`}>
    <div class="radio-cards" role="radiogroup" style="grid-template-columns:1fr 1fr">${["lighter", "cheaper", "more_food", "more_culture", "more_nature", "route"].map((k) => html`
      <button type="button" role="radio" aria-checked=${op === k} class=${"radio-card " + (op === k ? "on" : "")} onClick=${() => setOp(k)}><span class="radio-dot" />${t("it.r." + k)}</button>`)}</div>
    <div class="mt3"><${Field} id="rtext" label=${t("it.r.free")} hint=${claude ? null : t("it.r.free_off")}>
      <textarea id="rtext" class="textarea" maxlength="500" disabled=${!claude} value=${text} onInput=${(e) => setText(e.target.value)} /><//></div>
    ${err && html`<div class="mt2"><${Alert} kind="danger">${err}<//></div>`}
  <//>`;
}

function VersionsModal({ versions, current, canEdit, onRestore, onClose, dirty }) {
  const [busy, setBusy] = useState(null);
  return html`<${Modal} title=${t("it.history")} onClose=${onClose}>
    ${dirty && html`<div class="mb2"><${Alert} icon="info">${t("it.unsaved")}<//></div>`}
    <div class="list">${versions.map((v) => html`
      <div class="list-item">
        <span class="tile-ic"><strong class="small">v${v.version}</strong></span>
        <div class="grow"><div class="title">${v.name || "AI"}${v.note ? html` <span class="faint small" style="font-weight:400">· ${v.note}</span>` : ""}</div><div class="sub">${ago(v.created_at)}</div></div>
        ${v.version === current ? html`<span class="badge solid">${t("it.current")}</span>`
          : canEdit && html`<${Btn} size="sm" kind="secondary" icon="history" loading=${busy === v.version} onClick=${async () => { setBusy(v.version); await onRestore(v.version); setBusy(null); onClose(); }}>${t("it.restore")}<//>`}
      </div>`)}</div>
  <//>`;
}

// -------------------------------------------------------------------- page
export function Itinerary({ oid }) {
  const s = useStore();
  const res = useLoad(() => api("/itineraries/" + oid), [oid]);
  const [draft, setDraft] = useState(null);
  const [day, setDay] = useState(0);
  const [tab, setTab] = useState(store.route.query.get("tab") || "plan");
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(null);
  const [modal, setModal] = useState(null);
  const [remote, setRemote] = useState(null);
  const [about, setAbout] = useState(null);
  useEffect(() => { setDraft(null); setDay(0); setActive(null); setRemote(null); setTab(store.route.query.get("tab") || "plan"); }, [oid]);

  const d = res.data;
  const dirty = !!draft;
  useEffect(() => {
    setGuard(dirty ? (to) => { setModal({ type: "leave", to }); return false; } : null);
    const bu = (e) => { e.preventDefault(); e.returnValue = ""; };
    if (dirty) window.addEventListener("beforeunload", bu);
    return () => { window.removeEventListener("beforeunload", bu); setGuard(null); };
  }, [dirty]);

  useEvents({
    "itinerary.updated": (x) => {
      if (x.option_id !== oid || x.by_id === s.user.id) return;
      if (dirty) setRemote({ by: x.by, v: x.version });
      else { res.reload(); toast(t("it.remote_update", { by: x.by, v: x.version })); }
    },
    "itinerary.finalized": (x) => { if (d && x.trip_id === d.trip.id) res.reload(); },
  }, [oid, dirty, d && d.trip.id]);

  if (res.loading && !d) return html`<div class="frame glass wide stack lg"><${Skel} h=${46} w="55%" /><${Skel} h=${50} /><div class="it-grid"><${Skel} h=${480} r=${18} /><${Skel} h=${480} r=${18} /></div></div>`;
  if (res.error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${res.error} onRetry=${() => res.reload(false)} /></div>`;

  const { option, trip, permissions: perms, versions, siblings, members, destination } = d;
  const data = draft || option.data;
  const isGroup = trip.type === "group";
  const dayData = data.days[Math.min(day, data.days.length - 1)];
  const acts = dayData.activities;
  const usedIds = new Set(data.days.flatMap((x) => x.activities.map((a) => a.place_id).filter(Boolean)));

  const edit = async (mutate, after) => {
    const next = clone(data);
    mutate(next);
    setBusy("preview");
    try {
      const r = await api(`/itineraries/${oid}/preview`, { method: "POST", body: { data: next } });
      setDraft(r.data);
      after && after(r.data);
    } catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };
  const save = async (force = false, then) => {
    setBusy("save");
    try {
      const r = await api(`/itineraries/${oid}`, { method: "PUT", body: { data: draft, base_version: option.version, force, note: "" } });
      res.setData(r); setDraft(null); setRemote(null); setModal(null);
      toast(t("it.saved", { v: r.option.version }), { kind: "success" });
      then && then();
    } catch (x) {
      if (x.code === "version_conflict") setModal({ type: "conflict", by: x.details.by, v: x.details.current_version });
      else toast(errText(x), { kind: "danger" });
    }
    setBusy(null);
  };
  const discard = () => { setDraft(null); setRemote(null); };
  const restore = async (v) => {
    try { const r = await api(`/itineraries/${oid}/restore`, { method: "POST", body: { version: v } }); res.setData(r); setDraft(null); toast(t("it.saved", { v: r.option.version }), { kind: "success" }); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  const saveTrip = async () => {
    setBusy("savetrip");
    try { await api(`/trips/${trip.id}/save`, { method: "POST" }); toast(t("it.trip_saved"), { kind: "success" }); res.reload(); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };
  const jump = (aid) => {
    const di = data.days.findIndex((x) => x.activities.some((a) => a.id === aid));
    if (di >= 0) { setDay(di); setTab("plan"); setActive(aid); setTimeout(() => { const el = document.querySelector(".tl-card.on"); el && el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80); }
  };

  const opsFor = (i) => ({
    move: (dir) => edit((n) => { const a = n.days[day].activities; [a[i], a[i + dir]] = [a[i + dir], a[i]]; }),
    remove: () => edit((n) => { n.days[day].activities.splice(i, 1); }, () => setActive(null)),
    time: () => setModal({ type: "time", i }),
    replace: () => setModal({ type: "replace", i }),
    comment: () => { setAbout(acts[i].id); setTab("talk"); },
  });
  const addStop = ({ place, google, custom }) => edit((n) => {
    const list = n.days[day].activities;
    const lastA = list[list.length - 1];
    const start = lastA ? hm(Math.min(toMin(lastA.start) + lastA.duration + 20, 22 * 60)) : "09:00";
    if (place) list.push({ id: newId(), kind: place.meal ? "meal" : "visit", place_id: place.id, start, duration: place.duration, pinned: false });
    else if (google) list.push({ id: newId(), kind: "custom", source: "google-places", verified: true, lat: google.lat, lng: google.lng, address: google.address, name: google.name, start, duration: 60, cost: 0 });
    else list.push({ id: newId(), kind: "custom", name: { vi: custom, en: custom }, start, duration: 60, cost: 0 });
  });

  let num = 0;
  const numbered = acts.map((a) => ({ a, n: a.kind === "free" || a.kind === "rest" ? null : ++num }));
  const points = numbered.filter((x) => x.n).map(({ a, n }) => ({ id: a.id, n, lat: a.lat, lng: a.lng, name: a.name, start: a.start, address: a.address, meal: a.kind === "meal" }));
  const back = isGroup ? html`<a class="link-btn" href=${"/rooms/" + d.group_id}>← ${t("it.back_room")}</a>` : html`<a class="link-btn" href="/my-trips">← ${t("nav.trips")}</a>`;
  const statusBadge = option.status === "finalized" ? html`<span class="badge flag"><${Icon} n="check" s=${11} />${t("it.status.finalized")}</span>`
    : isGroup ? html`<span class="badge muted">${t("it.status." + option.status)}</span>`
    : html`<span class="badge muted">${t("status." + trip.status)}</span>`;

  return html`<div class="frame glass wide">
    <div class="it-head">
      <div style="min-width:0;flex:1">
        <p class="eyebrow">${back}</p>
        <h1 class="h2" style="font-size:clamp(24px,3vw,34px)">${L(option.title)}</h1>
        <div class="row wrap mt1 small muted" style="gap:8px 16px">
          <span class="row" style="gap:6px"><${Icon} n="map" s=${14} />${trip.title}</span>
          <span class="row" style="gap:6px"><${Icon} n="pin" s=${14} />${L(destination.name)}</span>
          <span class="row" style="gap:6px"><${Icon} n="calendar" s=${14} />${fmtRange(trip.start_date, trip.end_date)}</span>
        </div>
        <div class="row wrap mt1" style="gap:6px">
          <span class="badge">${t("it.version", { v: option.version })}</span>${statusBadge}
          <span class="badge muted"><${Icon} n="sparkle" s=${11} />${t("it.engine", { e: t("engine." + (data.engine || "local")) })}</span>
          ${data.unverified > 0 && html`<span class="badge flag"><${Icon} n="alert" s=${11} />${t("it.unverified_n", { n: data.unverified })}</span>`}
        </div>
      </div>
      <div class="row wrap" style="gap:8px">
        ${siblings.length > 1 && html`<${Seg} value=${oid} label=${t("it.other_plan")} onChange=${(v) => navigate("/itinerary/" + v)}
          options=${siblings.map((x) => ({ value: x.id, label: t("pl.option", { n: x.option_number }) }))} />`}
        <${Btn} kind="ghost" icon="history" onClick=${() => setModal({ type: "versions" })}>${t("it.history")}<//>
        ${perms.can_edit && html`<${Btn} kind="secondary" icon="sparkle" onClick=${() => setModal({ type: "refine" })}>${t("it.refine")}<//>`}
        ${perms.can_save_trip && html`<${Btn} icon="check" loading=${busy === "savetrip"} disabled=${dirty} onClick=${saveTrip}>${t("it.save_trip")}<//>`}
        ${perms.can_finalize && html`<${Btn} icon="flag" disabled=${dirty} onClick=${() => setModal({ type: "finalize" })}>${t("it.finalize")}<//>`}
      </div>
    </div>

    ${remote && html`<div class="mb2"><${Alert} icon="refresh" action=${html`<${Btn} size="sm" kind="secondary" onClick=${() => { discard(); res.reload(); }}>${t("it.reload")}<//>`}>${t("it.remote_update", { by: remote.by, v: remote.v })}<//></div>`}
    ${!perms.can_edit && html`<div class="mb2"><${Alert} icon=${option.status === "finalized" ? "lock" : "eye"}>${option.status === "finalized" || trip.status === "saved" && !isGroup ? t("it.locked") : t("it.view_only")}<//></div>`}

    <div class="row between wrap mb2" style="gap:12px">
      <${Seg} value=${tab} onChange=${setTab} label="Tabs" options=${[
        { value: "plan", label: t("it.tab.plan"), icon: "route" },
        { value: "budget", label: t("it.tab.budget"), icon: "wallet" },
        { value: "talk", label: t("it.tab.talk"), icon: "message", count: isGroup ? d.comment_count : null },
      ]} />
      ${tab === "plan" && html`<span class="small faint">${dayData.theme ? L(dayData.theme) : ""}</span>`}
    </div>

    ${tab === "plan" && html`
      <div class="day-tabs mb2" role="tablist" aria-label=${t("it.tab.plan")}>${data.days.map((x, i) => html`
        <button role="tab" aria-selected=${i === day} class=${"day-tab " + (i === day ? "on" : "")} onClick=${() => { setDay(i); setActive(null); }}>
          <div class="d">${t("it.day", { n: x.day })}</div><div class="s">${weekday(x.date)} ${fmtDate(x.date, { year: false })} · ${moneyShort(x.cost)}</div></button>`)}</div>
      <div class="it-grid">
        <div>
          <div class="row between mb2"><div class="card-title">${dayData.theme ? L(dayData.theme) : t("it.day", { n: dayData.day })}</div>
            <span class="small faint">${t("it.day_cost", { v: money(dayData.cost) })}</span></div>
          ${acts.length === 0 ? html`<div class="card"><${Empty} scene=${trip.destination} text="—" /></div>` : html`
          <div class="timeline" aria-busy=${busy === "preview"} style=${busy === "preview" ? "opacity:.6;pointer-events:none" : ""}>
            ${numbered.map(({ a, n }, i) => html`<${ActivityItem} key=${a.id} a=${a} n=${n} selected=${active === a.id} onSelect=${setActive}
              canEdit=${perms.can_edit} canComment=${perms.can_comment} ops=${opsFor(i)} first=${i === 0} last=${i === acts.length - 1} />`)}
          </div>`}
          ${perms.can_edit && html`<div class="row wrap mt2">
            <${Btn} kind="secondary" icon="plus" onClick=${() => setModal({ type: "add" })}>${t("it.add")}<//>
            <${Btn} kind="ghost" icon="sparkle" onClick=${() => setModal({ type: "refine" })}>${t("it.refine")}<//></div>`}
        </div>
        <${MapView} points=${points} center=${destination} activeId=${active} onPick=${(id) => { setActive(id); const el = document.querySelector(".tl-card.on"); el && el.scrollIntoView({ block: "nearest" }); }} />
      </div>`}
    ${tab === "budget" && html`<${BudgetView} data=${data} isGroup=${isGroup} />`}
    ${tab === "talk" && html`<${Discussion} oid=${oid} perms=${perms} data=${data} about=${about} setAbout=${setAbout} onJump=${jump} isGroup=${isGroup} />`}

    ${dirty && html`<div class="unsaved-bar glass" role="region" aria-label=${t("it.unsaved")}>
      <${Icon} n="edit" /><strong class="small">${t("it.unsaved")}</strong><span class="spacer" />
      <${Btn} kind="ghost" onClick=${discard}>${t("it.discard")}<//>
      <${Btn} icon="check" loading=${busy === "save"} onClick=${() => save()}>${t("it.save")}<//>
    </div>`}

    ${modal && modal.type === "time" && html`<${TimeModal} a=${acts[modal.i]} onClose=${() => setModal(null)}
      onSave=${(st, du) => edit((n) => { const a = n.days[day].activities[modal.i]; a.start = st; a.duration = du; a.pinned = true; })} />`}
    ${modal && modal.type === "replace" && html`<${ReplaceModal} oid=${oid} a=${acts[modal.i]} onClose=${() => setModal(null)}
      onPick=${(p) => edit((n) => { const a = n.days[day].activities[modal.i]; n.days[day].activities[modal.i] = { id: a.id, kind: p.meal ? "meal" : "visit", place_id: p.id, start: a.start, duration: p.duration, pinned: a.pinned }; })} />`}
    ${modal && modal.type === "add" && html`<${AddModal} oid=${oid} dest=${trip.destination} dayLabel=${t("it.day", { n: dayData.day })} used=${usedIds} onAdd=${addStop} onClose=${() => setModal(null)} />`}
    ${modal && modal.type === "refine" && html`<${RefineModal} oid=${oid} data=${data} onClose=${() => setModal(null)} onDone=${(nd) => { setDraft(nd); toast(t("it.r.done"), { kind: "success" }); }} />`}
    ${modal && modal.type === "versions" && html`<${VersionsModal} versions=${versions} current=${option.version} canEdit=${perms.can_edit} dirty=${dirty} onRestore=${restore} onClose=${() => setModal(null)} />`}
    ${modal && modal.type === "finalize" && html`<${Confirm} title=${t("it.finalize")} text=${t("it.finalize_confirm")} confirmLabel=${t("it.finalize")} onClose=${() => setModal(null)}
      onConfirm=${async () => { const r = await api(`/itineraries/${oid}/finalize`, { method: "POST" }); res.setData(r); toast(t("pl.finalized"), { kind: "success" }); }} />`}
    ${modal && modal.type === "conflict" && html`<${Modal} title=${t("it.conflict_t")} onClose=${() => setModal(null)} actions=${html`
        <${Btn} kind="ghost" onClick=${() => setModal(null)}>${t("cancel")}<//>
        <${Btn} kind="danger" loading=${busy === "save"} onClick=${() => save(true)}>${t("it.overwrite")}<//>
        <${Btn} onClick=${() => { setModal(null); discard(); res.reload(); }}>${t("it.load_latest")}<//>`}>
      <p class="muted" style="margin:0">${t("it.conflict_d", { by: modal.by || "?", v: modal.v })}</p><//>`}
    ${modal && modal.type === "leave" && html`<${Modal} title=${t("it.leave_t")} onClose=${() => setModal(null)} actions=${html`
        <${Btn} kind="ghost" onClick=${() => setModal(null)}>${t("cancel")}<//>
        <${Btn} kind="danger" onClick=${() => { const to = modal.to; setDraft(null); setModal(null); navigate(to, { force: true }); }}>${t("it.leave_discard")}<//>
        <${Btn} loading=${busy === "save"} onClick=${() => { const to = modal.to; save(false, () => navigate(to, { force: true })); }}>${t("it.leave_save")}<//>`}>
      <p class="muted" style="margin:0">${t("it.leave_d")}</p><//>`}
  </div>`;
}
