// Shared pieces for the inner-planet looks (Sun, Earth, Mars, Venus):
// starfields, lit spheres, atmosphere rims, an orthographic projection, and
// surface features that ride a turning sphere. No SVG filters (see kit.ts).
import { n, seeded, W, H } from './kit'

export type Vec3 = readonly [number, number, number]

export function unit(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1

  return [v[0] / l, v[1] / l, v[2] / l]
}

const rad = Math.PI / 180

// ---- Stars -------------------------------------------------------------------

export type StarOptions = {
  // Dots in the far, middle and near layers.
  far: number
  mid: number
  near: number
  // Bright stars with a soft halo and faint spikes.
  bright: number
  // Where stars may go; anything rejected is skipped.
  keep?: (x: number, y: number) => boolean
  area?: { x: number; y: number; w: number; h: number }
}

const STAR_TINTS = ['#ffffff', '#cfe0ff', '#fff1d6', '#ffd9b0', '#bcd4ff'] as const

// A starfield in three depths. Dots are zero-length round-capped strokes, so a
// star costs about ten characters. The near layer twinkles in three groups.
// Wrap it in a group with opacity set from a CSS variable to fade it by mode.
export function starfield(seed: number, o: StarOptions): string {
  const rand = seeded(seed * 7919 + 104729)
  // The generator's first draws from a small seed are correlated; skip them.
  for (let i = 0; i < 12; i++) rand()
  const a = o.area ?? { x: 0, y: 0, w: W, h: H }
  const pick = (): [number, number] | null => {
    const x = a.x + rand() * a.w
    const y = a.y + rand() * a.h

    return !o.keep || o.keep(x, y) ? [x, y] : null
  }
  const dots = (count: number, groups: number) => {
    const out: string[][] = Array.from({ length: groups * STAR_TINTS.length }, () => [])
    for (let i = 0; i < count; i++) {
      const p = pick()
      const t = rand() < 0.55 ? 0 : 1 + Math.floor(rand() * (STAR_TINTS.length - 1))
      const g = Math.floor(rand() * groups)
      if (p) out[g * STAR_TINTS.length + t]!.push(`M${Math.round(p[0])} ${Math.round(p[1])}h0`)
    }

    return out
  }
  const paint = (lists: string[][], width: number, op: number, cls: (g: number) => string) =>
    lists
      .map((l, i) =>
        l.length
          ? `<path class="${cls(Math.floor(i / STAR_TINTS.length))}" stroke="${STAR_TINTS[i % STAR_TINTS.length]}" stroke-opacity="${op}" stroke-width="${width}" stroke-linecap="round" d="${l.join('')}"/>`
          : '',
      )
      .join('')
  const far = paint(dots(o.far, 1), 0.9, 0.55, () => '')
  const mid = paint(dots(o.mid, 2), 1.4, 0.75, g => (g ? 'si-tw2' : ''))
  const near = paint(dots(o.near, 3), 2, 0.95, g => `si-tw${g + 1}`)
  let bright = ''
  for (let i = 0; i < o.bright; i++) {
    const p = pick()
    if (!p) continue
    const [x, y] = p
    const r = 1.4 + rand() * 1.2
    const tint = STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)]
    const s = r * (6 + rand() * 5)
    bright +=
      `<g class="si-tw${1 + (i % 3)}" style="animation-delay:-${n(rand() * 9)}s">` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 5)}" fill="url(#si-halo)" fill-opacity=".8"/>` +
      `<path d="M${n(x - s)} ${n(y)}h${n(s * 2)}M${n(x)} ${n(y - s)}v${n(s * 2)}" stroke="${tint}" stroke-opacity=".35" stroke-width=".7"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${tint}"/></g>`
  }

  return `<g class="si-stars">${far}${mid}${near}${bright}</g>`
}

// ---- Spheres -----------------------------------------------------------------

// The lit part of a sphere's disc at (cx, cy) radius r, for light coming from
// direction L (x right, y down, z toward the viewer): the half limb facing the
// light and the terminator, a half ellipse. `night` gives the unlit part.
export function litPath(cx: number, cy: number, r: number, L: Vec3, night = false, steps = 40): string {
  const [lx, ly, lz] = unit(L)
  const th = Math.atan2(ly, lx)
  const c = lz
  const ct = Math.cos(th)
  const st = Math.sin(th)
  const pts: string[] = []
  const put = (x: number, y: number) => pts.push(`${n(cx + x * ct - y * st)} ${n(cy + x * st + y * ct)}`)
  const a0 = night ? 90 : -90
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + (180 * i) / steps) * rad
    put(r * Math.cos(a), r * Math.sin(a))
  }
  for (let i = 1; i < steps; i++) {
    const s = night ? Math.PI - (Math.PI * i) / steps : (Math.PI * i) / steps
    put(-r * c * Math.sin(s), r * Math.cos(s))
  }

  return `M${pts.join('L')}Z`
}

// Where the sub-solar point sits on the disc.
export function subsolar(cx: number, cy: number, r: number, L: Vec3): [number, number] {
  const [lx, ly] = unit(L)

  return [cx + lx * r, cy + ly * r]
}

// A radial shade gradient centred on the sub-solar point: clear there,
// darkening toward the terminator, so the lit side rounds like Lambert light.
export function lambertGradient(id: string, cx: number, cy: number, r: number, L: Vec3, color = '#000', strength = 0.75): string {
  const [sx, sy] = subsolar(cx, cy, r, L)
  const s = (k: number) => n(strength * k)

  return (
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(sx)}" cy="${n(sy)}" r="${n(r * 2)}">` +
    `<stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".22" stop-color="${color}" stop-opacity="${s(0.1)}"/>` +
    `<stop offset=".38" stop-color="${color}" stop-opacity="${s(0.4)}"/><stop offset=".5" stop-color="${color}" stop-opacity="${s(0.8)}"/>` +
    `<stop offset=".62" stop-color="${color}" stop-opacity="${s(1)}"/></radialGradient>`
  )
}

// A rim gradient across the disc along the light, for an atmosphere stroke:
// faint on the night limb, full on the day limb.
export function rimGradient(id: string, cx: number, cy: number, r: number, L: Vec3, color: string, dark = 0.1): string {
  const [lx, ly] = unit(L)
  const h = Math.hypot(lx, ly) || 1
  const ux = lx / h
  const uy = ly / h

  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(cx - ux * r)}" y1="${n(cy - uy * r)}" x2="${n(cx + ux * r)}" y2="${n(cy + uy * r)}">` +
    `<stop offset="0" stop-color="${color}" stop-opacity="${dark}"/><stop offset=".45" stop-color="${color}" stop-opacity="${n(dark + 0.15)}"/>` +
    `<stop offset=".8" stop-color="${color}" stop-opacity=".85"/><stop offset="1" stop-color="${color}" stop-opacity="1"/></linearGradient>`
  )
}

// Orthographic projection of (lon, lat) in degrees for a globe centred on
// (lon0, lat0): x right, y up, z toward the viewer, all in radii.
export function ortho(lon: number, lat: number, lon0: number, lat0: number): Vec3 {
  const p = lat * rad
  const p0 = lat0 * rad
  const d = (lon - lon0) * rad

  return [
    Math.cos(p) * Math.sin(d),
    Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(d),
    Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(d),
  ]
}

// A (lon, lat) ring projected onto a disc as path data. Points on the far
// side are pushed onto the limb, so a shape that wraps out of view hugs it.
export function projectRing(ring: readonly (readonly [number, number])[], g: Globe, close = true): string {
  const pts = ring.map(([lo, la]) => g.at(lo, la, true))

  return `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${close ? 'Z' : ''}`
}

export type Globe = {
  cx: number
  cy: number
  r: number
  lon0: number
  lat0: number
  // Screen point of (lon, lat) and its depth z (negative when hidden).
  at: (lon: number, lat: number, clamp?: boolean) => [number, number, number]
}

export function globe(cx: number, cy: number, r: number, lon0: number, lat0: number): Globe {
  return {
    cx,
    cy,
    r,
    lon0,
    lat0,
    at(lon, lat, clamp = false) {
      let [x, y, z] = ortho(lon, lat, lon0, lat0)
      if (clamp && z < 0) {
        const h = Math.hypot(x, y) || 1
        x /= h
        y /= h
      }

      return [cx + x * r, cy - y * r, z]
    },
  }
}

// ---- Turning surfaces ---------------------------------------------------------

// A feature on a turning sphere. It is drawn where it sits on the central
// meridian, facing the viewer; the outer group carries it along its line of
// latitude (an ellipse when the pole tilts toward the viewer) and the inner
// group foreshortens it and hides it on the far side.
//
//   period  seconds per turn
//   lon     longitude east of the central meridian at time 0, degrees
//   lat     latitude, degrees
//   r       sphere radius on screen
//   tilt    how far the north pole leans toward the viewer, degrees
//   dir     1 surface moves left to right, -1 right to left
export type Turn = { period: number; r: number; tilt: number; dir?: 1 | -1 }

const bandCuts = new Map<string, string>()

// The keyframes that ride a feature along its latitude: one set for all.
const STEPS = 24
const rideFrames = (() => {
  let k = ''
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2
    k += `${n((i / STEPS) * 100)}%{transform:translate(calc(var(--ax)*${n3(Math.sin(a))}),calc(var(--ay)*${n3(Math.cos(a) - 1)}))}`
  }

  return `@keyframes si-ride{${k}}`
})()

function n3(v: number): string {
  return (Math.round(v * 1000) / 1000).toString()
}

// The visibility and foreshortening keyframes for one latitude band.
function bandName(lat: number, tilt: number): string {
  const b = Math.round(lat / 20) * 20
  const key = `${b}_${Math.round(tilt)}`
  if (!bandCuts.has(key)) {
    const p = b * rad
    const t = tilt * rad
    const z0 = Math.max(0.05, Math.sin(p) * Math.sin(t) + Math.cos(p) * Math.cos(t))
    let k = ''
    for (let i = 0; i <= STEPS; i++) {
      const a = (i / STEPS) * Math.PI * 2
      const z = Math.sin(p) * Math.sin(t) + Math.cos(p) * Math.cos(t) * Math.cos(a)
      const s = Math.max(0.03, Math.min(1, z / z0))
      k += `${n((i / STEPS) * 100)}%{transform:scaleX(${n3(s)});opacity:${z > 0.02 ? 1 : 0}}`
    }
    bandCuts.set(key, `@keyframes si-b${key.replace('-', 'm')}{${k}}`)
  }

  return `si-b${key.replace('-', 'm')}`
}

// CSS for the turning features used so far. Call after building the body.
export function turnCSS(): string {
  return `.si-ride{animation:si-ride linear infinite}.si-fold{transform-box:fill-box;transform-origin:center;animation-timing-function:linear;animation-iteration-count:infinite}${rideFrames}${[...bandCuts.values()].join('')}`
}

// Wrap `content` (drawn at the feature's central-meridian position) so it turns.
export function turning(content: string, lon: number, lat: number, t: Turn): string {
  const dir = t.dir ?? 1
  const ax = t.r * Math.cos(lat * rad) * dir
  const ay = t.r * Math.cos(lat * rad) * Math.sin(t.tilt * rad)
  const phase = ((((lon * dir) % 360) + 360) % 360) / 360
  const delay = `-${n(phase * t.period)}s`
  const band = bandName(lat, t.tilt)

  return (
    `<g class="si-ride" style="--ax:${n(ax)}px;--ay:${n(ay)}px;animation-duration:${t.period}s;animation-delay:${delay}">` +
    `<g class="si-fold" style="animation-name:${band};animation-duration:${t.period}s;animation-delay:${delay}">${content}</g></g>`
  )
}

// Where a feature at (lat) sits on the central meridian, relative to the
// disc centre, before any in-plane rotation of the axis.
export function meridian(lat: number, t: Turn): [number, number] {
  const p = lat * rad
  const b = t.tilt * rad

  return [0, -t.r * (Math.sin(p) * Math.cos(b) - Math.cos(p) * Math.sin(b))]
}

// How much a feature at lat is squashed vertically on the central meridian.
export function squash(lat: number, t: Turn): number {
  const p = lat * rad
  const b = t.tilt * rad

  return Math.max(0.08, Math.sin(p) * Math.sin(b) + Math.cos(p) * Math.cos(b))
}

// ---- Shared CSS and defs --------------------------------------------------------

export const SPACE_DEFS = `
<radialGradient id="si-halo"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".2" stop-color="#dfe9ff" stop-opacity=".35"/><stop offset="1" stop-color="#dfe9ff" stop-opacity="0"/></radialGradient>
<radialGradient id="si-puff"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="si-soft"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
`

export const SPACE_CSS = `
.si-stars { opacity: var(--stars, 1); }
.si-tw1 { animation: twinkle 7s ease-in-out infinite; }
.si-tw2 { animation: twinkle 11s ease-in-out infinite -4s; }
.si-tw3 { animation: twinkle 15s ease-in-out infinite -9s; }
.si-breathe { transform-box: fill-box; transform-origin: center; animation: si-breathe ease-in-out infinite alternate; }
@keyframes si-breathe { from { transform: scale(.97); opacity: .75; } to { transform: scale(1.04); opacity: 1; } }
.si-glow { animation: si-glow ease-in-out infinite alternate; }
@keyframes si-glow { from { opacity: .55; } to { opacity: 1; } }
.si-drift { animation: si-drift ease-in-out infinite alternate; }
@keyframes si-drift { from { transform: translate(var(--dx0, -10px), var(--dy0, 0px)); } to { transform: translate(var(--dx1, 10px), var(--dy1, 0px)); } }
`
