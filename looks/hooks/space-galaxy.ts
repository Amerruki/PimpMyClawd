import { makeColors } from './make-colors.js'
import { svg } from './kit'
import { ARM_LIGHT, BAR, DISC_BASE, DISC_DEFS, DUST, KPC, SHARP } from './space-galaxy-disc'
import { stop } from './space-galaxy-kit'
import { bloom, farField, farTile, globulars, haloSky, magellanic, SKY_DEFS } from './space-galaxy-sky'
import type { Look } from './look'

// The Milky Way as it would look from outside, north of its plane and at a
// tilt: a warm bar with a peanut-shaped bulge, the Scutum-Centaurus and
// Perseus arms springing from the bar's ends, the fainter Norma-Outer and
// Sagittarius-Carina arms between them, and the short Local arm with a small
// ring where the Sun is. Dust lanes line the arms' inner edges and curl into
// the bar; pink hydrogen knots bead the arms. Around it hang the halo, a
// scatter of globular clusters and the two Magellanic Clouds, against a far
// field of other galaxies. The colours follow the familiar face-on renderings:
// a gold bar and bulge of old stars, cream arms edged with blue-white young
// clusters, pink hydrogen and red-brown dust. Night is the true view. Day is
// the same structure as a warm overexposed plate.
const { theme, problems } = makeColors({
  label: 'Milky Way',
  codeTheme: { light: 'github-light', dark: 'tokyo-night' },
  roles: { accent: '#2f58c4', danger: '#c93434', success: '#2c8a48', warning: '#a86f00', pro: '#8a48c8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f1ede5',
        'surface-1': '#f6f3ed',
        'surface-2': '#fbf9f5',
        'text-primary': '#171a28',
        'text-secondary': '#383d52',
        'text-muted': '#555b74',
      },
    },
  },
  dark: {
    roles: { accent: '#8fb2ff', pro: '#c08cff' },
    gray: {
      anchors: {
        'surface-0': '#04050b',
        'surface-1': '#090b15',
        'surface-2': '#0e101c',
        'surface-3': '#131625',
        'text-primary': '#ecf0fa',
        'text-secondary': '#c4c9de',
        'text-muted': '#989fbc',
      },
    },
  },
})

// Where the Galactic centre sits on the 1600 x 1000 frame, how far the disc
// is tipped away from face-on (its short axis over its long one), and how
// its long axis is rolled on screen.
const GX = 1345
const GY = 460
const SQUASH = 0.58
const ROLL = 32
// The pattern's turn, set so the bar is seen long.
const PHASE = 110
// The disc stands still: a turn would take 13 minutes, too slow to see, and
// a still disc lets its light be blurred cheaply. Its life is in twinkling
// stars, breathing knots and the ping at the Sun.

const CSS = `
:root, svg {
  --bg-0:#fffaf0; --bg-1:#f6f0e4; --bg-2:#ebe6dc;
  --disc:#c8a678; --inner:#d0a060; --arm:#a8743a; --arm-2:#7189c0; --old:#e2a855; --bar:#e9a646; --bulge:#f4c674; --core:#fff6e0;
  --lane:#946048;
  --sw:#ffffff; --sb:#7488b4; --sy:#bf8a45; --sh:#ffffff; --sg:#c49655; --sf:#a8a294; --s-op:.85;
  --hii:#d8506c; --cluster:#6a86c8;
  --halo:#fff6e6; --gc:#c99a58; --far-a:#cfa56a; --far-b:#a2a6b8; --far-op:.5;
  --mc:#a48a68; --mc-bar:#dca050; --mark:#7a3a1c;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg-0:#0a0806; --bg-1:#040305; --bg-2:#010103;
    --disc:#6a5640; --arm:#e8d4b0; --arm-2:#a9c2f6; --inner:#9a7650; --old:#e0a050; --bar:#f2b052; --bulge:#ffd48a; --core:#fff6e2;
    --lane:#2a0f06;
    --sw:#fffaf0; --sb:#c4d4ff; --sy:#ffd89a; --sh:#ffe1e6; --sg:#fff0d2; --sf:#a8a090; --s-op:1;
    --hii:#ff4f6e; --cluster:#bcd0ff;
    --halo:#5a4a38; --gc:#ffdfae; --far-a:#e0ac6c; --far-b:#a8a8c0; --far-op:.8;
    --mc:#a89c8c; --mc-bar:#f2cf9a; --mark:#ffffff;
  }
}
.mw-s { fill: none; stroke-linecap: round; stroke-opacity: var(--s-op); }
.mw-sw { stroke: var(--sw); } .mw-sb { stroke: var(--sb); } .mw-sy { stroke: var(--sy); }
.mw-sh { stroke: var(--sh); } .mw-sg { stroke: var(--sg); } .mw-sf { stroke: var(--sf); }
.mw-hz { fill: var(--arm); }
.mw-du { fill: none; stroke: var(--lane); stroke-linecap: round; stroke-linejoin: round; }
.mw-far { opacity: var(--far-op); }
.mw-dl { fill: none; stroke: var(--lane); stroke-opacity: .42; stroke-linecap: round; stroke-linejoin: round; }
/* The arms' light and the dust are each blurred as one still layer, which
   gives every glow and coat its soft edge. */
.mw-soft { filter: blur(11px); } .mw-soft-dust { filter: blur(2.5px); }
.mw-t1 { animation: mw-tw 4.3s ease-in-out infinite alternate; }
.mw-t2 { animation: mw-tw 6.1s ease-in-out -2s infinite alternate; }
@keyframes mw-tw { from { opacity: 1; } to { opacity: .5; } }
.mw-k0, .mw-k1, .mw-k2, .mw-k3, .mw-k4 { transform-box: fill-box; transform-origin: center; animation: mw-br 7s ease-in-out infinite alternate; }
.mw-k1 { animation-duration: 9s; animation-delay: -3s; } .mw-k2 { animation-duration: 11s; animation-delay: -7s; }
.mw-k3 { animation-duration: 8s; animation-delay: -5s; } .mw-k4 { animation-duration: 10s; animation-delay: -1s; }
@keyframes mw-br { from { transform: scale(.72); opacity: .55; } to { transform: scale(1.14); opacity: 1; } }
.mw-gl { fill: none; stroke-linecap: round; }
.mw-ko { animation-name: mw-bo; stroke-width: 8.5; } .mw-ki { animation-name: mw-bi; stroke-width: 4.2; }
@keyframes mw-bo { from { stroke-width: 6.1; opacity: .55; } to { stroke-width: 9.7; opacity: 1; } }
@keyframes mw-bi { from { stroke-width: 3; opacity: .55; } to { stroke-width: 4.8; opacity: 1; } }
.mw-here, .mw-ping { fill: none; stroke: var(--mark); stroke-width: 1; vector-effect: non-scaling-stroke; }
.mw-here-dot { fill: var(--mark); }
.mw-ping { transform-box: fill-box; transform-origin: center; animation: mw-ping 8s ease-out infinite; }
/* The frame is cropped to the window: a tall window loses the sides, a very
   wide one the top and bottom. These bring the galaxy and its satellites
   back inside what is left. */
@media (max-aspect-ratio: 27/20) { .mw-fit { transform: translate(-13px, 73px) scale(.82); } .mw-sat { transform: translate(110px, 0); } }
@media (max-aspect-ratio: 11/10) { .mw-fit { transform: translate(88px, 98px) scale(.7); } .mw-sat { transform: translate(210px, 0); } }
@media (min-aspect-ratio: 5/2) { .mw-fit { transform: translate(350px, 150px) scale(.74); } .mw-sat { transform: translate(0, -95px); } }
@keyframes mw-ping { 0% { transform: scale(1); opacity: .6; } 45%, 100% { transform: scale(3); opacity: 0; } }
`

const DEFS =
  `<radialGradient id="mw-bg" gradientUnits="userSpaceOnUse" cx="${GX}" cy="${GY}" r="1500">${haloSky(0.57)}</radialGradient>` +
  `<radialGradient id="mw-sph">${stop(0, '--core', 0.9)}${stop(0.25, '--bulge', 0.6)}${stop(0.6, '--bulge', 0.18)}${stop(1, '--bulge', 0)}</radialGradient>` +
  farTile('mw-ft', 71, 397, 60) +
  DISC_DEFS +
  SKY_DEFS

// Far galaxies stay off the Milky Way and thin out under the conversation.
const keep = (x: number, y: number): number => {
  const dx = x - GX
  const dy = y - GY
  const c = Math.cos((ROLL * Math.PI) / 180)
  const s = Math.sin((ROLL * Math.PI) / 180)
  const u = (dx * c + dy * s) / (15 * KPC)
  const v = (-dx * s + dy * c) / (15 * KPC * SQUASH)

  return u * u + v * v < 1 ? 0 : x > 450 && x < 1150 ? 0.45 : 1
}

const gc = globulars(KPC, SQUASH)

// A layer of the disc, tipped into the plane and set at the pattern's turn.
const plane = (layer: string): string => `<g transform="scale(1 ${SQUASH}) rotate(${PHASE})">${layer}</g>`

const body =
  `<rect width="1600" height="1000" fill="url(#mw-bg)"/>` +
  `<rect class="mw-far" width="1600" height="1000" fill="url(#mw-ft)"/>${farField(keep)}` +
  `<g class="mw-sat">${magellanic(250, 600, 140, 805, 1)}</g>` +
  `<g class="mw-fit"><g transform="translate(${GX} ${GY}) rotate(${ROLL})">` +
  bloom(KPC, SQUASH) +
  gc.back +
  plane(DISC_BASE) +
  `<g class="mw-soft">${plane(ARM_LIGHT)}</g>` +
  plane(BAR) +
  `<g class="mw-soft-dust">${plane(DUST)}</g>` +
  plane(SHARP) +
  `<ellipse rx="${Math.round(0.85 * KPC)}" ry="${Math.round(0.7 * KPC)}" fill="url(#mw-sph)"/>` +
  gc.front +
  `</g></g>`

export const SPACE_GALAXY: Look = {
  label: 'Milky Way',
  args: { colors: theme, backdrop: { scene: 'space-galaxy', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  scene: svg(CSS, DEFS, body),
}
