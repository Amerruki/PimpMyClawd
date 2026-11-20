// Geometry for the Casablanca scene. Everything stands on one ground plane
// seen by one camera, so the landmarks share a horizon and a scale: a point
// is [X metres right of the camera, D metres away, z metres up], and the
// boulevard is z = 0. The sun is low on the left, a little behind the viewer.

export const HZ = 560
export const F = 1400
export const CX = 800
export const CAM = 14
export const SEA = -5

export type P3 = readonly [number, number, number]
export type P2 = readonly [number, number]

export const r1 = (v: number): string => (Math.round(v * 10) / 10).toString()
export const r0 = (v: number): string => Math.round(v).toString()

export const pr = ([X, D, z]: P3): P2 => [CX + (F * X) / D, HZ + (F * (CAM - z)) / D]
// Pixels per metre at depth D, and the ground's y there.
export const ppm = (D: number): number => F / D
export const gy = (D: number, z = 0): number => HZ + (F * (CAM - z)) / D

const fmt = (p: P2, f: (v: number) => string): string => `${f(p[0])} ${f(p[1])}`
export const line = (list: readonly P3[], f = r1): string => list.map(p => fmt(pr(p), f)).join('L')
export const poly = (list: readonly P3[], f = r1): string => `M${line(list, f)}Z`

// A vertical wall: s runs along it from `o` in direction `d` (a unit vector
// in the ground plane), z is height above `z0`.
// `tp` tapers a tower face: it narrows about its centre line `c` and leans
// in along `n` by the same amount, `k` per metre of height.
export type Wall = { o: P2; d: P2; z0: number; tp?: { c: number; k: number; n: P2 } }
export const wall = (o: P2, d: P2, z0 = 0): Wall => ({ o, d, z0 })
export const wp = (w: Wall, s: number, z: number): P3 => {
  if (!w.tp) return [w.o[0] + w.d[0] * s, w.o[1] + w.d[1] * s, w.z0 + z]
  const f = w.tp.k * z
  const q = w.tp.c + (s - w.tp.c) * (1 - f)
  const m = w.tp.c * f
  return [w.o[0] + w.d[0] * q + w.tp.n[0] * m, w.o[1] + w.d[1] * q + w.tp.n[1] * m, w.z0 + z]
}
export const wpoly = (w: Wall, list: readonly P2[], f = r1): string => poly(list.map(([s, z]) => wp(w, s, z)), f)
export const wline = (w: Wall, list: readonly P2[], f = r1): string => `M${line(list.map(([s, z]) => wp(w, s, z)), f)}`
export const wrect = (w: Wall, s0: number, s1: number, z0: number, z1: number, f = r1): string =>
  wpoly(w, [[s0, z0], [s1, z0], [s1, z1], [s0, z1]], f)

// The matrix that carries a wall's own (s, z-up) metres onto the screen near
// (s0, z0): for pattern fills that must lie in the wall's plane.
export function wallMatrix(w: Wall, s0 = 0, z0 = 0, sc = s0): string {
  const c = pr(wp(w, sc, z0))
  const ps = pr(wp(w, sc + 1, z0))
  const pz = pr(wp(w, sc, z0 + 1))
  const ax = ps[0] - c[0]
  const ay = ps[1] - c[1]
  const m = [ax, ay, pz[0] - c[0], pz[1] - c[1], c[0] - ax * (sc - s0), c[1] - ay * (sc - s0)]
  return `matrix(${m.map(v => (Math.round(v * 1000) / 1000).toString()).join(' ')})`
}

// The outline of an arched opening in a wall's own metres: jambs from zb up
// to the springing at zs, then a horseshoe arch of half-width w about c.
// `point` > 0 draws the pointed horseshoe of Moroccan portals.
export function arch(c: number, w: number, zb: number, zs: number, point = 0.35, seg = 5, swell = 1.13): P2[] {
  const R = w * swell
  const e = R * point
  const a0 = -Math.acos((w + e) / (R + e))
  const a1 = Math.acos(e / (R + e))
  const zc = zs - (R + e) * Math.sin(a0)
  const left: P2[] = []
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg
    left.push([c + e - (R + e) * Math.cos(a), zc + (R + e) * Math.sin(a)])
  }
  const right = left
    .slice(0, -1)
    .reverse()
    .map(([s, z]): P2 => [2 * c - s, z])
  return [[c - w, zb], ...left, ...right, [c + w, zb]]
}
export const archTop = (w: number, zs: number, point = 0.35, swell = 1.13): number => {
  const R = w * swell
  const e = R * point
  const a0 = -Math.acos((w + e) / (R + e))
  const a1 = Math.acos(e / (R + e))
  return zs - (R + e) * Math.sin(a0) + (R + e) * Math.sin(a1)
}

// Sun direction in the ground plane (toward the sun) and a face's light.
const SUN: P2 = [-0.87, -0.49]
export const lam = (nx: number, nd: number): number => nx * SUN[0] + nd * SUN[1]
export const tone = (nx: number, nd: number): 0 | 1 | 2 => {
  const l = lam(nx, nd)
  return l > 0.62 ? 2 : l > 0.05 ? 1 : 0
}

export type Face = { w: Wall; len: number; h: number; t: 0 | 1 | 2 }

// The side faces of a box the camera can see, far one first. The box's
// footprint is `len` along unit axis `a` from corner `o`, `wid` to the left
// of it (toward (-a.d, a.x) rotated), from z0 up `h`.
export function boxFaces(o: P2, a: P2, len: number, wid: number, z0: number, h: number): Face[] {
  const b: P2 = [-a[1], a[0]]
  const c0 = o
  const c1: P2 = [o[0] + a[0] * len, o[1] + a[1] * len]
  const c2: P2 = [c1[0] + b[0] * wid, c1[1] + b[1] * wid]
  const c3: P2 = [o[0] + b[0] * wid, o[1] + b[1] * wid]
  const sides: { p: P2; q: P2; n: P2; l: number }[] = [
    { p: c0, q: c1, n: [-b[0], -b[1]], l: len },
    { p: c1, q: c2, n: a, l: wid },
    { p: c2, q: c3, n: b, l: len },
    { p: c3, q: c0, n: [-a[0], -a[1]], l: wid },
  ]
  return sides
    .filter(s => {
      const mx = (s.p[0] + s.q[0]) / 2
      const md = (s.p[1] + s.q[1]) / 2
      return s.n[0] * -mx + s.n[1] * -md > 0
    })
    .map(s => {
      // run each face left to right on screen
      const flip = pr([s.p[0], s.p[1], 0])[0] > pr([s.q[0], s.q[1], 0])[0]
      const p = flip ? s.q : s.p
      const q = flip ? s.p : s.q
      return { w: wall(p, [(q[0] - p[0]) / s.l, (q[1] - p[1]) / s.l], z0), len: s.l, h, t: tone(s.n[0], s.n[1]), far: (s.p[1] + s.q[1]) / 2 }
    })
    .sort((x, y) => y.far - x.far)
}

// A paint key is a class name, or a fill such as `url(#id)`.
const paint = (key: string): string => (key.startsWith('url(') ? `fill="${key}"` : `class="${key}"`)

export type Sink = { add(cls: string, d: string): Sink; raw(s: string): Sink }

// Paint layers: consecutive shapes of one class share a path.
export class Paint implements Sink {
  private out: string[] = []
  private cls = ''
  private d = ''
  add(cls: string, d: string): this {
    if (cls !== this.cls) this.flush()
    this.cls = cls
    this.d += d
    return this
  }
  raw(s: string): this {
    this.flush()
    this.out.push(s)
    return this
  }
  private flush(): void {
    if (this.d) this.out.push(`<path ${paint(this.cls)} d="${this.d}"/>`)
    this.d = ''
    this.cls = ''
  }
  done(): string {
    this.flush()
    return this.out.join('')
  }
}

// Numbered layers for parts that do not overlap one another, such as the
// bays along one wall or the two seen faces of a tower: within a layer every
// shape of one paint shares a path, whatever order they came in, so only
// the stacking between layers is kept. A unit is one part laid in from
// `start`, each change of paint stepping it up a layer.
export class Layers {
  private keys: [number, number, string][] = []
  private d = new Map<string, string>()
  private n = 0
  add(layer: number, cls: string, d: string): this {
    const k = `${layer} ${cls}`
    if (!this.d.has(k)) this.keys.push([layer, this.n++, k])
    this.d.set(k, (this.d.get(k) ?? '') + d)
    return this
  }
  raw(layer: number, s: string): this {
    const k = `${layer} #${this.n}`
    this.keys.push([layer, this.n++, k])
    this.d.set(k, s)
    return this
  }
  unit(start = 0): Sink {
    let slot = start - 1
    let last = ''
    const sink: Sink = {
      add: (cls, d) => {
        if (cls !== last) slot++
        last = cls
        this.add(slot, cls, d)
        return sink
      },
      raw: s => {
        slot++
        last = ''
        this.raw(slot, s)
        return sink
      },
    }
    return sink
  }
  done(): string {
    return this.keys
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(([, , k]) => {
        const cls = k.slice(k.indexOf(' ') + 1)
        const d = this.d.get(k) as string
        return cls.startsWith('#') ? d : `<path ${paint(cls)} d="${d}"/>`
      })
      .join('')
  }
}

export const patterns: string[] = []
let patN = 0
export const patId = (): string => `cb-p${patN++}`
// A fill that lies in the wall's plane: the base pattern re-used through the
// wall's own matrix.
export function planeFill(base: string, w: Wall, s0 = 0, z0 = 0, sc = s0): string {
  const id = patId()
  patterns.push(`<pattern id="${id}" href="#${base}" patternTransform="${wallMatrix(w, s0, z0, sc)}"/>`)
  return `url(#${id})`
}

// Rewrites path data in its shortest form: each segment absolute or
// relative, whichever is shorter, with no leading zeros and no space before
// a minus. Relative steps are measured from where the renderer will be, so
// rounding never drifts.
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }
const num = (v: number): string => {
  const s = (Math.round(v * 1000) / 1000).toString()
  return s === '-0' ? '0' : s.replace(/^(-?)0\./, '$1.')
}
const join = (vs: number[]): string => vs.map((v, i) => (i && !num(v).startsWith('-') ? ' ' : '') + num(v)).join('')
export function compact(d: string): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  let out = ''
  let last = ''
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let i = 0
  while (i < tok.length) {
    const cmd = tok[i++] as string
    const lc = cmd.toLowerCase()
    const rel = cmd === lc
    const k = ARGS[lc] as number
    if (k === 0) {
      out += 'Z'
      last = 'Z'
      cx = sx
      cy = sy
      continue
    }
    let first = true
    while (i < tok.length && !/[a-zA-Z]/.test(tok[i] as string)) {
      const v = tok.slice(i, i + k).map(Number)
      i += k
      const op = lc === 'm' && !first ? 'l' : lc
      first = false
      // absolute values of every coordinate in this segment
      const ab = v.slice()
      const isX = (j: number) => (op === 'h' ? true : op === 'v' ? false : op === 'a' ? j === 5 : j % 2 === 0)
      const isCoord = (j: number) => op !== 'a' || j >= 5
      if (rel) for (let j = 0; j < k; j++) if (isCoord(j)) ab[j] = (ab[j] as number) + (isX(j) ? cx : cy)
      const rv = ab.map((a, j) => (isCoord(j) ? a - (isX(j) ? cx : cy) : a))
      const absS = join(ab)
      const relS = join(rv)
      const useRel = relS.length < absS.length
      const letter = useRel ? op : op.toUpperCase()
      const vals = useRel ? relS : absS
      const implicit = letter === last && last !== 'M' && last !== 'm'
      out += implicit ? (vals.startsWith('-') ? vals : ' ' + vals) : letter + vals
      last = letter
      // the renderer's point after this segment, from what was written
      const back = vals.match(/-?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) ?? []
      const fx = op === 'h' ? 0 : op === 'v' ? -1 : k - 2
      const nx = op === 'v' ? cx : (useRel ? cx : 0) + (back[fx] as number)
      const ny = op === 'h' ? cy : (useRel ? cy : 0) + (back[op === 'v' ? 0 : k - 1] as number)
      cx = nx
      cy = ny
      if (op === 'm') {
        sx = cx
        sy = cy
      }
    }
  }
  return out
}
