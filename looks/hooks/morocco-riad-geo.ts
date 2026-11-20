// The Riad's camera and building, in metres. The court is a 12 m square
// (x east, z north, y up); the camera stands in its south-west corner at eye
// height, looking a little east of north, so the west arcade runs down the
// left of the frame, the north arcade faces it across the court and the east
// arcade recedes on the right. Everything is projected through one pinhole,
// so the arches, the floor and the light all agree.

export type V3 = readonly [number, number, number]
export type V2 = readonly [number, number]

export const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const YAW = (14 * Math.PI) / 180
const CAM = { x: 1.7, y: 1.6, z: 0.8, f: 700, cx: 800, hz: 690 }
const SY = Math.sin(YAW)
const CY = Math.cos(YAW)

export const S = 12
export const TOP = 8.85

export function depth(p: V3): number {
  return (p[0] - CAM.x) * SY + (p[2] - CAM.z) * CY
}

export function P(p: V3): V2 {
  const dx = p[0] - CAM.x
  const dz = p[2] - CAM.z
  const d = Math.max(0.05, dx * SY + dz * CY)
  const x = dx * CY - dz * SY

  return [CAM.cx + (CAM.f * x) / d, CAM.hz - (CAM.f * (p[1] - CAM.y)) / d]
}

// The scale at a point: screen pixels per metre.
export const ppm = (p: V3): number => CAM.f / Math.max(0.05, depth(p))

const r = (v: number): number => Math.round(v)
export const d2 = (list: readonly V2[]): string => list.length < 3 ? '' : `M${list.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`
export const d3 = (list: readonly V3[]): string => d2(clip(list, p => depth(p) - 0.25, mix3).map(P))
export const line3 = (list: readonly V3[]): string => list.some(p => depth(p) < 0.3) ? '' : `M${list.map(P).map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}`

// A wall seen from inside the court: u runs along it left to right as the
// camera sees it, v up, w out of the wall into the court.
export type Wall = { o: V3; u: V3; w: V3; name: string }
export const WALLS: Record<'west' | 'north' | 'east', Wall> = {
  west: { name: 'west', o: [0, 0, 0], u: [0, 0, 1], w: [1, 0, 0] },
  north: { name: 'north', o: [0, 0, S], u: [1, 0, 0], w: [0, 0, -1] },
  east: { name: 'east', o: [S, 0, S], u: [0, 0, -1], w: [-1, 0, 0] },
}

export function W(wall: Wall, u: number, v: number, w = 0): V3 {
  return [wall.o[0] + wall.u[0] * u + wall.w[0] * w, v, wall.o[2] + wall.u[2] * u + wall.w[2] * w]
}

export const wd = (wall: Wall, uv: readonly V2[], w = 0): string => d3(uv.map(([u, v]) => W(wall, u, v, w)))
export const wline = (wall: Wall, uv: readonly V2[], w = 0): string => line3(uv.map(([u, v]) => W(wall, u, v, w)))
export const wquad = (wall: Wall, u0: number, v0: number, u1: number, v1: number, w = 0): string =>
  wd(wall, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], w)

// An affine stand-in for the wall's perspective near (u, v): pattern units
// are centimetres, x along the wall, y downward. Good over a pier or a bay.
export function affine(wall: Wall, u: number, v: number, w = 0, span = 1): string {
  const o = P(W(wall, u, v, w))
  const a = P(W(wall, u + span, v, w))
  const b = P(W(wall, u, v - span, w))
  const k = 1 / (100 * span)
  const f = (x: number) => Math.round(x * 10000) / 10000

  return `matrix(${f((a[0] - o[0]) * k)} ${f((a[1] - o[1]) * k)} ${f((b[0] - o[0]) * k)} ${f((b[1] - o[1]) * k)} ${r(o[0])} ${r(o[1])})`
}

// The same for any plane through o, pattern x along ex and y along ey.
export function affineAt(o3: V3, ex: V3, ey: V3, span = 1): string {
  const o = P(o3)
  const a = P([o3[0] + ex[0] * span, o3[1] + ex[1] * span, o3[2] + ex[2] * span])
  const b = P([o3[0] + ey[0] * span, o3[1] + ey[1] * span, o3[2] + ey[2] * span])
  const k = 1 / (100 * span)
  const f = (x: number) => Math.round(x * 10000) / 10000

  return `matrix(${f((a[0] - o[0]) * k)} ${f((a[1] - o[1]) * k)} ${f((b[0] - o[0]) * k)} ${f((b[1] - o[1]) * k)} ${r(o[0])} ${r(o[1])})`
}

// The same for the floor around (x, z): pattern x east, y south.
export function floorAffine(x: number, z: number, span = 1): string {
  const o = P([x, 0, z])
  const a = P([x + span, 0, z])
  const b = P([x, 0, z - span])
  const k = 1 / (100 * span)
  const f = (x: number) => Math.round(x * 10000) / 10000

  return `matrix(${f((a[0] - o[0]) * k)} ${f((a[1] - o[1]) * k)} ${f((b[0] - o[0]) * k)} ${f((b[1] - o[1]) * k)} ${r(o[0])} ${r(o[1])})`
}

// A pointed horseshoe arch opening, centred at uc, half span a, springing
// at vs: the jambs from the floor, two arcs struck from centres set a
// little above the springing and across the axis, so the arch swells past
// its jambs and meets in a soft point, the Almohad and Merinid form.
export function horseshoe(uc: number, a: number, vs: number, steps = 14, floor = 0): V2[] {
  const vc = vs + 0.35 * a
  const e = 0.08 * a
  const R = Math.hypot(a + e, vc - vs)
  const t0 = Math.atan2(vs - vc, -a - e) + Math.PI * 2
  const t1 = Math.atan2(Math.sqrt(R * R - e * e), -e)
  const left: V2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps
    left.push([uc + e + R * Math.cos(t), vc + R * Math.sin(t)])
  }
  const right = left.slice(0, -1).reverse().map(([u, v]) => [2 * uc - u, v] as V2)

  return [[uc - a, floor], ...left, ...right, [uc + a, floor]]
}

export const archApex = (a: number, vs: number): number => {
  const vc = vs + 0.35 * a
  const e = 0.08 * a
  const R = Math.hypot(a + e, vc - vs)

  return vc + Math.sqrt(R * R - e * e)
}

// Toward the sun: a mid-morning sun in the south-east, high enough to put
// a patch on the floor of the north-west corner.
const Lr: V3 = [0.62, 0.62, -0.45]
const Ll = Math.hypot(...Lr)
export const SUN: V3 = [Lr[0] / Ll, Lr[1] / Ll, Lr[2] / Ll]

// A polygon clipped to the half-plane f(p) >= 0 (Sutherland-Hodgman).
export function clip<T extends readonly number[]>(poly: readonly T[], f: (p: T) => number, mix: (a: T, b: T, t: number) => T): T[] {
  const out: T[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as T
    const b = poly[(i + 1) % poly.length] as T
    const fa = f(a)
    const fb = f(b)
    if (fa >= 0) out.push(a)
    if ((fa >= 0) !== (fb >= 0)) out.push(mix(a, b, fa / (fa - fb)))
  }

  return out
}


// Whether a point in the court sees the sun over the walls' tops.
export function sunlit(p: V3): number {
  const t = (TOP - p[1]) / SUN[1]
  const x = p[0] + SUN[0] * t
  const z = p[2] + SUN[2] * t

  return Math.min(x + 0.001, S - x + 0.001, z + 0.001, S - z + 0.001)
}
