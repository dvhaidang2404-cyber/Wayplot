// Hand-drawn SVG vignettes of Vietnamese destinations (no external images).
import { html, useRef } from "./lib.js";

let counter = 0;
function useUid() {
  const r = useRef(null);
  if (!r.current) r.current = "sc" + (++counter);
  return r.current;
}
const stops = (arr) => arr.map(([o, c, a]) => html`<stop offset=${o} stop-color=${c} stop-opacity=${a == null ? 1 : a} />`);
const karst = (x, w, h, base) =>
  `M${x} ${base} C${x} ${base - h * 0.72} ${x + w * 0.14} ${base - h} ${x + w * 0.46} ${base - h} C${x + w * 0.82} ${base - h} ${x + w} ${base - h * 0.6} ${x + w} ${base} Z`;
const hill = (pts, base, W = 400) => `M0 ${base} ${pts.map(([x, y]) => `L${x} ${y}`).join(" ")} L${W} ${base} Z`;

function Sky({ u, c }) {
  return html`<defs>
      <linearGradient id=${u + "s"} x1="0" y1="0" x2="0" y2="1">${stops(c)}</linearGradient>
      <radialGradient id=${u + "g"} cx="0.5" cy="0.5" r="0.5">${stops([[0, "#FFE7B0", 0.95], [0.35, "#F6C67E", 0.55], [1, "#F6C67E", 0]])}</radialGradient>
      <linearGradient id=${u + "w"} x1="0" y1="0" x2="0" y2="1">${stops([[0, "#D98A55"], [0.35, "#7E2C33"], [1, "#2A0710"]])}</linearGradient>
    </defs>
    <rect width="400" height="260" fill=${`url(#${u}s)`} />`;
}
function Sun({ u, x, y, r = 24 }) {
  return html`<circle cx=${x} cy=${y} r=${r * 3.2} fill=${`url(#${u}g)`} /><circle cx=${x} cy=${y} r=${r} fill="#FCE6B6" />`;
}
function Glints({ x, y0, n = 6, w = 46 }) {
  return Array.from({ length: n }, (_, i) => html`<rect x=${x - (w - i * 6) / 2} y=${y0 + i * 9} width=${w - i * 6} height="2" rx="1" fill="#FCE1A8" opacity=${0.75 - i * 0.1} />`);
}

const SCENES = {
  halong: (u) => html`
    <${Sky} u=${u} c=${[[0, "#2B0710"], [0.42, "#6E1A2A"], [0.74, "#C2593F"], [1, "#F2B66B"]]} />
    <${Sun} u=${u} x=${250} y=${150} r=${24} />
    <path d=${karst(-10, 70, 46, 172) + karst(40, 50, 34, 172) + karst(300, 60, 40, 172) + karst(345, 70, 52, 172)} fill="#9A4A42" opacity=".55" />
    <path d=${karst(150, 46, 78, 174) + karst(188, 30, 50, 174) + karst(268, 40, 64, 174)} fill="#5E1A27" />
    <path d=${karst(-20, 90, 128, 178) + karst(52, 52, 86, 178) + karst(330, 90, 112, 178)} fill="#3A0A15" />
    <rect y="172" width="400" height="88" fill=${`url(#${u}w)`} />
    ${Glints({ x: 250, y0: 182 })}
    <g transform="translate(96 196)">
      <path d="M-30 18 Q0 28 34 16 L30 10 L-26 10 Z" fill="#2A0710" />
      <path d="M-14 10 L-14 -30 Q-2 -22 0 -8 Q-6 2 -14 10Z" fill="#C8102E" />
      <path d="M2 10 L2 -42 Q18 -30 20 -10 Q12 2 2 10Z" fill="#B30E29" />
      <path d="M-14 -20 H-4 M-14 -10 H-2 M2 -30 H14 M2 -18 H18 M2 -6 H16" stroke="#E9C27A" stroke-width=".8" />
    </g>
    <path d="M300 60 q4 -4 8 0 q4 -4 8 0 M330 48 q3 -3 6 0 q3 -3 6 0" stroke="#3A0A15" stroke-width="1.4" fill="none" />`,

  hoian: (u) => html`
    <${Sky} u=${u} c=${[[0, "#1E0A1F"], [0.4, "#4B1530"], [0.75, "#9B3B3B"], [1, "#E7A15E"]]} />
    <circle cx="320" cy="56" r="14" fill="#FBE3B0" opacity=".9" />
    ${[[0, 64, "#E5AE4C"], [64, 58, "#D9963A"], [122, 70, "#EDBC5A"], [192, 56, "#D48B36"], [248, 72, "#E5AE4C"], [320, 80, "#DA9C42"]].map(([x, w, c], i) => html`
      <g>
        <rect x=${x} y=${132 + (i % 2) * 8} width=${w} height=${74 - (i % 2) * 8} fill=${c} />
        <path d=${`M${x - 6} ${134 + (i % 2) * 8} L${x + 8} ${116 + (i % 2) * 8} L${x + w - 8} ${116 + (i % 2) * 8} L${x + w + 6} ${134 + (i % 2) * 8} Z`} fill="#6B1E1E" />
        <rect x=${x + 10} y=${150 + (i % 2) * 6} width="12" height="14" fill="#4A1512" opacity=".75" />
        <rect x=${x + w - 24} y=${150 + (i % 2) * 6} width="12" height="14" fill="#4A1512" opacity=".75" />
        <rect x=${x + w / 2 - 8} y="180" width="16" height="26" fill="#3A0E0E" opacity=".8" />
      </g>`)}
    <path d="M0 40 Q100 80 200 52 T400 46" stroke="#2A0A12" stroke-width="1" fill="none" />
    ${[[30, 58, "#C8102E"], [70, 68, "#E0A030"], [110, 70, "#C8102E"], [150, 62, "#B8934A"], [190, 54, "#C8102E"], [235, 56, "#E0A030"], [280, 60, "#C8102E"], [330, 52, "#E0A030"], [370, 48, "#C8102E"]].map(([x, y, c]) => html`
      <g><circle cx=${x} cy=${y + 9} r="14" fill=${c} opacity=".22" /><line x1=${x} y1=${y - 4} x2=${x} y2=${y} stroke="#2A0A12" />
      <ellipse cx=${x} cy=${y + 9} rx="7" ry="9" fill=${c} /><rect x=${x - 3} y=${y} width="6" height="2" fill="#3A0A10" /><rect x=${x - 3} y=${y + 17} width="6" height="2" fill="#3A0A10" /></g>`)}
    <rect y="206" width="400" height="54" fill="#2A0A16" />
    ${[[40, "#C8102E"], [120, "#E0A030"], [210, "#C8102E"], [300, "#E0A030"], [360, "#C8102E"]].map(([x, c]) => html`<g opacity=".8"><ellipse cx=${x} cy="230" rx="5" ry="3" fill=${c} /><ellipse cx=${x} cy="236" rx="16" ry="2" fill=${c} opacity=".35" /></g>`)}
    <path d="M150 222 q20 8 46 0 l-6 6 h-34z" fill="#140409" />`,

  hanoi: (u) => html`
    <${Sky} u=${u} c=${[[0, "#3E0A15"], [0.45, "#7A2433"], [0.78, "#D7885A"], [1, "#F4CC8A"]]} />
    <${Sun} u=${u} x=${300} y=${118} r=${20} />
    <path d=${hill([[0, 150], [20, 140], [40, 146], [60, 136], [90, 142], [120, 132], [150, 140], [190, 134], [230, 142], [270, 130], [310, 140], [350, 132], [380, 140], [400, 136]], 168)} fill="#5A1A26" opacity=".75" />
    <rect y="164" width="400" height="96" fill=${`url(#${u}w)`} />
    ${Glints({ x: 300, y0: 172, n: 5, w: 36 })}
    <ellipse cx="262" cy="196" rx="44" ry="7" fill="#2A0710" />
    <g fill="#4A1220" stroke="#D9B56B" stroke-width=".8">
      <rect x="246" y="168" width="32" height="26" /><rect x="251" y="152" width="22" height="16" /><rect x="256" y="140" width="12" height="12" />
      <path d="M242 170 h40 l-4 -5 h-32z M248 154 h28 l-3 -4 h-22z M253 142 h18 l-3 -4 h-12z" fill="#2A0710" />
    </g>
    <path d="M254 194 v-12 a4 4 0 0 1 8 0 v12 M266 194 v-12 a4 4 0 0 1 8 0 v12" fill="#2A0710" />
    <path d="M10 196 Q80 160 160 196" stroke="#C8102E" stroke-width="5" fill="none" />
    ${[24, 48, 72, 96, 120, 144].map((x) => html`<line x1=${x} y1=${196 - Math.sin(((x - 10) / 150) * Math.PI) * 34} x2=${x} y2="200" stroke="#9E0D26" stroke-width="2" />`)}
    <path d="M0 0 C30 10 40 50 36 100 M14 0 C40 20 46 60 50 110 M30 0 C54 24 62 54 64 96" stroke="#3A0A15" stroke-width="1.6" fill="none" opacity=".9" />
    <path d="M0 0 h80 c-10 18 -40 22 -80 30z" fill="#3A0A15" />`,

  danang: (u) => html`
    <${Sky} u=${u} c=${[[0, "#3E0A15"], [0.45, "#8E2A35"], [0.75, "#E39A5B"], [1, "#F7D49A"]]} />
    <${Sun} u=${u} x=${200} y=${132} r=${22} />
    <path d=${hill([[0, 112], [30, 96], [60, 104], [90, 120], [120, 150], [140, 160]], 160, 140)} fill="#4A1220" />
    <path d=${hill([[300, 160], [320, 140], [336, 146], [352, 128], [370, 138], [400, 130]], 160)} fill="#6B2230" opacity=".8" />
    <rect y="158" width="400" height="58" fill=${`url(#${u}w)`} />
    ${Glints({ x: 200, y0: 164, n: 4, w: 40 })}
    <path d="M90 172 C120 140 150 140 180 172 S240 204 270 172 S330 140 370 172" stroke="#D9B56B" stroke-width="4" fill="none" />
    <line x1="80" y1="174" x2="380" y2="174" stroke="#2A0710" stroke-width="3" />
    <path d="M362 172 l12 -8 l6 4 l-8 6" fill="#D9B56B" />
    <path d="M0 214 Q100 206 200 214 T400 212 V260 H0Z" fill="#E7BF85" />
    <path d="M0 214 Q100 206 200 214 T400 212" stroke="#FBF3EA" stroke-width="2" fill="none" opacity=".8" />
    <path d="M330 260 C326 230 332 206 344 186" stroke="#3A0A15" stroke-width="4" fill="none" />
    <path d="M344 186 q-26 -6 -40 6 M344 186 q-10 -20 -30 -22 M344 186 q8 -22 30 -22 M344 186 q24 -4 36 10 M344 186 q2 12 -4 26" stroke="#3A0A15" stroke-width="4" fill="none" stroke-linecap="round" />`,

  hue: (u) => html`
    <${Sky} u=${u} c=${[[0, "#2E0A14"], [0.42, "#6E1D2B"], [0.75, "#C86A45"], [1, "#F0BC78"]]} />
    <${Sun} u=${u} x=${86} y=${110} r=${18} />
    <rect x="50" y="160" width="300" height="50" fill="#6B1E22" />
    <path d="M50 160 h300" stroke="#D9B56B" stroke-width="1.5" />
    <path d="M150 210 v-22 a10 10 0 0 1 20 0 v22z M190 210 v-28 a10 10 0 0 1 20 0 v28z M230 210 v-22 a10 10 0 0 1 20 0 v22z" fill="#2A0710" />
    <g fill="#3A0A12" stroke="#D9B56B" stroke-width="1">
      <path d="M108 160 L120 140 H280 L292 160 Z" />
      <rect x="132" y="128" width="136" height="12" fill="#8A2A2A" />
      <path d="M124 128 Q120 118 112 118 L140 108 H260 L288 118 Q280 118 276 128 Z" />
      <rect x="160" y="98" width="80" height="10" fill="#8A2A2A" />
      <path d="M152 98 Q148 90 142 90 L166 80 H234 L258 90 Q252 90 248 98 Z" />
    </g>
    <rect y="210" width="400" height="50" fill=${`url(#${u}w)`} />
    ${Glints({ x: 86, y0: 216, n: 4, w: 30 })}
    <path d="M280 236 q30 10 70 0 l-8 6 h-54z" fill="#140409" /><path d="M300 236 v-14 l14 12z" fill="#C8102E" />`,

  dalat: (u) => html`
    <${Sky} u=${u} c=${[[0, "#4B1A2A"], [0.45, "#A15B4F"], [0.78, "#E6B488"], [1, "#F4DDB8"]]} />
    <path d=${hill([[0, 120], [60, 100], [120, 118], [180, 96], [240, 110], [300, 92], [360, 108], [400, 100]], 170)} fill="#8E4A4A" opacity=".5" />
    ${Array.from({ length: 22 }, (_, i) => { const x = i * 19 + 4, y = 140 + Math.sin(i * 1.3) * 8; return html`<path d=${`M${x} ${y + 30} L${x + 7} ${y} L${x + 14} ${y + 30} Z`} fill="#4A1A24" />`; })}
    <rect y="168" width="400" height="44" fill=${`url(#${u}w)`} opacity=".9" />
    <ellipse cx="200" cy="150" rx="240" ry="14" fill="#FBF3EA" opacity=".18" />
    <path d=${hill([[0, 214], [80, 206], [160, 216], [260, 204], [400, 212]], 260)} fill="#3A0A15" />
    ${[[40, 230], [70, 240], [100, 226], [300, 232], [330, 244], [362, 228], [384, 240], [130, 246]].map(([x, y]) => html`
      <g transform=${`translate(${x} ${y})`}>
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => html`<ellipse rx="2.4" ry="6" transform=${`rotate(${a}) translate(0 -6)`} fill="#F2C230" />`)}
        <circle r="3.2" fill="#8A4A1A" />
      </g>`)}`,

  hcm: (u) => html`
    <${Sky} u=${u} c=${[[0, "#2A0812"], [0.42, "#5E1828"], [0.76, "#B4523F"], [1, "#EFAE6A"]]} />
    <${Sun} u=${u} x=${90} y=${150} r=${18} />
    <g fill="#3A0A15">
      ${[[0, 40, 60], [36, 30, 80], [62, 34, 54], [100, 26, 96], [196, 30, 70], [230, 40, 88], [272, 28, 62], [312, 36, 104], [350, 50, 74]].map(([x, w, h]) => html`<rect x=${x} y=${180 - h} width=${w} height=${h} />`)}
      <path d="M140 180 L146 64 Q150 52 154 64 L158 96 Q170 100 160 106 L164 180 Z" />
      <path d="M176 180 V60 h8 V40 h6 V22 h4 V40 h6 V60 h8 V180 Z" fill="#2A0710" />
    </g>
    ${Array.from({ length: 40 }, (_, i) => html`<rect x=${(i * 37) % 380 + 6} y=${110 + ((i * 23) % 60)} width="2" height="3" fill="#F6C67E" opacity=".7" />`)}
    <rect y="180" width="400" height="80" fill=${`url(#${u}w)`} />
    ${Glints({ x: 90, y0: 188, n: 5, w: 30 })}
    <path d="M220 214 q30 12 80 0 l-8 8 h-62z" fill="#140409" /><rect x="244" y="204" width="28" height="10" fill="#140409" />`,

  sapa: (u) => html`
    <${Sky} u=${u} c=${[[0, "#5A1E2A"], [0.45, "#B3644F"], [0.78, "#EDBE86"], [1, "#F7DFB5"]]} />
    <${Sun} u=${u} x=${300} y=${70} r=${16} />
    <path d=${hill([[0, 92], [50, 60], [110, 86], [170, 50], [230, 84], [290, 58], [350, 90], [400, 70]], 150)} fill="#7E3A3E" opacity=".55" />
    <path d=${hill([[0, 120], [70, 96], [140, 120], [210, 100], [290, 124], [360, 104], [400, 116]], 170)} fill="#5A2030" opacity=".8" />
    ${["#D8B866", "#B89A48", "#C9A24E", "#9E8A3E", "#D2AE5A", "#A8893E", "#C6A452"].map((c, i) => html`
      <path d=${`M0 ${150 + i * 16} C 80 ${130 + i * 16} 160 ${168 + i * 16} 240 ${148 + i * 16} S 360 ${136 + i * 16} 400 ${150 + i * 16} V260 H0Z`} fill=${c} />
      <path d=${`M0 ${150 + i * 16} C 80 ${130 + i * 16} 160 ${168 + i * 16} 240 ${148 + i * 16} S 360 ${136 + i * 16} 400 ${150 + i * 16}`} stroke="#6B4A1E" stroke-width=".8" fill="none" opacity=".6" />`)}
    <ellipse cx="120" cy="140" rx="200" ry="10" fill="#FBF3EA" opacity=".22" />
    <path d="M318 196 l8 -12 l8 12z" fill="#3A0A15" /><rect x="320" y="196" width="12" height="8" fill="#3A0A15" />`,
};

export const SCENE_IDS = Object.keys(SCENES);

export function Scene({ id, label }) {
  const u = useUid();
  const draw = SCENES[id] || SCENES.halong;
  return html`<svg class="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role=${label ? "img" : "presentation"} aria-label=${label || null} aria-hidden=${label ? null : "true"}>${draw(u)}</svg>`;
}

export function Backdrop({ id }) {
  return html`<div class="backdrop" aria-hidden="true"><${Scene} id=${id} /></div>`;
}

/** Hero poster: travel-poster composition with red silk ribbon and a yellow star. */
export function Poster() {
  const u = useUid();
  return html`<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Wayplot">
    <defs>
      <linearGradient id=${u + "bg"} x1="0" y1="0" x2="0" y2="1">${stops([[0, "#3E0A15"], [0.5, "#7A1C2C"], [0.8, "#C9673F"], [1, "#F0B46A"]])}</linearGradient>
      <radialGradient id=${u + "sun"} cx=".5" cy=".5" r=".5">${stops([[0, "#FCE6B6"], [0.6, "#E9BE72"], [1, "#D9A350"]])}</radialGradient>
      <linearGradient id=${u + "silk"} x1="0" y1="0" x2="1" y2="1">${stops([[0, "#E0233F"], [0.5, "#C8102E"], [1, "#7E0A1E"]])}</linearGradient>
      <linearGradient id=${u + "sea"} x1="0" y1="0" x2="0" y2="1">${stops([[0, "#C67A4C"], [1, "#2A0710"]])}</linearGradient>
    </defs>
    <rect width="400" height="500" fill=${`url(#${u}bg)`} />
    ${[150, 120, 92].map((r, i) => html`<circle cx="200" cy="230" r=${r} fill="none" stroke="#D9B56B" stroke-opacity=${0.12 + i * 0.08} />`)}
    <circle cx="200" cy="230" r="70" fill=${`url(#${u}sun)`} />
    <path d="M200 112 l7.6 15.4 17 2.5 -12.3 12 2.9 16.9 -15.2 -8 -15.2 8 2.9 -16.9 -12.3 -12 17 -2.5z" fill="#F2C94C" />
    <path d=${karst(10, 90, 150, 330) + karst(80, 60, 96, 330) + karst(280, 70, 120, 330) + karst(330, 80, 170, 330)} fill="#4A0E1C" />
    <path d=${karst(140, 50, 60, 334) + karst(230, 46, 70, 334)} fill="#5E1A27" opacity=".9" />
    <rect y="328" width="400" height="172" fill=${`url(#${u}sea)`} />
    ${Array.from({ length: 6 }, (_, i) => html`<rect x=${200 - (60 - i * 8) / 2} y=${342 + i * 12} width=${60 - i * 8} height="2.5" rx="1" fill="#FCE1A8" opacity=${0.7 - i * 0.1} />`)}
    <path d="M-20 300 C60 250 120 360 210 300 S340 220 420 270 L420 300 C340 250 290 330 210 330 S70 290 -20 330 Z" fill=${`url(#${u}silk)`} opacity=".95" />
    <path d="M-20 300 C60 250 120 360 210 300 S340 220 420 270" stroke="#F6B2BC" stroke-opacity=".5" stroke-width="1.2" fill="none" />
    <g transform="translate(200 440)" fill="#D9B56B" stroke="#3E0A15" stroke-width=".8">
      <path d="M0 -34 C14 -20 14 -4 0 8 C-14 -4 -14 -20 0 -34Z" />
      <path d="M-4 6 C-24 2 -34 -14 -34 -24 C-18 -22 -8 -12 -4 6Z" /><path d="M4 6 C24 2 34 -14 34 -24 C18 -22 8 -12 4 6Z" />
      <path d="M-6 8 C-30 12 -46 4 -52 -4 C-36 -10 -16 -4 -6 8Z" opacity=".85" /><path d="M6 8 C30 12 46 4 52 -4 C36 -10 16 -4 6 8Z" opacity=".85" />
    </g>
    <rect x="14" y="14" width="372" height="472" rx="10" fill="none" stroke="#D9B56B" stroke-opacity=".7" />
    <text x="200" y="64" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="30" font-weight="700" letter-spacing="10" fill="#E9CD8F">WAYPLOT</text>
    <text x="200" y="88" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="10" letter-spacing="6" fill="#FBF3EA" fill-opacity=".8">VIỆT NAM</text>
  </svg>`;
}

/** Decorative silk ribbon for big burgundy blocks */
export function Silk() {
  const u = useUid();
  return html`<svg class="silk" viewBox="0 0 600 200" preserveAspectRatio="none" style="right:-40px;bottom:-30px;width:70%;height:70%" aria-hidden="true">
    <defs><linearGradient id=${u} x1="0" y1="0" x2="1" y2="0">${stops([[0, "#C8102E", 0], [0.4, "#C8102E", 0.6], [1, "#E0233F", 0.9]])}</linearGradient></defs>
    <path d="M0 150 C120 60 220 200 340 120 S520 40 600 90 L600 120 C520 80 450 170 340 160 S120 120 0 180Z" fill=${`url(#${u})`} />
  </svg>`;
}
