import { H, n, seeded, W } from './kit'

// Shared pieces for the outer-planet looks: an orthographic camera around a
// planet, sunlit spheres, rings, moons on orbits that pass in front of and
// behind the globe, starfields and a sun glare. No SVG filters: shading is
// gradients and shapes, softness is CSS blur on still shapes.
//
// Frames. The planet frame has x across the face, y the north pole and z
// toward a viewer on the equator. A system is drawn in an L frame: x right,
// y down, d toward the viewer, centred on the planet, before the system's
// roll (the <g> that places a system rotates it by `roll` degrees).
// B is the viewer's elevation above the planet's equator (ring opening).

export const D2R = Math.PI / 180

export type V3 = readonly [number, number, number]

export const unit = (v: V3): V3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1

  return [v[0] / m, v[1] / m, v[2] / m]
}

export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Planet frame to L frame.
export function proj(p: V3, B: number): V3 {
  const c = Math.cos(B * D2R)
  const s = Math.sin(B * D2R)

  return [p[0], -(p[1] * c - p[2] * s), p[1] * s + p[2] * c]
}

// L frame to planet frame.
export function unproj(l: V3, B: number): V3 {
  const c = Math.cos(B * D2R)
  const s = Math.sin(B * D2R)
  const up = -l[1]

  return [l[0], up * c + l[2] * s, -up * s + l[2] * c]
}

// A direction given on screen (x right, y up, z toward the viewer) in the L
// frame of a system rolled by `roll` degrees.
export function screenToL(dir: V3, roll: number): V3 {
  const [x, yUp, z] = unit(dir)
  const a = -roll * D2R
  const yd = -yUp

  return [x * Math.cos(a) - yd * Math.sin(a), x * Math.sin(a) + yd * Math.cos(a), z]
}

// The unlit part of a sphere of radius r lit from sL (L frame): the limb
// semicircle away from the sun closed by the terminator's half ellipse.
export function nightD(r: number, sL: V3): { d: string; rot: number } {
  const s = unit(sL)
  const k = r * Math.abs(s[2])
  const sweep = s[2] >= 0 ? 1 : 0

  return {
    d: `M0 ${n(-r)}L0 ${n(-r * 1.2)}A${n(r * 1.2)} ${n(r * 1.2)} 0 0 0 0 ${n(r * 1.2)}L0 ${n(r)}A${n(Math.max(k, 0.5))} ${n(r)} 0 0 ${sweep} 0 ${n(-r)}Z`,
    rot: Math.atan2(s[1], s[0]) / D2R,
  }
}

export function nightPath(r: number, sL: V3, attrs: string): string {
  const { d, rot } = nightD(r, sL)

  return `<path transform="rotate(${n(rot)})" d="${d}" ${attrs}/>`
}

// Gradients for a lit sphere of radius r centred at the origin: `${id}-lit`
// (a broad Lambert falloff toward the terminator with a soft sheen at the
// subsolar point) and `${id}-limb` (limb darkening).
export function sphereDefs(id: string, r: number, sL: V3, limb = 0.55, sheen = 0.14): string {
  const s = unit(sL)
  const sx = s[0] * r * 0.62
  const sy = s[1] * r * 0.62

  return (
    `<radialGradient id="${id}-lit" gradientUnits="userSpaceOnUse" cx="${n(sx)}" cy="${n(sy)}" r="${n(r * 1.75)}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="${sheen}"/><stop offset=".28" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".55" stop-color="#000" stop-opacity=".06"/><stop offset=".85" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>` +
    `<radialGradient id="${id}-limb" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${n(r)}">` +
    `<stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity="${n(limb * 0.35)}"/>` +
    `<stop offset=".97" stop-color="#000" stop-opacity="${n(limb * 0.8)}"/><stop offset="1" stop-color="#000" stop-opacity="${n(limb)}"/></radialGradient>` +
    `<linearGradient id="${id}-rim" gradientUnits="userSpaceOnUse" x1="${n(s[0] * r)}" y1="${n(s[1] * r)}" x2="${n(-s[0] * r)}" y2="${n(-s[1] * r)}">` +
    `<stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".35"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient>`
  )
}

// The lighting layers over a sphere's surface: Lambert falloff, limb
// darkening and the night side, softened. Night opacity comes from
// --night-op so the day version can lift the dark side with haze light.
export function sphereShade(id: string, r: number, sL: V3, nightColor = '#02030a', soft = 0.05): string {
  const { d, rot } = nightD(r, sL)

  return (
    `<circle r="${n(r)}" fill="url(#${id}-lit)"/>` +
    `<circle r="${n(r)}" fill="url(#${id}-limb)"/>` +
    `<g style="opacity:var(--night-op)">` +
    [
      [0.42, 3],
      [0.5, 1.2],
      [0.78, 0.4],
    ]
      .map(([o, k]) => `<path transform="rotate(${n(rot)})" d="${d}" fill="${nightColor}" fill-opacity="${o}" style="filter:blur(${n(r * soft * (k as number))}px)"/>`)
      .join('') +
    `</g>`
  )
}

// A thin atmospheric glow along the sunlit limb.
export function rimGlow(id: string, r: number, color: string, width: number, opacity = 0.8): string {
  return (
    `<g style="opacity:var(--rim-op)"><circle r="${n(r + width * 0.3)}" fill="none" stroke="${color}" stroke-width="${n(width * 2.2)}" stroke-opacity="${n(opacity * 0.45)}" mask="url(#${id}-rm)" style="filter:blur(${n(width * 1.4)}px)"/>` +
    `<circle r="${n(r)}" fill="none" stroke="${color}" stroke-width="${n(width * 0.5)}" stroke-opacity="${n(opacity)}" mask="url(#${id}-rm)" style="filter:blur(${n(width * 0.25)}px)"/></g>`
  )
}

// The mask rimGlow uses: brightest on the sunward limb.
export function rimMask(id: string, r: number, width: number): string {
  const R = r + width * 4

  return `<mask id="${id}-rm" maskUnits="userSpaceOnUse" x="${n(-R)}" y="${n(-R)}" width="${n(R * 2)}" height="${n(R * 2)}"><circle r="${n(R)}" fill="url(#${id}-rim)"/></mask>`
}

// ---- Moons ---------------------------------------------------------------

// A moon on a circular orbit seen at an angle: in the L frame its path is an
// ellipse A wide and b tall (b = A sin B). x and y each swing as an eased
// sine (two nested CSS translations), so the moon slows at elongation the
// way a real projected orbit does. The near half (y > 0) is drawn in front
// of the planet and the far half behind, by two copies that trade places
// halfway round. `retro` reverses the direction. A shadow copy rides along
// at an offset and is shown on the near half only, clipped to the globe.
export type Orbit = { A: number; b: number; P: number; phase: number; retro?: boolean }

function orbitWrap(o: Orbit, cls: 'vf' | 'vb', inner: string): string {
  const d0 = o.phase * o.P
  const half = o.P / 2
  const a = o.retro ? -o.A : o.A

  return (
    `<g class="${cls}" style="animation-duration:${n(o.P)}s;animation-delay:-${n(d0)}s">` +
    `<g class="ox" style="--a:${n(a)}px;animation-duration:${n(half)}s;animation-delay:-${n(d0)}s">` +
    `<g class="oy" style="--b:${n(o.b)}px;animation-duration:${n(half)}s;animation-delay:-${n(d0 + o.P / 4)}s">${inner}</g></g></g>`
  )
}

export function moonBack(o: Orbit, body: string): string {
  return orbitWrap(o, 'vb', body)
}

export function moonFront(o: Orbit, body: string): string {
  return orbitWrap(o, 'vf', body)
}

// The shadow a transiting moon casts, `depth` nearer the viewer than the
// cloud tops: it lands displaced away from the sun.
export function moonShadow(o: Orbit, r: number, sL: V3, depth: number): string {
  const s = unit(sL)
  const dx = (-s[0] / Math.max(s[2], 0.2)) * depth
  const dy = (-s[1] / Math.max(s[2], 0.2)) * depth

  return orbitWrap(
    o,
    'vf',
    `<circle cx="${n(dx)}" cy="${n(dy)}" r="${n(r * 1.35)}" fill="#000" fill-opacity=".28"/><circle cx="${n(dx)}" cy="${n(dy)}" r="${n(r)}" fill="#05040a" fill-opacity=".9"/>`,
  )
}

// A small moon disc of radius r: base colour, surface marks clipped to the
// disc, its own terminator and a hint of limb darkening.
export function moonBody(id: string, r: number, sL: V3, base: string, marks: string, light = '#fff'): string {
  return (
    `<g id="${id}"><clipPath id="${id}c"><circle r="${n(r)}"/></clipPath>` +
    `<circle r="${n(r)}" fill="${base}"/>` +
    `<g clip-path="url(#${id}c)">${marks}` +
    `<circle r="${n(r)}" fill="url(#mn-limb)"/>` +
    nightPath(r * 1.04, sL, `fill="#04050c" fill-opacity=".9" style="filter:blur(${n(Math.max(0.6, r * 0.12))}px)"`) +
    `</g><circle r="${n(r)}" fill="none" stroke="${light}" stroke-opacity=".25" stroke-width=".6" mask="url(#mn-rim)"/></g>`
  )
}

export function moonDefs(sL: V3): string {
  const s = unit(sL)

  return (
    `<radialGradient id="mn-limb" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>` +
    `<linearGradient id="mn-rg" x1="${n(0.5 + s[0] * 0.5)}" y1="${n(0.5 + s[1] * 0.5)}" x2="${n(0.5 - s[0] * 0.5)}" y2="${n(0.5 - s[1] * 0.5)}"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="mn-rim" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#mn-rg)"/></mask>`
  )
}

// ---- Rings ---------------------------------------------------------------

// A radial gradient carrying a ring system's brightness profile. `prof`
// returns [colour, opacity] at radius rho (same units as rMax); hard edges
// come from listing the edge radii in `edges`.
export function ringGradient(
  id: string,
  rMax: number,
  prof: (rho: number) => readonly [string, number],
  edges: readonly number[],
  steps = 90,
  white = false,
): string {
  const rs = new Set<number>()
  for (let i = 0; i <= steps; i++) {
    rs.add(Math.round((i / steps) * rMax * 100) / 100)
  }
  for (const e of edges) {
    rs.add(Math.round((e - 0.0025 * rMax) * 1000) / 1000)
    rs.add(Math.round((e + 0.0025 * rMax) * 1000) / 1000)
  }
  const list = [...rs].filter(r => r >= 0 && r <= rMax).sort((a, b) => a - b)
  const stops = list
    .map(r => {
      const [c, o] = prof(r)

      return `<stop offset="${(r / rMax).toFixed(4).replace(/0+$/, '')}" stop-color="${white ? '#fff' : c}" stop-opacity="${o.toFixed(2)}"/>`
    })
    .join('')

  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${n(rMax)}">${stops}</radialGradient>`
}

// ---- Latitude geometry (sphere of radius r seen from elevation B) ---------

// The region of the visible disc north of latitude phi (degrees), with the
// boundary pushed by wob(lon) degrees of latitude: a path to fill, to be
// clipped to the disc. lon0 turns the planet (degrees), for animation
// frames. Every frame of one boundary has the same commands.
export function capD(r: number, B: number, phi: number, wob: (lon: number) => number = () => 0, lon0 = 0, steps = 36): string {
  const t = Math.tan(phi * D2R) * Math.tan(B * D2R)
  if (t >= 1) {
    // Fully visible circle: its inside is the cap.
    const pts = Array.from({ length: steps }, (_, i) => latPt(r, B, phi + wob(-180 + (i * 360) / steps + lon0), -180 + (i * 360) / steps))

    return `M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join('L')}Z`
  }
  if (t <= -1) {
    return `M${n(-2 * r)} ${n(-2 * r)}H${n(2 * r)}V${n(2 * r)}H${n(-2 * r)}Z`
  }
  const lm = Math.acos(-t) / D2R
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const lon = -lm + (2 * lm * i) / steps

    return latPt(r, B, phi + wob(lon + lon0), lon)
  })
  const first = pts[0] as V3
  const last = pts[steps] as V3
  const R2 = r * 2.2

  return (
    `M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join('L')}` +
    `L${n(R2)} ${n(last[1])}L${n(R2)} ${n(-R2)}L${n(-R2)} ${n(-R2)}L${n(-R2)} ${n(first[1])}Z`
  )
}

// A point on the sphere at latitude/longitude (degrees, lon 0 facing the
// viewer, positive toward screen right), in the L frame.
export function latPt(r: number, B: number, lat: number, lon: number): V3 {
  const la = lat * D2R
  const lo = lon * D2R

  return proj([r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)], B)
}

// ---- Backdrop: haze, glare, nebula, stars --------------------------------

// A starfield in three depths. Far stars are zero-length round-capped path
// segments (10 characters each), twinkling in many small groups so no two
// neighbours pulse together; a few bright stars get a halo and spikes.
export function starfield(seed: number, far = 520, mid = 130, bright = 12, keep: (x: number, y: number) => boolean = () => true): string {
  const rand = seeded(seed)
  const tints = ['#ffffff', '#dfe7ff', '#fff1dc', '#cfdcff', '#ffe6c8']
  const groups = (count: number, k: number, width: number, opMin: number) => {
    const buckets: string[][] = Array.from({ length: k }, () => [])
    let i = 0
    while (i < count) {
      const x = rand() * W
      const y = rand() * H
      if (!keep(x, y)) {
        continue
      }
      ;(buckets[i % k] as string[]).push(`M${Math.round(x)} ${Math.round(y)}h0`)
      i++
    }

    return buckets
      .map(
        (b, j) =>
          `<path class="tw" d="${b.join('')}" stroke="${tints[j % tints.length]}" stroke-width="${n(width * (0.8 + rand() * 0.4))}" stroke-linecap="round" style="--tw:${n(opMin)};animation-duration:${n(5 + rand() * 9)}s;animation-delay:-${n(rand() * 9)}s"/>`,
      )
      .join('')
  }
  let brights = ''
  for (let i = 0; i < bright; i++) {
    const x = rand() * W
    const y = rand() * H
    if (!keep(x, y)) {
      i--
      continue
    }
    const tint = tints[Math.floor(rand() * tints.length)] as string
    const s = 1.1 + rand() * 1.1
    const spikes =
      i < 4
        ? `<path d="M${n(x - s * 9)} ${n(y)}H${n(x + s * 9)}M${n(x)} ${n(y - s * 9)}V${n(y + s * 9)}" stroke="${tint}" stroke-width=".7" stroke-opacity=".55"/>`
        : ''
    brights += `<g class="tw" style="--tw:.55;animation-duration:${n(4 + rand() * 6)}s;animation-delay:-${n(rand() * 6)}s"><circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 4)}" fill="url(#sp-halo)"/>${spikes}<circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.8)}" fill="${tint}"/></g>`
  }

  return (
    `<g style="opacity:var(--star-op)">` +
    `<g class="cam cam-1" opacity=".75">${groups(far, 10, 1, 0.35)}</g>` +
    `<g class="cam cam-2">${groups(mid, 6, 1.7, 0.45)}</g>` +
    `<g class="cam cam-3">${brights}</g></g>`
  )
}

// Faint Milky Way: soft overlapping clouds along a band, with a dust lane,
// all from radial gradients, so nothing is blurred or animated.
export function milkyWay(seed: number, x0: number, y0: number, x1: number, y1: number, width: number): string {
  const rand = seeded(seed)
  const ang = (Math.atan2(y1 - y0, x1 - x0) / D2R).toFixed(1)
  let out = ''
  for (let i = 0; i < 16; i++) {
    const t = rand()
    const x = x0 + (x1 - x0) * t + (rand() - 0.5) * width * 0.6
    const y = y0 + (y1 - y0) * t + (rand() - 0.5) * width * 0.6
    const rx = width * (0.5 + rand() * 0.7)
    const g = ['sp-neb-a', 'sp-neb-b', 'sp-neb-c'][i % 3]
    out += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * (0.35 + rand() * 0.25))}" fill="url(#${g})" transform="rotate(${ang} ${n(x)} ${n(y)})"/>`
  }
  out += '<!--d-->'
  for (let i = 0; i < 6; i++) {
    const t = 0.1 + rand() * 0.8
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    const rx = width * (0.35 + rand() * 0.4)
    out += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.3)}" fill="url(#sp-dust)" transform="rotate(${ang} ${n(x)} ${n(y)})"/>`
  }

  return `<g style="opacity:var(--neb-op)">${out.split('<!--d-->')[0]}<g style="opacity:var(--dust-op, 1)">${out.split('<!--d-->')[1] ?? ''}</g></g>`
}

// Sunlight flooding in from a corner for the bright version: a wide wash,
// a hot core, long soft rays turning very slowly, and one faint ghost.
// Visibility is --glare-op.
export function sunGlare(x: number, y: number, size = 1): string {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * 360 + (i % 3) * 7
    const len = (700 + (i % 4) * 260) * size
    const w = (10 + (i % 3) * 8) * size

    return `<path d="M0 ${n(-w)}L${n(len)} 0L0 ${n(w)}Z" fill="url(#sg-ray)" transform="rotate(${n(a)})"/>`
  }).join('')

  return (
    `<g style="opacity:var(--glare-op)"><g transform="translate(${n(x)} ${n(y)})">` +
    `<circle r="${n(1500 * size)}" fill="url(#sg-wash)"/>` +
    `<g opacity=".55"><g>${rays}<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="400s" repeatCount="indefinite"/></g></g>` +
    `<circle r="${n(330 * size)}" fill="url(#sg-core)" class="pulse-slow"/>` +
    `<circle r="${n(46 * size)}" fill="#fffdf4"/></g></g>`
  )
}

export const SPACE_DEFS = `
<radialGradient id="sp-halo"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#cfe0ff" stop-opacity=".18"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sp-neb-a"><stop offset="0" stop-color="#c9b8ff" stop-opacity=".16"/><stop offset="1" stop-color="#c9b8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sp-neb-b"><stop offset="0" stop-color="#ffe2c4" stop-opacity=".13"/><stop offset="1" stop-color="#ffe2c4" stop-opacity="0"/></radialGradient>
<radialGradient id="sp-neb-c"><stop offset="0" stop-color="#9fc4ff" stop-opacity=".12"/><stop offset="1" stop-color="#9fc4ff" stop-opacity="0"/></radialGradient>
<radialGradient id="sp-dust"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="sg-wash"><stop offset="0" stop-color="#fffaee" stop-opacity="1"/><stop offset=".22" stop-color="#fff2d6" stop-opacity=".62"/><stop offset=".5" stop-color="#f7f0e2" stop-opacity=".22"/><stop offset="1" stop-color="#f4f1ea" stop-opacity="0"/></radialGradient>
<radialGradient id="sg-core"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".18" stop-color="#fffaf0" stop-opacity=".85"/><stop offset=".5" stop-color="#fff2d6" stop-opacity=".25"/><stop offset="1" stop-color="#fff2d6" stop-opacity="0"/></radialGradient>
<linearGradient id="sg-ray" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="#fff8e8" stop-opacity=".12"/><stop offset="1" stop-color="#fff8e8" stop-opacity="0"/></linearGradient>
`

export const SPACE_CSS = `
.tw { animation: tw ease-in-out infinite alternate; }
@keyframes tw { from { opacity: 1; } to { opacity: var(--tw, .4); } }
.ox { animation-name: ox; animation-timing-function: cubic-bezier(.37,0,.63,1); animation-iteration-count: infinite; animation-direction: alternate; }
@keyframes ox { from { transform: translateX(calc(var(--a) * -1)); } to { transform: translateX(var(--a)); } }
.oy { animation-name: oy; animation-timing-function: cubic-bezier(.37,0,.63,1); animation-iteration-count: infinite; animation-direction: alternate; }
@keyframes oy { from { transform: translateY(calc(var(--b) * -1)); } to { transform: translateY(var(--b)); } }
.vf { animation-name: vf; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes vf { 0%, 49.8% { opacity: 1; } 50%, 100% { opacity: 0; } }
.vb { animation-name: vb; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes vb { 0%, 49.8% { opacity: 0; } 50%, 100% { opacity: 1; } }
.slide { animation-name: slide; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes slide { from { transform: translateX(var(--f)); } to { transform: translateX(var(--t)); } }
.pulse-slow { animation: pulse 11s ease-in-out infinite; }
`

// Two copies of a tile (a <g id> in defs, T wide) side by side, sliding one
// tile width per period: dir 1 to the right, -1 to the left. Starting at x0,
// they cover x0 - T to x0 + T at all times.
export function slideUse(id: string, T: number, x0: number, period: number, dir: 1 | -1, delay = 0): string {
  const f = dir > 0 ? -T : 0
  const t = dir > 0 ? 0 : -T

  return `<g class="slide" style="--f:${f}px;--t:${t}px;animation-duration:${n(period)}s;animation-delay:-${n(delay)}s"><use href="#${id}" x="${n(x0)}"/><use href="#${id}" x="${n(x0 + T)}"/></g>`
}

// The globe's shadow on its ring plane, in ring-plane coordinates (x, z):
// the sphere's shadow cylinder cut by the plane, a half ellipse R across
// and R / sin(sun elevation) long, on the side away from the sun.
export function ringShadowD(R: number, sP: V3): { d: string; rot: number } {
  const s = unit(sP)
  const e = Math.asin(Math.min(1, Math.abs(s[1])))
  const a = Math.min(R / Math.max(Math.sin(e), 0.05), R * 8)

  return { d: `M0 ${n(-R)}A${n(a)} ${n(R)} 0 0 1 0 ${n(R)}Z`, rot: Math.atan2(-s[2], -s[0]) / D2R }
}

// Ring halves: `content` is drawn in ring-plane coordinates (circles), the
// group squashes it by sin B, and the back half (far side, above centre)
// and front half are clipped apart so the globe can sit between them.
export function ringHalfDefs(id: string, rMax: number): string {
  const m = n(rMax * 1.05)

  return `<clipPath id="${id}-b"><rect x="-${m}" y="-${m}" width="${n(rMax * 2.1)}" height="${m}"/></clipPath><clipPath id="${id}-f"><rect x="-${m}" y="0" width="${n(rMax * 2.1)}" height="${m}"/></clipPath>`
}

// The back pass draws the whole ring (the globe then covers what is behind
// it); the front pass redraws only the near half, and the caller clips it
// to the globe's outline, so the two never meet in a visible seam.
export function ringHalf(id: string, B: number, half: 'b' | 'f', content: string): string {
  const inner = half === 'b' ? content : `<g clip-path="url(#${id}-f)">${content}</g>`

  return `<g transform="scale(1 ${Math.sin(B * D2R).toFixed(4)})">${inner}</g>`
}

// Something carried round on a latitude: `content`, drawn at the origin,
// steps through equal longitudes across the visible face, so it slows and
// narrows toward the limb the way a feature on a turning sphere does.
export function latMover(r: number, B: number, lat: number, dur: number, delay: number, content: string, steps = 24): string {
  const t = Math.tan(lat * D2R) * Math.tan(B * D2R)
  const lm = Math.min(100, Math.acos(Math.max(-1, Math.min(1, -t))) / D2R)
  const pts: V3[] = []
  const sc: string[] = []
  for (let i = 0; i <= steps; i++) {
    const lon = -lm + (2 * lm * i) / steps
    pts.push(latPt(r, B, lat, lon))
    sc.push(`${n(Math.max(0.05, Math.cos(lon * D2R)))} 1`)
  }

  return (
    `<g><g>${content}<animateTransform attributeName="transform" type="scale" values="${sc.join(';')}" dur="${n(dur)}s" begin="-${n(delay)}s" repeatCount="indefinite"/></g>` +
    `<animateMotion values="${pts.map(p => `${n(p[0])},${n(p[1])}`).join(';')}" dur="${n(dur)}s" begin="-${n(delay)}s" repeatCount="indefinite"/></g>`
  )
}
