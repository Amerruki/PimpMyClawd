import { makeColors } from './make-colors.js'
import { grade, n, svg } from './kit'
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

// Uranus, tipped on its side: a pale cyan globe, almost featureless, its
// sunlit pole a brighter haze cap, the faintest banding and one slow bright
// cloud. The narrow dark rings stand nearly upright around it (6, 5, 4,
// alpha, beta, eta, gamma, delta, lambda and the brighter epsilon), with the
// dusty nu and mu rings beyond, and the globe's shadow falls across them.
// Miranda, Ariel, Umbriel, Titania and Oberon at their true sizes trace
// tall ellipses in the ring plane. A quiet, open composition. Day is pale
// sunlit haze with glare from the upper left; night is deep blue-black.
const { theme, problems } = makeColors({
  label: 'Uranus',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#3cc6d6', danger: '#d23a32', success: '#2f9a55', warning: '#b98100', pro: '#8a6ad6' },
  light: {
    roles: { accent: '#11899a' },
    gray: {
      anchors: {
        'surface-0': '#eaf0f1',
        'surface-1': '#f1f5f6',
        'surface-2': '#f8fbfb',
        'text-primary': '#14211f',
        'text-secondary': '#33464a',
        'text-muted': '#4b6064',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#080b0d',
        'surface-1': '#0f1416',
        'surface-2': '#151b1e',
        'surface-3': '#1a2124',
        'text-primary': '#e9f4f5',
        'text-secondary': '#c3d5d8',
        'text-muted': '#9ab1b5',
      },
    },
  },
})

const CX = 1190
const CY = 430
const R = 128
const ROLL = -82
const B = 17
const SUN = screenToL([-0.6, 0.38, 0.7], ROLL)
const SUN_P = unproj(SUN, B)

// ---- Globe -----------------------------------------------------------------

const BANDS: readonly [number, string][] = [
  [-50, '#b2e0e6'],
  [-20, '#b8e4e9'],
  [10, '#b3e1e7'],
  [32, '#addbe2'],
  [48, '#bfe8ec'],
  [60, '#d2f1f1'],
  [72, '#dcf5f3'],
]
const GLOBE =
  `<g clip-path="url(#ud)">` +
  `<circle r="${R}" fill="#a9d9e0"/>` +
  `<g style="filter:blur(4px)">${BANDS.map(([lat, col]) => `<path d="${capD(R, B, lat, () => 0, 0, 36)}" fill="${col}"/>`).join('')}</g>` +
  latMover(R, B, 28, 160, 40, `<ellipse rx="9" ry="3" fill="url(#u-cloud)"/>`) +
  latMover(R, B, -18, 210, 150, `<ellipse rx="6" ry="2" fill="url(#u-cloud)"/>`) +
  `</g><g clip-path="url(#ud2)">${sphereShade('u', R, SUN, '#02060a', 0.05)}</g>` +
  rimGlow('u', R, '#dffcff', 7, 0.75)

// ---- Rings -----------------------------------------------------------------

// Radii in Uranus radii (25,559 km). Narrow, dark, the epsilon ring the
// brightest; the dusty nu (reddish) and mu (blue) rings far out and faint.
const NARROW: readonly [number, number, number][] = [
  [1.637, 0.8, 0.35],
  [1.652, 0.8, 0.35],
  [1.666, 0.8, 0.35],
  [1.75, 1.2, 0.45],
  [1.786, 1.2, 0.45],
  [1.846, 0.8, 0.35],
  [1.863, 1, 0.42],
  [1.901, 1, 0.45],
  [1.957, 0.6, 0.25],
  [2.002, 2.4, 0.75],
]
const RM = 4 * R
const ringShapes = (white: boolean) =>
  NARROW.map(([r, w, o]) => `<circle r="${n(r * R)}" fill="none" ${white ? 'stroke="#fff"' : 'class="urr"'} stroke-width="${w}" stroke-opacity="${white ? n(o) : n(o * 0.75)}"/>`).join('') +
  `<circle r="${n(2.67 * R)}" fill="none" stroke="${white ? '#fff' : '#c9a7a0'}" stroke-width="${n(0.14 * R)}" stroke-opacity="${white ? 0.6 : 0.06}"/>` +
  `<circle r="${n(3.68 * R)}" fill="none" stroke="${white ? '#fff' : '#8fb6ff'}" stroke-width="${n(0.55 * R)}" stroke-opacity="${white ? 0.6 : 0.045}"/>`
const rs = ringShadowD(R, SUN_P)
const ringBody = (half: 'b' | 'f') =>
  ringHalf(
    'ur',
    B,
    half,
    `<g style="opacity:var(--ring-op)">${ringShapes(false)}</g>` +
      `<g mask="url(#ur-m)"><path transform="rotate(${n(rs.rot)})" d="${rs.d}" fill="#020406" fill-opacity=".9"/></g>`,
  )

// ---- Moons -----------------------------------------------------------------

const sinB = Math.sin(B * D2R)
const orbit = (A: number, P: number, phase: number): Orbit => ({ A: A * R, b: A * R * sinB, P, phase })
const MOONS: [string, Orbit, string][] = [
  ['m-mi', orbit(2.6, 28, 0.3), moonBody('m-mi', 1.3, SUN, '#b9b6b2', '')],
  ['m-ar', orbit(3.2, 50, 0.72), moonBody('m-ar', 2.8, SUN, '#c9c6c1', '<circle cx="1" cy="-.5" r="1" fill="#e9e6e1"/>')],
  ['m-um', orbit(3.9, 83, 0.12), moonBody('m-um', 2.9, SUN, '#6f6c69', '<circle cx="-.5" cy="1" r=".8" fill="#bdb8b0"/>')],
  ['m-ti', orbit(5, 174, 0.55), moonBody('m-ti', 3.9, SUN, '#b8afa6', '<circle cx="1" cy="1" r="1.4" fill="#8f877f"/>')],
  ['m-ob', orbit(6, 269, 0.9), moonBody('m-ob', 3.7, SUN, '#a69c95', '<circle cx="-1" cy="0" r="1.3" fill="#7c726b"/>')],
]
const moonUse = (id: string) => `<circle r="6" fill="url(#m-glow)"/><use href="#${id}"/>`
const backMoons = MOONS.map(([id, o]) => moonBack(o, moonUse(id))).join('')
const frontMoons = MOONS.map(([id, o]) => moonFront(o, moonUse(id))).join('')

// ---- Scene -----------------------------------------------------------------

const CSS = `
${SPACE_CSS}
@media (max-aspect-ratio: 3/4) { .sys { transform: translateX(-390px); } }
:root, svg {
  --bg0:#fdf8ee; --bg1:#dfe8ee; --bg2:#b4c7d6; --star-op:.14; --neb-op:.6; --dust-op:0; --glare-op:1; --night-op:.66; --rim-op:.6; --veil-op:.18; --ring-op:.9; --halo-op:.25; --ring-c:#4f6873;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#0a1018; --bg1:#04070c; --bg2:#010306; --star-op:.85; --neb-op:.7; --dust-op:1; --glare-op:0; --night-op:1; --rim-op:1; --veil-op:0; --ring-op:1; --halo-op:.5; --ring-c:#bfd0d5;
  }
}
.urr { stroke: var(--ring-c); }
`

const defs =
  SPACE_DEFS +
  `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--bg0)"/><stop offset=".5" style="stop-color:var(--bg1)"/><stop offset="1" style="stop-color:var(--bg2)"/></linearGradient>` +
  `<radialGradient id="veil" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1900"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#f1f4f4" stop-opacity=".5"/><stop offset="1" stop-color="#e6eef2" stop-opacity=".2"/></radialGradient>` +
  `<radialGradient id="m-glow"><stop offset="0" stop-color="#e8fbff" stop-opacity=".4"/><stop offset="1" stop-color="#e8fbff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="u-cloud"><stop offset="0" stop-color="#f4fffe" stop-opacity=".8"/><stop offset="1" stop-color="#f4fffe" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="u-halo"><stop offset=".45" stop-color="#7fe0ec" stop-opacity=".22"/><stop offset=".62" stop-color="#7fe0ec" stop-opacity=".06"/><stop offset="1" stop-color="#7fe0ec" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="ud"><circle r="${R}"/></clipPath><clipPath id="ud2"><circle r="${R + 1.5}"/></clipPath>` +
  sphereDefs('u', R, SUN, 0.6, 0.1) +
  rimMask('u', R, 7) +
  moonDefs(SUN) +
  `<mask id="ur-m" maskUnits="userSpaceOnUse" x="-${RM}" y="-${RM}" width="${RM * 2}" height="${RM * 2}">${ringShapes(true)}</mask>` +
  ringHalfDefs('ur', RM) +
  `<g id="um">${MOONS.map(m => m[2]).join('')}</g>`

const body =
  `<rect width="1600" height="1000" fill="url(#bg)"/>` +
  milkyWay(23, -150, 260, 900, 1150, 230) +
  starfield(7311, 480, 110, 9) +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:var(--veil-op)"/>` +
  sunGlare(-50, -40, 0.95) +
  `<g class="sys"><g transform="translate(${CX} ${CY}) rotate(${ROLL})">` +
  `<circle r="${n(R * 2.3)}" fill="url(#u-halo)" style="opacity:var(--halo-op)"/>` +
  backMoons +
  ringBody('b') +
  GLOBE +
  `<g clip-path="url(#ud)">${ringBody('f')}</g>` +
  frontMoons +
  `</g></g>` +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:calc(var(--veil-op) * .6)"/>` +
  grade([120, 80], '#fff4dc', '#06243a', 0.7)

const SCENE = svg(CSS, defs, body)

export const SPACE_URANUS: Look = {
  label: 'Uranus',
  args: { colors: theme, backdrop: { scene: 'space-uranus', glass: { blur: 26, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
