import type { ThemeSetArgs } from 'claude-code'

import { n, seeded, svg } from './kit'
import type { Pt } from './kit'
import { blades, bubble, butterfly, cloud, crestPath, crestY, groundPath, ribbon, seedPuff, star4, stop } from './aero-main-parts'
import type { Crest } from './aero-main-parts'
import { makeColors } from './make-colors.js'

// The archetypal Frutiger Aero wallpaper: a deep blue sky with big soft
// cumulus, a sunburst and lens flare high on the left, thin white ribbons
// sweeping across, and one wide close-cut lawn under it with sparkles along
// the crest. Clear soap bubbles drift up both sides and fine grass edges the
// bottom. Night keeps the place and turns it moonlit: stars, a moon where
// the sun was, teal lawn and teal and violet ribbons.
const { theme, problems } = makeColors({
  label: 'Aero',
  roles: {
    accent: '#2e9e44',
    danger: '#d3343c',
    success: '#2f8f5a',
    warning: '#d99a12',
    pro: '#1d8fd0',
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e2eef6',
        'surface-1': '#ebf4fa',
        'surface-2': '#f5f9fc',
        'text-primary': '#0f2a40',
        'text-secondary': '#2a4760',
        'text-muted': '#445f77',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a1828',
        'surface-1': '#0f2034',
        'surface-2': '#14283f',
        'surface-3': '#192f48',
        'text-primary': '#e6f2fb',
        'text-secondary': '#bcd3e6',
        'text-muted': '#91aec6',
      },
    },
  },
})

export const AERO_PROBLEMS = problems

export const AERO: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'aero', glass: { blur: 26, opacity: 0.5 } },
}

const SUN: Pt = [250, 170]

const FAR: Crest = { start: [-60, 680], segs: [[160, 640, 380, 632, 600, 660], [820, 688, 1000, 668, 1200, 654], [1380, 642, 1520, 656, 1660, 672]] }
const LAWN: Crest = { start: [-60, 712], segs: [[140, 650, 420, 640, 700, 700], [940, 752, 1180, 770, 1400, 742], [1520, 728, 1600, 724, 1660, 726]] }
const NEAR: Crest = { start: [-60, 884], segs: [[300, 836, 760, 846, 1080, 880], [1300, 902, 1500, 856, 1660, 834]] }
const yLawn = crestY(LAWN)

// ---- Sky ----
const sr = seeded(5)
const STARS = [0, 1].map(() => {
  let d = ''
  for (let k = 0; k < 36; k++) {
    const x = sr() * 1600
    const y = 40 + sr() * 560
    const r = sr() < 0.12 ? 1.6 : 0.6 + sr() * 0.6
    d += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`
  }

  return d
})

const RAYS = Array.from({ length: 18 }, (_, k) => {
  const a = (Math.PI * 2 * k) / 18 + 0.1
  const len = k % 2 === 0 ? 980 : 600
  const w = k % 3 === 0 ? 0.034 : 0.018
  const p = (d: number, ang: number): string => `${n(SUN[0] + d * Math.cos(ang))} ${n(SUN[1] + d * Math.sin(ang))}`

  return `M${p(0, a)}L${p(len, a - w)}L${p(len, a + w)}Z`
}).join('')

// Lens ghosts on the line from the sun through the frame's centre, kept to
// the two gutters so the chat column stays calm.
const FLARE = [
  { s: 0.22, r: 30 },
  { s: 1.62, r: 46 },
  { s: 1.85, r: 18 },
  { s: 2.1, r: 66 },
]
  .map(g => `<circle cx="${n(SUN[0] + 550 * g.s)}" cy="${n(SUN[1] + 350 * g.s)}" r="${g.r}" fill="url(#ghost)"/>`)
  .join('')
const HEX = (() => {
  const [x, y] = [SUN[0] + 550 * 0.36, SUN[1] + 350 * 0.36]

  return `M${Array.from({ length: 6 }, (_, k) => `${n(x + 13 * Math.cos((Math.PI / 3) * k))} ${n(y + 13 * Math.sin((Math.PI / 3) * k))}`).join('L')}Z`
})()

// Cumulus: the big one owns the right gutter, a smaller one sits under the
// sun, low banks lie along the horizon behind the lawn.
const CLOUDS_HIGH = [cloud(1380, 290, 500, 270, 3), cloud(150, 440, 420, 150, 9), cloud(800, 112, 320, 58, 17), cloud(1530, 560, 300, 100, 21)]
const CLOUDS_LOW = [cloud(830, 612, 900, 70, 31), cloud(240, 622, 380, 60, 41)]

const RIBBONS =
  ribbon([[-160, 600], [300, 420], [900, 560], [1760, 180]], 34, 'ra') +
  ribbon([[-160, 646], [360, 474], [980, 606], [1760, 244]], 14, 'rb') +
  ribbon([[-160, 560], [260, 382], [860, 522], [1760, 120]], 8, 'rc')

// ---- Light on the lawn ----
const lr = seeded(77)
const gutterX = (): number => (lr() < 0.5 ? lr() * 470 : 1130 + lr() * 470)

const SPARKLES = [0, 1, 2]
  .map(g => {
    let d = ''
    for (let k = 0; k < 9; k++) {
      const x = gutterX()
      const y = k < 6 ? yLawn(x) - 6 + (lr() - 0.6) * 40 : 200 + lr() * 380
      d += star4(x, y, 3 + lr() * 6)
    }

    return `<path d="${d}" class="spk" style="animation-duration:${7 + g * 2.5}s;animation-delay:-${g * 3}s"/>`
  })
  .join('')

const BOKEH = [0, 1, 2]
  .map(g => {
    let c = ''
    for (let k = 0; k < 5; k++) {
      const x = gutterX()
      const y = lr() < 0.6 ? yLawn(x) - 30 + lr() * 50 : 120 + lr() * 260
      c += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(8 + lr() * 26)}" fill="url(#bokeh)"/>`
    }

    return `<g class="bk" style="animation-duration:${16 + g * 5}s;animation-delay:-${g * 6}s">${c}</g>`
  })
  .join('')

// ---- Grass fringe: short in the middle, taller toward the corners. ----
const fringeH = (x: number): number => {
  const d = Math.abs(x - 800)

  return d < 330 ? 60 : Math.min(150, 60 + (d - 330) * 0.24)
}
const FRINGE = [
  [-60, 520, 110, 1],
  [520, 1080, 80, 2],
  [1080, 1660, 110, 3],
]
  .map(([x0, x1, count, seed], i) => {
    const tones = blades(seed!, count!, x0!, x1!, fringeH, 3)

    return `<g class="sway" style="animation-duration:${7 + i}s;animation-delay:-${i * 2}s">${tones.map((d, t) => `<path d="${d}" class="gr${t}"/>`).join('')}</g>`
  })
  .join('')

// ---- Bubbles ----
type Bub = { x: number; r: number; dur: number; delay: number; sway: number }

const bubbles = (list: readonly Bub[]): string =>
  list
    .map(
      b =>
        `<g transform="translate(${b.x} ${1000 + b.r + 20})"><g class="rise" style="animation-duration:${b.dur}s;animation-delay:-${b.delay}s">` +
        `<g class="wob" style="animation-duration:${n(b.dur / 6)}s;--sway:${b.sway}px">${bubble(b.r)}</g></g></g>`,
    )
    .join('')

const FAR_BUBBLES = bubbles([
  { x: 90, r: 22, dur: 30, delay: 4, sway: 18 },
  { x: 310, r: 15, dur: 26, delay: 15, sway: -14 },
  { x: 420, r: 11, dur: 22, delay: 9, sway: 10 },
  { x: 1210, r: 17, dur: 27, delay: 20, sway: 14 },
  { x: 1330, r: 28, dur: 34, delay: 6, sway: -20 },
  { x: 1520, r: 13, dur: 24, delay: 12, sway: 12 },
])

const NEAR_BUBBLES = bubbles([
  { x: 190, r: 76, dur: 52, delay: 30, sway: 30 },
  { x: 1450, r: 92, dur: 60, delay: 12, sway: -32 },
  { x: 1250, r: 52, dur: 44, delay: 36, sway: 26 },
])

const SEEDS = [
  { x: 40, y: 860, dur: 30, delay: 0 },
  { x: 140, y: 800, dur: 34, delay: 11 },
  { x: 230, y: 880, dur: 28, delay: 19 },
  { x: 90, y: 740, dur: 36, delay: 25 },
]
  .map(s => `<g transform="translate(${s.x} ${s.y})"><g class="drift" style="animation-duration:${s.dur}s;animation-delay:-${s.delay}s">${seedPuff()}</g></g>`)
  .join('')

const CSS = `
:root, svg {
  --sky-0:#1257c0; --sky-1:#2d8ce6; --sky-2:#8fd0f6; --sky-3:#e4f6ff;
  --night:0;
  --sun-a:#fffbe8; --sun-b:#fff2c4; --sun-disc:#ffffff; --halo:1; --ray-op:.6; --flare:#e8ffd8;
  --cl-hi:#ffffff; --cl-mid:#e4edf7; --cl-lo:#a9c2de;
  --far-a:#94d47e; --far-b:#bfe8a8;
  --hill-a:#b8ec5c; --hill-b:#5cbc3a; --hill-c:#1f7d36;
  --near-a:#7ed244; --near-b:#3a9a30; --near-c:#146a2e;
  --crest:#f4ffc4; --crest-op:.55; --sheen:#fbffd8; --sheen-op:.5;
  --rib-a:#ffffff; --rib-b:#c8f2ff; --rib-body:.32; --rib-edge:.9;
  --gr0:#2c8a2a; --gr1:#4fae34; --gr2:#8fd24c;
  --spark:#ffffff; --bokeh:#ffffff;
  --bub-tint:#bfe8ff; --bub-refl:#c8f07a; --bub-op:1;
  --bf-a:#7fe0ff; --bf-b:#2a7fe0; --bf-body:#1d3a5a; --seed:#ffffff;
  --vig:.16;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --sky-0:#020a1e; --sky-1:#06204a; --sky-2:#0d4668; --sky-3:#1a6a7c;
    --night:1;
    --sun-a:#e4f2ff; --sun-b:#8fc8ff; --sun-disc:#eef6ff; --halo:.4; --ray-op:.12; --flare:#8fe8ff;
    --cl-hi:#7a95c0; --cl-mid:#6680ab; --cl-lo:#1c3156;
    --far-a:#123a50; --far-b:#0f3048;
    --hill-a:#2a7a6c; --hill-b:#0f4440; --hill-c:#041e22;
    --near-a:#1c5e54; --near-b:#0a3436; --near-c:#02161a;
    --crest:#8fe8ff; --crest-op:.3; --sheen:#8fe8ff; --sheen-op:.18;
    --rib-a:#55f8d6; --rib-b:#9a7cff; --rib-body:.3; --rib-edge:.85;
    --gr0:#03181a; --gr1:#0a2e30; --gr2:#1d5a54;
    --spark:#bff4ff; --bokeh:#7fdcff;
    --bub-tint:#8fdcff; --bub-refl:#3d8a84; --bub-op:.8;
    --bf-a:#8fe8ff; --bf-b:#3a5ec0; --bf-body:#0a1a2a; --seed:#cfe8f4;
    --vig:.24;
  }
}
.stars { fill: #eaf6ff; fill-opacity: var(--night); animation: twinkle 9s ease-in-out infinite; }
.stars + .stars { animation-duration: 13s; animation-delay: -5s; }
.halo { opacity: var(--halo); }
.rays { fill: url(#rayG); opacity: var(--ray-op); transform-origin: ${SUN[0]}px ${SUN[1]}px; animation: spin 360s linear infinite; }
.glow { transform-origin: ${SUN[0]}px ${SUN[1]}px; animation: sunp 10s ease-in-out infinite; }
@keyframes sunp { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .8; transform: scale(.94); } }
.cross { fill: var(--sun-disc); fill-opacity: .55; }
.crater { fill: #7f9cc2; fill-opacity: calc(var(--night) * .35); }
.flare { fill: var(--flare); fill-opacity: .14; }
.drift-a { animation: cdrift 110s ease-in-out infinite alternate; }
.drift-b { animation: cdrift 150s ease-in-out infinite alternate-reverse; }
@keyframes cdrift { from { transform: translateX(-50px); } to { transform: translateX(50px); } }
.rib-body { fill: url(#ribG); fill-opacity: var(--rib-body); }
.rib-edge { fill: none; stroke: url(#ribG); stroke-width: 1.6; stroke-opacity: var(--rib-edge); stroke-linecap: round; }
.rib { transform-origin: 800px 500px; }
.ra { animation: ribA 26s ease-in-out infinite alternate; }
.rb { animation: ribB 33s ease-in-out infinite alternate; }
.rc { animation: ribA 29s ease-in-out infinite alternate-reverse; }
@keyframes ribA { from { transform: translate(-30px, 10px) rotate(-.8deg); } to { transform: translate(26px, -12px) rotate(.8deg); } }
@keyframes ribB { from { transform: translate(24px, -6px) rotate(.6deg); } to { transform: translate(-26px, 10px) rotate(-.6deg); } }
.crest { fill: none; stroke: var(--crest); stroke-opacity: var(--crest-op); stroke-linecap: round; }
.sheen { fill: url(#sheen); }
.spk { fill: var(--spark); animation: spk ease-in-out infinite; }
@keyframes spk { 0%,100% { opacity: .95; } 50% { opacity: .15; } }
.bk { animation: bk ease-in-out infinite alternate; }
@keyframes bk { from { transform: translate(-12px, 8px); } to { transform: translate(12px, -10px); } }
.gr0 { fill: var(--gr0); } .gr1 { fill: var(--gr1); } .gr2 { fill: var(--gr2); }
.sway { transform-box: fill-box; transform-origin: 50% 100%; animation: sway ease-in-out infinite alternate; }
@keyframes sway { from { transform: skewX(-3deg); } to { transform: skewX(2.5deg); } }
.rise { animation: rise linear infinite; }
@keyframes rise { from { transform: translateY(0); } to { transform: translateY(-1300px); } }
.wob { animation: wob ease-in-out infinite alternate; }
@keyframes wob { from { transform: translateX(calc(var(--sway) * -1)) scale(1.03, .97); } to { transform: translateX(var(--sway)) scale(.97, 1.03); } }
.bubbles { opacity: var(--bub-op); }
.bub-film { fill: none; stroke: url(#bubI); stroke-opacity: .5; }
.bub-hi { fill: #ffffff; fill-opacity: .6; }
.bub-hot { fill: #ffffff; fill-opacity: .95; }
.bub-refl { fill: var(--bub-refl); fill-opacity: .35; }
.fly { animation: fly 40s ease-in-out infinite alternate; }
@keyframes fly { 0% { transform: translate(0, 0); } 25% { transform: translate(-90px, -50px); } 50% { transform: translate(-30px, -110px); } 75% { transform: translate(60px, -70px); } 100% { transform: translate(110px, -10px); } }
.wing { animation: flap .7s ease-in-out infinite alternate; }
@keyframes flap { from { transform: scaleX(1); } to { transform: scaleX(.35); } }
.bf-w { fill: url(#wingG); }
.bf-b { fill: var(--bf-body); }
.seed { fill: none; stroke: var(--seed); stroke-width: .8; stroke-opacity: .85; stroke-linecap: round; }
.drift { animation: seed linear infinite; }
@keyframes seed {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translate(190px, -170px) rotate(14deg); }
  85% { opacity: 1; }
  100% { transform: translate(380px, -290px) rotate(-8deg); opacity: 0; }
}
`

const DEFS =
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stop(0, 'sky-0')}${stop(0.36, 'sky-1')}${stop(0.6, 'sky-2')}${stop(0.72, 'sky-3')}</linearGradient>` +
  `<radialGradient id="halo" cx="${SUN[0]}" cy="${SUN[1]}" r="640" gradientUnits="userSpaceOnUse">${stop(0, 'sun-a', 0.95)}${stop(0.1, 'sun-b', 0.55)}${stop(0.4, 'sun-a', 0.14)}${stop(1, 'sun-a', 0)}</radialGradient>` +
  `<radialGradient id="core">${stop(0, 'sun-disc')}${stop(0.5, 'sun-a', 0.8)}${stop(1, 'sun-b', 0)}</radialGradient>` +
  `<radialGradient id="rayG" cx="${SUN[0]}" cy="${SUN[1]}" r="980" gradientUnits="userSpaceOnUse">${stop(0, 'sun-a', 0.6)}${stop(0.35, 'sun-a', 0.16)}${stop(1, 'sun-a', 0)}</radialGradient>` +
  `<radialGradient id="ghost">${stop(0, 'flare', 0.05)}${stop(0.7, 'flare', 0.12)}${stop(0.9, 'flare', 0.3)}${stop(1, 'flare', 0)}</radialGradient>` +
  `<radialGradient id="puff" fx=".4" fy=".36">${stop(0, 'cl-hi')}${stop(0.55, 'cl-hi')}${stop(0.8, 'cl-mid', 0.7)}${stop(1, 'cl-mid', 0)}</radialGradient>` +
  `<radialGradient id="puffLo">${stop(0, 'cl-lo', 0.75)}${stop(0.5, 'cl-lo', 0.55)}${stop(1, 'cl-lo', 0)}</radialGradient>` +
  `<linearGradient id="ribG" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">${stop(0, 'rib-b', 0.9)}${stop(0.26, 'rib-a', 1)}${stop(0.38, 'rib-a', 0.2)}${stop(0.62, 'rib-a', 0.2)}${stop(0.74, 'rib-a', 1)}${stop(1, 'rib-b', 0.9)}</linearGradient>` +
  `<linearGradient id="far" x1="0" y1="0" x2="0" y2="1">${stop(0, 'far-a')}${stop(0.5, 'far-b')}</linearGradient>` +
  `<linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">${stop(0, 'hill-a')}${stop(0.32, 'hill-b')}${stop(1, 'hill-c')}</linearGradient>` +
  `<linearGradient id="near" x1="0" y1="0" x2="0" y2="1">${stop(0, 'near-a', 0)}${stop(0.25, 'near-b', 0.7)}${stop(1, 'near-c', 0.95)}</linearGradient>` +
  '<linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".16"/><stop offset=".45" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#002a10" stop-opacity=".18"/></linearGradient>' +
  `<radialGradient id="sheen">${stop(0, 'sheen', 'var(--sheen-op)')}${stop(1, 'sheen', 0)}</radialGradient>` +
  `<radialGradient id="bokeh">${stop(0, 'bokeh', 0.3)}${stop(0.75, 'bokeh', 0.2)}${stop(0.92, 'bokeh', 0.32)}${stop(1, 'bokeh', 0)}</radialGradient>` +
  `<radialGradient id="bubB">${stop(0, 'bub-tint', 0.02)}${stop(0.72, 'bub-tint', 0.07)}${stop(0.9, 'bub-tint', 0.22)}<stop offset=".97" stop-color="#ffffff" stop-opacity=".6"/><stop offset="1" stop-color="#ffffff" stop-opacity=".1"/></radialGradient>` +
  '<linearGradient id="bubI" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ad5"/><stop offset=".25" stop-color="#fff27a"/><stop offset=".5" stop-color="#8affc1"/><stop offset=".75" stop-color="#7fd8ff"/><stop offset="1" stop-color="#b59aff"/></linearGradient>' +
  `<linearGradient id="wingG" x1="0" y1="0" x2="1" y2="1">${stop(0, 'bf-b')}${stop(0.7, 'bf-a')}<stop offset="1" stop-color="#ffffff"/></linearGradient>` +
  '<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#001020" stop-opacity="0"/><stop offset="1" stop-color="#001020" stop-opacity="1"/></radialGradient>'

const SUN_G =
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="640" fill="url(#halo)" class="halo"/>` +
  `<path d="${RAYS}" class="rays"/>` +
  `<g class="glow"><circle cx="${SUN[0]}" cy="${SUN[1]}" r="110" fill="url(#core)"/>` +
  `<path d="M${SUN[0] - 170} ${SUN[1]}Q${SUN[0]} ${SUN[1] - 3} ${SUN[0] + 170} ${SUN[1]}Q${SUN[0]} ${SUN[1] + 3} ${SUN[0] - 170} ${SUN[1]}ZM${SUN[0]} ${SUN[1] - 100}Q${SUN[0] + 3} ${SUN[1]} ${SUN[0]} ${SUN[1] + 100}Q${SUN[0] - 3} ${SUN[1]} ${SUN[0]} ${SUN[1] - 100}Z" class="cross"/></g>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="30" style="fill:var(--sun-disc)"/>` +
  `<path d="M${SUN[0] - 2} ${SUN[1] - 8}a7 7 0 1 0 0.1 0ZM${SUN[0] + 12} ${SUN[1] + 9}a5 5 0 1 0 0.1 0ZM${SUN[0] - 12} ${SUN[1] + 12}a3.5 3.5 0 1 0 0.1 0Z" class="crater"/>`

const lawnD = groundPath(LAWN)

const BODY =
  `<rect width="1600" height="1000" fill="url(#sky)"/>` +
  STARS.map(d => `<path d="${d}" class="stars"/>`).join('') +
  SUN_G +
  `<g class="drift-b">${CLOUDS_LOW.join('')}</g><g class="drift-a">${CLOUDS_HIGH.join('')}</g>` +
  RIBBONS +
  `<path d="${groundPath(FAR)}" fill="url(#far)"/>` +
  `<path d="${lawnD}" fill="url(#lawn)"/>` +
  `<path d="${lawnD}" fill="url(#side)"/>` +
  `<ellipse cx="270" cy="716" rx="360" ry="62" class="sheen"/><ellipse cx="1420" cy="792" rx="320" ry="56" class="sheen"/>` +
  `<path d="${crestPath(LAWN)}" class="crest" stroke-width="10" transform="translate(0 6)"/>` +
  `<path d="${crestPath(LAWN)}" class="crest" stroke-width="2.2" transform="translate(0 1.5)"/>` +
  `<path d="${groundPath(NEAR)}" fill="url(#near)"/>` +
  BOKEH +
  SPARKLES +
  `<g class="bubbles">${FAR_BUBBLES}</g>` +
  SEEDS +
  `<g transform="translate(1390 720) scale(1.5)"><g class="fly">${butterfly()}</g></g>` +
  FRINGE +
  `<g class="bubbles">${NEAR_BUBBLES}</g>` +
  `<path d="${HEX}" class="flare"/>${FLARE}` +
  `<rect width="1600" height="1000" fill="url(#vig)" style="opacity:var(--vig)"/>`

export const AERO_SCENE = svg(CSS, DEFS, BODY)
