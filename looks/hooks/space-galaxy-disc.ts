// The Milky Way's disc, laid out flat in its own plane from what is known of
// its structure, in pixels about the Galactic centre. The scene tilts it.
//
// Angles follow the radio astronomers' convention: beta is the azimuth about
// the centre, zero on the line to the Sun and growing the way the Galaxy
// rotates. Seen from the north Galactic pole the rotation is clockwise, and
// so it is on screen. Arms trail: their radius grows as beta falls.
//
//   bar           half-length 4.6 kpc, its near end 28 degrees ahead of the Sun
//   Scutum-Centaurus and Perseus   the two major arms, from the bar's ends
//   Norma (becoming the Outer arm) and Sagittarius-Carina   the minor pair
//   Local arm (Orion spur)         a short piece between Sagittarius and Perseus
//   Sun           8.2 kpc out, on the inner edge of the Local arm
//
// All arms are logarithmic spirals of about 12 degrees pitch, which puts
// them on the Sun's line at 3.6, 5.2, 6.9, 9.9 and 13.7 kpc.
import { seeded, type Pt } from './kit'
import { blobs, dotPath, firm, gauss, glows, line, noise1, soft, stop, type Glow } from './space-galaxy-kit'

export const KPC = 36
export const DISC_R = 17.5
export const SUN_R = 8.2

const D = Math.PI / 180
const PITCH = Math.tan(12 * D)
const BAR_B = 28 * D
const BAR_HALF = 4.6
const BAR_DEG = 28 - 90

type Arm = {
  id: string
  r0: number // radius on the Sun's line, kpc
  k: number // tan of the pitch angle
  b0: number // where it starts, degrees
  b1: number // where it ends
  gain: number
  w: number // width, kpc
  head: number // share of its length over which it fades in
  tail: number // share over which it fades out
  seed: number
}

const ARMS: readonly Arm[] = [
  { id: 'sc', r0: 5.2, k: PITCH, b0: 28, b1: -285, gain: 1, w: 1.18, head: 0, tail: 0.34, seed: 11 },
  { id: 'pe', r0: 9.9, k: PITCH, b0: 208, b1: -105, gain: 1, w: 1.18, head: 0, tail: 0.34, seed: 23 },
  { id: 'no', r0: 3.6, k: PITCH, b0: 6, b1: -395, gain: 0.36, w: 0.6, head: 0.05, tail: 0.3, seed: 37 },
  { id: 'sg', r0: 6.9, k: PITCH, b0: 186, b1: -135, gain: 0.4, w: 0.6, head: 0.05, tail: 0.3, seed: 41 },
  { id: 'lo', r0: 8.34, k: Math.tan(11 * D), b0: 42, b1: -34, gain: 0.34, w: 0.5, head: 0.3, tail: 0.35, seed: 53 },
]

const polar = (r: number, b: number): Pt => [Math.cos(b - Math.PI / 2) * r * KPC, Math.sin(b - Math.PI / 2) * r * KPC]

// An arm's radius at beta: the spiral, with a slow wander so no arm is a
// perfect curve.
const armR = (arm: Arm, b: number): number =>
  arm.r0 * Math.exp(-arm.k * b) * (1 + 0.022 * Math.sin(2.3 * b + arm.seed) + 0.011 * Math.sin(5.3 * b + arm.seed * 2))

type Track = { arm: Arm; len: number; at: (s: number, off?: number) => Pt; beta: (s: number) => number; env: (s: number) => number; clump: (s: number) => number }

// An arm measured along its own length, in kpc from its start.
function track(arm: Arm): Track {
  const steps = 600
  const b0 = arm.b0 * D
  const b1 = arm.b1 * D
  const cum = [0]

  for (let i = 1; i <= steps; i++) {
    const a = polar(armR(arm, b0 + ((b1 - b0) * (i - 1)) / steps), b0 + ((b1 - b0) * (i - 1)) / steps)
    const b = polar(armR(arm, b0 + ((b1 - b0) * i) / steps), b0 + ((b1 - b0) * i) / steps)

    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]) / KPC)
  }
  const len = cum[steps] as number
  const beta = (s: number): number => {
    const t = Math.max(0, Math.min(len, s))
    let lo = 0
    let hi = steps

    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1

      if ((cum[mid] as number) <= t) {
        lo = mid
      } else {
        hi = mid
      }
    }
    const f = (t - (cum[lo] as number)) / ((cum[hi] as number) - (cum[lo] as number) || 1)

    return b0 + ((b1 - b0) * (lo + f)) / steps
  }
  const n1 = noise1(arm.seed * 7 + 1)
  const n2 = noise1(arm.seed * 7 + 2)
  const smooth = (x: number): number => {
    const t = Math.max(0, Math.min(1, x))

    return t * t * (3 - 2 * t)
  }

  return {
    arm,
    len,
    beta,
    at: (s, off = 0) => {
      const b = beta(s)

      return polar(armR(arm, b) + off, b)
    },
    // How bright the arm is along its length: in at the head, a long fade
    // at the tail, and dimmer overall the further out it runs.
    env: s => {
      const u = s / len

      return arm.gain * (arm.head ? smooth(u / arm.head) : 1) * (1 - smooth((u - (1 - arm.tail)) / arm.tail)) * (1 - 0.3 * u)
    },
    // Star-forming complexes come in bunches with gaps between.
    clump: s => {
      const c = 0.62 * n1(s / 2.4) + 0.38 * n2(s / 0.8)

      return 0.1 + 2.1 * c * c
    },
  }
}

const TRACKS = ARMS.map(track)

type Stars = Map<string, Pt[]>

const put = (stars: Stars, cls: string, w: number, tw: number, p: Pt): void => {
  const key = `${cls}|${w}|${tw}`
  const list = stars.get(key) ?? []

  list.push(p)
  stars.set(key, list)
}

// Sizes: nearly all stars are grain; a few stand out.
const size = (rand: () => number): number => {
  const v = rand()

  return v < 0.76 ? 1.4 : 2.1
}

// Only the larger stars twinkle, in two groups out of step.
const twinkle = (w: number, rand: () => number): number => (w > 2 && rand() < 0.6 ? 1 + Math.floor(rand() * 2) : 0)

const starPaths = (stars: Stars): string =>
  [...stars]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, pts]) => {
      const [cls, w, tw] = key.split('|')

      return dotPath(`mw-s ${cls}${tw === '0' ? '' : ` mw-t${tw}`}`, Number(w), pts)
    })
    .join('')

// --- The arms -------------------------------------------------------------

// A strip along an arm from s0 to s1 (kpc along it), w pixels wide, its
// centre off kpc outward of the arm, narrowing to a point at both ends.
function strip(t: Track, s0: number, s1: number, w: number, off: number): string {
  const n = Math.max(2, Math.ceil((s1 - s0) / 0.3))
  const ease = Math.min(0.6, (s1 - s0) / 2)
  const left: Pt[] = []
  const right: Pt[] = []

  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n
    const p = t.at(s, off)
    const q = t.at(s + 0.05, off)
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
    const h = (w / 2) * Math.sqrt(Math.max(0.04, Math.min(1, (s - s0) / ease, (s1 - s) / ease)))
    const nx = (-(q[1] - p[1]) / d) * h
    const ny = ((q[0] - p[0]) / d) * h

    left.push([p[0] + nx, p[1] + ny])
    right.push([p[0] - nx, p[1] - ny])
  }

  return [...left, ...right.reverse()].map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`).join('') + 'Z'
}

const armGlow: Glow[] = []
const armStars: Stars = new Map()
const armGrain: Stars = new Map()
const knotGlow: Glow[] = []
const knotCores: Pt[] = []
const clusterCores: Pt[] = []
const dustGlow: Glow[] = []
let strands = ''
let lanes = ''
let hazes = ''

for (const t of TRACKS) {
  const { arm } = t
  const rand = seeded(arm.seed * 131 + 7)
  const major = arm.gain > 0.9

  // Light: clumps along the ridge, sharp toward the inner edge where the
  // dust lies and spreading outward. The wider, fainter body is the haze.
  for (let s = 0; s < t.len; s += 0.62) {
    const e = t.env(s)
    const c = t.clump(s)
    const lum = e * c

    if (lum < 0.05) {
      continue
    }
    const r = Math.hypot(...t.at(s)) / KPC
    const warm = r < 6.5 && rand() < (6.5 - r) / 4

    if (rand() < 0.3 + c * 0.42) {
      const off = arm.w * (Math.abs(gauss(rand)) * 0.3 - 0.05)
      const p = t.at(s + gauss(rand) * 0.15, off)
      // Young blue-white light gathers on the outer edge, away from the dust.
      const young = off > arm.w * 0.16 && rand() < 0.75

      armGlow.push({ x: p[0], y: p[1], r: arm.w * KPC * (0.7 + rand() * 0.6) * (0.75 + 0.35 * c), f: warm ? 'mw-gw' : young ? 'mw-gb' : 'mw-ga', o: Math.min(1, lum * (0.45 + rand() * 0.4)) })
    }
    if (c > 1.05 && rand() < 0.55) {
      const p = t.at(s, arm.w * 0.1)

      armGlow.push({ x: p[0], y: p[1], r: arm.w * KPC * (1 + rand() * 0.7), f: 'mw-ga', o: Math.min(1, e * (0.5 + rand() * 0.3)) })
    }
  }

  // Spurs: feathers that leave the outer edge at a steeper angle.
  for (let s = 1.2 + rand() * 1.5; s < t.len * 0.86; s += 1.5 + rand() * (major ? 1.8 : 3)) {
    const e = t.env(s)
    const b = t.beta(s)
    const r0 = armR(arm, b) + arm.w * 0.25
    const reach = (0.9 + rand() * 1.8) * (major ? 1 : 0.7)
    const steep = Math.tan((34 + rand() * 16) * D)

    for (let q = 0; q <= 1; q += 0.25) {
      const dr = reach * q
      const bb = b - Math.log((r0 + dr) / r0) / steep
      const p = polar(r0 + dr, bb)

      if (rand() < 0.6) {
        armGlow.push({ x: p[0], y: p[1], r: KPC * arm.w * (0.42 - 0.24 * q), f: rand() < 0.4 ? 'mw-gb' : 'mw-ga', o: Math.min(1, e * (0.55 - 0.3 * q)) })
      }
      for (let i = 0; i < 2; i++) {
        const w = size(rand)

        put(armStars, rand() < 0.6 ? 'mw-sb' : 'mw-sw', w, twinkle(w, rand), [p[0] + gauss(rand) * 5, p[1] + gauss(rand) * 5])
      }
    }
  }

  // The arm's body of unresolved light: two bands along the ridge, a wide
  // faint one and, on the major arms, a narrow one laid only along the
  // brighter stretches, so the haze swells and thins along the arm. The
  // whole layer is blurred, which turns the bands' edges into a smooth
  // falloff. They are filled outlines rather than wide stroked lines, which
  // cost several times more to draw. The haze begins where the arm leaves
  // the bar's glow, so it does not tint the bar's ends.
  let lead = 0

  while (lead < t.len && Math.hypot(...t.at(lead)) / KPC < 4.6) {
    lead += 0.25
  }
  const runs: [number, number][] = []
  let from = -1

  for (let s = lead; s <= t.len * 0.86; s += 0.25) {
    const lit = t.clump(s) > 0.4 && s + 0.25 <= t.len * 0.86

    if (lit && from < 0) {
      from = s
    } else if (!lit && from >= 0) {
      runs.push([from, s])
      from = -1
    }
  }
  const alpha = (a: number): string => `${Math.round(a * arm.gain * 1000) / 1000}`

  hazes += `<path fill-opacity="${alpha(0.24)}" d="${strip(t, lead, t.len * 0.64, arm.w * KPC * 2, arm.w * 0.14)}"/>`
  if (major) {
    hazes += `<path fill-opacity="${alpha(0.26)}" d="${runs.map(([a, b]) => strip(t, a, b, arm.w * KPC * 0.9, arm.w * 0.14)).join('')}"/>`
  }

  // Grain: the countless faint stars of the arm, fine specks crowded along
  // the bright stretches of the ridge.
  for (let s = 0; s < t.len * 0.9; s += 0.17) {
    if (rand() * 2.2 > t.clump(s) * t.env(s) / arm.gain) {
      continue
    }
    const p = t.at(s, arm.w * (Math.abs(gauss(rand)) * 0.45 - 0.1))

    put(armGrain, rand() < 0.55 ? 'mw-sw' : 'mw-sb', 0.9, 0, p)
  }

  // Stars: crowded on the ridge, a hard inner edge, a long outer skirt.
  const count = Math.round(t.len * arm.gain * 2.8)

  for (let i = 0; i < count; i++) {
    let s = 0

    for (let tries = 0; tries < 12; tries++) {
      s = rand() * t.len
      if (rand() * 1.8 < (t.env(s) / arm.gain) * t.clump(s)) {
        break
      }
    }
    const off = arm.w * (rand() < 0.72 ? Math.abs(gauss(rand)) * 0.5 - 0.08 : -Math.abs(gauss(rand)) * 0.22)
    const p = t.at(s, off)
    const r = Math.hypot(p[0], p[1]) / KPC
    const w = size(rand)
    const v = rand()
    const cls = r < 6 && v < (6 - r) / 5 ? 'mw-sy' : v < 0.35 ? 'mw-sb' : 'mw-sw'

    put(armStars, cls, w, twinkle(w, rand), p)
  }

  // Glowing hydrogen and young clusters at the densest points.
  const want = Math.round(t.len * arm.gain * 0.5) + 2
  const picks: number[] = []

  for (let tries = 0; tries < 900 && picks.length < want * 3; tries++) {
    const s = rand() * t.len * 0.93

    if (t.env(s) > 0.12 && rand() < t.clump(s) / 1.5 && picks.every(q => Math.abs(q - s) > 0.4)) {
      picks.push(s)
    }
  }
  picks.forEach((s, i) => {
    const pink = i % 3 === 0
    const p = t.at(s, arm.w * (pink ? 0.02 + rand() * 0.2 : 0.1 + rand() * 0.45))
    const fade = 0.55 + 0.45 * Math.min(1, t.env(s) / arm.gain)

    if (pink) {
      knotGlow.push({ x: p[0], y: p[1], r: (4.5 + rand() * 5.5) * (major ? 1 : 0.85), f: 'mw-gh', o: 0.85 + 0.15 * fade, c: `mw-k${i % 3}` })
      knotCores.push(p)
    } else {
      armGlow.push({ x: p[0], y: p[1], r: 3.5 + rand() * 4.5, f: 'mw-gc', o: fade * (0.6 + rand() * 0.4) })
      clusterCores.push(p)
    }
  })

  // Dust: no line anywhere. A band of soft dark patches lies just inside
  // the ridge, thick where the gas is piled up and absent in the gaps:
  // broad faint ones for the body, small dense ones close under the ridge
  // where it is darkest, now and then a feather of them crossing the arm,
  // and short frayed threads lying loosely along it.
  const reachOf = t.len * (major ? 0.84 : 0.66)
  const patchy = noise1(arm.seed * 7 + 3)
  const wander = noise1(arm.seed * 7 + 4)
  const band = arm.w * KPC
  const laneAt = (s: number, across: number): Pt => t.at(s, arm.w * (-0.36 + 0.28 * (wander(s / 2.2) - 0.5) + across))
  const whole = (v: number): number => Math.round(v)

  for (let s = major ? 0.5 : 0.2; s < reachOf; s += 0.48 + rand() * 0.34) {
    const g = 0.65 * patchy(s / 1.5) + 0.35 * patchy(s / 0.45 + 40)

    if (g < 0.36) {
      continue
    }
    const depth = (g - 0.36) / 0.64
    const fade = Math.min(1, t.env(s) / arm.gain + 0.25) * (1 - (0.35 * s) / reachOf)

    if (rand() < 0.6) {
      const p = laneAt(s, gauss(rand) * 0.16 - 0.08)

      dustGlow.push({ x: p[0], y: p[1], r: band * (0.34 + rand() * 0.36) * (0.7 + depth * 0.6), f: 'mw-gd', o: (0.5 + 0.4 * depth) * fade })
    }
    if (rand() < 0.25 + 0.6 * depth) {
      const p = laneAt(s + gauss(rand) * 0.1, 0.06 + gauss(rand) * 0.07)

      dustGlow.push({ x: p[0], y: p[1], r: band * (0.13 + rand() * 0.13), f: 'mw-gd', o: (0.45 + 0.3 * rand()) * fade })
    }
    if (rand() < 0.11) {
      const b = t.beta(s)
      const r0 = armR(arm, b) - arm.w * 0.3
      const steep = Math.tan((36 + rand() * 20) * D)
      const reach = arm.w * (0.5 + rand() * 0.8)

      for (let q = 0.3; q <= 1; q += 0.35) {
        const p = polar(r0 + reach * q, b - Math.log((r0 + reach * q) / r0) / steep)

        dustGlow.push({ x: p[0], y: p[1], r: band * (0.26 - 0.1 * q), f: 'mw-gd', o: (0.6 - 0.25 * q) * fade })
      }
    }
    if (rand() < 0.3) {
      const across = gauss(rand) * 0.2
      const a = laneAt(s, across)
      const run = 0.4 + rand() * 0.7
      const m = laneAt(s + run * 0.5, across + gauss(rand) * 0.05)
      const e = laneAt(s + run, across + gauss(rand) * 0.09)

      strands += `M${whole(a[0])} ${whole(a[1])}q${whole(2 * m[0] - 1.5 * a[0] - 0.5 * e[0])} ${whole(2 * m[1] - 1.5 * a[1] - 0.5 * e[1])} ${whole(e[0] - a[0])} ${whole(e[1] - a[1])}`
    }
  }
  // The lane itself: a thread just inside the ridge, broken where the
  // dust thins, under the patches so they read as one dark seam.
  const lane: Pt[] = []
  let laneRuns = ''
  let laneSpan = 0
  let laneOn = true

  for (let s = major ? 0.5 : 0.2; s < reachOf; s += 0.25) {
    lane.push(laneAt(s, -0.02))
    const thick = 0.65 * patchy(s / 1.5) + 0.35 * patchy(s / 0.45 + 40) > 0.4

    if (thick !== laneOn) {
      laneRuns += `${Math.round(laneSpan * KPC)} `
      laneSpan = 0
      laneOn = thick
    }
    laneSpan += 0.25
  }
  laneRuns += laneOn ? `${Math.round(laneSpan * KPC)} 9999` : '0 9999'
  lanes += `<path d="${line(lane)}" stroke-width="${Math.round(band * (major ? 0.2 : 0.14))}" stroke-dasharray="${laneRuns}"/>`
  if (major) {
    // The bar's lane, bowed and in pieces.
    for (const [r, b] of barLane(arm.id === 'sc' ? 1 : -1)) {
      const g = patchy(r / 0.7 + 90)

      if (g < 0.3) {
        continue
      }
      const p = polar(r + gauss(rand) * 0.05, b + (gauss(rand) * 0.07) / r)

      dustGlow.push({ x: p[0], y: p[1], r: KPC * (0.3 + rand() * 0.26), f: 'mw-gd', o: 0.22 + 0.26 * g })
    }
  }
}

// The dust lane of one half of the bar, as radius and azimuth: from beside
// the nucleus out along the bar's leading edge in a long bow that swings
// back to the axis near the tip. side is 1 for the near half.
function barLane(side: number): (readonly [number, number])[] {
  const pts: (readonly [number, number])[] = []

  for (let r = 0.55; r <= BAR_HALF - 0.35; r += 0.2) {
    const bow = 0.8 * Math.sin(Math.PI * Math.pow(r / BAR_HALF, 0.62)) + 0.12 * Math.sin(r * 3.1)

    pts.push([Math.hypot(r, bow), BAR_B + (side > 0 ? 0 : Math.PI) + Math.atan2(bow, r)])
  }

  return pts
}

// --- The bar and bulge ----------------------------------------------------

const barStars: Stars = new Map()
{
  const rand = seeded(977)
  const ca = Math.cos(BAR_B - Math.PI / 2)
  const sa = Math.sin(BAR_B - Math.PI / 2)
  const place = (along: number, across: number): Pt => [(ca * along - sa * across) * KPC, (sa * along + ca * across) * KPC]

  for (let i = 0; i < 85; i++) {
    const along = gauss(rand) * 2.2
    const across = gauss(rand) * 0.55 * (1 - 0.45 * Math.min(1, Math.abs(along) / BAR_HALF))

    if (Math.abs(along) < BAR_HALF + 0.4) {
      put(barStars, rand() < 0.75 ? 'mw-sy' : 'mw-sw', size(rand), 0, place(along, across))
    }
  }
  for (let i = 0; i < 60; i++) {
    const lobe = rand() < 0.5 ? -1 : 1

    put(barStars, rand() < 0.7 ? 'mw-sy' : 'mw-sw', size(rand), 0, place(lobe * 0.95 + gauss(rand) * 0.6, gauss(rand) * 0.55))
  }
}

const px = (v: number): number => Math.round(v * KPC)

// The bar's two dust lanes as continuous threads under their patches.
const barLanes = [1, -1]
  .map(side => `<path d="${line(barLane(side).map(([r, b]) => polar(r, b)))}" stroke-width="${px(0.22)}"/>`)
  .join('')

// The long bar, the thicker inner bar, the two lobes of the peanut-shaped
// bulge with a waist between them, and the nucleus.
const bar =
  `<g transform="rotate(${BAR_DEG})">` +
  `<ellipse rx="${px(5.3)}" ry="${px(1.7)}" fill="url(#mw-bar)"/>` +
  `<ellipse rx="${px(3.7)}" ry="${px(1.05)}" fill="url(#mw-bar2)"/>` +
  `<ellipse cx="${px(1.3)}" rx="${px(1.5)}" ry="${px(1.2)}" fill="url(#mw-lobe)"/>` +
  `<ellipse cx="${px(-1.3)}" rx="${px(1.5)}" ry="${px(1.2)}" fill="url(#mw-lobe)"/>` +
  `<ellipse rx="${px(0.75)}" ry="${px(0.55)}" fill="url(#mw-nuc)"/>` +
  `<ellipse rx="${px(4.6)}" ry="${px(1.1)}" fill="url(#mw-f3)"/>` +
  `<ellipse rx="${px(2.7)}" ry="${px(1.3)}" fill="url(#mw-f3)" transform="rotate(31)"/>` +
  `</g>`

// --- Disc stars that are in no arm ----------------------------------------

// Old disc stars thin out exponentially from the centre.
const RING_EDGES = [1.6, 4.2, 6.8] as const

const discStars: Stars = new Map()
{
  const rand = seeded(4409)
  let made = 0

  while (made < 160) {
    const r = 1.6 + rand() * (DISC_R - 1.6)

    if (rand() * 1.25 > (r / 3.4) * Math.exp(1 - r / 3.4)) {
      continue
    }
    const p = polar(r, rand() * Math.PI * 2)
    const w = r > 12.5 ? (rand() < 0.6 ? 1.6 : 2.3) : rand() < 0.8 ? 1.4 : 1.9

    put(discStars, 'mw-sw', w, w > 1.5 ? 1 + (made % 2) : 0, p)
    made++
  }
}

// A tile of faint specks. mix gives each kind of star its class, size and
// share.
function grainTile(id: string, seed: number, size: number, count: number, mix: readonly (readonly [string, number, number])[]): string {
  const rand = seeded(seed)
  const lists = mix.map(() => [] as Pt[])

  for (let i = 0; i < count; i++) {
    let v = rand()
    let m = 0

    while (m < mix.length - 1 && v > (mix[m] as readonly [string, number, number])[2]) {
      v -= (mix[m] as readonly [string, number, number])[2]
      m++
    }
    ;(lists[m] as Pt[]).push([rand() * size, rand() * size])
  }

  return (
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
    mix.map(([cls, w], i) => dotPath(`mw-s ${cls}`, w, lists[i] as Pt[], '', 16)).join('') +
    `</pattern>`
  )
}

// The fine grain of the inner disc. Further out the loose stars are enough.
const ringGrain = RING_EDGES.slice(1).map((edge, i) => {
  const inner = RING_EDGES[i] as number

  return `<circle fill="none" r="${px((inner + edge) / 2)}" stroke="url(#mw-f3)" stroke-width="${px(edge - inner)}" stroke-opacity="${[0.95, 0.8][i]}"/>`
})

// --- Out ------------------------------------------------------------------

export const DISC_DEFS =
  `<path id="mw-th" d="${strands}"/>` +
  soft('mw-gh', '--hii', 0.95) +
  // The old inner disc's warm glow is folded into the disc's own gradient.
  `<radialGradient id="mw-disc">${stop(0, '--old', 0.75)}${stop(0.12, '--old', 0.6)}${stop(0.2, '--inner', 0.48)}${stop(0.3, '--disc', 0.42)}${stop(0.45, '--disc', 0.27)}${stop(0.65, '--disc', 0.13)}${stop(0.84, '--disc', 0.035)}${stop(1, '--disc', 0)}</radialGradient>` +
  soft('mw-bar', '--bar', 0.7) +
  firm('mw-bar2', '--bar', 0.75) +
  firm('mw-lobe', '--bulge', 0.8) +
  // Grain tiles. A pattern is drawn afresh in every tile it covers, so its
  // specks cost as much as loose stars: they are kept sparse. f1 and g2
  // texture the Magellanic Clouds; f3 the inner disc and the bar.
  grainTile('mw-f1', 301, 61, 40, [
    ['mw-sw', 0.8, 0.6],
    ['mw-sb', 0.8, 0.4],
  ]) +
  grainTile('mw-g2', 303, 233, 150, [
    ['mw-sw', 0.9, 0.6],
    ['mw-sb', 0.9, 0.25],
    ['mw-sy', 1.2, 0.15],
  ]) +
  grainTile('mw-f3', 307, 71, 26, [
    ['mw-sy', 0.8, 0.6],
    ['mw-sw', 0.8, 0.25],
    ['mw-sy', 1.2, 0.15],
  ]) +
  `<radialGradient id="mw-nuc">${stop(0, '--core', 1)}${stop(0.3, '--core', 0.9)}${stop(0.6, '--core', 0.4)}${stop(1, '--core', 0)}</radialGradient>`

const sun = polar(SUN_R, 0)

// The disc in layers, back to front. Two of them are blurred as a whole by
// the scene: the arms' light, and the dust. Nothing inside a blurred layer
// moves.
export const DISC_BASE = `<circle r="${px(DISC_R)}" fill="url(#mw-disc)"/>` + ringGrain.join('')

export const ARM_LIGHT = `<g class="mw-hz">${hazes}</g>` + blobs(armGlow.filter(g => g.f !== 'mw-gc'), 1, 1.5) + blobs(knotGlow.map(k => ({ ...k, r: k.r * 2, o: k.o * 0.85 })), 1)

export const BAR = bar

export const DUST =
  `<g class="mw-dl">${lanes}${barLanes}</g>` +
  blobs(dustGlow, 0.95, 0.75) +
  `<g class="mw-du"><use href="#mw-th" stroke-width="5" stroke-opacity=".14"/><use href="#mw-th" stroke-width="1.8" stroke-opacity=".16"/></g>` +
  // Young clusters, only lightly softened so they stay crisp knots of light.
  blobs(armGlow.filter(g => g.f === 'mw-gc'), 1.1, 1)

export const SHARP =
  starPaths(discStars) +
  starPaths(armGrain) +
  starPaths(armStars) +
  starPaths(barStars) +
  glows(knotGlow) +
  dotPath('mw-s mw-sh', 1.7, knotCores) +
  dotPath('mw-s mw-sw', 1.9, clusterCores) +
  `<g transform="translate(${Math.round(sun[0])} ${Math.round(sun[1])})"><circle class="mw-here" r="5.5"/><circle class="mw-ping" r="5.5"/><circle class="mw-here-dot" r="1.1"/></g>`
