// The nebula's raw material: smooth noise to shape gas and dust, and soft
// "splats" to paint with. A splat is a round gradient that fades to nothing,
// stamped at every vertex of a path through an SVG marker, so a cloud of
// thousands costs a pair of numbers each and needs no blur: gas built from
// them thins out into space and never shows an edge.
import type { Pt } from './kit'

const hash = (ix: number, iy: number, s: number): number => {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s + 1, 1442695041)

  h = Math.imul(h ^ (h >>> 13), 1274126177)

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)

// Smooth value noise, 0 to 1.
export function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const u = fade(x - ix)
  const v = fade(y - iy)
  const a = hash(ix, iy, seed)
  const b = hash(ix + 1, iy, seed)
  const c = hash(ix, iy + 1, seed)
  const d = hash(ix + 1, iy + 1, seed)

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// Fractal noise: octaves of detail on detail, stretched back out to 0..1.
export function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let sum = 0
  let amp = 1
  let total = 0
  let f = 1

  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * f, y * f, seed + i * 17)
    total += amp
    amp *= 0.5
    f *= 2.03
  }

  return clamp((sum / total - 0.5) * 2.1 + 0.5)
}

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))

export const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a))

  return t * t * (3 - 2 * t)
}

// A smooth curve y(x) through control points sorted by x.
export function curve(pts: readonly Pt[]): (x: number) => number {
  return (x: number) => {
    let i = 0

    while (i < pts.length - 2 && x > (pts[i + 1] as Pt)[0]) {
      i++
    }
    const p0 = pts[Math.max(0, i - 1)] as Pt
    const p1 = pts[i] as Pt
    const p2 = pts[i + 1] as Pt
    const p3 = pts[Math.min(pts.length - 1, i + 2)] as Pt
    const t = clamp((x - p1[0]) / (p2[0] - p1[0]))
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * (p2[0] - p1[0])
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * (p2[0] - p1[0])
    const t2 = t * t
    const t3 = t2 * t

    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2
  }
}

// Points as one compact path: the first absolute, the rest as steps.
export function steps(pts: readonly Pt[]): string {
  let px = Math.round((pts[0] as Pt)[0])
  let py = Math.round((pts[0] as Pt)[1])
  let d = `M${px} ${py}`

  for (let i = 1; i < pts.length; i++) {
    const x = Math.round((pts[i] as Pt)[0])
    const y = Math.round((pts[i] as Pt)[1])
    const dy = y - py

    d += `${i > 1 ? ' ' : 'l'}${x - px}${dy < 0 ? '' : ' '}${dy}`
    px = x
    py = y
  }

  return d
}

// One colour of splat: a gradient that falls away like a bell, and a marker
// for each strength. `v` is the CSS variable holding the colour.
const BELL: readonly (readonly [number, number])[] = [[0, 1], [0.18, 0.86], [0.36, 0.6], [0.54, 0.33], [0.72, 0.13], [0.88, 0.03], [1, 0]]

export const LEVELS = [0.07, 0.14, 0.26, 0.45, 0.85] as const

const used = new Set<string>()

// Call after every splat has been added: only the strengths in use get a marker.
// A solid colour gets a flat-topped profile instead, so a sparse row covers.
const SLAB: readonly (readonly [number, number])[] = [[0, 1], [0.45, 1], [0.62, 0.72], [0.78, 0.32], [0.9, 0.08], [1, 0]]

export function splatDefs(colors: Record<string, string>, solid = ''): { defs: string; css: string } {
  let defs = ''
  let css = ''

  for (const [k, v] of Object.entries(colors)) {
    defs += `<radialGradient id="g${k}">${(solid.includes(k) ? SLAB : BELL).map(([o, a]) => `<stop offset="${o}" class="c${k}" stop-opacity="${a}"/>`).join('')}</radialGradient>`
    css += `.c${k}{stop-color:var(${v})}`
    LEVELS.forEach((a, i) => {
      if (used.has(`${k}${i}`)) {
        defs += `<marker id="m${k}${i}" viewBox="-1 -1 2 2" markerWidth="1" markerHeight="1"><circle r="1" fill="url(#g${k})" opacity="${a}"/></marker>`
        css += `.${k}${i}{marker:url(#m${k}${i})}`
      }
    })
  }

  return { defs, css: `${css}.sp path{fill:none}` }
}

// A bag of splats, grouped so each colour, strength and size is one path.
export class Splats {
  private readonly buckets = new Map<string, Pt[]>()

  // colour key, strength 0..1 (snapped to a level; too faint is dropped), diameter.
  add(k: string, strength: number, dia: number, x: number, y: number): void {
    let level = -1

    for (let i = 0; i < LEVELS.length; i++) {
      if (strength >= (LEVELS[i] as number) * 0.72) {
        level = i
      }
    }
    if (level < 0) {
      return
    }
    used.add(`${k}${level}`)
    const key = `${k}${level}|${Math.round(dia)}`
    const list = this.buckets.get(key)

    if (list) {
      list.push([x, y])
    } else {
      this.buckets.set(key, [[x, y]])
    }
  }

  get count(): number {
    let c = 0

    for (const l of this.buckets.values()) {
      c += l.length
    }

    return c
  }

  // `order` lists colour keys from the bottom of the stack to the top.
  render(order: string): string {
    const keys = [...this.buckets.keys()].sort((a, b) => order.indexOf(a[0] as string) - order.indexOf(b[0] as string) || Number(b.split('|')[1]) - Number(a.split('|')[1]))

    return `<g class="sp">${keys
      .map(key => {
        const [cls, dia] = key.split('|')
        const list = this.buckets.get(key) as Pt[]

        return `<path class="${cls}" stroke-width="${dia}" d="${steps(list)}${list.length === 1 ? 'h0' : ''}"/>`
      })
      .join('')}</g>`
  }
}

// Fine threads: polylines gathered into one path.
export class Threads {
  private readonly list: string[] = []

  add(pts: readonly Pt[]): void {
    if (pts.length > 1) {
      this.list.push(steps(pts))
    }
  }

  get count(): number {
    return this.list.length
  }

  render(attrs: string): string {
    return this.list.length ? `<path ${attrs} d="${this.list.join('')}"/>` : ''
  }
}

// The outline of a field where it crosses `level`, as closed loops: marching
// squares over a grid of `cell` pixels. Everything beyond the grid counts as
// empty, so every loop closes.
export function contours(f: (x: number, y: number) => number, level: number, cell: number, x0: number, y0: number, x1: number, y1: number): Pt[][] {
  const nx = Math.ceil((x1 - x0) / cell) + 1
  const ny = Math.ceil((y1 - y0) / cell) + 1
  const v = new Float32Array(nx * ny)

  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      v[j * nx + i] = f(x0 + i * cell, y0 + j * cell) - level
    }
  }
  for (let i = 0; i < nx * ny; i++) {
    const edge = i < nx || i >= nx * (ny - 1) || i % nx === 0 || i % nx === nx - 1

    if (edge) {
      v[i] = -level
    }
  }
  const pts = new Map<number, Pt>()
  const links = new Map<number, number[]>()
  // A crossing on the edge leaving grid point (i, j) rightward (0) or downward (1).
  const cross = (i: number, j: number, dir: number): number => {
    const key = (j * nx + i) * 2 + dir

    if (!pts.has(key)) {
      const a = v[j * nx + i] as number
      const b = v[dir ? (j + 1) * nx + i : j * nx + i + 1] as number
      const t = a / (a - b)

      pts.set(key, [x0 + (i + (dir ? 0 : t)) * cell, y0 + (j + (dir ? t : 0)) * cell])
    }

    return key
  }
  const link = (a: number, b: number): void => {
    links.set(a, [...(links.get(a) ?? []), b])
    links.set(b, [...(links.get(b) ?? []), a])
  }

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = (v[j * nx + i] as number) > 0 ? 1 : 0
      const b = (v[j * nx + i + 1] as number) > 0 ? 2 : 0
      const c = (v[(j + 1) * nx + i + 1] as number) > 0 ? 4 : 0
      const d = (v[(j + 1) * nx + i] as number) > 0 ? 8 : 0
      const code = a | b | c | d

      if (code === 0 || code === 15) {
        continue
      }
      const top = (): number => cross(i, j, 0)
      const right = (): number => cross(i + 1, j, 1)
      const bottom = (): number => cross(i, j + 1, 0)
      const left = (): number => cross(i, j, 1)

      switch (code) {
        case 1: case 14: link(left(), top()); break
        case 2: case 13: link(top(), right()); break
        case 3: case 12: link(left(), right()); break
        case 4: case 11: link(right(), bottom()); break
        case 6: case 9: link(top(), bottom()); break
        case 7: case 8: link(left(), bottom()); break
        case 5: link(left(), top()); link(right(), bottom()); break
        default: link(top(), right()); link(bottom(), left())
      }
    }
  }
  const seen = new Set<number>()
  const loops: Pt[][] = []

  for (const start of links.keys()) {
    if (seen.has(start)) {
      continue
    }
    const loop: Pt[] = []
    let cur = start
    let prev = -1

    while (!seen.has(cur)) {
      seen.add(cur)
      loop.push(pts.get(cur) as Pt)
      const next = (links.get(cur) as number[]).find(k => k !== prev && !seen.has(k))

      if (next === undefined) {
        break
      }
      prev = cur
      cur = next
    }
    loops.push(loop)
  }

  return loops
}
