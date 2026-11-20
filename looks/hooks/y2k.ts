import { makeColors } from './make-colors.js'
import { blob, bloom, grade, layer, n, orb, risingOrbs, seeded, speckle, svg, type Rising } from './kit'
import type { Look } from './look'

// Millennium futurism: liquid chrome blobs that wobble and reflect a sky,
// a dark horizon and a floor, translucent candy plastic, a holographic disc,
// a chrome planet with a turning ring and an orbiting moon, sparkles and a
// perspective wireframe floor on pearly white. Night turns it to deep space,
// with the chrome reflecting neon and the grid glowing.
const { theme, problems } = makeColors({
  label: 'Y2K',
  codeTheme: { light: 'catppuccin-latte', dark: 'tokyo-night' },
  roles: { accent: '#7b4dff', danger: '#d8323c', success: '#21a05a', warning: '#b97c00', pro: '#e0379a' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#edecf6',
        'surface-1': '#f3f2f9',
        'surface-2': '#f9f8fd',
        'text-primary': '#1b1934',
        'text-secondary': '#3b385c',
        'text-muted': '#55527a',
      },
    },
  },
  dark: {
    roles: { pro: '#ff5fc8' },
    gray: {
      anchors: {
        'surface-0': '#070919',
        'surface-1': '#0d1024',
        'surface-2': '#12162e',
        'surface-3': '#171b36',
        'text-primary': '#eef0ff',
        'text-secondary': '#c5c9e6',
        'text-muted': '#9ca1c4',
      },
    },
  },
})

const rand = seeded(2000)
const HY = 600

// ---- Liquid chrome ---------------------------------------------------------

// Chrome is an environment reflected in a curved mirror. Each blob is drawn
// as: the sky gradient over its whole body; inside it, the ground seen as a
// big ellipse whose top edge is the bent horizon, darkest along that edge;
// a hard bright band just above the horizon; a crisp key highlight at the
// upper left; a dark fresnel rim; and an iridescent sheen sliding across.
// The outline itself morphs between two shapes (SMIL on the path data),
// and the reflections inside drift a little, so the metal looks liquid.
let blobId = 0
const DEFS_EXTRA: string[] = []

type Chrome = { x: number; y: number; rx: number; ry: number; seed: number; dur: number; still?: boolean }

function chrome(c: Chrome): string {
  const id = `y2b${blobId++}`
  const { x, y, rx, ry } = c
  const d1 = c.still ? '' : blob(x, y, rx, ry, c.seed, 0.07, 9)
  const d2 = c.still ? '' : blob(x, y, rx * 1.03, ry * 0.97, c.seed + 5, 0.08, 9)
  DEFS_EXTRA.push(
    c.still
      ? `<circle id="${id}" cx="${x}" cy="${y}" r="${rx}"/>`
      : `<path id="${id}" d="${d1}"><animate attributeName="d" dur="${c.dur}s" repeatCount="indefinite" values="${d1};${d2};${d1}" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"/></path>`,
    `<clipPath id="${id}c"><use href="#${id}"/></clipPath>`,
  )
  const gy = y + ry * 0.12
  const st = `style="animation-duration:${n(c.dur * 1.3)}s;animation-delay:-${n(c.dur * 0.4)}s"`

  return (
    `<use href="#${id}" fill="url(#y2-env)"/>` +
    `<g clip-path="url(#${id}c)">` +
    `<g class="flow" ${st}>` +
    `<ellipse cx="${x}" cy="${n(gy + ry * 0.72)}" rx="${n(rx * 1.1)}" ry="${n(ry * 0.72)}" fill="url(#y2-ground)"/>` +
    `<ellipse cx="${x}" cy="${n(gy + ry * 0.72)}" rx="${n(rx * 1.1)}" ry="${n(ry * 0.72)}" fill="none" stroke="var(--env-hz)" stroke-width="${n(ry * 0.08)}"/>` +
    `<ellipse cx="${x}" cy="${n(gy + ry * 0.72)}" rx="${n(rx * 1.15)}" ry="${n(ry * 0.8)}" fill="none" stroke="var(--env-kick)" stroke-opacity=".95" stroke-width="${n(Math.max(1.5, ry * 0.035))}"/>` +
    `<ellipse cx="${x}" cy="${n(gy + ry * 0.72)}" rx="${n(rx * 1.4)}" ry="${n(ry * 1.2)}" fill="none" stroke="var(--env-kick)" stroke-opacity=".35" stroke-width="${n(Math.max(1, ry * 0.05))}"/>` +
    `<ellipse cx="${n(x + rx * 0.3)}" cy="${n(y + ry * 0.6)}" rx="${n(rx * 0.3)}" ry="${n(ry * 0.07)}" fill="#fff" fill-opacity=".5"/>` +
    `</g>` +
    `<g class="sheen" ${st}><rect x="${n(x - rx * 2.2)}" y="${n(y - ry)}" width="${n(rx * 1.6)}" height="${n(ry * 2)}" fill="url(#y2-iri)" transform="skewX(-24)"/></g>` +
    `<use href="#${id}" fill="none" stroke="url(#y2-fresnel)" stroke-width="${n(Math.min(rx, ry) * 0.24)}"/>` +
    `<ellipse cx="${n(x - rx * 0.36)}" cy="${n(y - ry * 0.48)}" rx="${n(rx * 0.3)}" ry="${n(ry * 0.15)}" transform="rotate(-32 ${n(x - rx * 0.36)} ${n(y - ry * 0.48)})" fill="#fff"/>` +
    `<ellipse cx="${n(x - rx * 0.08)}" cy="${n(y - ry * 0.7)}" rx="${n(rx * 0.12)}" ry="${n(ry * 0.05)}" fill="#fff" fill-opacity=".8"/>` +
    `</g>` +
    `<use href="#${id}" fill="none" stroke="url(#y2-chrome-rim)" stroke-width="1.4"/>`
  )
}

// A cluster of blobs bobbing together; the biggest drawn last, in front.
function cluster(list: readonly Chrome[], dur: number, delay: number, id = ''): string {
  return (
    `<g ${id ? `id="${id}"` : ''} class="float" style="animation-duration:${dur}s;animation-delay:-${delay}s">` +
    list.map(c => `<g class="wob" style="animation-duration:${n(c.dur * 0.8)}s;animation-delay:-${n(c.dur * 0.3)}s">${chrome(c)}</g>`).join('') +
    `</g>`
  )
}

// ---- Candy plastic ----------------------------------------------------------

// Translucent candy plastic: tinted body, a darker inner edge for thickness,
// a bright caustic where light leaves the far side, a rim, a crisp gloss
// band at the top and a reflection that slides across now and then.
let plasticId = 0
function plastic(d: string, kind: string, box: { x: number; y: number; w: number; h: number }, dur: number, delay: number): string {
  const { x, y, w, h } = box
  const id = `y2p${plasticId++}`
  DEFS_EXTRA.push(`<path id="${id}" d="${d}" fill-rule="evenodd"/><clipPath id="${id}c"><use href="#${id}" clip-rule="evenodd"/></clipPath>`)

  return (
    `<g class="float" style="animation-duration:${dur}s;animation-delay:-${delay}s">` +
    `<g class="blur-2"><ellipse cx="${n(x + w * 0.55)}" cy="${n(y + h + 26)}" rx="${n(w * 0.42)}" ry="10" class="shadow"/></g>` +
    `<use href="#${id}" fill="url(#y2-${kind})"/>` +
    `<g clip-path="url(#${id}c)">` +
    `<use href="#${id}" fill="url(#k-lo)"/>` +
    `<use href="#${id}" fill="none" stroke="url(#y2-inset)" stroke-width="30"/>` +
    `<use href="#${id}" fill="url(#y2-caustic)"/>` +
    `<use href="#${id}" fill="url(#k-hi)"/>` +
    `<use href="#${id}" fill="none" stroke="url(#k-rim)" stroke-width="7"/>` +
    `<g class="slide" style="animation-delay:-${delay * 2}s"><rect x="${n(x - w * 0.6)}" y="${n(y - 20)}" width="${n(w * 0.22)}" height="${n(h + 40)}" fill="url(#y2-band)" transform="skewX(-22)"/></g>` +
    `</g>` +
    `<use href="#${id}" fill="none" class="rim"/>` +
    `<ellipse cx="${n(x + w * 0.36)}" cy="${n(y + h * 0.2)}" rx="${n(w * 0.24)}" ry="${n(h * 0.07)}" transform="rotate(-24 ${n(x + w * 0.36)} ${n(y + h * 0.2)})" class="gloss"/>` +
    `</g>`
  )
}

// A rounded squircle with a round hole, like a translucent toy button.
const PEBBLE = 'M80 470 C 30 470 20 490 20 560 C 20 630 30 650 80 650 L 190 650 C 240 650 250 630 250 560 C 250 490 240 470 190 470 Z M135 560 m -34 0 a 34 34 0 1 0 68 0 a 34 34 0 1 0 -68 0 Z'
// A tilted capsule.
const PILL = 'M1046 132 L 1150 72 C 1180 55 1210 92 1180 112 L 1076 172 C 1046 190 1016 150 1046 132 Z'
// A soft four-lobed star.
const FLOWER =
  'M330 700 C 355 700 360 760 362 772 C 374 774 434 780 434 806 C 434 832 374 836 362 840 C 360 852 355 912 330 912 C 305 912 300 852 298 840 C 286 836 226 832 226 806 C 226 780 286 774 298 772 C 300 760 305 700 330 700 Z'

// ---- Sparkles, grid, stars -------------------------------------------------

// Four-point starbursts that twinkle and turn.
const STAR = 'M0 -1 C .08 -.12 .12 -.08 1 0 C .12 .08 .08 .12 0 1 C -.08 .12 -.12 .08 -1 0 C -.12 -.08 -.08 -.12 0 -1 Z'

const SPARKS: readonly (readonly [number, number, number])[] = [
  [140, 120, 26], [420, 90, 14], [330, 330, 18], [60, 400, 12], [210, 720, 20], [470, 560, 10],
  [1250, 70, 16], [1530, 120, 22], [1230, 380, 12], [1560, 430, 14], [1340, 690, 24], [1180, 600, 10],
  [700, 60, 9], [930, 110, 11], [1480, 840, 12], [90, 860, 14],
]

const sparks = SPARKS.map(
  ([x, y, s], i) =>
    `<g transform="translate(${x} ${y})"><g class="spark" style="animation-duration:${n(3 + (i % 5) * 0.9)}s;animation-delay:-${n(rand() * 5)}s">` +
    `<circle r="${n(s * 0.9)}" fill="url(#y2-spark-glow)"/>` +
    `<path d="${STAR}" transform="scale(${s})" fill="url(#y2-spark)"/>` +
    `<path d="${STAR}" transform="scale(${n(s * 0.45)}) rotate(45)" fill="url(#y2-spark)" fill-opacity=".7"/></g></g>`,
).join('')

// The perspective floor: rays to the vanishing point and depth lines spaced
// by 1/z.
const gridD = (() => {
  let d = ''

  for (let i = -24; i <= 24; i++) {
    const xb = 800 + i * 150
    const t = 12 / (1000 - HY)
    d += `M${n(800 + (xb - 800) * t)} ${HY + 12}L${n(xb)} 1000`
  }
  for (let k = 0; k < 15; k++) {
    const y = HY + (1000 - HY) / Math.pow(1.32, k)
    d += `M-100 ${n(y)}H1700`
  }

  return d
})()

const stars = Array.from({ length: 70 }, () => {
  const x = rand() * 1600
  const y = rand() * 560

  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.5 + rand() * 1.2)}" fill-opacity="${n(0.3 + rand() * 0.7)}"/>`
}).join('')

const BUBBLES: readonly Rising[] = [
  { x: 120, r: 22, dur: 26, delay: 3, sway: 22 },
  { x: 300, r: 14, dur: 20, delay: 12, sway: -16 },
  { x: 1290, r: 18, dur: 23, delay: 7, sway: 18 },
  { x: 1500, r: 28, dur: 30, delay: 17, sway: -24 },
  { x: 1420, r: 12, dur: 18, delay: 1, sway: 12 },
]

const CSS = `
:root, svg {
  --bg-a:#fbfaff; --bg-b:#eef1fb; --bg-c:#f6eef7; --bg-d:#eaf2fa;
  --iri-1:#cbb8ff; --iri-2:#a6ecf2; --iri-3:#ffc4e6; --iri-4:#d8f0ff; --iri-op:.75;
  --grid:#8d93d6; --grid-op:.55; --hz:#ffffff; --hz-2:#c7b6ff; --scan:#ffffff;
  --sp-a:#ffffff; --sp-b:#8f7dff; --sp-glow:#a58cff; --sp-glow-op:.55;
  --pink-a:#ffd0ea; --pink-b:#ff79bf; --aqua-a:#d4fbff; --aqua-b:#46c9e0; --lilac-a:#ebe0ff; --lilac-b:#9d7cff;
  --pl-op:.66; --rim:#ffffff; --rim-op:.8; --gloss:#ffffff; --caustic:#ffffff; --shadow:#5a5aa0; --shadow-op:.18; --inset:#3a2a7a;
  --ring-a:#ffffff; --ring-b:#b6a0ff; --ring-c:#7fe3f0; --ring-d:#ffa6d6; --moon-a:#ffffff; --moon-b:#c9c3ef;
  --disc-a:#f4f2ff; --disc-b:#c9b5ff; --disc-c:#9ff0f5; --disc-d:#ffc2e4; --disc-e:#fff6c8;
  --star:#ffffff; --star-op:0; --orb-tint:#9fc8ff; --orb-core:#ffffff; --veil:#ffffff; --veil-op:.35;
  --env-sky0:#525cae; --env-sky1:#c4ccff; --env-sky2:#ffffff; --env-hz:#2a1d5c; --env-gr0:#5a4c9a; --env-gr1:#b9b0e8; --env-gr2:#f4f0ff; --env-kick:#ffffff;
  --fres:#1c1446; --fres-op:.55; --sheen-op:.5; --grain:#6a5aa0;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg-a:#0a0d2c; --bg-b:#05061a; --bg-c:#0b0620; --bg-d:#060a22;
    --iri-1:#5b2fb8; --iri-2:#0f6c8c; --iri-3:#8a1f6e; --iri-4:#1b2a7a; --iri-op:.55;
    --grid:#ff4fd8; --grid-op:.85; --hz:#ff6fe0; --hz-2:#46e6ff; --scan:#9ff6ff;
    --sp-a:#ffffff; --sp-b:#8ff0ff; --sp-glow:#6fd8ff; --sp-glow-op:.55;
    --pink-a:#ff8fd0; --pink-b:#c0187c; --aqua-a:#8ff6ff; --aqua-b:#0a7a9c; --lilac-a:#c8a8ff; --lilac-b:#5228c0;
    --pl-op:.72; --rim:#ffd6f4; --rim-op:.65; --gloss:#ffffff; --caustic:#ffe0ff; --shadow:#ff4fd8; --shadow-op:.2; --inset:#12062e;
    --ring-a:#ffffff; --ring-b:#ff5fd0; --ring-c:#46e6ff; --ring-d:#8a6cff; --moon-a:#e6f6ff; --moon-b:#4a5ab8;
    --disc-a:#2a2e6a; --disc-b:#8a4cff; --disc-c:#2ad6e8; --disc-d:#ff4fb8; --disc-e:#ffe27a;
    --star:#dfe8ff; --star-op:1; --orb-tint:#ff7ae0; --orb-core:#6fd8ff; --veil:#05061a; --veil-op:.3;
    --env-sky0:#120a40; --env-sky1:#5a2aa8; --env-sky2:#ff7ae6; --env-hz:#04030f; --env-gr0:#1a0f4a; --env-gr1:#7a2fb8; --env-gr2:#5ff0ff; --env-kick:#9ffaff;
    --fres:#020210; --fres-op:.75; --sheen-op:.4; --grain:#9fb0ff;
  }
}
.float { animation: float ease-in-out infinite alternate; }
@keyframes float { from { transform: translate(-6px, 8px); } to { transform: translate(6px, -10px); } }
.wob { transform-box: fill-box; transform-origin: center; animation: wob ease-in-out infinite alternate; }
@keyframes wob { from { transform: scale(1.025, .975) translate(-2px, 1px); } to { transform: scale(.975, 1.03) translate(2px, -2px); } }
.flow { animation: flow ease-in-out infinite alternate; }
@keyframes flow { from { transform: translate(-6px, 3px); } to { transform: translate(7px, -4px); } }
.sheen { opacity: var(--sheen-op); mix-blend-mode: screen; animation: sheen ease-in-out infinite; }
@keyframes sheen { 0% { transform: translateX(0); } 55%, 100% { transform: translateX(520px); } }
.slide { animation: slide 14s ease-in-out infinite; }
@keyframes slide { 0%, 65% { transform: translateX(0); } 100% { transform: translateX(560px); } }
.spark { transform-box: fill-box; transform-origin: center; animation: spark ease-in-out infinite; }
@keyframes spark { 0%, 100% { transform: scale(.45) rotate(0deg); opacity: .25; } 50% { transform: scale(1) rotate(45deg); opacity: 1; } }
.grid { fill: none; stroke: var(--grid); stroke-opacity: var(--grid-op); stroke-width: 1.3; }
.scan { animation: scan 7s cubic-bezier(.55, 0, .9, .6) infinite; }
@keyframes scan { from { transform: translateY(0); } to { transform: translateY(420px); } }
.shadow { fill: var(--shadow); fill-opacity: var(--shadow-op); }
.rim { stroke: var(--rim); stroke-opacity: var(--rim-op); stroke-width: 2; }
.gloss { fill: var(--gloss); fill-opacity: .8; }
.stars { fill: var(--star); opacity: var(--star-op); }
.ring-turn { animation: ring 12s linear infinite; }
@keyframes ring { to { stroke-dashoffset: -400; } }
.dash { stroke-dasharray: 60 900; animation: dash 9s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -960; } }
.disc-spin { transform-box: fill-box; transform-origin: center; animation: spin 30s linear infinite; }
.iri { animation: iri ease-in-out infinite alternate; }
@keyframes iri { from { transform: translate(-40px, 20px) scale(.95); } to { transform: translate(40px, -24px) scale(1.06); } }
.holo { animation: holo 38s ease-in-out infinite alternate; }
@keyframes holo { from { transform: translate(-120px, 30px); } to { transform: translate(140px, -40px); } }
`

const stop = (o: number | string, v: string, op?: string): string =>
  `<stop offset="${o}" style="stop-color:var(${v})${op ? `;stop-opacity:${op}` : ''}"/>`

const DEFS_BASE =
  `<linearGradient id="y2-bg" x1="0" y1="0" x2=".4" y2="1">${stop(0, '--bg-a')}${stop(0.45, '--bg-b')}${stop(0.75, '--bg-c')}${stop(1, '--bg-d')}</linearGradient>` +
  // Chrome environment: sky above, ground below a dark horizon.
  `<linearGradient id="y2-env" x1="0" y1="0" x2=".1" y2="1">${stop(0, '--env-sky0')}${stop(0.16, '--env-sky0')}${stop(0.38, '--env-sky1')}${stop(0.54, '--env-sky2')}${stop(1, '--env-sky2')}</linearGradient>` +
  `<linearGradient id="y2-ground" x1="0" y1="0" x2="0" y2="1">${stop(0, '--env-hz')}${stop(0.04, '--env-gr0')}${stop(0.13, '--env-gr0')}${stop(0.26, '--env-gr1')}${stop(0.42, '--env-gr2')}</linearGradient>` +
  `<radialGradient id="y2-fresnel" cx=".38" cy=".32" r=".72">${stop(0.72, '--fres', '0')}${stop(1, '--fres', 'var(--fres-op)')}</radialGradient>` +
  `<linearGradient id="y2-chrome-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>` +
  `<linearGradient id="y2-iri" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9ad8" stop-opacity="0"/><stop offset=".3" stop-color="#ff9ad8" stop-opacity=".7"/><stop offset=".5" stop-color="#9ff6ff" stop-opacity=".75"/><stop offset=".7" stop-color="#c3a0ff" stop-opacity=".7"/><stop offset="1" stop-color="#c3a0ff" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="y2-i1" cx=".5" cy=".5" r=".5">${stop(0, '--iri-1', 'var(--iri-op)')}${stop(1, '--iri-1', '0')}</radialGradient>` +
  `<radialGradient id="y2-i2" cx=".5" cy=".5" r=".5">${stop(0, '--iri-2', 'var(--iri-op)')}${stop(1, '--iri-2', '0')}</radialGradient>` +
  `<radialGradient id="y2-i3" cx=".5" cy=".5" r=".5">${stop(0, '--iri-3', 'var(--iri-op)')}${stop(1, '--iri-3', '0')}</radialGradient>` +
  `<radialGradient id="y2-i4" cx=".5" cy=".5" r=".5">${stop(0, '--iri-4', 'var(--iri-op)')}${stop(1, '--iri-4', '0')}</radialGradient>` +
  `<linearGradient id="y2-holo" x1="0" y1="0" x2="0" y2="1">${stop(0, '--iri-3', '0')}${stop(0.3, '--iri-1', '.4')}${stop(0.5, '--iri-2', '.5')}${stop(0.7, '--iri-3', '.4')}${stop(1, '--iri-4', '0')}</linearGradient>` +
  `<linearGradient id="y2-pink" x1="0" y1="0" x2="1" y2="1">${stop(0, '--pink-a', 'var(--pl-op)')}${stop(1, '--pink-b', 'var(--pl-op)')}</linearGradient>` +
  `<linearGradient id="y2-aqua" x1="0" y1="0" x2="1" y2="1">${stop(0, '--aqua-a', 'var(--pl-op)')}${stop(1, '--aqua-b', 'var(--pl-op)')}</linearGradient>` +
  `<linearGradient id="y2-lilac" x1="0" y1="0" x2="1" y2="1">${stop(0, '--lilac-a', 'var(--pl-op)')}${stop(1, '--lilac-b', 'var(--pl-op)')}</linearGradient>` +
  `<linearGradient id="y2-inset" x1="0" y1="0" x2="1" y2="1">${stop(0.25, '--inset', '0')}${stop(1, '--inset', '.5')}</linearGradient>` +
  `<linearGradient id="y2-band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="y2-caustic" cx=".7" cy=".85" r=".5">${stop(0, '--caustic', '.6')}${stop(1, '--caustic', '0')}</radialGradient>` +
  `<radialGradient id="y2-spark" cx=".5" cy=".5" r=".5">${stop(0, '--sp-a')}${stop(0.5, '--sp-a')}${stop(1, '--sp-b')}</radialGradient>` +
  `<radialGradient id="y2-spark-glow" cx=".5" cy=".5" r=".5">${stop(0, '--sp-glow', 'var(--sp-glow-op)')}${stop(1, '--sp-glow', '0')}</radialGradient>` +
  `<linearGradient id="y2-ring" x1="0" y1="0" x2="1" y2="0">${stop(0, '--ring-b')}${stop(0.3, '--ring-a')}${stop(0.55, '--ring-c')}${stop(0.8, '--ring-d')}${stop(1, '--ring-b')}</linearGradient>` +
  `<radialGradient id="y2-moon" cx=".35" cy=".3" r=".7">${stop(0, '--moon-a')}${stop(0.6, '--moon-b')}${stop(1, '--moon-b')}</radialGradient>` +
  `<linearGradient id="y2-disc" x1="0" y1="0" x2="1" y2="1">${stop(0, '--disc-a')}${stop(0.22, '--disc-b')}${stop(0.42, '--disc-c')}${stop(0.6, '--disc-e')}${stop(0.78, '--disc-d')}${stop(1, '--disc-b')}</linearGradient>` +
  `<radialGradient id="y2-disc-r" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".5"/><stop offset=".34" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".1"/><stop offset=".96" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></radialGradient>` +
  `<linearGradient id="y2-hz" x1="0" y1="0" x2="1" y2="0">${stop(0, '--hz', '.9')}${stop(0.3, '--hz-2', '.35')}${stop(0.5, '--hz', '.12')}${stop(0.7, '--hz-2', '.35')}${stop(1, '--hz', '.9')}</linearGradient>` +
  `<radialGradient id="y2-hzg" cx=".5" cy=".5" r=".5">${stop(0, '--hz-2', '.45')}${stop(1, '--hz-2', '0')}</radialGradient>` +
  `<linearGradient id="y2-scan" x1="0" y1="0" x2="0" y2="1">${stop(0, '--scan', '0')}${stop(0.7, '--scan', '.9')}${stop(1, '--scan', '0')}</linearGradient>` +
  `<linearGradient id="y2-veil" x1="0" y1="0" x2="1" y2="0">${stop(0.2, '--veil', '0')}${stop(0.5, '--veil', 'var(--veil-op)')}${stop(0.8, '--veil', '0')}</linearGradient>` +
  '<linearGradient id="y2-fade-v" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".64" stop-color="#fff"/><stop offset=".8" stop-color="#fff" stop-opacity=".75"/><stop offset=".93" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<linearGradient id="y2-fade-h" x1="0" y1="0" x2="1" y2="0"><stop offset=".15" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity=".85"/><stop offset=".85" stop-color="#000" stop-opacity="0"/></linearGradient>' +
  '<mask id="y2-floor" maskUnits="userSpaceOnUse" x="-100" y="0" width="1800" height="1000"><rect x="-100" width="1800" height="1000" fill="url(#y2-fade-v)"/><rect width="1600" height="1000" fill="url(#y2-fade-h)"/></mask>' +
  `<mask id="y2-lines" maskUnits="userSpaceOnUse" x="-100" y="0" width="1800" height="1000"><path d="${gridD}" fill="none" stroke="#fff" stroke-width="2.4"/></mask>` +
  `<linearGradient id="y2-rfade" x1="0" y1="870" x2="0" y2="1000" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  '<mask id="y2-refl" maskUnits="userSpaceOnUse" x="1000" y="870" width="700" height="130"><rect x="1000" y="870" width="700" height="130" fill="url(#y2-rfade)"/></mask>' +
  '<clipPath id="y2-front"><rect x="1100" y="210" width="560" height="200"/></clipPath>' +
  '<clipPath id="y2-back"><rect x="1100" y="0" width="560" height="210"/></clipPath>' +
  speckle('y2-grain', 31, 'var(--grain)', 139, 50, 0.7, 0.12)

// ---- The chrome planet -------------------------------------------------------

// The planet at the top right: a chrome sphere with a ring whose dashes
// run round it, so it turns, and a moon on an orbit. The ring's back half is
// drawn behind the planet, its front half over it; the moon has a copy on
// each side and the front one only shows on the near half of the orbit.
const PX = 1380
const PY = 210
const orbit = 'M170 0 A170 44 0 1 1 -170 0 A170 44 0 1 1 170 0'
const ringBand =
  `<g transform="translate(${PX} ${PY}) rotate(-16)">` +
  `<ellipse rx="170" ry="44" fill="none" stroke="url(#y2-ring)" stroke-width="10" stroke-opacity=".85"/>` +
  `<ellipse class="ring-turn" rx="170" ry="44" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="8" stroke-dasharray="2 13 1 21 5 17 1 30" pathLength="400"/>` +
  `<ellipse rx="170" ry="44" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"/>` +
  `<ellipse rx="190" ry="50" fill="none" stroke="url(#y2-ring)" stroke-width="2" stroke-opacity=".6"/>` +
  `<ellipse class="ring-turn" rx="190" ry="50" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".6" stroke-dasharray="40 160" pathLength="400" style="animation-duration:20s"/>` +
  `</g>`
const moon = (front: boolean): string =>
  `<g transform="translate(${PX} ${PY}) rotate(-16)"><g><animateMotion dur="16s" repeatCount="indefinite" path="${orbit}"/>` +
  (front ? `<animate attributeName="opacity" dur="16s" repeatCount="indefinite" calcMode="discrete" values="1;0" keyTimes="0;.5"/>` : '') +
  `<circle r="15" fill="url(#y2-moon)"/><ellipse cx="-5" cy="-6" rx="5" ry="3" fill="#fff" fill-opacity=".9"/></g></g>`

const planet =
  `<g class="blur-2"><ellipse cx="${PX + 20}" cy="${PY + 120}" rx="120" ry="16" class="shadow"/></g>` +
  `<g clip-path="url(#y2-back)">${ringBand}</g>` +
  moon(false) +
  chrome({ x: PX, y: PY, rx: 96, ry: 96, seed: 1, dur: 24, still: true }) +
  `<g clip-path="url(#y2-front)">${ringBand}</g>` +
  moon(true) +
  `<g transform="translate(${PX} ${PY}) rotate(22)"><ellipse rx="230" ry="70" fill="none" stroke="url(#y2-ring)" stroke-opacity=".35" stroke-width="1.2"/><ellipse class="dash" rx="230" ry="70" fill="none" stroke="var(--ring-a)" stroke-width="2.4" stroke-linecap="round"/></g>`

// The holographic disc on the right: a tilted iridescent CD-like disc.
const DISC = 'M0 -105 A105 105 0 1 1 0 105 A105 105 0 1 1 0 -105 Z M0 -16 A16 16 0 1 0 0 16 A16 16 0 1 0 0 -16 Z'
const disc =
  `<g class="float" style="animation-duration:13s;animation-delay:-4s"><g transform="translate(1470 560) rotate(-20) scale(1 .62)">` +
  `<g class="blur-2"><ellipse cx="14" cy="170" rx="90" ry="24" class="shadow" transform="scale(1 1.6)"/></g>` +
  `<path d="${DISC}" fill="url(#y2-disc)" fill-rule="evenodd"/>` +
  `<path d="${DISC}" fill="url(#k-hi)" fill-rule="evenodd"/><path d="${DISC}" fill="url(#k-lo)" fill-rule="evenodd"/>` +
  `<g class="disc-spin"><circle r="105" fill="url(#y2-disc-r)"/><path d="M0 -100 L 14 -18 L -14 -18 Z M0 100 L 14 18 L -14 18 Z" fill="#fff" fill-opacity=".45"/></g>` +
  `<circle r="16" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><circle r="105" fill="none" class="rim"/></g></g>`

// ---- Assembly ------------------------------------------------------------

const TOP_LEFT = cluster(
  [
    { x: 92, y: 258, rx: 34, ry: 32, seed: 21, dur: 9 },
    { x: 332, y: 160, rx: 22, ry: 21, seed: 22, dur: 8 },
    { x: 258, y: 212, rx: 40, ry: 38, seed: 23, dur: 11 },
    { x: 255, y: 108, rx: 46, ry: 44, seed: 24, dur: 10 },
    { x: 150, y: 150, rx: 80, ry: 76, seed: 25, dur: 13 },
  ],
  14,
  0,
)

// The cluster resting on the floor at the bottom right, mirrored in it.
const FLOOR_Y = 868
const FLOOR_CLUSTER = cluster(
  [
    { x: 1240, y: 834, rx: 30, ry: 28, seed: 31, dur: 9 },
    { x: 1450, y: 830, rx: 36, ry: 34, seed: 32, dur: 10 },
    { x: 1430, y: 732, rx: 52, ry: 50, seed: 33, dur: 12 },
    { x: 1330, y: 790, rx: 72, ry: 70, seed: 34, dur: 14 },
  ],
  17,
  6,
  'y2-fc',
)

const BODY = () => `
<rect width="1600" height="1000" fill="url(#y2-bg)"/>
<g class="stars">${stars}</g>
${layer(
  1,
  `<g class="iri" style="animation-duration:29s"><ellipse cx="180" cy="160" rx="520" ry="360" fill="url(#y2-i1)"/></g>` +
    `<g class="iri" style="animation-duration:35s;animation-delay:-9s"><ellipse cx="1450" cy="320" rx="560" ry="380" fill="url(#y2-i2)"/></g>` +
    `<g class="iri" style="animation-duration:31s;animation-delay:-17s"><ellipse cx="200" cy="820" rx="520" ry="300" fill="url(#y2-i3)"/></g>` +
    `<g class="iri" style="animation-duration:41s;animation-delay:-4s"><ellipse cx="1300" cy="880" rx="520" ry="260" fill="url(#y2-i4)"/></g>` +
    `<g class="holo"><rect x="-300" y="150" width="2200" height="240" fill="url(#y2-holo)" transform="rotate(-11 800 270)"/></g>`,
)}
${layer(
  2,
  `<g mask="url(#y2-floor)">${bloom(`<path class="grid" d="${gridD}"/>`, 2.5, 0.7)}` +
    `<g mask="url(#y2-lines)"><rect class="scan" x="-100" y="${HY - 60}" width="1800" height="70" fill="url(#y2-scan)"/></g></g>` +
    `<g class="blur-1"><rect x="-100" y="${HY - 2}" width="1800" height="4" fill="url(#y2-hz)"/></g>` +
    `<ellipse cx="180" cy="${HY}" rx="520" ry="46" fill="url(#y2-hzg)"/><ellipse cx="1420" cy="${HY}" rx="520" ry="46" fill="url(#y2-hzg)"/>`,
)}
${layer(
  3,
  `<g mask="url(#y2-refl)"><g transform="matrix(1 0 0 -1 0 ${2 * FLOOR_Y})" opacity=".6"><use href="#y2-fc"/></g></g>` +
    `<g class="blur-2"><ellipse cx="1350" cy="${FLOOR_Y + 2}" rx="190" ry="14" class="shadow" style="fill-opacity:calc(var(--shadow-op) * 1.8)"/></g>` +
    TOP_LEFT +
    FLOOR_CLUSTER +
    planet +
    plastic(PEBBLE, 'pink', { x: 20, y: 470, w: 230, h: 180 }, 12, 2) +
    plastic(PILL, 'aqua', { x: 1020, y: 60, w: 180, h: 125 }, 10, 5) +
    plastic(FLOWER, 'lilac', { x: 226, y: 700, w: 208, h: 212 }, 15, 8) +
    disc,
)}
${layer(4, `${orb(520, 150, 34)}${orb(1120, 300, 22)}${orb(80, 680, 26)}${orb(1560, 620, 30)}${risingOrbs(BUBBLES)}`)}
${sparks}
<rect width="1600" height="1000" fill="url(#y2-veil)"/>
<rect width="1600" height="1000" fill="url(#y2-grain)"/>
${grade([160, 80], '#fff0fa', '#3a2a8a', 0.7)}
`

const body = BODY()
const SCENE = svg(CSS, DEFS_BASE + DEFS_EXTRA.join(''), body)

export const Y2K: Look = {
  label: 'Y2K',
  args: { colors: theme, backdrop: { scene: 'y2k', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
