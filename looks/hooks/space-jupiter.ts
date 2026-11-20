import { makeColors } from './make-colors.js'
import { grade, n, seeded, svg, taper, type Pt } from './kit'
import type { Look } from './look'
import {
  D2R,
  milkyWay,
  moonBack,
  moonBody,
  moonDefs,
  moonFront,
  moonShadow,
  ringGradient,
  ringHalf,
  ringHalfDefs,
  ringShadowD,
  rimGlow,
  rimMask,
  screenToL,
  slideUse,
  SPACE_CSS,
  SPACE_DEFS,
  sphereDefs,
  sphereShade,
  starfield,
  sunGlare,
  unproj,
  type Orbit,
} from './space-outer-kit'

// Jupiter, close: its belts and zones in cream, tan and rust, every band
// streaming at its own speed inside the disc (the jets alternate direction
// in the Great Red Spot's frame), turbulent edges, festoons trailing from
// the North Equatorial Belt, barges, the string of pearls and Oval BA. The
// Great Red Spot turns counterclockwise in its pale hollow with its wake to
// the west. Io, Europa, Ganymede and Callisto at their true sizes on orbits
// in the 1:2:4 resonance, passing in front of and behind the planet and
// throwing shadows across the clouds. A faint dusty ring. Day is sunlit
// and hazy with glare from the upper left; night is deep space.
const { theme, problems } = makeColors({
  label: 'Jupiter',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#d9822b', danger: '#d23a32', success: '#2f9a55', warning: '#b98100', pro: '#a35fd0' },
  light: {
    roles: { accent: '#b8661a' },
    gray: {
      anchors: {
        'surface-0': '#f1ede6',
        'surface-1': '#f6f3ee',
        'surface-2': '#fbf9f5',
        'text-primary': '#241c14',
        'text-secondary': '#4a3e31',
        'text-muted': '#66584a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b0a0c',
        'surface-1': '#131114',
        'surface-2': '#19161a',
        'surface-3': '#1f1b1f',
        'text-primary': '#f3ece2',
        'text-secondary': '#d2c7b8',
        'text-muted': '#ab9f90',
      },
    },
  },
})

const CX = 1240
const CY = 440
const R = 300
const ROLL = -8
const B = 2.5
const K = 0.935
const T = 640
const SUN = screenToL([-0.6, 0.3, 0.74], ROLL)
const SUN_P = unproj(SUN, B)
const rand = seeded(5150)

const latY = (lat: number) => -R * Math.sin(lat * D2R)

// Bands north to south: [north edge, south edge, colour, period (s) of one
// tile width, direction]. Speeds are relative to the Red Spot.
type Band = readonly [number, number, string, number, 1 | -1]
const BANDS: readonly Band[] = [
  [90, 49, '#878580', 900, 1],
  [49, 39, '#bfae94', 520, -1],
  [39, 33, '#9c7d62', 340, 1],
  [33, 27.5, '#dccdb0', 420, -1],
  [27.5, 23, '#a46e4c', 95, 1],
  [23, 18, '#ebdec4', 330, -1],
  [18, 7, '#94532f', 220, 1],
  [7, -7, '#ecdab6', 130, 1],
  [-7, -19.5, '#a9714a', 280, -1],
  [-19.5, -27, '#efe3ca', 460, 1],
  [-27, -32.5, '#aa8460', 190, 1],
  [-32.5, -37, '#ddcfb3', 380, -1],
  [-37, -43, '#a78a6c', 250, -1],
  [-43, -52, '#c9b9a0', 560, 1],
  [-52, -90, '#7f7c78', 1000, -1],
]

const isBelt = (i: number) => [2, 4, 6, 8, 10, 12].includes(i)

// A periodic wavy edge across one tile: harmonics that repeat every T, plus
// a few sharp hooks where the shear curls the boundary.
function edgeWave(seed: number, amp: number): (x: number) => number {
  const r = seeded(seed)
  const terms = Array.from({ length: 5 }, (_, i) => ({ k: [2, 3, 5, 8, 13][i] as number, a: amp * (0.6 - i * 0.09) * (0.5 + r()), p: r() * 6.28 }))
  const hooks = Array.from({ length: 4 }, () => ({ x: r() * T, a: amp * (1 + r() * 1.6) * (r() > 0.5 ? 1 : -1), w: 6 + r() * 10 }))

  return (x: number) => {
    let y = 0
    for (const t of terms) {
      y += t.a * Math.sin((2 * Math.PI * t.k * x) / T + t.p)
    }
    for (const h of hooks) {
      const dx = Math.min(Math.abs(x - h.x), T - Math.abs(x - h.x))
      y += h.a * Math.exp(-(dx * dx) / (h.w * h.w))
    }

    return y
  }
}

const DEFS: string[] = []

function bandTile(i: number): string {
  const [north, south, col] = BANDS[i] as Band
  const y0 = latY(north)
  const y1 = latY(south)
  const h = y1 - y0
  const parts: string[] = []
  const r = seeded(100 + i * 31)
  // The southern edge, curling into the band below.
  if (i < BANDS.length - 1) {
    const amp = isBelt(i) ? 3.2 : 2.6
    const w = edgeWave(700 + i, amp)
    const pts: string[] = []
    for (let x = 0; x <= T; x += 8) {
      pts.push(`${x} ${n(y1 + w(x))}`)
    }
    parts.push(`<path d="M0 ${n(y1 - Math.min(h * 0.45, 14))}L${pts.join('L')}L${T} ${n(y1 - Math.min(h * 0.45, 14))}Z" fill="${col}"/>`)
  }
  // Streaks along the flow: lighter in belts, darker in zones.
  const streaks = Math.round(6 + h / 3)
  let light = ''
  let dark = ''
  for (let k = 0; k < streaks; k++) {
    const x = r() * T
    const y = y0 + h * (0.12 + r() * 0.76)
    const len = 30 + r() * 150
    const dy = (r() - 0.5) * 4
    const seg = `M${n(x)} ${n(y)}q${n(len / 2)} ${n(dy * 2)} ${n(len)} ${n(dy)}` + (r() > 0.6 ? `M${n(x + 6)} ${n(y + 2.5)}q${n(len / 3)} ${n(dy)} ${n(len * 0.6)} ${n(dy / 2)}` : '')
    if (r() > (isBelt(i) ? 0.35 : 0.7)) {
      light += seg
    } else {
      dark += seg
    }
  }
  // Each streak twice, wide and faint under thin, for a soft edge without blur.
  parts.push(`<g fill="none" stroke-linecap="round"><path d="${light}" stroke="#f7eedc" stroke-opacity="${isBelt(i) ? 0.1 : 0.14}" stroke-width="3.2"/><path d="${light}" stroke="#fbf4e6" stroke-opacity="${isBelt(i) ? 0.16 : 0.2}" stroke-width=".9"/>`)
  parts.push(`<path d="${dark}" stroke="#6e4630" stroke-opacity="${isBelt(i) ? 0.12 : 0.06}" stroke-width="3.4"/><path d="${dark}" stroke="#5e3a26" stroke-opacity="${isBelt(i) ? 0.2 : 0.1}" stroke-width="1"/></g>`)

  if (i === 6) {
    // NEB: dark brown barges on the north edge, bright rifts inside.
    for (let k = 0; k < 3; k++) {
      const x = 60 + k * 210 + r() * 60
      parts.push(`<ellipse cx="${n(x)}" cy="${n(latY(16))}" rx="${n(10 + r() * 6)}" ry="4" fill="#5a2f1d" fill-opacity=".8"/>`)
    }
    let rift = ''
    for (let k = 0; k < 5; k++) {
      const x = r() * T
      const y = latY(13 - r() * 4)
      rift += `M${n(x)} ${n(y)}c25 -4 50 3 ${n(70 + r() * 50)} ${n(-6 + r() * 4)}`
    }
    parts.push(`<path d="${rift}" stroke="#f4e6cc" stroke-opacity=".55" stroke-width="2.2" fill="none" stroke-linecap="round"/>`)
  }
  if (i === 7) {
    // EZ: festoons, dark blue-grey plumes trailing from the NEB's southern
    // edge, each with a bright plume beside it; an ochre haze down the middle.
    parts.push(`<rect x="0" y="${n(latY(3))}" width="${T}" height="${n(latY(-4) - latY(3))}" fill="#d9b47a" fill-opacity=".28"/>`)
    for (let k = 0; k < 7; k++) {
      const x = 30 + k * (T / 7) + r() * 40
      const ye = latY(7)
      const len = 50 + r() * 70
      const drop = 14 + r() * 16
      const pts: Pt[] = [
        [x, ye - 2],
        [x - len * 0.2, ye + drop * 0.35],
        [x - len * 0.5, ye + drop * 0.75],
        [x - len, ye + drop + r() * 6],
      ]
      parts.push(`<ellipse cx="${n(x + 10 + r() * 10)}" cy="${n(ye + 9 + r() * 6)}" rx="${n(18 + r() * 12)}" ry="${n(6 + r() * 3)}" fill="url(#plume)"/>`)
      parts.push(`<path d="${taper(pts, 6 + r() * 5, 0.8)}" fill="#4d5568" fill-opacity="${n(0.32 + r() * 0.25)}"/>`)
      parts.push(`<ellipse cx="${n(x)}" cy="${n(ye)}" rx="${n(5 + r() * 4)}" ry="3" fill="#3a3f50" fill-opacity=".55"/>`)
    }
  }
  if (i === 8) {
    // SEB: bright convective outbreaks.
    for (let k = 0; k < 6; k++) {
      const x = r() * T
      const y = latY(-10 - r() * 7)
      parts.push(`<path d="M${n(x)} ${n(y)}c12 -5 30 -4 ${n(40 + r() * 30)} ${n(1 + r() * 3)}c-14 4 -30 4 ${n(-40 - r() * 30)} -1Z" fill="#f3e6cf" fill-opacity=".5"/>`)
    }
  }
  if (i === 10) {
    // STB: Oval BA, pale with a reddish core.
    parts.push(`<ellipse cx="420" cy="${n(latY(-30.5))}" rx="15" ry="9.5" fill="#f2e6d6"/><ellipse cx="420" cy="${n(latY(-30.5))}" rx="9" ry="5.5" fill="#d59c84" fill-opacity=".8"/>`)
  }
  if (i === 12) {
    // SSTB: the string of pearls.
    for (let k = 0; k < 7; k++) {
      parts.push(`<ellipse cx="${n(30 + k * 88 + r() * 20)}" cy="${n(latY(-40))}" rx="5.5" ry="3.6" fill="#f7f0e3" fill-opacity=".9"/>`)
    }
  }
  if (i === 0 || i === 14) {
    // Polar regions: mottled with small cyclones.
    let m = ''
    for (let k = 0; k < 22; k++) {
      const x = r() * T
      const lat = i === 0 ? 52 + r() * 22 : -55 - r() * 20
      m += `<ellipse cx="${n(x)}" cy="${n(latY(lat))}" rx="${n(5 + r() * 9)}" ry="${n(2 + r() * 3)}" fill="${r() > 0.5 ? '#a49b90' : '#6c655e'}" fill-opacity=".5"/>`
    }
    parts.push(m)
  }

  return `<g id="jt${i}">${parts.join('')}</g>`
}

// ---- The Great Red Spot ----------------------------------------------------

const GX = 34
const GY = latY(-22.5)
const swirl = Array.from({ length: 5 }, (_, k) => {
  const a0 = (k / 5) * Math.PI * 2
  const pts: Pt[] = Array.from({ length: 6 }, (_, j) => {
    const t = j / 5
    const rr = 34 - t * 26
    const a = a0 + t * 2.4

    return [Math.cos(a) * rr, Math.sin(a) * rr]
  })

  return `<path d="${taper(pts, 7, 1)}" fill="${k % 2 ? '#f0b48a' : '#8f3a22'}" fill-opacity="${k % 2 ? 0.45 : 0.4}"/>`
}).join('')

const GRS =
  // The pale hollow the spot sits in, notched into the SEB.
  `<ellipse cx="${GX}" cy="${n(GY - 3)}" rx="64" ry="33" fill="#efe3ca"/>` +
  `<ellipse cx="${GX}" cy="${n(GY)}" rx="54" ry="31" fill="url(#grs-col)"/>` +
  `<g transform="translate(${GX} ${n(GY)}) scale(1 .68)">` +
  `<circle r="40" fill="url(#grs)"/>` +
  `<g clip-path="url(#grs-c)"><g>${swirl}<circle r="11" fill="#e6a77d" fill-opacity=".6"/>` +
  `<animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="48s" repeatCount="indefinite"/></g></g>` +
  `<circle r="40" fill="none" stroke="#7d3420" stroke-opacity=".35" stroke-width="3"/></g>` +
  // The turbulent wake to the west: curling filaments of cream and brown.
  `<ellipse cx="${GX - 120}" cy="${n(GY - 22)}" rx="95" ry="13" fill="url(#plume)" opacity=".55"/>` +
  `<g class="wake">` +
  Array.from({ length: 16 }, (_, k) => {
    const x0 = GX - 62 - k * 11 - rand() * 14
    const y0 = GY - 14 - rand() * 22
    const turn = (rand() > 0.5 ? 1 : -1) * (1.6 + rand() * 1.8)
    const rr = 5 + rand() * 7
    const pts: Pt[] = Array.from({ length: 6 }, (_, j) => {
      const t = j / 5
      const a = -Math.PI / 2 + t * turn

      return [x0 - t * (10 + rand() * 6) + Math.cos(a) * rr * (1 - t * 0.5), y0 + Math.sin(a) * rr * (1 - t * 0.5)]
    })
    const light = k % 3 !== 1

    return `<path d="${taper(pts, 2.4 + rand() * 1.6, 0.4)}" fill="${light ? '#f5ead6' : '#7a4a30'}" fill-opacity="${light ? 0.45 : 0.32}"/>`
  }).join('') +
  `</g>`

// ---- Moons -----------------------------------------------------------------

const sinB = Math.sin(B * D2R)
const orbits: Record<string, Orbit & { r: number }> = {
  io: { A: 640, b: 640 * sinB, P: 42, phase: 0.12, r: 7.6 },
  eu: { A: 800, b: 800 * sinB, P: 84, phase: 0.66, r: 6.6 },
  ga: { A: 1010, b: 1010 * sinB, P: 168, phase: 0.36, r: 11 },
  ca: { A: 1310, b: 1310 * sinB, P: 394, phase: 0.83, r: 10.1 },
}
const io = orbits.io as Orbit & { r: number }
const eu = orbits.eu as Orbit & { r: number }
const ga = orbits.ga as Orbit & { r: number }
const ca = orbits.ca as Orbit & { r: number }

const MOON_DEFS =
  moonBody(
    'm-io',
    io.r,
    SUN,
    '#e2cd6c',
    `<circle cx="-2" cy="-2" r="3.2" fill="#c98b3b" fill-opacity=".7"/><circle cx="3" cy="2.5" r="2.4" fill="#f2ebc4"/><circle cx="-3" cy="3" r="1.1" fill="#4e321b"/><circle cx="2" cy="-4" r=".9" fill="#5d3a1c"/><ellipse cx="0" cy="-6.5" rx="6" ry="2" fill="#b78a52" fill-opacity=".6"/>`,
  ) +
  moonBody(
    'm-eu',
    eu.r,
    SUN,
    '#e7decb',
    `<path d="M-6 -2q4 2 12 -1M-5 2q5 -1 10 3M-2 -6q2 6 5 12" stroke="#9a6a4e" stroke-width=".7" fill="none" stroke-opacity=".7"/><circle cx="2" cy="1" r="2.6" fill="#bda889" fill-opacity=".6"/>`,
  ) +
  moonBody(
    'm-ga',
    ga.r,
    SUN,
    '#a49888',
    `<ellipse cx="-3" cy="-1" rx="6" ry="4.5" fill="#6a6157"/><circle cx="4" cy="3" r="2.6" fill="#d6cfc3" fill-opacity=".8"/><ellipse cx="0" cy="-9.5" rx="8" ry="3" fill="#e9e6e0" fill-opacity=".55"/><circle cx="-5" cy="5" r="1" fill="#efe9de"/>`,
  ) +
  moonBody(
    'm-ca',
    ca.r,
    SUN,
    '#6c6052',
    `<circle cx="2" cy="-1" r="3.4" fill="#a99c8a" fill-opacity=".7"/><circle cx="2" cy="-1" r="1.1" fill="#e6dfd3"/>` +
      Array.from({ length: 9 }, () => `<circle cx="${n((rand() - 0.5) * 17)}" cy="${n((rand() - 0.5) * 17)}" r=".6" fill="#ddd5c8"/>`).join(''),
  )

const MOONS: [Orbit & { r: number }, string][] = [
  [io, 'm-io'],
  [eu, 'm-eu'],
  [ga, 'm-ga'],
  [ca, 'm-ca'],
]
const backMoons = MOONS.map(([o, id]) => moonBack(o, `<use href="#${id}"/>`)).join('')
const frontMoons = MOONS.map(([o, id]) => moonFront(o, `<use href="#${id}"/>`)).join('')
const shadows = MOONS.map(([o]) => moonShadow(o, o.r, SUN, o.A - R * 0.92)).join('')

// ---- Ring ------------------------------------------------------------------

// Halo 1.40-1.72 R, main ring 1.72-1.81 R, gossamer rings to 3.1 R: faint
// reddish dust, brighter in forward scatter (the night version).
const RM = R * 3.1
const ringProf = (rho: number): readonly [string, number] => {
  const x = rho / R
  if (x < 1.4) return ['#a88d73', 0]
  if (x < 1.72) return ['#a88d73', 0.08 + (x - 1.4) * 0.2]
  if (x < 1.81) return ['#c2a789', 0.5 + Math.sin((x - 1.72) * 70) * 0.08]
  if (x < 2.55) return ['#a88d73', 0.1 - (x - 1.81) * 0.07]
  return ['#a88d73', Math.max(0, 0.05 - (x - 2.55) * 0.09)]
}
const rs = ringShadowD(R, SUN_P)
const ringBody = (half: 'b' | 'f') =>
  ringHalf(
    'jr',
    B,
    half,
    `<circle r="${n(RM)}" fill="url(#jr-g)"/>` +
      (half === 'b' ? `<g mask="url(#jr-m)"><path transform="rotate(${n(rs.rot)})" d="${rs.d}" fill="#000" fill-opacity=".9"/></g>` : ''),
  )

// ---- Scene -----------------------------------------------------------------

const CSS = `
${SPACE_CSS}
@media (max-aspect-ratio: 3/4) { .sys { transform: translateX(-440px); } }
:root, svg {
  --bg0:#fff7e6; --bg1:#d9dfe9; --bg2:#aebdd3; --star-op:.16; --neb-op:.7; --dust-op:0; --glare-op:1; --night-op:.72; --rim-op:.55; --veil-op:.2; --ring-op:.55;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#0d0e19; --bg1:#05060c; --bg2:#010205; --star-op:1; --neb-op:1; --glare-op:0; --night-op:1; --rim-op:1; --veil-op:0; --ring-op:1;
  }
}
.wake { animation: wake 9s ease-in-out infinite alternate; }
@keyframes wake { from { transform: translate(-2px, 0); } to { transform: translate(3px, -1px); } }
`

const defs =
  SPACE_DEFS +
  `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--bg0)"/><stop offset=".45" style="stop-color:var(--bg1)"/><stop offset="1" style="stop-color:var(--bg2)"/></linearGradient>` +
  `<radialGradient id="veil" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1900"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#f3f1ec" stop-opacity=".5"/><stop offset="1" stop-color="#e9edf3" stop-opacity=".2"/></radialGradient>` +
  `<radialGradient id="grs"><stop offset="0" stop-color="#e9b892"/><stop offset=".35" stop-color="#d47d50"/><stop offset=".72" stop-color="#bb5432"/><stop offset=".9" stop-color="#a6452b"/><stop offset="1" stop-color="#c66d47"/></radialGradient>` +
  `<radialGradient id="grs-col"><stop offset=".6" stop-color="#fbf5ea" stop-opacity="0"/><stop offset=".82" stop-color="#fbf5ea" stop-opacity=".9"/><stop offset="1" stop-color="#fbf5ea" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="plume"><stop offset="0" stop-color="#fffaf0" stop-opacity=".85"/><stop offset=".6" stop-color="#fffaf0" stop-opacity=".45"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="grs-c"><circle r="40"/></clipPath>` +
  `<linearGradient id="belt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".5" stop-color="#2a1208" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>` +
  `<linearGradient id="zone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a30" stop-opacity=".12"/><stop offset=".5" stop-color="#fffaf0" stop-opacity=".25"/><stop offset="1" stop-color="#6b4a30" stop-opacity=".12"/></linearGradient>` +
  `<clipPath id="jd"><circle r="${R}"/></clipPath>` +
  `<clipPath id="jd2"><circle r="${R + 1.5}"/></clipPath>` +
  `<clipPath id="jde"><ellipse rx="${R}" ry="${n(R * K)}"/></clipPath>` +
  sphereDefs('j', R, SUN, 0.62, 0.12) +
  rimMask('j', R, 8) +
  moonDefs(SUN) +
  ringGradient('jr-g', RM, ringProf, [1.72 * R, 1.81 * R], 70) +
  ringGradient('jr-w', RM, rho => [`#fff`, Math.min(1, ringProf(rho)[1] * 2.5)], [1.72 * R, 1.81 * R], 40, true) +
  `<mask id="jr-m" maskUnits="userSpaceOnUse" x="-${RM}" y="-${RM}" width="${RM * 2}" height="${RM * 2}"><circle r="${n(RM)}" fill="url(#jr-w)"/></mask>` +
  ringHalfDefs('jr', RM) +
  BANDS.map((_, i) => bandTile(i)).join('') +
  `<g id="moons">${MOON_DEFS}</g>`

const bandsStatic = BANDS.map(([north, south, col], i) => {
  const y0 = latY(north)
  const y1 = latY(south)

  return `<rect x="${-R}" y="${n(y0 - 1)}" width="${R * 2}" height="${n(y1 - y0 + 2)}" fill="${col}"/><rect x="${-R}" y="${n(y0)}" width="${R * 2}" height="${n(y1 - y0)}" fill="url(#${isBelt(i) ? 'belt' : 'zone'})"/>`
}).join('')

const bandsMoving = BANDS.map(([, , , P, dir], i) => slideUse(`jt${i}`, T, -R - 20, P, dir, (i * 37) % P)).join('')

const globe =
  `<g transform="scale(1 ${K})"><g clip-path="url(#jd)">` +
  bandsStatic +
  bandsMoving +
  GRS +
  `</g></g>` +
  `<g clip-path="url(#jde)">${shadows}</g>` +
  `<g transform="scale(1 ${K})"><g clip-path="url(#jd2)">${sphereShade('j', R, SUN, '#030308', 0.045)}</g>` +
  rimGlow('j', R, '#fff1d8', 8, 0.7) +
  `</g>`

const body =
  `<rect width="1600" height="1000" fill="url(#bg)"/>` +
  milkyWay(77, -100, 980, 1100, -60, 260) +
  starfield(5101, 560, 130, 12) +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:var(--veil-op)"/>` +
  sunGlare(-40, -60, 1) +
  `<g class="sys"><g transform="translate(${CX} ${CY}) rotate(${ROLL})">` +
  backMoons +
  `<g style="opacity:var(--ring-op)">${ringBody('b')}</g>` +
  globe +
  `<g style="opacity:var(--ring-op)" clip-path="url(#jde)">${ringBody('f')}</g>` +
  frontMoons +
  `</g></g>` +
  `<rect width="1600" height="1000" fill="url(#veil)" style="opacity:calc(var(--veil-op) * .6)"/>` +
  grade([120, 80], '#fff2d8', '#0a1a3a', 0.8)

const SCENE = svg(CSS, defs, body)

export const SPACE_JUPITER: Look = {
  label: 'Jupiter',
  args: { colors: theme, backdrop: { scene: 'space-jupiter', glass: { blur: 26, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
