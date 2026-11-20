import { makeColors } from './make-colors.js'
import { grade, svg } from './kit'
import type { Look } from './look'
import { BODY_DEFS, earth, galilean, jupiter, mars, moonBody, neptune, satellite, saturn, uranus, venus } from './space-orrery-bodies'
import { AU, circularTrack, ellipseEl, moving, orbitEllipse, PERIOD, SUN } from './space-orrery-proj'
import { belt, comet, haze, milkyWay, SKY_DEFS, starfield, sun, sunlight, zodiacal } from './space-orrery-sky'

// The solar system as a living orrery, seen from above the ecliptic at a
// tilt through a perspective lens. The Sun glows at the left with a
// churning surface and a slow corona; Venus, Earth and its Moon, Mars, the
// asteroid belt, Jupiter with its Galilean moons, ringed Saturn, Uranus and
// Neptune each ride a thin glowing orbit at speeds in the real order,
// compressed so all of them visibly move, each shaded toward the Sun. A
// comet swings in now and then, its tail turned away from the Sun. By day
// it is a glossy model on a pale, sunlit haze; by night, deep space.
//
// Accent: starlight blue, the colour of hot blue-white stars like Rigel and
// Vega. It is the cool counterpoint to the Sun's gold that fills the scene,
// it stays legible on both the pale day glass and the night, and gold is
// already spoken for by the warning amber.
const { theme, problems } = makeColors({
  label: 'Solar system',
  codeTheme: { light: 'github-light', dark: 'tokyo-night' },
  roles: { accent: '#3f86ff', danger: '#d8393a', success: '#22a35f', warning: '#c98a00', pro: '#8b5cf6' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e8eef8',
        'surface-1': '#eff3fa',
        'surface-2': '#f6f8fd',
        'text-primary': '#121a2c',
        'text-secondary': '#323e58',
        'text-muted': '#4b5872',
      },
    },
  },
  dark: {
    roles: { accent: '#6aa6ff' },
    gray: {
      anchors: {
        'surface-0': '#05070f',
        'surface-1': '#0a0e1b',
        'surface-2': '#0f1427',
        'surface-3': '#131a30',
        'text-primary': '#eef2ff',
        'text-secondary': '#c3cbe3',
        'text-muted': '#98a2c2',
      },
    },
  },
})

const CSS = `
:root, svg {
  --so-bg0: #fff9ea; --so-bg1: #e4eefc; --so-bg2: #b9cff0;
  --so-haze1: #ffffff; --so-haze2: #a9c3f0; --so-haze-op: .75;
  --so-milky-op: .08; --so-lane-op: 0; --so-star-far: .22; --so-star-op: .55;
  --so-t1: #6f88bd; --so-t2: #7a95cc; --so-t3: #9a9fbf; --so-t4: #a99aa8;
  --so-zodi: #fff0c4; --so-zodi-op: .55;
  --so-bloom: #ffe6a6; --so-bloom-op: 1; --so-ray-op: .8; --so-glare-op: .9;
  --so-corona: #ffc94e; --so-corona-op: .85;
  --so-orbit: #4a6fb8; --so-orbit-op: .6; --so-orbit-glow: #ffffff; --so-orbit-glow-op: .95;
  --so-belt: #857b72; --so-belt-op: .6; --so-beltglow: #ffe7b0; --so-beltglow-op: .35;
  --so-night: #23305e; --so-night-op: .6; --so-gloss: .6;
  --so-ion: #3a78ee; --so-dust: #d7a24f; --so-coma: #7fd6c4;
}
@media (prefers-color-scheme: dark) { :root, svg {
  --so-bg0: #120d10; --so-bg1: #040619; --so-bg2: #010207;
  --so-haze1: #24357e; --so-haze2: #4b2a72; --so-haze-op: .3;
  --so-milky-op: .55; --so-lane-op: .3; --so-star-far: .75; --so-star-op: 1;
  --so-t1: #ffffff; --so-t2: #cddcff; --so-t3: #fff0d0; --so-t4: #ffcf9e;
  --so-zodi: #ffe0a0; --so-zodi-op: .16;
  --so-bloom: #ffd9a0; --so-bloom-op: .42; --so-ray-op: .14; --so-glare-op: .22;
  --so-corona: #ffe2a8; --so-corona-op: .8;
  --so-orbit: #8fb4ff; --so-orbit-op: .34; --so-orbit-glow: #3f78ff; --so-orbit-glow-op: .55;
  --so-belt: #b8ab98; --so-belt-op: .62; --so-beltglow: #c9b89c; --so-beltglow-op: .1;
  --so-night: #000105; --so-night-op: .92; --so-gloss: .14;
  --so-ion: #86b8ff; --so-dust: #fff0d0; --so-coma: #a8ffe2;
} }
.so-t1 { fill: var(--so-t1); } .so-t2 { fill: var(--so-t2); } .so-t3 { fill: var(--so-t3); } .so-t4 { fill: var(--so-t4); }
.so-far { opacity: var(--so-star-far); } .so-stars, .so-bright { opacity: var(--so-star-op); }
.so-tw, .so-glint { animation: twinkle ease-in-out infinite; }
.so-mw { opacity: var(--so-milky-op); } .so-lane { opacity: var(--so-lane-op); }
.so-hz { opacity: var(--so-haze-op); } .so-h1 { fill: var(--so-haze1); } .so-h2 { fill: var(--so-haze2); }
.so-veil { transform-box: fill-box; transform-origin: center; animation: so-veil ease-in-out infinite alternate; }
@keyframes so-veil { from { transform: translate(-36px, 12px) scale(1); } to { transform: translate(44px, -16px) scale(1.07); } }
.so-breathe { animation: so-breathe 14s ease-in-out infinite; }
@keyframes so-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .8; } }
.so-rays { opacity: var(--so-ray-op); } .so-ray { animation: so-ray ease-in-out infinite; }
@keyframes so-ray { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
.so-corona { opacity: var(--so-corona-op); } .so-glare { opacity: var(--so-glare-op); }
.so-prom { animation: pulse ease-in-out infinite; }
.so-orbit { fill: none; stroke: var(--so-orbit); stroke-opacity: var(--so-orbit-op); }
.so-orbit-g { fill: none; stroke: var(--so-orbit-glow); stroke-opacity: var(--so-orbit-glow-op); }
.so-belt { stroke: var(--so-belt); opacity: var(--so-belt-op); }
.so-beltglow { stroke: var(--so-beltglow); stroke-opacity: var(--so-beltglow-op); }
`

type Planet = { a: number; years: number; phase: number; samples: number }
const PLANETS = {
  venus: { a: 0.723, years: 0.615, phase: 2.3, samples: 48 },
  earth: { a: 1, years: 1, phase: -0.7, samples: 48 },
  mars: { a: 1.524, years: 1.881, phase: 0.9, samples: 48 },
  ceres: { a: 2.77, years: 4.6, phase: 3.9, samples: 48 },
  jupiter: { a: 5.203, years: 11.86, phase: -1.4, samples: 64 },
  saturn: { a: 9.537, years: 29.46, phase: 1.75, samples: 72 },
  uranus: { a: 19.19, years: 84.01, phase: 0.28, samples: 72 },
  neptune: { a: 30.07, years: 164.8, phase: -0.36, samples: 80 },
} satisfies Record<string, Planet>

const track = (p: Planet) => circularTrack(AU(p.a), PERIOD(p.years), p.phase, p.samples)
const T = Object.fromEntries(Object.entries(PLANETS).map(([k, p]) => [k, track(p)])) as Record<keyof typeof PLANETS, ReturnType<typeof track>>

// Orbit lines: a thin line over a soft glow, faded through the middle
// column and the foot of the frame so the chat sits on calm space.
const ORBITS = (['venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const).map(k => orbitEllipse(AU(PLANETS[k].a)))
const orbitLines =
  `<g style="filter:blur(2.5px)">${ORBITS.map(e => ellipseEl(e, 'class="so-orbit-g" stroke-width="3.2"')).join('')}</g>` +
  ORBITS.map(e => ellipseEl(e, 'class="so-orbit" stroke-width="1.1"')).join('')

const CALM_DEFS =
  `<linearGradient id="so-calmx" gradientUnits="userSpaceOnUse" x1="0" x2="1600"><stop offset=".3" stop-color="#fff"/><stop offset=".45" stop-color="#666"/><stop offset=".66" stop-color="#666"/><stop offset=".76" stop-color="#fff"/></linearGradient>` +
  `<linearGradient id="so-calmy" gradientUnits="userSpaceOnUse" y1="0" y2="1000"><stop offset=".84" stop-color="#fff"/><stop offset=".96" stop-color="#555"/></linearGradient>` +
  `<mask id="so-calm" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><rect width="1600" height="1000" fill="url(#so-calmx)"/><rect width="1600" height="1000" fill="url(#so-calmy)" style="mix-blend-mode:multiply"/></mask>` +
  `<radialGradient id="so-bg" gradientUnits="userSpaceOnUse" cx="${SUN[0]}" cy="${SUN[1]}" r="1650"><stop offset="0" style="stop-color:var(--so-bg0)"/><stop offset=".4" style="stop-color:var(--so-bg1)"/><stop offset="1" style="stop-color:var(--so-bg2)"/></radialGradient>`

const moon = satellite(26, 9.5, 9, 0.2, moonBody(3, T.earth))
const planets =
  moving(T.venus, venus(10, T.venus)) +
  moving(T.earth, moon.back + earth(11, T.earth) + moon.front) +
  moving(T.mars, mars(8, T.mars)) +
  moving(T.ceres, `<circle r="2.2" fill="#9a948a"/><circle r="2.2" fill="url(#so-term)"><animateTransform attributeName="transform" type="rotate" dur="${PERIOD(4.6)}s" repeatCount="indefinite" calcMode="linear" values="${T.ceres.sun.map(Math.round).join(';')}"/></circle>`) +
  moving(T.jupiter, jupiter(30, T.jupiter, galilean(30))) +
  moving(T.saturn, saturn(24, T.saturn)) +
  moving(T.uranus, uranus(16, T.uranus)) +
  moving(T.neptune, neptune(15, T.neptune))

// Built in order: the body's parts register their defs as they are made.
const sky = `<g class="so-hz">${haze()}</g>${milkyWay()}${starfield()}`
const light = zodiacal() + sunlight()
const ring = belt()
const star = sun()
const flyby = comet()

const BODY =
  `<rect width="1600" height="1000" fill="url(#so-bg)"/>` +
  sky +
  light +
  `<g mask="url(#so-calm)">${orbitLines}${ring}</g>` +
  star +
  planets +
  flyby +
  grade([SUN[0], SUN[1]], '#fff1d0', '#0a2a6a', 0.55)

const SCENE = svg(CSS, CALM_DEFS + SKY_DEFS.join('') + BODY_DEFS.join(''), BODY)

export const SPACE_ORRERY: Look = {
  label: 'Solar system',
  args: { colors: theme, backdrop: { scene: 'space-orrery', glass: { blur: 22, opacity: 0.45 } } },
  problems,
  scene: SCENE,
}
