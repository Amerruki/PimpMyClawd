import { makeColors } from './make-colors.js'
import { grade, H, layer, n, seeded, speckle, svg, taper, W, type Pt } from './kit'
import type { Look } from './look'

const r0 = Math.round
const pathOf = (pts: readonly Pt[]): string => `M${pts.map(([x, y]) => `${r0(x)} ${r0(y)}`).join(' ')}Z`

// Frutiger Aurora: folding curtains of northern lights with fine vertical
// rays over faceted snowy mountains and a dark conifer shore, mirrored in a
// still lake, under a twinkling starfield and a faint milky band. Moonlight
// from the upper left. By day the same valley is sunlit: a crisp pale sky
// with a low sun over the left peaks, alpenglow on the snow, the last faint
// ribbons of the aurora fading out, glittering snow and a bright lake.
const { theme, problems } = makeColors({
  label: 'Aero Aurora',
  roles: { accent: '#2fd6a0', danger: '#ff5a6a', success: '#5fe07a', warning: '#ffc24a', pro: '#a07cff' },
  light: {
    roles: { accent: '#12a77c', danger: '#d23446', success: '#2a9a4a', warning: '#c98a10', pro: '#7a52d8' },
    gray: {
      anchors: {
        'surface-0': '#e4eef6',
        'surface-1': '#ecf3f9',
        'surface-2': '#f6f9fc',
        'text-primary': '#0e2232',
        'text-secondary': '#2a4052',
        'text-muted': '#465c6e',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#070f1d',
        'surface-1': '#0c1626',
        'surface-2': '#111d30',
        'surface-3': '#162339',
        'text-primary': '#e8f2f8',
        'text-secondary': '#bfd0dc',
        'text-muted': '#95aabb',
      },
    },
  },
})

// The lake shore. The lake fills everything below it.
const SHORE = 812
const MOON: Pt = [250, 120]

// ---- Sky -----------------------------------------------------------------

const d1 = (v: number): string => (Math.round(v * 10) / 10).toString().replace(/^0\./, '.')

// Stars in three groups that twinkle out of step, plus a denser, finer
// sprinkle along the milky band.
// Each star is a zero-length round-capped stroke, so stars of one size and
// brightness share a path.
function starfield(): string {
  const rand = seeded(53)
  const groups: Map<string, string[]>[] = [new Map(), new Map(), new Map()]
  const dot = (g: number, x: number, y: number, r: number, o: number): void => {
    const key = `${d1(Math.round(r * 5) / 2.5)} ${d1(Math.round(o * 5) / 5)}`
    const list = groups[g]!.get(key) ?? []
    list.push(`M${Math.round(x)} ${Math.round(y)}h0`)
    groups[g]!.set(key, list)
  }

  for (let i = 0; i < 150; i++) {
    dot(i % 3, rand() * W, rand() * 720, 0.4 + rand() * rand() * 1.4, 0.25 + rand() * 0.6)
  }
  for (let i = 0; i < 110; i++) {
    const t = rand()
    const x = -100 + t * 1900
    const y = 40 + t * 380 + (rand() - 0.5) * 130 * (rand() + 0.3)

    dot(i % 3, x, y, 0.3 + rand() * 0.55, 0.3 + rand() * 0.5)
  }

  return groups
    .map((g, i) => {
      const paths = [...g].map(([key, d]) => {
        const [w, o] = key.split(' ')

        return `<path stroke-width="${w}" stroke-opacity="${o}" d="${d.join('')}"/>`
      })

      return `<g class="tw-g" style="animation-duration:${7 + i * 3}s;animation-delay:-${i * 2.5}s">${paths.join('')}</g>`
    })
    .join('')
}

const BRIGHT: readonly [number, number, number][] = [
  [140, 70, 1.2],
  [420, 210, 0.8],
  [1180, 90, 1],
  [1490, 230, 1.3],
  [1330, 40, 0.7],
  [660, 60, 0.7],
  [960, 150, 0.6],
  [70, 330, 0.8],
  [1560, 420, 0.7],
  [250, 470, 0.6],
]

function brightStars(): string {
  const rand = seeded(9)

  return BRIGHT.map(([x, y, s]) => {
    const st = `style="animation-duration:${n(4 + rand() * 5)}s;animation-delay:-${n(rand() * 6)}s"`

    return (
      `<g class="tw" ${st}>` +
      `<circle cx="${x}" cy="${y}" r="${n(9 * s)}" fill="url(#au-star)"/>` +
      `<path d="M${x - 11 * s} ${y}h${22 * s}M${x} ${y - 11 * s}v${22 * s}" stroke="url(#au-spike)" stroke-width=".7"/>` +
      `<circle cx="${x}" cy="${y}" r="${n(1.3 * s)}" fill="#ffffff"/>` +
      `</g>`
    )
  }).join('')
}

// The milky band: a soft diagonal glow with a few faint cloudy knots.
const MILKY =
  `<g transform="rotate(12.5 800 240)" opacity=".55">` +
  `<rect x="-300" y="120" width="2200" height="240" fill="url(#au-band)"/>` +
  `<g class="haze" fill="#b9c8ff" fill-opacity=".07"><ellipse cx="300" cy="230" rx="220" ry="40"/><ellipse cx="760" cy="250" rx="180" ry="30"/><ellipse cx="1300" cy="235" rx="260" ry="44"/></g>` +
  `</g>`

// Two shooting stars on long, mostly empty cycles.
const SHOOTING = [
  { x: 1080, y: 60, a: 24, dur: 47, delay: 12 },
  { x: 180, y: 260, a: 18, dur: 71, delay: 40 },
]
  .map(
    s =>
      `<g transform="translate(${s.x} ${s.y}) rotate(${s.a})"><g class="shoot" style="animation-duration:${s.dur}s;animation-delay:-${s.delay}s">` +
      `<path d="M-150 0 L0 0" stroke="url(#au-trail)" stroke-width="1.6" stroke-linecap="round"/><circle r="1.8" fill="#fff"/>` +
      `</g></g>`,
  )
  .join('')

// ---- Aurora --------------------------------------------------------------

type Curtain = {
  x0: number
  x1: number
  // Lower edge of the curtain and the height of its rays, along x.
  base: (x: number) => number
  height: (x: number) => number
  step: number
  grad: string
  seed: number
  strength: number
  blur: [string, string]
  fold: { dur: number; delay: number; anim: string }
}

const wave = (x: number, a: number, f: number, p: number): number => a * Math.sin(x * f + p)

// Rays dim toward the middle column so the words stay calm.
const calm = (x: number): number => 1 - 0.55 * Math.exp(-(((x - 800) / 330) ** 2))

const CURTAINS: readonly Curtain[] = [
  {
    // Tall, pale back curtain high in the sky, teal into violet.
    x0: -140,
    x1: 1740,
    base: x => 250 + 60 * Math.cos(((x + 140) / 1880) * Math.PI * 1.6) + wave(x, 26, 0.007, 1.2) + wave(x, 10, 0.021, 0.4),
    height: x => 230 + wave(x, 60, 0.004, 2) + wave(x, 26, 0.013, 0.2),
    step: 23,
    grad: 'au-g2',
    seed: 3,
    strength: 0.4,
    blur: ['blur-2', 'blur-3'],
    fold: { dur: 41, delay: 9, anim: 'au-fold-a' },
  },
  {
    // The main green curtain: low and bright on the left, crossing high
    // over the middle and folding away to the upper right.
    x0: -140,
    x1: 1740,
    base: x => 405 + 150 * Math.cos(((x + 140) / 1880) * Math.PI) + wave(x, 34, 0.0085, 0.3) + wave(x, 12, 0.025, 2.1),
    height: x => 210 + wave(x, 50, 0.005, 1) + wave(x, 22, 0.017, 0.7),
    step: 7,
    grad: 'au-g1',
    seed: 11,
    strength: 1.35,
    blur: ['blur-0', 'blur-1'],
    fold: { dur: 23, delay: 0, anim: 'au-fold-b' },
  },
  {
    // A bright low fold over the right mountains.
    x0: 1040,
    x1: 1740,
    base: x => 500 + wave(x, 26, 0.011, 0.9) - (x - 1040) * 0.08,
    height: x => 180 + wave(x, 40, 0.009, 2.4),
    step: 8,
    grad: 'au-g1',
    seed: 23,
    strength: 0.9,
    blur: ['blur-0', 'blur-1'],
    fold: { dur: 31, delay: 6, anim: 'au-fold-c' },
  },
  {
    // A faint pink-fringed fold behind the main curtain on the left.
    x0: -140,
    x1: 620,
    base: x => 430 + wave(x, 22, 0.012, 2.2) - (x + 140) * 0.12,
    height: x => 230 + wave(x, 36, 0.01, 0.4),
    step: 9,
    grad: 'au-g3',
    seed: 37,
    strength: 0.6,
    blur: ['blur-1', 'blur-2'],
    fold: { dur: 37, delay: 14, anim: 'au-fold-a' },
  },
]

// One curtain's rays: thin rects whose own vertical gradient rises from a
// soft lower edge through a green core into teal and violet. Split into two
// sets that shimmer out of step, so light seems to run along the curtain.
function rays(c: Curtain): [string, string] {
  const rand = seeded(c.seed)
  const sets: [string[], string[]] = [[], []]
  let i = 0

  for (let x = c.x0; x < c.x1; x += c.step * (0.6 + rand() * 0.8)) {
    const t = (x - c.x0) / (c.x1 - c.x0)
    const ends = Math.min(1, t * 6, (1 - t) * 6)
    const w = c.step * (0.5 + rand() * 1.1)
    const yb = c.base(x) + (rand() - 0.5) * 10
    const h = c.height(x) * (0.55 + rand() * 0.7)
    // Folds where the curtain turns toward us glow brighter.
    const fold = Math.sin(x * 0.0047 + c.seed) ** 2
    const o = Math.min(1, c.strength * ends * calm(x) * (0.2 + rand() * 0.6) * (0.45 + 0.85 * fold))

    if (o > 0.05) {
      sets[i++ % 2]!.push(`<rect x="${Math.round(x)}" y="${Math.round(yb - h)}" width="${Math.max(1, Math.round(w))}" height="${Math.round(h + 30)}" opacity="${(Math.round(o * 20) / 20).toString().replace(/^0/, '')}"/>`)
    }
  }

  return [sets[0].join(''), sets[1].join('')]
}

const basePts = (c: Curtain, dx = 30): string[] => {
  const pts: string[] = []
  for (let x = c.x0; x <= c.x1; x += dx) {
    pts.push(`${n(x)} ${n(c.base(x))}`)
  }

  return pts
}

// The glowing hem where the light is densest: a wide soft stroke along the
// lower edge, blurred so it reads as glow, never as a line.
function hem(c: Curtain): string {
  if (c.grad === 'au-g2') {
    return ''
  }

  return `<g class="haze"><path d="M${basePts(c).join(' L')}" transform="translate(0 -14)" fill="none" stroke="url(#au-hem)" stroke-width="22" stroke-opacity="${n(Math.min(1, c.strength * 0.7))}"/></g>`
}

function curtain(c: Curtain, k: number): string {
  const [a, b] = rays(c)
  const cx = (c.x0 + c.x1) / 2
  const cy = c.base(cx)
  const shimmer =
    c.grad === 'au-g2'
      ? ''
      : `<rect x="${c.x0}" y="0" width="${c.x1 - c.x0}" height="${SHORE}" fill="url(#au-stripes)" mask="url(#au-sm${k})" style="mix-blend-mode:screen"/>`

  return (
    `<g class="fold" style="animation-name:${c.fold.anim};animation-duration:${c.fold.dur}s;animation-delay:-${c.fold.delay}s;transform-origin:${n(cx)}px ${n(cy)}px">` +
    `<g class="br" style="animation-duration:${n(c.fold.dur * 0.7)}s">${hem(c)}</g>` +
    `<g class="shim" style="animation-duration:${n(c.fold.dur * 0.37)}s"><g class="${c.blur[0]}"><g id="au-ra${k}" fill="url(#${c.grad})">${a}</g></g></g>` +
    `<g class="shim" style="animation-duration:${n(c.fold.dur * 0.29)}s;animation-delay:-${n(c.fold.dur * 0.2)}s"><g class="${c.blur[1]}" fill="url(#${c.grad})">${b}</g></g>` +
    shimmer +
    `</g>`
  )
}

// Masks that keep the travelling stripe shimmer inside each curtain's rays,
// brightest where the rays are.
const SHIMMER_MASKS = CURTAINS.map((_, k) => `<mask id="au-sm${k}" maskUnits="userSpaceOnUse" x="-200" y="0" width="2000" height="${SHORE}"><use href="#au-ra${k}"/></mask>`).join('')

// A tall stripe pattern of uneven fine rays, sliding sideways.
const STRIPES = (() => {
  const rand = seeded(77)
  let x = 0
  const bits: string[] = []
  while (x < 236) {
    const w = 1 + rand() * 4
    bits.push(`<rect x="${n(x)}" width="${n(w)}" height="${SHORE}" fill-opacity="${n(0.15 + rand() * 0.6)}"/>`)
    x += w + 2 + rand() * 9
  }

  return (
    `<pattern id="au-stripes" width="240" height="${SHORE}" patternUnits="userSpaceOnUse">` +
    `<g fill="#e8fff4">${bits.join('')}</g>` +
    `<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="240 0" dur="17s" repeatCount="indefinite"/>` +
    `</pattern>`
  )
})()

// ---- Mountains -----------------------------------------------------------

type Tones = { snowLit: string; snowShade: string; rockLit: string; rockShade: string }

// Points from a to b with the line knocked sideways at each step: a ridge.
function jag(a: Pt, b: Pt, steps: number, amp: number, rand: () => number): Pt[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const pts: Pt[] = [a]

  for (let i = 1; i < steps; i++) {
    const t = (i + (rand() - 0.5) * 0.5) / steps
    const o = (rand() - 0.5) * 2 * amp
    pts.push([a[0] + dx * t - (dy / len) * o, a[1] + dy * t + (dx / len) * o])
  }
  pts.push(b)

  return pts
}

// Where a ridge (running downhill) first crosses height y.
function crossing(list: readonly Pt[], y: number): Pt {
  for (let i = 1; i < list.length; i++) {
    const p = list[i - 1] as Pt
    const q = list[i] as Pt
    if (q[1] >= y) {
      const t = (y - p[1]) / (q[1] - p[1] || 1)

      return [p[0] + (q[0] - p[0]) * t, y]
    }
  }

  return list[list.length - 1] as Pt
}


type Peak = { x: number; y: number; wl: number; wr: number }

let clipId = 0

// Points on the sunlit snow of the near peaks, where the day's glints sit.
const SNOW_GLINTS: Pt[] = []

// One mountain in two lit facets: the face toward the moon (upper left) is
// pale, the far face is deep blue, split along a jagged spine. A snow cap
// with a ragged lower edge sits over both, lit and shaded the same way, with
// rocky gullies running through it and a cold rim light along the lit ridge.
function mountain(p: Peak, base: number, seed: number, tones: Tones, defs: string[]): string {
  const rand = seeded(seed)
  const apex: Pt = [p.x, p.y]
  const h = base - p.y
  const L = jag(apex, [p.x - p.wl, base], 8, p.wl * 0.035, rand)
  const R = jag(apex, [p.x + p.wr, base], 8, p.wr * 0.035, rand)
  const spine = jag(apex, [p.x + p.wr * 0.18 + (rand() - 0.5) * 40, base], 6, 12, rand)
  const sil = pathOf([...[...L].reverse(), ...R.slice(1)])
  const lit = pathOf([...L, ...[...spine].reverse().slice(0, -1)])
  // The snow line: ragged, lower on the shaded side.
  const sy = p.y + h * (0.32 + rand() * 0.14)
  const a = crossing(L, sy)
  const b = crossing(R, sy + h * 0.06)
  const edge: Pt[] = []
  const k = 9
  for (let i = 1; i < k; i++) {
    const t = i / k
    const drip = i % 2 ? h * (0.04 + rand() * 0.1) : -h * (0.02 + rand() * 0.04)
    edge.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + drip])
  }
  const snow = pathOf([...L.filter(q => q[1] < sy), a, ...edge, b, ...[...R.filter(q => q[1] < sy + h * 0.06)].reverse()])
  if (tones === NEAR_TONES) {
    const gr = seeded(seed + 5)
    for (let i = 0; i < 7; i++) {
      const y = p.y + (sy - p.y) * (0.12 + gr() * 0.8)
      const xl = crossing(L, y)[0]
      const xs = crossing(spine, y)[0]
      SNOW_GLINTS.push([xl + (xs - xl) * (0.15 + gr() * 0.7), y])
    }
  }
  const cid = `au-c${clipId++}`
  defs.push(`<clipPath id="${cid}"><path d="${lit}"/></clipPath>`)
  // Gullies: dark rock streaks down through the snow, pale snow-filled
  // couloirs down the rock below.
  const gullies: string[] = []
  const couloirs: string[] = []
  for (let i = 0; i < 5; i++) {
    const gx = p.x + (rand() - 0.55) * (p.wl + p.wr) * 0.35
    const top = p.y + h * (0.1 + rand() * 0.15)
    const len = h * (0.2 + rand() * 0.25)
    const lean = (gx - p.x) * 0.25
    gullies.push(taper([[gx, top], [gx + lean * 0.3, top + len * 0.35], [gx + lean * 0.7, top + len * 0.7], [gx + lean, top + len]], 1, 4 + rand() * 4))
  }
  for (let i = 0; i < 4; i++) {
    const gx = p.x + (rand() - 0.5) * (p.wl + p.wr) * 0.45
    const top = sy + h * 0.04
    const len = h * (0.12 + rand() * 0.2)
    const lean = (gx - p.x) * 0.3
    couloirs.push(taper([[gx, top], [gx + lean * 0.3, top + len * 0.35], [gx + lean * 0.7, top + len * 0.7], [gx + lean, top + len]], 3 + rand() * 3, 0.5))
  }

  return (
    `<g>` +
    `<path d="${sil}" fill="${tones.rockShade}"/>` +
    `<path d="${lit}" fill="${tones.rockLit}"/>` +
    `<path d="${couloirs.join('')}" fill="${tones.snowShade}" fill-opacity=".55"/>` +
    `<path d="${snow}" fill="${tones.snowShade}"/>` +
    `<g clip-path="url(#${cid})"><path d="${snow}" fill="${tones.snowLit}"/><path d="${sil}" fill="url(#au-facet)"/></g>` +
    `<path d="${gullies.join('')}" fill="${tones.rockShade}" fill-opacity="var(--gu)"/>` +
    `<path d="M${L.map(([x, y]) => `${r0(x)} ${r0(y)}`).join(' ')}" fill="none" stroke="url(#au-rim)" stroke-width="1.3"/>` +
    `<path d="${sil}" fill="url(#au-mtfade)"/>` +
    `</g>`
  )
}

const MT_DEFS: string[] = []

const NEAR_TONES: Tones = {
  snowLit: 'url(#au-snowlit)',
  snowShade: 'url(#au-snowshade)',
  rockLit: 'url(#au-rocklit)',
  rockShade: 'url(#au-rockshade)',
}

// The far range sits deeper in the night air: its colors shift toward the sky.
const FAR_TONES: Tones = { snowLit: 'var(--fsl)', snowShade: 'var(--fss)', rockLit: 'var(--frl)', rockShade: 'var(--frs)' }

const range = (peaks: readonly Peak[], base: number, seed: number, tones: Tones): string =>
  peaks.map((p, i) => mountain(p, base, seed + i * 17, tones, MT_DEFS)).join('')

const FAR_RANGE = range(
  [
    { x: 380, y: 640, wl: 260, wr: 220 },
    { x: 640, y: 712, wl: 200, wr: 190 },
    { x: 900, y: 724, wl: 180, wr: 220 },
    { x: 1120, y: 684, wl: 220, wr: 200 },
  ],
  SHORE,
  5,
  FAR_TONES,
)

const LEFT_RANGE = range(
  [
    { x: 40, y: 512, wl: 300, wr: 330 },
    { x: 260, y: 586, wl: 220, wr: 260 },
    { x: 470, y: 680, wl: 170, wr: 190 },
  ],
  SHORE,
  8,
  NEAR_TONES,
)

const RIGHT_RANGE = range(
  [
    { x: 1600, y: 548, wl: 290, wr: 300 },
    { x: 1370, y: 492, wl: 300, wr: 320 },
    { x: 1140, y: 668, wl: 190, wr: 210 },
  ],
  SHORE,
  13,
  NEAR_TONES,
)

// ---- Conifers ----------------------------------------------------------------

// A spruce: stacked ragged tiers, lit from the upper left (teal-green from
// moon and aurora), the right half in deep blue-green shade, a little snow
// on the lit tier tops. Drawn in a 20 x 60 box, origin at the top.
const FIR = (() => {
  const rand = seeded(4)
  const tiers = 7
  const lit: string[] = []
  const shade: string[] = []
  const snow: string[] = []
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1)
    const top = 2 + i * 7.2
    const bot = top + 11 + t * 2
    const half = 2.5 + t * 7.5
    const droop = 1.5 + rand() * 1.5
    shade.push(`M10 ${n(top)} L${n(10 + half)} ${n(bot)} L${n(10 + half * 0.5)} ${n(bot - droop)} L${n(10 + half * 0.2)} ${n(bot + 0.5)} L10 ${n(bot - 1)}Z`)
    lit.push(`M10 ${n(top)} L10 ${n(bot - 1)} L${n(10 - half * 0.3)} ${n(bot + 0.5)} L${n(10 - half * 0.6)} ${n(bot - droop)} L${n(10 - half)} ${n(bot)}Z`)
    snow.push(`M10 ${n(top + 1)} L${n(10 - half * 0.45)} ${n(top + 5.5)} L${n(10 - half * 0.15)} ${n(top + 4.2)}Z`)
  }

  return (
    `<symbol id="af" viewBox="0 0 20 60" overflow="visible">` +
    `<rect x="9.2" y="52" width="1.6" height="8" fill="var(--zt)"/>` +
    `<path d="${shade.join('')}" fill="var(--zs)"/><path d="${lit.join('')}" fill="var(--zl)"/>` +
    `<path d="${snow.join('')}" fill="var(--zn)" fill-opacity="var(--zno)"/>` +
    `</symbol>`
  )
})()

const fir = (x: number, y: number, h: number): string =>
  `<use href="#af" x="${Math.round(x - h / 6)}" y="${Math.round(y - h)}" width="${Math.round(h / 3)}" height="${Math.round(h)}"/>`

type Row = { base: number; h0: number; h1: number; gap: number; seed: number; fade: number; sides?: boolean }

// A row of firs along the shore, shorter and sparser in the middle column.
function firRow(r: Row): string {
  const rand = seeded(r.seed)
  const uses: string[] = []
  for (let x = -30; x < W + 30; x += r.gap * (0.5 + rand())) {
    const mid = Math.exp(-(((x - 800) / 300) ** 2))
    if (r.sides && mid > 0.25) {
      continue
    }
    if (mid > 0.5 && rand() < 0.45) {
      continue
    }
    const h = (r.h0 + rand() * (r.h1 - r.h0)) * (1 - mid * 0.5)
    const y = r.base + (rand() - 0.5) * 4 - (r.sides ? Math.max(0, 1 - Math.abs(x - 800) / 800) * -18 : 0)
    uses.push(fir(x, y, h))
  }

  return `<g opacity="${n(1 - r.fade)}">${uses.join('')}</g>`
}

// ---- Assembly ------------------------------------------------------------

const TREES = `<g mask="url(#au-rowmask)">${firRow({ base: SHORE - 2, h0: 16, h1: 32, gap: 8, seed: 31, fade: 0.3 })}</g>`

// Snowy drifts in the foreground corners, each crowned with a dense spruce
// forest that thins and shortens toward the lake.
const topL = (x: number): number => 716 + 104 * ((x + 120) / 680) ** 2
const topR = (x: number): number => 706 + 114 * ((1720 - x) / 660) ** 2
const drift = (x0: number, x1: number, top: (x: number) => number): string => {
  const pts: string[] = []
  const step = x1 > x0 ? 40 : -40
  for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) {
    pts.push(`${x} ${Math.round(top(x))}`)
  }

  return `M${x0} ${SHORE + 8} L${pts.join(' ')} L${x1} ${SHORE + 8}Z`
}
const DRIFT_L = drift(-120, 560, topL)
const DRIFT_R = drift(1720, 1040, topR)

function forest(x0: number, x1: number, top: (x: number) => number, seed: number): string {
  const rand = seeded(seed)
  const rows: string[] = []
  for (let row = 0; row < 3; row++) {
    for (let x = x0; x0 < x1 ? x < x1 : x > x1; x += (x1 > x0 ? 1 : -1) * (7 + rand() * 10 + row * 3)) {
      const t = (x - x0) / (x1 - x0)
      if (rand() < t * 1.1 - 0.15) {
        continue
      }
      const h = (118 - 84 * t) * (0.55 + rand() * 0.55) * (row === 1 ? 1 : 0.85)
      rows.push(fir(x, top(x) + 4 + row * 7 + rand() * 4, h))
    }
  }

  return rows.join('')
}

const HILLS =
  `<path d="${DRIFT_L}" fill="url(#au-drift)"/><path d="${DRIFT_R}" fill="url(#au-drift)"/>` +
  `<path d="${DRIFT_L}" fill="url(#au-drift-hi)"/><path d="${DRIFT_R}" fill="url(#au-drift-hi)"/>` +
  // Shade where the forest stands on the snow.
  `<g class="blur-2" fill="none" stroke="var(--hs)" stroke-opacity="var(--hso)" stroke-width="16"><path d="${DRIFT_L.replace(/^M\S+ \S+ L/, 'M').replace(/ L\S+ \S+Z$/, '')}" transform="translate(0 16)"/><path d="${DRIFT_R.replace(/^M\S+ \S+ L/, 'M').replace(/ L\S+ \S+Z$/, '')}" transform="translate(0 16)"/></g>` +
  `<g class="sway">${forest(-130, 470, topL, 71)}</g>` +
  `<g class="sway" style="animation-delay:-4s">${forest(1730, 1130, topR, 83)}</g>`

const mirror = (id: string, o: number, cls = ''): string =>
  `<g mask="url(#au-refl)"><g transform="matrix(1 0 0 -1 0 ${2 * SHORE})" opacity="${o}" class="${cls}"><use href="#${id}"/></g></g>`

const MIST = [
  { x: 260, y: 790, rx: 360, ry: 30, dur: 70, delay: 0 },
  { x: 1300, y: 786, rx: 420, ry: 34, dur: 86, delay: 18 },
  { x: 800, y: 804, rx: 520, ry: 22, dur: 77, delay: 30 },
  { x: 1500, y: 700, rx: 260, ry: 30, dur: 64, delay: 9 },
  { x: 120, y: 690, rx: 240, ry: 26, dur: 73, delay: 22 },
  { x: 760, y: 735, rx: 380, ry: 22, dur: 90, delay: 44 },
]
const mist = (list: typeof MIST, o: number): string =>
  list.map(m => `<g class="mist" style="animation-duration:${m.dur}s;animation-delay:-${m.delay}s"><ellipse cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="url(#au-mist)" opacity="${o}"/></g>`).join('')

// The moon's glitter path on the water, in two sets that sparkle in turn.
function glitter(): string {
  const rand = seeded(61)
  const sets: [string[], string[]] = [[], []]
  let i = 0

  for (let y = SHORE + 8; y < 930; y += 5 + rand() * 6) {
    const f = (y - SHORE) / 120
    const w = 6 + f * 46 * rand()
    sets[i++ % 2]!.push(`<rect x="${n(MOON[0] - w / 2 + (rand() - 0.5) * 22 * (1 + f))}" y="${n(y)}" width="${n(w)}" height="1.3" fill-opacity="${n(0.6 - f * 0.4)}"/>`)
  }

  return sets.map((s, k) => `<g class="glint" style="animation-delay:-${k * 3}s"><g fill="var(--gt)" class="blur-0">${s.join('')}</g></g>`).join('')
}

// Every colour that changes between day and night, as [day, night].
const PALETTE: Record<string, readonly [string, string]> = {
  s0: ['#7fb8e8', '#02050d'], s1: ['#a9d2f2', '#061127'], s2: ['#dcebf7', '#0b2236'], s3: ['#fbe9df', '#123a44'],
  ag0: ['#fff2e4', '#1fae86'], ago: ['.7', '.16'], ag1: ['#ffe6d6', '#127a6a'], ag1o: ['.3', '.06'],
  n0: ['#ffc6b2', '#eef5ff'], n1: ['#ffe4d4', '#c9dcf5'], n2: ['#dbe5f3', '#93acd6'], ns0: ['#a9bde0', '#5a76ae'], ns1: ['#8ca3d0', '#34497e'],
  rl0: ['#a88f9c', '#3c5684'], rl1: ['#7c7890', '#22355c'], rl2: ['#5d6682', '#15223e'], rs0: ['#5e6a8c', '#1e2d52'], rs1: ['#404c6c', '#0b1428'],
  fc: ['#ffc8a8', '#bfffe0'], fco: ['.3', '.16'], rm0: ['#fff4e0', '#ffffff'], rm1: ['#ffd8c0', '#dff0ff'], mf: ['#d6e6f4', '#16304a'],
  fsl: ['#f2dcdc', '#7f9cc4'], fss: ['#b8c8e4', '#3a5482'], frl: ['#a6b4d0', '#2a4466'], frs: ['#93a5c6', '#1a3050'],
  zt: ['#1c2a26', '#0a1418'], zs: ['#0f3436', '#0a1f26'], zl: ['#2b6c5c', '#1d5650'], zn: ['#ffffff', '#9fc0dc'], zno: ['.85', '.55'],
  hs: ['#5a78a8', '#0b1630'], hso: ['.3', '.55'], gt: ['#fffaf0', '#e6f0ff'],
  d0: ['#ffffff', '#c9d9ef'], d1: ['#f2f6fc', '#8aa2cc'], d2: ['#c6d6ec', '#3a5282'], d3: ['#94acd2', '#18264a'], dh: ['#5a7aa8', '#000814'], dho: ['.2', '.35'],
  k0: ['#b8d8ee', '#0c2232'], k1: ['#8cbee0', '#071422'], k2: ['#5e98c6', '#030810'], mi: ['#ffffff', '#c8dcf0'], mio: ['.6', '.42'],
  c: ['#f2f7fb', '#050b16'], c1: ['.2', '.3'], c2: ['.32', '.42'], ft: ['#e6eff6', '#030810'], fto: ['.55', '.7'], gn: ['#6a8aa8', '#cfe4ff'], gu: ['.22', '.55'],
}
const vars = (k: 0 | 1): string => Object.entries(PALETTE).map(([name, v]) => `--${name}:${v[k]};`).join('')

const CSS = `
:root, svg { ${vars(0)} }
.nt { display: none; }
.aw { opacity: .2; }
.scr { mix-blend-mode: normal; }
@media (prefers-color-scheme: dark) {
  :root, svg { ${vars(1)} }
  .nt { display: inline; }
  .dy { display: none; }
  .aw { opacity: 1; }
  .scr { mix-blend-mode: screen; }
}
.sunb { animation: pulse 13s ease-in-out infinite; }
.fold { animation: au-fold-a ease-in-out infinite alternate; }
@keyframes au-fold-a { from { transform: translateX(-30px) skewX(-3deg) scaleY(.94); } to { transform: translateX(26px) skewX(2.5deg) scaleY(1.06); } }
@keyframes au-fold-b { 0% { transform: translateX(26px) skewX(2deg) scaleY(1.04); } 50% { transform: translateX(-12px) skewX(-1.5deg) scaleY(.95); } 100% { transform: translateX(-30px) skewX(-3deg) scaleY(1.05); } }
@keyframes au-fold-c { from { transform: translateX(-18px) skewX(3deg) scaleY(1.06); } to { transform: translateX(22px) skewX(-2deg) scaleY(.94); } }
.shim { animation: au-shim ease-in-out infinite alternate; }
@keyframes au-shim { from { opacity: 1; transform: translateX(-9px); } to { opacity: .4; transform: translateX(9px); } }
.br { animation: au-br ease-in-out infinite alternate; }
@keyframes au-br { from { opacity: .55; } to { opacity: 1; } }
.aur { animation: au-breathe 19s ease-in-out infinite alternate; }
@keyframes au-breathe { from { opacity: .78; } to { opacity: 1; } }
.tw, .tw-g { animation: twinkle ease-in-out infinite; }
.tw-g { animation-name: au-tw; }
@keyframes au-tw { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
.shoot { opacity: 0; animation: au-shoot linear infinite; }
@keyframes au-shoot { 0% { transform: translateX(0); opacity: 0; } .4% { opacity: 1; } 2.6% { opacity: 0; transform: translateX(380px); } 100% { opacity: 0; transform: translateX(380px); } }
.mist { animation: au-mist ease-in-out infinite alternate; }
@keyframes au-mist { from { transform: translateX(-60px); } to { transform: translateX(70px); } }
.ripple { animation: au-ripple 24s linear infinite; }
@keyframes au-ripple { from { transform: translateX(0); } to { transform: translateX(-240px); } }
.ripple-2 { animation: au-ripple2 31s linear infinite; }
@keyframes au-ripple2 { from { transform: translateX(-180px); } to { transform: translateX(0); } }
.glint { animation: pulse 6s ease-in-out infinite; }
.sway { transform-box: fill-box; transform-origin: 50% 100%; animation: au-sway 11s cubic-bezier(.45,0,.55,1) infinite alternate; }
@keyframes au-sway { from { transform: skewX(-.6deg); } to { transform: skewX(.7deg); } }
.wob { animation: au-wob 9s ease-in-out infinite alternate; }
@keyframes au-wob { from { transform: translateX(-3px) scaleY(.98); } to { transform: translateX(3px) scaleY(1.02); } }
`

const DEFS =
  `<linearGradient id="au-sky" x1="0" y1="0" x2="0" y2="${SHORE}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--s0)"/><stop offset=".45" stop-color="var(--s1)"/><stop offset=".8" stop-color="var(--s2)"/><stop offset="1" stop-color="var(--s3)"/></linearGradient>` +
  // Ray colors, bottom to top: a soft-rising pale green edge, green core, teal, violet tips.
  `<linearGradient id="au-g1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#c6ffe2" stop-opacity="0"/><stop offset=".12" stop-color="#c8ffe0" stop-opacity=".7"/><stop offset=".2" stop-color="#3dff9e" stop-opacity=".9"/><stop offset=".45" stop-color="#17d8b0" stop-opacity=".42"/><stop offset=".75" stop-color="#5a5cff" stop-opacity=".2"/><stop offset="1" stop-color="#a070ff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-g2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8ff8e0" stop-opacity="0"/><stop offset=".1" stop-color="#7ff5d4" stop-opacity=".55"/><stop offset=".3" stop-color="#1fc6c0" stop-opacity=".38"/><stop offset=".65" stop-color="#6f58ff" stop-opacity=".26"/><stop offset="1" stop-color="#c070ff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-g3" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd0f0" stop-opacity="0"/><stop offset=".08" stop-color="#e8fff0" stop-opacity=".7"/><stop offset=".2" stop-color="#4dffa8" stop-opacity=".7"/><stop offset=".5" stop-color="#2fc0d0" stop-opacity=".32"/><stop offset=".8" stop-color="#b060ff" stop-opacity=".24"/><stop offset="1" stop-color="#ff70d0" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-hem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7dffb0" stop-opacity="0"/><stop offset=".15" stop-color="#7dffb0" stop-opacity=".9"/><stop offset=".4" stop-color="#7dffb0" stop-opacity=".35"/><stop offset=".6" stop-color="#7dffb0" stop-opacity=".35"/><stop offset=".85" stop-color="#7dffb0" stop-opacity=".9"/><stop offset="1" stop-color="#7dffb0" stop-opacity="0"/></linearGradient>` +
  STRIPES +
  SHIMMER_MASKS +
  `<radialGradient id="au-airglow"><stop offset="0" stop-color="var(--ag0)" stop-opacity="var(--ago)"/><stop offset=".6" stop-color="var(--ag1)" stop-opacity="var(--ag1o)"/><stop offset="1" stop-color="var(--ag1)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="au-star"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".25" stop-color="#cfe4ff" stop-opacity=".35"/><stop offset="1" stop-color="#9fc4ff" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="au-spike"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfe8ff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".95"/></linearGradient>` +
  `<radialGradient id="au-moon" cx=".42" cy=".4" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e6eef8"/><stop offset="1" stop-color="#b9c8dc"/></radialGradient>` +
  `<radialGradient id="au-halo"><stop offset="0" stop-color="#e0ecff" stop-opacity=".6"/><stop offset=".2" stop-color="#9fbcf0" stop-opacity=".2"/><stop offset="1" stop-color="#5a7ab8" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="au-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4ff" stop-opacity="0"/><stop offset=".5" stop-color="#b8c8ff" stop-opacity=".1"/><stop offset="1" stop-color="#9fb4ff" stop-opacity="0"/></linearGradient>` +
  // Mountains: lit and shaded snow and rock, moonlit from the upper left.
  `<linearGradient id="au-snowlit" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="var(--n0)"/><stop offset=".55" stop-color="var(--n1)"/><stop offset="1" stop-color="var(--n2)"/></linearGradient>` +
  `<linearGradient id="au-snowshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ns0)"/><stop offset="1" stop-color="var(--ns1)"/></linearGradient>` +
  `<linearGradient id="au-rocklit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--rl0)"/><stop offset=".6" stop-color="var(--rl1)"/><stop offset="1" stop-color="var(--rl2)"/></linearGradient>` +
  `<linearGradient id="au-rockshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--rs0)"/><stop offset="1" stop-color="var(--rs1)"/></linearGradient>` +
  `<linearGradient id="au-facet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--fc)" stop-opacity="var(--fco)"/><stop offset=".5" stop-color="var(--fc)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-rim" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--rm0)" stop-opacity=".85"/><stop offset=".5" stop-color="var(--rm1)" stop-opacity=".25"/><stop offset="1" stop-color="var(--rm1)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-mtfade" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="var(--mf)" stop-opacity="0"/><stop offset="1" stop-color="var(--mf)" stop-opacity=".55"/></linearGradient>` +
  `<radialGradient id="au-drift" cx=".3" cy=".1" r=".95"><stop offset="0" stop-color="var(--d0)"/><stop offset=".3" stop-color="var(--d1)"/><stop offset=".7" stop-color="var(--d2)"/><stop offset="1" stop-color="var(--d3)"/></radialGradient>` +
  `<linearGradient id="au-drift-hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".45"/><stop offset=".12" stop-color="#ffffff" stop-opacity="0"/><stop offset=".7" stop-color="var(--dh)" stop-opacity="0"/><stop offset="1" stop-color="var(--dh)" stop-opacity="var(--dho)"/></linearGradient>` +
  `<linearGradient id="au-rowfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>` +
  `<mask id="au-rowmask" maskUnits="userSpaceOnUse" x="-50" y="700" width="${W + 100}" height="140"><rect x="-50" y="700" width="${W + 100}" height="140" fill="url(#au-rowfade)"/></mask>` +
  // Lake.
  `<linearGradient id="au-lake" x1="0" y1="${SHORE}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--k0)"/><stop offset=".35" stop-color="var(--k1)"/><stop offset="1" stop-color="var(--k2)"/></linearGradient>` +
  `<linearGradient id="au-fade" x1="0" y1="${SHORE}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".5" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>` +
  `<mask id="au-refl" maskUnits="userSpaceOnUse" x="-200" y="${SHORE}" width="${W + 400}" height="${H - SHORE}"><rect x="-200" y="${SHORE}" width="${W + 400}" height="${H - SHORE}" fill="url(#au-fade)"/></mask>` +
  `<linearGradient id="au-shore" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfffe8" stop-opacity=".5"/><stop offset=".35" stop-color="#9fd8ff" stop-opacity=".12"/><stop offset=".65" stop-color="#9fd8ff" stop-opacity=".12"/><stop offset="1" stop-color="#bfffe8" stop-opacity=".5"/></linearGradient>` +
  `<pattern id="au-ripples" width="240" height="14" patternUnits="userSpaceOnUse"><path d="M0 3 H90 M130 3 H220 M40 10 H170" stroke="#bfe8ff" stroke-width="1"/></pattern>` +
  `<pattern id="au-ripples2" width="320" height="22" patternUnits="userSpaceOnUse"><path d="M20 6 H140 M200 15 H300" stroke="#9fffd8" stroke-width="1.2"/></pattern>` +
  `<radialGradient id="au-mist"><stop offset="0" stop-color="var(--mi)" stop-opacity="var(--mio)"/><stop offset="1" stop-color="var(--mi)" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="au-calm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--c)" stop-opacity="0"/><stop offset=".3" stop-color="var(--c)" stop-opacity="var(--c1)"/><stop offset=".5" stop-color="var(--c)" stop-opacity="var(--c2)"/><stop offset=".7" stop-color="var(--c)" stop-opacity="var(--c1)"/><stop offset="1" stop-color="var(--c)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="au-foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ft)" stop-opacity="0"/><stop offset="1" stop-color="var(--ft)" stop-opacity="var(--fto)"/></linearGradient>` +
  `<radialGradient id="ad-wash"><stop offset="0" stop-color="#fff3dc" stop-opacity=".75"/><stop offset=".35" stop-color="#ffe8d0" stop-opacity=".3"/><stop offset="1" stop-color="#ffe8d0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="ad-halo"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".25" stop-color="#fff4d6" stop-opacity=".5"/><stop offset="1" stop-color="#fff0d0" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="ad-sun"><stop offset="0" stop-color="#ffffff"/><stop offset=".8" stop-color="#fffcf2"/><stop offset="1" stop-color="#fff7e4"/></radialGradient>` +
  speckle('au-grain', 19, 'var(--gn)', 149, 60, 0.7, 0.1) +
  FIR +
  `<g id="au-far">${FAR_RANGE}</g>` +
  `<g id="au-near">${LEFT_RANGE}${RIGHT_RANGE}</g>` +
  `<g id="au-trees">${TREES}</g>` +
  `<g id="au-hills">${HILLS}</g>`

// The day's low sun over the left peaks: a wide warm wash, a breathing
// halo and a soft-edged white disc.
const SUN: Pt = [MOON[0], 440]
const SUN_DAY =
  `<g class="dy">` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="620" fill="url(#ad-wash)"/>` +
  `<g class="sunb"><circle cx="${SUN[0]}" cy="${SUN[1]}" r="190" fill="url(#ad-halo)"/></g>` +
  `<g class="blur-2"><circle cx="${SUN[0]}" cy="${SUN[1]}" r="44" fill="#fff7e4"/></g>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="27" fill="url(#ad-sun)"/>` +
  `</g>`

// Glittering snow: four-point glints in three sets that twinkle in turn.
function glints(pts: readonly Pt[], seed: number): string {
  const rand = seeded(seed)
  const rays: string[][] = [[], [], []]
  const cores: string[][] = [[], [], []]
  pts.forEach(([x, y], i) => {
    const a = 2 + rand() * 3.5
    rays[i % 3]!.push(`M${r0(x - a)} ${r0(y)}h${r0(a * 2)}M${r0(x)} ${r0(y - a)}v${r0(a * 2)}`)
    cores[i % 3]!.push(`M${r0(x)} ${r0(y)}h0`)
  })

  return rays
    .map(
      (d, k) =>
        `<g class="tw" stroke="#fff" stroke-linecap="round" style="animation-duration:${5 + k * 1.7}s;animation-delay:-${k * 2}s">` +
        `<path d="${d.join('')}" stroke-width=".9"/><path d="${cores[k]!.join('')}" stroke-width="2.6"/></g>`,
    )
    .join('')
}

const DRIFT_GLINTS: Pt[] = (() => {
  const rand = seeded(91)
  const pts: Pt[] = []
  for (let i = 0; i < 46; i++) {
    const left = i % 2 === 0
    const x = left ? -100 + rand() * 640 : 1060 + rand() * 640
    const top = (left ? topL : topR)(x) + 26
    if (top < SHORE - 4) {
      pts.push([x, top + rand() * (SHORE - 4 - top)])
    }
  }

  return pts
})()

const BODY =
  `<rect width="${W}" height="${H}" fill="url(#au-sky)"/>` +
  `<g class="aur"><ellipse cx="800" cy="640" rx="1100" ry="260" fill="url(#au-airglow)"/></g>` +
  layer(1, `<g class="nt">` + MILKY + `<g fill="none" stroke="#e8f0ff" stroke-linecap="round">${starfield()}</g>` + brightStars() + SHOOTING + `<circle cx="${MOON[0]}" cy="${MOON[1]}" r="150" fill="url(#au-halo)"/><circle cx="${MOON[0]}" cy="${MOON[1]}" r="22" fill="url(#au-moon)"/></g>` + SUN_DAY) +
  layer(2, `<g class="aw"><g id="au-aur" class="aur scr">${CURTAINS.map(curtain).join('')}</g></g>`) +
  layer(2, `<g class="blur-0"><use href="#au-far"/></g>` + mist(MIST.slice(5), 0.6)) +
  layer(3, `<use href="#au-near"/><g class="dy">${glints(SNOW_GLINTS, 7)}</g>` + mist(MIST.slice(3, 5), 0.5)) +
  layer(3, `<use href="#au-trees"/>`) +
  `<rect y="${SHORE}" width="${W}" height="${H - SHORE}" fill="url(#au-lake)"/>` +
  layer(2, mirror('au-far', 0.45, 'blur-1')) +
  layer(3, `<g class="wob">${mirror('au-near', 0.42, 'blur-0')}${mirror('au-trees', 0.6)}</g>`) +
  layer(4, mirror('au-hills', 0.5)) +
  // The aurora in the lake: flipped, squashed and blurred, glowing up
  // through the dark water.
  layer(
    2,
    `<g mask="url(#au-refl)" class="scr aw"><g transform="matrix(1 0 0 -.42 0 1065)" opacity=".6"><use href="#au-aur"/></g></g>`,
  ) +
  `<g mask="url(#au-refl)"><g class="ripple"><rect x="0" y="${SHORE + 4}" width="${W + 240}" height="${H - SHORE}" fill="url(#au-ripples)" opacity=".07"/></g>` +
  `<g class="ripple-2"><rect x="-180" y="${SHORE + 10}" width="${W + 360}" height="${H - SHORE}" fill="url(#au-ripples2)" opacity=".06"/></g></g>` +
  glitter() +
  `<rect y="${SHORE - 1}" width="${W}" height="2" fill="url(#au-shore)"/>` +
  layer(4, `<use href="#au-hills"/><g class="dy">${glints(DRIFT_GLINTS, 13)}</g>`) +
  mist(MIST.slice(0, 3), 1) +
  `<rect width="${W}" height="${H}" fill="url(#au-calm)"/>` +
  `<rect y="870" width="${W}" height="130" fill="url(#au-foot)"/>` +
  `<rect width="${W}" height="${H}" fill="url(#au-grain)"/>` +
  `<g class="nt">${grade(MOON, '#d8f0ff', '#020818', 0.8)}</g>` +
  `<g class="dy">${grade(SUN, '#fff0d8', '#4a7ab0', 0.75).replace(/k-(grade|vig)/g, 'ad-$1').replace('stop-color="#000"', 'stop-color="#3a5878"')}</g>`

const SCENE = svg(CSS, DEFS + MT_DEFS.join(''), BODY)

export const AERO_AURORA: Look = {
  label: 'Aero Aurora',
  args: { colors: theme, backdrop: { scene: 'aero-aurora', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
