import { html, useState, useEffect, useRef } from "../lib.js";
import { Icon } from "../icons.js";
import { Scene } from "../scenes.js";
import { Btn, Field, Alert, Modal, Confirm, Avatar, StatusChip, Progress, ErrorBlock, Skel, Empty, Stages, useOutside, fieldErrors } from "../ui.js";
import { api, store, useStore, navigate, useLoad, useEvents, toast } from "../store.js";
import { t, L, fmtRange, fmtDate, errText, ago, money } from "../i18n.js";
import { InviteCodeBlock } from "./group.js";
import { useGeneration, GenerationCard } from "./personal.js";
import { BudgetFields, InterestFields, SpecialField, PrefSummary, emptyPrefs, fromDefaults, checkPrefs } from "../prefs.js";

const GROUP_EVENTS = ["member.joined", "member.ready", "member.left", "member.updated", "submission.updated", "room.updated",
  "group.ready_to_generate", "generation.started", "generation.progress", "generation.completed", "generation.failed", "itinerary.finalized", "itinerary.updated"];

function useRoom(gid) {
  const r = useLoad(() => api("/groups/" + gid + "/status"), [gid]);
  const map = {};
  GROUP_EVENTS.forEach((ev) => { map[ev] = (d) => { if (d.group_id === gid) r.reload(); }; });
  map.reconnected = () => r.reload();
  useEvents(map, [gid]);
  return r;
}

function MemberMenu({ m, gid, reload, room }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false), open);
  const act = async (path, body, msg) => {
    setOpen(false);
    try { await api("/groups/" + gid + path, { method: "POST", body }); toast(msg || t("pr.saved"), { kind: "success" }); reload(); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
  };
  return html`<div class="menu-wrap" ref=${ref}>
    <button class="icon-btn" aria-label=${t("rm.manage") + " " + m.name} aria-haspopup="menu" aria-expanded=${open} onClick=${() => setOpen(!open)}><${Icon} n="dots" /></button>
    ${open && html`<div class="menu" role="menu">
      <button role="menuitem" onClick=${() => act("/members/" + m.id + "/editor", { can_edit: !m.can_edit })}><${Icon} n=${m.can_edit ? "lock" : "edit"} s=${16} />${m.can_edit ? t("rm.remove_editor") : t("rm.make_editor")}</button>
      <button role="menuitem" onClick=${() => { setOpen(false); setConfirm("transfer"); }}><${Icon} n="crown" s=${16} />${t("rm.transfer")}</button>
      <div class="sep" />
      <button role="menuitem" class="danger" onClick=${() => { setOpen(false); setConfirm("remove"); }}><${Icon} n="trash" s=${16} />${t("rm.remove")}</button>
    </div>`}
    ${confirm === "transfer" && html`<${Confirm} title=${t("rm.transfer")} text=${m.name} onClose=${() => setConfirm(null)}
      onConfirm=${async () => { await api("/groups/" + gid + "/transfer", { method: "POST", body: { user_id: m.id } }); reload(); }} />`}
    ${confirm === "remove" && html`<${Confirm} danger title=${t("rm.remove")} text=${m.name} confirmLabel=${t("rm.remove")} onClose=${() => setConfirm(null)}
      onConfirm=${async () => { await api("/groups/" + gid + "/members/" + m.id + "/remove", { method: "POST" }); reload(); }} />`}
  </div>`;
}

function feedText(f) {
  const key = "feed." + f.action;
  const s = t(key, { name: f.name || "" });
  return s === key ? f.action : s;
}

export function Room({ gid }) {
  const s = useStore();
  const { data: d, error, loading, reload } = useRoom(gid);
  const [busy, setBusy] = useState(null);
  const [modal, setModal] = useState(null);
  const prev = useRef(null);

  // Toasts for other people's actions
  useEvents({
    "member.joined": (x) => x.group_id === gid && x.user_id !== s.user.id && toast(t("rm.toast_joined", { name: x.name })),
    "member.ready": (x) => x.group_id === gid && x.ready && x.user_id !== s.user.id && x.name && toast(t("rm.toast_ready", { name: x.name })),
    "group.ready_to_generate": (x) => x.group_id === gid && toast(t("rm.all_ready"), { kind: "success" }),
    "member.left": (x) => { if (x.group_id === gid && x.user_id === s.user.id) { toast(t("err.forbidden")); navigate("/my-trips", { replace: true }); } },
  }, [gid]);

  if (loading) return html`<div class="frame glass wide stack lg"><${Skel} h=${110} r=${20} /><div class="grid g-room"><${Skel} h=${360} r=${20} /><${Skel} h=${360} r=${20} /></div></div>`;
  if (error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${error} onRetry=${() => reload(false)} /></div>`;

  const { group, trip, members, ready, me, invite, generation, options, quota, feed } = d;
  const isLeader = me.is_leader;
  const locked = group.room_status === "closed" || group.room_status === "finalized";
  const running = generation && generation.status === "running";
  const leader = members.find((m) => m.is_leader);

  const doReady = async (val) => {
    setBusy("ready");
    try { await api("/groups/" + gid + "/ready", { method: "POST", body: { ready: val } }); await reload(); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };
  const remind = async () => {
    setBusy("remind");
    try { const r = await api("/groups/" + gid + "/remind", { method: "POST", body: {} }); toast(t("rm.reminded", { n: r.reminded }), { kind: "success" }); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };
  const invAct = async (extend) => {
    setBusy(extend ? "extend" : "regen");
    try { await api("/groups/" + gid + "/invite-code", { method: "POST", body: { extend } }); await reload(); toast(t("pr.saved"), { kind: "success" }); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };
  const retryGen = async () => {
    setBusy("retry");
    try { await api("/generations/" + generation.id + "/retry", { method: "POST" }); await reload(); }
    catch (x) { toast(errText(x), { kind: "danger" }); }
    setBusy(null);
  };

  const myState = me.ready ? "ready" : me.submission_status === "submitted" ? "submitted" : me.submission_status === "draft" ? "draft" : "none";
  const finalized = options.find((o) => o.status === "finalized");

  return html`<div class="frame glass wide">
    <div class="room-strip burgundy">
      <div style="width:84px;height:84px;border-radius:50%;overflow:hidden;border:2px solid #D9B56B;flex:none" class="hide-sm"><${Scene} id=${trip.destination} /></div>
      <div style="flex:1;min-width:240px">
        <span class="kicker" style="color:#D9B56B">${t("type.group")} · ${t("room." + group.room_status)}</span>
        <div class="title" style="color:#FBF3EA">${trip.title}</div>
        <div class="meta mt1">
          <span><${Icon} n="pin" s=${14} />${L(trip.destination_name)}</span>
          <span><${Icon} n="calendar" s=${14} />${fmtRange(trip.start_date, trip.end_date)}</span>
          <span><${Icon} n="users" s=${14} />${members.length} / ${group.max_members}</span>
          ${leader && html`<span><${Icon} n="crown" s=${14} />${leader.name}</span>`}
        </div>
      </div>
      ${options.length > 0 && html`<${Btn} kind="gold" iconR="arrowR" onClick=${() => navigate("/rooms/" + gid + "/plans")}>${t("rm.view_plans")}<//>`}
    </div>
    ${group.notes && html`<div class="mb3"><${Alert} icon="message">${group.notes}<//></div>`}
    ${group.room_status === "closed" && html`<div class="mb3"><${Alert} icon="lock">${t("rm.closed_note")}<//></div>`}
    ${!locked && options.length > 0 && (d.after_plan || []).length > 0 && html`<div class="mb3"><${Alert} kind="warn" icon="alert"
      action=${isLeader && html`<${Btn} size="sm" icon="sparkle" onClick=${() => navigate("/rooms/" + gid + "/synthesis")}>${t("rm.regen")}<//>`}>
      <strong>${t("rm.after_plan_t", { names: d.after_plan.map((x) => x.name).join(", ") })}</strong> ${isLeader ? t("rm.after_plan_leader") : t("rm.after_plan_member")}<//></div>`}
    ${group.room_status === "finalized" && html`<div class="mb3"><${Alert} icon="check" action=${finalized && html`<${Btn} size="sm" onClick=${() => navigate("/itinerary/" + finalized.id)}>${t("pl.view")}<//>`}>${t("rm.finalized_note")}<//></div>`}

    <div class="grid g-room">
      <div class="stack lg">
        <section class="card">
          <div class="card-head">
            <div><div class="kicker">${t("rm.members")}</div>
              <div class="row mt1" style="gap:12px"><span class="ready-count">${ready.ready}<span class="faint" style="font-size:18px">/${ready.active}</span></span>
                <span class="small muted">${t("rm.progress", { r: ready.ready, n: ready.active })}</span></div></div>
            ${ready.all_ready && html`<span class="status ready"><${Icon} n="check" s=${13} />${t("rm.all_ready")}</span>`}
          </div>
          <${Progress} value=${ready.ready} max=${ready.active} label=${t("rm.progress", { r: ready.ready, n: ready.active })} />
          <div class="list mt2">${members.map((m) => html`
            <div class="member-row">
              <${Avatar} name=${m.name} initials=${m.initials} leader=${m.is_leader} />
              <div class="grow"><div class="nm">${m.name}${m.id === s.user.id && html`<span class="tiny faint">(${store.lang === "en" ? "you" : "bạn"})</span>`}
                ${m.is_leader && html`<span class="badge leader"><${Icon} n="crown" s=${11} />${t("rm.leader")}</span>`}
                ${m.can_edit && !m.is_leader && html`<span class="badge muted"><${Icon} n="edit" s=${11} />${t("rm.editor")}</span>`}
                ${m.after_plan && html`<span class="badge flag" title=${t("rm.after_plan_badge_d")}><${Icon} n="alert" s=${11} />${t("rm.after_plan_badge")}</span>`}</div>
                <div class="tiny faint">${ago(m.joined_at)}</div>
                ${m.shared_note && html`<div class="shared-note small">“${m.shared_note}”</div>`}</div>
              <${StatusChip} status=${m.status} />
              ${isLeader && !m.is_leader && !locked && html`<${MemberMenu} m=${m} gid=${gid} reload=${reload} room=${d} />`}
            </div>`)}</div>
        </section>

        <section class="card">
          <div class="card-head"><div class="card-title">${t("rm.plans")}</div>
            ${quota && html`<span class="tiny faint">${t("sy.quota", { r: Math.max(0, quota.limit - quota.used), l: quota.limit })}</span>`}</div>
          ${running ? html`<div><p class="small muted" style="margin-top:0">${t("rm.gen_running")}</p><${Stages} stage=${generation.stage} /></div>`
            : html`<div class="stack lg">
              ${generation && generation.status === "failed" && html`<${Alert} kind="danger" action=${isLeader && html`<${Btn} kind="secondary" size="sm" icon="refresh" loading=${busy === "retry"} onClick=${retryGen}>${t("retry")}<//>`}>${t("rm.gen_failed")}<//>`}
              ${options.length > 0 && html`<div class="list">${options.map((o) => html`
                <a class="list-item" href=${"/itinerary/" + o.id} style="text-decoration:none;color:inherit">
                  <span class="tile-ic"><strong>${o.option_number}</strong></span>
                  <div class="grow"><div class="title">${L(o.title)}</div><div class="sub">${t("p." + o.pace)} · ~${money(o.per_person)}${t("land.per_person")}</div></div>
                  ${o.status === "finalized" && html`<span class="badge solid">${t("pl.finalized")}</span>`}<${Icon} n="chevR" />
                </a>`)}</div>`}
              ${!locked && (isLeader ? html`<div class="stack">
                  ${options.length === 0 && html`<${Alert} kind="warn" icon="alert">${t("rm.wait_all")}<//>`}
                  ${!ready.all_ready && ready.waiting.length > 0 && html`<div class="small muted">${t("rm.waiting", { names: ready.waiting.map((w) => w.name).join(", ") })}</div>`}
                  <div class="row wrap">
                    <${Btn} icon="sparkle" disabled=${!ready.all_ready} onClick=${() => navigate("/rooms/" + gid + "/synthesis")}>${t("rm.generate")}<//>
                    ${!ready.all_ready && ready.ready > 0 && html`<${Btn} kind="secondary" onClick=${() => navigate("/rooms/" + gid + "/synthesis?include=ready_only")}>${t("rm.gen_ready_only")}<//>`}
                    ${!ready.all_ready && html`<${Btn} kind="ghost" icon="bell" loading=${busy === "remind"} onClick=${remind}>${t("rm.remind")}<//>`}
                  </div></div>`
                : options.length === 0 && html`<p class="small muted" style="margin:0">${t("rm.leader_only_gen")}</p>`)}
            </div>`}
        </section>
      </div>

      <div class="stack lg">
        <section class="card">
          <div class="kicker">${t("rm.my")}</div>
          <div class="h3 mt1">${t("rm.my." + myState)}</div>
          ${myState === "none" && html`<p class="small muted">${t("rm.my.none_d")}</p>`}
          ${me.submission_updated && html`<div class="tiny faint mt1">${t("dash.updated", { when: ago(me.submission_updated) })}</div>`}
          ${!locked && html`<div class="row wrap mt2">
            <${Btn} kind=${myState === "none" || myState === "draft" ? "primary" : "secondary"} icon="edit" onClick=${() => navigate("/rooms/" + gid + "/preferences")}>${myState === "none" ? t("rm.fill") : t("rm.edit")}<//>
            ${myState === "submitted" && html`<${Btn} icon="check" loading=${busy === "ready"} onClick=${() => doReady(true)}>${t("rm.ready_btn")}<//>`}
            ${myState === "ready" && html`<${Btn} kind="ghost" loading=${busy === "ready"} onClick=${() => doReady(false)}>${t("rm.unready")}<//>`}
          </div>`}
        </section>

        <section class="burgundy">
          ${isLeader && invite && !locked ? html`
            <${InviteCodeBlock} invite=${invite} title=${trip.title} />
            <div class="row wrap mt2">
              <button class="text-btn" style="color:#E9CD8F" disabled=${busy} onClick=${() => invAct(true)}><${Icon} n="clock" s=${15} />${t("rm.extend")}</button>
              <button class="text-btn" style="color:#E9CD8F" disabled=${busy} onClick=${() => invAct(false)}><${Icon} n="refresh" s=${15} />${t("rm.regen")}</button>
            </div>`
          : html`<div class="kicker" style="color:#D9B56B">${t("rm.code")}</div>
            <p class="small muted" style="margin:8px 0 0">${locked ? t("err.room_closed") : t("rm.member_view", { leader: leader ? leader.name : "" })}</p>`}
        </section>

        <section class="card">
          <div class="card-title mb2">${t("rm.feed")}</div>
          ${feed.length === 0 ? html`<p class="small muted" style="margin:0">—</p>` : html`<div class="feed">${feed.map((f) => html`
            <div class="it"><div style="flex:1">${feedText(f)}<div class="tiny faint">${ago(f.created_at)}</div></div></div>`)}</div>`}
        </section>

        ${group.room_status !== "closed" && html`<div class="row wrap end">
          <${Btn} kind="ghost" icon="logout" onClick=${() => setModal("leave")}>${t("rm.leave")}<//>
          ${isLeader && html`<${Btn} kind="danger" size="sm" icon="lock" onClick=${() => setModal("close")}>${t("rm.close")}<//>`}
        </div>`}
      </div>
    </div>

    ${modal === "close" && html`<${Confirm} danger title=${t("rm.close")} text=${t("rm.close_confirm")} confirmLabel=${t("rm.close")} onClose=${() => setModal(null)}
      onConfirm=${async () => { await api("/groups/" + gid + "/close", { method: "POST" }); reload(); }} />`}
    ${modal === "leave" && html`<${LeaveModal} gid=${gid} isLeader=${isLeader} members=${members.filter((m) => !m.is_leader)} onClose=${() => setModal(null)} />`}
  </div>`;
}

function LeaveModal({ gid, isLeader, members, onClose }) {
  const [succ, setSucc] = useState(members[0] ? members[0].id : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await api("/groups/" + gid + "/leave", { method: "POST", body: { successor_id: isLeader ? succ : undefined } }); onClose(); navigate("/my-trips", { replace: true }); }
    catch (x) { setErr(x); setBusy(false); }
  };
  return html`<${Modal} title=${t("rm.leave")} onClose=${onClose} actions=${html`<${Btn} kind="ghost" onClick=${onClose}>${t("cancel")}<//><${Btn} kind="danger" loading=${busy} onClick=${go}>${t("rm.leave")}<//>`}>
    <p class="muted" style="margin-top:0">${t("rm.leave_confirm")}</p>
    ${isLeader && members.length > 0 && html`<${Field} id="succ" label=${t("rm.successor")}>
      <select id="succ" class="select" value=${succ} onChange=${(e) => setSucc(e.target.value)}>${members.map((m) => html`<option value=${m.id}>${m.name}</option>`)}</select><//>`}
    ${err && html`<div class="mt2"><${Alert} kind="danger">${errText(err)}<//></div>`}
  <//>`;
}

// ------------------------------------------------------------ member prefs
export function MemberPrefs({ gid }) {
  useStore();
  const room = useLoad(() => api("/groups/" + gid + "/status"), [gid]);
  const sub = useLoad(() => api("/groups/" + gid + "/submissions/me"), [gid]);
  const [p, setP] = useState(null);
  const [orig, setOrig] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [saveDefault, setSaveDefault] = useState(false);
  const [warn, setWarn] = useState(false);
  const [general, setGeneral] = useState(null);
  useEffect(() => {
    if (!sub.data || p) return;
    const base = sub.data.submission ? { ...emptyPrefs(), ...sub.data.submission.preferences } : fromDefaults(sub.data.defaults);
    base.budget_amount = base.budget_amount == null ? "" : String(base.budget_amount);
    setP(base); setOrig(JSON.stringify(base));
  }, [sub.data]);
  if (room.loading || sub.loading || !p) return html`<div class="frame glass wide stack lg"><${Skel} h=${40} w="50%" /><${Skel} h=${420} r=${20} /></div>`;
  if (room.error || sub.error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${room.error || sub.error} onRetry=${() => { room.reload(false); sub.reload(false); }} /></div>`;
  const d = room.data;
  const set = (x) => { setP({ ...p, ...x }); const e = { ...errors }; Object.keys(x).forEach((k) => delete e[k]); setErrors(e); };
  const changed = JSON.stringify(p) !== orig;
  const save = async (status, force) => {
    const e = checkPrefs(p, { requireInterests: status === "submitted", requireBudget: status === "submitted" });
    setErrors(e); setGeneral(null);
    if (Object.keys(e).length) { const el = document.getElementById(Object.keys(e)[0]); el && el.focus(); return; }
    if (status === "submitted" && d.me.ready && changed && !force) { setWarn(true); return; }
    setBusy(status);
    try {
      const r = await api("/groups/" + gid + "/submissions/me", { method: "PUT", body: { preferences: p, status, save_as_default: saveDefault } });
      setOrig(JSON.stringify(p));
      if (r.ready_reset) toast(t("mp.reset_done"));
      toast(status === "submitted" ? t("mp.submitted") : t("mp.saved_draft"), { kind: "success" });
      if (status === "submitted") navigate("/rooms/" + gid);
      else sub.reload();
    } catch (x) {
      if (x.code === "validation") { const k = {}; for (const f in x.fields) k[f] = "err." + (f === "special" && x.fields[f] === "too_long" ? "too_long_text" : x.fields[f]); setErrors(k); }
      else setGeneral(errText(x));
    }
    setBusy(null);
  };
  const s = sub.data.submission;
  const locked = d.group.room_status === "closed" || d.group.room_status === "finalized";
  return html`<div class="frame glass wide">
    <div class="page-head">
      <div><p class="eyebrow"><a class="link-btn" href=${"/rooms/" + gid}>← ${d.trip.title}</a></p><h1 class="h1">${t("mp.title")}</h1></div>
      ${s && html`<div class="right">${t("mp.version", { v: s.version, when: ago(s.updated_at) })}</div>`}
    </div>
    <div class="form-shell">
      <div class="card form-section">
        ${general && html`<${Alert} kind="danger">${general}<//>`}
        ${locked && html`<${Alert} icon="lock">${t("rm.closed_note")}<//>`}
        ${d.me.ready && html`<${Alert} icon="info">${t("mp.reset_warn")}<//>`}
        ${!locked && d.options.length > 0 && html`<${Alert} kind="warn" icon="alert">${t("mp.after_plan")}<//>`}
        <div class="kicker">${t("pf.budget")}</div>
        <${BudgetFields} value=${p} set=${set} errors=${errors} label=${t("mp.budget")} />
        <hr class="rule" />
        <div class="kicker">${t("pf.s3")}</div>
        <${InterestFields} value=${p} set=${set} errors=${errors} />
        <hr class="rule" />
        <${SpecialField} value=${p} set=${set} errors=${errors} />
        <label class="check"><input type="checkbox" checked=${saveDefault} onChange=${(e) => setSaveDefault(e.target.checked)} /><span>${t("mp.save_default")}</span></label>
        <div class="form-foot">
          <${Btn} kind="ghost" loading=${busy === "draft"} disabled=${locked} onClick=${() => save("draft")}>${t("mp.draft")}<//>
          <${Btn} size="lg" icon="send" loading=${busy === "submitted"} disabled=${locked} onClick=${() => save("submitted")}>${t("mp.submit")}<//>
        </div>
      </div>
      <aside class="sticky-side stack lg">
        <div class="card"><div class="kicker mb2">${t("mp.summary")}</div><${PrefSummary} p=${p} /></div>
        <div class="card tight small muted row" style="gap:10px;align-items:flex-start"><${Icon} n="shield" s=${18} /><span>${t("sy.privacy")}</span></div>
      </aside>
    </div>
    ${warn && html`<${Modal} title=${t("rm.my.ready")} onClose=${() => setWarn(false)} actions=${html`
      <${Btn} kind="ghost" onClick=${() => setWarn(false)}>${t("cancel")}<//><${Btn} onClick=${() => { setWarn(false); save("submitted", true); }}>${t("mp.submit")}<//>`}>
      <p class="muted" style="margin:0">${t("mp.reset_warn")}</p><//>`}
  </div>`;
}

// --------------------------------------------------------------- synthesis
export function Synthesis({ gid }) {
  const s = useStore();
  const include = store.route.query.get("include") === "ready_only" ? "ready_only" : "all";
  const syn = useLoad(() => api("/groups/" + gid + "/synthesis", { method: "POST", body: { include } }), [gid, include]);
  const room = useLoad(() => api("/groups/" + gid + "/status"), [gid]);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [genId, setGenId] = useState(null);
  useEffect(() => {
    const g = room.data && room.data.generation;
    if (g && g.status === "running") setGenId(g.id);
  }, [room.data]);
  const gen = useGeneration(genId, { onDone: () => navigate("/rooms/" + gid + "/plans", { replace: true }) });
  const generate = async () => {
    setBusy(true); setErr(null);
    try { const r = await api("/groups/" + gid + "/generate", { method: "POST", body: { plan_count: count, include } }); setGenId(r.generation_id); }
    catch (x) { setErr(x); }
    setBusy(false);
  };
  const retry = async () => {
    setBusy(true);
    try { const r = await api("/generations/" + genId + "/retry", { method: "POST" }); setGenId(r.generation_id); } catch (x) { setErr(x); }
    setBusy(false);
  };
  const back = html`<a class="link-btn" href=${"/rooms/" + gid}>← ${room.data ? room.data.trip.title : t("back")}</a>`;
  if (syn.loading || room.loading) return html`<div class="frame glass wide stack lg"><${Skel} h=${40} w="50%" /><${Skel} h=${300} r=${20} /></div>`;
  if (room.error) return html`<div class="frame glass narrow"><${ErrorBlock} error=${room.error} onRetry=${() => room.reload(false)} /></div>`;
  if (syn.error) {
    const e = syn.error;
    return html`<div class="frame glass narrow"><p class="eyebrow">${back}</p>
      ${e.code === "leader_only" ? html`<${Empty} scene="hue" title=${t("sy.title")} text=${t("sy.member_wait")} />`
        : html`<${Alert} kind="danger">${errText(e)}${e.details.waiting && html` — ${e.details.waiting.map((w) => w.name).join(", ")}`}<//>`}</div>`;
  }
  const { synthesis: S, excluded, quota } = syn.data;
  const n = S.member_count;
  return html`<div class="frame glass wide">
    <div class="page-head"><div><p class="eyebrow">${back}</p><h1 class="h1">${t("sy.title")}</h1></div>
      <div class="right"><span class="badge muted"><${Icon} n="sparkle" s=${12} />${t("engine." + s.engine)}</span></div></div>
    ${excluded.length > 0 && html`<div class="mb3"><${Alert} kind="warn" icon="alert">${t("sy.excluded", { names: excluded.map((e) => e.name).join(", ") })} ${t("sy.no_auto")}<//></div>`}
    <div class="grid g-main">
      <div class="stack lg">
        <div class="card">
          <div class="card-title mb2">${t("sy.common")}</div>
          <div class="chips">${S.common.length ? S.common.map((i) => html`<span class="chip static on">${t("i." + i)} · ${S.interest_counts[i]}/${n}</span>`) : html`<span class="small muted">—</span>`}</div>
          <div class="card-title mt3 mb2">${t("sy.diff")}</div>
          <ul class="hl-list">${S.differences.map((x, i) => html`<li><span class="n">${i + 1}</span><span>${
            x.type === "pace" ? t("sy.pace_split", { v: Object.entries(x.values).map(([k, v]) => `${t("p." + k)} (${v})`).join(", ") })
            : x.type === "budget" ? t("sy.budget_split", { a: money(x.min), b: money(x.max) })
            : t("sy.interest_split", { i: t("i." + x.key), c: x.count, n: x.of })}</span></li>`)}
            ${S.differences.length === 0 && html`<li class="small muted">—</li>`}</ul>
        </div>
        <div class="card">
          <div class="card-title mb2">${t("sy.constraints")}</div>
          <div class="grid g2">
            <div><div class="kicker mb2">${t("sy.hard")}</div><ul class="hl-list">
              <li><${Icon} n="calendar" s=${16} />${t("sy.dates", { s: fmtDate(S.hard.dates.start), e: fmtDate(S.hard.dates.end) })}</li>
              <li><${Icon} n="wallet" s=${16} />${S.hard.max_budget ? t("sy.maxbudget", { v: money(S.hard.max_budget) }) : t("sy.nomax")}</li>
              ${S.hard.avoid.length > 0 && html`<li><${Icon} n="x" s=${16} />${t("sy.avoid", { v: S.hard.avoid.map((a) => t("a." + a)).join(", ") })}</li>`}
            </ul></div>
            <div><div class="kicker mb2">${t("sy.soft")}</div><ul class="hl-list">
              <li><${Icon} n="clock" s=${16} />${t("pf.pace")}: ${t("p." + S.soft.pace)}</li>
              ${S.budget.median && html`<li><${Icon} n="coins" s=${16} />~${money(S.budget.median)}${t("land.per_person")}</li>`}
              <li><${Icon} n="star" s=${16} />${S.soft.interests.map((i) => t("i." + i)).join(", ") || "—"}</li>
            </ul></div>
          </div>
          ${S.special_count > 0 && html`<div class="mt2 small muted row" style="gap:8px"><${Icon} n="lock" s=${14} />${t("sy.special", { n: S.special_count })}</div>`}
          ${(S.shared_notes || []).length > 0 && html`<div class="mt2"><div class="kicker mb1">${t("sy.shared")}</div>
            ${S.shared_notes.map((n) => html`<div class="shared-note small"><strong>${n.name}:</strong> “${n.text}”</div>`)}</div>`}
          <div class="foot-note">${t("sy.privacy")}</div>
        </div>
      </div>
      <div class="stack lg">
        ${genId ? html`<${GenerationCard} gen=${gen} onRetry=${retry} retrying=${busy} title=${t("rm.gen_running")} />` : html`
        <div class="card">
          <div class="card-title mb2">${t("sy.count")}</div>
          <div class="radio-cards" role="radiogroup" aria-label=${t("sy.count")}>
            ${[[1, "sy.one"], [2, "sy.two"], [3, "sy.three"]].map(([c, k]) => {
              const lockedC = c > quota.max_plans;
              return html`<button type="button" role="radio" aria-checked=${count === c} disabled=${lockedC} class=${"radio-card " + (count === c ? "on" : "")} onClick=${() => !lockedC && setCount(c)}>
                <span class="radio-dot" /><span style="flex:1"><strong>${t(k)}</strong><br /><span class="small muted">${t(k + "_d")}</span></span>
                ${lockedC && html`<span class="badge"><${Icon} n="lock" s=${11} />${t("sy.locked")}</span>`}</button>`;
            })}
          </div>
          <div class="small faint mt2">${t("sy.quota", { r: quota.remaining, l: quota.limit })}</div>
          <div class="small muted mt2 row" style="gap:6px;align-items:flex-start"><${Icon} n="info" s=${14} /><span>${t("sy.snapshot_note")}</span></div>
          ${err && html`<div class="mt2"><${Alert} kind="danger">${errText(err)}<//></div>`}
          <div class="mt3"><${Btn} size="lg" block icon="sparkle" loading=${busy} disabled=${quota.remaining <= 0} onClick=${generate}>${t("sy.generate")}<//></div>
        </div>`}
      </div>
    </div>
  </div>`;
}
