import { html, render, useEffect } from "./lib.js";
import { store, useStore, boot, navigate, match, requireAuth, ensureGuest } from "./store.js";
import { t } from "./i18n.js";
import { Shell } from "./shell.js";
import { Skel, Empty, Btn } from "./ui.js";
import { Landing, Explore } from "./pages/landing.js";
import { Login, Register } from "./pages/auth.js";
import { Dashboard, PlanChooser } from "./pages/dashboard.js";
import { PersonalForm, TripView } from "./pages/personal.js";
import { CreateGroup, Join } from "./pages/group.js";
import { Room, MemberPrefs, Synthesis } from "./pages/room.js";
import { Plans } from "./pages/plans.js";
import { Itinerary } from "./pages/itinerary.js";
import { MyTrips } from "./pages/trips.js";
import { Profile } from "./pages/profile.js";

// [pattern, component, auth]: true = signed in (guests too), "account" = registered account,
// "try" = a guest session is started automatically
const ROUTES = [
  ["/", null, false],
  ["/login", Login, false],
  ["/register", Register, false],
  ["/explore", Explore, false],
  ["/join", Join, false],
  ["/plan", PlanChooser, "try"],
  ["/plan/personal", PersonalForm, "try"],
  ["/trips/:id", TripView, "try"],
  ["/groups/new", CreateGroup, "account"],
  ["/rooms/:gid", Room, true],
  ["/rooms/:gid/preferences", MemberPrefs, true],
  ["/rooms/:gid/synthesis", Synthesis, true],
  ["/rooms/:gid/plans", Plans, true],
  ["/itinerary/:oid", Itinerary, "try"],
  ["/my-trips", MyTrips, "try"],
  ["/profile", Profile, true],
];

function NotFound() {
  return html`<div class="frame glass narrow"><${Empty} scene="hue" title=${t("nf.title")}>
    <${Btn} onClick=${() => navigate("/")}>${t("nf.back")}<//><//></div>`;
}

function Router() {
  const s = useStore();
  const path = s.route.path.replace(/\/+$/, "") || "/";
  let found = null;
  for (const [pat, comp, auth] of ROUTES) {
    const params = match(pat, path);
    if (params) { found = { comp, auth, params, pat }; break; }
  }
  const needAuth = found && found.auth;
  useEffect(() => {
    if (!needAuth || s.user !== null) return;
    if (needAuth === "try") ensureGuest().catch(() => {});
    else requireAuth();
  }, [needAuth, s.user, path]);
  useEffect(() => {
    if (needAuth === "account" && s.user && s.user.provider === "guest")
      navigate("/register?next=" + encodeURIComponent(path), { replace: true, force: true });
  }, [needAuth, s.user, path]);
  useEffect(() => {
    if ((path === "/login" || path === "/register") && s.user && s.user.provider !== "guest") navigate("/", { replace: true });
  }, [path, s.user]);
  useEffect(() => { document.title = "Wayplot" + (found && found.pat !== "/" ? " · " + (path.split("/")[1] || "") : ""); }, [path]);

  if (s.user === undefined) return html`<div class="frame glass stack lg"><${Skel} h=${42} w="40%" /><${Skel} h=${200} r=${20} /></div>`;
  if (!found) return html`<${NotFound} />`;
  if (found.pat === "/") return s.user ? html`<${Dashboard} key=${"d" + (s.sessionKey || 0)} />` : html`<${Landing} />`;
  if (needAuth && !s.user || needAuth === "account" && s.user.provider === "guest") return html`<div class="frame glass"><${Skel} h=${200} /></div>`;
  const C = found.comp;
  return html`<${C} key=${path + ":" + (s.sessionKey || 0)} ...${found.params} />`;
}

function App() {
  return html`<${Shell}><${Router} /><//>`;
}

// Intercept same-origin <a href="/..."> clicks for SPA navigation
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || a.target || a.hasAttribute("download")) return;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/") || href.startsWith("/static/")) return;
  e.preventDefault();
  navigate(href);
});

boot();
render(html`<${App} />`, document.getElementById("app"));
