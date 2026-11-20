import { makeColors } from './make-colors.js'
import { blob, closedCurve, n, seeded, type Pt } from './kit'
import type { Look } from './look'
import {
  PALM_DEFS,
  PEOPLE_DEFS,
  STALL_DEFS,
  SWIFT,
  koutoubia,
  lampPost,
  macaques,
  palm,
  people,
  st,
  stalls,
  carts,
  ORANGES,
  Sheet,
  type Stand,
  teaWindow,
  walker,
  GAIT_CSS,
  stopCss,
} from './morocco-marrakech-parts'

// Marrakech: from a café terrace on the edge of Jemaa el-Fna, looking across
// the square to the Koutoubia, the red medina and the snow of the High Atlas.
// Day is late afternoon gold with the sun low on the right; night is the
// square as a lake of warm light under its smoke, the minaret floodlit, a
// young crescent over the west.
const { theme, problems } = makeColors({
  label: 'Marrakech',
  roles: { accent: '#c8553d', danger: '#c62f2f', success: '#3f8f4e', warning: '#c98a14', pro: '#7a5ab8' },
  light: {
    roles: { accent: '#a8432f' },
    gray: {
      anchors: {
        'surface-0': '#f1e6da',
        'surface-1': '#f6ede3',
        'surface-2': '#fbf5ee',
        'text-primary': '#2b1d17',
        'text-secondary': '#4e3a30',
        'text-muted': '#6a5348',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1a1216',
        'surface-1': '#22181c',
        'surface-2': '#2a1e22',
        'surface-3': '#302226',
        'text-primary': '#f3e6dc',
        'text-secondary': '#d2c0b4',
        'text-muted': '#ab978b',
      },
    },
  },
})

const HZ = 482

// A tile of soft dots for weathering, in the given colour: the dots fall
// into four opacity steps, one path per step, so the tile draws four shapes.
function speckle(id: string, seed: number, color: string, size: number, dots: number, maxR: number, opacity: number): string {
  const rand = seeded(seed)
  const steps: string[][] = [[], [], [], []]
  for (let i = 0; i < dots; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 0.3 + rand() * maxR
    const a = rand()
    steps[Math.min(3, Math.floor(a * 4))]!.push(`M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`)
  }
  return (
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="${color}">` +
    steps.map((list, i) => (list.length ? `<path fill-opacity="${Math.round(((i + 0.5) / 4) * opacity * 100) / 100}" d="${list.join('')}"/>` : '')).join('') +
    `</g></pattern>`
  )
}

// ------------------------------------------------------------------ sky

const rs = seeded(7)
const stars = [0, 1, 2]
  .map(layer => {
    const d = Array.from({ length: [56, 24, 10][layer] as number }, () => {
      const x = rs() * 1600
      const y = Math.pow(rs(), 1.3) * 400
      return Math.hypot(x - 1330, y - 160) < 60 ? '' : `M${Math.round(x)} ${Math.round(y)}h.01`
    }).join('')
    return `<path class="star s${layer}" d="${d}"/>`
  })
  .join('')
const twinkles = Array.from({ length: 7 }, (_, i) => {
  const x = 60 + rs() * 1480
  const y = 20 + rs() * 300
  return `<path class="star s2 tw" style="animation-duration:${n(3 + rs() * 5)}s;animation-delay:-${n(i * 1.3)}s" d="M${n(x)} ${n(y)}h.01"/>`
}).join('')

// A young crescent low in the west, its lit limb toward the set sun, with
// earthshine on the dark part.
const MOON = { x: 1332, y: 168, r: 15 }
const moon =
  `<circle cx="${MOON.x}" cy="${MOON.y}" r="120" fill="url(#m-moonglow)"/>` +
  `<circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" class="earthshine"/>` +
  // the lit disc less the same disc shifted up and left, as one outline
  `<path class="moon" d="M${MOON.x + 6.27} ${MOON.y - 13.62}A15 15 0 1 1 ${MOON.x - 12.27} ${MOON.y + 8.62}A15 15 0 0 0 ${MOON.x + 6.27} ${MOON.y - 13.62}Z"/>`

const clouds = [
  { x: 120, y: 92, w: 260, h: 16, d: 160 },
  { x: 260, y: 140, w: 180, h: 10, d: 190 },
  { x: 1180, y: 70, w: 300, h: 18, d: 210 },
  { x: 1310, y: 118, w: 200, h: 11, d: 170 },
  { x: 700, y: 54, w: 240, h: 9, d: 230 },
]
  .map(
    (c, i) =>
      `<ellipse class="cloud" style="animation-duration:${c.d}s;animation-delay:-${i * 37}s" cx="${c.x}" cy="${n(c.y - c.h * 0.15)}" rx="${c.w / 2}" ry="${n(c.h * 1.15)}" fill="url(#m-cloud)"/>`,
  )
  .join('')

// --------------------------------------------------------------- Atlas

// A mountain range as a chain of peaks and cols, each segment roughened,
// with a spur running down from every summit. The spur splits the peak into
// a sunlit right face and a shaded left face.
// A rough line from a to b: midpoint displacement, three levels deep, the
// kinks pushed mostly up and down like rock steps and shoulders.
function rough(a: Pt, b: Pt, rand: () => number): Pt[] {
  let pts: Pt[] = [a, b]
  let amp = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22
  for (let k = 0; k < 2; k++) {
    const out: Pt[] = [pts[0] as Pt]
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1] as Pt
      const q = pts[i] as Pt
      out.push([(p[0] + q[0]) / 2 + (rand() - 0.5) * amp * 0.4, (p[1] + q[1]) / 2 + (rand() - 0.5) * amp], q)
    }
    pts = out
    amp *= 0.5
  }
  return pts
}

type Range = { pts: Pt[]; shade: string; spurs: { x: number; y: number }[] }

function range(seed: number, top: (x: number) => number, gap: [number, number], drop: [number, number], depth: number): Range {
  const rand = seeded(seed)
  const peaks: Pt[] = []
  let x = -60 + rand() * 40
  while (x < 1700) {
    peaks.push([x, top(x) + (rand() - 0.5) * 26])
    x += gap[0] + rand() * (gap[1] - gap[0])
  }
  const pts: Pt[] = []
  const shade: string[] = []
  const spurs: { x: number; y: number }[] = []
  let prevCol: Pt | null = null
  let colIdx = 0
  peaks.forEach((p, j) => {
    const next = peaks[j + 1]
    // col to the left was pushed already; now walk up to the peak and down to the next col
    const startIdx = pts.length
    pts.push(p)
    const peakIdx = pts.length - 1
    if (prevCol) {
      // roughen the climb from the previous col to this summit
      const seg = pts.splice(colIdx + 1)
      const c = prevCol
      pts.push(...rough(c, p, rand).slice(1, -1), ...seg)
    }
    const pi = prevCol ? pts.length - 1 : peakIdx
    const sx = p[0] - 4 + rand() * 6
    const sy = p[1] + depth * (0.55 + rand() * 0.35)
    spurs.push({ x: sx, y: sy })
    // the left face, from the col up to the summit and down the spur
    const from = prevCol ? colIdx : startIdx
    shade.push(`M${line(pts.slice(from, pi + 1))}L${Math.round(sx)} ${Math.round(sy)}Z`)
    if (next) {
      const col: Pt = [(p[0] + next[0]) / 2 + (rand() - 0.5) * 20, Math.max(p[1], next[1]) + drop[0] + rand() * (drop[1] - drop[0])]
      pts.push(...rough(p, col, rand).slice(1))
      colIdx = pts.length - 1
      prevCol = col
    }
  })
  return { pts, shade: shade.join(''), spurs }
}

// Whole pixels are plenty at this distance and keep the scene small.
const line = (pts: readonly Pt[]) => pts.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')
const whole = (d: string) => d.replace(/-?\d+\.\d+/g, v => String(Math.round(Number(v))))

const far = range(3, x => 384 + 16 * Math.sin(x / 260 + 0.6) - 26 * Math.exp(-(((x - 1150) / 190) ** 2)) - 14 * Math.exp(-(((x - 360) / 150) ** 2)), [120, 230], [10, 26], 80)
const mid = range(9, x => 448 + 8 * Math.sin(x / 150 + 1), [120, 220], [6, 14], 30)
const SNOW = 404

// Snow above the snowline, reaching down in tongues along the spurs and
// gullies; shaded where it lies on a left face.
function snow(r: Range): string {
  const rand = seeded(41)
  const bot = r.pts.map(([x, y]) => {
    let jag = (rand() - 0.5) * 7
    for (const s of r.spurs) jag += (s.y - SNOW) * 0.7 * Math.exp(-(((x - s.x) / 9) ** 2))
    if (rand() < 0.2) jag += 6 + rand() * 12
    return Math.max(y, SNOW + jag)
  })
  const field = `M${line(r.pts)}L${line(r.pts.map(([x], i) => [x, bot[i] as number] as Pt).reverse())}Z`
  return `<clipPath id="m-snowc"><path id="m-snowf" d="${field}"/></clipPath><use href="#m-snowf" class="sn"/><use href="#m-mtshp" class="snsh" clip-path="url(#m-snowc)"/>`
}

const atlas =
  `<path fill="url(#m-mt)" d="M${line(far.pts)}V520H-20Z"/>` +
  `<defs><path id="m-mtshp" d="${far.shade}"/></defs><use href="#m-mtshp" fill="url(#m-mtsh)"/>` +
  snow(far) +
  `<rect x="0" y="380" width="1600" height="140" fill="url(#m-haze1)"/>` +
  `<path fill="url(#m-hill)" d="M${line(mid.pts)}V520H-20Z"/>` +
  `<path fill="url(#m-hillsh)" d="${mid.shade}"/>` +
  `<rect x="0" y="420" width="1600" height="110" fill="url(#m-haze2)"/>`

// ------------------------------------------------------- the far medina

// The medina's low skyline beyond the square: flat roofs, a speck of dish
// here and there, a few small square minarets and palm tops, all in haze.
function farCity(): string {
  const rand = seeded(17)
  const by = 512
  const walls: string[][] = [[], [], [], []]
  const lit: string[] = []
  const dishes: string[] = []
  const wins: string[] = []
  let x = -10
  while (x < 1610) {
    const w = 10 + rand() * 30
    const t = 478 + rand() * 14 - (rand() < 0.1 ? 8 : 0)
    walls[Math.floor(rand() * 4)]!.push(`M${n(x)} ${by}V${n(t)}h${n(w + 0.6)}V${by}Z`)
    lit.push(`M${n(x + w - 2)} ${n(t)}h2V${by}h-2Z`)
    if (rand() < 0.3) dishes.push(`M${n(x + 3 + rand() * (w - 6))} ${n(t - 1.2)}h2.4`)
    if (rand() < 0.5) wins.push(`M${n(x + 2 + rand() * (w - 4))} ${n(t + 4 + rand() * 8)}h1.6`)
    x += w
  }
  // the three small minarets and the palm tops, one path per paint for all
  const mins: [number, number][] = [
    [612, 22],
    [1006, 18],
    [1418, 26],
  ]
  const mPart = (f: (mx: number, t: number) => string) => mins.map(([mx, h]) => f(mx, 482 - h)).join('')
  const palms = [520, 860, 1090, 1300, 1460].map((px, i): Pt => [px, 466 - (i % 3) * 5])
  const pPart = (f: (px: number, py: number) => string) => palms.map(([px, py]) => f(px, py)).join('')
  return (
    walls.map((list, i) => `<path class="c${i}" d="${whole(list.join(''))}"/>`).join('') +
    `<path class="clit" d="${whole(lit.join(''))}"/>` +
    `<path class="cdish" d="${whole(dishes.join(''))}"/>` +
    `<path class="cwin" d="${whole(wins.join(''))}"/>` +
    `<path class="c2" d="${mPart((mx, t) => `M${mx} ${by}V${t}h8V${by}ZM${mx + 2.5} ${t}v-5h3v5ZM${mx - 0.5} ${t}h9v-1.5h-9Z`)}"/>` +
    `<path class="clit" d="${mPart((mx, t) => `M${mx + 6} ${by}V${t}h2V${by}Z`)}"/>` +
    `<path class="ctile" d="${mPart((mx, t) => `M${mx} ${t + 2}h8v2h-8Z`)}"/>` +
    `<path class="cgold" d="${mPart((mx, t) => `M${mx + 4} ${t - 5}v-3`)}"/>` +
    `<path class="ctr" d="${pPart((px, py) => `M${px} ${by}Q${px + 1} ${py + 10} ${px + 1.5} ${py}`)}"/>` +
    `<path class="cpalm" d="${pPart((px, py) => `M${px + 1.5} ${py}q-6-4-11 1M${px + 1.5} ${py}q-4-6-8-6M${px + 1.5} ${py}q1-7 4-8M${px + 1.5} ${py}q6-5 10-2M${px + 1.5} ${py}q7-1 10 5`)}"/>` +
    `<rect x="0" y="460" width="1600" height="60" fill="url(#m-haze3)"/>`
  )
}

// ------------------------------------------- the Koutoubia and its mosque

const KX = 236
const KB = 560
const KW = 74

// The prayer hall's long pisé wall and its rows of green-tiled roofs.
function mosque(): string {
  const gables = Array.from({ length: 15 }, (_, i) => {
    const x = -14 + i * 22
    return `M${x} 500L${x + 11} 491L${x + 22} 500Z`
  }).join('')
  const ridges = Array.from({ length: 15 }, (_, i) => `M${-14 + i * 22 + 11} 491l6 -1.4`).join('')
  return (
    `<path class="mtile" d="${gables}"/><path class="mtileh" d="${ridges}"/>` +
    `<rect class="w1" x="-20" y="499" width="${KX - 20}" height="70"/><rect class="w2" x="${KX + 34}" y="503" width="120" height="66"/>` +
    `<path class="mtile" d="M${KX + 34} 503l8-7h104l8 7Z"/>` +
    `<rect x="-20" y="499" width="400" height="70" fill="url(#m-wallshade)"/>`
  )
}

// The Koutoubia gardens' orange trees and hedges in a dark band at the
// minaret's foot, their tops catching the sun from the right.
function treeLine(): string {
  const rand = seeded(13)
  const top: Pt[] = []
  const hi: string[] = []
  for (let x = -20; x <= 310; x += 14 + rand() * 12) {
    const y = 552 + rand() * 14
    top.push([x, y])
    hi.push(`M${n(x + 2)} ${n(y + 3)}q6-7 12-1`)
  }
  const d = `M-20 610L${top.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}L310 610Z`
  return `<path class="hedge" d="${d}"/><path class="hedgeh" d="${hi.join('')}"/><path d="${d}" fill="url(#m-wallshade)"/>`
}

// ------------------------------------------- the buildings across the square

function acrossSquare(): string {
  const rand = seeded(29)
  const out: Record<string, string[]> = { w1: [], w4: [], w5: [] }
  const lit: string[] = []
  const awn: string[] = []
  let x = 292
  while (x < 1200) {
    const w = 58 + rand() * 80
    const t = 504 + rand() * 18
    const cls = ['w1', 'w4', 'w1', 'w5'][Math.floor(rand() * 4)] as string
    out[cls]!.push(`M${n(x)} 594V${n(t)}h${n(w + 0.5)}V594Z`)
    lit.push(`M${n(x)} ${n(t)}h${n(w)}v1.6h${n(-w)}Z`)
    for (let ax = x + 5; ax < x + w - 12; ax += 16) if (rand() < 0.5) awn.push(`M${n(ax - 1)} 579h13l2 5h-17Z`)
    x += w
  }
  return (
    // the buildings stand side by side, so each colour is one path
    Object.entries(out)
      .map(([cls, d]) => `<path class="${cls}" d="${d.join('')}"/>`)
      .join('') +
    `<path class="awh" d="${lit.join('')}"/>` +
    `<rect x="292" y="529" width="908" height="43" fill="url(#m-wp)"/><rect class="nt" x="292" y="529" width="908" height="43" fill="url(#m-wpn)"/>` +
    `<rect x="292" y="578" width="908" height="16" fill="url(#m-arcp)"/><path class="awn2" d="${awn.join('')}"/>` +
    // the evening shade the buildings throw toward us across the paving
    `<rect class="dy" x="292" y="593" width="908" height="22" fill="url(#m-fshade)"/>` +
    // café parasols on two terraces
    `<path class="para" d="${[372, 404, 1040, 1072, 1104].map(px => `M${px - 14} 508Q${px} 499 ${px + 14} 508Z`).join('')}"/>` +
    `<path class="post" d="${[372, 404, 1040, 1072, 1104].map(px => `M${px} 508v8`).join('')}"/>` +
    `<path class="bulbw" d="M300 560Q520 568 740 560T1180 560"/>`
  )
}

// ------------------------------------------------------------ the square

// Bulbs along a sagging wire, added to the row's sheet so all the wires of
// a row are one path and all its bulbs another.
function bulbs(sheet: Sheet, x0: number, x1: number, y: number, sag: number, k: number, seed: number): void {
  const rand = seeded(seed)
  const pts = Array.from({ length: k }, (_, i) => {
    const t = (i + 0.5) / k
    const x = x0 + (x1 - x0) * t
    return [x, y + sag * 4 * t * (1 - t)] as Pt
  })
  const dots = (list: Pt[]) => list.map(([x, yy]) => `M${n(x)} ${n(yy + 2)}h.01`).join('')
  const steady = pts.filter((_, i) => i % 4 !== 2)
  const flick = pts.filter((_, i) => i % 4 === 2)
  const mx = (x0 + x1) / 2
  sheet.add('wire', `M${n(x0)} ${n(y)}Q${n(mx)} ${n(y + sag * 2)} ${n(x1)} ${n(y)}`)
  sheet.raw('bulb', dots(steady))
  sheet.raw(`bulb tw2 t${Math.floor(rand() * 3)}`, dots(flick))
}

// Each puff's drift and timing, as rules for the stylesheet.
const PUFFS: string[] = []

// A smoke plume from a grill: soft puffs rising, swelling and thinning,
// drifting west on the evening air.
function plume(x: number, y: number, k: number, size: number, seed: number, rise = 170): string {
  const rand = seeded(seed)
  const dur = 10 + rand() * 6
  return Array.from({ length: k }, (_, i) => {
    const dx = -(30 + rand() * 50)
    const u = `u${PUFFS.length}`
    PUFFS.push(`.${u}{--dx:${Math.round(dx)}px;--rise:-${Math.round(rise * (0.8 + rand() * 0.4))}px;animation-duration:${Math.round(dur)}s;animation-delay:-${Math.round((i / k) * dur)}s}`)
    return `<g class="puff ${u}"><circle cx="${n(x + (rand() - 0.5) * 6)}" cy="${y}" r="${n(size)}" fill="url(#m-smoke)"/></g>`
  }).join('')
}

type Row = { y: number; s: number; xs: number[] }
function rowXs(seed: number, s: number): number[] {
  const rand = seeded(seed)
  const xs: number[] = []
  let x = 326 + rand() * 20
  while (x < 1080) {
    const k = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < k && x < 1090; i++) {
      xs.push(Math.round(x))
      x += 60 * s + 1
    }
    x += 18 + rand() * 46
  }
  return xs
}
const ROWS: Row[] = [
  { y: 646, s: 0.64, xs: rowXs(2, 0.64) },
  { y: 690, s: 0.76, xs: rowXs(5, 0.76) },
  { y: 742, s: 0.9, xs: rowXs(8, 0.9) },
]

function square(): string {
  const rand = seeded(57)
  const parts: string[] = []
  // the floor, its long shadows, and at night the lake of light
  parts.push(`<rect x="280" y="584" width="1320" height="300" fill="url(#m-floor)"/><rect x="280" y="584" width="1320" height="300" fill="url(#m-pave)"/>`)
  parts.push(`<g class="nt"><ellipse cx="720" cy="700" rx="700" ry="200" fill="url(#m-lake)"/><ellipse cx="400" cy="740" rx="300" ry="110" fill="url(#m-lake)"/><ellipse cx="740" cy="590" rx="520" ry="40" fill="url(#m-lake)"/></g>`)
  // the calèche along the far edge
  parts.push(
    `<g class="cal"><g class="trot"><use href="#m-cal" class="calu" transform="translate(-60 597) scale(.95)"/></g></g>` +
      '',
  )
  // a storyteller's ring and the black umbrellas of the day's performers
  const ring = Array.from({ length: 12 }, (_, i): Stand => {
    const a = (i / 12) * Math.PI * 2
    return [402 + Math.cos(a) * 26, 622 + Math.sin(a) * 6, i % 3, i]
  })
  parts.push(people([...ring, [402, 622, 0, 5, 1.12]]))
  const umbs: Pt[] = [
    [352, 612],
    [1118, 618],
    [1160, 640],
  ]
  parts.push(
    `<g class="dy"><path class="umb" d="${umbs.map(([x, y]) => `M${x - 15} ${y - 18}Q${x} ${y - 30} ${x + 15} ${y - 18}Q${x} ${y - 21} ${x - 15} ${y - 18}Z`).join('')}"/>` +
      `<path class="post" d="${umbs.map(([x, y]) => `M${x} ${y - 19}V${y}`).join('')}"/>${people(umbs.map(([x, y]) => [x - 4, y, 0, 1]))}</g>`,
  )
  // far scattered people
  const farStand: Stand[] = []
  for (let i = 0; i < 16; i++) {
    const x = 300 + rand() * 880
    const y = 600 + rand() * 40
    farStand.push([x, y, Math.floor(rand() * 3), Math.floor(rand() * 6)])
  }
  const far: string[] = [people(farStand)]
  // and people crossing the open ground between the far stalls and the
  // storyteller, kept to the sides of the picture
  ;[
    [560, 604],
    [470, 630],
    [1130, 612],
    [1060, 634],
    [330, 640],
  ].forEach(([x, y], i) => far.push(walker(x!, y!, i % 3, i + 2, i)))
  parts.push(far.join(''))
  // stall rows, each with people in front, bulbs over it and smoke
  ROWS.forEach((r, ri) => {
    const row = stalls(r.xs, r.y, r.s)
    const wireY = r.y - 44 * r.s
    const runs: number[][] = []
    r.xs.forEach((x, i) => {
      if (i && x - (r.xs[i - 1] as number) < 62 * r.s) runs[runs.length - 1]!.push(x)
      else runs.push([x])
    })
    const lights = new Sheet()
    runs.forEach((xs, g) => bulbs(lights, (xs[0] as number) - 4, (xs[xs.length - 1] as number) + 64 * r.s, wireY, 3, xs.length * 4, ri * 10 + g))
    // one glow halo at night along the whole row
    const gx0 = (r.xs[0] as number) - 18
    const gx1 = (r.xs[r.xs.length - 1] as number) + 64 * r.s + 18
    const wires = `<ellipse class="nt" cx="${n((gx0 + gx1) / 2)}" cy="${n(wireY + 5)}" rx="${n((gx1 - gx0) / 2)}" ry="14" fill="url(#m-bulb)"/>` + lights.out(['wire', 'bulb'])
    const crowd: Stand[] = []
    const walkers: string[] = []
    for (let i = 0; i < 10 + ri * 2; i++) {
      const x = (r.xs[0] as number) + rand() * ((r.xs[r.xs.length - 1] as number) - (r.xs[0] as number) + 60 * r.s)
      const y = r.y + 4 + rand() * 18 * r.s
      const kind = Math.floor(rand() * 3)
      const colour = Math.floor(rand() * 6)
      if (i % 3 === 0) {
        walkers.push(walker(x, y, kind, colour, ri * 2 + i + 1))
      } else crowd.push([x, y, kind, colour, 0.92 + rand() * 0.16])
    }
    const smoke = r.xs
      .filter((_, i) => i % 3 === ri % 3)
      .map((x, i) => {
        const cx = x + 31 * r.s
        const centre = Math.abs(cx - 760) < 300
        return centre && i % 2 ? '' : plume(cx, r.y - 18 * r.s, 2, (centre ? 10 : 14) * r.s, ri * 31 + i, centre ? 110 : 190)
      })
      .join('')
    parts.push(`<g class="smk">${smoke}</g>` + row + wires + people(crowd) + walkers.join(''))
  })
  return parts.join('')
}

// The juice carts and people on the near side, left of centre.
function nearSide(): string {
  const rand = seeded(77)
  const cartRow = carts([306, 352, 398].map((x, i): Pt => [x, 812 - i * 4]), 0.98)
  const back: string[] = []
  const front: string[] = []
  const backStand: Stand[] = []
  const frontStand: Stand[] = []
  for (let i = 0; i < 9; i++) {
    const x = 300 + rand() * 240
    const y = 772 + rand() * 46
    const kind = Math.floor(rand() * 3)
    const colour = Math.floor(rand() * 6)
    if (i % 2) (y < 806 ? back : front).push(walker(x, y, kind, colour, i))
    else (y < 806 ? backStand : frontStand).push([x, y, kind, colour])
  }
  // a few people crossing the near ground, spaced out, and two talking on
  // the right
  const near =
    [
      [640, 790, 0, 3],
      [800, 814, 2, 1],
      [950, 778, 1, 4],
      [1070, 808, 0, 2],
    ]
      .map(([x, y, kind, colour], i) => walker(x!, y!, kind!, colour!, i + 2))
      .join('') +
    people([
      [1112, 790, 1, 0],
      [1124, 793, 0, 3],
    ])
  return (
    `<g class="nt">${[324, 370, 416].map(x => `<circle cx="${x}" cy="762" r="26" fill="url(#m-bulb)"/>`).join('')}</g>` +
    people(backStand) +
    back.join('') +
    cartRow +
    people(frontStand) +
    front.join('') +
    near +
    `<path class="nt bulb" d="M324 761h.01M370 757h.01M416 753h.01"/>`
  )
}

// ------------------------------------------------ the neighbouring roofs

function dish(x: number, y: number, r: number, flip = false): string {
  const f = flip ? -1 : 1
  return (
    `<path class="dpole" d="M${x} ${y + r * 0.6}v${n(r * 1.6)}M${x} ${y + r * 0.4}l${n(f * r * 1.05)} ${n(-r * 0.05)}"/>` +
    `<ellipse class="dsh2" cx="${x}" cy="${y}" rx="${n(r * 0.55)}" ry="${r}" transform="rotate(${-f * 18} ${x} ${y})"/>` +
    `<ellipse class="dface" cx="${n(x + f * 1.2)}" cy="${y}" rx="${n(r * 0.48)}" ry="${n(r * 0.95)}" transform="rotate(${-f * 18} ${x} ${y})"/>` +
    `<circle class="dpole" cx="${n(x + f * r * 1.05)}" cy="${n(y + r * 0.35)}" r="1.6"/>`
  )
}

// A shirt, a towel, a sheet or a djellaba pegged to the line, swinging from
// its top edge.
function laundry(x: number, y: number, kind: number, cls: string, i: number): string {
  const shapes = [
    `M0 0h22l2 34h-26Z`,
    `M0 0h8l2 5 4 0 2-5h8l3 10-5 2v20h-17v-20l-5-2Z`,
    `M0 0h34v46l-6 2-6-2-6 2-6-2-6 2-4-2Z`,
    `M0 0h9l3 4 3-4h9l5 14-5 1-1 41h-20l-1-41-5-1Z`,
    `M0 0h16v24h-16Z`,
  ]
  const d = shapes[kind % shapes.length] as string
  return (
    `<g transform="translate(${x} ${y})"><g class="ldry" style="animation-duration:${n(3.8 + (i % 4) * 1.1)}s;animation-delay:-${n(i * 0.9)}s">` +
    `<path class="${cls}" d="${d}"/></g></g>`
  )
}

function leftBlock(): string {
  const rugPat = `<g class="rug"><rect x="150" y="652" width="76" height="70" class="rug0"/><rect x="150" y="652" width="76" height="70" fill="url(#m-rugp)"/><path class="rugf" d="M150 722h76"/></g>`
  return (
    // the back of the roof terrace with its stair hut, behind the parapet
    `<path class="w3" d="M-10 606H300V656H-10Z"/><path class="wtop" d="M-10 603H300V607H-10Z"/>` +
    `<path class="w1" d="M180 588h74v66h-74Z"/><path class="w2" d="M254 588h12v66h-12Z"/><path class="wtop" d="M178 586h90v3h-90Z"/>` +
    `<path class="door" d="M200 654v-28a7 7 0 0 1 14 0v28Z"/>` +
    // a water tank and a dish on the roof, catching the sun on the right
    `<rect class="tank" x="60" y="626" width="40" height="22" rx="10"/><rect x="60" y="626" width="40" height="22" rx="10" fill="url(#m-tankg)"/><path class="dpole" d="M66 648v8M94 648v8"/>` +
    dish(138, 628, 15) +
    dish(268, 640, 10) +
    // the parapet and the building face seen across its roof
    `<path class="w1" d="M-10 656H300V880H-10Z"/><path class="w2" d="M300 650L326 640V870L300 880Z"/>` +
    `<path class="wtop" d="M-10 652H300L326 638V644L300 657H-10Z"/>` +
    `<path class="gt" d="M-10 657H300V662H-10Z"/>` +
    `<rect x="-10" y="656" width="310" height="224" fill="url(#m-plaster)"/>` +
    `<rect x="-10" y="656" width="310" height="224" fill="url(#m-wallshade2)"/><rect x="-10" y="656" width="310" height="224" fill="url(#m-faceg)"/>` +
    `<path class="win" d="M40 760v-36a12 13 0 0 1 24 0v36ZM232 770v-36a12 13 0 0 1 24 0v36Z"/><path class="grille" d="M40 732h24M40 744h24M52 712v48M232 742h24M232 754h24M244 722v48"/>` +
    `<path class="nt nwin" d="M232 770v-36a12 13 0 0 1 24 0v36Z"/>` +
    rugPat
  )
}

function rightBlock(): string {
  const items = [
    laundry(1250, 548, 2, 'lw', 0),
    laundry(1288, 549, 1, 'lb', 1),
    laundry(1316, 550, 0, 'lp', 2),
    laundry(1344, 551, 3, 'ly', 3),
    laundry(1374, 551, 4, 'lg', 4),
    laundry(1394, 550, 1, 'lw', 5),
    laundry(1422, 549, 0, 'lb', 6),
  ].join('')
  return (
    // the old merlon-topped tower, where the macaques sit
    `<path class="w1" d="M1520 600V426H1612V600Z"/><path class="w3" d="M1500 600V432L1520 426V600Z"/>` +
    `<path class="w1" d="M1524 426v-10h12v10ZM1546 426v-10h12v10ZM1568 426v-10h12v10ZM1590 426v-10h12v10Z"/><path class="wtop" d="M1520 425h92v2h-92Z"/>` +
    `<rect x="1500" y="420" width="112" height="180" fill="url(#m-plaster)"/>` +
    `<path class="win" d="M1556 520v-18a5 6 0 0 1 10 0v18Z"/>` +
    macaques([
      [1530, 416, 0.56, false, 'mqt mqa'],
      [1574, 416, 0.58, true, 'mqt mqb'],
      [1563, 426, 0.34, true],
    ]) +
    // the stair hut on the roof
    `<path class="w1" d="M1428 600V518h76V600Z"/><path class="w2" d="M1504 600V518l14-6V600Z"/><path class="wtop" d="M1426 516h78l14-6v3l-14 6h-78Z"/>` +
    `<path class="door" d="M1450 600v-50a10 10 0 0 1 20 0v50Z"/>` +
    dish(1476, 502, 12) +
    // the laundry line between two poles
    `<path class="dpole" d="M1244 600V544M1446 600V544"/><path class="wire2" d="M1244 547Q1345 558 1446 547"/>` +
    items +
    dish(1214, 578, 17, true) +
    dish(1254, 584, 12, true) +
    // the parapet, the face toward us, the side toward the square
    `<path class="w3" d="M1150 604L1180 598V880L1150 872Z"/>` +
    `<path class="w1" d="M1180 598H1612V880H1180Z"/>` +
    `<path class="wtop" d="M1150 601L1180 594H1612V600H1180L1150 606Z"/>` +
    `<path class="gt" d="M1180 600H1612V606H1180Z"/>` +
    `<rect x="1150" y="598" width="462" height="282" fill="url(#m-plaster)"/>` +
    `<rect x="1150" y="598" width="462" height="282" fill="url(#m-wallshade2)"/><rect x="1180" y="598" width="432" height="282" fill="url(#m-faceg)"/>` +
    // weathered plaster: damp stains low down, paler patches where it was redone
    `<path class="blot" d="${whole(blob(1290, 820, 70, 30, 3, 0.3) + blob(1500, 836, 90, 26, 4, 0.3) + blob(1200, 760, 26, 40, 6, 0.3))}"/>` +
    `<path class="blot2" d="${whole(blob(1460, 650, 40, 18, 7, 0.3) + blob(1300, 700, 30, 16, 8, 0.3))}"/>` +
    `<path class="win" d="M1240 720v-40a13 14 0 0 1 26 0v40ZM1520 718v-40a13 14 0 0 1 26 0v40Z"/>` +
    `<path class="grille" d="M1240 690h26M1240 704h26M1253 666v54M1520 688h26M1520 702h26M1533 664v54"/>` +
    // the window above the terrace, opened, with tea on its sill
    teaWindow(1370, 1430, 660, 744) +
    // the cat on the parapet, tail hanging down the wall
    `<g transform="translate(1300 595)"><g class="cattail"><path class="cat" d="M3-1q2 8-1 16q-1 5 3 7" fill="none" stroke-width="2.6" stroke-linecap="round"/></g>` +
    `<path class="catb" d="M-6 0q-2-9 2-14q-1-3 0-6l2 2.5q2-1 4 0l2-2.5q1 3 0 6q4 5 2 14Z"/><path class="catr" d="M4-13q3 5 2 13h-1.4q.6-8-1.6-12.4Z"/></g>`
  )
}

// ------------------------------------------------------------ birds

function swifts(): string {
  const rand = seeded(99)
  const flocks = [
    { x: 40, y: 30, w: 400, h: 230, k: 6 },
    { x: 1140, y: 40, w: 430, h: 260, k: 6 },
    { x: 380, y: 10, w: 900, h: 110, k: 2 },
  ]
  return flocks
    .map(f =>
      Array.from({ length: f.k }, () => {
        const pts: Pt[] = Array.from({ length: 4 }, () => [Math.round(f.x + rand() * f.w), Math.round(f.y + rand() * f.h)])
        const dur = 11 + rand() * 14
        const sc = 0.8 + rand() * 0.5
        return `<g><animateMotion dur="${n(dur)}s" begin="-${n(rand() * dur)}s" repeatCount="indefinite" rotate="auto" path="${whole(closedCurve(pts))}"/><use href="#m-sw" class="swift flick f${Math.floor(rand() * 3)}" transform="scale(${sc.toFixed(2)})"/></g>`
      }).join(''),
    )
    .join('')
}

// ------------------------------------------------------- the terrace

const parapet =
  `<rect x="-10" y="824" width="1620" height="17" class="capt"/>` +
  `<rect x="-10" y="824" width="1620" height="17" fill="url(#m-capg)"/>` +
  `<rect x="-10" y="840" width="1620" height="12" fill="url(#m-coping)"/>` +
  `<rect x="-10" y="840" width="1620" height="2" class="gth"/>` +
  `<rect x="-10" y="852" width="1620" height="160" fill="url(#m-ppface)"/>` +
  `<rect x="-10" y="852" width="1620" height="160" fill="url(#m-plaster)"/>` +
  // the joints between the cap stones, running toward us, and the sunlit
  // far arris, so the cap reads as a slab right in front of us
  `<path class="capj" d="${Array.from({ length: 15 }, (_, i) => {
    const x = 20 + i * 112
    return `M${x} 824L${n(800 + (x - 800) * 1.07)} 841`
  }).join('')}"/>` +
  `<rect x="-10" y="824" width="1620" height="1.4" class="capa"/>`

// ---------------------------------------------------------------- defs

const DEFS =
  `<linearGradient id="m-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640">${st(0, 's0')}${st(0.42, 's1')}${st(0.72, 's2')}${st(1, 's3')}</linearGradient>` +
  `<radialGradient id="m-sun" gradientUnits="userSpaceOnUse" cx="1660" cy="330" r="980">${st(0, 'sun', 'var(--sun-a)')}${st(0.35, 'sun', 'calc(var(--sun-a) * .45)')}${st(1, 'sun', 0)}</radialGradient>` +
  `<radialGradient id="m-cloud">${st(0, 'cl', 0.75)}${st(0.6, 'cl', 0.3)}${st(1, 'cl', 0)}</radialGradient>` +
  `<radialGradient id="m-moonglow">${st(0, 'mg', 0.35)}${st(0.3, 'mg', 0.1)}${st(1, 'mg', 0)}</radialGradient>` +
  `<linearGradient id="m-mt" gradientUnits="userSpaceOnUse" x1="0" y1="340" x2="0" y2="500">${st(0, 'mt0')}${st(1, 'mt1')}</linearGradient>` +
  `<linearGradient id="m-mtsh" gradientUnits="userSpaceOnUse" x1="0" y1="340" x2="0" y2="500">${st(0, 'mtsh', 0.5)}${st(1, 'mtsh', 0)}</linearGradient>` +
  `<linearGradient id="m-hill" gradientUnits="userSpaceOnUse" x1="0" y1="420" x2="0" y2="520">${st(0, 'hl0')}${st(1, 'hl1')}</linearGradient>` +
  `<linearGradient id="m-hillsh" gradientUnits="userSpaceOnUse" x1="0" y1="430" x2="0" y2="500">${st(0, 'mtsh', 0.35)}${st(1, 'mtsh', 0)}</linearGradient>` +
  `<linearGradient id="m-haze1" x1="0" y1="0" x2="0" y2="1">${st(0, 'hz', 0)}${st(0.6, 'hz', 0.4)}${st(1, 'hz', 0.8)}</linearGradient>` +
  `<linearGradient id="m-haze2" x1="0" y1="0" x2="0" y2="1">${st(0, 'hz', 0)}${st(0.6, 'hz', 0.55)}${st(1, 'hz', 0.7)}</linearGradient>` +
  `<linearGradient id="m-haze3" x1="0" y1="0" x2="0" y2="1">${st(0, 'hz', 0.25)}${st(1, 'hz', 0.45)}</linearGradient>` +
  `<radialGradient id="m-khalo" gradientUnits="userSpaceOnUse" cx="${KX}" cy="380" r="260">${st(0, 'flood', 0.3)}${st(0.5, 'flood', 0.08)}${st(1, 'flood', 0)}</radialGradient>` +
  `<linearGradient id="m-kfade" gradientUnits="userSpaceOnUse" x1="0" y1="${KB - KW * 4.35}" x2="0" y2="${KB}">${st(0, 'kfa', 'var(--kfa-a0)')}${st(1, 'kfb', 'var(--kfb-a)')}</linearGradient>` +
  `<linearGradient id="m-dome" x1="0" y1="0" x2="1" y2="0">${st(0, 'k1')}${st(0.6, 'k2')}${st(1, 'k1')}</linearGradient>` +
  `<pattern id="m-sebA" width="6.4" height="9" patternUnits="userSpaceOnUse"><path class="kp" d="M0 4.5Q1.6 1.6 3.2 0Q4.8 1.6 6.4 4.5Q4.8 7.4 3.2 9Q1.6 7.4 0 4.5Z"/></pattern>` +
  `<pattern id="m-sebB" width="3.8" height="9" patternUnits="userSpaceOnUse"><path class="kp2" d="M0 4.5Q.95 1.6 1.9 0Q2.85 1.6 3.8 4.5Q2.85 7.4 1.9 9Q.95 7.4 0 4.5Z"/></pattern>` +
  `<pattern id="m-zel" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" class="z0"/><path class="z1" d="M2.5 0L5 2.5L2.5 5L0 2.5Z"/><circle cx="2.5" cy="2.5" r=".8" class="z0"/></pattern>` +
  speckle('m-rub', 61, 'var(--rub)', 23, 18, 0.8, 0.32) +
  speckle('m-plaster', 83, 'var(--rub)', 61, 20, 1.6, 0.2) +
  `<linearGradient id="m-wallshade" x1="0" y1="0" x2="0" y2="1">${st(0, 'shd', 0)}${st(1, 'shd', 0.35)}</linearGradient>` +
  `<linearGradient id="m-wallshade2" x1="0" y1="0" x2="0" y2="1">${st(0, 'shd', 0)}${st(0.5, 'shd', 0.12)}${st(1, 'shd', 0.5)}</linearGradient>` +
  `<linearGradient id="m-floor" x1="0" y1="0" x2="0" y2="1">${st(0, 'q0')}${st(1, 'q1')}</linearGradient>` +
  speckle('m-pave', 5, 'var(--rub)', 37, 16, 0.9, 0.3) +
  `<radialGradient id="m-lake">${st(0, 'lake', 0.7)}${st(0.45, 'lake', 0.3)}${st(1, 'lake', 0)}</radialGradient>` +
  `<radialGradient id="m-bulb">${st(0, 'bulbg', 0.9)}${st(0.25, 'bulbg', 0.35)}${st(1, 'bulbg', 0)}</radialGradient>` +
  `<radialGradient id="m-smoke" fy=".62">${st(0, 'smk2', 'var(--smk-a)')}${st(0.55, 'smk', 'calc(var(--smk-a) * .5)')}${st(1, 'smk', 0)}</radialGradient>` +
  // the haze over the square: full across the middle, fading to the sides
  // and toward the top, as one radial gradient rather than a masked layer
  `<radialGradient id="m-veil" cx=".5" cy=".78" r=".62">${st(0, 'veil', 'var(--veil-a)')}${st(0.55, 'veil', 'var(--veil-a)')}${st(1, 'veil', 0)}</radialGradient>` +
  `<linearGradient id="m-tankg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>` +
  `<pattern id="m-rugp" width="19" height="14" patternUnits="userSpaceOnUse"><path class="rug1" d="M9.5 1L17 7L9.5 13L2 7Z"/><path class="rug2" d="M9.5 4L13 7L9.5 10L6 7Z"/><path class="rug3" d="M0 0h19v1.4h-19Z"/></pattern>` +
  `<linearGradient id="m-capg" x1="0" y1="0" x2="1" y2="0">${st(0, 'capl', 0.1)}${st(0.6, 'capl', 0.25)}${st(1, 'capl', 0.7)}</linearGradient>` +
  `<pattern id="m-coping" width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" class="gt"/><path class="gtd" d="M0 12V5Q0 0 8 0Q16 0 16 5V12" fill="none"/><path class="gth2" d="M3 3Q8 .8 13 3"/></pattern>` +
  // the parapet face, with the shade under the coping mixed into its top
  // stops rather than laid over it
  `<linearGradient id="m-ppface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="gppa"/><stop offset=".15" class="gppb"/>${st(1, 'pp1')}</linearGradient>` +
  `<radialGradient id="m-lglow">${st(0, 'lamp', 0.55)}${st(0.25, 'lamp', 0.2)}${st(1, 'lamp', 0)}</radialGradient>` +
  `<linearGradient id="m-room" x1="0" y1="0" x2="0" y2="1">${st(0, 'room0')}${st(0.5, 'room0')}${st(1, 'room1')}</linearGradient>` +
  `<radialGradient id="m-tglow">${st(0, 'lamp', 0.22)}${st(1, 'lamp', 0)}</radialGradient>` +
  `<linearGradient id="m-chrome" x1="0" y1="0" x2="1" y2="0">${st(0, 'ch0')}${st(0.18, 'ch1')}${st(0.4, 'ch2')}${st(0.55, 'ch0')}${st(0.78, 'ch3')}${st(0.9, 'ch4')}${st(1, 'ch1')}</linearGradient>` +
  `<linearGradient id="m-chromev" x1="0" y1="0" x2="0" y2="1">${st(0, 'chs', 0.3)}${st(0.4, 'chs', 0)}${st(0.8, 'shd', 0)}${st(1, 'shd', 0.35)}</linearGradient>` +
  `<linearGradient id="m-tea" x1="0" y1="0" x2="0" y2="1">${st(0, 'tea0')}${st(1, 'tea1')}</linearGradient>` +
  `<linearGradient id="m-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".2" stop-color="#fff" stop-opacity=".05"/><stop offset=".75" stop-color="#fff" stop-opacity=".08"/><stop offset=".88" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>` +
  `<linearGradient id="m-faceg" x1="0" y1="0" x2="1" y2="0">${st(0, 'shd', 0.22)}${st(0.6, 'shd', 0.04)}${st(1, 'sunw', 'var(--sunw-a)')}</linearGradient>` +
  `<radialGradient id="m-wash" gradientUnits="userSpaceOnUse" cx="1700" cy="420" r="1250">${st(0, 'sunw', 'var(--sunw-a)')}${st(0.5, 'sunw', 'calc(var(--sunw-a) * .35)')}${st(1, 'sunw', 0)}</radialGradient>` +
  `<linearGradient id="m-ray" x1="1" y1="0" x2="0" y2="0">${st(0, 'sunw', 0.3)}${st(1, 'sunw', 0)}</linearGradient>` +
  `<radialGradient id="m-dome2">${st(0, 'lake', 0.3)}${st(0.6, 'lake', 0.1)}${st(1, 'lake', 0)}</radialGradient>` +
  `<pattern id="m-wp" width="15" height="18" patternUnits="userSpaceOnUse"><path class="aw" d="M5 15v-6a2.5 2.5 0 0 1 5 0v6Z"/></pattern>` +
  `<pattern id="m-wpn" width="105" height="36" patternUnits="userSpaceOnUse"><path class="nwin" d="M5 15v-6a2.5 2.5 0 0 1 5 0v6ZM50 33v-6a2.5 2.5 0 0 1 5 0v6ZM65 15v-6a2.5 2.5 0 0 1 5 0v6ZM80 15v-6a2.5 2.5 0 0 1 5 0v6ZM20 33v-6a2.5 2.5 0 0 1 5 0v6Z"/></pattern>` +
  `<pattern id="m-lat" width="6" height="6" patternUnits="userSpaceOnUse"><path class="ced" d="M0 0h6v1.4h-6ZM0 0h1.4v6h-1.4Z"/><circle class="ced" cx="3.7" cy="3.7" r="1.3"/></pattern>` +
  `<pattern id="m-arcp" width="16" height="16" patternUnits="userSpaceOnUse"><path class="arc" d="M2.5 16v-10a5.5 6 0 0 1 11 0v10Z"/></pattern>` +
  `<linearGradient id="m-fshade" x1="0" y1="0" x2="0" y2="1">${st(0, 'shd', 0.28)}${st(1, 'shd', 0)}</linearGradient>` +
  PALM_DEFS +
  PEOPLE_DEFS +
  STALL_DEFS +
  ORANGES +
  SWIFT

// ----------------------------------------------------------------- css

const CSS = `
.nt { display: none; }
:root, svg {
  --s0:#3d78bb; --s1:#86b4da; --s2:#d6dfe0; --s3:#f6dcb4; --sun:#ffd49a; --sun-a:.75; --cl:#fff8ec; --mg:#fff;
  --mt0:#9aa9c6; --mt1:#d8c7bf; --mtsh:#5f6f9e; --sn:#fbf8f4; --snsh:#b7c3df; --hl0:#b9958e; --hl1:#dbbba5; --hz:#f4dcc0;
  --c0:#c98a70; --c1:#d4a07c; --c2:#c47f66; --c3:#d9ad88; --clit:#f6caa2; --ctile:#3b9a7c; --cgold:#e7b956; --cdish:#f4f1ea; --cwin:#7a4a3c; --ctr:#8a6a50; --cpalm:#7c8a48;
  --k1:#b9704f; --k2:#e9a676; --k3:#7a4030; --k4:#ffd8ae; --kw:#4a241b; --kp:#d7926a; --kp2:#ffc796; --kz0:#e9e3cf; --kz1:#2f9a86; --gold:#e9b647; --gold2:#8a5a14; --kpole:#6a4a2a; --rub:#3a1a10;
  --kfa:#ffe2b8; --kfa-a0:.12; --kfb:#5a2a1c; --kfb-a:.28; --flood:#ffb860;
  --w1:#c46d50; --w2:#eca27a; --w3:#9b4c3c; --w4:#c9875a; --w5:#cf7b5c; --wtop:#ffcfa2; --shd:#3a140c; --sunw:#ffc880; --sunw-a:.3; --win:#3d1d16; --grille:#1e100c; --door:#2f6a4e;
  --gt:#2f7d55; --gtd:#1d5a3c; --gth:#9fe0b4; --mtile:#3f8a5e; --mtileh:#a7e0b6;
  --aw:#6a3428; --arc:#4a2018; --awn2:#c9a070; --para:#efe4cc;
  --q0:#cdb6a0; --q1:#a8907e; --lake:#ffa040;
  --cv:#f1e9da; --cvt:#fffaf0; --sin:#4a2c22; --seat:#2a1a14; --cnt:#8a5a40; --cnth:#d6a27a; --food:#e8b070; --grill:#2a1a14; --cvn:#2f6a4e; --post:#5a4436;
  --crt:#2f7a52; --crth:#8fd0a0; --org:#f08a1c; --orgh:#ffd08a; --awn:#fbf2e2; --whl:#2a1c16; --hor:#9a9088; --calb:#2f6a48; --calh:#241a16; --spk:#c9a060;
  --pw:#efe9dc; --pk:#7a5a46; --pn:#4a5878; --pr:#a8483a; --pg:#6a7a4a; --py:#c9a050; --skin:#8a5a42; --plit:#ffd6a8; --plit-a:.7; --trs:#3a3434; --hair:#1a1210;
  --smk:#ffffff; --smk2:#e4e2e6; --smk-a:.62; --wire:#4a3a30; --bulb:#fff4d6; --bulbg:#ffd27a;
  --veil:#ecd6bc; --veil-a:.42;
  --fa:#9ca452; --fb:#6a7836; --fc:#3c4a22; --fd:#86663f; --tr:#7c5c40; --scar:#3a2818; --cylhi:#ffd6a8;
  --bird:#2a2026; --mq1:#9a8064; --mq2:#6e5a46; --mq3:#c4aa88; --mqs:#4e403c; --mqf:#e2a08c; --mqe:#2a1a14; --mqr:#f2d6a6;
  --dsh:#2a1636; --dsh-a:.26; --dface:#e9e6e0; --dsh2:#9a948e; --dpole:#6a625c; --tank:#e8e4dc;
  --lw:#f6f2ea; --lb:#4f86c6; --lp:#e48aa0; --ly:#e9b64a; --lg:#4a9a6a;
  --rug0:#a8302a; --rug1:#f0d6a8; --rug2:#1e2a5a; --rug3:#2a1410;
  --ced:#6a3f22; --ced2:#3e2414; --cedh:#d89a60; --cat:#b8743e; --catr:#ffc890;
  --capt:#d69070; --capl:#ffe0c0; --pp0:#b86a52; --pp1:#7e3e30;
  --room0:#ffc66a; --room1:#7a3a1a;
  --lamp:#ffb040; --lpi:#22201f; --lph:#8a7a6a; --lgl:#efe2c4; --lgn:#ffe7a8;
  --ch0:#5a5a5e; --ch1:#c6c8cc; --ch2:#f4f6f8; --ch3:#ffe6c8; --ch4:#ffffff; --chs:#ffffff; --sil:#8a8a90; --eng:#3a3a40; --spec:#ffffff;
  --tea0:#e08a2a; --tea1:#8a3a10; --froth:#f2d6a0; --gilt0:#d9a43a; --glr:#ffffff;
  --stm:#ffffff; --stm-a:.2;
  --pcs:#2a1410; --pcs-a:.3;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --s0:#060a22; --s1:#16173f; --s2:#3a2450; --s3:#8a3e3c; --sun:#e8603a; --sun-a:.2; --cl:#3a3050; --mg:#d8e0ff;
    --mt0:#262646; --mt1:#3a2844; --mtsh:#0c0c24; --sn:#6c7398; --snsh:#3e4268; --hl0:#1e1830; --hl1:#2c1c30; --hz:#4a2438;
    --c0:#2e1c28; --c1:#34202a; --c2:#2a1824; --c3:#3a2430; --clit:#4a2a30; --ctile:#1f4a3c; --cgold:#c99a40; --cdish:#5a4a50; --cwin:#ffb860; --ctr:#1a1218; --cpalm:#1c1820;
    --k1:#c07a3e; --k2:#e8a454; --k3:#5a2a12; --k4:#ffe0a0; --kw:#2a1208; --kp:#e09a52; --kp2:#ffca80; --kz0:#e8d2a0; --kz1:#2a8a76; --gold:#ffcc5a; --gold2:#9a6010; --kpole:#3a2412; --rub:#2a0e04;
    --kfa:#0a0820; --kfa-a0:.5; --kfb:#ffcf80; --kfb-a:.3; --flood:#ffb050;
    --w1:#3a2026; --w2:#4a2a2c; --w3:#2a161c; --w4:#3a2420; --w5:#40222a; --wtop:#5a3434; --shd:#000; --sunw:#ff8a3a; --sunw-a:.12; --win:#120a0c; --grille:#000; --door:#1a2a22;
    --gt:#1c3a2c; --gtd:#0c2016; --gth:#4a7a62; --mtile:#1e3a2e; --mtileh:#3a6a52;
    --aw:#1e1014; --arc:#ff9a40; --awn2:#a86a3a; --para:#5a4a4a;
    --q0:#2a1a22; --q1:#24161a; --lake:#ff9a38;
    --cv:#d29a5e; --cvt:#7a5a4a; --sin:#ffb050; --seat:#3a1a10; --cnt:#ffc070; --cnth:#fff0c0; --food:#fff2c8; --grill:#ff6a20; --cvn:#1e3a2a; --post:#2a1a14;
    --crt:#1f5a3c; --crth:#ffd080; --org:#ff9a2a; --orgh:#fff0b0; --awn:#ffe0a0; --whl:#120a08; --hor:#3a3434; --calb:#16301e; --calh:#0e0a0a; --spk:#5a4a2a;
    --pw:#5a4440; --pk:#2a1c1a; --pn:#1e1c2a; --pr:#3a1a1a; --pg:#22261c; --py:#4a3420; --skin:#3a2018; --plit:#ffa850; --plit-a:.85; --trs:#141010; --hair:#0a0606;
    --smk:#ff9a5a; --smk2:#ffd8a0; --smk-a:.6; --wire:#1a1010; --bulb:#fff6d8; --bulbg:#ffc870;
    --veil:#3a2026; --veil-a:.36;
    --fa:#3a3020; --fb:#221c18; --fc:#120e10; --fd:#2a1c14; --tr:#1e1612; --scar:#0a0606; --cylhi:#ff9a50;
    --bird:#0c0a14; --mq1:#3a2c28; --mq2:#261c1a; --mq3:#4c3a32; --mqs:#1a1212; --mqf:#6e3e3a; --mqe:#0a0606; --mqr:#8a6458;
    --dsh:#000; --dsh-a:0; --dface:#4a4048; --dsh2:#2a2228; --dpole:#2a2226; --tank:#4a4048;
    --lw:#5a5058; --lb:#22304a; --lp:#4a2a36; --ly:#4a3a20; --lg:#1c3a2a;
    --rug0:#4a1414; --rug1:#6a5040; --rug2:#141a30; --rug3:#100808;
    --ced:#2a160c; --ced2:#160a06; --cedh:#ff9a50; --cat:#2a1a14; --catr:#ff9a50;
    --capt:#4a2a26; --capl:#ffb060; --pp0:#301b1d; --pp1:#140c0e;
    --lamp:#ff9a30; --lpi:#0e0a0a; --lph:#ff9a50; --lgl:#ffd27a; --lgn:#fff0c4;
    --ch0:#2a2224; --ch1:#6a5e5a; --ch2:#a89a90; --ch3:#ffb060; --ch4:#ffe0b0; --chs:#ffd0a0; --sil:#3a3436; --eng:#100c0c; --spec:#ffd8a0;
    --tea0:#ff9a3a; --tea1:#6a2a08; --froth:#ffd8a0; --gilt0:#c08a30; --glr:#ffd8a0;
    --stm:#ffd0a0; --stm-a:.16;
    --pcs:#000; --pcs-a:.42;
  }
  .nt { display: inline; }
  .dy { display: none; }
}
.star { fill: none; stroke: #fff; stroke-linecap: round; } .s0 { stroke-width: 1.1; stroke-opacity: .5; } .s1 { stroke-width: 1.7; stroke-opacity: .75; } .s2 { stroke-width: 2.4; }
.tw { animation: twinkle ease-in-out infinite; }
@keyframes twinkle { 0%, 100% { opacity: .9; } 50% { opacity: .2; } }
.moon { fill: #fff6e0; } .earthshine { fill: #8a90b8; fill-opacity: .16; }
.cloud { animation: cloud ease-in-out infinite alternate; }
@keyframes cloud { from { transform: translateX(-50px); } to { transform: translateX(70px); } }
.sn { fill: var(--sn); } .snsh { fill: var(--snsh); }
.c0 { fill: var(--c0); } .c1 { fill: var(--c1); } .c2 { fill: var(--c2); } .c3 { fill: var(--c3); } .clit { fill: var(--clit); }
.ctile { fill: var(--ctile); } .cgold { stroke: var(--cgold); stroke-width: 1.2; } .cdish { stroke: var(--cdish); stroke-width: 1.6; stroke-linecap: round; } .cwin { stroke: var(--cwin); stroke-width: 2; }
.ctr { fill: none; stroke: var(--ctr); stroke-width: 1.4; } .cpalm { fill: none; stroke: var(--cpalm); stroke-width: 1.6; stroke-linecap: round; }
.k1 { fill: var(--k1); } .k2 { fill: var(--k2); } .kr { fill: var(--k3); fill-opacity: .55; } .kw { fill: var(--kw); }
.kh { fill: none; stroke: var(--k4); stroke-width: .7; stroke-opacity: .55; } .kh2 { fill: none; stroke: var(--k4); stroke-width: 1.1; stroke-opacity: .7; }
.kp { fill: none; stroke: var(--kp); stroke-width: .8; } .kp2 { fill: none; stroke: var(--kp2); stroke-width: .7; }
.kz { fill: url(#m-zel); } .z0 { fill: var(--kz0); } .z1 { fill: var(--kz1); }
.kg { fill: var(--gold2); } .kball { fill: var(--gold); } .kpole { fill: none; stroke: var(--kpole); stroke-width: 1.4; } .kmast { fill: none; stroke: var(--kpole); stroke-width: 1; }
.w1 { fill: var(--w1); } .w2 { fill: var(--w2); } .w3 { fill: var(--w3); } .w4 { fill: var(--w4); } .w5 { fill: var(--w5); } .wtop { fill: var(--wtop); }
.win { fill: var(--win); } .grille { fill: none; stroke: var(--grille); stroke-width: 1.4; } .door { fill: var(--door); }
.nwin { fill: #ffb45a; fill-opacity: .75; }
.gt { fill: var(--gt); } .gtd { stroke: var(--gtd); stroke-width: 1.2; } .gth, .gth2 { fill: var(--gth); } .gth2 { fill: none; stroke: var(--gth); stroke-width: 1; stroke-opacity: .7; }
.mtile { fill: var(--mtile); } .mtileh { fill: none; stroke: var(--mtileh); stroke-width: 1.2; }
.aw { fill: var(--aw); } .arc { fill: var(--arc); } .awn2 { fill: var(--awn2); } .awh { fill: var(--wtop); fill-opacity: .7; } .para { fill: var(--para); }
.cv { fill: var(--cv); } .cvt { fill: var(--cvt); } .sin { fill: var(--sin); } .seat { fill: var(--seat); } .cnt { fill: var(--cnt); } .cnth { fill: var(--cnth); }
.food { fill: var(--food); } .grill { fill: var(--grill); } .cvn { fill: var(--cvn); } .post { fill: none; stroke: var(--post); stroke-width: 1.2; } .postf { fill: var(--post); }
.crt { fill: var(--crt); } .crth { fill: var(--crth); } .org { fill: var(--org); } .orgh { fill: var(--orgh); }
.awn { fill: var(--awn); } .whl { fill: var(--whl); } .hor { fill: var(--hor); } .horl { fill: none; stroke: var(--hor); stroke-width: 1.4; stroke-linecap: round; }
.shaft { fill: none; stroke: var(--calh); stroke-width: .8; } .calb { fill: var(--calb); } .calh { fill: var(--calh); }
.whl2 { fill: none; stroke: var(--spk); stroke-width: 1; } .spk { fill: none; stroke: var(--spk); stroke-width: .5; }
.pw { fill: var(--pw); } .pk { fill: var(--pk); } .pn { fill: var(--pn); } .pr { fill: var(--pr); } .pg { fill: var(--pg); } .py { fill: var(--py); }
.skin { fill: var(--skin); } .plit { fill: var(--plit); fill-opacity: var(--plit-a); } .trs { fill: var(--trs); } .hair { fill: var(--hair); }
.psh, .dsh { fill: var(--dsh); fill-opacity: var(--dsh-a); }
.wire { fill: none; stroke: var(--wire); stroke-width: .6; } .wire2 { fill: none; stroke: var(--wire); stroke-width: 1; } .bulb { fill: none; stroke: var(--bulb); stroke-width: 2.4; stroke-linecap: round; } .bulbw { fill: none; stroke: var(--wire); stroke-width: .5; }
.tw2 { animation: twinkle 3s ease-in-out infinite; } .t1 { animation-duration: 4.3s; animation-delay: -1s; } .t2 { animation-duration: 5.9s; animation-delay: -2.4s; }
.fa { fill: var(--fa); } .fb { fill: var(--fb); } .fc { fill: var(--fc); } .fd { fill: var(--fd); } .tr { fill: var(--tr); }
.scar { stroke: var(--scar); stroke-width: 1; stroke-opacity: .5; } .cylhi { stop-color: var(--cylhi); stop-opacity: .3; }
.sway { animation: sway ease-in-out infinite alternate; }
@keyframes sway { from { transform: rotate(-1.8deg); } to { transform: rotate(2.4deg); } }
.swift { fill: var(--bird); } .flick { transform-box: fill-box; transform-origin: center; animation: flick .26s ease-in-out infinite alternate; } .f1 { animation-duration: .32s; } .f2 { animation-duration: .39s; }
@keyframes flick { from { transform: scale(1, 1); } to { transform: scale(.92, .62); } }
.mq1 { fill: var(--mq1); } .mq2 { fill: var(--mq2); } .mq3 { fill: var(--mq3); } .mqs { fill: var(--mqs); } .mqf { fill: var(--mqf); } .mqe { fill: var(--mqe); } .mqr { fill: var(--mqr); fill-opacity: .8; }
.mqt { animation: ease-in-out infinite; } .mqa { animation-name: mqa; animation-duration: 17s; } .mqb { animation-name: mqb; animation-duration: 23s; animation-delay: -6s; }
@keyframes mqa { 0%, 30%, 100% { transform: rotate(0); } 40%, 62% { transform: rotate(-14deg); } 72% { transform: rotate(0); } }
@keyframes mqb { 0%, 36%, 100% { transform: rotate(0); } 46%, 70% { transform: rotate(11deg); } 80% { transform: rotate(0); } }
.dface { fill: var(--dface); } .dsh2 { fill: var(--dsh2); } .dpole { fill: var(--dpole); stroke: var(--dpole); stroke-width: 1.6; } .tank { fill: var(--tank); }
.lw { fill: var(--lw); } .lb { fill: var(--lb); } .lp { fill: var(--lp); } .ly { fill: var(--ly); } .lg { fill: var(--lg); }
.ldry { transform-origin: 12px 0; animation: ldry ease-in-out infinite alternate; }
@keyframes ldry { from { transform: skewX(-5deg) scaleY(.98); } to { transform: skewX(6deg) scaleY(1); } }
.rug0 { fill: var(--rug0); } .rug1 { fill: var(--rug1); } .rug2 { fill: var(--rug2); } .rug3 { fill: var(--rug3); } .rugf { stroke: var(--rug1); stroke-width: 3; stroke-dasharray: 1 2; }
.rug { transform-origin: 188px 652px; animation: rug 9s ease-in-out infinite alternate; }
@keyframes rug { from { transform: skewX(-1.2deg); } to { transform: skewX(1.6deg); } }
.cat { stroke: var(--cat); } .catb { fill: var(--cat); } .catr { fill: var(--catr); fill-opacity: .7; }
.cattail { transform-origin: 3px -1px; animation: tail 7s ease-in-out infinite; }
@keyframes tail { 0%, 55%, 100% { transform: rotate(0); } 62% { transform: rotate(22deg); } 70% { transform: rotate(-8deg); } 78% { transform: rotate(16deg); } 86% { transform: rotate(2deg); } }
.capt { fill: var(--capt); } .hedge { fill: var(--fc); } .hedgeh { fill: none; stroke: var(--fb); stroke-width: 5; stroke-linecap: round; } .ray { animation: ray ease-in-out infinite alternate; } @keyframes ray { from { opacity: .25; } to { opacity: .7; } } .blot { fill: var(--shd); fill-opacity: .1; } .blot2 { fill: var(--wtop); fill-opacity: .12; } .shd2 { fill: var(--dsh); fill-opacity: var(--dsh-a); } .dsh3 { fill: var(--shd); fill-opacity: .16; }
.ced { fill: var(--ced); } .ced2 { fill: var(--ced2); } .cedh { fill: none; stroke: var(--cedh); stroke-width: 1.2; } .gtd { fill: none; }
.lpi { fill: var(--lpi); } .lps { fill: none; stroke: var(--lpi); stroke-width: 1.3; stroke-linecap: round; } .lpm { fill: none; stroke: var(--lpi); stroke-width: 1.3; }
.lph { fill: none; stroke: var(--lph); stroke-width: .9; stroke-opacity: .8; } .lgl { fill: var(--lgl); fill-opacity: .9; } .lgn { fill: var(--lgn); }
.nroom { fill: url(#m-room); fill-opacity: .9; } .shut { fill: none; stroke: var(--ced); stroke-width: 1.6; stroke-linejoin: round; }
.sil { fill: var(--sil); } .eng { fill: none; stroke: var(--eng); stroke-width: .7; stroke-opacity: .6; } .spec { fill: none; stroke: var(--spec); stroke-width: 2; stroke-linecap: round; stroke-opacity: .8; }
.froth { fill: var(--froth); } .glr { fill: none; stroke: var(--glr); stroke-width: .9; stroke-opacity: .7; } .glsh { fill: var(--dsh); fill-opacity: var(--dsh-a); }
.gilt0 { fill: var(--gilt0); }
.stm { fill: none; stroke: var(--stm); stroke-opacity: var(--stm-a); stroke-width: 7; stroke-linecap: round; }
.stm2 { stroke-width: 2.4; } .steam { animation: steam linear infinite; }
@keyframes steam { 0% { transform: translate(0, 8px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(-10px, -44px); opacity: 0; } }
.puff { transform-box: fill-box; transform-origin: center; animation: puff linear infinite; }
@keyframes puff { 0% { transform: translate(0, 0) scale(.35); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--dx), var(--rise)) scale(2.8); opacity: 0; } }
.walk { animation: walk linear infinite alternate; }
.hop { animation: hop .64s infinite; }
${GAIT_CSS}
@keyframes hop { 0%, 100% { transform: translateY(0); animation-timing-function: ease-out; } 50% { transform: translateY(-1.7px); animation-timing-function: ease-in; } }
.pcs { fill: var(--pcs); fill-opacity: var(--pcs-a); }
.gppa { stop-color: color-mix(in srgb, var(--pp0), var(--shd) 35%); } .gppb { stop-color: color-mix(in srgb, var(--pp0) 85%, var(--pp1)); }
.capj { fill: none; stroke: var(--shd); stroke-opacity: .32; stroke-width: 1.2; } .capa { fill: var(--capl); fill-opacity: .9; }
@keyframes walk { from { transform: translateX(0); } to { transform: translateX(var(--dx)); } }
.cal { animation: cal 110s linear infinite; }
@keyframes cal { 0% { transform: translateX(0); opacity: 0; } 2% { opacity: 1; } 66% { opacity: 1; } 70% { transform: translateX(1240px); opacity: 0; } 100% { transform: translateX(1240px); opacity: 0; } }
.trot { animation: trot .5s ease-in-out infinite alternate; }
@keyframes trot { from { transform: translateY(0); } to { transform: translateY(-.6px); } }
.calu { fill: none; }
${stopCss()}${PUFFS.join('')}
`

// --------------------------------------------------------------- body

const BODY =
  `<rect width="1600" height="640" fill="url(#m-sky)"/>` +
  `<rect width="1600" height="640" fill="url(#m-sun)"/>` +
  `<g class="nt">${stars}${twinkles}${moon}</g>` +
  `<g class="dy">${clouds}</g>` +
  atlas +
  farCity() +
  `<g class="nt"><rect x="0" y="80" width="480" height="520" fill="url(#m-khalo)"/></g>` +
  koutoubia(KX, KB, KW) +
  mosque() +
  palm(128, 560, 108, 3) +
  palm(352, 560, 116, 4) +
  treeLine() +
  palm(30, 640, 190, 6) +
  swifts() +
  acrossSquare() +
  square() +
  `<ellipse class="nt" cx="720" cy="610" rx="560" ry="200" fill="url(#m-dome2)"/>` +
  `<rect x="300" y="480" width="1000" height="400" fill="url(#m-veil)"/>` +
  `<path class="dy dsh3" d="M1152 604L1040 668L900 840H1160Z"/>` +
  nearSide() +
  palm(1240, 640, 215, 8) +
  palm(1342, 640, 250, 9) +
  leftBlock() +
  lampPost(116, 690, 832) +
  rightBlock() +
  `<rect width="1600" height="880" fill="url(#m-wash)"/>` +
  `<g class="dy">${[
    [1700, 180, 300, 620, 60],
    [1700, 230, 640, 760, 40],
    [1700, 140, 120, 470, 70],
  ]
    .map(([x, y, tx, ty, w], i) => `<path class="ray" style="animation-duration:${13 + i * 5}s;animation-delay:-${i * 4}s" fill="url(#m-ray)" d="M${x} ${y}L${tx} ${ty! - w!}L${tx} ${ty! + w!}Z"/>`)
    .join('')}</g>` +
  parapet

const MQ = '@media (prefers-color-scheme: dark)'
const CSS_MIN = CSS.split(MQ)
  .map(part => part.replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}'))
  .join(MQ)

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><style>${CSS_MIN}</style><defs>${DEFS}</defs>${BODY}</svg>`

export const MOROCCO_MARRAKECH: Look = {
  label: 'Marrakech',
  args: { colors: theme, backdrop: { scene: 'marrakech', glass: { blur: 20, opacity: 0.55 } } },
  problems,
  scene: SCENE,
}
