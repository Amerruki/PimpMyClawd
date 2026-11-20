import { BUBBLE, clump, dot, leaf, ridge, sparkle } from './eco-parts'
import type { Clump } from './eco-parts'
import { layer, n, seeded, svg } from './kit'
import type { Pt } from './kit'
import type { Look } from './look'
import { makeColors } from './make-colors.js'

// Frutiger Eco, seen from low in a meadow: a glossy clipped shrub beaded
// with dew rounds up in each side gutter, broad leaves reach in from the top corner,
// soap bubbles and yellow-green bokeh float between, and behind them a blue
// sky melts into a sunlit green-white haze over one smooth far hill, where
// three slender turbines turn slowly on the ridge. Night is the same meadow
// under the moon, deep green and teal, with dew glowing and fireflies.
const { theme, problems } = makeColors({
  label: 'Aero Eco',
  roles: { accent: '#4a9c1f', danger: '#cc3a33', success: '#1f8f6a', warning: '#d6a414', pro: '#1a9aa8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e5f1e1',
        'surface-1': '#edf6ea',
        'surface-2': '#f6faf4',
        'text-primary': '#14301a',
        'text-secondary': '#2d4a32',
        'text-muted': '#46634b',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0c1a12',
        'surface-1': '#112218',
        'surface-2': '#162a1e',
        'surface-3': '#1b3224',
        'text-primary': '#e6f3e6',
        'text-secondary': '#c0d6c0',
        'text-muted': '#98b29a',
      },
    },
  },
})

const SUN: Pt = [300, 165]

// A gradient stop whose colour is the CSS variable --c, so one gradient
// serves day and night.
const st = (o: number, c: string, a?: number): string => `<stop offset="${o}" style="stop-color:var(--${c})${a === undefined ? '' : `;stop-opacity:${a}`}"/>`
const lin = (id: string, stops: string, attrs = 'x1="0" y1="0" x2="0" y2="1"'): string => `<linearGradient id="${id}" ${attrs}>${stops}</linearGradient>`
const rad = (id: string, stops: string, attrs = ''): string => `<radialGradient id="${id}" ${attrs}>${stops}</radialGradient>`

// ---- Ground: one smooth far hill, peaking right of centre where the
// turbines stand, and the near meadow, out of focus at the bottom. ----
const yHill = (x: number) => 690 - 46 * Math.exp(-(((x - 1330) / 360) ** 2)) - 20 * Math.exp(-(((x - 230) / 300) ** 2)) + 5 * Math.sin(x / 150)
const yMeadow = (x: number) => 868 + 16 * Math.sin(x / 260 + 0.6) + 8 * Math.sin(x / 97)
const HILL = ridge(yHill)
const MEADOW = ridge(yMeadow)

// Fine blades along the meadow's edge, in two tones.
function fringe(seed: number, count: number, hMin: number, hMax: number): string {
  const r = seeded(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = -20 + r() * 1640
    const y = yMeadow(x) + 4
    const h = hMin + r() * (hMax - hMin)
    const lean = (r() - 0.5) * h * 0.6
    const w = 1.6 + r() * 2
    d += `M${n(x - w)} ${n(y)}Q${n(x + lean * 0.3)} ${n(y - h * 0.6)} ${n(x + lean)} ${n(y - h)}Q${n(x + lean * 0.3 + w * 0.6)} ${n(y - h * 0.5)} ${n(x + w)} ${n(y)}Z`
  }

  return d
}

const FRINGE = `<path d="${fringe(5, 150, 10, 34)}" class="fr0"/><path d="${fringe(9, 110, 8, 26)}" class="fr1"/>`

// ---- Turbines: three slender, distant ones on the ridge. ----
function turbine(x: number, h: number, dur: number, delay: number): string {
  const y = yHill(x) + 3
  const L = h * 0.42
  const bladeD = [0, 120, 240]
    .map(a => {
      const rad = ((a - 90) * Math.PI) / 180
      const c = Math.cos(rad)
      const s = Math.sin(rad)
      const p = (u: number, v: number) => `${n(c * u - s * v)} ${n(s * u + c * v)}`

      return `M${p(0, -0.9)}L${p(L * 0.25, -1.1)}L${p(L, -0.15)}L${p(L, 0.1)}L${p(0, 0.9)}Z`
    })
    .join('')

  return (
    `<g transform="translate(${n(x)} ${n(y)})">` +
    `<path d="M-1.3 0L-0.5 ${n(-h)}L0.5 ${n(-h)}L1.3 0Z" class="tb"/>` +
    `<rect x="-1.2" y="${n(-h - 1.3)}" width="4.4" height="2.4" rx="1.1" class="tb"/>` +
    `<g transform="translate(0 ${n(-h)})"><g class="rotor" style="animation-duration:${dur}s;animation-delay:-${delay}s"><path d="${bladeD}" class="tb"/></g><circle r="1.1" class="tb"/></g>` +
    `</g>`
  )
}

const TURBINES = `<g class="tbs">${turbine(1160, 44, 19, 3) + turbine(1222, 56, 22, 11) + turbine(1288, 40, 17, 6)}</g>`

// ---- Clouds: soft cumulus of overlapping gradient blobs, a few cooler
// ones for the shaded base. ----
function cloud(cx: number, cy: number, w: number, h: number, seed: number): string {
  const r = seeded(seed)
  let lo = ''
  let hi = ''
  for (let i = 0; i < 4; i++) {
    const x = cx + (r() - 0.5) * w * 0.8
    lo += `<ellipse cx="${n(x)}" cy="${n(cy + h * 0.22)}" rx="${n(w * (0.2 + r() * 0.12))}" ry="${n(h * 0.3)}" fill="url(#eco-cl-lo)"/>`
  }
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9 - 0.5
    const bulge = 1 - Math.abs(u) * 1.6
    const rr = h * (0.32 + bulge * 0.3 + r() * 0.12)
    hi += `<circle cx="${n(cx + u * w * 0.9)}" cy="${n(cy - bulge * h * 0.28 + r() * h * 0.12)}" r="${n(rr)}" fill="url(#eco-cl)"/>`
  }

  return lo + hi
}

const CLOUDS =
  `<g class="clouds"><g class="drift">${cloud(160, 400, 330, 96, 3)}${cloud(780, 118, 300, 70, 7)}</g>` +
  `<g class="drift slow">${cloud(1170, 330, 240, 64, 13)}</g></g>`

// ---- Sun, rays and flare by day, moon and stars by night. ----
const RAYS = (() => {
  let d = ''
  for (let i = 0; i < 9; i++) {
    const a = ((6 + i * 13 + (i % 3) * 3) * Math.PI) / 180
    const sp = 0.012 + (i % 3) * 0.008
    const R = 1500
    d += `M${SUN[0]} ${SUN[1]}L${n(SUN[0] + R * Math.cos(a - sp))} ${n(SUN[1] + R * Math.sin(a - sp))}L${n(SUN[0] + R * Math.cos(a + sp))} ${n(SUN[1] + R * Math.sin(a + sp))}Z`
  }

  return d
})()

const FLARE = [
  [0.42, 22, 0.1],
  [0.62, 10, 0.16],
  [0.9, 44, 0.07],
  [1.25, 16, 0.12],
]
  .map(([t, r, o]) => {
    const x = SUN[0] + (800 - SUN[0]) * t! * 2
    const y = SUN[1] + (520 - SUN[1]) * t! * 2

    return `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="#f6ffd0" fill-opacity="${o}"/>`
  })
  .join('')

const SKY_DAY =
  `<g class="day">` +
  `<g class="rays"><path d="${RAYS}" fill="url(#eco-ray)"/></g>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="130" fill="url(#eco-disc)" class="sunp"/>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="30" fill="#fff"/>` +
  FLARE +
  `</g>`

const sr = seeded(41)
let STAR_D = ''
for (let i = 0; i < 70; i++) STAR_D += dot(sr() * 1600, 50 + sr() * 520, 0.5 + sr() * 0.9)
const TWINKLES = [[150, 120], [520, 90], [980, 70], [1180, 210], [1500, 140], [700, 260]]
  .map(([x, y], i) => `<g transform="translate(${x} ${y})"><path d="${sparkle(5)}" class="tw" style="animation-duration:${5 + (i % 3)}s;animation-delay:-${i * 1.7}s"/></g>`)
  .join('')

const SKY_NIGHT =
  `<g class="night">` +
  `<path d="${STAR_D}" fill="#e8fff6" fill-opacity=".7"/>${TWINKLES}` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="150" fill="url(#eco-halo)"/>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="34" fill="url(#eco-moon)"/>` +
  `</g>`

// ---- A clipped shrub in each gutter: a few big rounded clumps, the back
// ones in shade, dew beaded on the front ones. ----
type Shrub = { back: Clump[]; front: Clump[]; dew: [number, number, number][]; bug?: Pt }

const SHRUBS: Shrub[] = [
  {
    back: [
      { cx: 60, cy: 704, rx: 156, ry: 126 },
      { cx: 262, cy: 728, rx: 140, ry: 114 },
    ],
    front: [
      { cx: 170, cy: 884, rx: 224, ry: 192 },
      { cx: 336, cy: 934, rx: 100, ry: 86 },
    ],
    dew: [[92, 748, 7], [176, 722, 5], [240, 752, 6], [300, 806, 5], [44, 790, 5], [150, 860, 4.5], [350, 886, 4.5]],
    bug: [206, 756],
  },
  {
    back: [
      { cx: 1540, cy: 712, rx: 150, ry: 124 },
      { cx: 1344, cy: 744, rx: 136, ry: 112 },
    ],
    front: [
      { cx: 1430, cy: 884, rx: 220, ry: 188 },
      { cx: 1268, cy: 936, rx: 96, ry: 82 },
    ],
    dew: [[1380, 750, 6], [1462, 724, 5], [1530, 760, 6.5], [1300, 816, 5], [1480, 850, 4.5], [1262, 890, 4.5]],
  },
]

// A ladybird resting on the shrub, facing up the slope of its clump.
const ladybird = (p: Pt, a: number): string =>
  `<g transform="translate(${n(p[0])} ${n(p[1])}) rotate(${n(a + 90)}) scale(2.2)">` +
  `<ellipse cy="-6" rx="3.6" ry="3" fill="#141414"/>` +
  `<ellipse rx="6.4" ry="7.4" fill="url(#eco-bug)"/>` +
  `<path d="M0 -6.6V7.2${dot(-3, -1.5, 1.2)}${dot(3, -1.5, 1.2)}${dot(-2.6, 3, 1.1)}${dot(2.6, 3, 1.1)}" fill="#141414" stroke="#141414" stroke-width=".7"/>` +
  `<ellipse cx="-2.4" cy="-3.4" rx="1.8" ry="1.1" fill="#fff" fill-opacity=".75"/>` +
  `</g>`

function shrub(sh: Shrub, side: 1 | -1, seed: number): string {
  const o = `transform-origin:${side === 1 ? 200 : 1400}px 1010px`
  const draw = (cs: Clump[], paint: string) =>
    cs
      .map((c, i) => {
        const s = clump(c, seed + i * 7)

        return `<path d="${s.body}" fill="url(#${paint})"/><path d="${s.gloss}" fill="url(#eco-bu-gl)" class="bgl"/>`
      })
      .join('')
  const drops =
    sh.dew.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${n(r * 1.25)}" fill="url(#eco-dew)"/>`).join('') +
    `<path d="${sh.dew.map(([x, y, r]) => dot(x - r * 0.45, y - r * 0.48, r * 0.32)).join('')}" fill="#fff"/>`
  const glow = `<g class="night">${sh.dew.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${n(r * 3.4)}" fill="url(#eco-dglow)"/>`).join('')}</g>`
  const sparks = sh.dew
    .filter((_, i) => i % 3 === 1)
    .map(([x, y], i) => `<g transform="translate(${x - 2} ${y - 3})"><path d="${sparkle(9)}" class="spk" style="animation-duration:${7 + i}s;animation-delay:-${n(i * 2.3 + seed * 0.1)}s"/></g>`)
    .join('')

  return (
    `<g class="sway" style="${o};animation-duration:14s">${draw(sh.back, 'eco-bu-b')}</g>` +
    `<g class="sway" style="${o};animation-duration:11s;animation-delay:-4s">${draw(sh.front, 'eco-bu')}${glow}${drops}${sparks}${sh.bug ? ladybird(sh.bug, -100) : ''}</g>`
  )
}

// ---- Broad leaves reaching in from the top right corner, one tip holding
// a water drop about to fall. ----
const LEAVES = [
  { x: 1620, y: 40, a: 150, L: 430, W: 170 },
  { x: 1610, y: 10, a: 124, L: 340, W: 140 },
  { x: 1640, y: 120, a: 176, L: 330, W: 132 },
  { x: 1560, y: -20, a: 100, L: 260, W: 110 },
]

const LEAF_GROUP = (() => {
  const stem = `<path d="M1700 -40Q1650 0 1620 40M1700 -40Q1640 -10 1610 10M1700 -40Q1680 60 1640 120M1700 -40Q1600 -40 1560 -20" class="stem"/>`
  const leaves = LEAVES.map(l => {
    const s = leaf(l.L, l.W)

    return (
      `<g transform="translate(${l.x} ${l.y}) rotate(${l.a})">` +
      `<path d="${s.body}" fill="url(#eco-leaf)"/><path d="${s.gloss}" class="lgloss"/><path d="${s.veins}" class="vein"/>` +
      `</g>`
    )
  }).join('')
  const top = LEAVES[0]!
  const rad = (top.a * Math.PI) / 180
  const tip: Pt = [top.x + Math.cos(rad) * top.L, top.y + Math.sin(rad) * top.L]
  const drop =
    `<g transform="translate(${n(tip[0])} ${n(tip[1] + 1)})"><g class="hang">` +
    `<path d="M0 0C2 4 6.5 8 6.5 12.5A6.5 6.5 0 0 1 -6.5 12.5C-6.5 8 -2 4 0 0Z" fill="url(#eco-dew)"/>` +
    `<ellipse cx="-2.2" cy="10" rx="1.6" ry="2.2" fill="#fff"/>` +
    `</g></g>`

  return `<g class="leafsway">${stem}${leaves}${drop}</g>`
})()

// ---- Bubbles and bokeh floating between. ----
const BUBBLES = [
  { x: 330, y: 760, r: 46, d: 46, w: 26, delay: 0 },
  { x: 160, y: 900, r: 30, d: 38, w: -20, delay: 14 },
  { x: 430, y: 880, r: 20, d: 34, w: 16, delay: 26 },
  { x: 1300, y: 820, r: 40, d: 50, w: -24, delay: 8 },
  { x: 1180, y: 920, r: 24, d: 36, w: 18, delay: 22 },
  { x: 1480, y: 900, r: 33, d: 42, w: -16, delay: 32 },
  { x: 250, y: 940, r: 16, d: 30, w: 14, delay: 6 },
]
  .map(
    b =>
      `<g transform="translate(${b.x} ${b.y})"><g class="bub" style="animation-duration:${b.d}s;animation-delay:-${b.delay}s;--w:${b.w}px">` +
      `<use href="#eco-bub" transform="scale(${n(b.r / 50)})"/></g></g>`,
  )
  .join('')

const br = seeded(19)
const BOKEH = Array.from({ length: 20 }, (_, i) => {
  const left = i % 2 === 0
  const mid = i % 7 === 3
  const x = mid ? 560 + br() * 480 : left ? 20 + br() * 440 : 1140 + br() * 440
  const y = mid ? 90 + br() * 260 : 160 + br() * 700
  const r = mid ? 14 + br() * 18 : 14 + br() * 46

  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#eco-bk${i % 3 === 0 ? 'w' : 'y'})" class="bk" style="animation-duration:${n(11 + br() * 9)}s;animation-delay:-${n(br() * 20)}s"/>`
}).join('')

// ---- A butterfly drifting over the left meadow. ----
const BUTTERFLY =
  `<g><g transform="rotate(-12) scale(2.2)">` +
  `<g class="wing-l"><path d="M0 0C-6 -14 -20 -18 -20 -8C-20 -2 -10 0 0 0ZM0 0C-10 2 -16 8 -12 13C-8 16 -2 8 0 0Z" fill="url(#eco-wing)"/></g>` +
  `<g class="wing-r"><path d="M0 0C6 -14 20 -18 20 -8C20 -2 10 0 0 0ZM0 0C10 2 16 8 12 13C8 16 2 8 0 0Z" fill="url(#eco-wing)"/></g>` +
  `<path d="M0 -4V7" stroke="#5a5a2a" stroke-width="1.4" stroke-linecap="round"/>` +
  `</g>` +
  `<animateMotion dur="48s" repeatCount="indefinite" path="M120 560C220 460 380 520 420 420S300 260 200 330S40 520 120 560Z"/>` +
  `</g>`

// ---- Fireflies by night, in the gutters, fading slowly in and out. ----
const fr = seeded(77)
const FIREFLIES = Array.from({ length: 14 }, (_, i) => {
  const x = i % 2 === 0 ? 40 + fr() * 420 : 1140 + fr() * 420
  const y = 470 + fr() * 420

  return `<g transform="translate(${n(x)} ${n(y)})"><g class="ff" style="animation-duration:${n(8 + fr() * 6)}s;animation-delay:-${n(fr() * 12)}s"><circle r="22" fill="url(#eco-ff)"/><circle r="2" fill="#f4ffc8"/></g></g>`
}).join('')

const CSS = `
.night { display: none; }
:root, svg {
  --sky0:#1f7ad6; --sky1:#52b0ee; --sky2:#b4e8e4; --sky3:#f2ffd6; --sky4:#d6f4ae;
  --haze:#f6ffde; --cl:#ffffff; --cl-lo:#bcd8e8; --cl-op:.95;
  --hill0:#c4ef74; --hill1:#7cc83a; --hill2:#459f26; --crest:#f8ffd8;
  --mdw0:#8ad446; --mdw1:#3f9a26; --mdw2:#24761c; --fr0:#2f8a22; --fr1:#b8ec6a;
  --bu0:#b8ee5c; --bu1:#4eae2a; --bu2:#1f7a22; --bu3:#0c4414;
  --bb0:#7cc844; --bb1:#2f8a26; --bb2:#17561a; --bb3:#08300e;
  --bgl:#fbffe8; --bgl-op:.8;
  --hi:#f6ffdc; --hi-op:.55;
  --dew0:#ffffff; --dew1:#d8ffd0; --dew2:#3f9a2a;
  --leaf0:#c8f264; --leaf1:#6cc22a; --leaf2:#2c7e1c; --vein:#e8ffb8;
  --bk-y:#f0ff8a; --bk-w:#ffffff; --bk-op:1;
  --tb:#e9f2f4; --tb-op:.95; --sheen-op:1; --bub-op:1;
  --wing0:#f6ffb0; --wing1:#c8ec5a;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --sky0:#03101e; --sky1:#082236; --sky2:#0e3a46; --sky3:#1c5a50; --sky4:#123c30;
    --haze:#4a9a8a; --cl:#7aa8b8; --cl-lo:#1a3448; --cl-op:.28;
    --hill0:#2f6e50; --hill1:#17452f; --hill2:#0b2a1d; --crest:#9ad8c8;
    --mdw0:#164a30; --mdw1:#0a2a1a; --mdw2:#06190f; --fr0:#06200f; --fr1:#2e6a52;
    --bu0:#3c8e72; --bu1:#1a5a40; --bu2:#0c3424; --bu3:#04160c;
    --bb0:#2a6a54; --bb1:#124230; --bb2:#08261a; --bb3:#020c06;
    --bgl:#c8f4ff; --bgl-op:.32;
    --hi:#bff0ff; --hi-op:.28;
    --dew0:#eafff4; --dew1:#9cf2d4; --dew2:#1a6a58;
    --leaf0:#2e7a5a; --leaf1:#14472f; --leaf2:#082a1a; --vein:#8ad8c0;
    --bk-y:#a8f0a0; --bk-w:#a0e8ff; --bk-op:.35;
    --tb:#9ab8c4; --tb-op:.6; --sheen-op:.25; --bub-op:.5;
    --wing0:#cfe8d8; --wing1:#6aa890;
  }
  .day { display: none; } .night { display: inline; }
}
.clouds { opacity: var(--cl-op); }
.drift { animation: drift2 110s ease-in-out infinite alternate; }
.drift.slow { animation-duration: 150s; animation-direction: alternate-reverse; }
@keyframes drift2 { from { transform: translateX(-50px); } to { transform: translateX(60px); } }
.rays { opacity: .32; animation: rays 16s ease-in-out infinite alternate; transform-origin: ${SUN[0]}px ${SUN[1]}px; }
@keyframes rays { from { opacity: .22; transform: rotate(-1.5deg); } to { opacity: .4; transform: rotate(1.5deg); } }
.sunp { animation: sunp 10s ease-in-out infinite; transform-origin: ${SUN[0]}px ${SUN[1]}px; }
@keyframes sunp { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.94); opacity: .8; } }
.tw { fill: #fff; animation: twinkle ease-in-out infinite; }
.tbs { opacity: var(--tb-op); } .tb { fill: var(--tb); }
.rotor { animation: spin linear infinite; }
.crest { fill: none; stroke: var(--crest); stroke-opacity: .7; stroke-width: 4; stroke-linecap: round; }
.sheen { opacity: var(--sheen-op); animation: sheen 40s ease-in-out infinite alternate; }
@keyframes sheen { from { transform: translateX(-260px); } to { transform: translateX(300px); } }
.fr0 { fill: var(--fr0); fill-opacity: .7; } .fr1 { fill: var(--fr1); fill-opacity: .45; }
.sway { animation: sway ease-in-out infinite alternate; }
@keyframes sway { from { transform: rotate(-.5deg); } to { transform: rotate(.6deg); } }
.bgl { opacity: var(--bgl-op); }
.spk { fill: #fff; opacity: 0; animation: spk ease-in-out infinite; }
@keyframes spk { 0%, 55%, 100% { opacity: 0; transform: scale(.4); } 75% { opacity: .95; transform: scale(1); } }
.stem { fill: none; stroke: var(--leaf2); stroke-width: 5; stroke-linecap: round; }
.lgloss { fill: var(--hi); fill-opacity: calc(var(--hi-op) * .9); }
.vein { fill: none; stroke: var(--vein); stroke-opacity: .45; stroke-width: 1.4; stroke-linecap: round; }
.leafsway { transform-origin: 1680px -20px; animation: leafsway 9s ease-in-out infinite alternate; }
@keyframes leafsway { from { transform: rotate(-1.4deg); } to { transform: rotate(1.4deg); } }
.hang { animation: hang 5s ease-in-out infinite alternate; }
@keyframes hang { from { transform: scale(1, 1); } to { transform: scale(1.06, 1.2); } }
.bubs { opacity: var(--bub-op); }
.bub { animation: bub linear infinite; }
@keyframes bub {
  0% { transform: translate(0, 0) scale(.9, .9); opacity: 0; }
  10% { opacity: 1; }
  30% { transform: translate(var(--w), -200px) scale(1.03, .97); }
  55% { transform: translate(0, -380px) scale(.97, 1.03); }
  80% { transform: translate(calc(var(--w) * -1), -560px) scale(1.02, .98); opacity: 1; }
  100% { transform: translate(0, -720px) scale(1, 1); opacity: 0; }
}
.bks { opacity: var(--bk-op); }
.bk { animation: bk ease-in-out infinite alternate; }
@keyframes bk { from { transform: translate(-16px, 10px); opacity: .55; } to { transform: translate(16px, -12px); opacity: 1; } }
.wing-l, .wing-r { animation: flap 1.2s ease-in-out infinite alternate; }
@keyframes flap { from { transform: scaleX(1); } to { transform: scaleX(.35); } }
.ff { animation: ff ease-in-out infinite; }
@keyframes ff { 0% { transform: translate(0, 0); opacity: 0; } 30% { opacity: .95; } 50% { transform: translate(22px, -18px); opacity: .7; } 70% { opacity: .95; } 100% { transform: translate(-10px, -40px); opacity: 0; } }
`

const DEFS =
  lin('eco-sky', st(0, 'sky0') + st(0.3, 'sky1') + st(0.5, 'sky2') + st(0.66, 'sky3') + st(1, 'sky4')) +
  rad('eco-sun', `<stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".08" stop-color="#fffbe0" stop-opacity=".55"/><stop offset=".3" stop-color="#f8ffd8" stop-opacity=".18"/><stop offset="1" stop-color="#f8ffd8" stop-opacity="0"/>`, `gradientUnits="userSpaceOnUse" cx="${SUN[0]}" cy="${SUN[1]}" r="900"`) +
  rad('eco-disc', `<stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fffef0" stop-opacity=".8"/><stop offset="1" stop-color="#fff8c8" stop-opacity="0"/>`) +
  rad('eco-ray', `<stop offset="0" stop-color="#fffde8" stop-opacity=".95"/><stop offset=".6" stop-color="#f6ffd8" stop-opacity=".3"/><stop offset="1" stop-color="#f6ffd8" stop-opacity="0"/>`, `gradientUnits="userSpaceOnUse" cx="${SUN[0]}" cy="${SUN[1]}" r="1500"`) +
  rad('eco-haze', st(0, 'haze', 0.9) + st(0.5, 'haze', 0.4) + st(1, 'haze', 0)) +
  rad('eco-halo', `<stop offset="0" stop-color="#d8f4ff" stop-opacity=".4"/><stop offset=".3" stop-color="#bfe8f0" stop-opacity=".14"/><stop offset="1" stop-color="#bfe8f0" stop-opacity="0"/>`) +
  rad('eco-moon', `<stop offset="0" stop-color="#ffffff"/><stop offset=".85" stop-color="#e4f6f4"/><stop offset="1" stop-color="#cfeeea" stop-opacity=".6"/>`, 'cx=".42" cy=".4"') +
  rad('eco-cl', st(0, 'cl', 1) + st(0.62, 'cl', 0.85) + st(1, 'cl', 0)) +
  rad('eco-cl-lo', st(0, 'cl-lo', 0.7) + st(1, 'cl-lo', 0)) +
  lin('eco-hill', st(0, 'hill0') + st(0.35, 'hill1') + st(1, 'hill2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="650" x2="0" y2="900"') +
  rad('eco-sheen', `<stop offset="0" stop-color="#fbffe0" stop-opacity=".45"/><stop offset="1" stop-color="#fbffe0" stop-opacity="0"/>`) +
  lin('eco-mdw', st(0, 'mdw0') + st(0.4, 'mdw1') + st(1, 'mdw2'), 'gradientUnits="userSpaceOnUse" x1="0" y1="845" x2="0" y2="1000"') +
  rad('eco-bu', st(0, 'bu0') + st(0.2, 'bu1') + st(0.46, 'bu2') + st(0.76, 'bu3'), 'cx=".42" cy=".1" r="1.05"') +
  rad('eco-bu-b', st(0, 'bb0') + st(0.22, 'bb1') + st(0.5, 'bb2') + st(0.82, 'bb3'), 'cx=".42" cy=".1" r="1.05"') +
  lin('eco-bu-gl', st(0, 'bgl', 0.85) + st(0.55, 'bgl', 0.3) + st(1, 'bgl', 0)) +
  rad('eco-dew', st(0, 'dew0', 0.2) + st(0.6, 'dew1', 0.35) + st(0.86, 'dew2', 0.75) + st(1, 'dew0', 0.95), 'cx=".5" cy=".58" r=".55"') +
  rad('eco-dglow', `<stop offset="0" stop-color="#c8fff0" stop-opacity=".55"/><stop offset=".35" stop-color="#9cf2d4" stop-opacity=".18"/><stop offset="1" stop-color="#9cf2d4" stop-opacity="0"/>`) +
  lin('eco-leaf', st(0, 'leaf0') + st(0.5, 'leaf1') + st(1, 'leaf2')) +
  rad('eco-bug', `<stop offset="0" stop-color="#ff7a5a"/><stop offset=".55" stop-color="#e2241a"/><stop offset="1" stop-color="#8a0e0a"/>`, 'cx=".38" cy=".32"') +
  lin('eco-wing', st(0, 'wing0') + st(1, 'wing1')) +
  rad('eco-bub-body', `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#eaffff" stop-opacity=".05"/><stop offset=".93" stop-color="#d8fbff" stop-opacity=".24"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/>`) +
  lin(
    'eco-bub-iri',
    `<stop offset="0" stop-color="#ff9ad8" stop-opacity=".6"/><stop offset=".25" stop-color="#ffe680" stop-opacity=".55"/><stop offset=".5" stop-color="#9cf08a" stop-opacity=".5"/><stop offset=".75" stop-color="#7ad8ff" stop-opacity=".6"/><stop offset="1" stop-color="#c49aff" stop-opacity=".55"/>`,
    'x1="0" y1="0" x2="1" y2="1"',
  ) +
  rad('eco-bky', st(0, 'bk-y', 0.16) + st(0.78, 'bk-y', 0.22) + st(0.94, 'bk-y', 0.4) + st(1, 'bk-y', 0)) +
  rad('eco-bkw', st(0, 'bk-w', 0.12) + st(0.8, 'bk-w', 0.16) + st(0.95, 'bk-w', 0.32) + st(1, 'bk-w', 0)) +
  rad('eco-ff', `<stop offset="0" stop-color="#f4ff9a" stop-opacity=".9"/><stop offset=".22" stop-color="#d8ff6a" stop-opacity=".45"/><stop offset=".55" stop-color="#b8ff4a" stop-opacity=".1"/><stop offset="1" stop-color="#b8ff4a" stop-opacity="0"/>`) +
  BUBBLE

const BODY =
  `<rect width="1600" height="1000" fill="url(#eco-sky)"/>` +
  `<rect width="1600" height="1000" fill="url(#eco-sun)" class="day"/>` +
  SKY_NIGHT +
  layer(
    1,
    SKY_DAY +
      CLOUDS +
      `<ellipse cx="760" cy="690" rx="1100" ry="150" fill="url(#eco-haze)"/>` +
      TURBINES +
      `<path d="${HILL.fill}" fill="url(#eco-hill)"/>` +
      `<g class="sheen"><ellipse cx="560" cy="735" rx="420" ry="60" fill="url(#eco-sheen)"/></g>` +
      `<path d="${HILL.crest}" class="crest"/>`,
  ) +
  layer(2, `<path d="${MEADOW.fill}" fill="url(#eco-mdw)"/>${FRINGE}`) +
  layer(3, `<g class="bks">${BOKEH}</g><g class="bubs">${BUBBLES}</g><g class="day">${BUTTERFLY}</g><g class="night">${FIREFLIES}</g>`) +
  layer(4, shrub(SHRUBS[0]!, 1, 21) + shrub(SHRUBS[1]!, -1, 33) + LEAF_GROUP)

export const AERO_ECO: Look = {
  label: 'Aero Eco',
  args: { colors: theme, backdrop: { scene: 'aero-eco', glass: { blur: 22, opacity: 0.5 } } },
  problems,
  scene: svg(CSS, DEFS, BODY),
}
