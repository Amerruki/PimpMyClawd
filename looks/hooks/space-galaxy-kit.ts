// Small drawing helpers for the Milky Way scene. Everything here is built to
// be turned as one group without cost: soft light is a radial gradient on a
// plain circle, stars are zero-length round-capped strokes, nothing is
// blurred, masked or clipped.
import { seeded, type Pt } from './kit'

// A gradient stop whose colour is a CSS variable, so day and night recolour
// the same shapes.
export const stop = (o: number, v: string, op = 1): string =>
  `<stop offset="${o}" style="stop-color:var(${v});stop-opacity:${Math.round(op * 100) / 100}"/>`

// A soft round glow of one colour with a bell-shaped falloff.
export const soft = (id: string, v: string, core = 1): string =>
  `<radialGradient id="${id}">${stop(0, v, core)}${stop(0.2, v, core * 0.8)}${stop(0.42, v, core * 0.45)}${stop(0.68, v, core * 0.14)}${stop(1, v, 0)}</radialGradient>`

// The same bell for the many glows, drawn on circles 0.72 the size (see
// glows): the faint outer tail, where most of a circle's area lies and
// little of its light, is trimmed.
export const glowFill = (id: string, v: string, core = 1): string =>
  `<radialGradient id="${id}">${stop(0, v, core)}${stop(0.28, v, core * 0.8)}${stop(0.58, v, core * 0.45)}${stop(0.94, v, core * 0.14)}${stop(1, v, 0)}</radialGradient>`

// A glow that holds its brightness further out before falling away, for
// bodies with an outline, such as the lobes of the bulge.
export const firm = (id: string, v: string, core = 1): string =>
  `<radialGradient id="${id}">${stop(0, v, core)}${stop(0.45, v, core * 0.8)}${stop(0.72, v, core * 0.38)}${stop(0.9, v, core * 0.1)}${stop(1, v, 0)}</radialGradient>`

export const gauss = (rand: () => number): number => (rand() + rand() + rand() - 1.5) / 0.5

// Smooth one-dimensional noise in 0..1, for clumping along an arm.
export function noise1(seed: number): (x: number) => number {
  const rand = seeded(seed)
  const v = Array.from({ length: 256 }, rand)
  const at = (i: number): number => v[((i % 256) + 256) % 256] as number

  return x => {
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)

    return at(i) + (at(i + 1) - at(i)) * u
  }
}

// Many stars as one path of zero-length strokes. The points are walked in a
// snaking grid order and written as relative moves, about seven characters
// a star.
export function specks(pts: readonly Pt[], cell = 30): string {
  const key = (p: Pt): number => {
    const gy = Math.floor(p[1] / cell)
    const gx = Math.floor(p[0] / cell)

    return gy * 4096 + (((gy % 2) + 2) % 2 ? -gx : gx)
  }
  const sorted = pts.map(p => [Math.round(p[0]), Math.round(p[1])] as const).sort((a, b) => key(a) - key(b))
  let x = 0
  let y = 0
  let d = ''

  sorted.forEach((p, i) => {
    const dy = p[1] - y

    d += i === 0 ? `M${p[0]} ${p[1]}h0` : `m${p[0] - x}${dy < 0 ? '' : ' '}${dy}h0`
    x = p[0]
    y = p[1]
  })

  return d
}

export type Glow = { x: number; y: number; r: number; f: string; o: number; c?: string }

// The colour and heart strength of each kind of glow, for the small ones
// drawn as flat dots.
const PAINT: Record<string, readonly [string, number]> = {
  'mw-ga': ['--arm', 0.5],
  'mw-gb': ['--arm-2', 0.36],
  'mw-gw': ['--old', 0.5],
  'mw-gh': ['--hii', 0.95],
  'mw-gc': ['--cluster', 0.55],
  'mw-gd': ['--lane', 0.92],
  'mw-gg': ['--gc', 0.9],
}

// Dot widths a small glow is rounded to, so that dots of one colour and
// strength share a handful of paths.
const WIDTHS = [2, 3, 4.5, 7, 10, 14, 19, 25] as const

// The stacked dots of a small glow: width as a share of its radius, the
// opacity each adds, and drawing order. The tiniest take one dot, smaller
// glows and breathing knots two, the rest three, so the steps stay faint.
const DOT: Record<string, readonly [number, number, number]> = {
  o: [1, 0.8, 0],
  p: [1.2, 0.55, 0],
  q: [0.6, 0.67, 2],
  a: [1.2, 0.38, 0],
  b: [0.8, 0.44, 1],
  c: [0.4, 0.66, 2],
}
const ONE = ['o'] as const
const TWO = ['p', 'q'] as const
const THREE = ['a', 'b', 'c'] as const

// Below this radius a glow is drawn as stacked flat dots rather than a
// gradient circle: at that size the steps between them barely show, and a
// few merged paths cost far less than hundreds of circles.
const SMALL = 21

// Soft glows. Large ones are circles filled with their gradient, drawn
// smaller than asked to suit glowFill's trimmed tail, and gathered by
// gradient and strength. Small ones become a wide faint dot under narrower
// denser ones, merged into one round-capped path per colour, strength, layer
// and width. A glow class marks a breathing hydrogen knot: as circles they
// scale; as dots their path's width swells instead (mw-ko, mw-ki).
export function glows(list: readonly Glow[]): string {
  const groups = new Map<string, string[]>()
  const dots = new Map<string, Pt[]>()

  for (const g of list) {
    const r = g.r * 0.8

    if (r >= SMALL) {
      const o = Math.max(1, Math.min(10, Math.round(g.o * 10)))
      const key = `${g.f}|${o}`
      const out = groups.get(key) ?? []

      out.push(`<circle${g.c ? ` class="${g.c}"` : ''} cx="${Math.round(g.x)}" cy="${Math.round(g.y)}" r="${Math.round(g.r * 0.72)}"/>`)
      groups.set(key, out)
      continue
    }
    const o = Math.max(1, Math.min(3, Math.round(g.o * 3)))
    const near = (w: number): number => WIDTHS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a))

    for (const layer of g.c ? TWO : r < 4 ? ONE : r < 10 ? TWO : THREE) {
      const w = g.c ? 0 : near(r * (DOT[layer] as readonly [number, number, number])[0])
      const key = `${g.f}|${o}|${layer}|${w}|${g.c ?? ''}`

      dots.set(key, [...(dots.get(key) ?? []), [g.x, g.y]])
    }
  }

  const circles = [...groups].map(([key, items]) => {
    const [f, o] = key.split('|')

    return `<g fill="url(#${f})"${o === '10' ? '' : ` fill-opacity=".${o}"`}>${items.join('')}</g>`
  })
  const order = (key: string): number => (DOT[key.split('|')[2] as string] as readonly [number, number, number])[2]
  const flat = [...dots]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([key, pts]) => {
      const [f, o, layer, w, c] = key.split('|')
      const [v, core] = PAINT[f as string] as readonly [string, number]
      const op = Math.round(core * (Number(o) / 3) * (DOT[layer as string] as readonly [number, number, number])[1] * 100) / 100
      const cls = c ? ` ${c} mw-k${layer === 'q' ? 'i' : 'o'}` : ''

      return `<path class="mw-gl${cls}" style="stroke:var(${v})" stroke-opacity="${op}"${c ? '' : ` stroke-width="${w}"`} d="${specks(pts)}"/>`
    })

  return circles.join('') + flat.join('')
}

// A smooth line guided by the points, whole pixels: it starts and ends on
// the first and last and passes midway between the others, each of which
// pulls the curve toward itself. Written with the short T command, whose
// control point is the mirror of the one before.
export function line(pts: readonly Pt[]): string {
  const at = (i: number): Pt => pts[i] as Pt
  const last = pts.length - 1

  if (last < 2) {
    return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`).join('')
  }
  const mid = (i: number): string => (i === last - 1 ? `${Math.round(at(last)[0])} ${Math.round(at(last)[1])}` : `${Math.round((at(i)[0] + at(i + 1)[0]) / 2)} ${Math.round((at(i)[1] + at(i + 1)[1]) / 2)}`)
  let d = `M${Math.round(at(0)[0])} ${Math.round(at(0)[1])}Q${Math.round(at(1)[0])} ${Math.round(at(1)[1])} ${mid(1)}`

  for (let i = 2; i < last; i++) {
    d += `T${mid(i)}`
  }

  return d
}

// A path of dots drawn as a stroke.
export const dotPath = (cls: string, w: number, pts: readonly Pt[], extra = '', cell = 30): string =>
  pts.length ? `<path class="${cls}" stroke-width="${w}"${extra} d="${specks(pts, cell)}"/>` : ''

const BLOB_WIDTHS = [6, 13, 24, 38, 54] as const

// Glows for a layer that is blurred as a whole: each is one flat dot, and
// the blur gives it its soft edge. Dots of one colour, strength and width
// share a round-capped path, so hundreds of glows are a few dozen shapes.
// spread is the dot's width over the glow's radius, and strength scales its
// opacity.
export function blobs(list: readonly Glow[], spread: number, strength = 1): string {
  const paths = new Map<string, Pt[]>()
  const near = (w: number): number => BLOB_WIDTHS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a))

  for (const g of list) {
    // The faintest add little light for their area.
    if (g.o * strength < 0.2) {
      continue
    }
    const o = Math.max(1, Math.min(3, Math.round(g.o * 3)))
    const key = `${g.f}|${o}|${near(g.r * spread)}`

    paths.set(key, [...(paths.get(key) ?? []), [g.x, g.y]])
  }

  return [...paths]
    .sort(([a], [b]) => Number(b.split('|')[2]) - Number(a.split('|')[2]))
    .map(([key, pts]) => {
      const [f, o, w] = key.split('|')
      const [v, core] = PAINT[f as string] as readonly [string, number]

      return `<path class="mw-gl" style="stroke:var(${v})" stroke-opacity="${Math.round(Math.min(1, core * (Number(o) / 3) * strength) * 100) / 100}" stroke-width="${w}" d="${specks(pts)}"/>`
    })
    .join('')
}
