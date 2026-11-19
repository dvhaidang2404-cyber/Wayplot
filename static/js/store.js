// Global state, router, API client, realtime (SSE) and toasts.
import { useState, useEffect, useRef } from "./lib.js";

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
export { LS };

export const GLASS_DEFAULT = { blur: 22, opacity: 56, theme: "burgundy", scene: "halong", reduce: false };

export const store = {
  lang: LS.get("wayplot.lang", "vi"),
  user: undefined, // undefined = loading, null = signed out
  engine: "local",
  demo: false,
  notifs: [],
  unread: 0,
  toasts: [],
  route: { path: location.pathname, query: new URLSearchParams(location.search) },
  glass: { ...GLASS_DEFAULT, ...LS.get("wayplot.glass", {}) },
  announce: LS.get("wayplot.announce", true),
  online: navigator.onLine,
};

const subs = new Set();
let version = 0;
export function set(patch) {
  Object.assign(store, patch);
  version++;
  subs.forEach((f) => f());
}
export function useStore() {
  const [, force] = useState(0);
  const seen = useRef(version);
  seen.current = version;
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    if (seen.current !== version) f(); // state changed between render and subscribe
    return () => subs.delete(f);
  }, []);
  return store;
}

// ------------------------------------------------------------------ lang / glass
export function setLang(lang) {
  LS.set("wayplot.lang", lang);
  document.documentElement.lang = lang;
  set({ lang });
  if (store.user) api("/users/me", { method: "PUT", body: { lang } }).catch(() => {});
}
export function applyGlass(g) {
  const root = document.documentElement;
  root.dataset.theme = g.theme;
  root.style.setProperty("--blur", g.blur + "px");
  root.style.setProperty("--ga", String(g.opacity / 100));
  root.classList.toggle("reduce-glass", !!g.reduce);
}
export function setGlass(patch) {
  const glass = { ...store.glass, ...patch };
  LS.set("wayplot.glass", glass);
  applyGlass(glass);
  set({ glass });
}

// ------------------------------------------------------------------------- API
export class ApiError extends Error {
  constructor(status, data) {
    super((data && data.error) || "generic");
    this.status = status;
    this.code = (data && data.error) || (status === 0 ? "network" : "generic");
    this.fields = (data && data.fields) || {};
    this.details = data || {};
  }
}
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "wayplot" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { error: "network" });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && data && data.error === "auth_required" && store.user) {
      set({ user: null });
      disconnect();
    }
    throw new ApiError(res.status, data || {});
  }
  return data;
}

// ---------------------------------------------------------------------- router
let guard = null; // (to) => boolean ; return false to block
export function setGuard(fn) { guard = fn; }
export function navigate(to, { replace = false, force = false } = {}) {
  const url = new URL(to, location.origin);
  if (!force && guard && guard(url.pathname + url.search) === false) return;
  if (replace) history.replaceState({}, "", url.pathname + url.search);
  else history.pushState({}, "", url.pathname + url.search);
  set({ route: { path: url.pathname, query: url.searchParams } });
  window.scrollTo({ top: 0 });
}
window.addEventListener("popstate", () => {
  set({ route: { path: location.pathname, query: new URLSearchParams(location.search) } });
});
export function match(pattern, path) {
  const a = pattern.split("/").filter(Boolean), b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
export function requireAuth() {
  if (store.user === null) {
    const next = location.pathname + location.search;
    navigate("/login?next=" + encodeURIComponent(next), { replace: true, force: true });
    return false;
  }
  return !!store.user;
}

/** Visitors can try planning without an account: start a guest session on demand.
 *  Registering later upgrades the same account and keeps its trips. */
let guestP = null;
export function ensureGuest() {
  if (store.user) return Promise.resolve(store.user);
  if (!guestP) {
    guestP = api("/auth/guest", { method: "POST", body: { lang: store.lang } })
      .then((r) => { afterLogin(r.user, false); return r.user; })
      .catch((e) => { guestP = null; requireAuth(); throw e; });
  }
  return guestP;
}

// --------------------------------------------------------------------- toasts
let toastId = 0;
export function toast(text, opts = {}) {
  const id = ++toastId;
  const t = { id, text, kind: opts.kind || "info", action: opts.action };
  set({ toasts: [...store.toasts, t].slice(-4) });
  setTimeout(() => dismissToast(id), opts.ms || 4800);
  return id;
}
export function dismissToast(id) { set({ toasts: store.toasts.filter((t) => t.id !== id) }); }

// ------------------------------------------------------------------- realtime
const listeners = new Map();
let es = null;
const EVENTS = ["hello", "notification", "member.joined", "member.ready", "member.left", "member.updated",
  "submission.updated", "group.ready_to_generate", "room.updated", "generation.started", "generation.progress",
  "generation.completed", "generation.failed", "itinerary.updated", "itinerary.finalized", "comment.created"];

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}
function emit(type, data) {
  (listeners.get(type) || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  (listeners.get("*") || []).forEach((fn) => { try { fn(type, data); } catch (e) { console.error(e); } });
}
export function connect() {
  if (es) return;
  es = new EventSource("/api/stream");
  EVENTS.forEach((ev) => es.addEventListener(ev, (m) => {
    let p = {};
    try { p = JSON.parse(m.data); } catch { return; }
    emit(ev, p.data || {});
  }));
  es.onopen = () => emit("reconnected", {});
}
export function disconnect() { if (es) { es.close(); es = null; } }

/** Subscribe to realtime events while a component is mounted. */
export function useEvents(map, deps = []) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const offs = Object.keys(ref.current).map((type) => on(type, (d) => ref.current[type] && ref.current[type](d)));
    return () => offs.forEach((o) => o());
  }, deps);
}

on("notification", (n) => {
  set({ notifs: [{ ...n, read: false }, ...store.notifs].slice(0, 40), unread: store.unread + 1 });
});

export async function loadNotifs() {
  try {
    const r = await api("/notifications");
    set({ notifs: r.notifications, unread: r.unread });
  } catch { /* ignore */ }
}

export async function boot() {
  applyGlass(store.glass);
  document.documentElement.lang = store.lang;
  window.addEventListener("online", () => set({ online: true }));
  window.addEventListener("offline", () => set({ online: false }));
  try {
    const r = await api("/auth/me");
    set({ user: r.user, engine: r.engine, demo: r.demo });
    if (r.user) afterLogin(r.user, false);
  } catch {
    set({ user: null });
  }
}
export function afterLogin(user, adoptLang = true) {
  set({ user });
  if (adoptLang && user.lang && user.lang !== store.lang) { LS.set("wayplot.lang", user.lang); set({ lang: user.lang }); }
  disconnect();
  connect();
  loadNotifs();
}
export async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
  disconnect();
  guestP = null;
  set({ user: null, notifs: [], unread: 0 });
  navigate("/", { force: true });
}

/** Simple async loader hook: { data, error, loading, reload, setData } */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const run = async (quiet) => {
    const my = ++seq.current;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (my === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (my === seq.current) setState((s) => ({ ...s, error, loading: false }));
    }
  };
  useEffect(() => { run(false); }, deps);
  return { ...state, reload: (quiet = true) => run(quiet), setData: (d) => setState((s) => ({ ...s, data: typeof d === "function" ? d(s.data) : d })) };
}
