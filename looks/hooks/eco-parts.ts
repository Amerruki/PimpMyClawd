// Shapes for the Aero Eco meadow: clumps of a clipped shrub, broad leaves,
// soap bubbles and hill crests. Each helper returns path data, so a scene
// can merge shapes of one paint into a single path, which costs far less
// to draw than separate elements.
import { n, seeded } from './kit'
import type { Pt } from './kit'

// A smooth path through the points: quadratic curves through midpoints.
// Whole-pixel rounding by default keeps path data short.
export function smoothPath(pts: readonly Pt[], close = true, f: (v: number) => string = v => Math.round(v).toString()): string {
  const k = pts.length
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`
  for (let i = 1; i < k - 1; i++) {
    const p = pts[i]!
    const q = pts[i + 1]!
    d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`
  }
  d += `L${f(pts[k - 1]![0])} ${f(pts[k - 1]![1])}`

  return close ? `${d}Z` : d
}

// One rounded clump of a clipped shrub, an ellipse centred at (cx, cy) whose
// edge is a ring of soft-pointed leaf tips, and the glossy crescent that
// hugs its upper left, where the sun falls.
export type Clump = { cx: number; cy: number; rx: number; ry: number }

export function clump(c: Clump, seed: number): { body: string; gloss: string } {
  const r = seeded(seed)
  const P = (a: number, s: number): Pt => [c.cx + c.rx * s * Math.cos(a), c.cy + c.ry * s * Math.sin(a)]
  const k = Math.max(9, Math.round((Math.PI * (c.rx + c.ry)) / 34))
  const step = (Math.PI * 2) / k
  const a0 = r() * step
  const f = (p: Pt) => `${n(p[0])} ${n(p[1])}`
  let body = `M${f(P(a0, 1))}`
  for (let i = 0; i < k; i++) {
    const s = a0 + i * step
    const e = s + step
    const m = s + step * (0.42 + r() * 0.16)
    const tip = 1.04 + r() * 0.05
    body += `Q${f(P(s + (m - s) * 0.2, tip + 0.03))} ${f(P(m, tip))}Q${f(P(m + (e - m) * 0.8, tip + 0.03))} ${f(P(e, 1))}`
  }
  const g0 = (-172 * Math.PI) / 180
  const g1 = (-38 * Math.PI) / 180
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= 8; i++) {
    const a = g0 + ((g1 - g0) * i) / 8
    const p = P(a, 0.9)
    outer.push(p)
    inner.push([p[0] + c.rx * 0.04 * Math.sin((Math.PI * i) / 8), p[1] + c.ry * 0.34 * Math.sin((Math.PI * i) / 8)])
  }

  return { body: `${body}Z`, gloss: smoothPath([...outer, ...inner.reverse()]) }
}

// A broad leaf lying along +x from its stalk at the origin to its tip at
// (L, 0), W wide: the outline, a glossy band on the upper half, and the
// midrib with paired veins sweeping toward the tip.
export function leaf(L: number, W: number): { body: string; gloss: string; veins: string } {
  const hw = W / 2
  const body =
    `M0 0C${n(L * 0.2)} ${n(-hw * 1.15)} ${n(L * 0.68)} ${n(-hw * 1.05)} ${n(L)} 0` +
    `C${n(L * 0.7)} ${n(hw * 0.9)} ${n(L * 0.22)} ${n(hw * 1.1)} 0 0Z`
  const gloss =
    `M${n(L * 0.1)} ${n(-hw * 0.18)}C${n(L * 0.3)} ${n(-hw * 0.82)} ${n(L * 0.68)} ${n(-hw * 0.74)} ${n(L * 0.9)} ${n(-hw * 0.08)}` +
    `C${n(L * 0.66)} ${n(-hw * 0.42)} ${n(L * 0.32)} ${n(-hw * 0.5)} ${n(L * 0.1)} ${n(-hw * 0.18)}Z`
  let veins = `M0 0Q${n(L * 0.5)} ${n(-hw * 0.06)} ${n(L * 0.97)} 0`
  for (let i = 1; i <= 6; i++) {
    const u = i / 7.5
    const x = L * u
    const reach = hw * (0.72 - Math.abs(u - 0.4) * 0.9)
    veins += `M${n(x)} 0Q${n(x + L * 0.07)} ${n(-reach * 0.5)} ${n(x + L * 0.16)} ${n(-reach)}`
    veins += `M${n(x)} 0Q${n(x + L * 0.07)} ${n(reach * 0.5)} ${n(x + L * 0.16)} ${n(reach)}`
  }

  return { body, gloss, veins }
}

// A soap bubble of radius 50 at the origin, to be scaled: a faint body, an
// iridescent rim, a crescent highlight, a hot spot and a faint reflection.
export const BUBBLE =
  `<g id="eco-bub">` +
  `<circle r="50" fill="url(#eco-bub-body)"/>` +
  `<circle r="48.8" fill="none" stroke="url(#eco-bub-iri)" stroke-width="2.4"/>` +
  `<path d="M-40 -14A42 42 0 0 1 8 -43A46 46 0 0 0 -40 -14Z" fill="#fff" fill-opacity=".62"/>` +
  `<ellipse cx="-22" cy="-27" rx="8" ry="4.4" transform="rotate(-38 -22 -27)" fill="#fff" fill-opacity=".92"/>` +
  `<path d="M36 22A42 42 0 0 1 -6 45A47 47 0 0 0 36 22Z" fill="#fff" fill-opacity=".3"/>` +
  `</g>`

// A ridge line from the curve y(x): the crest alone, or filled down past the
// bottom of the frame.
export function ridge(y: (x: number) => number, x0 = -100, x1 = 1700, step = 25): { crest: string; fill: string } {
  const pts: Pt[] = []
  for (let x = x0; x <= x1; x += step) pts.push([x, y(x)])
  const crest = smoothPath(pts, false)

  return { crest, fill: `${crest}L${x1} 1010L${x0} 1010Z` }
}

// A four-point sparkle centred at the origin, r long.
export const sparkle = (r: number): string =>
  `M0 ${n(-r)}Q${n(r * 0.1)} ${n(-r * 0.1)} ${n(r)} 0Q${n(r * 0.1)} ${n(r * 0.1)} 0 ${n(r)}Q${n(-r * 0.1)} ${n(r * 0.1)} ${n(-r)} 0Q${n(-r * 0.1)} ${n(-r * 0.1)} 0 ${n(-r)}Z`

// A circle as path data, so many dots of one paint fit in one path.
export const dot = (x: number, y: number, r: number): string =>
  `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`
