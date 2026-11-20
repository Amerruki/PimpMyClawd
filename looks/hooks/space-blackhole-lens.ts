// Light paths round a non-rotating black hole, for drawing what a distant
// camera sees of a thin disc of gas orbiting it. Lengths are in units of
// GM/c^2 (the horizon is at 2, the last stable orbit at 6).
//
// A light ray's orbit obeys u'' = 3u^2 - u for u = 1/r against the angle
// phi swept round the hole. Rays are traced backward from the camera for a
// spread of impact parameters b once, into a table; every image point is
// then a lookup.

export type P2 = readonly [number, number]

// Rays aimed closer than this are captured: the edge of the shadow.
export const BC = 3 * Math.sqrt(3)

const STEP = 0.01
const NPHI = Math.ceil((2 * Math.PI + 0.3) / STEP)
const FELL = 0.6
const FLED = 1e-9

const BS: number[] = []
{
  const below: number[] = []
  for (let d = 1e-4; d < 5.1; d *= 1.045) below.push(BC - d)
  BS.push(...below.reverse())
  for (let d = 1e-4; d < 40; d *= 1.045) BS.push(BC + d)
}

const acc = (u: number) => 3 * u * u - u

const TABLE: Float32Array[] = BS.map(b => {
  const out = new Float32Array(NPHI + 1)
  let u = 0
  let v = 1 / b
  let dead = 0
  for (let j = 1; j <= NPHI; j++) {
    if (dead) {
      out[j] = dead
      continue
    }
    const k1u = v
    const k1v = acc(u)
    const k2u = v + (STEP / 2) * k1v
    const k2v = acc(u + (STEP / 2) * k1u)
    const k3u = v + (STEP / 2) * k2v
    const k3v = acc(u + (STEP / 2) * k2u)
    const k4u = v + STEP * k3v
    const k4v = acc(u + STEP * k3u)
    u += (STEP / 6) * (k1u + 2 * k2u + 2 * k3u + k4u)
    v += (STEP / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    if (u > 0.5) dead = FELL
    else if (u <= 0) dead = FLED
    out[j] = dead || u
  }

  return out
})

function uAt(i: number, phi: number): number {
  const row = TABLE[i] as Float32Array
  const x = Math.min(NPHI - 1, phi / STEP)
  const j = Math.floor(x)
  const a = row[j] as number
  const b = row[j + 1] as number

  return a + (b - a) * (x - j)
}

// The impact parameter of the ray that is at radius r after sweeping phi.
// At a fixed phi, a wider ray is always further out.
function solveB(phi: number, r: number): number {
  const target = 1 / r
  let lo = 0
  let hi = BS.length - 1
  if (uAt(lo, phi) < target) return BS[0] as number
  if (uAt(hi, phi) > target) return BS[hi] as number
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (uAt(mid, phi) >= target) lo = mid
    else hi = mid
  }
  const ua = uAt(lo, phi)
  const ub = uAt(hi, phi)
  const t = ua === ub ? 0 : (ua - target) / (ua - ub)

  return (BS[lo] as number) + ((BS[hi] as number) - (BS[lo] as number)) * t
}

// The image of one ring of the disc. `rOf` gives the ring's radius at each
// disc azimuth (0 at the right, pi/2 on the far side), so a ring can be
// slightly out of round. order 0 is the direct image: the near half lies
// below the hole and the far half is lifted over the top of it. order 1 is
// the light that went round the back and under: the thin ring hugging the
// shadow. `inc` is the camera's angle from the disc's axis in degrees;
// points come out in pixels, y down, going anticlockwise on screen, which
// is the way the gas moves when the left side approaches.
export function isoradial(rOf: (psi: number) => number, order: 0 | 1, inc: number, scale: number, tol = 0.3, samples = 720): P2[] {
  const si = Math.sin((inc * Math.PI) / 180)
  const ci = Math.cos((inc * Math.PI) / 180)
  const dense: P2[] = []
  for (let k = 0; k < samples; k++) {
    const al = (k / samples) * Math.PI * 2
    const sa = Math.sin(al)
    const ca = Math.cos(al)
    const phi = Math.atan2(ci, -sa * si) + order * Math.PI
    const psi = Math.atan2(-si * Math.cos(phi) + ci * Math.sin(phi) * sa, Math.sin(phi) * ca)
    const b = solveB(phi, rOf(psi))
    dense.push([b * ca * scale, -b * sa * scale])
  }

  return simplifyClosed(dense, tol)
}

function simplify(pts: readonly P2[], tol: number): P2[] {
  const keep = new Uint8Array(pts.length)
  keep[0] = 1
  keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number]
    const [ax, ay] = pts[a] as P2
    const [bx, by] = pts[b] as P2
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    let worst = 0
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i] as P2
      const d = Math.abs((px - ax) * dy - (py - ay) * dx) / len
      if (d > worst) {
        worst = d
        at = i
      }
    }
    if (worst > tol && at > 0) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }

  return pts.filter((_, i) => keep[i])
}

function simplifyClosed(pts: readonly P2[], tol: number): P2[] {
  let far = 0
  let best = 0
  pts.forEach(([x, y], i) => {
    const d = Math.hypot(x - (pts[0] as P2)[0], y - (pts[0] as P2)[1])
    if (d > best) {
      best = d
      far = i
    }
  })
  const a = simplify(pts.slice(0, far + 1), tol)
  const b = simplify([...pts.slice(far), pts[0] as P2], tol)

  return [...a, ...b.slice(1, -1)]
}

export function simplifyOpen(pts: readonly P2[], tol: number): P2[] {
  return simplify(pts, tol)
}

const f1 = (v: number): string => (Math.round(v * 10) / 10).toString()

export function pathD(pts: readonly P2[], closed: boolean): string {
  let d = ''
  let px = 0
  let py = 0
  pts.forEach(([x, y], i) => {
    if (i === 0) {
      d += `M${f1(x)} ${f1(y)}`
      px = Math.round(x * 10) / 10
      py = Math.round(y * 10) / 10

      return
    }
    // Relative moves: shorter than absolute ones, and rounding does not
    // build up because each is taken from the rounded point before it.
    const rx = Math.round(x * 10) / 10
    const ry = Math.round(y * 10) / 10
    const sx = f1(rx - px)
    const sy = f1(ry - py)
    d += `l${sx}${sy.startsWith('-') ? '' : ' '}${sy}`
    px = rx
    py = ry
  })

  return closed ? `${d}z` : d
}

// A point a fraction of the way round a closed line, by length.
export function along(pts: readonly P2[], frac: number): P2 {
  const k = pts.length
  const seg = pts.map((p, i) => {
    const q = pts[(i + 1) % k] as P2

    return Math.hypot(q[0] - p[0], q[1] - p[1])
  })
  const total = seg.reduce((a, b) => a + b, 0)
  let want = (((frac % 1) + 1) % 1) * total
  for (let i = 0; i < k; i++) {
    const s = seg[i] as number
    if (want <= s) {
      const p = pts[i] as P2
      const q = pts[(i + 1) % k] as P2
      const t = s ? want / s : 0

      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
    }
    want -= s
  }

  return pts[0] as P2
}

// How much the light from gas at radius r is shifted, seen at horizontal
// image position x (same units as r; negative is the approaching side):
// above 1 is brighter and bluer, below 1 dimmer and redder. It combines the
// gas's orbital speed with the climb out of the hole's gravity.
export function shift(r: number, x: number, inc: number): number {
  const rr = Math.max(3.4, r)

  return Math.sqrt(1 - 3 / rr) / (1 + Math.pow(rr, -1.5) * x * Math.sin((inc * Math.PI) / 180))
}

// Where a background star at (sx, sy) from the hole appears, for a lens
// with Einstein radius e: pushed outward, never closer than e.
export function lensed(sx: number, sy: number, e: number): P2 {
  const beta = Math.hypot(sx, sy) || 1e-6
  const theta = beta / 2 + Math.sqrt((beta * beta) / 4 + e * e)

  return [(sx / beta) * theta, (sy / beta) * theta]
}
