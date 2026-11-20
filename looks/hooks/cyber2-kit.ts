// The re-shot Neon Ward's camera and drawing tools. The camera stands in the
// street, a little above head height, and looks down it past low walls:
// one vanishing point at (VX, VY). World metres: X across (negative left),
// Y up from the street, Z away from the camera.
export const VX = 850
export const VY = 560
export const F = 1000
export const CAM = 2.8
// The building lines either side of the street.
export const LX = -20
export const RX = 21

export type Pt = readonly [number, number]

export const P = (X: number, Y: number, Z: number): Pt => [VX + (F * X) / Z, VY + (F * (CAM - Y)) / Z]

const r = Math.round
export const r1 = (v: number): string => (Math.round(v * 10) / 10).toString()

// A closed path through the points, in whole pixels and relative steps.
export function shape(points: readonly Pt[], close = true): string {
  let [px, py] = [r(points[0]![0]), r(points[0]![1])]
  let d = `M${px} ${py}l`
  let first = true

  for (let i = 1; i < points.length; i++) {
    const [x, y] = [r(points[i]![0]), r(points[i]![1])]
    const dx = x - px
    const dy = y - py
    d += `${first || dx < 0 ? '' : ' '}${dx}${dy < 0 ? '' : ' '}${dy}`
    first = false
    px = x
    py = y
  }

  return close ? `${d}Z` : d
}

// Paths grouped by class, so every shape of one paint is one element.
export class Bucket {
  private map = new Map<string, string[]>()
  add(cls: string, d: string): this {
    const list = this.map.get(cls)
    if (list) list.push(d)
    else this.map.set(cls, [d])

    return this
  }
  toString(): string {
    return [...this.map].map(([c, list]) => `<path class="${c}" d="${list.join('')}"/>`).join('')
  }
}

// A wall along the street at a fixed X: shapes given in (Z, Y) land on it.
export type Wall = {
  X: number
  pt: (z: number, y: number) => Pt
  // A rectangle on the wall between two depths and two heights.
  q: (z0: number, z1: number, y0: number, y1: number) => string
  // Any polygon on the wall.
  poly: (zy: readonly Pt[]) => string
  // A rectangle standing off the wall by `off` metres toward the street.
  qo: (off: number, z0: number, z1: number, y0: number, y1: number) => string
  // A camera-facing rectangle at depth z, from the wall out to `out` metres.
  blade: (z: number, in_: number, out: number, y0: number, y1: number) => string
  // A box on the wall: its street face, its near end and, when the camera
  // can see them, its top or underside. Returns [face, end, top/under].
  box: (z0: number, z1: number, y0: number, y1: number, depth: number) => [string, string, string]
  // An affine frame for text lying on the wall at (z, y), one unit one pixel
  // tall: reads toward the street's far end on the left wall, toward the
  // camera's side on the right.
  frame: (z: number, y: number) => string
}

export function wall(X: number): Wall {
  const sg = X < 0 ? 1 : -1
  const pt = (z: number, y: number): Pt => P(X, y, z)
  const at = (off: number) => X + sg * off
  const q = (z0: number, z1: number, y0: number, y1: number) => shape([pt(z0, y1), pt(z1, y1), pt(z1, y0), pt(z0, y0)])
  const qo = (off: number, z0: number, z1: number, y0: number, y1: number) =>
    shape([P(at(off), y1, z0), P(at(off), y1, z1), P(at(off), y0, z1), P(at(off), y0, z0)])

  return {
    X,
    pt,
    q,
    qo,
    poly: zy => shape(zy.map(([z, y]) => pt(z, y))),
    blade: (z, in_, out, y0, y1) => shape([P(at(in_), y1, z), P(at(out), y1, z), P(at(out), y0, z), P(at(in_), y0, z)]),
    box: (z0, z1, y0, y1, depth) => {
      const face = qo(depth, z0, z1, y0, y1)
      const end = shape([pt(z0, y1), P(at(depth), y1, z0), P(at(depth), y0, z0), pt(z0, y0)])
      const yy = y1 < CAM ? y1 : y0 > CAM ? y0 : null
      const cap = yy === null ? '' : shape([pt(z0, yy), pt(z1, yy), P(at(depth), yy, z1), P(at(depth), yy, z0)])

      return [face, end, cap]
    },
    frame: (z, y) => {
      const [x0, y0] = pt(z, y)
      const k = Math.abs(X) / z
      const b = (-sg * (CAM - y)) / z
      const f = (v: number) => (Math.round(v * 1000) / 1000).toString().replace(/^(-?)0\./, '$1.')

      return `matrix(${f(k)} ${f(b)} 0 1 ${r(x0)} ${r(y0)})`
    },
  }
}

export const LW = wall(LX)
export const RW = wall(RX)

// Pixels per metre at a depth.
export const ppm = (z: number): number => F / z

export const JP = `'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP','Noto Sans CJK JP',sans-serif`

// Every paint that changes between day and night: [day, night].
export const PAINT: Record<string, readonly [string, string]> = {
  // Sky: top, middle, horizon, and the glow at the street's far end.
  k0: ['#bdb489', '#05040d'],
  k1: ['#ddd2a0', '#150b30'],
  k2: ['#f6ebbd', '#4a1a58'],
  hz: ['#fff6d2', '#ff7a8a'],
  // Smog veil over far layers.
  sm: ['#efe4b4', '#3a1850'],
  // Far towers, farthest first, and their window specks.
  f1: ['#d9cea2', '#22133f'],
  f2: ['#c6bb92', '#190f33'],
  f3: ['#aea584', '#120b28'],
  fw: ['#9c9274', '#ffc27a'],
  fv: ['#8f8a78', '#7fe9ff'],
  // Megatower: front, side, dark trim, light trim.
  m0: ['#a39b80', '#0d0a20'],
  m1: ['#b9b192', '#1b0f33'],
  m2: ['#7f7865', '#070512'],
  m3: ['#cfc7a6', '#2a2350'],
  // Near walls: base, shade, lit, trim, metal.
  a0: ['#8d8473', '#17132b'],
  a1: ['#5e574b', '#0b0917'],
  a2: ['#b0a68f', '#262046'],
  a3: ['#a09783', '#201a3a'],
  a4: ['#4a463f', '#0f0d1c'],
  // Middle walls, hazier.
  b0: ['#a0977f', '#1a1431'],
  b1: ['#787160', '#0f0b1f'],
  b2: ['#bcb294', '#2a2148'],
  // Far street walls.
  c0: ['#bdb392', '#231640'],
  c1: ['#a39a7e', '#180f30'],
  // Glass: dark and reflecting.
  g0: ['#3d4347', '#07060f'],
  g1: ['#68716f', '#141230'],
  // Lit windows: amber, pale, cyan, magenta, dim.
  l1: ['#d8c48c', '#ffb45a'],
  l2: ['#e6dcb4', '#ffe2a6'],
  l3: ['#a9bdb6', '#5af0ff'],
  l4: ['#c9a0a8', '#ff5fd2'],
  l5: ['#8a7f68', '#7a4a2c'],
  // Street: road, pavement, markings, kerb.
  r0: ['#8e8870', '#0a0813'],
  r1: ['#a59d83', '#15122a'],
  r2: ['#d8d0b0', '#3a3560'],
  r3: ['#6f6a59', '#06050c'],
  // The overpass under the camera.
  o0: ['#4c483f', '#040308'],
  o1: ['#6e695d', '#0e0c1a'],
  // Puddles.
  pd: ['#c6be9e', '#141230'],
  // Sign housings, people, deepest shade.
  n0: ['#2c2a2a', '#0a0814'],
  p0: ['#3a3733', '#07060e'],
  p1: ['#59544c', '#141126'],
  x0: ['#2a2722', '#030208'],
  // Cloth and small props.
  t0: ['#b8ad92', '#3a3358'],
  t1: ['#9a6a5a', '#5a2a4a'],
  t2: ['#6f8a8c', '#1f4a66'],
  // The megabuilding's glass: top, foot, mullions, the sky held in it.
  q0: ['#7f9099', '#07071c'],
  q1: ['#aab4b0', '#141134'],
  q2: ['#56636a', '#2c2a5c'],
  q3: ['#e9efe8', '#4a3f9a'],
  // The exchange's stone: lit, shaded, deep.
  e0: ['#d9cfb2', '#38325a'],
  e1: ['#b0a68c', '#231e40'],
  e2: ['#7a7262', '#110e24'],
  // The two lights and how strong their spill is.
  holo: ['#e75fb8', '#ff3fb4'],
  scr: ['#3fb8c8', '#22e6ff'],
  // Rim lights on edges facing the hologram and the screens.
  rm: ['#fff3d0', '#ff5ac8'],
  rc: ['#ffffff', '#5aefff'],
}

export function paintCss(): { day: string; night: string; classes: string } {
  const keys = Object.keys(PAINT)

  return {
    day: keys.map(k => `--${k}:${PAINT[k]![0]}`).join(';'),
    night: keys.map(k => `--${k}:${PAINT[k]![1]}`).join(';'),
    classes: keys.map(k => `.${k}{fill:var(--${k})}`).join(''),
  }
}

export type Rect = { x: number; y: number; w: number; h: number }

const LIT_ROOMS = ['l1', 'l1', 'l2', 'l5', 'l5', 'l1 st', 'l2 st', 'l5', 'l3 st']

// A camera-facing grid of rooms on a tower face: each window one room, lit
// or dark, some with a blind half down or furniture against the sill, and
// dark rooms that light while the session works. Windows that fall behind a
// `hole` (a display in front) stay dark glass so the display reads.
export function rooms(
  b: Bucket,
  wo: Bucket,
  area: Rect,
  bay: number,
  storey: number,
  seed: number,
  lit: number,
  holes: readonly Rect[] = [],
  frame = 4,
  // Off for a glass wall, where an unlit room is the glass itself.
  dark = true,
): void {
  let s = seed
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  const cols = Math.max(1, Math.floor(area.w / bay))
  const rows = Math.max(1, Math.floor(area.h / storey))
  const bw = area.w / cols
  const over = (x: number, y: number, w: number, h: number) => holes.some(o => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y)

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = Math.round(area.x + i * bw + frame)
      const y = Math.round(area.y + j * storey + frame)
      const w = Math.round(bw - frame * 2)
      const h = Math.round(storey - frame * 2.6)
      const d = `M${x} ${y}h${w}v${h}h${-w}z`
      const on = rand() < lit
      const cls = LIT_ROOMS[Math.floor(rand() * LIT_ROOMS.length)]!
      const what = rand()

      if (over(x, y, w, h)) {
        if (dark) b.add('g0', d)
        continue
      }
      if (!on) {
        if (dark) b.add(what < 0.5 ? 'g0' : 'g1', d)
        if (rand() < 0.5) wo.add(cls, d)
        continue
      }
      b.add(cls, d)
      // The room: a blind, a desk and a lamp, or shelves against the sill.
      if (what < 0.3) b.add('x0 st', `M${x} ${y}h${w}v${Math.round(h * (0.25 + rand() * 0.4))}h${-w}z`)
      else if (what < 0.6) b.add('x0 st', `M${x + Math.round(w * 0.15)} ${y + Math.round(h * 0.62)}h${Math.round(w * 0.5)}v${Math.round(h * 0.38)}h${-Math.round(w * 0.5)}z`)
      else if (what < 0.75) b.add('x0 st', `M${x + Math.round(w * 0.6)} ${y + Math.round(h * 0.3)}h${Math.max(2, Math.round(w * 0.12))}v${Math.round(h * 0.7)}h${-Math.max(2, Math.round(w * 0.12))}z`)
      // A transom and a mullion across the bigger windows.
      if (w > 20 && dark) b.add('x0 sv', `M${x} ${y + Math.round(h * 0.22)}h${w}v2h${-w}zM${x + Math.round(w / 2) - 1} ${y}h2v${h}h-2z`)
    }
  }
}
