import { html } from "./lib.js";

// 24px outline icons, 1.6 stroke, round caps.
const P = {
  menu: "M4 7h16M4 12h16M4 17h16",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0",
  glass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M5.5 6.5l13 11",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14a6.5 6.5 0 0 1 3 6",
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5 5-2z",
  map: "M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4zM9 4v13.5M15 6.5V20",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  wallet: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7zM4 7l11-3v3M16 13.5h2",
  coins: "M9 8c3.3 0 6-1.1 6-2.5S12.3 3 9 3 3 4.1 3 5.5 5.7 8 9 8zM3 5.5v5C3 11.9 5.7 13 9 13s6-1.1 6-2.5v-5M9 13v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5c0-1.4-2.7-2.5-6-2.5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  chevR: "M9 6l6 6-6 6",
  chevL: "M15 6l-6 6 6 6",
  chevD: "M6 9l6 6 6-6",
  copy: "M9 9h10v11H9zM5 15V4h10",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  refresh: "M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  message: "M4 5h16v11H9l-5 4V5z",
  lightbulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 1 1 7 0v3",
  unlock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 6a9.8 9.8 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.3M6.6 7.4C4 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  alert: "M12 4l9 16H3l9-16zM12 10v4M12 17.2v.3",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.3",
  crown: "M4 18h16M5 15l-1-9 5 4 3-6 3 6 5-4-1 9z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
  walk: "M13 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM10 22l2-7 3 3v4M8 11l2-4 4 1 2 4M12 15l-1-5",
  car: "M5 16h14v-4l-2-5H7l-2 5v4zM5 16v2M19 16v2M7.5 13h.1M16.5 13h.1",
  bike: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 15l4-7h5l5 7M9 8l3 7h2",
  bus: "M6 4h12v13H6zM6 11h12M8.5 20v-3M15.5 20v-3M8.5 14h.1M15.5 14h.1",
  food: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-2.5 4-2.5 7H17V3zM17 10v11",
  cafe: "M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3",
  mountain: "M3 19l6-10 4 6 2-3 6 7H3z",
  temple: "M3 21h18M5 21v-8M19 21v-8M9 21v-8M15 21v-8M3 13h18M12 3l9 6H3l9-6z",
  camera: "M4 7h3.5L9 5h6l1.5 2H20v12H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  bag: "M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  leaf: "M5 19C5 10 11 5 20 4c0 9-5 15-14 15M5 19l7-7",
  wave: "M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2",
  bed: "M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6M7 11.5h.1",
  ticket: "M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3v4zM14 4v16",
  dots: "M5 12h.1M12 12h.1M19 12h.1",
  history: "M4 12a8 8 0 1 0 2.3-5.6L4 8.7M4 4v4.7h4.7M12 8v4l3 2",
  maximize: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  minimize: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  send: "M4 12l16-8-6 16-2.5-6.5L4 12z",
  archive: "M3 5h18v4H3zM5 9v11h14V9M10 13h4",
  duplicate: "M8 8h12v12H8zM4 16V4h12",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  key: "M15 9a3 3 0 1 0 0-.01M12.5 11.5L4 20M7 17l2 2M9 15l2 2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  wifiOff: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.5-2.5M19 13a10 10 0 0 0-3-2M2 9.5a15 15 0 0 1 4-2.5M22 9.5A15 15 0 0 0 11 6M12 20h.1",
  filter: "M4 5h16l-6 7v6l-4 2v-8z",
  vote: "M5 12l4 4 10-10",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

export function Icon({ n, s = 18, sw = 1.6, cls = "" }) {
  if (n === "dots") sw = 3.2;
  return html`<svg class=${cls} width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n] || P.dots} /></svg>`;
}

export const INTEREST_ICON = { food: "food", cafe: "cafe", nature: "leaf", culture: "temple", shopping: "bag", photo: "camera",
  adventure: "mountain", nightlife: "moon", relax: "wave" };
export const MODE_ICON = { walk: "walk", car: "car", motorbike: "bike", public: "bus", mixed: "route" };

export function Logo({ s = 20 }) {
  // lotus-star mark: five-point star inside a lotus outline
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20c-4.5 0-8-2.5-8-6 2.5 0 4.5 1 5.5 2.5C9 12 10 8.5 12 6c2 2.5 3 6 2.5 10.5 1-1.5 3-2.5 5.5-2.5 0 3.5-3.5 6-8 6z" />
    <path d="M12 9.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" fill="currentColor" stroke="none" />
  </svg>`;
}
