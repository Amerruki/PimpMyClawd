import { closedCurve, n, seeded, type Pt } from './kit'
import { faceSun, type Track } from './space-orrery-proj'

// The planets, each drawn at the origin at radius r and lit from +x, which
// a rotate animation keeps turned toward the Sun as the body orbits. A body
// is: its surface clipped to the disc (bands and markings on a strip that
// slides under the clip, so the globe turns), limb darkening, then the
// Sun-facing layer: a terminator with a soft falloff into the night side,
// a gloss on the lit side and, for bodies with air, a rim of atmosphere on
// the lit limb.

export const BODY_DEFS: string[] = [
  `<linearGradient id="so-term" x1="0" x2="1">` +
    `<stop offset="0" style="stop-color:var(--so-night);stop-opacity:var(--so-night-op)"/>` +
    `<stop offset=".36" style="stop-color:var(--so-night);stop-opacity:var(--so-night-op)"/>` +
    `<stop offset=".47" style="stop-color:var(--so-night);stop-opacity:calc(var(--so-night-op) * .55)"/>` +
    `<stop offset=".55" style="stop-color:var(--so-night);stop-opacity:calc(var(--so-night-op) * .12)"/>` +
    `<stop offset=".62" stop-opacity="0"/></linearGradient>`,
  `<radialGradient id="so-limb"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>`,
  `<radialGradient id="so-gloss" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" style="stop-opacity:var(--so-gloss)"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  `<linearGradient id="so-litg" x1="0" x2="1"><stop offset=".5" stop-color="#000"/><stop offset=".8" stop-color="#fff"/></linearGradient>`,
  `<mask id="so-litm" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#so-litg)"/></mask>`,
]

const def = (s: string): void => {
  BODY_DEFS.push(s)
}

// An atmosphere rim: a halo hugging the limb, bright at the edge.
function rimGradient(id: string, color: string, strength: number): void {
  def(
    `<radialGradient id="${id}"><stop offset=".78" stop-color="${color}" stop-opacity="0"/>` +
      `<stop offset=".88" stop-color="${color}" stop-opacity="${strength}"/>` +
      `<stop offset=".9" stop-color="${color}" stop-opacity="${n(strength * 0.7)}"/>` +
      `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
  )
}

// A strip of surface markings `period` wide that loops under the disc.
// The markings are defined once and placed twice, and the pair slides by
// one period: rightward for prograde spin, leftward for Venus.
function spin(id: string, r: number, period: number, dur: number, content: string, retro = false): string {
  def(`<g id="${id}">${content}</g>`)
  const a = retro ? -r : -r - period
  const to = retro ? -period : period

  return (
    `<g><animateTransform attributeName="transform" type="translate" from="0" to="${n(to)}" dur="${dur}s" repeatCount="indefinite"/>` +
    `<use href="#${id}" x="${n(a)}"/><use href="#${id}" x="${n(a + period)}"/></g>`
  )
}

type Sphere = {
  id: string
  r: number
  base: string
  surface: string
  rim?: { color: string; strength: number }
  track: Track
  offset?: number
}

function sphere(s: Sphere): string {
  const { id, r } = s
  def(`<clipPath id="${id}-c"><circle r="${n(r)}"/></clipPath>`)
  let lit = `<circle r="${n(r)}" fill="url(#so-term)"/>` + `<ellipse cx="${n(r * 0.42)}" cy="0" rx="${n(r * 0.42)}" ry="${n(r * 0.5)}" fill="url(#so-gloss)"/>`

  if (s.rim) {
    rimGradient(`${id}-rim`, s.rim.color, s.rim.strength)
    lit += `<circle r="${n(r * 1.13)}" fill="url(#${id}-rim)" mask="url(#so-litm)"/>`
  }

  return (
    `<circle r="${n(r)}" fill="${s.base}"/>` +
    `<g clip-path="url(#${id}-c)">${s.surface}</g>` +
    `<circle r="${n(r)}" fill="url(#so-limb)"/>` +
    `<g>${faceSun(s.track, s.offset ?? 0)}${lit}</g>`
  )
}

// Map a longitude/latitude outline onto a strip 4r wide (longitude) and 2r
// tall (sine of latitude), the way markings cross a turning globe's face.
const P4 = 4
function geo(r: number, list: readonly (readonly [number, number])[]): string {
  const pts: Pt[] = list.map(([lon, lat]) => [((lon + 180) / 360) * P4 * r, -r * Math.sin((lat * Math.PI) / 180)])

  return closedCurve(pts)
}

// ---- Venus -----------------------------------------------------------------

// A featureless sea of sulphuric-acid cloud, pale cream with faint darker
// chevrons that race round the planet the wrong way (retrograde).
export function venus(r: number, track: Track): string {
  def(
    `<radialGradient id="so-ven" cx=".42" cy=".42" r=".7"><stop offset="0" stop-color="#fbf1d3"/><stop offset=".6" stop-color="#ecd9a6"/><stop offset="1" stop-color="#d7b97a"/></radialGradient>`,
  )
  const P = P4 * r
  const marks = [0.1, 0.42, 0.7]
    .map(
      (f, i) =>
        `<path d="M${n(f * P)} ${n(-r * 0.75)} Q${n(f * P + r * 0.9)} 0 ${n(f * P)} ${n(r * 0.75)}" fill="none" stroke="#a8844c" stroke-opacity="${i === 1 ? 0.3 : 0.2}" stroke-width="${n(r * 0.22)}" stroke-linecap="round"/>`,
    )
    .join('')

  return sphere({
    id: 'so-ven',
    r,
    base: 'url(#so-ven)',
    surface: spin('so-ven-s', r, P, 36, marks, true) + `<rect x="${-r}" y="${n(-r * 0.12)}" width="${2 * r}" height="${n(r * 0.24)}" fill="#fff8e6" fill-opacity=".25"/>`,
    rim: { color: '#fff3cf', strength: 0.7 },
    track,
  })
}

// ---- Earth and Moon ---------------------------------------------------------

// Continents as rough outlines in longitude and latitude.
const LAND: readonly (readonly (readonly [number, number])[])[] = [
  // North America
  [[-166, 66], [-140, 70], [-110, 72], [-85, 70], [-78, 62], [-62, 55], [-66, 45], [-76, 36], [-81, 26], [-90, 30], [-97, 26], [-96, 18], [-88, 15], [-80, 8], [-92, 14], [-106, 22], [-117, 32], [-124, 42], [-128, 52], [-142, 60], [-162, 58]],
  // Greenland
  [[-52, 60], [-42, 60], [-22, 70], [-20, 80], [-40, 83], [-62, 80], [-56, 70]],
  // South America
  [[-80, 8], [-72, 12], [-60, 10], [-50, 2], [-35, -6], [-38, -14], [-42, -23], [-55, -35], [-64, -41], [-68, -53], [-74, -50], [-72, -36], [-71, -18], [-77, -12], [-81, -4]],
  // Africa
  [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [36, 22], [43, 12], [51, 12], [42, -2], [40, -15], [33, -27], [20, -35], [15, -27], [12, -14], [9, -1], [4, 5], [-8, 5], [-17, 14]],
  // Eurasia, with Arabia and India
  [[-10, 37], [-9, 44], [-1, 46], [-4, 49], [5, 54], [8, 58], [16, 69], [30, 71], [60, 70], [80, 73], [105, 78], [140, 72], [180, 68], [178, 62], [160, 59], [142, 52], [135, 43], [127, 38], [121, 30], [110, 20], [106, 10], [100, 13], [98, 8], [94, 18], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 17], [44, 13], [38, 21], [34, 28], [36, 36], [27, 37], [26, 41], [22, 37], [13, 38], [16, 43], [8, 44], [3, 43]],
  // Australia
  [[114, -22], [122, -17], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -31], [115, -34]],
  // Antarctica
  [[-180, -68], [-120, -73], [-60, -64], [0, -70], [60, -67], [120, -66], [180, -68], [180, -90], [-180, -90]],
  // Madagascar, Britain, Japan, Borneo, Sumatra
  [[44, -25], [48, -14], [50, -16], [47, -25]],
  [[-5, 50], [1, 51], [-2, 57], [-5, 58], [-6, 55]],
  [[130, 31], [135, 34], [141, 38], [142, 44], [140, 41], [133, 36]],
  [[109, 1], [117, 7], [119, 1], [114, -4], [110, -2]],
  [[95, 5], [104, -2], [106, -6], [101, -3]],
]

// Earth: blue ocean, green and ochre land, ice caps, a cloud deck turning a
// little faster than the ground, and a thin blue atmosphere on the lit limb.
export function earth(r: number, track: Track): string {
  def(
    `<radialGradient id="so-ear" cx=".42" cy=".4" r=".7"><stop offset="0" stop-color="#3f86d8"/><stop offset=".7" stop-color="#1d55ad"/><stop offset="1" stop-color="#143c86"/></radialGradient>` +
      `<linearGradient id="so-land" x1="0" x2="0" y1="${-r}" y2="${r}" gradientUnits="userSpaceOnUse">` +
      `<stop offset=".1" stop-color="#7b8f6a"/><stop offset=".3" stop-color="#4f7a3a"/><stop offset=".42" stop-color="#b59a62"/><stop offset=".52" stop-color="#5f8a3c"/><stop offset=".68" stop-color="#a68d58"/><stop offset=".8" stop-color="#6b8a4c"/></linearGradient>`,
  )
  const land = LAND.slice(0, 6).map(c => `<path d="${geo(r, c)}"/>`).join('') + LAND.slice(7).map(c => `<path d="${geo(r, c)}"/>`).join('')
  const ice = `<path d="${geo(r, LAND[6]!)}" fill="#f4f8ff"/>`
  const rand = seeded(31)
  const clouds = Array.from({ length: 22 }, () => {
    const x = rand() * P4 * r
    const lat = (rand() - 0.5) * 140
    const y = -r * Math.sin((lat * Math.PI) / 180)

    return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * (0.18 + rand() * 0.35))}" ry="${n(r * (0.05 + rand() * 0.06))}" fill-opacity="${n(0.45 + rand() * 0.4)}"/>`
  }).join('')

  return sphere({
    id: 'so-ear',
    r,
    base: 'url(#so-ear)',
    surface:
      spin('so-ear-s', r, P4 * r, 22, `<g fill="url(#so-land)">${land}</g>${ice}`) +
      `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${n(r * 0.2)}" fill="#f4f8ff"/>` +
      `<g fill="#ffffff">${spin('so-ear-k', r, P4 * r, 17, clouds)}</g>`,
    rim: { color: '#8cc4ff', strength: 0.85 },
    track,
  })
}

// A small body on a tilted circle around its planet, drawn twice: a back
// copy under the planet and a front copy over it, shown only on the near
// half of the orbit.
export function satellite(a: number, b: number, dur: number, phase: number, body: string): { back: string; front: string } {
  const pts: string[] = []
  const N = 24

  for (let i = 0; i <= N; i++) {
    const t = ((i / N + phase) % 1) * Math.PI * 2
    pts.push(`${n(a * Math.cos(t))},${n(-b * Math.sin(t))}`)
  }
  // Near half: sin(t) < 0, from t = pi to 2 pi.
  const f0 = (1 - phase + 0.5) % 1
  const f1 = (1 - phase) % 1
  const vis =
    f0 < f1
      ? `values="0;1;0" keyTimes="0;${Math.round(f0 * 1000) / 1000};${Math.round(f1 * 1000) / 1000}"`
      : `values="1;0;1" keyTimes="0;${Math.round(f1 * 1000) / 1000};${Math.round(f0 * 1000) / 1000}"`
  const motion = `<animateMotion dur="${dur}s" repeatCount="indefinite" calcMode="linear" values="${pts.join(';')}"/>`

  return {
    back: `<g>${motion}${body}</g>`,
    front: `<g><animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" calcMode="discrete" ${vis}/>${motion}${body}</g>`,
  }
}

export function moonBody(r: number, track: Track): string {
  def(`<radialGradient id="so-moon" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#e9e7e2"/><stop offset="1" stop-color="#9c9890"/></radialGradient>`)

  return `<circle r="${n(r)}" fill="url(#so-moon)"/><g>${faceSun(track)}<circle r="${n(r)}" fill="url(#so-term)"/></g>`
}

// ---- Mars -------------------------------------------------------------------

// Rust-red, with the dark albedo regions (Syrtis Major, Acidalia, Mare
// Erythraeum), the Valles Marineris canyon scar along the equator, the
// Tharsis rise, and a white north polar cap.
export function mars(r: number, track: Track): string {
  def(
    `<radialGradient id="so-mar" cx=".42" cy=".42" r=".7"><stop offset="0" stop-color="#e48a5a"/><stop offset=".65" stop-color="#c25a32"/><stop offset="1" stop-color="#9a3f22"/></radialGradient>`,
  )
  const dark: readonly (readonly (readonly [number, number])[])[] = [
    [[60, 22], [75, 18], [78, 2], [70, -8], [62, 4]],
    [[-50, 58], [-10, 55], [-20, 38], [-45, 40]],
    [[-60, -12], [-10, -10], [0, -30], [-40, -35], [-70, -28]],
    [[20, -10], [60, -20], [100, -30], [80, -40], [20, -35]],
    [[110, 30], [150, 28], [170, 12], [130, 10]],
    [[-170, -15], [-130, -20], [-150, -40]],
  ]
  const marks =
    `<g fill="#5d2a1a" fill-opacity=".42">${dark.map(c => `<path d="${geo(r, c)}"/>`).join('')}</g>` +
    `<path d="M${n(((-100 + 180) / 360) * P4 * r)} ${n(r * 0.12)} L${n(((-40 + 180) / 360) * P4 * r)} ${n(r * 0.2)}" stroke="#4a1e12" stroke-opacity=".65" stroke-width="${n(r * 0.1)}" stroke-linecap="round"/>` +
    `<circle cx="${n(((-120 + 180) / 360) * P4 * r)}" cy="${n(-r * 0.1)}" r="${n(r * 0.16)}" fill="#f0a878" fill-opacity=".45"/>`

  return sphere({
    id: 'so-mar',
    r,
    base: 'url(#so-mar)',
    surface:
      spin('so-mar-s', r, P4 * r, 23, marks) +
      `<ellipse cx="0" cy="${n(-r * 0.94)}" rx="${n(r * 0.5)}" ry="${n(r * 0.2)}" fill="#fbf6f0"/>` +
      `<ellipse cx="0" cy="${n(r * 0.97)}" rx="${n(r * 0.3)}" ry="${n(r * 0.09)}" fill="#fbf6f0" fill-opacity=".8"/>`,
    rim: { color: '#ffc7a6', strength: 0.4 },
    track,
  })
}

// ---- Jupiter -------------------------------------------------------------

// Latitude (degrees) to the band gradient's offset.
const lat = (d: number): string => n((1 - Math.sin((d * Math.PI) / 180)) / 2 * 100) + '%'

// Zones and belts at their real latitudes: polar regions, the North and
// South Temperate Belts, the dark North and South Equatorial Belts and the
// bright Equatorial Zone, with the Great Red Spot at 22 degrees south,
// white ovals, blue-grey festoons along the NEB's edge and brown barges.
export function jupiter(r: number, track: Track, moons: { back: string; front: string }[]): string {
  const bands: [number, string][] = [
    [90, '#8e979c'], [52, '#a9a28f'], [40, '#cdbb9a'], [32, '#e8dcc2'], [28, '#b98a5e'], [24, '#c79b6c'], [21, '#efe3c9'],
    [17, '#f0e2c6'], [15, '#a86a45'], [9, '#94573a'], [7, '#d8b088'], [4, '#f4ead3'], [-4, '#ecdcb8'], [-7, '#c99a6c'],
    [-9, '#9c6040'], [-17, '#a8704c'], [-20, '#ecdfc4'], [-26, '#e9dcc0'], [-28, '#b8916a'], [-33, '#c9ad8a'],
    [-38, '#ddcdb0'], [-50, '#ada38c'], [-90, '#8b9499'],
  ]
  def(
    `<linearGradient id="so-jup" x1="0" y1="0" x2="0" y2="1">${bands.map(([d, c]) => `<stop offset="${lat(d)}" stop-color="${c}"/>`).join('')}</linearGradient>`,
  )
  const P = P4 * r
  const rand = seeded(55)
  const y = (d: number): number => -r * Math.sin((d * Math.PI) / 180)
  let f = ''

  // Festoons: dark blue-grey plumes trailing from the NEB into the zone.
  for (let i = 0; i < 9; i++) {
    const x = (i + rand() * 0.6) * (P / 9)
    f += `<path d="M${n(x)} ${n(y(7.5))} q${n(r * 0.1)} ${n(r * 0.02)} ${n(r * 0.17)} ${n(r * 0.08)}" fill="none" stroke="#6b6f7c" stroke-opacity=".32" stroke-width="${n(r * 0.03)}" stroke-linecap="round"/>`
  }
  // Turbulent wisps along the belts.
  for (let i = 0; i < 26; i++) {
    const band = [12, -12, -14, 26, -30, 11][i % 6]!
    f += `<ellipse cx="${n(rand() * P)}" cy="${n(y(band + (rand() - 0.5) * 3))}" rx="${n(r * (0.12 + rand() * 0.25))}" ry="${n(r * 0.022)}" fill="${rand() > 0.5 ? '#f3e4c8' : '#7a4630'}" fill-opacity="${n(0.25 + rand() * 0.3)}"/>`
  }
  // Brown barges in the NEB, white ovals in the STB.
  for (let i = 0; i < 3; i++) {
    f += `<ellipse cx="${n((0.2 + i * 0.31) * P)}" cy="${n(y(14))}" rx="${n(r * 0.09)}" ry="${n(r * 0.035)}" fill="#5b2f1f" fill-opacity=".7"/>`
    f += `<ellipse cx="${n((0.05 + i * 0.29) * P)}" cy="${n(y(-31))}" rx="${n(r * 0.07)}" ry="${n(r * 0.04)}" fill="#fbf4e6" fill-opacity=".85"/>`
  }
  // The Great Red Spot in its hollow.
  const gx = 0.62 * P
  f +=
    `<ellipse cx="${n(gx)}" cy="${n(y(-22.5))}" rx="${n(r * 0.22)}" ry="${n(r * 0.12)}" fill="#f6e6cc"/>` +
    `<ellipse cx="${n(gx)}" cy="${n(y(-22.5))}" rx="${n(r * 0.16)}" ry="${n(r * 0.09)}" fill="#c25a3a"/>` +
    `<ellipse cx="${n(gx + r * 0.02)}" cy="${n(y(-22.5) + r * 0.01)}" rx="${n(r * 0.09)}" ry="${n(r * 0.045)}" fill="#a8452c"/>`

  return (
    moons.map(m => m.back).join('') +
    sphere({
      id: 'so-jup',
      r,
      base: 'url(#so-jup)',
      surface: spin('so-jup-s', r, P, 30, f),
      rim: { color: '#f5e7cf', strength: 0.2 },
      track,
    }) +
    moons.map(m => m.front).join('')
  )
}

// The four Galilean moons as small lit dots.
export function galilean(r: number): { back: string; front: string }[] {
  const list = [
    { a: 1.75, dur: 6.6, c: '#e9d27a', s: 0.075, p: 0.1 },
    { a: 2.3, dur: 9.3, c: '#efe8d8', s: 0.066, p: 0.55 },
    { a: 3.0, dur: 13.2, c: '#b9ab98', s: 0.1, p: 0.3 },
    { a: 3.9, dur: 20, c: '#8f857a', s: 0.092, p: 0.8 },
  ]

  return list.map(m => satellite(m.a * r, m.a * r * 0.36, m.dur, m.p, `<circle r="${n(Math.max(1.3, m.s * r))}" fill="${m.c}"/><circle r="${n(Math.max(1.3, m.s * r) * 0.45)}" cx="${n(-0.3)}" cy="${n(-0.3)}" fill="#fff" fill-opacity=".6"/>`))
}

// ---- Saturn --------------------------------------------------------------

// Pale gold bands, a blue-grey north pole, and the rings: the faint C ring,
// the bright B ring, the dark Cassini division, the A ring with the Encke
// gap, and the thin F ring, in front of and behind the globe. The globe's
// shadow falls across the rings away from the Sun, and the rings shadow the
// globe in a thin dark band.
const TILT = -14
const OPEN = 0.36
export function saturn(r: number, track: Track): string {
  const bands: [number, string][] = [
    [90, '#8f9a98'], [70, '#a7a58e'], [55, '#d6c495'], [42, '#e3d3a8'], [34, '#c9b07a'], [26, '#e8d9b0'], [16, '#d9c08a'],
    [10, '#efe2bd'], [-10, '#ecdcb3'], [-18, '#d4b982'], [-28, '#e4d4aa'], [-40, '#cfba8a'], [-60, '#d9c79c'], [-90, '#b3a685'],
  ]
  const R = 2.36
  const ring: [number, string, number][] = [
    [1.11, '#c8bca4', 0], [1.12, '#c8bca4', 0.06], [1.235, '#a89c86', 0.06], [1.24, '#a89c86', 0.28], [1.52, '#bfb196', 0.36],
    [1.53, '#e4d6b4', 0.85], [1.7, '#f0e4c4', 0.95], [1.94, '#e7d8b4', 0.9], [1.95, '#3b352c', 0.12], [2.025, '#3b352c', 0.12],
    [2.03, '#d6c7a2', 0.75], [2.205, '#d1c29c', 0.72], [2.21, '#3b352c', 0.15], [2.225, '#cfbf98', 0.7], [2.27, '#cdbd96', 0.66],
    [2.275, '#cdbd96', 0], [2.32, '#e9dfc8', 0], [2.33, '#e9dfc8', 0.55], [2.34, '#e9dfc8', 0],
  ]
  def(
    `<linearGradient id="so-sat" x1="0" y1="0" x2="0" y2="1">${bands.map(([d, c]) => `<stop offset="${lat(d)}" stop-color="${c}"/>`).join('')}</linearGradient>` +
      `<radialGradient id="so-ring">${ring.map(([x, c, o]) => `<stop offset="${Math.round((x / R) * 1000) / 1000}" stop-color="${c}" stop-opacity="${o}"/>`).join('')}</radialGradient>` +
      `<clipPath id="so-sat-back"><rect x="${n(-3 * r)}" y="${n(-3 * r)}" width="${n(6 * r)}" height="${n(3 * r)}"/></clipPath>` +
      `<clipPath id="so-sat-front"><rect x="${n(-3 * r)}" y="0" width="${n(6 * r)}" height="${n(3 * r)}"/></clipPath>` +
      `<clipPath id="so-sat-ann"><path d="M${n(-R * r)} 0a${n(R * r)} ${n(R * r)} 0 1 0 ${n(2 * R * r)} 0a${n(R * r)} ${n(R * r)} 0 1 0 ${n(-2 * R * r)} 0Z"/></clipPath>`,
  )
  // The in-plane direction of the Sun, from its screen direction through
  // the ring plane's squash and tilt.
  const plane: Track = {
    ...track,
    sun: track.sun.map(a => {
      const t = ((a - TILT) * Math.PI) / 180
      const b = (Math.atan2(Math.sin(t) / OPEN, Math.cos(t)) * 180) / Math.PI
      return b
    }),
  }
  for (let i = 1; i < plane.sun.length; i++) {
    while (plane.sun[i]! - plane.sun[i - 1]! > 180) plane.sun[i]! -= 360
    while (plane.sun[i]! - plane.sun[i - 1]! < -180) plane.sun[i]! += 360
  }
  const rings = (half: string): string =>
    `<g clip-path="url(#so-sat-${half})"><g transform="scale(1 ${OPEN})">` +
    `<circle r="${n(R * r)}" fill="url(#so-ring)"/>` +
    `<g clip-path="url(#so-sat-ann)"><g>${faceSun(plane)}<rect x="${n(-R * r)}" y="${n(-r * 0.9)}" width="${n(R * r)}" height="${n(r * 1.8)}" rx="${n(r * 0.5)}" style="fill:var(--so-night);fill-opacity:calc(var(--so-night-op) * .6)"/></g></g>` +
    `</g></g>`
  const globe = sphere({
    id: 'so-sat',
    r,
    base: 'url(#so-sat)',
    surface:
      spin('so-sat-s', r, P4 * r, 34, `<ellipse cx="${n(r)}" cy="${n(-r * 0.5)}" rx="${n(r * 0.3)}" ry="${n(r * 0.04)}" fill="#f6ecd0" fill-opacity=".5"/><ellipse cx="${n(r * 2.8)}" cy="${n(r * 0.3)}" rx="${n(r * 0.4)}" ry="${n(r * 0.03)}" fill="#b89c68" fill-opacity=".5"/>`) +
      `<ellipse cx="0" cy="${n(r * 0.16)}" rx="${n(r * 1.7)}" ry="${n(r * 1.7 * OPEN)}" fill="none" stroke="#2a2217" stroke-opacity=".32" stroke-width="${n(r * 0.1)}"/>`,
    rim: { color: '#fff0c8', strength: 0.3 },
    track,
    offset: TILT,
  })

  return `<g transform="rotate(${TILT})">${rings('back')}${globe}${rings('front')}</g>`
}

// ---- Uranus and Neptune ---------------------------------------------------

// Uranus: a pale cyan, nearly featureless globe knocked on its side, its
// narrow dark rings standing almost upright around it.
export function uranus(r: number, track: Track): string {
  def(
    `<radialGradient id="so-ura" cx=".4" cy=".38" r=".75"><stop offset="0" stop-color="#d6f3f4"/><stop offset=".55" stop-color="#a5dde4"/><stop offset="1" stop-color="#78bfcc"/></radialGradient>` +
      `<clipPath id="so-ura-back"><rect x="${n(-3 * r)}" y="${n(-3 * r)}" width="${n(3 * r)}" height="${n(6 * r)}"/></clipPath>` +
      `<clipPath id="so-ura-front"><rect x="0" y="${n(-3 * r)}" width="${n(3 * r)}" height="${n(6 * r)}"/></clipPath>`,
  )
  const ringSet = (half: string): string =>
    `<g clip-path="url(#so-ura-${half})" fill="none" stroke="#dff3f7">` +
    [1.62, 1.7, 1.78, 2.0].map((k, i) => `<ellipse rx="${n(k * r * 0.34)}" ry="${n(k * r)}" stroke-opacity="${i === 3 ? 0.55 : 0.22}" stroke-width="${i === 3 ? 1.1 : 0.6}"/>`).join('') +
    `</g>`
  // The ring plane is close to the planet's equator, tilted ~98 degrees, so
  // the near half of the rings is on the right of this upright frame.
  return (
    `<g transform="rotate(-8)">${ringSet('back')}` +
    sphere({
      id: 'so-ura',
      r,
      base: 'url(#so-ura)',
      surface: `<ellipse cx="${n(-r * 0.25)}" cy="${n(-r * 0.1)}" rx="${n(r * 0.55)}" ry="${n(r * 0.6)}" fill="#e6fafa" fill-opacity=".35"/><path d="M${n(r * 0.3)} ${-r}v${2 * r}" stroke="#8acbd4" stroke-opacity=".3" stroke-width="${n(r * 0.18)}"/>`,
      rim: { color: '#d8fbff', strength: 0.55 },
      track,
      offset: -8,
    }) +
    ringSet('front') +
    `</g>`
  )
}

// Neptune: deep azure, faint lighter bands, the Great Dark Spot at 20
// degrees south with its bright companion clouds, and the small "Scooter".
export function neptune(r: number, track: Track): string {
  def(
    `<linearGradient id="so-nep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4fb4"/><stop offset=".3" stop-color="#3f68d8"/><stop offset=".45" stop-color="#4f7be6"/><stop offset=".6" stop-color="#3a62d2"/><stop offset=".8" stop-color="#456fdc"/><stop offset="1" stop-color="#2a46a6"/></linearGradient>`,
  )
  const P = P4 * r
  const y = (d: number): number => -r * Math.sin((d * Math.PI) / 180)
  const marks =
    `<ellipse cx="${n(P * 0.3)}" cy="${n(y(-20))}" rx="${n(r * 0.24)}" ry="${n(r * 0.12)}" fill="#14256a" fill-opacity=".75"/>` +
    `<ellipse cx="${n(P * 0.3 + r * 0.05)}" cy="${n(y(-20) - r * 0.16)}" rx="${n(r * 0.2)}" ry="${n(r * 0.04)}" fill="#f2f6ff" fill-opacity=".85"/>` +
    `<ellipse cx="${n(P * 0.55)}" cy="${n(y(-42))}" rx="${n(r * 0.08)}" ry="${n(r * 0.035)}" fill="#eef4ff" fill-opacity=".8"/>` +
    `<ellipse cx="${n(P * 0.8)}" cy="${n(y(25))}" rx="${n(r * 0.3)}" ry="${n(r * 0.03)}" fill="#dfe9ff" fill-opacity=".55"/>` +
    `<ellipse cx="${n(P * 0.1)}" cy="${n(y(-55))}" rx="${n(r * 0.12)}" ry="${n(r * 0.06)}" fill="#1a2f80" fill-opacity=".6"/>`

  return sphere({
    id: 'so-nep',
    r,
    base: 'url(#so-nep)',
    surface: spin('so-nep-s', r, P, 26, marks),
    rim: { color: '#9cc0ff', strength: 0.6 },
    track,
  })
}
