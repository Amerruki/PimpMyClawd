import { makeColors } from './make-colors.js'
import { grade, n, seeded, svg } from './kit'
import { lambertGradient, litPath, rimGradient, SPACE_CSS, SPACE_DEFS, starfield, turnCSS, turning, meridian, squash, unit, type Turn, type Vec3 } from './space-inner-kit'
import type { Look } from './look'

// Venus in the lower left, a creamy golden globe sealed in cloud. Faint
// ultraviolet-style streaks sweep across it in chevrons, carried westward by
// the super-rotating atmosphere, with brighter polar hoods. The Sun burns just
// off the top left corner, so the lit side is a crescent along the top and the
// thick atmosphere softens the terminator. Zodiacal light leans away from the
// Sun. Night thins the crescent until the atmosphere lights a ring all round
// the limb, and the Earth and Moon shine as a blue double star.
const { theme, problems } = makeColors({
  label: 'Venus',
  codeTheme: { light: 'solarized-light', dark: 'monokai' },
  roles: { accent: '#9a7200', danger: '#d42a3a', success: '#2f9a4a', warning: '#b06a00', pro: '#9a4ad0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f8f3e6',
        'surface-1': '#fbf7ed',
        'surface-2': '#fffcf4',
        'text-primary': '#262012',
        'text-secondary': '#4a4028',
        'text-muted': '#6a5e42',
      },
    },
  },
  dark: {
    roles: { accent: '#f2c75a', pro: '#c58bff' },
    gray: {
      anchors: {
        'surface-0': '#0b0a07',
        'surface-1': '#13110c',
        'surface-2': '#1a1710',
        'surface-3': '#211d15',
        'text-primary': '#fff8e6',
        'text-secondary': '#e3d6b6',
        'text-muted': '#b3a585',
      },
    },
  },
})

const CX = 190
const CY = 885
const R = 470
const TURN: Turn = { period: 240, r: R, tilt: 8, dir: -1 }
const rad = Math.PI / 180

// The Sun sits beyond the top left corner, a little behind the planet by day
// and far behind it by night.
const L_DAY: Vec3 = unit([-0.08, -0.86, 0.5])
const L_NIGHT: Vec3 = unit([0.02, -0.62, -0.78])
const SUN_X = -40
const SUN_Y = -170

const deg = (d: number) => R * Math.sin(d * rad)

function feature(lat: number, lon: number, content: string): string {
  const [, my] = meridian(lat, TURN)
  const sq = squash(lat, TURN)

  return turning(`<g transform="translate(0 ${n(my)}) scale(1 ${n(sq)})">${content}</g>`, lon, lat, TURN)
}

// Cloud streaks: long soft bands, angled poleward toward the west in each
// hemisphere, so together they draw the sideways Y of Venus's cloud tops.
function streaks(seed: number): string {
  const rand = seeded(seed)
  let out = ''
  for (let i = 0; i < 96; i++) {
    const lat = (rand() - 0.5) * 130
    const lon = rand() * 360
    const len = deg(8 + rand() * 16)
    const th = deg(1 + rand() * 2.6)
    const tiltA = -lat * 0.5 + (rand() - 0.5) * 8
    const dark = rand() < 0.6
    const op = dark ? 0.12 + rand() * 0.22 : 0.2 + rand() * 0.35
    out += feature(lat, lon, `<ellipse rx="${n(len)}" ry="${n(th)}" transform="rotate(${n(tiltA)})" fill="url(#ve-${dark ? 'dk' : 'lt'})" fill-opacity="${n(op)}"/>`)
  }

  return out
}

// The broad dark equatorial Y: two soft arms meeting near the equator and a
// stem trailing east, built from overlapping streaks so it has no hard edge.
function bigY(): string {
  let out = ''
  for (let k = 0; k < 7; k++) {
    const t = k / 6
    for (const h of [1, -1]) out += feature(h * (4 + t * 30), 10 + t * 55, `<ellipse rx="${n(deg(13))}" ry="${n(deg(3.2))}" transform="rotate(${n(h * -24)})" fill="url(#ve-dk)" fill-opacity="${n(0.42 - t * 0.2)}"/>`)
  }
  for (let k = 0; k < 4; k++) out += feature((k - 1.5) * 1.5, -12 - k * 16, `<ellipse rx="${n(deg(15))}" ry="${n(deg(4))}" fill="url(#ve-dk)" fill-opacity="${n(0.38 - k * 0.07)}"/>`)

  return out
}

// Bright hoods and dark collars round the poles.
function polar(): string {
  const north = meridian(72, TURN)[1]
  const south = meridian(-72, TURN)[1]

  return (
    `<ellipse cy="${n(north)}" rx="${n(deg(30))}" ry="${n(deg(30) * 0.32)}" fill="url(#ve-hood)"/>` +
    `<ellipse cy="${n(south)}" rx="${n(deg(30))}" ry="${n(deg(30) * 0.2)}" fill="url(#ve-hood)"/>`
  )
}

// The Sun's glare: a warm bloom, a faint halo ring, a few long soft rays.
function glare(): string {
  const rays = [18, 33, 52, 71, 96, 118]
    .map((a, i) => {
      const len = 520 + (i % 3) * 180
      const x = SUN_X + Math.cos(a * rad) * len
      const y = SUN_Y + Math.sin(a * rad) * len
      return `M${SUN_X} ${SUN_Y}L${n(x)} ${n(y)}`
    })
    .join('')

  return (
    `<circle cx="${SUN_X}" cy="${SUN_Y}" r="1300" fill="url(#ve-glare)"/>` +
    `<circle cx="${SUN_X}" cy="${SUN_Y}" r="520" fill="url(#ve-core)"/>` +
    `<g class="ve-rays" style="filter:blur(6px)"><path d="${rays}" stroke="var(--ray)" stroke-width="10" stroke-opacity="var(--ray-op)" stroke-linecap="round"/></g>` +
    `<circle cx="${SUN_X}" cy="${SUN_Y}" r="610" fill="none" stroke="var(--ray)" stroke-width="18" stroke-opacity=".05" class="blur-3"/>`
  )
}

const CSS = `
:root, svg {
  --bg0:#fffaf0; --bg1:#f6ead2; --bg2:#e2d8cc; --bg3:#b9b6c8; --stars:.35; --day:1; --night:0;
  --glare:#fff8e4; --glare-op:.95; --core:#ffffff; --ray:#fff2c8; --ray-op:.14; --zodi:#fff2d0; --zodi-op:.25;
  --v0:#fffdf4; --v1:#fcefc6; --v2:#efcf88; --v3:#c4904a;
  --dk:#b08848; --lt:#ffffff; --hood:#fffbf0; --collar:#b08848;
  --night-fill:#4a3416; --night-op:.65;
  --atmo:#fff0c8; --atmo-op:.95; --ring-op:.25;
  --earth-op:0;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#2a1c0a; --bg1:#120c08; --bg2:#06060b; --bg3:#03030a; --stars:1; --day:0; --night:1;
    --glare:#ffcf7a; --glare-op:.42; --core:#fff6dc; --ray:#ffd890; --ray-op:.06; --zodi:#ffe2a0; --zodi-op:.12;
    --v0:#fbe6b4; --v1:#e6c47e; --v2:#c2934c; --v3:#7a5222;
    --dk:#8a5e28; --lt:#fff2d0; --hood:#fff2d6; --collar:#8a6230;
    --night-fill:#050403; --night-op:.97;
    --atmo:#ffd890; --atmo-op:1; --ring-op:.7;
    --earth-op:1;
  }
}
.ve-rays { transform-box: view-box; transform-origin: ${SUN_X}px ${SUN_Y}px; animation: ve-rays 70s ease-in-out infinite alternate; }
@keyframes ve-rays { from { transform: rotate(-2deg); opacity: .7; } to { transform: rotate(2deg); opacity: 1; } }
.ve-atmo { animation: si-glow 13s ease-in-out infinite alternate; }
.ve-zodi { animation: si-glow 40s ease-in-out infinite alternate; }
${SPACE_CSS}
`

const frame = `transform="translate(${CX} ${CY})"`

const shade = (L: Vec3, id: string, blur: number) =>
  `<circle r="${R}" fill="url(#${id})"/>` +
  `<g style="filter:blur(${blur}px)"><path d="${litPath(0, 0, R, L, true)}" fill="var(--night-fill)" fill-opacity="var(--night-op)"/></g>`

const bands = (() => {
  const rand = seeded(6603)
  let d = ''
  for (let i = 0; i < 9; i++) {
    const lat = -60 + i * 15 + (rand() - 0.5) * 6
    const y = meridian(lat, TURN)[1]
    const h = 18 + rand() * 40
    d += `<rect x="${-R}" y="${n(y - h / 2)}" width="${R * 2}" height="${n(h)}" fill="url(#ve-${i % 2 ? 'bd' : 'bl'})"/>`
  }
  return d
})()

const BODY = `
<rect width="1600" height="1000" fill="url(#ve-bg)"/>
${starfield(6601, { far: 520, mid: 200, near: 70, bright: 9, keep: (x, y) => Math.hypot(x - CX, y - CY) > R + 40 && Math.hypot(x - SUN_X, y - SUN_Y) > 650 })}
<g class="ve-zodi"><path d="M${SUN_X} ${SUN_Y}L1700 560L1700 760Z" fill="url(#ve-zodi)" class="haze"/></g>
${glare()}
<g opacity="var(--earth-op)"><circle cx="1352" cy="236" r="18" fill="url(#ve-earthglow)"/><circle cx="1352" cy="236" r="2.8" fill="#bfe0ff"/><circle cx="1362" cy="231" r="1.1" fill="#e8e4dc"/></g>
<circle cx="560" cy="150" r="1.8" fill="#f2e2cc" fill-opacity=".85"/>
<g ${frame}>
  <circle r="${R + 60}" fill="url(#ve-halo)"/>
  <g clip-path="url(#ve-disc)">
    <circle r="${R}" fill="url(#ve-base)"/>
    ${bands}
    ${bigY()}
    ${streaks(6602)}
    ${polar()}
    <circle r="${R}" fill="url(#ve-limb)"/>
    <g opacity="var(--day)">${shade(L_DAY, 've-lam-d', 26)}</g>
    <g opacity="var(--night)">${shade(L_NIGHT, 've-lam-n', 18)}</g>
  </g>
  <g class="ve-atmo">
    <g opacity="var(--day)"><circle r="${R + 5}" fill="none" stroke="url(#ve-rim-d)" stroke-width="14" class="blur-3"/><circle r="${R + 1.5}" fill="none" stroke="url(#ve-rim-d)" stroke-width="3" class="blur-0"/></g>
    <g opacity="var(--night)"><circle r="${R + 4}" fill="none" stroke="url(#ve-rim-n)" stroke-width="12" class="blur-3"/><circle r="${R + 1.5}" fill="none" stroke="url(#ve-rim-n)" stroke-width="2.5" class="blur-0"/></g>
    <circle r="${R + 2}" fill="none" stroke="var(--atmo)" stroke-width="1.5" stroke-opacity="var(--ring-op)" class="blur-0"/>
  </g>
</g>
${grade([0, 0], '#fff2d0', '#1a1030', 0.5)}
`


const DEFS = `
${SPACE_DEFS}
<linearGradient id="ve-bg" x1="0" y1="0" x2="1" y2=".8"><stop offset="0" stop-color="var(--bg0)"/><stop offset=".3" stop-color="var(--bg1)"/><stop offset=".65" stop-color="var(--bg2)"/><stop offset="1" stop-color="var(--bg3)"/></linearGradient>
<radialGradient id="ve-glare"><stop offset="0" stop-color="var(--glare)" stop-opacity="var(--glare-op)"/><stop offset=".3" stop-color="var(--glare)" style="stop-opacity:calc(var(--glare-op) * .45)"/><stop offset=".6" stop-color="var(--glare)" style="stop-opacity:calc(var(--glare-op) * .12)"/><stop offset="1" stop-color="var(--glare)" stop-opacity="0"/></radialGradient>
<radialGradient id="ve-core"><stop offset=".32" stop-color="var(--core)"/><stop offset=".4" stop-color="var(--core)" stop-opacity=".7"/><stop offset=".6" stop-color="var(--core)" stop-opacity=".15"/><stop offset="1" stop-color="var(--core)" stop-opacity="0"/></radialGradient>
<linearGradient id="ve-zodi" gradientUnits="userSpaceOnUse" x1="${SUN_X}" y1="${SUN_Y}" x2="1700" y2="660"><stop offset="0" stop-color="var(--zodi)" stop-opacity="var(--zodi-op)"/><stop offset="1" stop-color="var(--zodi)" stop-opacity="0"/></linearGradient>
<radialGradient id="ve-earthglow"><stop offset="0" stop-color="#cfe6ff" stop-opacity=".95"/><stop offset=".25" stop-color="#6aa8ff" stop-opacity=".35"/><stop offset="1" stop-color="#6aa8ff" stop-opacity="0"/></radialGradient>
<clipPath id="ve-disc"><circle r="${R}"/></clipPath>
<radialGradient id="ve-base" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="var(--v0)"/><stop offset=".4" stop-color="var(--v1)"/><stop offset=".8" stop-color="var(--v2)"/><stop offset="1" stop-color="var(--v3)"/></radialGradient>
<linearGradient id="ve-bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--dk)" stop-opacity="0"/><stop offset=".5" stop-color="var(--dk)" stop-opacity=".16"/><stop offset="1" stop-color="var(--dk)" stop-opacity="0"/></linearGradient>
<linearGradient id="ve-bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lt)" stop-opacity="0"/><stop offset=".5" stop-color="var(--lt)" stop-opacity=".3"/><stop offset="1" stop-color="var(--lt)" stop-opacity="0"/></linearGradient>
<radialGradient id="ve-dk"><stop offset="0" stop-color="var(--dk)" stop-opacity=".9"/><stop offset=".6" stop-color="var(--dk)" stop-opacity=".4"/><stop offset="1" stop-color="var(--dk)" stop-opacity="0"/></radialGradient>
<radialGradient id="ve-lt"><stop offset="0" stop-color="var(--lt)" stop-opacity=".9"/><stop offset=".6" stop-color="var(--lt)" stop-opacity=".35"/><stop offset="1" stop-color="var(--lt)" stop-opacity="0"/></radialGradient>
<radialGradient id="ve-hood"><stop offset="0" stop-color="var(--hood)" stop-opacity=".5"/><stop offset="1" stop-color="var(--hood)" stop-opacity="0"/></radialGradient>
<radialGradient id="ve-limb" r=".5"><stop offset=".72" stop-color="#5a3a10" stop-opacity="0"/><stop offset="1" stop-color="#5a3a10" stop-opacity=".3"/></radialGradient>
<radialGradient id="ve-halo" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${R + 60}"><stop offset="${n(R / (R + 60) - 0.01)}" stop-color="var(--atmo)" stop-opacity=".4"/><stop offset="1" stop-color="var(--atmo)" stop-opacity="0"/></radialGradient>
${lambertGradient('ve-lam-d', 0, 0, R, L_DAY, '#7a5424', 0.5)}
${lambertGradient('ve-lam-n', 0, 0, R, L_NIGHT, '#120a02', 0.85)}
${rimGradient('ve-rim-d', 0, 0, R, L_DAY, 'var(--atmo)', 0.2)}
${rimGradient('ve-rim-n', 0, 0, R, L_NIGHT, 'var(--atmo)', 0.25)}
`

export const SPACE_VENUS: Look = {
  label: 'Venus',
  args: { colors: theme, backdrop: { scene: 'space-venus', glass: { blur: 26, opacity: 0.52 } } },
  problems,
  scene: svg(CSS + turnCSS(), DEFS, BODY),
}
