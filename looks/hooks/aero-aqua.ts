import { n, seeded, svg } from './kit'
import type { Look } from './look'
import { makeColors } from './make-colors.js'

// Helvetica Aqua Aero, often called Frutiger Aqua: the view from inside a
// bottle of clear blue-green liquid soap. Light pours in through the surface
// overhead, slow viscous swirls drift through the gel, and trapped air
// bubbles of every size rise through it, the big ones slowest. The bottle's
// curved walls gleam at the left and right edges. By night the gel turns
// deep sapphire and teal and the bubbles catch a cool light.
const { theme, problems } = makeColors({
  label: 'Aero Aqua',
  roles: { accent: '#0a7fd0', danger: '#d1343f', success: '#3f9a2a', warning: '#d4930f', pro: '#6a5bd0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ddeff4',
        'surface-1': '#e6f4f8',
        'surface-2': '#f1f9fb',
        'text-primary': '#0c2833',
        'text-secondary': '#234652',
        'text-muted': '#3c5d68',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#05172a',
        'surface-1': '#0a2034',
        'surface-2': '#0f283f',
        'surface-3': '#142f48',
        'text-primary': '#e2f4f8',
        'text-secondary': '#b7d6de',
        'text-muted': '#8db2bd',
      },
    },
  },
})

const r = Math.round
const f3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()

// ---------------------------------------------------------------- palette

// name: [day, night]
const VARS: Record<string, readonly [string, string]> = {
  g0: ['#dafff6', '#30899a'], g1: ['#86efdf', '#196486'], g2: ['#34c8c6', '#103f72'], g3: ['#1294a4', '#0a2858'], g4: ['#08607c', '#040e2e'],
  ray: ['#f6fffc', '#9cd8ff'], hi: ['#ffffff', '#dcf2ff'], rim: ['#04556a', '#010820'], bin: ['#eafffb', '#8ccfff'],
  swl: ['#effffb', '#62b6e6'], swd: ['#076f80', '#020a24'], wall: ['#03475c', '#000416'], surf: ['#f4fffd', '#9ed8ff'],
}

const st = (o: number, c: string, a = 1): string => `<stop offset="${o}" style="stop-color:var(--${c});stop-opacity:${a}"/>`

// ---------------------------------------------------------------- bubbles

// Bubble symbols drawn at radius 50 and scaled. A bubble in gel reads by a
// darker refracting rim, a bright crescent where the light enters at the
// upper left, a hot spot, and light focused through it onto its lower side.
const BUB_DEFS = `
<radialGradient id="bb-body">${st(0, 'bin', 0.16)}${st(0.55, 'bin', 0.07)}${st(0.78, 'rim', 0.12)}${st(0.92, 'rim', 0.52)}${st(0.97, 'rim', 0.36)}${st(1, 'hi', 0.6)}</radialGradient>
<radialGradient id="bb-glow">${st(0, 'hi', 0.5)}${st(1, 'hi', 0)}</radialGradient>
<linearGradient id="bb-cres" x1="0" y1="0" x2="1" y2="1">${st(0, 'hi', 0.95)}${st(1, 'hi', 0.15)}</linearGradient>
<g id="bL"><circle r="50" fill="url(#bb-body)"/><ellipse cx="4" cy="22" rx="32" ry="22" fill="url(#bb-glow)"/>` +
  `<path d="M-40.4-14.7A43 43 0 0 1 14.7-40.4A62 62 0 0 0-40.4-14.7Z" fill="url(#bb-cres)"/>` +
  `<ellipse cx="-27" cy="-21" rx="8" ry="4.6" transform="rotate(-40 -27 -21)" class="hi"/>` +
  `<path d="M38.6 10.3A40 40 0 0 1 10.3 38.6A56 56 0 0 0 38.6 10.3Z" class="hi" opacity=".3"/></g>
<g id="bM"><circle r="50" fill="url(#bb-body)"/><path d="M-40.4-14.7A43 43 0 0 1 14.7-40.4A62 62 0 0 0-40.4-14.7Z" fill="url(#bb-cres)"/><ellipse cx="-27" cy="-21" rx="9" ry="6" class="hi"/></g>
<g id="bS"><circle r="50" fill="url(#bb-body)"/><circle cx="-20" cy="-22" r="14" class="hi"/></g>
`

type Part = readonly [number, number, number]

// A group of bubbles (dx, dy, radius) rising together from below the frame
// to just under the surface, where it fades, wobbling sideways as it goes.
function riser(x: number, parts: readonly Part[], T: number, ph: number, w: number, wT: number): string {
  const ext = Math.max(...parts.map(([, dy, rr]) => dy + rr))
  const y0 = 1000 + ext
  const big = Math.max(...parts.map(p => p[2])) >= 60
  const uses = parts
    .map(([dx, dy, rr]) => `<use href="#${rr >= 30 ? 'bL' : rr >= 8 ? 'bM' : 'bS'}" transform="translate(${n(dx)} ${n(dy)}) scale(${f3(rr / 50)})"/>`)
    .join('')

  return (
    `<g transform="translate(${r(x)} ${r(y0)})"><g class="up" style="--h:${r(110 - y0)}px;animation-duration:${n(T)}s;animation-delay:-${n(ph)}s">` +
    `<g class="${big ? 'wob jig' : 'wob'}" style="--w:${n(w)}px;animation-duration:${n(wT)}s;animation-delay:-${n(ph % wT)}s">${uses}</g></g></g>`
  )
}

// Rising speed in px/s: small bubbles climb faster than big ones.
const speed = (rr: number): number => Math.max(7, 26 - rr * 0.2)
const T = (rr: number): number => 1000 / speed(rr)

const RISERS = (() => {
  const rnd = seeded(29)
  const out: string[] = []
  const gutter = (): number => (rnd() < 0.5 ? 6 + rnd() * 450 : 1144 + rnd() * 450)
  const add = (x: number, parts: readonly Part[]) => {
    const rr = Math.max(...parts.map(p => p[2]))
    const t = T(rr) * (0.9 + rnd() * 0.2)
    out.push(riser(x, parts, t, rnd() * t, 3 + rr * 0.06 + rnd() * 4, 5 + rnd() * 4 + rr * 0.03))
  }

  // Big bubbles near the viewer, two to a side, phased so each gutter keeps
  // one in view.
  const bigs: readonly (readonly [number, number, number])[] = [
    [175, 118, 0.05], [330, 82, 0.55], [1430, 108, 0.3], [1275, 76, 0.8],
  ]
  for (const [x, rr, f] of bigs) {
    const t = T(rr)
    out.push(riser(x, [[0, 0, rr]], t, f * t, 5, 7 + rr * 0.02))
  }

  for (let i = 0; i < 26; i++) add(gutter(), [[0, 0, 18 + rnd() * 30]])
  for (let i = 0; i < 38; i++) add(gutter(), [[0, 0, 7 + rnd() * 11]])
  for (let i = 0; i < 34; i++) add(rnd() < 0.7 ? gutter() : 500 + rnd() * 600, [[0, 0, 2.5 + rnd() * 4]])
  for (let i = 0; i < 6; i++) add(500 + rnd() * 600, [[0, 0, 4 + rnd() * 5]])

  // Clusters: bubbles clinging together, touching at their rims.
  const clusters: readonly (readonly Part[])[] = [
    [[0, 0, 22], [27, -14, 12], [20, 18, 9], [-14, 24, 7]],
    [[0, 0, 16], [-21, -6, 10], [-8, 19, 8], [14, 15, 6], [24, -4, 5]],
    [[0, 0, 26], [33, 8, 14], [-6, -32, 10], [22, -22, 6]],
    [[0, 0, 12], [16, -6, 7], [4, 14, 6]],
  ]
  for (const c of clusters) add(gutter(), c)

  return out.join('')
})()

// Fine trapped specks hanging nearly still in the gel: a dark speck with a
// bright point, all of one kind merged into one path.
const SPECKS = (() => {
  const rnd = seeded(41)
  let dark = ''
  let lit = ''

  for (let i = 0; i < 170; i++) {
    const centre = rnd() < 0.18
    const x = centre ? 500 + rnd() * 600 : rnd() < 0.5 ? rnd() * 470 : 1130 + rnd() * 470
    const y = 130 + rnd() * 820
    const rr = (centre ? 0.7 : 0.9) + rnd() * (centre ? 1 : 2.2)
    dark += `M${n(x - rr)} ${n(y)}a${n(rr)} ${n(rr)} 0 1 0 ${n(rr * 2)} 0a${n(rr)} ${n(rr)} 0 1 0 ${n(-rr * 2)} 0`
    const q = rr * 0.42
    lit += `M${n(x - rr * 0.3 - q)} ${n(y - rr * 0.35)}a${n(q)} ${n(q)} 0 1 0 ${n(q * 2)} 0a${n(q)} ${n(q)} 0 1 0 ${n(-q * 2)} 0`
  }

  return `<g class="specks"><path d="${dark}" class="rim" opacity=".28"/><path d="${lit}" class="hi" opacity=".85"/></g>`
})()

// ---------------------------------------------------------------- surface

// The liquid's surface seen from below, a bright wavering line with foam
// gathered under it, thick at the sides and thin over the middle.
const SURF_Y = 100
const wave = (period: number, amp: number): string => {
  let d = `M-400 ${SURF_Y}`
  for (let x = -400; x < 2000; x += period) d += `q${period / 4} ${-amp} ${period / 2} 0t${period / 2} 0`

  return d
}

const FOAM = (() => {
  const rnd = seeded(23)
  let body = ''
  let hot = ''
  const circ = (x: number, y: number, rr: number) => `M${n(x - rr)} ${n(y)}a${n(rr)} ${n(rr)} 0 1 0 ${n(rr * 2)} 0a${n(rr)} ${n(rr)} 0 1 0 ${n(-rr * 2)} 0`
  let x = -8

  while (x < 1612) {
    const centre = x > 470 && x < 1130
    const edge = Math.min(x, 1600 - x)
    const rr = centre ? 1.4 + rnd() * 2.6 : 3 + rnd() * (edge < 260 ? 11 : 7)
    const rows = centre ? 1 : 1 + Math.floor(rnd() * (edge < 260 ? 4 : 2.6))

    for (let k = 0; k < rows; k++) {
      const q = rr * (1 - k * 0.28)
      const cx = x + (rnd() - 0.5) * rr * 1.2
      const cy = SURF_Y + 4 + q + k * rr * 1.5 + rnd() * 2
      body += circ(cx, cy, q)
      hot += circ(cx - q * 0.32, cy - q * 0.38, q * 0.3)
    }
    x += centre ? rr * 2 + 8 + rnd() * 34 : rr * 1.7 + rnd() * 3
  }

  return `<g class="foam"><path d="${body}" class="fb"/><path d="${hot}" class="hi" opacity=".9"/></g>`
})()

const SURFACE =
  `<rect y="-60" width="1600" height="360" fill="url(#aq-under)"/>` +
  FOAM +
  `<g class="wv wv-a"><path d="${wave(200, 8)}V-80H-400Z" fill="url(#aq-air)"/>` +
  `<path d="${wave(200, 8)}" class="sl" stroke-width="14" stroke-opacity=".22"/><path d="${wave(200, 8)}" class="sl" stroke-width="2.4" stroke-opacity=".95"/></g>` +
  `<g class="wv wv-b"><path d="${wave(300, 6)}" class="sl" stroke-width="5" stroke-opacity=".4" transform="translate(0 7)"/></g>`

// ---------------------------------------------------------------- gel

// Broad soft shafts of light from the surface, each a tall ellipse whose
// gradient fades away from its top.
const SHAFTS = (set: readonly (readonly [number, number, number])[]): string =>
  set.map(([x, rx, a]) => `<ellipse cx="${x}" cy="-40" rx="${rx}" ry="980" transform="rotate(${a} ${x} -40)"/>`).join('')

// Viscous streaks of slightly lighter and darker gel: each is one curve
// stroked wide and faint twice, so its edges stay soft. Those at the sides
// are also traced by a faint bright line and a dark one where the denser gel
// bends the light; those crossing the chat column stay soft only.
const SWIRL_D = [
  'M-120 330C80 300 250 420 290 560S170 820 420 920',
  'M1720 250C1500 280 1330 380 1320 520S1460 760 1240 900',
  'M-100 770C300 700 600 850 900 790S1400 690 1720 770',
  'M-100 430C300 370 700 480 1000 410S1500 330 1720 390',
  'M-60 610C130 560 230 720 110 900',
  'M1670 620C1480 570 1410 730 1510 920',
]
const swirl = (i: number, cls: string, k = 1, lines = true): string =>
  `<g class="sw sw${i} ${cls}"><use href="#sw${i}" stroke-width="150" stroke-opacity="${f3(0.03 * k)}"/>` +
  `<use href="#sw${i}" stroke-width="64" stroke-opacity="${f3(0.04 * k)}"/>` +
  (lines
    ? `<use href="#sw${i}" stroke-width="5" stroke-opacity=".1" class="ln-hi"/>` +
      `<use href="#sw${i}" stroke-width="6" stroke-opacity=".07" class="ln-lo" transform="translate(5 8)"/>`
    : '') +
  `</g>`

// The bottle's walls: a darker band where the plastic curves away at each
// edge, and tall glossy highlights running down it.
const wall = (side: 0 | 1): string => {
  const X = (x: number) => (side ? 1600 - x : x)

  return (
    `<rect x="${side ? 1460 : 0}" y="-60" width="140" height="1120" fill="url(#aq-wall${side})"/>` +
    `<g class="gloss"><ellipse cx="${X(48)}" cy="500" rx="48" ry="620" fill="url(#aq-gloss)" opacity=".4"/>` +
    `<ellipse cx="${X(46)}" cy="490" rx="15" ry="560" fill="url(#aq-gloss)"/>` +
    `<ellipse cx="${X(13)}" cy="520" rx="4" ry="500" fill="url(#aq-gloss)" opacity=".6"/>` +
    `<ellipse cx="${X(96)}" cy="560" rx="7" ry="420" fill="url(#aq-gloss)" opacity=".35"/></g>`
  )
}

// ---------------------------------------------------------------- scene

const vars = (i: 0 | 1): string =>
  Object.entries(VARS)
    .map(([k, v]) => `--${k}:${v[i]};`)
    .join('')

const CSS = `
:root, svg { ${vars(0)} --shaft:1; --swirl:1; --gl:1; }
@media (prefers-color-scheme: dark) {
  :root, svg { ${vars(1)} --shaft:.55; --swirl:1.3; --gl:.7; }
}
.hi { fill: var(--hi); } .rim { fill: var(--rim); }
.fb { fill: var(--bin); fill-opacity: .3; stroke: var(--rim); stroke-opacity: .38; stroke-width: 1.1; }
.sl { fill: none; stroke: var(--surf); }
.wv-a { animation: aq-wave 15s linear infinite; }
.wv-b { animation: aq-wave-b 23s linear infinite; }
@keyframes aq-wave { to { transform: translateX(-200px); } }
@keyframes aq-wave-b { to { transform: translateX(300px); } }
.foam { animation: aq-bob 7s ease-in-out infinite alternate; }
@keyframes aq-bob { from { transform: translate(-3px, -1px); } to { transform: translate(3px, 2px); } }
.shafts { fill: url(#aq-shaft); opacity: var(--shaft); }
.sh-a { animation: aq-sh 19s ease-in-out infinite alternate; }
.sh-b { animation: aq-sh 27s ease-in-out infinite alternate-reverse; }
@keyframes aq-sh { from { fill-opacity: .35; transform: skewX(-2deg); } to { fill-opacity: 1; transform: skewX(2deg); } }
.sw { fill: none; transform-box: fill-box; transform-origin: 50% 50%; animation: aq-sw 46s ease-in-out infinite alternate; }
.swl { stroke: var(--swl); } .swd { stroke: var(--swd); }
.ln-hi { stroke: var(--hi); } .ln-lo { stroke: var(--swd); }
.sw1 { animation-duration: 53s; animation-delay: -20s; } .sw2 { animation-duration: 61s; animation-direction: alternate-reverse; }
.sw3 { animation-duration: 58s; animation-delay: -31s; } .sw4 { animation-duration: 49s; animation-delay: -12s; animation-direction: alternate-reverse; }
.sw5 { animation-duration: 44s; animation-delay: -8s; }
@keyframes aq-sw { from { transform: translate(-26px, 12px) rotate(-2deg) scale(.96, 1.03); } to { transform: translate(28px, -16px) rotate(2deg) scale(1.07, .95); } }
.swirls { opacity: var(--swirl); }
.specks { animation: aq-hang 31s ease-in-out infinite alternate; }
@keyframes aq-hang { from { transform: translate(-4px, 6px); } to { transform: translate(5px, -9px); } }
.up { animation: aq-up linear infinite; }
@keyframes aq-up { 0% { transform: translateY(0); fill-opacity: 1; } 88% { fill-opacity: 1; } 100% { transform: translateY(var(--h)); fill-opacity: 0; } }
.wob { animation: aq-wob ease-in-out infinite alternate; }
.jig { animation-name: aq-jig; }
@keyframes aq-wob { from { transform: translateX(calc(var(--w) * -1)); } to { transform: translateX(var(--w)); } }
@keyframes aq-jig { from { transform: translateX(calc(var(--w) * -1)) scale(1.025, .975); } to { transform: translateX(var(--w)) scale(.975, 1.025); } }
.gloss { opacity: var(--gl); animation: aq-gl 9s ease-in-out infinite alternate; }
@keyframes aq-gl { from { fill-opacity: .7; } to { fill-opacity: 1; } }
`

const DEFS = `
<linearGradient id="aq-gel" x1="0" y1="0" x2="0" y2="1">${st(0, 'g0')}${st(0.16, 'g1')}${st(0.42, 'g2')}${st(0.74, 'g3')}${st(1, 'g4')}</linearGradient>
<radialGradient id="aq-top" gradientUnits="userSpaceOnUse" cx="800" cy="-60" r="900" gradientTransform="translate(800 -60) scale(1.3 .5) translate(-800 60)">${st(0, 'ray', 0.85)}${st(0.4, 'ray', 0.35)}${st(1, 'ray', 0)}</radialGradient>
<radialGradient id="aq-shaft" cx=".5" cy=".5" r=".5">${st(0, 'ray', 0.5)}${st(0.45, 'ray', 0.16)}${st(1, 'ray', 0)}</radialGradient>
<linearGradient id="aq-under" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="300">${st(0, 'surf', 0.55)}${st(0.3, 'surf', 0.18)}${st(1, 'surf', 0)}</linearGradient>
<linearGradient id="aq-air" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="${SURF_Y + 8}">${st(0, 'g1', 0.9)}${st(0.6, 'surf', 0.9)}${st(1, 'surf', 1)}</linearGradient>
<linearGradient id="aq-wall0" x1="0" y1="0" x2="1" y2="0">${st(0, 'wall', 0.6)}${st(0.28, 'wall', 0.28)}${st(1, 'wall', 0)}</linearGradient>
<linearGradient id="aq-wall1" x1="1" y1="0" x2="0" y2="0">${st(0, 'wall', 0.6)}${st(0.28, 'wall', 0.28)}${st(1, 'wall', 0)}</linearGradient>
<radialGradient id="aq-gloss">${st(0, 'hi', 0.75)}${st(0.5, 'hi', 0.3)}${st(1, 'hi', 0)}</radialGradient>
${SWIRL_D.map((d, i) => `<path id="sw${i}" d="${d}" stroke-linecap="round"/>`).join('')}
${BUB_DEFS}
`

const BODY =
  `<rect width="1600" height="1000" fill="url(#aq-gel)"/>` +
  `<rect y="-60" width="1600" height="560" fill="url(#aq-top)"/>` +
  `<g class="shafts"><g class="sh-a">${SHAFTS([[180, 110, 12], [720, 150, 3], [1260, 130, -8]])}</g>` +
  `<g class="sh-b">${SHAFTS([[440, 80, 7], [1010, 95, -2], [1480, 90, -12]])}</g></g>` +
  `<g class="swirls">${swirl(0, 'swl')}${swirl(1, 'swl')}${swirl(2, 'swd', 1.2, false)}${swirl(3, 'swl', 0.7, false)}${swirl(4, 'swd', 1.3)}${swirl(5, 'swd', 1.3)}</g>` +
  SPECKS +
  RISERS +
  SURFACE +
  wall(0) +
  wall(1)

export const AERO_AQUA: Look = {
  label: 'Aero Aqua',
  args: { colors: theme, backdrop: { scene: 'aero-aqua', glass: { blur: 22, opacity: 0.5 } } },
  problems,
  scene: svg(CSS, DEFS, BODY),
}
