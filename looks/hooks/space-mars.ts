import { makeColors } from './make-colors.js'
import { blob, grade, n, seeded, svg } from './kit'
import { lambertGradient, litPath, rimGradient, SPACE_CSS, SPACE_DEFS, starfield, turnCSS, turning, meridian, squash, unit, type Turn, type Vec3 } from './space-inner-kit'
import type { Look } from './look'

// Mars large in the upper right, turning slowly on its tilted axis: the
// Tharsis volcanoes and Olympus Mons, the long scar of Valles Marineris, the
// dark albedo seas, bright Hellas and Argyre, cratered southern highlands,
// regional dust storms and a north polar cap whose spiral troughs turn with
// the planet. A thin pink atmosphere glows on the limb, and Phobos and Deimos
// orbit in the equatorial plane, passing in front and behind. Night is
// darker and nearer half lit, with the Earth a blue point among the stars.
const { theme, problems } = makeColors({
  label: 'Mars',
  codeTheme: { light: 'solarized-light', dark: 'monokai' },
  roles: { accent: '#b8501c', danger: '#cf1f3c', success: '#2f9a4a', warning: '#9a7400', pro: '#9a4ad0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f6efea',
        'surface-1': '#faf5f1',
        'surface-2': '#fefbf8',
        'text-primary': '#2a1610',
        'text-secondary': '#4e3328',
        'text-muted': '#6e5044',
      },
    },
  },
  dark: {
    roles: { accent: '#ff874a', danger: '#ff4a62', pro: '#c58bff' },
    gray: {
      anchors: {
        'surface-0': '#0c0807',
        'surface-1': '#140d0b',
        'surface-2': '#1b1310',
        'surface-3': '#221815',
        'text-primary': '#fff0ea',
        'text-secondary': '#e4cbc0',
        'text-muted': '#b39a8f',
      },
    },
  },
})

const CX = 1345
const CY = 345
const R = 390
const AXIS = -24
const TILT = 19
const LON0 = 292
const TURN: Turn = { period: 300, r: R, tilt: TILT }
const rad = Math.PI / 180

// The light in the planet's own frame (the axis is rotated by AXIS on screen).
const L_DAY: Vec3 = unit([-0.62, -0.3, 0.72])
const L_NIGHT: Vec3 = unit([-0.94, -0.2, 0.05])

// A feature at (lat, lon): content is drawn around (0, 0) at its natural size
// and placed on the central meridian, squashed by the view; it then turns.
function feature(lat: number, lon: number, content: string): string {
  const [, my] = meridian(lat, TURN)
  const sq = squash(lat, TURN)

  return turning(`<g transform="translate(0 ${n(my)}) scale(1 ${n(sq)})">${content}</g>`, lon - LON0, lat, TURN)
}

// Degrees on the surface to pixels at the central meridian.
const deg = (d: number) => R * Math.sin(d * rad)

// ---- Albedo ----------------------------------------------------------------------

type Patch = [lat: number, lon: number, w: number, h: number, kind: 'dk' | 'lt' | 'dust' | 'red', seed: number, rot?: number]

const PATCHES: Patch[] = [
  // Dark seas
  [8, 69, 9, 15, 'dk', 1, 12],
  [47, 330, 24, 9, 'dk', 2, -8],
  [-3, 2, 13, 4, 'dk', 3, 0],
  [-8, 22, 24, 5, 'dk', 4, 5],
  [-25, 330, 26, 9, 'dk', 5, -6],
  [-15, 311, 9, 5, 'dk', 6, 20],
  [-26, 275, 6, 4, 'dk', 7, 0],
  [-32, 205, 26, 6, 'dk', 8, -6],
  [-22, 145, 30, 8, 'dk', 9, 4],
  [-15, 100, 20, 6, 'dk', 10, -4],
  [45, 115, 26, 10, 'dk', 11, 0],
  [62, 320, 40, 6, 'dk', 12, 0],
  [62, 180, 50, 6, 'dk', 13, 0],
  [-10, 336, 7, 7, 'dk', 14, 30],
  [-20, 62, 14, 8, 'dk', 15, -10],
  [-40, 300, 18, 5, 'dk', 16, 0],
  [-35, 15, 26, 6, 'dk', 17, 0],
  [20, 40, 12, 6, 'dk', 18, 10],
  [-25, 235, 14, 7, 'dk', 41, -10],
  [-18, 192, 16, 6, 'dk', 42, 6],
  [-28, 345, 18, 8, 'dk', 43, 10],
  [-5, 352, 9, 6, 'dk', 44, -20],
  [-33, 262, 10, 4, 'dk', 45, 15],
  [12, 302, 10, 9, 'lt', 46],
  [40, 290, 14, 7, 'lt', 47],
  [-12, 255, 9, 5, 'lt', 48],
  [50, 200, 26, 8, 'dk', 49, 0],
  // Bright basins and plains
  [-42, 70, 14, 11, 'lt', 21],
  [-50, 316, 8, 6, 'lt', 22],
  [20, 5, 22, 14, 'red', 23],
  [5, 252, 30, 22, 'red', 24],
  [25, 147, 12, 9, 'red', 25],
  [15, 200, 18, 12, 'red', 26],
  [25, 318, 14, 10, 'lt', 27],
  [35, 60, 20, 8, 'lt', 28],
  [-5, 180, 20, 12, 'red', 29],
  // Dust storms
  [-36, 288, 18, 7, 'dust', 31, -12],
  [-44, 74, 15, 8, 'dust', 32, 8],
  [-20, 170, 12, 6, 'dust', 33, 0],
]

function patch([lat, lon, w, h, kind, seed, rot = 0]: Patch): string {
  const rx = deg(w)
  const ry = deg(h)
  const d = blob(0, 0, rx, ry, 700 + seed, kind === 'dust' ? 0.3 : 0.24, 10)
  const body =
    kind === 'dust'
      ? `<g class="ma-storm" style="animation-delay:-${seed * 3}s"><path d="${d}" fill="url(#ma-dust)" transform="rotate(${rot})"/><path d="${blob(rx * 0.2, -ry * 0.1, rx * 0.5, ry * 0.45, 800 + seed, 0.35, 8)}" fill="url(#ma-dust)" transform="rotate(${rot})"/></g>`
      : `<path d="${d}" fill="url(#ma-${kind})" transform="rotate(${rot})"/>`

  return feature(lat, lon, body)
}

// ---- Volcanoes and the canyon -------------------------------------------------------

// A shield volcano: a broad lit dome, a scarp, a nested caldera.
function volcano(lat: number, lon: number, r: number, scarp: boolean): string {
  const p = deg(r)
  const body =
    `<circle r="${n(p * 1.6)}" fill="url(#ma-aureole)"/>` +
    `<ellipse cx="${n(p * 0.12)}" cy="${n(p * 0.1)}" rx="${n(p)}" ry="${n(p * 0.96)}" fill="url(#ma-vshade)"/>` +
    `<circle r="${n(p)}" fill="url(#ma-dome)"/>` +
    (scarp ? `<circle r="${n(p * 0.98)}" fill="none" stroke="url(#ma-scarp)" stroke-width="${n(p * 0.07)}"/>` : '') +
    `<ellipse cx="${n(-p * 0.03)}" cy="${n(-p * 0.03)}" rx="${n(p * 0.2)}" ry="${n(p * 0.17)}" fill="url(#ma-caldera)"/>` +
    (scarp ? `<ellipse cx="${n(p * 0.06)}" cy="${n(p * 0.02)}" rx="${n(p * 0.1)}" ry="${n(p * 0.08)}" fill="url(#ma-caldera)"/>` : '')

  return feature(lat, lon, body)
}

// Valles Marineris: Noctis Labyrinthus in the west, the main troughs, the
// chaos terrain in the east. Each piece turns on its own, so the long canyon
// foreshortens correctly as it nears the limb.
const VALLES: [lat: number, lon: number, w: number, branch: number][] = [
  [-7, 262, 2.6, 0], [-9, 274, 4.2, 1], [-10.5, 287, 5.5, 1], [-11.5, 300, 4.5, 0], [-9.5, 313, 4.5, 0], [-5, 324, 5, 0],
]

// Each piece spans about twenty degrees and fades out at both ends, so the
// overlapping pieces read as one canyon while each foreshortens on its own.
function valles(): string {
  return VALLES.map(([lat, lon, w, branch], i) => {
    const next = VALLES[i + 1] ?? [lat + 4, lon + 11, w, 0]
    const prev = VALLES[i - 1] ?? [lat - 1, lon - 11, w, 0]
    const len = deg(22)
    const slope = -(next[0] - prev[0]) / (next[1] - prev[1])
    const hw = deg(w) * 0.32
    const lens = (k: number, dy: number) => `M${n(-len / 2)} ${n(dy)}Q${n(-len / 4)} ${n(dy - hw * k)} 0 ${n(dy - hw * k)}Q${n(len / 4)} ${n(dy - hw * k)} ${n(len / 2)} ${n(dy)}Q${n(len / 4)} ${n(dy + hw * k)} 0 ${n(dy + hw * k)}Q${n(-len / 4)} ${n(dy + hw * k)} ${n(-len / 2)} ${n(dy)}Z`
    const chaos = i === VALLES.length - 1
    const body =
      `<g transform="rotate(${n(Math.atan(slope) / rad)})" mask="url(#ma-vfade)">` +
      `<path d="${lens(2.6, 0)}" fill="url(#ma-trough)"/>` +
      `<path d="${lens(1, 0)}" fill="var(--canyon)" fill-opacity="${chaos ? 0.35 : 0.7}"/>` +
      (branch ? `<path d="${lens(0.55, -hw * 2.2)}" fill="var(--canyon)" fill-opacity=".5"/>` : '') +
      `<path d="M${n(-len * 0.45)} ${n(hw * 0.7)}H${n(len * 0.45)}" stroke="var(--wall-lit)" stroke-width="${n(Math.max(0.8, hw * 0.25))}" stroke-opacity=".45"/>` +
      `<path d="M${n(-len * 0.45)} ${n(-hw * 0.7)}H${n(len * 0.45)}" stroke="var(--wall-dark)" stroke-width="${n(Math.max(0.8, hw * 0.3))}" stroke-opacity=".5"/>` +
      `</g>`

    return feature(lat, lon, body)
  }).join('')
}

// Water-ice clouds: wisps trailing west of the Tharsis volcanoes and Olympus
// Mons, and a few thin bands of haze.
function clouds(seed: number): string {
  const rand = seeded(seed)
  const spots: [number, number, number][] = [[20, 222, 9], [12, 251, 7], [2, 243, 6], [-8, 236, 6], [42, 246, 8], [-38, 290, 12], [55, 330, 14]]
  return spots
    .map(([lat, lon, w]) => {
      let d = ''
      for (let i = 0; i < 4; i++) {
        const x = -deg(w) * (0.3 + rand() * 0.8)
        const y = (rand() - 0.5) * deg(w) * 0.6
        d += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(deg(w) * (0.45 + rand() * 0.4))}" ry="${n(deg(w) * (0.14 + rand() * 0.12))}" transform="rotate(${Math.round((rand() - 0.5) * 20)} ${n(x)} ${n(y)})"/>`
      }
      return feature(lat, lon, `<g fill="url(#ma-cloud)" class="ma-storm" style="animation-duration:${Math.round(14 + rand() * 12)}s">${d}</g>`)
    })
    .join('')
}

// Craters over the southern highlands and a few in the north.
function craters(seed: number): string {
  const rand = seeded(seed)
  let out = ''
  for (let i = 0; i < 64; i++) {
    const south = rand() < 0.78
    const lat = south ? -5 - rand() * 55 : 10 + rand() * 45
    const lon = rand() * 360
    const r = deg(0.8 + Math.pow(rand(), 2.5) * 4.5)
    out += feature(lat, lon, `<circle r="${n(r)}" fill="url(#ma-crater)"/>`)
  }

  return out
}

// The north polar cap with its spiral troughs, turning with the planet.
function polarCap(): string {
  const capR = deg(13)
  const lat = 90 - 13
  const y = -R * Math.sin(lat * rad) * Math.cos(TILT * rad)
  const rand = seeded(91)
  let troughs = ''
  for (let i = 0; i < 9; i++) {
    const a0 = (i / 9) * Math.PI * 2 + rand() * 0.3
    const pts: string[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      const a = a0 + t * 2.2
      const r = capR * (0.15 + t * 0.78)
      pts.push(`${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`)
    }
    troughs += `M${pts.join('L')}`
  }
  const edge = blob(0, 0, capR, capR, 92, 0.12, 14)

  return (
    `<g transform="translate(0 ${n(y)}) scale(1 ${n(Math.sin(TILT * rad) + 0.08)})">` +
    `<g class="ma-cap"><path d="${blob(0, 0, capR * 1.25, capR * 1.25, 93, 0.16, 12)}" fill="var(--frost)" fill-opacity=".35"/>` +
    `<path d="${edge}" fill="url(#ma-ice)"/>` +
    `<path d="${troughs}" fill="none" stroke="var(--trough)" stroke-width="1.6" stroke-opacity=".18" stroke-linecap="round"/></g></g>`
  )
}

// ---- Moons -------------------------------------------------------------------------

// Arc-length key points so a moon moves at an even angle round its orbit,
// slow at the ends of the ellipse as a real orbit looks.
function orbitKeys(a: number, b: number): { path: string; points: string; times: string } {
  const N = 16
  const pts = Array.from({ length: 401 }, (_, i) => {
    const t = (i / 400) * Math.PI * 2
    return [a * Math.cos(t), -b * Math.sin(t)] as const
  })
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]))
  const total = cum[cum.length - 1]!
  const keys = Array.from({ length: N + 1 }, (_, k) => n3(cum[Math.round((k / N) * 400)]! / total))

  return {
    path: `M${n(a)} 0A${n(a)} ${n(b)} 0 1 0 ${n(-a)} 0A${n(a)} ${n(b)} 0 1 0 ${n(a)} 0`,
    points: keys.join(';'),
    times: keys.map((_, k) => n3(k / N)).join(';'),
  }
}

function n3(v: number): string {
  return (Math.round(v * 1000) / 1000).toString()
}

function moonBody(rx: number, ry: number, seed: number, crater: boolean): string {
  return (
    `<path d="${blob(0, 0, rx, ry, seed, 0.18, 9)}" fill="url(#ma-moon)"/>` +
    (crater ? `<ellipse cx="${n(rx * 0.35)}" cy="${n(-ry * 0.1)}" rx="${n(rx * 0.32)}" ry="${n(ry * 0.36)}" fill="#000" fill-opacity=".28"/>` : '')
  )
}

type Moon = { a: number; dur: number; rx: number; ry: number; seed: number; crater: boolean; delay: number }

const MOONS: Moon[] = [
  { a: R * 1.42, dur: 84, rx: 9, ry: 6.5, seed: 61, crater: true, delay: 20 },
  { a: R * 2.25, dur: 330, rx: 5.5, ry: 4.2, seed: 62, crater: false, delay: 140 },
]

function moonMotion(m: Moon): string {
  const o = orbitKeys(m.a, m.a * Math.sin(TILT * rad))

  return `<animateMotion dur="${m.dur}s" begin="-${m.delay}s" repeatCount="indefinite" path="${o.path}" keyPoints="${o.points}" keyTimes="${o.times}" calcMode="linear"/>`
}

const moonsBack = MOONS.map(m => `<g>${moonBody(m.rx, m.ry, m.seed, m.crater)}${moonMotion(m)}</g>`).join('')

// ---- Scene ---------------------------------------------------------------------------

const CSS = `
:root, svg {
  --bg0:#fff8ee; --bg1:#f4e2d2; --bg2:#d9c9c6; --bg3:#a9a8bd; --stars:.4; --day:1; --night:0;
  --glare:#fffaf0; --glare-op:.85;
  --m0:#e6955a; --m1:#c8642e; --m2:#a2441c; --m3:#6e2a10;
  --dk:#3e2216; --dk-op:.95; --lt:#f2c79a; --red:#e88a4a; --dust:#f6d8b0;
  --wall-dark:#3a1406; --wall-lit:#f4b88a; --canyon:#5a240e;
  --frost:#fff6ee; --ice:#ffffff; --trough:#c79a86; --cloud:#f4f6ff;
  --night-fill:#0c0606; --night-op:.9; --lam-op:1;
  --atmo:#ffb69a; --atmo-op:.9; --haze:#ffd3b8; --haze-op:.45;
  --earth:#6fb6ff; --earth-op:0; --moon-col:#a89a8c;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#140a08; --bg1:#0a0608; --bg2:#05050b; --bg3:#03030a; --stars:1; --day:0; --night:1;
    --glare:#ff8a5a; --glare-op:.1;
    --m0:#d2804a; --m1:#b2552a; --m2:#8a3818; --m3:#4e1c0a;
    --dk:#2c160e; --dk-op:.95; --lt:#e0b088; --red:#d27a3e; --dust:#e6c49a;
    --wall-dark:#240a02; --wall-lit:#e0a070; --canyon:#3a1406;
    --frost:#f4ece6; --ice:#f8f6f4; --trough:#9a7060; --cloud:#dfe4f4;
    --night-fill:#030203; --night-op:.96; --lam-op:1;
    --atmo:#ff9a7a; --atmo-op:.75; --haze:#ffb090; --haze-op:.3;
    --earth:#6fb6ff; --earth-op:1; --moon-col:#a89a8c;
  }
}
.ma-storm { animation: ma-storm 23s ease-in-out infinite alternate; }
@keyframes ma-storm { from { opacity: .55; } to { opacity: 1; } }
.ma-cap { transform-box: fill-box; transform-origin: center; animation: ma-cap 300s linear infinite; }
@keyframes ma-cap { to { transform: rotate(-360deg); } }
.ma-atmo { animation: si-glow 19s ease-in-out infinite alternate; }
${SPACE_CSS}
`

const frame = `transform="translate(${CX} ${CY}) rotate(${AXIS})"`
const front = `<rect x="-2000" y="0" width="4000" height="2000" fill="#fff"/>`

const shade = (L: Vec3, id: string) =>
  `<circle r="${R}" fill="url(#${id})" opacity="var(--lam-op)"/>` +
  `<g style="filter:blur(20px)"><path d="${litPath(0, 0, R, L, true)}" fill="var(--night-fill)" fill-opacity="var(--night-op)"/></g>`

const BODY = `
<rect width="1600" height="1000" fill="url(#ma-bg)"/>
${starfield(5501, { far: 520, mid: 200, near: 70, bright: 9, keep: (x, y) => Math.hypot(x - CX, y - CY) > R + 30 })}
<g opacity="var(--day)"><circle cx="-120" cy="180" r="900" fill="url(#ma-glare)"/></g>
<g opacity="var(--earth-op)"><circle cx="402" cy="148" r="16" fill="url(#ma-earthglow)"/><circle cx="402" cy="148" r="2.6" fill="var(--earth)"/><circle cx="411" cy="145" r="1" fill="#e8e2da" fill-opacity=".85"/></g>
<g ${frame}>${moonsBack}</g>
<g ${frame}>
  <circle r="${R + 40}" fill="url(#ma-halo)"/>
  <g clip-path="url(#ma-disc)">
    <circle r="${R}" fill="url(#ma-base)"/>
    <rect x="${-R}" y="${-R}" width="${R * 2}" height="${R * 2}" fill="url(#ma-grain)"/>
    ${PATCHES.filter(p => p[4] !== 'dust').map(patch).join('')}
    ${craters(5502)}
    ${volcano(40.5, 250.4, 7, false)}${volcano(18.65, 226.2, 6.2, true)}${volcano(11.8, 255.5, 2.4, false)}${volcano(1.5, 247, 2.4, false)}${volcano(-8.3, 239.9, 2.8, false)}${volcano(25, 147, 2.6, false)}
    ${valles()}
    ${PATCHES.filter(p => p[4] === 'dust').map(patch).join('')}
    ${clouds(5506)}
    ${polarCap()}
    <circle r="${R}" fill="url(#ma-haze)"/>
    <g opacity="var(--day)">${shade(L_DAY, 'ma-lam-d')}</g>
    <g opacity="var(--night)">${shade(L_NIGHT, 'ma-lam-n')}</g>
    <circle r="${R}" fill="url(#ma-limb)"/>
  </g>
  <g class="ma-atmo">
    <g opacity="var(--day)"><circle r="${R + 3}" fill="none" stroke="url(#ma-rim-d)" stroke-width="7" class="blur-2" opacity="var(--atmo-op)"/><circle r="${R + 1}" fill="none" stroke="url(#ma-rim-d)" stroke-width="1.6" stroke-opacity=".8"/></g>
    <g opacity="var(--night)"><circle r="${R + 3}" fill="none" stroke="url(#ma-rim-n)" stroke-width="7" class="blur-2" opacity="var(--atmo-op)"/><circle r="${R + 1}" fill="none" stroke="url(#ma-rim-n)" stroke-width="1.6" stroke-opacity=".8"/></g>
  </g>
  <g mask="url(#ma-front)">${MOONS.map(m => `<g>${moonBody(m.rx, m.ry, m.seed, m.crater)}${moonMotion(m)}</g>`).join('')}</g>
</g>
${grade([120, 200], '#ffe6d0', '#200a30', 0.55)}
`

const DEFS = `
${SPACE_DEFS}
<linearGradient id="ma-bg" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0" stop-color="var(--bg0)"/><stop offset=".35" stop-color="var(--bg1)"/><stop offset=".7" stop-color="var(--bg2)"/><stop offset="1" stop-color="var(--bg3)"/></linearGradient>
<radialGradient id="ma-glare"><stop offset="0" stop-color="var(--glare)" stop-opacity="var(--glare-op)"/><stop offset=".5" stop-color="var(--glare)" style="stop-opacity:calc(var(--glare-op) * .3)"/><stop offset="1" stop-color="var(--glare)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-earthglow"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".9"/><stop offset=".25" stop-color="#5aa0ff" stop-opacity=".35"/><stop offset="1" stop-color="#5aa0ff" stop-opacity="0"/></radialGradient>
<clipPath id="ma-disc"><circle r="${R}"/></clipPath>
<linearGradient id="ma-vf"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff"/><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="ma-vfade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#ma-vf)"/></mask>
<mask id="ma-front" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000">${front}</mask>
<radialGradient id="ma-base" cx=".42" cy=".4" r=".7"><stop offset="0" stop-color="var(--m0)"/><stop offset=".45" stop-color="var(--m1)"/><stop offset=".85" stop-color="var(--m2)"/><stop offset="1" stop-color="var(--m3)"/></radialGradient>
<pattern id="ma-grain" width="56" height="56" patternUnits="userSpaceOnUse">${(() => {
  const rand = seeded(5503)
  let d = ''
  for (let i = 0; i < 40; i++) d += `<circle cx="${Math.round(rand() * 56)}" cy="${Math.round(rand() * 56)}" r="${n(0.6 + rand() * 1.6)}" fill="${rand() < 0.5 ? '#2a0e04' : '#ffd8b0'}" fill-opacity="${n(0.03 + rand() * 0.06)}"/>`
  return d
})()}</pattern>
<radialGradient id="ma-dk"><stop offset="0" stop-color="var(--dk)" style="stop-opacity:var(--dk-op)"/><stop offset=".55" stop-color="var(--dk)" style="stop-opacity:calc(var(--dk-op) * .75)"/><stop offset="1" stop-color="var(--dk)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-lt"><stop offset="0" stop-color="var(--lt)" stop-opacity=".32"/><stop offset=".7" stop-color="var(--lt)" stop-opacity=".14"/><stop offset="1" stop-color="var(--lt)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-red"><stop offset="0" stop-color="var(--red)" stop-opacity=".5"/><stop offset="1" stop-color="var(--red)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-dust"><stop offset="0" stop-color="var(--dust)" stop-opacity=".75"/><stop offset=".6" stop-color="var(--dust)" stop-opacity=".35"/><stop offset="1" stop-color="var(--dust)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-cloud"><stop offset="0" stop-color="var(--cloud)" stop-opacity=".32"/><stop offset="1" stop-color="var(--cloud)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-aureole"><stop offset=".55" stop-color="#5a240e" stop-opacity=".25"/><stop offset="1" stop-color="#5a240e" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-dome" cx=".5" cy=".5" r=".5" fx=".34" fy=".32"><stop offset="0" stop-color="#ffd8b0" stop-opacity=".3"/><stop offset=".6" stop-color="#e09060" stop-opacity=".16"/><stop offset="1" stop-color="#e09060" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-vshade"><stop offset=".5" stop-color="#3a1406" stop-opacity=".22"/><stop offset="1" stop-color="#3a1406" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-trough"><stop offset="0" stop-color="var(--canyon)" stop-opacity=".45"/><stop offset="1" stop-color="var(--canyon)" stop-opacity="0"/></radialGradient>
<linearGradient id="ma-scarp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0c0" stop-opacity=".45"/><stop offset=".5" stop-color="#a0502a" stop-opacity="0"/><stop offset="1" stop-color="#2a0c02" stop-opacity=".6"/></linearGradient>
<radialGradient id="ma-caldera" cx=".5" cy=".5" r=".5" fx=".36" fy=".34"><stop offset="0" stop-color="#4a1c0a" stop-opacity=".7"/><stop offset=".75" stop-color="#7a3416" stop-opacity=".5"/><stop offset=".92" stop-color="#ffd0a8" stop-opacity=".45"/><stop offset="1" stop-color="#ffd0a8" stop-opacity="0"/></radialGradient>
<linearGradient id="ma-canyon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--wall-dark)" stop-opacity=".9"/><stop offset=".5" stop-color="var(--canyon)" stop-opacity=".85"/><stop offset="1" stop-color="var(--canyon)" stop-opacity=".6"/></linearGradient>
<radialGradient id="ma-crater" cx=".5" cy=".5" r=".5" fx=".36" fy=".34"><stop offset="0" stop-color="#3a1406" stop-opacity=".45"/><stop offset=".7" stop-color="#5a240e" stop-opacity=".3"/><stop offset=".88" stop-color="#ffd8b4" stop-opacity=".45"/><stop offset="1" stop-color="#ffd8b4" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-ice" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="var(--ice)"/><stop offset=".8" stop-color="var(--ice)" stop-opacity=".9"/><stop offset="1" stop-color="var(--frost)" stop-opacity=".5"/></radialGradient>
<radialGradient id="ma-haze" r=".5"><stop offset=".82" stop-color="var(--haze)" stop-opacity="0"/><stop offset="1" stop-color="var(--haze)" stop-opacity="var(--haze-op)"/></radialGradient>
<radialGradient id="ma-limb" r=".5"><stop offset=".7" stop-color="#1a0602" stop-opacity="0"/><stop offset="1" stop-color="#1a0602" stop-opacity=".35"/></radialGradient>
<radialGradient id="ma-halo" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${R + 40}"><stop offset="${n(R / (R + 40) - 0.01)}" stop-color="var(--atmo)" stop-opacity=".35"/><stop offset="1" stop-color="var(--atmo)" stop-opacity="0"/></radialGradient>
<radialGradient id="ma-moon" cx=".5" cy=".5" r=".6" fx=".3" fy=".3"><stop offset="0" stop-color="#c8b8a6"/><stop offset=".55" stop-color="#7a6a5c"/><stop offset="1" stop-color="#241c18"/></radialGradient>
${lambertGradient('ma-lam-d', 0, 0, R, L_DAY, '#120404', 0.75)}
${lambertGradient('ma-lam-n', 0, 0, R, L_NIGHT, '#120404', 0.9)}
${rimGradient('ma-rim-d', 0, 0, R, L_DAY, 'var(--atmo)', 0.15)}
${rimGradient('ma-rim-n', 0, 0, R, L_NIGHT, 'var(--atmo)', 0.05)}
`

export const SPACE_MARS: Look = {
  label: 'Mars',
  args: { colors: theme, backdrop: { scene: 'space-mars', glass: { blur: 26, opacity: 0.52 } } },
  problems,
  scene: svg(CSS + turnCSS(), DEFS, BODY),
}
