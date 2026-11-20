import { n, seeded } from './kit'

// The far-shore skyline of Aero City, seen from the ground across a lake.
// Towers stand on the waterline at BASE, lit from the upper left: each one
// shows a lit face and a shaded face, sky reflections as diagonal streaks,
// floor lines, and at night rows of lit windows. Every paint is gathered
// into one path per depth band, so a band costs a handful of elements
// however many towers it holds.

export const BASE = 600

export type Kind = 'box' | 'slant' | 'step' | 'spire' | 'dome' | 'needle' | 'cyl'
export type Tower = { x: number; w: number; h: number; kind: Kind; seed: number }

class Band {
  lit = ''
  shade = ''
  crown = ''
  streak = ''
  floors = ''
  edge = ''
  roof = ''
  tips = ''
  win = ['', '', '']
  extra = ''
  detailFloors = true
  litShare = 0.7
}

const box = (x0: number, x1: number, y0: number, y1: number) => `M${n(x0)} ${n(y1)}V${n(y0)}H${n(x1)}V${n(y1)}Z`

function faces(b: Band, x0: number, x1: number, top: number, bottom: number, gap: number, r: () => number, detail: boolean): void {
  const c = x0 + (x1 - x0) * 0.6
  b.lit += box(x0, c, top, bottom)
  b.shade += box(c, x1, top, bottom)
  if (!detail) return
  b.edge += `M${n(c)} ${n(top)}V${n(bottom)}`
  b.roof += `M${n(x0)} ${n(top)}H${n(x1)}`
  floorsAndWindows(b, x0, x1, top, bottom, gap, r)
  const span = bottom - top
  const slope = (c - x0) * 0.55
  for (let k = 0; k < 2; k++) {
    const t = 6 + r() * 16
    const y = top + slope + t + 8 + r() * Math.max(1, span - slope - t - 16)
    if (y > bottom - 2 || y - slope - t < top + 2) continue
    b.streak += `M${n(x0)} ${n(y)}L${n(c)} ${n(y - slope)}V${n(y - slope - t)}L${n(x0)} ${n(y - t)}Z`
  }
}

// Lit windows along one floor, as short runs spread over three tints.
function lights(b: Band, x0: number, x1: number, y: number, r: () => number): void {
  const yy = Math.round(y)
  let x = x0 + r() * 6
  while (x < x1 - 2) {
    const len = Math.min(x1 - x, 3 + r() * 9)
    b.win[Math.floor(r() * 3)] += `M${Math.round(x)} ${yy}h${Math.max(2, Math.round(len))}`
    x += len + 3 + r() * 10
  }
}

function floorsAndWindows(b: Band, x0: number, x1: number, top: number, bottom: number, gap: number, r: () => number): void {
  for (let y = top + gap; y < bottom - 2; y += gap) {
    if (b.detailFloors) b.floors += `M${Math.round(x0)} ${Math.round(y)}h${Math.round(x1 - x0)}`
    if (r() > b.litShare) continue
    lights(b, x0 + 1.5, x1 - 1.5, y - gap / 2, r)
  }
}

function tower(b: Band, t: Tower, gap: number, detail: boolean): void {
  const r = seeded(t.seed)
  const x0 = t.x - t.w / 2
  const x1 = t.x + t.w / 2
  const top = BASE - t.h
  switch (t.kind) {
    case 'box':
      faces(b, x0, x1, top, BASE, gap, r, detail)
      break
    case 'slant': {
      const c = x0 + t.w * 0.6
      const drop = t.w * 0.45
      b.lit += `M${n(x0)} ${BASE}V${n(top)}L${n(c)} ${n(top + drop * 0.6)}V${BASE}Z`
      b.shade += `M${n(c)} ${BASE}V${n(top + drop * 0.6)}L${n(x1)} ${n(top + drop)}V${BASE}Z`
      if (!detail) break
      b.edge += `M${n(c)} ${n(top + drop * 0.6)}V${BASE}`
      b.roof += `M${n(x0)} ${n(top)}L${n(c)} ${n(top + drop * 0.6)}L${n(x1)} ${n(top + drop)}`
      floorsAndWindows(b, x0, x1, top + drop + 4, BASE, gap, r)
      b.streak += `M${n(x0)} ${n(top + t.h * 0.55)}L${n(c)} ${n(top + t.h * 0.45)}V${n(top + t.h * 0.4)}L${n(x0)} ${n(top + t.h * 0.5)}Z`
      break
    }
    case 'step': {
      const tiers = 3
      let lower = BASE
      for (let i = 0; i < tiers; i++) {
        const inset = t.w * 0.14 * i
        const y = BASE - t.h * (0.55 + 0.45 * ((i + 1) / tiers) ** 1.4)
        faces(b, x0 + inset, x1 - inset, y, lower, gap, r, detail)
        lower = y
      }
      break
    }
    case 'spire':
      faces(b, x0, x1, top, BASE, gap, r, detail)
      b.crown += `M${n(x0 + t.w * 0.2)} ${n(top)}L${n(t.x)} ${n(top - t.h * 0.12)}L${n(x1 - t.w * 0.2)} ${n(top)}Z`
      b.crown += `M${n(t.x - 1.2)} ${n(top - t.h * 0.1)}V${n(top - t.h * 0.22)}H${n(t.x + 1.2)}V${n(top - t.h * 0.1)}Z`
      b.tips += `M${n(t.x)} ${n(top - t.h * 0.22)}h.1`
      break
    case 'dome':
      faces(b, x0, x1, top, BASE, gap, r, detail)
      b.crown += `M${n(x0)} ${n(top)}A${n(t.w / 2)} ${n(t.w * 0.38)} 0 0 1 ${n(x1)} ${n(top)}Z`
      break
    case 'needle': {
      const c = x0 + t.w * 0.6
      b.lit += `M${n(x0)} ${BASE}L${n(t.x - 1)} ${n(top)}H${n(c)}V${BASE}Z`
      b.shade += `M${n(c)} ${BASE}V${n(top)}H${n(t.x + 1)}L${n(x1)} ${BASE}Z`
      b.tips += `M${n(t.x)} ${n(top - 2)}h.1`
      if (detail) {
        b.edge += `M${n(c)} ${n(top)}V${BASE}`
        for (let y = top + gap * 2; y < BASE - 2; y += gap * 1.5) {
          const k = (y - top) / t.h
          b.floors += `M${n(t.x - (t.w / 2) * k)} ${n(y)}H${n(t.x + (t.w / 2) * k)}`
          if (r() < 0.5) lights(b, t.x - (t.w / 2) * k + 1, t.x + (t.w / 2) * k - 1, y - gap / 2, r)
        }
      }
      break
    }
    case 'cyl': {
      const ry = t.w * 0.14
      b.extra += `<path class="cy" d="M${n(x0)} ${BASE}V${n(top)}A${n(t.w / 2)} ${n(ry)} 0 0 1 ${n(x1)} ${n(top)}V${BASE}Z"/>`
      b.crown += `M${n(x0 + 3)} ${n(top - 1)}A${n(t.w / 2 - 3)} ${n(ry * 0.8)} 0 0 1 ${n(x1 - 3)} ${n(top - 1)}A${n(t.w / 2 - 3)} ${n(ry * 0.8)} 0 0 1 ${n(x0 + 3)} ${n(top - 1)}Z`
      b.crown += `M${n(t.x - 1.2)} ${n(top - ry)}V${n(top - t.h * 0.14)}H${n(t.x + 1.2)}V${n(top - ry)}Z`
      b.tips += `M${n(t.x)} ${n(top - t.h * 0.14)}h.1`
      if (detail) {
        b.roof += `M${n(x0)} ${n(top)}A${n(t.w / 2)} ${n(ry)} 0 0 1 ${n(x1)} ${n(top)}`
        for (let y = top + gap; y < BASE - 2; y += gap) {
          b.floors += `M${n(x0)} ${n(y)}Q${n(t.x)} ${n(y + ry * 0.9)} ${n(x1)} ${n(y)}`
          if (r() < 0.3) continue
          lights(b, x0 + 2, x1 - 2, y - gap / 2 + ry * 0.4, r)
        }
      }
      break
    }
  }
}

// One depth band: `p` prefixes its class names, so each band takes its own
// gradients (and with them its share of aerial haze) from the stylesheet.
// With `mirror` it returns only the faces and windows, for the reflection.
export function band(list: readonly Tower[], p: string, gap: number, detail: boolean, floors = true, mirror = false, lit = 0.7): string {
  const b = new Band()
  b.detailFloors = floors
  b.litShare = lit
  for (const t of list) tower(b, t, gap, detail)
  const path = (cls: string, d: string) => (d ? `<path class="${cls}" d="${d}"/>` : '')
  const win = b.win.map((d, i) => (d ? `<path class="nt yw${i}" stroke-width="${n(gap * 0.42)}" d="${d}"/>` : '')).join('')
  if (mirror) return path(`${p}l`, b.lit) + path(`${p}s`, b.shade) + (lit > 0 ? win : '')

  return (
    path(`${p}l`, b.lit) +
    path(`${p}s`, b.shade) +
    b.extra +
    path(`${p}c`, b.crown) +
    path('sk', b.streak) +
    path(`${p}f`, b.floors) +
    path('ed', b.edge) +
    path('rf', b.roof) +
    path('tip', b.tips) +
    win
  )
}

// Filler towers spread across the shore: tall in the side gutters, low in
// the centre where the chat sits.
export function spread(seed: number, step: number, low: number, high: number, w0: number, w1: number): Tower[] {
  const r = seeded(seed)
  const out: Tower[] = []
  const kinds: Kind[] = ['box', 'box', 'slant', 'step', 'dome', 'box']
  for (let x = -40; x < 1660; x += step * (0.7 + r() * 0.6)) {
    const edge = Math.min(1, Math.abs(x - 800) / 560) ** 1.6
    const h = low + (high - low) * (0.25 + 0.75 * edge) * (0.45 + r() * 0.55)
    out.push({ x, w: w0 + r() * (w1 - w0), h, kind: kinds[Math.floor(r() * kinds.length)]!, seed: seed + Math.floor(x) })
  }

  return out
}

// The elevated monorail: a slim white beam on a gentle arc over the lake,
// on tapered piers standing in the water, and a train gliding along it.
export const RAIL = { x0: -300, y0: 572, cx: 800, cy: 468, x1: 1900, y1: 566, water: 616 }

const railAt = (x: number): number => {
  const t = (x - RAIL.x0) / (RAIL.x1 - RAIL.x0)
  return (1 - t) ** 2 * RAIL.y0 + 2 * t * (1 - t) * RAIL.cy + t * t * RAIL.y1
}
const railPath = (dy: number) => `M${RAIL.x0} ${RAIL.y0 + dy}Q${RAIL.cx} ${RAIL.cy + dy} ${RAIL.x1} ${RAIL.y1 + dy}`

export function monorail(): { piers: string; refl: string; beam: string; train: string } {
  let piers = ''
  let refl = ''
  for (let x = 40; x < 1600; x += 190) {
    const y = railAt(x) + 3
    const w = RAIL.water
    piers += `M${x - 2} ${n(y)}L${x - 4.5} ${w}H${x + 4.5}L${x + 2} ${n(y)}Z`
    refl += `M${x - 2} ${n(2 * w - y)}L${x - 4.5} ${w}H${x + 4.5}L${x + 2} ${n(2 * w - y)}Z`
  }

  return {
    piers: `<path class="mp" d="${piers}"/>`,
    refl: `<path class="mpr" d="${refl}"/>`,
    beam: `<path class="mb" d="${railPath(0)}"/><path class="mst" d="${railPath(3)}"/>`,
    train:
      `<g><animateMotion dur="56s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="linear" begin="-20s" path="${railPath(-3.5)}"/>` +
      `<path class="tb" d="M0 -9H96Q110 -9 116 -3V0H0Q-8 0 -8 -4.5Q-8 -9 0 -9Z"/>` +
      `<path class="tw" d="M4 -5.5H92"/><path class="th" d="M0 -8H98"/></g>`,
  }
}

// A glass dome on the shore, with ribs and a bright edge.
export function dome(x: number, rx: number, ry: number): string {
  let ribs = ''
  for (const k of [-0.62, -0.25, 0.25, 0.62]) ribs += `M${n(x + k * rx)} ${BASE}Q${n(x + k * rx * 0.9)} ${n(BASE - ry * 0.95)} ${n(x)} ${n(BASE - ry)}`
  for (const h of [0.35, 0.68]) {
    const half = rx * Math.sqrt(1 - h * h)
    ribs += `M${n(x - half)} ${n(BASE - ry * h)}Q${n(x)} ${n(BASE - ry * h + 6)} ${n(x + half)} ${n(BASE - ry * h)}`
  }

  return (
    `<path class="dm" d="M${x - rx} ${BASE}A${rx} ${ry} 0 0 1 ${x + rx} ${BASE}Z"/>` +
    `<path class="dmr" d="${ribs}"/>` +
    `<path class="dmh" d="M${n(x - rx * 0.86)} ${n(BASE - ry * 0.42)}A${rx} ${ry} 0 0 1 ${n(x - rx * 0.2)} ${n(BASE - ry * 0.98)}"/>`
  )
}
