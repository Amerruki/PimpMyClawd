import { makeColors } from './make-colors.js'
import { n, seeded, svg } from './kit'
import type { Look } from './look'
import { along, BC, isoradial, lensed, pathD, shift, simplifyOpen, type P2 } from './space-blackhole-lens'

// A black hole with a thin disc of gas, seen large from 9 degrees above the
// disc's plane. Every curve is the traced path of light round a
// non-rotating hole: the near half of the disc crosses in front, the far
// half is lifted over the top, and light that went round the back makes the
// thin arc underneath. The black disc is the shadow, 2.6 times the horizon
// across, edged by the photon ring. The left side of the disc turns toward
// the camera, so it is brighter and whiter and the right side dimmer and
// redder, each colour computed from the gas's speed and the hole's
// gravity. The gas streams round, quicker near the hole; background stars
// drift past and swing round the Einstein ring, stretched as they go.
// Night is deep space. Day is the same hole against a bright nebula, the
// field burnt out to cream and gold.
const { theme, problems } = makeColors({
  label: 'Black hole',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#f0b04a', danger: '#d23a32', success: '#2f9a55', warning: '#c07f00', pro: '#9b6ad6' },
  light: {
    roles: { accent: '#9a5a0a' },
    gray: {
      anchors: {
        'surface-0': '#f3ecdc',
        'surface-1': '#f8f2e5',
        'surface-2': '#fdfaf2',
        'text-primary': '#231a0c',
        'text-secondary': '#483a22',
        'text-muted': '#65553a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#09080a',
        'surface-1': '#110f11',
        'surface-2': '#181517',
        'surface-3': '#1f1b1c',
        'text-primary': '#f6efe2',
        'text-secondary': '#d6cab6',
        'text-muted': '#ad9f8a',
      },
    },
  },
})

const CX = 282
const CY = 500
// The disc is traced at 17 px per unit and drawn 27/17 larger, which keeps
// the path data short.
const M = 17
const K = 27 / 17
const INC = 81
const ROLL = -9
const R_OUT = 15
const RS = BC * M
const RSP = RS * K
const EIN = 230
const T_IN = 46
const DRIFT = 1840
const rand = seeded(8128)

// ---- Colour of the gas -------------------------------------------------------

type RGB = readonly [number, number, number]
const rgb = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))

  return t * t * (3 - 2 * t)
}
const ramp = (stops: readonly (readonly [number, string])[]) => (h: number): RGB => {
  const first = stops[0] as readonly [number, string]
  if (h <= first[0]) return rgb(first[1])
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1] as readonly [number, string]
    const b = stops[i] as readonly [number, string]
    if (h <= b[0]) {
      const t = (h - a[0]) / (b[0] - a[0])
      const ca = rgb(a[1])
      const cb = rgb(b[1])

      return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]
    }
  }

  return rgb((stops[stops.length - 1] as readonly [number, string])[1])
}
const hex8 = (c: RGB, a: number) =>
  `#${[...c, clamp(a) * 255].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

// Heat to colour: ember, orange, amber, gold, white, and blue-white for
// the gas coming straight at the camera.
const NIGHT = ramp([
  [0.26, '#4a0f03'],
  [0.36, '#972808'],
  [0.47, '#d7501a'],
  [0.58, '#f6862f'],
  [0.7, '#ffb660'],
  [0.82, '#ffe0b0'],
  [0.96, '#fff6e6'],
  [1.2, '#eaf1ff'],
])
// Against a bright field the cool gas has to be darker than the sky to
// show, so the day ramp runs from brown amber up to pure white.
const DAY = ramp([
  [0.26, '#6e3206'],
  [0.36, '#9c4a0a'],
  [0.47, '#c96c10'],
  [0.58, '#e58e1a'],
  [0.7, '#f5b23a'],
  [0.84, '#fbd688'],
  [1.0, '#fff4da'],
  [1.2, '#ffffff'],
])

const temp = (r: number) => Math.pow(Math.max(r, 6) / 6, -0.5)
// How much gas glows at each radius: nothing stable inside 6, strongest
// just outside, thinning to nothing at the outer edge.
const glow = (r: number) => smooth(5.3, 6.5, r) * Math.pow(Math.max(r, 6.5) / 6.5, -1.3) * (1 - smooth(10.5, R_OUT + 0.3, r))

const BINS = [5.6, 6.7, 8.1, 9.9, 12.2, 15]
const binOf = (r: number) => BINS.reduce((best, b, i) => (Math.abs(b - r) < Math.abs((BINS[best] as number) - r) ? i : best), 0)
const STOPS = 5

const vars = { day: [] as string[], night: [] as string[] }
let stopCss = ''
function dopplerGradient(id: string, r: number, kind: 'b' | 's'): string {
  const xm = r * 1.1
  let stops = ''
  for (let j = 0; j < STOPS; j++) {
    const t = j / (STOPS - 1)
    const g = shift(r, (2 * t - 1) * xm, INC)
    const heat = temp(r) * g + (kind === 's' ? 0.13 : 0)
    const dayHeat = kind === 's' ? heat - 0.08 + 0.1 * g : heat - 0.14
    const lum = Math.pow(g / 1.15, 2)
    const aNight = kind === 's' ? glow(r) * (0.08 + 0.9 * lum) : Math.pow(glow(r), 0.85) * (0.42 + 0.9 * lum)
    const aDay = kind === 's' ? Math.pow(glow(r), 0.6) * (0.4 + 0.5 * lum) : Math.pow(glow(r), 0.3) * 1.15
    const name = `${id}${j}`
    vars.night.push(`--${name}:${hex8(NIGHT(heat), aNight)}`)
    vars.day.push(`--${name}:${hex8(DAY(dayHeat), aDay)}`)
    stopCss += `.${name}{stop-color:var(--${name})}`
    stops += `<stop offset="${n(t * 100)}%" class="${name}"/>`
  }

  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(-xm * M)}" x2="${n(xm * M)}">${stops}</linearGradient>`
}
const GRADS = BINS.map((r, k) => dopplerGradient(`b${k}`, r, 'b') + dopplerGradient(`s${k}`, r, 's')).join('')

// ---- The disc ----------------------------------------------------------------

const ring = (r: number, order: 0 | 1 = 0, tol = 0.4) => isoradial(() => r, order, INC, M, tol)

// The body: bands between neighbouring rings, some thin so the sky shows
// through as gaps.
function bands(edges: readonly number[], order: 0 | 1, lanes: readonly number[], tol: number): string {
  const d = edges.map(r => pathD(ring(r, order, tol), true))

  return edges
    .slice(1)
    .map((r, i) => `<path d="${d[i + 1]}${d[i]}" fill="url(#b${binOf((r + (edges[i] as number)) / 2)})" fill-opacity="${lanes[i]}"/>`)
    .join('')
}
const BODY = bands([5.9, 6.5, 7.2, 8.1, 9.1, 10.2, 11.2, 12.2, 13.1, 14, R_OUT], 0, [0.9, 1, 0.95, 0.82, 0.95, 0.7, 0.85, 0.66, 0.5, 0.3], 0.8)

// Streaks: rings a little out of round, so they cross and braid, each drawn
// as dashes that travel round at the orbital period of its radius.
type Streak = { id: string; r: number; pts: P2[] }
function streaks(count: number, order: 0 | 1, tag: string, tol: number, rMax = R_OUT): Streak[] {
  return Array.from({ length: count }, (_, i) => {
    const r = 5.95 + (rMax - 6.15) * Math.pow((i + rand()) / count, 1.12)
    // Every fourth streak is turbulent: it wanders in and out several
    // times a turn and crosses its neighbours.
    const wild = i % 4 === 2
    const m = wild ? 6 + Math.floor(rand() * 6) : 5
    const [e1, e2, e3] = [0.014 * rand(), 0.01 * rand(), wild ? 0.008 + 0.012 * rand() : 0.005 * rand()]
    const [p1, p2, p3] = [rand() * 6.28, rand() * 6.28, rand() * 6.28]
    const pts = isoradial(psi => r * (1 + e1 * Math.sin(psi + p1) + e2 * Math.sin(2 * psi + p2) + e3 * Math.sin(m * psi + p3)), order, INC, M, tol)

    return { id: `${tag}${i.toString(36)}`, r, pts }
  })
}
const STREAKS = streaks(22, 0, 'k', 0.7)
const ECHOES = streaks(4, 1, 'e', 0.4, 10)
const streakDefs = [...STREAKS, ...ECHOES].map(s => `<path id="${s.id}" pathLength="100" d="${pathD(s.pts, true)}"/>`).join('')

// Dash patterns, each one whole turn long: long runs with short breaks,
// broken filaments, and a few lone clumps.
function dashes(count: number, long: number, gap: number): string {
  const parts: number[] = []
  for (let i = 0; i < count; i++) parts.push(1 + rand() * rand() * long, 0.6 + rand() * rand() * gap)
  const sum = parts.reduce((a, b) => a + b, 0)

  return parts.map(v => n((v / sum) * 100)).join(' ')
}
const RUNS = 8
const BITS = 6
const CLUMPS = 4
const dashCss =
  Array.from({ length: RUNS }, (_, i) => `.da${i}{stroke-dasharray:${dashes(3 + (i % 3), 60, 5)}}`).join('') +
  Array.from({ length: BITS }, (_, i) => `.db${i}{stroke-dasharray:${dashes(6 + i, 9, 14)}}`).join('') +
  Array.from({ length: CLUMPS }, (_, i) => `.dc${i}{stroke-dasharray:${dashes(2 + (i % 2), 9, 70)}}`).join('')

const period = (r: number) => T_IN * Math.pow(Math.max(r, 5.6) / 6, 1.5)
const pick = (k: number) => Math.floor(rand() * k)
function flow(list: readonly Streak[], rich: boolean, fade = 1): string {
  return list
    .map(s => {
      const k = binOf(s.r)
      const T = period(s.r)
      const use = (cls: string, w: number, o: number, sc: number, hot = false) =>
        `<use href="#${s.id}" class="${cls}" stroke="url(#s${hot ? Math.max(0, k - 1) : k})" stroke-width="${n(w)}" stroke-opacity="${n(o * fade)}"${sc === 1 ? '' : ` transform="scale(${sc})"`}/>`
      let out = use(`da${pick(RUNS)}`, 0.5 + rand() * 0.7, 0.55 + rand() * 0.45, 1)
      if (rich) {
        out += use(`db${pick(BITS)}`, 0.3 + rand() * 0.5, 0.45 + rand() * 0.55, Math.round((0.98 + rand() * 0.012) * 1000) / 1000, true)
        if (rand() < 0.3) out += `<use href="#${s.id}" class="lane da${pick(RUNS)}" stroke-width="${n(0.4 + rand() * 0.5)}" transform="scale(${Math.round((0.992 + rand() * 0.016) * 1000) / 1000})"/>`
        if (rand() < 0.4) out += use(`dc${pick(CLUMPS)}`, 1.2 + rand() * 1, 0.25 + rand() * 0.3, 1, true)
      }

      return `<g class="fl" style="animation-duration:${Math.round(T)}s;animation-delay:-${Math.round(rand() * T)}s">${out}</g>`
    })
    .join('')
}
const FLOW = flow(STREAKS, true)

// Broad soft bands under the streaks: every third ring drawn wide and
// faint in the body's own colours, so the gas has depth between the lines.
// Rings that share a colour band are drawn as one path.
const SOFT = Object.entries(
  STREAKS.filter((_, i) => i % 2 === 0).reduce<Record<number, string>>((acc, s) => {
    const k = binOf(s.r)
    acc[k] = (acc[k] ?? '') + pathD(s.pts, true)

    return acc
  }, {}),
)
  .map(([k, d]) => `<path d="${d}" stroke="url(#b${k})" stroke-width="${n(5 + rand() * 3)}" stroke-opacity="${n(0.26 + rand() * 0.12)}"/>`)
  .join('')

// Knots of hot gas riding round on a streak, dimming as they swing to the
// receding side, and flaring now and then.
const KNOTS = STREAKS.filter(s => s.r > 7.2 && s.r < 11.5)
  .filter((_, i) => i % 3 === 0)
  .slice(0, 4)
  .map((s, j) => {
    const T = Math.round(period(s.r))
    const begin = -Math.round(rand() * T)
    const fade = Array.from({ length: 25 }, (_, i) => {
      const [x] = along(s.pts, i / 24)

      return n(clamp(0.45 + 0.6 * Math.pow(shift(s.r, x / M, INC) / 1.15, 2)))
    }).join(';')

    return (
      `<g><animateMotion dur="${T}s" begin="${begin}s" rotate="auto" repeatCount="indefinite"><mpath href="#${s.id}"/></animateMotion>` +
      `<animate attributeName="opacity" dur="${T}s" begin="${begin}s" values="${fade}" repeatCount="indefinite"/>` +
      `<ellipse class="flare" rx="${n(28 + rand() * 20)}" ry="${n(3.4 + rand() * 1.6)}" fill="url(#knot)" style="animation-duration:${19 + j * 7}s;animation-delay:-${Math.round(rand() * 40)}s"/></g>`
    )
  })
  .join('')

// Light that went round the back of the hole: the far side's underneath,
// seen as a thin ring just outside the shadow, widest at the bottom.
const ECHO = bands([5.95, 6.6, 7.6, 9, 11], 1, [0.6, 0.4, 0.2, 0.08], 0.4) + flow(ECHOES, false, 0.55)

// ---- Stars -------------------------------------------------------------------

const TINTS = ['#ffffff', '#dfe7ff', '#fff1dc', '#cfdcff', '#ffe6c8', '#ffd9b8']
const BAND = 330

// Stars near the hole travel on rows: each row is a straight line of
// background sky as the hole's gravity redraws it, bulging round the
// Einstein ring. The stars are dots dashed along the row; close to the ring
// a second stroke stretches each one into an arc.
const ROWS = Array.from({ length: 26 }, (_, i) => {
  let sy = (rand() * 2 - 1) * BAND
  if (Math.abs(sy) < 9) sy = sy < 0 ? -9 - rand() * 6 : 9 + rand() * 6
  const near = Math.abs(sy) < 180
  const raw: P2[] = []
  for (let sx = -(CX + 120); sx <= DRIFT - CX - 120; sx += near ? 3 : 10) raw.push(lensed(sx, sy, EIN))

  return { id: `r${i.toString(36)}`, sy, d: pathD(simplifyOpen(raw, near ? 0.5 : 1.2), false) }
})
const rowDefs = ROWS.map(r => `<path id="${r.id}" pathLength="${DRIFT}" d="${r.d}"/>`).join('')
const starRows = ROWS.map(r => {
  const count = 7 + Math.floor(rand() * 6)
  const cuts = Array.from({ length: count }, () => 70 + rand() * rand() * 500)
  const sum = cuts.reduce((a, b) => a + b, 0)
  const gaps = cuts.map(c => Math.round((c / sum) * DRIFT))
  gaps[0] = (gaps[0] as number) + DRIFT - gaps.reduce((a, b) => a + b, 0)
  const w = 0.9 + Math.pow(rand(), 3) * 1.7
  const o = n(0.5 + rand() * 0.5)
  const dash = (len: number) => gaps.map(g => `${len} ${g - len}`).join(' ')
  const use = (cls: string, paint: string, width: number, len: number) =>
    `<use href="#${r.id}" class="${cls}" stroke="${paint}" stroke-width="${n(width)}" stroke-opacity="${o}" stroke-dasharray="${dash(len)}"/>`

  return (
    use('fd', TINTS[pick(TINTS.length)] as string, w, 0) +
    (Math.abs(r.sy) < 180 ? use('fa', 'url(#arc)', w * 0.6, 16) : '') +
    (Math.abs(r.sy) < 50 ? use('fb', 'url(#arc2)', w * 0.5, 40) : '')
  )
}).join('')

// Background light smeared round the Einstein ring, and the faint second
// images that crowd in toward the shadow.
function smears(): string {
  const arcs = (r: number, long: number, gap: number, o: number, w: number, i: number) => {
    const c = 2 * Math.PI * r
    const parts = Array.from({ length: 5 }, () => [4 + rand() * long, 40 + rand() * gap]).flat()
    const k = c / parts.reduce((a, b) => a + b, 0)

    return `<circle r="${n(r)}" stroke="${TINTS[i % TINTS.length]}" stroke-opacity="${n(o)}" stroke-width="${n(w)}" stroke-dasharray="${parts.map(v => n(v * k)).join(' ')}" transform="rotate(${Math.round(rand() * 360)})"/>`
  }
  let out = ''
  for (let i = 0; i < 7; i++) out += arcs(EIN - 2 + rand() * 12, 50, 300, 0.05 + rand() * 0.1, 0.5 + rand() * 0.4, i)
  for (let i = 0; i < 3; i++) out += arcs(RSP + 6 + Math.pow(rand(), 1.6) * (EIN - RSP - 30), 12, 240, 0.05 + rand() * 0.08, 0.5 + rand() * 0.3, i)

  return out
}

// The sky away from the hole: one tile, drawn twice and slid along at the
// speed of the rows.
function farTile(): string {
  const buckets: string[][] = Array.from({ length: 6 }, () => [])
  const free = 1000 - 2 * BAND
  let bright = ''
  let cores = ''
  for (let i = 0; i < 400; i++) {
    const x = Math.round(rand() * DRIFT)
    const v = rand() * free
    const y = Math.round(v < CY - BAND ? v : v + 2 * BAND)
    if (i < 7) bright += `<circle cx="${x}" cy="${y}" r="${n(5 + rand() * 5)}" fill="url(#sth)"/>`
    if (i < 7) cores += `M${x} ${y}h0`
    else (buckets[Math.floor(Math.pow(rand(), 2.4) * 6)] as string[]).push(`M${x} ${y}h0`)
  }
  const stars = buckets.map((b, j) => `<path d="${b.join('')}" stroke="${TINTS[j % TINTS.length]}" stroke-width="${n(0.8 + j * 0.3)}" stroke-opacity="${n(0.5 + j * 0.1)}"/>`).join('')
  let clouds = ''
  for (let i = 0; i < 7; i++) {
    const x = rand() * DRIFT
    const y = rand() * 1000
    const rx = 300 + rand() * 420
    clouds += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * (0.3 + rand() * 0.25))}" fill="url(#neb${i % 3})" transform="rotate(${n((rand() - 0.5) * 30)} ${n(x)} ${n(y)})"/>`
  }

  return `<g>${clouds}</g><g stroke-linecap="round">${stars}${bright}<path d="${cores}" stroke="#fff6ea" stroke-width="2.6"/></g>`
}

// Day only: the nebula behind, its light drawn out into arcs round the hole.
const SWIRL = Array.from({ length: 24 }, (_, i) => {
  const r = 180 + Math.pow(rand(), 0.8) * 760
  const rx = r * (0.45 + rand() * 0.55)

  return `<ellipse cy="${n(-r)}" rx="${n(rx)}" ry="${n(16 + r * (0.03 + rand() * 0.06))}" fill="url(#neb${i % 3})" transform="rotate(${Math.round(rand() * 360)})"/>`
}).join('')

// ---- A far world, for scale ----------------------------------------------------

function world(x: number, y: number, r: number, thin: number): string {
  const turn = (Math.atan2(CY - y, CX - x) * 180) / Math.PI - 180

  return (
    `<g transform="translate(${x} ${y}) rotate(${n(turn)})">` +
    `<circle r="${n(r * 1.5)}" fill="url(#w-air)"/>` +
    `<circle r="${r}" class="w-body"/>` +
    `<path d="M0 ${-r}A${r} ${r} 0 0 0 0 ${r}A${n(r * (1 - thin))} ${r} 0 0 1 0 ${-r}Z" fill="url(#w-lit)"/>` +
    `<path d="M0 ${-r}A${r} ${r} 0 0 0 0 ${r}" fill="none" class="w-rim" stroke-width=".8"/></g>`
  )
}

// ---- Scene -------------------------------------------------------------------

const CSS = `
.fl { animation: fl linear infinite; stroke-linecap: round; }
@keyframes fl { to { stroke-dashoffset: -100; } }
.fd { animation: fd ${DRIFT}s steps(${DRIFT * 2}) infinite; }
@keyframes fd { to { stroke-dashoffset: -${DRIFT}; } }
.fa { animation: fa ${DRIFT}s steps(${DRIFT * 2}) infinite; }
@keyframes fa { from { stroke-dashoffset: 8; } to { stroke-dashoffset: ${8 - DRIFT}; } }
.fb { animation: fb ${DRIFT}s steps(${DRIFT * 2}) infinite; }
@keyframes fb { from { stroke-dashoffset: 20; } to { stroke-dashoffset: ${20 - DRIFT}; } }
.far { animation: far ${DRIFT}s steps(${DRIFT * 2}) infinite; }
@keyframes far { from { transform: translateX(0); } to { transform: translateX(${DRIFT}px); } }
.flare { animation: flare ease-in-out infinite; }
@keyframes flare { 0%, 60%, 100% { opacity: .6; } 78% { opacity: 1; } }
.shim { animation: shim 9s ease-in-out infinite alternate; }
@keyframes shim { from { opacity: .72; } to { opacity: 1; } }
.turn { animation: spin 140s linear infinite; }
.sky { fill: var(--sky); }
.night { display: var(--night); }
.day { display: var(--day); }
.lane { stroke: var(--lane); }
.w-body { fill: var(--w-body); }
.w-rim { stroke: var(--w-rim); }
.h0 { stop-color: var(--h0); } .h1 { stop-color: var(--h1); } .h2 { stop-color: var(--h2); } .h3 { stop-color: var(--h3); }
.w0 { stop-color: var(--w0); } .w1 { stop-color: var(--w1); } .w2 { stop-color: var(--w2); }
.g0 { stop-color: var(--g0); } .g1 { stop-color: var(--g1); }
.e0 { stop-color: var(--e0); } .e1 { stop-color: var(--e1); }
.n0 { stop-color: var(--n0); } .n1 { stop-color: var(--n1); } .n2 { stop-color: var(--n2); }
.q0 { stop-color: var(--q0); } .q1 { stop-color: var(--q1); }
.c0 { stop-color: var(--c0); } .rg { stop-color: var(--rg); }
${stopCss}
${dashCss}
@media (max-aspect-ratio: 4/3) { .sys { transform: translateX(80px); } }
@media (max-aspect-ratio: 6/5) { .sys { transform: translateX(170px); } }
@media (max-aspect-ratio: 1/1) { .sys { transform: translateX(270px); } }
@media (max-aspect-ratio: 3/4) { .sys { transform: translateX(520px); } }
:root, svg {
  --sky:#f1e2be; --day:inline; --night:none; --lane:#7a3d0a38; --w-body:#3a2610; --w-rim:#f6cf8a; --w0:#f3c06a; --w1:#b8742a; --w2:#ffffff59;
  --h0:#ffffffff; --h1:#fffaeccc; --h2:#fff1cf66; --h3:#fff1cf00; --g0:#ffffffd9; --g1:#fff7e24d; --e0:#f1e2be00; --e1:#d29a44d9;
  --n0:#ffffff73; --n1:#fff6dc73; --n2:#e3b96a4d; --q0:#ffffffff; --q1:#f3c268ff; --c0:#ffffff; --rg:#ffffff;
  ${vars.day.join(';')};
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --sky:#020203; --day:none; --night:inline; --lane:#1a080038; --w-body:#040305; --w-rim:#ffcf8a; --w0:#fff0cf; --w1:#ffb055; --w2:#ffb86633;
    --h0:#ffcf941c; --h1:#ff9a4a16; --h2:#d95a1e0d; --h3:#d95a1e00; --g0:#fff3e080; --g1:#ffcf9426; --e0:#00000000; --e1:#00000099;
    --n0:#8f7dff0a; --n1:#ffb98209; --n2:#6f9cff09; --q0:#ffffffff; --q1:#ffb45cff; --c0:#fffaf0; --rg:#ffb46a;
    ${vars.night.join(';')};
  }
}
`

const fade = (id: string, cls: string) =>
  `<radialGradient id="${id}"><stop offset="0" class="${cls}"/><stop offset="1" class="${cls}" stop-opacity="0"/></radialGradient>`

const defs =
  GRADS +
  `<radialGradient id="halo"><stop offset="0" class="h0"/><stop offset=".3" class="h1"/><stop offset=".62" class="h2"/><stop offset="1" class="h3"/></radialGradient>` +
  `<radialGradient id="edge" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="1500"><stop offset=".3" class="e0"/><stop offset="1" class="e1"/></radialGradient>` +
  `<radialGradient id="hot"><stop offset="0" class="g0"/><stop offset=".45" class="g1"/><stop offset="1" class="g1" stop-opacity="0"/></radialGradient>` +
  fade('neb0', 'n0') +
  fade('neb1', 'n1') +
  fade('neb2', 'n2') +
  `<linearGradient id="pr" gradientUnits="userSpaceOnUse" x1="${n(-RS)}" x2="${n(RS)}"><stop offset="0" class="q0"/><stop offset="1" class="q1"/></linearGradient>` +
  `<radialGradient id="core"><stop offset="0" class="c0" stop-opacity=".95"/><stop offset=".4" class="c0" stop-opacity=".5"/><stop offset="1" class="c0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="rgl"><stop offset=".666" class="rg" stop-opacity="0"/><stop offset=".667" class="rg" stop-opacity=".38"/><stop offset=".74" class="rg" stop-opacity=".12"/><stop offset="1" class="rg" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="knot"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff" stop-opacity=".85"/><stop offset=".55" stop-color="#ffe6b8" stop-opacity=".45"/><stop offset="1" stop-color="#ffc878" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="arc" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${n(EIN * 1.5)}"><stop offset=".66" stop-color="#fff" stop-opacity=".6"/><stop offset=".78" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="arc2" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${n(EIN * 1.22)}"><stop offset=".82" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="w-air"><stop offset=".5" class="w2"/><stop offset="1" class="w2" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="w-lit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="w0"/><stop offset=".6" class="w1"/><stop offset="1" class="w1" stop-opacity=".2"/></linearGradient>` +
  streakDefs +
  rowDefs +
  `<radialGradient id="sth"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".3" stop-color="#cfe0ff" stop-opacity=".14"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>` +
  `<g id="tile">${farTile()}</g>`

const at = `translate(${CX} ${CY}) rotate(${ROLL}) scale(${Math.round(K * 1000) / 1000})`

const body =
  `<rect width="1600" height="1000" class="sky"/>` +
  `<g class="night"><g class="far"><use href="#tile"/><use href="#tile" x="-${DRIFT}"/></g></g>` +
  `<g class="sys">` +
  `<g transform="${at}" fill="none" stroke-linejoin="round">` +
  `<ellipse rx="900" ry="360" fill="url(#halo)"/><ellipse cx="-60" rx="420" ry="250" fill="url(#halo)"/><ellipse class="day" cx="-110" cy="-30" rx="250" ry="170" fill="url(#halo)"/>` +
  `<ellipse rx="900" ry="34" fill="url(#halo)" opacity=".7"/>` +
  `<g class="day">${SWIRL}</g>` +
  `<ellipse cx="${n(-8 * M)}" cy="${-M}" rx="${14 * M}" ry="${9 * M}" fill="url(#hot)"/>` +
  `</g>` +
  `<g class="night" transform="translate(${CX} ${CY})" fill="none" stroke-linecap="round">${starRows}<g stroke-linecap="butt">${smears()}</g></g>` +
  `<g transform="${at}" fill="none" stroke-linejoin="round" fill-rule="evenodd">` +
  `<circle r="${n(RS)}" fill="#000"/><circle r="${n(RS * 1.5)}" fill="url(#rgl)"/>` +
  `<g class="shim"><circle r="${n(RS + 0.4)}" stroke="url(#pr)" stroke-width="1.1"/><circle r="${n(RS + 1.2)}" stroke="url(#pr)" stroke-opacity=".3" stroke-width="3"/></g>` +
  `<g class="turn"><circle r="${n(RS + 0.5)}" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" stroke-dasharray="14 52 30 80 8 61 22 97"/></g>` +
  ECHO +
  BODY +
  SOFT +
  FLOW +
  KNOTS +
  `<ellipse cx="${n(-10.2 * M)}" cy="${n(-0.4 * M)}" rx="${n(4.9 * M)}" ry="${n(4.4 * M)}" fill="url(#hot)"/>` +
  `<ellipse cx="${n(-8.2 * M)}" cy="${n(-0.7 * M)}" rx="${n(2.9 * M)}" ry="${n(2.6 * M)}" fill="url(#core)"/>` +
  `</g></g>` +
  `<rect width="1600" height="1000" fill="url(#edge)"/>` +
  world(1338, 706, 27, 0.3) +
  world(1398, 668, 4.5, 0.4)

const SCENE = svg(CSS, defs, body)

export const SPACE_BLACKHOLE: Look = {
  label: 'Black hole',
  args: { colors: theme, backdrop: { scene: 'space-blackhole', glass: { blur: 26, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
