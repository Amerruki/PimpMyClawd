import { makeColors } from './make-colors.js'
import { grade, n, seeded, svg } from './kit'
import type { Look } from './look'
import {
  capD,
  D2R,
  dot,
  latMover,
  latPt,
  milkyWay,
  moonBack,
  moonBody,
  moonDefs,
  moonFront,
  proj,
  ringGradient,
  ringHalf,
  ringHalfDefs,
  ringShadowD,
  rimGlow,
  rimMask,
  screenToL,
  SPACE_CSS,
  SPACE_DEFS,
  sphereDefs,
  sphereShade,
  starfield,
  sunGlare,
  unit,
  unproj,
  type Orbit,
  type V3,
} from './space-outer-kit'

// Saturn, its rings open 24 degrees: the C, B and A rings from a measured
// brightness profile with the Cassini division, the Encke gap and the
// narrow F ring; the back half passes behind the globe and the front half
// across it. The globe throws its shadow across the rings behind it and the
// rings throw theirs across the globe, both computed from the sun's
// direction. A pale gold globe with soft drifting bands, a turning hexagon
// at the north pole and small storms carried round; spokes and glints turn
// with the rings. Titan, Rhea, Dione, Tethys, Enceladus and Mimas orbit in
// the ring plane at their true sizes. Day is sunlit haze with glare from
// the upper right; night is deep space.
const { theme, problems } = makeColors({
  label: 'Saturn',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#d8b45a', danger: '#d23a32', success: '#2f9a55', warning: '#c07f00', pro: '#9b6ad6' },
  light: {
    roles: { accent: '#a67c16' },
    gray: {
      anchors: {
        'surface-0': '#f0ede5',
        'surface-1': '#f5f3ec',
        'surface-2': '#fbfaf5',
        'text-primary': '#221d12',
        'text-secondary': '#463f2e',
        'text-muted': '#625a47',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0a0b',
        'surface-1': '#121113',
        'surface-2': '#18171a',
        'surface-3': '#1e1c1f',
        'text-primary': '#f4efe2',
        'text-secondary': '#d3cbb8',
        'text-muted': '#aca38f',
      },
    },
  },
})

const CX = 450
const CY = 430
const R = 180
const ROLL = -15
const B = 24
const OBL = 0.902
const KY = Math.sqrt(OBL * OBL * Math.cos(B * D2R) ** 2 + Math.sin(B * D2R) ** 2)
const SUN = screenToL([0.75, 0.2, 0.5], ROLL)
const SUN_P = unit(unproj(SUN, B))
const VIEW_P = unproj([0, 0, 1], B)
const rand = seeded(5690)

// ---- Rings -----------------------------------------------------------------

// Radii in Saturn radii. D 1.11-1.236, C 1.239-1.527, B 1.527-1.951,
// Cassini division 1.951-2.025, A 2.025-2.267 with the Encke gap at 2.214,
// F ring 2.326.
const RM = 2.34 * R
const ringNoise = seeded(77)
const wig = Array.from({ length: 40 }, () => ringNoise())
const ringProf = (rho: number): readonly [string, number] => {
  const x = rho / R
  const w = (f: number) => (wig[Math.floor(x * f) % 40] as number) - 0.5
  if (x < 1.237) return ['#8c7f70', 0.05]
  if (x < 1.527) return ['#a39072', 0.2 + (x - 1.24) * 0.35 + w(90) * 0.1]
  if (x < 1.64) return ['#dcc49a', 0.6 + (x - 1.527) * 1.4 + w(140) * 0.12]
  if (x < 1.951) return ['#efdcb2', 0.93 + w(160) * 0.1]
  if (x < 2.025) return ['#6c6052', 0.08]
  return ['#d8c39c', 0.74 - (x - 2.025) * 0.7 + w(180) * 0.08]
}
// The ring regions as annuli, so every gap has a crisp vector edge.
const REGIONS: readonly [number, number][] = [
  [1.11, 1.236],
  [1.239, 1.447],
  [1.457, 1.527],
  [1.527, 1.951],
  [1.951, 2.025],
  [2.025, 2.2075],
  [2.2215, 2.267],
]
const annuli = (paint: string) =>
  REGIONS.map(([a, b]) => `<circle r="${n(((a + b) / 2) * R)}" stroke-width="${n((b - a) * R)}"/>`).join('').replace(/<circle /g, `<circle fill="none" stroke="${paint}" `) +
  `<circle r="${n(1.962 * R)}" fill="none" stroke="${paint === 'url(#sr-g)' ? '#cbb994' : '#fff'}" stroke-opacity=".35" stroke-width="1.4"/>` +
  `<circle r="${n(2.326 * R)}" fill="none" stroke="${paint === 'url(#sr-g)' ? '#e6dac4' : '#fff'}" stroke-opacity=".5" stroke-width="1.3"/>`

// Glints turning with the B and A rings.
const glints = Array.from({ length: 34 }, () => {
  const rr = (1.55 + rand() * 0.7) * R
  const a = rand() * Math.PI * 2

  return `<circle class="tw" cx="${n(rr * Math.cos(a))}" cy="${n(rr * Math.sin(a))}" r="${n(1 + rand() * 1.4)}" fill="#fffaf0" style="--tw:0;animation-duration:${n(1.5 + rand() * 3)}s;animation-delay:-${n(rand() * 4)}s"/>`
}).join('')

const rs = ringShadowD(R, SUN_P)
const ringBody = (half: 'b' | 'f') =>
  ringHalf(
    'sr',
    B,
    half,
    annuli('url(#sr-g)') +
      `<g mask="url(#sr-m)"><g><g style="opacity:var(--glint-op)">${glints}</g>` +
      `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="260s" repeatCount="indefinite"/></g></g>` +
      `<g mask="url(#sr-m)"><path transform="rotate(${n(rs.rot)})" d="${rs.d}" fill="#05050a" style="fill-opacity:var(--rs-op)"/></g>`,
  )

// The rings' shadow on the globe: each ring edge cast along the sunlight
// onto the sphere, kept where it lands on the face we see.
function castOnGlobe(rho0: number, rho1: number): string {
  const hits = (rho: number) =>
    Array.from({ length: 240 }, (_, i) => {
      const th = (i / 240) * Math.PI * 2
      const P: V3 = [rho * R * Math.cos(th), 0, rho * R * Math.sin(th)]
      const ps = dot(P, SUN_P)
      const disc = ps * ps - (dot(P, P) - R * R)
      if (disc < 0) return null
      const t = ps - Math.sqrt(disc)
      if (t <= 0) return null
      const Q: V3 = [P[0] - t * SUN_P[0], P[1] - t * SUN_P[1], P[2] - t * SUN_P[2]]
      if (dot(Q, VIEW_P) < 0) return null

      return proj(Q, B)
    })
  const a = hits(rho0)
  const b = hits(rho1)
  const ok = a.map((p, i) => p !== null && b[i] !== null)
  const start = ok.findIndex((v, i) => v && !ok[(i + 239) % 240])
  if (start < 0) return ''
  const idx: number[] = []
  for (let k = 0; k < 240; k++) {
    const i = (start + k) % 240
    if (!ok[i]) break
    idx.push(i)
  }
  const pa = idx.map(i => a[i] as V3)
  const pb = idx.map(i => b[i] as V3).reverse()

  return `M${[...pa, ...pb].map(p => `${n(p[0])} ${n(p[1])}`).join('L')}Z`
}
const RING_SHADOW =
  `<path d="${castOnGlobe(1.239, 1.527)}" fill="#141008" fill-opacity=".3"/>` +
  `<path d="${castOnGlobe(1.527, 1.951)}" fill="#0a0806" fill-opacity=".72"/>` +
  `<path d="${castOnGlobe(2.025, 2.267)}" fill="#0a0806" fill-opacity=".55"/>`

// ---- Globe -----------------------------------------------------------------

// Latitude boundaries south to north, the colour north of each, and whether
// the boundary ripples and drifts.
const BANDS: readonly [number, string, number][] = [
  [-62, '#d3c094', 0],
  [-42, '#dcc99d', 0.5],
  [-27, '#d1b884', 0.7],
  [-15, '#e4d2a6', 0.8],
  [-6, '#f1e3bb', 0],
  [6, '#e9d7aa', 0.9],
  [13, '#d6bb85', 0.8],
  [21, '#e6d3a5', 0.7],
  [31, '#d2ba8b', 0.6],
  [42, '#ddcca4', 0.5],
  [55, '#c9bb96', 0],
  [64, '#b9b298', 0],
]

function boundary(lat: number, amp: number, i: number): string {
  if (!amp) return capD(R, B, lat, () => 0, 0, 36)
  const k = 5 + (i % 4) * 2
  const ph = rand() * 6.28
  const wob = (lon: number) => amp * Math.sin(k * lon * D2R + ph) + amp * 0.4 * Math.sin((k * 2 + 1) * lon * D2R)
  const lam = 360 / k
  const frames = [0, 0.25, 0.5, 0.75].map(f => capD(R, B, lat, wob, -f * lam, 36))

  return `<animate attributeName="d" values="${[...frames, frames[0]].join(';')}" dur="${70 + i * 9}s" repeatCount="indefinite"/>`
}

const bandPaths = BANDS.map(([lat, col, amp], i) => {
  const d0 = capD(R, B, lat, amp ? (lon: number) => 0 * lon : () => 0, 0, 36)
  if (!amp) return `<path d="${d0}" fill="${col}"/>`
  const anim = boundary(lat, amp, i)
  const first = /values="([^;]+);/.exec(anim)?.[1] ?? d0

  return `<path d="${first}" fill="${col}">${anim}</path>`
}).join('')

// The hexagon: a six-sided jet at 76.5 degrees north, its sides straight in
// a polar view, turning with the planet. Frames cover 60 degrees, after
// which it looks the same.
function hexD(rot: number, colat: number): string {
  const pts: V3[] = []
  for (let k = 0; k < 6; k++) {
    const a0 = (rot + k * 60) * D2R
    const a1 = (rot + (k + 1) * 60) * D2R
    for (let j = 0; j < 4; j++) {
      const t = j / 4
      const x = (1 - t) * Math.cos(a0) + t * Math.cos(a1)
      const y = (1 - t) * Math.sin(a0) + t * Math.sin(a1)
      const d = Math.hypot(x, y) * colat
      pts.push(latPt(R, B, 90 - d, Math.atan2(y, x) / D2R))
    }
  }

  return `M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join('L')}Z`
}
const hexFrames = (colat: number) => Array.from({ length: 7 }, (_, i) => hexD(i * 10, colat)).join(';')
const HEX =
  `<path fill="#a9a48d" fill-opacity=".55" stroke="#8d8670" stroke-opacity=".5" stroke-width="2"><animate attributeName="d" values="${hexFrames(13.5)}" dur="80s" repeatCount="indefinite"/></path>` +
  `<path fill="#c4bc9c" fill-opacity=".35"><animate attributeName="d" values="${hexFrames(9)}" dur="80s" repeatCount="indefinite"/></path>` +
  `<ellipse cx="${n(latPt(R, B, 90, 0)[0])}" cy="${n(latPt(R, B, 90, 0)[1])}" rx="11" ry="${n(11 * Math.sin(B * D2R))}" fill="#7f7b6a" fill-opacity=".6"/>`

// Small storms carried round on their latitudes.
const storm = (lat: number, dur: number, delay: number, rx: number, ry: number, fill: string) =>
  latMover(R, B, lat, dur, delay, `<ellipse rx="${rx}" ry="${ry}" fill="${fill}"/>`)

const GLOBE =
  `<g transform="scale(1 ${n(KY / 1)})"><g clip-path="url(#sd)">` +
  `<circle r="${R}" fill="#c8b38a"/>` +
  bandPaths +
  `<g style="filter:blur(1.5px)">${HEX}</g>` +
  storm(38, 120, 20, 9, 3.5, '#f6ecd4') +
  storm(-33, 150, 90, 7, 3, '#efe3c6') +
  storm(47, 140, 60, 6, 2.5, '#efe5cc') +
  RING_SHADOW +
  `</g><g clip-path="url(#sd2)">${sphereShade('s', R, SUN, '#030306', 0.05)}</g>` +
  rimGlow('s', R, '#fff4d6', 6, 0.6) +
  `</g>`

// ---- Moons -----------------------------------------------------------------

const sinB = Math.sin(B * D2R)
const MOONS: [string, Orbit, string][] = [
  ['m-mi', { A: 2.6 * R, b: 2.6 * R * sinB, P: 28, phase: 0.2 }, moonBody('m-mi', 1.4, SUN, '#cfcac2', '')],
  ['m-en', { A: 2.95 * R, b: 2.95 * R * sinB, P: 41, phase: 0.55 }, moonBody('m-en', 1.6, SUN, '#ffffff', '')],
  ['m-te', { A: 3.35 * R, b: 3.35 * R * sinB, P: 57, phase: 0.85 }, moonBody('m-te', 2.2, SUN, '#e6e2da', '')],
  ['m-di', { A: 3.9 * R, b: 3.9 * R * sinB, P: 82, phase: 0.35 }, moonBody('m-di', 2.4, SUN, '#d8d3ca', '')],
  ['m-rh', { A: 4.6 * R, b: 4.6 * R * sinB, P: 136, phase: 0.05 }, moonBody('m-rh', 3, SUN, '#cdc7bd', '')],
  [
    'm-ti',
    { A: 6.3 * R, b: 6.3 * R * sinB, P: 480, phase: 0.62 },
    moonBody('m-ti', 7.8, SUN, '#d79a45', `<ellipse cx="0" cy="-5" rx="9" ry="3" fill="#b9793a" fill-opacity=".6"/><circle r="7.8" fill="none" stroke="#f0c27a" stroke-width="1.4" stroke-opacity=".6"/>`),
  ],
]
const moonUse = (id: string) => `<circle r="5" fill="url(#m-glow)"/><use href="#${id}"/>`
const backMoons = MOONS.map(([id, o]) => moonBack(o, moonUse(id))).join('')
const frontMoons = MOONS.map(([id, o]) => moonFront(o, moonUse(id))).join('')

// ---- Scene -----------------------------------------------------------------

const CSS = `
${SPACE_CSS}
@media (max-aspect-ratio: 3/4) { .sys { transform: translateX(350px); } }
:root, svg {
  --bg0:#fff7e6; --bg1:#d9dfe9; --bg2:#aebdd3; --star-op:.16; --neb-op:.7; --dust-op:0; --glare-op:1; --night-op:.7; --rim-op:.5; --veil-op:.2; --glint-op:.5; --rs-op:.45;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#0d0d17; --bg1:#05060c; --bg2:#010205; --star-op:1; --neb-op:1; --glare-op:0; --night-op:1; --rim-op:1; --veil-op:0; --glint-op:1; --rs-op:.92;
  }
}
`

const defs =
  SPACE_DEFS +
  `<linearGradient id="bg" x1="1" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg0)"/><stop offset=".45" style="stop-color:var(--bg1)"/><stop offset="1" style="stop-color:var(--bg2)"/></linearGradient>` +
  `<radialGradient id="veil" gradientUnits="userSpaceOnUse" cx="1600" cy="0" r="1900"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#f3f1ec" stop-opacity=".5"/><stop offset="1" stop-color="#e9edf3" stop-opacity=".2"/></radialGradient>` +
  `<radialGradient id="m-glow"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="sde"><ellipse rx="${R}" ry="${n(R * KY)}"/></clipPath><clipPath id="sd"><circle r="${R}"/></clipPath><clipPath id="sd2"><circle r="${R + 1.5}"/></clipPath>` +
  sphereDefs('s', R, SUN, 0.5, 0.12) +
  rimMask('s', R, 6) +
  moonDefs(SUN) +
  ringGradient('sr-g', RM, ringProf, [], 160) +
  ringGradient('sr-w', RM, rho => ['#fff', Math.min(1, ringProf(rho)[1] * 1.6)], [], 80, true) +
  `<mask id="sr-m" maskUnits="userSpaceOnUse" x="-${n(RM)}" y="-${n(RM)}" width="${n(RM * 2)}" height="${n(RM * 2)}">${annuli('url(#sr-w)')}</mask>` +
  ringHalfDefs('sr', RM) +
  `<g id="sm">${MOONS.map(m => m[2]).join('')}</g>`

const body =
  `<rect width="1600" height="1000" fill="url(#bg)"/>` +
  milkyWay(91, 300, -80, 1650, 900, 280) +
  starfield(5602, 560, 130, 12) +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:var(--veil-op)"/>` +
  sunGlare(1640, -60, 1) +
  `<g class="sys"><g transform="translate(${CX} ${CY}) rotate(${ROLL})">` +
  backMoons +
  ringBody('b') +
  GLOBE +
  `<g clip-path="url(#sde)">${ringBody('f')}</g>` +
  frontMoons +
  `</g></g>` +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:calc(var(--veil-op) * .6)"/>` +
  grade([1480, 80], '#fff2d8', '#0a1a3a', 0.8)

const SCENE = svg(CSS, defs, body)

export const SPACE_SATURN: Look = {
  label: 'Saturn',
  args: { colors: theme, backdrop: { scene: 'space-saturn', glass: { blur: 26, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
