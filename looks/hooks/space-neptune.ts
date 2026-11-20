import { makeColors } from './make-colors.js'
import { grade, n, seeded, svg } from './kit'
import type { Look } from './look'
import {
  capD,
  D2R,
  latMover,
  milkyWay,
  moonBack,
  moonBody,
  moonDefs,
  moonFront,
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
  unproj,
  type Orbit,
} from './space-outer-kit'

// Neptune: a deep azure globe lit from the side by a Sun so far away it is
// only a brilliant star in the upper right. A dark storm spot with bright
// companion clouds drifts at 22 degrees south; white methane cirrus streaks
// race round faster on their own latitudes, slowing and narrowing at the
// limb. Faint dusty rings (Galle, Le Verrier, Lassell, Arago, Adams) with
// the Adams ring's bright arcs turning. Triton, large and pinkish, on its
// steeply inclined retrograde orbit, and little Proteus in the ring plane.
// Day is pale sunlit haze with the Sun's glare in its corner; night is the
// deep, cold dark of the outer system.
const { theme, problems } = makeColors({
  label: 'Neptune',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#3f6fe8', danger: '#d23a32', success: '#2f9a55', warning: '#b98100', pro: '#9a62d8' },
  light: {
    roles: { accent: '#2851c4' },
    gray: {
      anchors: {
        'surface-0': '#eaedf4',
        'surface-1': '#f1f3f8',
        'surface-2': '#f8f9fc',
        'text-primary': '#141a2a',
        'text-secondary': '#323c55',
        'text-muted': '#4a5572',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07090f',
        'surface-1': '#0e1119',
        'surface-2': '#131722',
        'surface-3': '#181d2a',
        'text-primary': '#e8edfa',
        'text-secondary': '#c1c9de',
        'text-muted': '#98a2bc',
      },
    },
  },
})

const CX = 420
const CY = 470
const R = 190
const ROLL = 12
const B = 20
const SUN_XY: readonly [number, number] = [1440, 150]
const SUN = screenToL([0.95, 0.3, -0.06], ROLL)
const SUN_P = unproj(SUN, B)
const rand = seeded(8946)

// ---- Globe -----------------------------------------------------------------

const BANDS: readonly [number, string][] = [
  [-75, '#2c4fae'],
  [-62, '#2848a6'],
  [-52, '#3a66d0'],
  [-36, '#3463cf'],
  [-12, '#2f5cc8'],
  [12, '#3564cc'],
  [30, '#3d6dd6'],
  [48, '#3460c6'],
  [65, '#2c52b2'],
]

const cirrus = (rx: number, ry: number) => `<ellipse rx="${rx}" ry="${ry}" fill="url(#n-cirrus)"/>`
const STREAKS = [
  [27, 46, 5, cirrus(34, 3.2)],
  [24, 46, 28, cirrus(22, 2.4)],
  [31, 52, 15, cirrus(18, 2)],
  [-40, 38, 9, cirrus(26, 3)],
  [-43, 38, 27, cirrus(12, 3.5)],
  [-55, 64, 40, cirrus(30, 2.6)],
  [-30, 58, 3, cirrus(16, 2)],
  [40, 60, 33, cirrus(20, 2)],
  [22, 44, 36, cirrus(40, 3.6)],
  [-24, 70, 50, cirrus(24, 2.6)],
  [-48, 42, 20, cirrus(36, 3)],
  [14, 56, 12, cirrus(14, 2)],
] as const

// The dark spot: an anticyclone, darker blue with a lighter rim, bright
// orographic cirrus hugging its southern edge.
const SPOT =
  `<ellipse rx="40" ry="17" fill="#1a2f78" fill-opacity=".85"/>` +
  `<ellipse rx="40" ry="17" fill="none" stroke="#5a86e0" stroke-opacity=".35" stroke-width="3"/>` +
  `<ellipse cx="-4" cy="-1" rx="26" ry="10" fill="#142560" fill-opacity=".7"/>` +
  `<ellipse cx="6" cy="17" rx="30" ry="4" fill="url(#n-cirrus)"/>` +
  `<ellipse cx="-30" cy="12" rx="14" ry="3" fill="url(#n-cirrus)"/>`

const GLOBE =
  `<g clip-path="url(#nd)">` +
  `<circle r="${R}" fill="#2a4cab"/>` +
  `<g style="filter:blur(5px)">${BANDS.map(([lat, col]) => `<path d="${capD(R, B, lat, () => 0, 0, 36)}" fill="${col}"/>`).join('')}</g>` +
  latMover(R, B, -22, 95, 30, SPOT) +
  STREAKS.map(([lat, dur, delay, c]) => latMover(R, B, lat, dur, delay, c)).join('') +
  `<circle r="${R}" fill="url(#n-haze)"/>` +
  `</g><g clip-path="url(#nd2)">${sphereShade('n', R, SUN, '#01030a', 0.1)}</g>` +
  rimGlow('n', R, '#9fc2ff', 8, 0.8)

// ---- Rings -----------------------------------------------------------------

// Radii in Neptune radii (24,764 km): Galle 1.69 (broad, faint), Le Verrier
// 2.15, the Lassell sheet to 2.31, Arago 2.31, Adams 2.54 with its arcs.
const RM = 2.6 * R
const ringShapes = (white: boolean) => {
  const c = (r: number, w: number, o: number) =>
    `<circle r="${n(r * R)}" fill="none" ${white ? 'stroke="#fff"' : `class="nrr"`} stroke-width="${n(w)}" stroke-opacity="${n(o)}"/>`

  return (
    c(1.69, 0.08 * R, 0.045) +
    c(2.15, 1.3, 0.3) +
    c(2.23, 0.16 * R, 0.03) +
    c(2.31, 1, 0.14) +
    c(2.54, 1.2, 0.32)
  )
}
// The Adams arcs, Fraternité the longest, turning with the ring.
const ARCS = [
  [0, 10, 0.95],
  [13, 4, 0.75],
  [18.5, 4, 0.8],
  [25, 4, 0.6],
  [31, 1.5, 0.5],
]
  .map(([a0, len, o]) => {
    const r = 2.54 * R
    const p = (a: number) => `${n(r * Math.cos(a * D2R))} ${n(r * Math.sin(a * D2R))}`

    return `<path d="M${p(a0 as number)}A${n(r)} ${n(r)} 0 0 1 ${p((a0 as number) + (len as number))}" fill="none" class="nra" stroke-opacity="${o}" stroke-width="3" stroke-linecap="round"/>`
  })
  .join('')
const rs = ringShadowD(R, SUN_P)
const ringBody = (half: 'b' | 'f') =>
  ringHalf(
    'nr',
    B,
    half,
    `<g style="opacity:var(--ring-op)">${ringShapes(false)}<g>${ARCS}<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="150s" repeatCount="indefinite"/></g></g>` +
      `<g mask="url(#nr-m)"><path transform="rotate(${n(rs.rot)})" d="${rs.d}" fill="#020309" fill-opacity=".9"/></g>`,
  )

// ---- Moons -----------------------------------------------------------------

const TRITON: Orbit = { A: 3.9 * R, b: 3.9 * R * Math.sin(34 * D2R), P: 120, phase: 0.18, retro: true }
const PROTEUS: Orbit = { A: 2.9 * R, b: 2.9 * R * Math.sin(B * D2R), P: 22, phase: 0.6 }
const T_SUN = screenToL([0.95, 0.3, -0.06], ROLL + 26)
const MOON_DEFS =
  moonBody(
    'm-tr',
    10.4,
    T_SUN,
    '#e2d2c7',
    `<ellipse cx="-1" cy="5.5" rx="10" ry="5" fill="#d6ad97" fill-opacity=".85"/><path d="M-8 4q4 -2 8 -1M-4 7q3 -1 6 0" stroke="#7e5a4a" stroke-width=".6" stroke-opacity=".7" fill="none"/>` +
      `<ellipse cx="2" cy="-3" rx="6" ry="3.5" fill="#c9bdb7" fill-opacity=".6"/><circle cx="-4" cy="-5" r="1.4" fill="#9fb4c8" fill-opacity=".5"/>`,
  ) + moonBody('m-pr', 1.7, SUN, '#77706a', '')
const glow = `<circle r="7" fill="url(#m-glow)"/>`

// ---- The distant Sun -------------------------------------------------------

// At 30 AU the Sun is a point a thousand times fainter than from Earth,
// still the brightest thing in the sky: a hot white core, a tight halo and
// thin diffraction spikes that breathe slowly.
const [SX, SY] = SUN_XY
const spikes = (len: number, w: number, a: number) =>
  `<path d="M${-len} 0L0 ${-w}L${len} 0L0 ${w}Z" fill="url(#n-spike)" transform="rotate(${a})"/>`
const DISTANT_SUN =
  `<g transform="translate(${SX} ${SY})">` +
  `<circle r="70" fill="url(#n-sunhalo)"/>` +
  `<g class="breathe">${spikes(120, 1.1, 0)}${spikes(120, 1.1, 90)}${spikes(55, 0.7, 45)}${spikes(55, 0.7, 135)}</g>` +
  `<circle r="9" fill="#fff" fill-opacity=".35"/><circle r="3.6" fill="#fffef8"/></g>`

// ---- Scene -----------------------------------------------------------------

const CSS = `
${SPACE_CSS}
@media (max-aspect-ratio: 3/4) { .sys { transform: translateX(380px); } }
:root, svg {
  --bg0:#fdf8ec; --bg1:#dde3ef; --bg2:#aebbd6; --star-op:.14; --neb-op:.6; --dust-op:0; --glare-op:.9; --night-op:.58; --rim-op:.6; --veil-op:.18; --ring-op:1; --halo-op:.3; --ring-c:#4a5778; --arc-c:#2f3a5c;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#080b16; --bg1:#03050b; --bg2:#010206; --star-op:1; --neb-op:.6; --dust-op:.7; --glare-op:0; --night-op:1; --rim-op:1; --veil-op:0; --ring-op:1; --halo-op:.6; --ring-c:#c3c0d0; --arc-c:#ece8f6;
  }
}
.nrr { stroke: var(--ring-c); } .nra { stroke: var(--arc-c); }
.breathe { transform-box: fill-box; transform-origin: center; animation: breathe 9s ease-in-out infinite alternate; }
@keyframes breathe { from { transform: scale(.85) rotate(-2deg); opacity: .75; } to { transform: scale(1.08) rotate(2deg); opacity: 1; } }
`

const defs =
  SPACE_DEFS +
  `<linearGradient id="bg" x1="1" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg0)"/><stop offset=".5" style="stop-color:var(--bg1)"/><stop offset="1" style="stop-color:var(--bg2)"/></linearGradient>` +
  `<radialGradient id="veil" gradientUnits="userSpaceOnUse" cx="${SX}" cy="${SY}" r="1900"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#f1f3f6" stop-opacity=".5"/><stop offset="1" stop-color="#e6ebf4" stop-opacity=".2"/></radialGradient>` +
  `<radialGradient id="m-glow"><stop offset="0" stop-color="#eef2ff" stop-opacity=".35"/><stop offset="1" stop-color="#eef2ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="n-cirrus"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#e8f0ff" stop-opacity=".55"/><stop offset="1" stop-color="#e8f0ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="n-haze" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#7fa6ff" stop-opacity="0"/><stop offset="1" stop-color="#9dbaff" stop-opacity=".28"/></radialGradient>` +
  `<radialGradient id="n-halo"><stop offset=".48" stop-color="#4f7dff" stop-opacity=".25"/><stop offset=".6" stop-color="#4f7dff" stop-opacity=".07"/><stop offset="1" stop-color="#4f7dff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="n-sunhalo"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".12" stop-color="#fff6e0" stop-opacity=".45"/><stop offset=".4" stop-color="#ffe9c0" stop-opacity=".1"/><stop offset="1" stop-color="#ffe9c0" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="n-spike" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<clipPath id="nd"><circle r="${R}"/></clipPath><clipPath id="nd2"><circle r="${R + 1.5}"/></clipPath>` +
  sphereDefs('n', R, SUN, 0.65, 0.1) +
  rimMask('n', R, 8) +
  moonDefs(SUN) +
  `<mask id="nr-m" maskUnits="userSpaceOnUse" x="-${n(RM)}" y="-${n(RM)}" width="${n(RM * 2)}" height="${n(RM * 2)}">${ringShapes(true)}</mask>` +
  ringHalfDefs('nr', RM) +
  `<g id="nm">${MOON_DEFS}</g>`

const tritonFrame = (inner: string) => `<g transform="rotate(26)">${inner}</g>`

const body =
  `<rect width="1600" height="1000" fill="url(#bg)"/>` +
  milkyWay(rand() * 100, 700, -80, 1700, 760, 250) +
  starfield(9421, 600, 140, 12) +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:var(--veil-op)"/>` +
  sunGlare(SX, SY, 0.8) +
  DISTANT_SUN +
  `<g class="sys"><g transform="translate(${CX} ${CY}) rotate(${ROLL})">` +
  `<circle r="${n(R * 2.2)}" fill="url(#n-halo)" style="opacity:var(--halo-op)"/>` +
  tritonFrame(moonBack(TRITON, `${glow}<use href="#m-tr"/>`)) +
  moonBack(PROTEUS, `${glow}<use href="#m-pr"/>`) +
  ringBody('b') +
  GLOBE +
  `<g clip-path="url(#nd)">${ringBody('f')}</g>` +
  moonFront(PROTEUS, `${glow}<use href="#m-pr"/>`) +
  tritonFrame(moonFront(TRITON, `${glow}<use href="#m-tr"/>`)) +
  `</g></g>` +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:calc(var(--veil-op) * .6)"/>` +
  grade([SX, SY], '#fff4dc', '#020a2a', 0.8)

const SCENE = svg(CSS, defs, body)

export const SPACE_NEPTUNE: Look = {
  label: 'Neptune',
  args: { colors: theme, backdrop: { scene: 'space-neptune', glass: { blur: 26, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
