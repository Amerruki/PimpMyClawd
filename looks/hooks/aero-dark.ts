import { makeColors } from './make-colors.js'
import { bloom, bokeh, grade, H, layer, n, orb, seeded, speckle, svg, W } from './kit'
import type { Look } from './look'

// Dark Aero: a deep black-blue glass space with luminous cyan and electric
// blue light trails, translucent glass ribbons behind them, fine light
// threads, a glossy black floor that mirrors it all, and dark glass orbs lit
// by cyan rims. By day the same studio turns glossy white: pearl and
// silver, ice-blue light trails over a white high-gloss floor, frosted
// glass orbs with sky-blue rims and a soft white bloom.
const { theme, problems } = makeColors({
  label: 'Aero Dark',
  roles: { accent: '#19b0ff', danger: '#ff4a5a', success: '#3fd67a', warning: '#ffb42a', pro: '#b07cff' },
  light: {
    roles: { accent: '#0a9ee6', danger: '#d6303e', success: '#1f9a52', warning: '#d48a0a', pro: '#8a56e0' },
    gray: {
      anchors: {
        'surface-0': '#e8eef5',
        'surface-1': '#eff4f9',
        'surface-2': '#f7fafc',
        'text-primary': '#0e1e30',
        'text-secondary': '#2a3c52',
        'text-muted': '#4a5c72',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#06080c',
        'surface-1': '#0c1016',
        'surface-2': '#11161e',
        'surface-3': '#161d27',
        'text-primary': '#eaf2fb',
        'text-secondary': '#c0ccda',
        'text-muted': '#94a3b6',
      },
    },
  },
})

// The floor's horizon. Everything above it is mirrored below it.
const HZ = 690

type Pt = readonly [number, number]

type Bundle = {
  id: string
  p: readonly [Pt, Pt, Pt, Pt]
  spread: readonly [number, number]
  strands: number
  width: number
  pulses: readonly { strand: number; dur: number; delay: number }[]
  // How the bundle breathes: period and phase of its slow undulation.
  sway: readonly [number, number]
}

// A swoosh: several thin strands that share one curve and fan apart toward
// the far end. Each bundle has its own gradient along its length, so it
// fades in and out at its ends.
const BUNDLES: readonly Bundle[] = [
  {
    id: 'a',
    p: [[-120, 600], [380, 560], [980, 360], [1720, 70]],
    spread: [10, 150],
    strands: 8,
    width: 2.2,
    pulses: [
      { strand: 2, dur: 11, delay: 2 },
      { strand: 5, dur: 15, delay: 9 },
      { strand: 7, dur: 19, delay: 4 },
    ],
    sway: [23, 0],
  },
  {
    id: 'b',
    p: [[-140, 330], [140, 250], [420, 90], [760, -80]],
    spread: [70, 8],
    strands: 6,
    width: 1.8,
    pulses: [{ strand: 3, dur: 9, delay: 4 }],
    sway: [29, 7],
  },
  {
    id: 'c',
    p: [[1740, 650], [1480, 600], [1300, 380], [1180, -60]],
    spread: [12, 110],
    strands: 7,
    width: 1.8,
    pulses: [
      { strand: 1, dur: 10, delay: 6 },
      { strand: 4, dur: 14, delay: 1 },
    ],
    sway: [31, 12],
  },
  {
    id: 'd',
    p: [[-140, 690], [300, 660], [520, 470], [880, 160]],
    spread: [6, 60],
    strands: 4,
    width: 1.2,
    pulses: [],
    sway: [37, 5],
  },
]

const FAR: readonly Bundle[] = [
  { id: 'f1', p: [[-100, 470], [400, 330], [1100, 260], [1700, 330]], spread: [30, 60], strands: 4, width: 3, pulses: [], sway: [47, 3] },
  { id: 'f2', p: [[1700, 480], [1400, 420], [1200, 200], [1300, -80]], spread: [20, 70], strands: 4, width: 3, pulses: [], sway: [41, 20] },
]

const ALL = [...BUNDLES, ...FAR]

function strandPath(b: Bundle, i: number, extra = 0): string {
  const t = b.strands === 1 ? 0 : i / (b.strands - 1) - 0.5
  const [s0, s1] = b.spread
  const pts = b.p.map(([x, y], k) => {
    const f = k / 3
    const o = t * (s0 + (s1 - s0) * f) + extra * f

    return `${n(x)} ${n(y + o)}`
  })

  return `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]}`
}

function bundleGradient(b: Bundle): string {
  const [x1, y1] = b.p[0]
  const [x2, y2] = b.p[3]

  return (
    `<linearGradient id="dk-g-${b.id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="var(--t0)" stop-opacity="0"/>` +
    `<stop offset=".22" stop-color="var(--t1)" stop-opacity="1"/>` +
    `<stop offset=".5" stop-color="var(--t2)" stop-opacity=".9"/>` +
    `<stop offset=".78" stop-color="var(--t3)" stop-opacity=".8"/>` +
    `<stop offset="1" stop-color="var(--t0)" stop-opacity="0"/>` +
    `</linearGradient>`
  )
}

// The still body of a bundle: a wide volumetric glow (a heavily blurred
// stroke), the strands with a blurred copy under them, and one white-hot
// core strand. It moves only through the groups that hold it.
function bundleStill(b: Bundle, haze: number): string {
  const mid = strandPath(b, (b.strands - 1) / 2)
  const strands = Array.from({ length: b.strands }, (_, i) => {
    const edge = Math.abs(i / Math.max(1, b.strands - 1) - 0.5) * 2

    return `<path d="${strandPath(b, i)}" stroke-width="${n(b.width * (1.2 - edge * 0.7))}" stroke-opacity="${n(0.95 - edge * 0.5)}"/>`
  }).join('')
  const wide = 40 + b.spread[1] * 0.5

  return (
    `<g fill="none" stroke="url(#dk-g-${b.id})" stroke-linecap="round">` +
    `<g class="hw" style="filter:blur(18px)" stroke-opacity="${n(haze)}"><path d="${mid}" stroke-width="${n(wide)}"/></g>` +
    `<path d="${mid}" stroke-width="${n(wide * 0.45)}" stroke-opacity="${n(haze * 0.12)}"/>` +
    `<g style="filter:blur(10px)" opacity=".7">${strands}</g>` +
    bloom(strands, 3, 1) +
    `<path d="${mid}" stroke="url(#dk-core)" stroke-width="${n(b.width * 0.7)}"/>` +
    `</g>`
  )
}

// Light pulses running along strands: a soft wide dash under a bright thin
// one reads as glow without a per-frame blur.
function bundlePulses(b: Bundle): string {
  return b.pulses
    .map(p => {
      const d = strandPath(b, p.strand)
      const st = `style="animation-duration:${p.dur}s;animation-delay:-${p.delay}s"`

      return (
        `<path class="run" ${st} d="${d}" pathLength="1000" stroke="var(--p0)" stroke-opacity=".16" stroke-width="16" stroke-dasharray="90 910"/>` +
        `<path class="run" ${st} d="${d}" pathLength="1000" stroke="var(--p0)" stroke-opacity=".3" stroke-width="7" stroke-dasharray="70 930"/>` +
        `<path class="run" ${st} d="${d}" pathLength="1000" stroke="var(--p1)" stroke-opacity=".95" stroke-width="2" stroke-dasharray="40 960"/>`
      )
    })
    .join('')
}

// A bundle as placed in the scene: its still body inside a group that
// undulates slowly, plus its pulses riding the same motion.
const sway = (b: Bundle, content: string): string =>
  `<g class="sway" style="animation-duration:${b.sway[0]}s;animation-delay:-${b.sway[1]}s">${content}</g>`

const use = (id: string): string => `<use href="#dk-s-${id}"/>`

// ---- Glass ribbons and threads -------------------------------------------

type Ribbon = { top: string; bot: string; edge: string; dur: number; delay: number; o: number }

// Wide translucent glass sheets behind the trails, each a band between two
// curves with a bright leading edge: the Vista-era wave.
const RIBBONS: readonly Ribbon[] = [
  {
    top: 'M-160 520 C 260 420, 700 470, 1040 300 S 1560 40, 1780 -20',
    bot: 'L1780 120 C 1560 170, 1260 330, 1040 420 S 300 560, -160 640 Z',
    edge: 'M-160 520 C 260 420, 700 470, 1040 300 S 1560 40, 1780 -20',
    dur: 34,
    delay: 0,
    o: 1,
  },
  {
    top: 'M-160 210 C 120 120, 420 160, 700 40 S 1000 -60, 1100 -120',
    bot: 'L1100 -40 C 940 40, 760 150, 560 220 S 160 290, -160 330 Z',
    edge: 'M-160 210 C 120 120, 420 160, 700 40 S 1000 -60, 1100 -120',
    dur: 41,
    delay: 13,
    o: 0.7,
  },
  {
    top: 'M1780 600 C 1560 560, 1420 520, 1300 400 S 1180 180, 1260 -40',
    bot: 'L1400 -40 C 1350 140, 1420 320, 1520 420 S 1700 520, 1780 520 Z',
    edge: 'M1780 600 C 1560 560, 1420 520, 1300 400 S 1180 180, 1260 -40',
    dur: 38,
    delay: 21,
    o: 0.8,
  },
]

const ribbons = RIBBONS.map(
  r =>
    `<g class="wave" style="animation-duration:${r.dur}s;animation-delay:-${r.delay}s" opacity="${n(r.o)}">` +
    `<path d="${r.top} ${r.bot}" fill="url(#dk-sheet)"/>` +
    `<path d="${r.top} ${r.bot}" fill="url(#dk-sheet-lo)"/>` +
    `<path d="${r.edge}" fill="none" stroke="url(#dk-sheet-edge)" stroke-width="5" stroke-opacity=".18"/>` +
    `<path d="${r.edge}" fill="none" stroke="url(#dk-sheet-edge)" stroke-width="1.1"/>` +
    `</g>`,
).join('')

// Fine hairline threads that follow the main trails at a distance, a few
// of them carrying slow long dashes of light.
function threads(seed: number): string {
  const rand = seeded(seed)
  const lines: string[] = []
  const runs: string[] = []

  for (const b of [BUNDLES[0]!, BUNDLES[2]!, BUNDLES[1]!]) {
    for (let k = 0; k < 6; k++) {
      const off = (rand() - 0.5) * 2 * (b.spread[1] + 60)
      const d = strandPath(b, (b.strands - 1) / 2 + (rand() - 0.5) * 2, off)
      lines.push(`<path d="${d}" stroke-opacity="${n(0.18 + rand() * 0.3)}"/>`)
      if (k % 2 === 0) {
        runs.push(
          `<path class="run" d="${d}" pathLength="1000" stroke-dasharray="${n(120 + rand() * 160)} 1000" style="animation-duration:${n(18 + rand() * 20)}s;animation-delay:-${n(rand() * 20)}s"/>`,
        )
      }
    }
  }

  return (
    `<g fill="none" stroke="var(--th)" stroke-width=".7">${lines.join('')}</g>` +
    `<g fill="none" stroke="var(--tr)" stroke-opacity=".6" stroke-width="1">${runs.join('')}</g>`
  )
}

// ---- Orbs ------------------------------------------------------------------

// A dark glass orb: smoked body, the kit's glass layers tinted cyan, a cyan
// rim lit from the upper left with a soft glow, and a bounce of trail light
// low on the right.
function darkOrb(cx: number, cy: number, r: number): string {
  const sw = Math.max(2, r * 0.06)
  const bounce = `M${n(cx + r * 0.2)} ${n(cy + r * 0.86)} A${n(r * 0.9)} ${n(r * 0.9)} 0 0 0 ${n(cx + r * 0.84)} ${n(cy + r * 0.3)}`

  return (
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 1.5)}" fill="url(#dk-orbglow)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#dk-smoke)"/>` +
    orb(cx, cy, r, 'dk-orb') +
    `<g class="blur-1"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r - 2)}" fill="none" stroke="url(#dk-rim)" stroke-width="${n(sw * 1.6)}"/>` +
    `<path d="${bounce}" fill="none" stroke="#5fe0ff" stroke-opacity=".5" stroke-width="${n(Math.max(1.5, r * 0.07))}" stroke-linecap="round"/></g>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r - 0.8)}" fill="none" stroke="url(#dk-rim)" stroke-width="${n(Math.max(0.8, r * 0.014))}"/>` +
    `<path d="${bounce}" fill="none" stroke="#bff6ff" stroke-opacity=".6" stroke-width="${n(Math.max(0.6, r * 0.012))}" stroke-linecap="round"/>` +
    // A trail reflected in the glass: a thin cyan arc hugging the lower-left rim.
    `<path d="M${n(cx - r * 0.84)} ${n(cy + r * 0.12)} A${n(r * 0.85)} ${n(r * 0.85)} 0 0 0 ${n(cx - r * 0.12)} ${n(cy + r * 0.84)}" fill="none" stroke="#5fdcff" stroke-opacity=".3" stroke-width="${n(Math.max(0.8, r * 0.025))}" stroke-linecap="round"/>`
  )
}

type OrbSpec = { x: number; y: number; r: number; dof?: 1 | 2 | 3; dur: number; delay: number }

const ORBS_FAR: readonly OrbSpec[] = [
  { x: 1240, y: 150, r: 34, dof: 2, dur: 17, delay: 3 },
  { x: 380, y: 140, r: 26, dof: 2, dur: 19, delay: 8 },
  { x: 1520, y: 560, r: 22, dof: 2, dur: 15, delay: 1 },
  { x: 90, y: 90, r: 18, dof: 2, dur: 21, delay: 6 },
]

const ORBS_NEAR: readonly OrbSpec[] = [
  { x: 1400, y: 300, r: 118, dur: 14, delay: 0 },
  { x: 190, y: 470, r: 84, dur: 16, delay: 5 },
  { x: 1270, y: 560, r: 44, dur: 12, delay: 7 },
  { x: 330, y: 240, r: 36, dof: 1, dur: 13, delay: 2 },
  { x: 1530, y: 120, r: 30, dof: 1, dur: 18, delay: 11 },
]

function orbs(list: readonly OrbSpec[]): string {
  return list
    .map(o => {
      const body = darkOrb(o.x, o.y, o.r)
      const inner = o.dof ? `<g class="blur-${o.dof}">${body}</g>` : body

      return `<g class="bob" style="animation-duration:${o.dur}s;animation-delay:-${o.delay}s">${inner}</g>`
    })
    .join('')
}

// The orbs' reflections on the floor: flipped, dimmer, with a cyan pool of
// light where each would touch the mirror.
function orbMirror(list: readonly OrbSpec[]): string {
  return list
    .filter(o => o.y + o.r > 380)
    .map(o => {
      const y = 2 * HZ - o.y
      const pool = `<ellipse cx="${n(o.x)}" cy="${n(HZ + 14 + (HZ - o.y) * 0.08)}" rx="${n(o.r * 1.4)}" ry="${n(o.r * 0.16)}" fill="url(#dk-glow-b)"/>`

      return (
        pool +
        `<g class="bob-m" style="animation-duration:${o.dur}s;animation-delay:-${o.delay}s"><g opacity=".45">` +
        `<circle cx="${n(o.x)}" cy="${n(y)}" r="${n(o.r)}" fill="url(#dk-smoke)"/>` +
        `<circle cx="${n(o.x)}" cy="${n(y)}" r="${n(o.r - 1)}" fill="none" stroke="#2fc8ff" stroke-opacity=".45" stroke-width="${n(Math.max(1, o.r * 0.03))}"/>` +
        `</g></g>`
      )
    })
    .join('')
}

// ---- Particles ---------------------------------------------------------------

// Fine floating particles, in three groups that each drift as one.
function particles(seed: number): string {
  const rand = seeded(seed)

  return [0, 1, 2]
    .map(g => {
      const dots = Array.from({ length: 18 }, () => {
        const side = rand() < 0.5
        const x = side ? rand() * 460 : 1140 + rand() * 460
        const y = 20 + rand() * (HZ - 40)

        return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.6 + rand() * 1.5)}" fill-opacity="${n(0.25 + rand() * 0.6)}"/>`
      }).join('')

      return `<g class="mote" fill="var(--mo)" style="animation-duration:${22 + g * 9}s;animation-delay:-${g * 7}s">${dots}</g>`
    })
    .join('')
}

// Faint floor grid lines running to the vanishing point.
const GRID =
  Array.from({ length: 17 }, (_, i) => {
    const x = (i - 8) * 260 + 800

    return `M800 ${HZ} L${n(x * 1.9 - 720)} ${H}`
  }).join(' ') +
  ' ' +
  [12, 34, 70, 130, 220].map(d => `M0 ${HZ + d} L${W} ${HZ + d}`).join(' ')

// Every colour that changes between day and night, as [day, night].
const PALETTE: Record<string, readonly [string, string]> = {
  s0: ['#cbd8e6', '#03060e'], s1: ['#e2eaf3', '#050c1b'], s2: ['#fdfeff', '#0a1830'], s3: ['#eef3f8', '#02040a'],
  f0: ['#e3ebf3', '#0b1a30'], f1: ['#f3f6f9', '#050c18'], f2: ['#e4eaf1', '#02050b'], f3: ['#cfd9e4', '#010205'],
  t0: ['#3a7cf0', '#1a5cff'], t1: ['#08a4e6', '#3fd4ff'], t2: ['#46cff2', '#8af0ff'], t3: ['#2a80ea', '#2a7bff'],
  p0: ['#18b0ee', '#4fd8ff'], p1: ['#ffffff', '#effcff'], th: ['#3aa2dc', '#7fe4ff'], tr: ['#1ea4e0', '#dffaff'], mo: ['#6cc6ee', '#bff4ff'],
  gr: ['#5a9cd0', '#3fb8ff'], gro: ['.1', '.06'],
  ga0: ['#ffffff', '#1f6bff'], gao: ['1', '.42'], ga1: ['#f2f8ff', '#1340b0'], gb0: ['#7fd8ff', '#18c8ff'], gb1: ['#bfe6ff', '#0b6aa8'],
  gh: ['#ffffff', '#2a8cff'], gho: ['.9', '.28'], og: ['#8fd4ff', '#1aa8ff'], ogo: ['.22', '.12'],
  k0: ['#ffffff', '#0a1a30'], k0o: ['.3', '.55'], k1: ['#e6f1fa', '#030a16'], k1o: ['.55', '.82'], k2: ['#a8d6f4', '#06213a'],
  ot: ['#3ab0f0', '#2fc8ff'], oc: ['#ffffff', '#00101f'], r0: ['#ffffff', '#9ff2ff'], r1: ['#3cbcf4', '#2fc8ff'], r2: ['#2a8ce8', '#1a6cff'],
  h0: ['#7cc4f4', '#3a8cff'], h1: ['#bfeaff', '#5fd4ff'], h1o: ['.28', '.09'], h0o: ['.16', '.06'],
  l0: ['#ffffff', '#bff4ff'], l0o: ['.45', '.05'], l1: ['#7aa8d0', '#020610'], l1o: ['.12', '.25'],
  e0: ['#ffffff', '#bff4ff'], e1: ['#4cc0f0', '#7fd8ff'], gl: ['#ffffff', '#9fe8ff'], glo: ['.75', '.07'],
  c: ['#f6f9fc', '#03060c'], c1: ['.3', '.35'], c2: ['.42', '.5'], ft: ['#eef3f8', '#010205'], fto: ['.6', '.75'],
  gn: ['#5a86b0', '#9fd8ff'], b0: ['#9fe2ff', '#3fbfff'], b1: ['#b4d4ff', '#2a7bff'],
}
const vars = (k: 0 | 1): string => Object.entries(PALETTE).map(([name, v]) => `--${name}:${v[k]};`).join('')

const CSS = `
:root, svg { ${vars(0)} }
.nt { display: none; }
.hw { opacity: .5; }
.scr, .bokeh { mix-blend-mode: normal; }
@media (prefers-color-scheme: dark) {
  :root, svg { ${vars(1)} }
  .nt { display: inline; }
  .dy { display: none; }
  .hw { opacity: 1; }
  .scr, .bokeh { mix-blend-mode: screen; }
}
.dk-orb { --orb-tint:var(--ot); --orb-core:var(--oc); }
.dk-orb > :nth-child(2) { fill-opacity: .28; }
.dk-orb > :nth-child(1) { fill-opacity: .8; }
.run { fill: none; stroke-linecap: round; animation: dk-run linear infinite; }
@keyframes dk-run { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
.sway { animation: dk-sway cubic-bezier(.45,0,.55,1) infinite alternate; }
@keyframes dk-sway { from { transform: translate(-10px, 10px) skewY(-.8deg); } to { transform: translate(12px, -12px) skewY(.7deg); } }
.wave { animation: dk-wave ease-in-out infinite alternate; }
@keyframes dk-wave { from { transform: translate(-24px, 14px) scaleY(.96); } to { transform: translate(24px, -16px) scaleY(1.04); } }
.bob { animation: dk-bob ease-in-out infinite alternate; }
@keyframes dk-bob { from { transform: translateY(-9px); } to { transform: translateY(9px); } }
.bob-m { animation: dk-bob-m ease-in-out infinite alternate; }
@keyframes dk-bob-m { from { transform: translateY(9px); } to { transform: translateY(-9px); } }
.mote { animation: dk-mote ease-in-out infinite alternate; }
@keyframes dk-mote { from { transform: translate(-12px, 14px); opacity: .5; } to { transform: translate(14px, -22px); opacity: 1; } }
.breathe { animation: pulse 14s ease-in-out infinite; }
.breathe-2 { animation: pulse 19s ease-in-out infinite; animation-delay: -6s; }
.sheen { animation: dk-sheen 26s ease-in-out infinite; }
@keyframes dk-sheen { 0% { transform: translateX(-900px); } 60%, 100% { transform: translateX(1900px); } }
.hzb { animation: pulse 9s ease-in-out infinite; }
`

const DEFS =
  ALL.map(bundleGradient).join('') +
  `<linearGradient id="dk-core" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".3" stop-color="#f0fdff" stop-opacity=".95"/><stop offset=".7" stop-color="#dff8ff" stop-opacity=".7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--s0)"/><stop offset=".45" stop-color="var(--s1)"/><stop offset=".69" stop-color="var(--s2)"/><stop offset="1" stop-color="var(--s3)"/></linearGradient>` +
  `<linearGradient id="dk-floor" x1="0" y1="${HZ}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--f0)"/><stop offset=".08" stop-color="var(--f1)"/><stop offset=".6" stop-color="var(--f2)"/><stop offset="1" stop-color="var(--f3)"/></linearGradient>` +
  `<radialGradient id="dk-glow-a"><stop offset="0" stop-color="var(--ga0)" stop-opacity="var(--gao)"/><stop offset=".45" stop-color="var(--ga1)" stop-opacity=".16"/><stop offset="1" stop-color="var(--ga1)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-glow-b"><stop offset="0" stop-color="var(--gb0)" stop-opacity=".3"/><stop offset=".5" stop-color="var(--gb1)" stop-opacity=".1"/><stop offset="1" stop-color="var(--gb1)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-glow-h"><stop offset="0" stop-color="var(--gh)" stop-opacity="var(--gho)"/><stop offset="1" stop-color="var(--gh)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-orbglow"><stop offset=".6" stop-color="var(--og)" stop-opacity="var(--ogo)"/><stop offset="1" stop-color="var(--og)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-smoke" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="var(--k0)" stop-opacity="var(--k0o)"/><stop offset=".75" stop-color="var(--k1)" stop-opacity="var(--k1o)"/><stop offset="1" stop-color="var(--k2)" stop-opacity=".9"/></radialGradient>` +
  `<linearGradient id="dk-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--r0)" stop-opacity=".95"/><stop offset=".35" stop-color="var(--r1)" stop-opacity=".35"/><stop offset=".6" stop-color="var(--r1)" stop-opacity="0"/><stop offset="1" stop-color="var(--r2)" stop-opacity=".5"/></linearGradient>` +
  `<linearGradient id="dk-sheet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--h0)" stop-opacity="0"/><stop offset=".3" stop-color="var(--h1)" stop-opacity="var(--h1o)"/><stop offset=".65" stop-color="var(--h0)" stop-opacity="var(--h0o)"/><stop offset="1" stop-color="var(--h0)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-sheet-lo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--l0)" stop-opacity="var(--l0o)"/><stop offset=".5" stop-color="var(--l1)" stop-opacity="0"/><stop offset="1" stop-color="var(--l1)" stop-opacity="var(--l1o)"/></linearGradient>` +
  `<linearGradient id="dk-sheet-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--e0)" stop-opacity="0"/><stop offset=".3" stop-color="var(--e0)" stop-opacity=".55"/><stop offset=".7" stop-color="var(--e1)" stop-opacity=".3"/><stop offset="1" stop-color="var(--e0)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-hz" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5fdcff" stop-opacity=".0"/><stop offset=".12" stop-color="#5fdcff" stop-opacity=".55"/><stop offset=".35" stop-color="#3a9cff" stop-opacity=".12"/><stop offset=".65" stop-color="#3a9cff" stop-opacity=".12"/><stop offset=".88" stop-color="#5fdcff" stop-opacity=".55"/><stop offset="1" stop-color="#5fdcff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-fade" x1="0" y1="${HZ}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<mask id="dk-refl" maskUnits="userSpaceOnUse" x="-200" y="${HZ}" width="${W + 400}" height="${H - HZ}"><rect x="-200" y="${HZ}" width="${W + 400}" height="${H - HZ}" fill="url(#dk-fade)"/></mask>` +
  `<linearGradient id="dk-gloss" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--gl)" stop-opacity="0"/><stop offset=".5" stop-color="var(--gl)" stop-opacity="var(--glo)"/><stop offset="1" stop-color="var(--gl)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-calm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--c)" stop-opacity="0"/><stop offset=".28" stop-color="var(--c)" stop-opacity="var(--c1)"/><stop offset=".5" stop-color="var(--c)" stop-opacity="var(--c2)"/><stop offset=".72" stop-color="var(--c)" stop-opacity="var(--c1)"/><stop offset="1" stop-color="var(--c)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="dk-foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ft)" stop-opacity="0"/><stop offset="1" stop-color="var(--ft)" stop-opacity="var(--fto)"/></linearGradient>` +
  `<radialGradient id="dw-pearl"><stop offset="0" stop-color="#f6e8f4" stop-opacity=".55"/><stop offset=".5" stop-color="#eae6fa" stop-opacity=".22"/><stop offset="1" stop-color="#e6eefa" stop-opacity="0"/></radialGradient>` +
  speckle('dk-grain', 7, 'var(--gn)', 157, 70, 0.7, 0.12) +
  ALL.map(b => `<g id="dk-s-${b.id}">${bundleStill(b, b.id.startsWith('f') ? 0.4 : 0.75)}</g>`).join('')

// The floor reflection of a group of bundles: mirrored about the horizon,
// each copy undulating with its original, doubled a few pixels down so the
// gloss reads as a slightly soft mirror, and faded out toward the foot.
const mirror = (list: readonly Bundle[], o: number): string =>
  `<g mask="url(#dk-refl)"><g transform="matrix(1 0 0 -1 0 ${2 * HZ})" opacity="${o}">` +
  list.map(b => sway(b, use(b.id))).join('') +
  `<g transform="translate(0 -6)" opacity=".4">${list.map(b => sway(b, use(b.id))).join('')}</g>` +
  `</g></g>`

const BODY =
  `<rect width="${W}" height="${H}" fill="url(#dk-sky)"/>` +
  `<g class="breathe"><ellipse cx="1360" cy="170" rx="640" ry="520" fill="url(#dk-glow-a)"/></g>` +
  `<g class="dy"><ellipse cx="600" cy="90" rx="760" ry="300" fill="url(#dw-pearl)"/></g>` +
  `<g class="breathe-2"><ellipse cx="170" cy="560" rx="460" ry="380" fill="url(#dk-glow-b)"/></g>` +
  `<ellipse cx="800" cy="${HZ}" rx="980" ry="150" fill="url(#dk-glow-h)"/>` +
  layer(1, `<g class="blur-3" opacity=".55">${FAR.map(b => sway(b, use(b.id))).join('')}</g>`) +
  layer(2, ribbons + `<g class="blur-2" opacity=".8">${sway(BUNDLES[3]!, use('d'))}</g>` + orbs(ORBS_FAR)) +
  layer(3, `<g class="scr">` + threads(5) + BUNDLES.slice(0, 3).map(b => sway(b, use(b.id) + bundlePulses(b))).join('') + `</g>`) +
  `<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#dk-floor)"/>` +
  `<path d="${GRID}" stroke="var(--gr)" stroke-opacity="var(--gro)" stroke-width="1" fill="none" mask="url(#dk-refl)"/>` +
  layer(1, mirror(FAR, 0.25)) +
  layer(2, mirror([BUNDLES[3]!], 0.45)) +
  layer(3, mirror(BUNDLES.slice(0, 3), 0.55)) +
  `<g mask="url(#dk-refl)"><g class="sheen"><rect x="0" y="${HZ}" width="700" height="${H - HZ}" fill="url(#dk-gloss)" transform="skewX(-30)"/></g></g>` +
  `<ellipse cx="1300" cy="${HZ + 20}" rx="420" ry="40" fill="url(#dk-glow-b)" opacity=".7"/>` +
  `<ellipse cx="220" cy="${HZ + 18}" rx="360" ry="34" fill="url(#dk-glow-b)" opacity=".6"/>` +
  `<g class="hzb">${bloom(`<rect y="${HZ - 0.6}" width="${W}" height="1.2" fill="url(#dk-hz)"/>`, 3, 1)}</g>` +
  layer(4, `<g mask="url(#dk-refl)">${orbMirror(ORBS_NEAR)}</g>` + orbs(ORBS_NEAR) + particles(17)) +
  layer(4, bokeh(9, 41, { x: 1180, y: 20, w: 420, h: 420 }, 'var(--b0)', 46) + bokeh(7, 77, { x: 0, y: 40, w: 380, h: 520 }, 'var(--b1)', 40)) +
  `<rect width="${W}" height="${H}" fill="url(#dk-calm)"/>` +
  `<rect y="860" width="${W}" height="140" fill="url(#dk-foot)"/>` +
  `<rect width="${W}" height="${H}" fill="url(#dk-grain)"/>` +
  `<g class="nt">${grade([1360, 170], '#9fe4ff', '#000814', 0.8)}</g>` +
  `<g class="dy">${grade([1360, 170], '#ffffff', '#5a86b8', 0.7).replace(/k-(grade|vig)/g, 'dw-$1').replace('stop-color="#000"', 'stop-color="#46688c"')}</g>`

const SCENE = svg(CSS, DEFS, BODY)

export const AERO_DARK: Look = {
  label: 'Aero Dark',
  args: { colors: theme, backdrop: { scene: 'aero-dark', glass: { blur: 28, opacity: 0.55 } } },
  problems,
  scene: SCENE,
}
