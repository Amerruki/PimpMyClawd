import { layer, n, seeded, svg, type Pt } from './kit'
import { airship, cloud, rainbow, rays, ribbon } from './city-sky'
import { band, BASE, dome, monorail, RAIL, spread, type Tower } from './city-skyline'
import type { Look } from './look'
import { makeColors } from './make-colors.js'

// Aero City: standing on a smooth lawn that slopes to a calm lake, looking
// across the water at a glass skyline under a deep blue sky. The tallest
// towers gather in the two side gutters and the centre stays low and hazy
// behind the chat. A sunburst, soft cumulus, a rainbow, airships, a monorail
// on slim piers, soap bubbles and sparkles. At dusk the towers light from
// within and the lake carries their reflections.
const { theme, problems } = makeColors({
  label: 'Aero City',
  roles: { accent: '#0fa3b8', danger: '#d0343e', success: '#2f9a46', warning: '#d89a14', pro: '#1a7fd0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e1edf5',
        'surface-1': '#eaf3f9',
        'surface-2': '#f4f9fc',
        'text-primary': '#0e2638',
        'text-secondary': '#28435a',
        'text-muted': '#425c72',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0f2a',
        'surface-1': '#0f1534',
        'surface-2': '#141b3f',
        'surface-3': '#19214a',
        'text-primary': '#e8eefa',
        'text-secondary': '#bec9e2',
        'text-muted': '#95a3c4',
      },
    },
  },
})

const SUN: Pt = [300, 210]

// ---------------------------------------------------------------- sky

const STARS = (() => {
  const r = seeded(808)
  const g = ['', '', '']
  for (let i = 0; i < 72; i++) g[i % 3] += `M${n(r() * 1600)} ${n(60 + Math.pow(r(), 1.5) * 380)}h.1`

  return g.map((d, i) => `<path class="star tw${i}" d="${d}"/>`).join('')
})()

const RAINBOW = rainbow(1330, BASE, 400, 34)

const SKY =
  `<rect x="-80" y="-20" width="1760" height="640" fill="url(#sky)"/>` +
  `<g class="dy"><path class="rays" d="${rays(SUN, 22, 5)}"/>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="420" fill="url(#sunH)"/><circle class="sunp" cx="${SUN[0]}" cy="${SUN[1]}" r="110" fill="url(#sunC)"/>` +
  `<circle cx="${SUN[0]}" cy="${SUN[1]}" r="30" fill="#fffef6"/></g>` +
  `<g class="nt">${STARS}<circle cx="${SUN[0]}" cy="${SUN[1]}" r="170" fill="url(#moonH)"/><circle cx="${SUN[0]}" cy="${SUN[1]}" r="21" fill="url(#moon)"/></g>` +
  `<g class="dy rbn">${RAINBOW.art}</g>` +
  `<g class="cd1">${cloud(1010, 230, 400, 150, 11)}${cloud(90, 130, 280, 90, 37)}</g>` +
  `<g class="cd2">${cloud(620, 160, 300, 100, 53)}${cloud(810, 580, 660, 90, 71)}${cloud(1500, 118, 320, 100, 89)}</g>` +
  `<g class="rib1"><path class="rib" d="${ribbon([-80, 470], [380, 250], [1000, 420], [1680, 230], 16)}"/></g>` +
  `<g class="rib2"><path class="rib" d="${ribbon([-80, 520], [420, 330], [1100, 470], [1680, 290], 7)}"/></g>` +
  airship(720, 330, 0.36, 'as2')

// ---------------------------------------------------------------- skyline

const t = (x: number, w: number, h: number, kind: Tower['kind'], seed: number): Tower => ({ x, w, h, kind, seed })

const FAR = spread(4242, 26, 14, 120, 14, 30)
const MID = spread(1717, 46, 30, 260, 26, 50)
const BACK = [
  t(22, 50, 330, 'box', 1),
  t(120, 48, 310, 'box', 2),
  t(218, 46, 352, 'dome', 3),
  t(316, 46, 300, 'box', 4),
  t(398, 44, 200, 'box', 5),
  t(1206, 44, 220, 'box', 6),
  t(1286, 50, 340, 'box', 7),
  t(1386, 46, 312, 'box', 8),
  t(1482, 50, 334, 'dome', 9),
  t(1580, 50, 280, 'box', 10),
]
const HERO = [
  t(-6, 64, 250, 'dome', 21),
  t(72, 58, 340, 'cyl', 22),
  t(168, 76, 430, 'spire', 23),
  t(268, 84, 370, 'step', 24),
  t(356, 58, 270, 'slant', 25),
  t(436, 42, 300, 'needle', 26),
  t(1168, 42, 290, 'needle', 27),
  t(1236, 60, 266, 'slant', 28),
  t(1330, 84, 450, 'spire', 29),
  t(1432, 62, 370, 'cyl', 30),
  t(1530, 92, 404, 'step', 31),
  t(1612, 56, 300, 'box', 32),
]

const CITY =
  
  band(FAR, 'f', 6, false) +
  band(MID, 'm', 7, true, false, false, 0.28) +
  `<rect x="-80" y="380" width="1760" height="222" fill="url(#haze1)"/>` +
  band(BACK, 'b', 8, true, false) +
  band(HERO, 'h', 9, true) +
  dome(300, 96, 56) +
  `<rect x="-80" y="470" width="1760" height="132" fill="url(#haze3)"/>`

// ---------------------------------------------------------------- lake and monorail

const RIPPLES = (() => {
  const r = seeded(99)
  const g = ['', '']
  for (let i = 0; i < 90; i++) {
    const y = 606 + Math.pow(r(), 1.3) * 120
    const k = (y - 600) / 120
    g[i % 2] += `M${n(-40 + r() * 1680)} ${n(y)}h${n((6 + r() * 30) * (0.5 + k))}`
  }

  return g.map((d, i) => `<path class="rp rp${i}" d="${d}"/>`).join('')
})()

const COLUMNS = (() => {
  const r = seeded(17)
  let s = ''
  for (const x of [72, 168, 268, 356, 1236, 1330, 1432, 1530, 640, 930]) {
    const w = 8 + r() * 14
    s += `<rect class="lc" x="${n(x - w / 2)}" y="604" width="${n(w)}" height="${n(60 + r() * 60)}" style="animation-delay:-${n(r() * 6)}s"/>`
  }

  return s
})()

const RAILS = monorail()

const LAKE =
  `<rect x="-80" y="600" width="1760" height="200" fill="url(#lake)"/>` +
  `<g class="refl" transform="matrix(1 0 0 -1 0 ${BASE * 2})">${band(BACK, 'b', 8, true, false, true, 0)}${band(HERO, 'h', 9, true, false, true)}</g>` +
  RAILS.refl +
  `<rect x="-80" y="600" width="1760" height="200" fill="url(#lakeV)"/>` +
  `<g class="nt">${COLUMNS}</g>` +
  RIPPLES +
  CITY +
  `<path class="shr" d="M-80 596H1680V604H-80Z"/><path class="shl" d="M-80 596.5H1680"/>` +
  RAILS.piers +
  RAILS.beam +
  RAILS.train +
  airship(1190, 330, 0.95, 'as1')

// ---------------------------------------------------------------- lawn

const EDGE1 = 'M-80 646C150 650 380 688 640 702S1150 698 1380 668S1600 640 1680 638'
const EDGE2 = 'M-80 768C180 752 460 800 760 864S1260 852 1460 792S1640 744 1680 742'

const BLADES = (() => {
  const r = seeded(31)
  const g = ['', '']
  for (let x = -30; x < 1640; x += 6 + r() * 7) {
    const edge = Math.min(1, Math.abs(x - 800) / 520) ** 1.5
    const h = 22 + edge * 90 + r() * (20 + edge * 40)
    const lean = (r() - 0.4) * h * 0.35
    const w = 2.5 + r() * 2.5
    const i = r() < 0.55 ? 0 : 1
    const R = Math.round
    if (h < 50) continue
    g[i] += `M${R(x)} 1004q${R(lean * 0.2)} ${R(-h * 0.6)} ${R(lean)} ${R(-h)}q${R(lean * -0.7 + w)} ${R(h * 0.5)} ${R(w - lean)} ${R(h)}z`
  }

  return `<g class="sway"><path class="bl0" d="${g[0]}"/></g><g class="sway sw2"><path class="bl1" d="${g[1]}"/></g>`
})()

const LAWN =
  layer(2, `<path class="l1" d="${EDGE1}V1000H-80Z"/><path class="l1r" d="${EDGE1}"/>` +
    `<ellipse cx="320" cy="694" rx="460" ry="36" fill="url(#sheen)"/><ellipse cx="1320" cy="686" rx="300" ry="26" fill="url(#sheen)" opacity=".6"/>`) +
  layer(3, `<path class="l2" d="${EDGE2}V1000H-80Z"/><path class="l2r" d="${EDGE2}"/><path class="l2h" d="${EDGE2}"/>` +
    `<ellipse cx="250" cy="800" rx="380" ry="44" fill="url(#sheen)"/><ellipse cx="1480" cy="800" rx="280" ry="40" fill="url(#sheen)" opacity=".7"/>` +
    BLADES)

// ---------------------------------------------------------------- gloss

function bubble(x: number, y: number, r: number): string {
  const p = (a: number, k: number) => `${n(Math.cos((a * Math.PI) / 180) * r * k)} ${n(Math.sin((a * Math.PI) / 180) * r * k)}`
  const R = n(r * 0.84)
  const R2 = n(r * 1.15)

  return (
    `<g transform="translate(${x} ${y})">` +
    `<circle r="${r}" class="bb"/><circle r="${n(r * 0.96)}" class="bi" stroke-width="${n(Math.max(1, r * 0.05))}"/>` +
    `<path class="bh" d="M${p(192, 0.84)}A${R} ${R} 0 0 1 ${p(282, 0.84)}A${R2} ${R2} 0 0 0 ${p(192, 0.84)}Z"/>` +
    `<circle cx="${n(-r * 0.36)}" cy="${n(-r * 0.4)}" r="${n(Math.max(1.2, r * 0.07))}" class="bht"/>` +
    `<path class="br" stroke-width="${n(Math.max(0.8, r * 0.04))}" d="M${p(20, 0.78)}A${n(r * 0.78)} ${n(r * 0.78)} 0 0 1 ${p(80, 0.78)}"/>` +
    `</g>`
  )
}

const BUBBLES =
  `<g class="bob1">${bubble(150, 790, 72)}${bubble(1290, 880, 36)}</g>` +
  `<g class="bob2">${bubble(1450, 720, 92)}${bubble(370, 870, 34)}</g>` +
  `<g class="bob3">${bubble(1556, 900, 26)}${bubble(70, 560, 24)}${bubble(1180, 650, 20)}${bubble(530, 910, 16)}</g>` +
  [
    [90, 16, 46, 0, 30],
    [300, 11, 38, 14, -24],
    [420, 20, 58, 30, 36],
    [1200, 14, 42, 8, -30],
    [1380, 22, 54, 26, 28],
    [1530, 12, 36, 20, -22],
  ]
    .map(([x, r, dur, delay, sway]) => `<g class="rise" style="--sway:${sway}px;animation-duration:${dur}s;animation-delay:-${delay}s">${bubble(x!, 1060, r!)}</g>`)
    .join('')

const star4 = (x: number, y: number, s: number) =>
  `M${n(x)} ${n(y - s)}Q${n(x)} ${n(y)} ${n(x + s)} ${n(y)}Q${n(x)} ${n(y)} ${n(x)} ${n(y + s)}Q${n(x)} ${n(y)} ${n(x - s)} ${n(y)}Q${n(x)} ${n(y)} ${n(x)} ${n(y - s)}Z`

const SPARKLES = (() => {
  const r = seeded(404)
  const g = ['', '', '']
  for (let i = 0; i < 36; i++) {
    const side = i % 2
    const x = side ? 1150 + r() * 440 : 20 + r() * 440
    const y = 130 + r() * 780
    g[i % 3] += star4(x, y, 4 + r() * 9)
  }
  for (let i = 0; i < 14; i++) {
    const k = i / 13
    g[i % 3] += star4(60 + k * 420 + r() * 20, 930 - k * 190 + (r() - 0.5) * 30, 3 + r() * 6)
  }
  g[0] += star4(SUN[0], SUN[1], 44)

  return g.map((d, i) => `<path class="spk tw${i}" d="${d}"/>`).join('')
})()

const BOKEH = (() => {
  const r = seeded(77)
  let s = ''
  for (let i = 0; i < 12; i++) {
    const x = i % 2 ? 1170 + r() * 420 : 20 + r() * 430
    s += `<circle cx="${n(x)}" cy="${n(150 + r() * 700)}" r="${n(10 + r() * 30)}" fill="url(#bok)"/>`
  }

  return `<g class="bob2">${s}</g>`
})()

const FLARE = [0.32, 0.5, 0.62]
  .map((k, i) => {
    const x = SUN[0] + (520 - SUN[0]) * k * 1.6
    const y = SUN[1] + (520 - SUN[1]) * k * 1.6

    return `<circle cx="${n(x)}" cy="${n(y)}" r="${[26, 12, 40][i]}" fill="url(#flr)"/>`
  })
  .join('')

// ---------------------------------------------------------------- styles

const st = (o: number | string, v: string, a?: number | string): string =>
  `<stop offset="${o}" style="stop-color:${v.startsWith('#') ? v : `var(--${v})`}${a === undefined ? '' : `;stop-opacity:${a}`}"/>`
const vgrad = (id: string, y1: number, y2: number, stops: string) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y1}" x2="0" y2="${y2}">${stops}</linearGradient>`
const faces = (p: string, y1: number) =>
  vgrad(`${p}L`, y1, BASE, `${st(0, `${p}l0`)}${st(0.45, `${p}l1`)}${st(1, `${p}l2`)}`) + vgrad(`${p}S`, y1, BASE, `${st(0, `${p}s0`)}${st(0.5, `${p}s1`)}${st(1, `${p}s2`)}`)

const CSS = `
.nt { display: none; }
:root, svg {
  --s0:#0a46b4; --s1:#1d6fd6; --s2:#4fa6ee; --s3:#b4e2fc; --s4:#eefaff;
  --c0:#ffffff; --c1:#e8f3ff; --cb:#7f9fca; --cb-o:.42;
  --hl0:#a6cdf2; --hl1:#f8fcff; --hl2:#d6ecfa; --hs0:#4583c8; --hs1:#8dbbe6; --hs2:#c8e2f5;
  --bl0:#b6d8f6; --bl1:#eef7fe; --bl2:#e0f1fb; --bs0:#6a9fd6; --bs1:#a6cbec; --bs2:#d9edf9;
  --ml0:#cbe4f8; --ml1:#eaf5fd; --ml2:#e4f3fc; --ms0:#94bde4; --ms1:#c0dcf2; --ms2:#dcedf9;
  --fl0:#d4eafa; --fl1:#e4f2fc; --fl2:#eaf6fd; --fs0:#b2d2ee; --fs1:#cae2f5; --fs2:#e0f0fb;
  --hz:#eef9ff; --ln:#ffffff; --ln-o:.38; --sk:#ffffff; --sk-o:.5; --ed:#ffffff; --rf:#ffffff;
  --lk0:#e2f5ff; --lk1:#7cc4f0; --lk2:#2f86d0; --shr:#d9f2c8; --rp:#ffffff; --rp-o:.45; --refl:.34;
  --g0:#dff79a; --g1:#8fd04a; --g2:#3f9a30; --n0:#c8f07a; --n1:#6cbd3e; --n2:#2f8a2a; --n3:#1c6420;
  --b0:#1f6a20; --b1:#86cf4a; --sh:#ffffff; --sh-o:.34;
  --ah0:#ffffff; --ah1:#c2d6ea; --ag:#d8e6f2; --mb0:#ffffff; --mb1:#c9dbea; --tw:#1d6fa8;
  --bub-o:1; --spk:#ffffff; --spk-o:.95; --rib-o:.75;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --s0:#060a26; --s1:#121a50; --s2:#2e2f78; --s3:#8a4e8e; --s4:#ffad7e;
    --c0:#6c6aa6; --c1:#64629e; --cb:#ff9a7e; --cb-o:.3;
    --hl0:#18204a; --hl1:#24316a; --hl2:#3a3f7a; --hs0:#0c1234; --hs1:#141c4c; --hs2:#262c62;
    --bl0:#1c2350; --bl1:#29336c; --bl2:#41427c; --bs0:#121838; --bs1:#1a2250; --bs2:#2e3268;
    --ml0:#262c62; --ml1:#343a74; --ml2:#4c4682; --ms0:#1a2050; --ms1:#262c62; --ms2:#3a3a74;
    --fl0:#3a3a7a; --fl1:#4c4688; --fl2:#6a5490; --fs0:#2e3070; --fs1:#3c3a7a; --fs2:#5a4a88;
    --hz:#9a6494; --ln:#7fdfff; --ln-o:.14; --sk:#9fb4ff; --sk-o:.1; --ed:#5ff0ff; --rf:#3ff0ff;
    --lk0:#c88a96; --lk1:#2c2c68; --lk2:#0b1036; --shr:#2a3a5a; --rp:#ffc79a; --rp-o:.25; --refl:.6;
    --g0:#2e6060; --g1:#173a40; --g2:#0c2430; --n0:#2a5856; --n1:#143438; --n2:#0b2228; --n3:#06161c;
    --b0:#04121a; --b1:#1c4444; --sh:#9fb4ff; --sh-o:.1;
    --ah0:#8a86c0; --ah1:#3a3c78; --ag:#2a2e60; --mb0:#3a4280; --mb1:#1c2250; --tw:#ffe2a0;
    --bub-o:.55; --spk:#cfe2ff; --spk-o:.7; --rib-o:.22;
  }
  .nt { display: inline; } .dy { display: none; }
}
.ck { fill: url(#cloud); } .cs { fill: url(#cshade); }
.rays { fill: url(#rayG); transform-box: view-box; transform-origin: ${SUN[0]}px ${SUN[1]}px; animation: spin 300s linear infinite; }
.sunp { animation: pulse 12s ease-in-out infinite; }
.rbw { fill: none; stroke: url(#rbw); } .rbn { opacity: .5; }
.rib { fill: url(#ribG); opacity: var(--rib-o); }
.rib1 { animation: rib 17s ease-in-out infinite alternate; } .rib2 { animation: rib 23s ease-in-out infinite alternate-reverse; }
@keyframes rib { from { transform: translateY(-10px); } to { transform: translateY(12px); } }
.cd1 { animation: cd 90s ease-in-out infinite alternate; } .cd2 { animation: cd 74s ease-in-out infinite alternate-reverse; }
@keyframes cd { from { transform: translateX(-46px); } to { transform: translateX(46px); } }
.ah { fill: url(#hull); } .ahl { fill: #fff; fill-opacity: .7; } .af, .ag { fill: var(--ag); }
.ast { fill: none; stroke: #0fa3b8; stroke-width: 2.4; } .agw { fill: none; stroke: #ffe2a0; stroke-width: 3; stroke-dasharray: 3 2; }
.as1 { animation: as1 150s ease-in-out infinite alternate; } .as2 { animation: as2 190s ease-in-out infinite alternate; }
@keyframes as1 { from { transform: translateX(-110px); } to { transform: translateX(170px); } }
@keyframes as2 { from { transform: translateX(-120px); } to { transform: translateX(90px); } }
.star { fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; }
.tw0 { animation: twinkle 5s ease-in-out infinite; } .tw1 { animation: twinkle 7s ease-in-out infinite -2s; } .tw2 { animation: twinkle 9s ease-in-out infinite -5s; }
.fl, .fc { fill: url(#fL); } .fs { fill: url(#fS); } .ml, .mc { fill: url(#mL); } .ms { fill: url(#mS); }
.bl, .bc { fill: url(#bL); } .bs { fill: url(#bS); } .hl, .hc { fill: url(#hL); } .hs { fill: url(#hS); } .cy { fill: url(#cyl); }
.mf, .bf, .hf { fill: none; stroke: var(--ln); stroke-width: .6; } .hf { stroke-opacity: var(--ln-o); } .bf { stroke-opacity: calc(var(--ln-o) * .7); } .mf { stroke-opacity: calc(var(--ln-o) * .5); }
.sk { fill: var(--sk); fill-opacity: var(--sk-o); }
.ed { fill: none; stroke: var(--ed); stroke-opacity: .7; stroke-width: .9; } .rf { fill: none; stroke: var(--rf); stroke-opacity: .85; stroke-width: 1.2; }
.tip { fill: none; stroke: #ff4848; stroke-width: 3.2; stroke-linecap: round; animation: bk 4s linear infinite; }
@keyframes bk { 0%,60% { opacity: .3; } 70%,82% { opacity: 1; } 92%,100% { opacity: .3; } }
.yw0, .yw1, .yw2 { fill: none; stroke-opacity: .85; }
.yw0 { stroke: #ffd98a; } .yw1 { stroke: #bfe4ff; } .yw2 { stroke: #fff2dc; }
.dm { fill: url(#domeG); } .dmr { fill: none; stroke: #fff; stroke-opacity: .55; stroke-width: .8; } .dmh { fill: none; stroke: #fff; stroke-opacity: .85; stroke-width: 3; stroke-linecap: round; }
.refl path { fill-opacity: var(--refl); stroke-opacity: var(--refl); } .mpr { fill: var(--mb1); fill-opacity: calc(var(--refl) * .6); }
.rp { fill: none; stroke: var(--rp); stroke-opacity: var(--rp-o); stroke-width: 1.2; stroke-linecap: round; }
.rp0 { animation: rip 30s ease-in-out infinite alternate; } .rp1 { animation: rip 22s ease-in-out infinite alternate-reverse; }
@keyframes rip { from { transform: translateX(-24px); } to { transform: translateX(24px); } }
.lc { fill: url(#lcG); transform-box: fill-box; transform-origin: 50% 0; animation: shim 6s ease-in-out infinite alternate; }
@keyframes shim { from { transform: scale(.8, 1); opacity: .7; } to { transform: scale(1.1, .9); opacity: 1; } }
.shr { fill: var(--shr); } .shl { fill: none; stroke: #fff; stroke-opacity: .8; stroke-width: 1.2; }
.mp { fill: url(#mpG); } .mb { fill: none; stroke: var(--mb0); stroke-width: 7; } .mst { fill: none; stroke: #0fa3b8; stroke-width: 1.4; }
.tb { fill: url(#mbG); } .tw { fill: none; stroke: var(--tw); stroke-width: 3; stroke-dasharray: 9 2.5; } .th { fill: none; stroke: #fff; stroke-opacity: .9; stroke-width: 1; }
.l1 { fill: url(#lawn1); } .l1r { fill: none; stroke: var(--g0); stroke-width: 4; stroke-opacity: .9; }
.l2 { fill: url(#lawn2); } .l2r { fill: none; stroke: var(--n0); stroke-width: 12; stroke-opacity: .35; } .l2h { fill: none; stroke: var(--n0); stroke-width: 3; stroke-opacity: .9; }
.bl0 { fill: url(#blade0); } .bl1 { fill: url(#blade1); }
.sway { transform-box: view-box; transform-origin: 800px 1004px; animation: sway 8s ease-in-out infinite alternate; } .sw2 { animation-duration: 11s; animation-direction: alternate-reverse; }
@keyframes sway { from { transform: skewX(-2.5deg); } to { transform: skewX(2deg); } }
.bb { fill: url(#bubG); opacity: var(--bub-o); } .bi { fill: none; stroke: url(#bubR); stroke-opacity: calc(var(--bub-o) * .6); }
.bh { fill: #fff; fill-opacity: calc(var(--bub-o) * .7); } .bht { fill: #fff; opacity: var(--bub-o); } .br { fill: none; stroke: #fff; stroke-opacity: calc(var(--bub-o) * .4); stroke-linecap: round; }
.bob1 { animation: bob 13s ease-in-out infinite alternate; } .bob2 { animation: bob 17s ease-in-out infinite alternate-reverse; } .bob3 { animation: bob 11s ease-in-out infinite alternate -4s; }
@keyframes bob { from { transform: translate(-6px, 10px); } to { transform: translate(8px, -22px); } }
.spk { fill: var(--spk); fill-opacity: var(--spk-o); }
`

const DEFS =
  RAINBOW.def +
  vgrad('sky', 0, 610, `${st(0, 's0')}${st(0.3, 's1')}${st(0.62, 's2')}${st(0.88, 's3')}${st(1, 's4')}`) +
  `<radialGradient id="sunH">${st(0, '#fff8e0', 0.75)}${st(0.25, '#fff4d8', 0.28)}${st(1, '#fff', 0)}</radialGradient>` +
  `<radialGradient id="sunC">${st(0, '#fffef6')}${st(0.4, '#fff6d6', 0.8)}${st(1, '#fff2c8', 0)}</radialGradient>` +
  `<radialGradient id="rayG" gradientUnits="userSpaceOnUse" cx="${SUN[0]}" cy="${SUN[1]}" r="1000">${st(0, '#fff', 0.55)}${st(0.3, '#fff', 0.16)}${st(1, '#fff', 0)}</radialGradient>` +
  `<radialGradient id="moon" cx=".38" cy=".38">${st(0, '#fffdf2')}${st(0.7, '#ece6ff')}${st(1, '#bdb6ea')}</radialGradient>` +
  `<radialGradient id="moonH">${st(0, '#c8b4ff', 0.4)}${st(1, '#c8b4ff', 0)}</radialGradient>` +
  `<radialGradient id="cloud">${st(0, 'c0')}${st(0.4, 'c0', 0.92)}${st(0.7, 'c1', 0.42)}${st(1, 'c1', 0)}</radialGradient>` +
  `<radialGradient id="cshade">${st(0, 'cb', 'var(--cb-o)')}${st(1, 'cb', 0)}</radialGradient>` +
  `<linearGradient id="ribG">${st(0, '#fff', 0)}${st(0.18, '#fff', 0.85)}${st(0.5, '#fff', 0.3)}${st(0.82, '#fff', 0.85)}${st(1, '#fff', 0)}</linearGradient>` +
  `<linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">${st(0, 'ah0')}${st(0.55, 'ah0')}${st(1, 'ah1')}</linearGradient>` +
  faces('f', 420) +
  faces('m', 300) +
  faces('b', 220) +
  faces('h', 120) +
  `<linearGradient id="cyl">${st(0, 'hl2')}${st(0.3, 'hl1')}${st(0.62, 'hs1')}${st(1, 'hs0')}</linearGradient>` +
  vgrad('haze1', 380, 602, `${st(0, 'hz', 0)}${st(1, 'hz', 0.6)}`) +
  vgrad('haze3', 470, 602, `${st(0, 'hz', 0)}${st(1, 'hz', 0.3)}`) +
  `<linearGradient id="domeG" x1="0" y1="0" x2="1" y2="0">${st(0, '#fff', 0.55)}${st(0.35, '#dff6ff', 0.18)}${st(0.7, '#9fd8ff', 0.22)}${st(1, '#ffffff', 0.5)}</linearGradient>` +
  vgrad('lake', 600, 800, `${st(0, 'lk0')}${st(0.4, 'lk1')}${st(1, 'lk2')}`) +
  vgrad('lakeV', 600, 760, `${st(0, 'lk0', 0)}${st(0.12, 'lk0', 0.1)}${st(1, 'lk1', 0.75)}`) +
  vgrad('lcG', 604, 720, `${st(0, '#ffd98a', 0.7)}${st(1, '#ffd98a', 0)}`) +
  `<linearGradient id="mpG" x1="0" y1="0" x2="1" y2="0">${st(0, 'mb0')}${st(0.5, 'mb0')}${st(1, 'mb1')}</linearGradient>` +
  `<linearGradient id="mbG" x1="0" y1="0" x2="0" y2="1">${st(0, 'mb0')}${st(1, 'mb1')}</linearGradient>` +
  vgrad('lawn1', 636, 900, `${st(0, 'g0')}${st(0.2, 'g1')}${st(1, 'g2')}`) +
  vgrad('lawn2', 740, 1000, `${st(0, 'n0')}${st(0.25, 'n1')}${st(0.7, 'n2')}${st(1, 'n3')}`) +
  vgrad('blade0', 860, 1004, `${st(0, 'b1')}${st(1, 'b0')}`) +
  vgrad('blade1', 880, 1004, `${st(0, 'n0')}${st(1, 'n2')}`) +
  `<radialGradient id="sheen">${st(0, 'sh', 'var(--sh-o)')}${st(1, 'sh', 0)}</radialGradient>` +
  `<radialGradient id="bubG">${st(0, '#fff', 0)}${st(0.6, '#e8f8ff', 0.05)}${st(0.86, '#bfe8ff', 0.22)}${st(0.96, '#fff', 0.7)}${st(1, '#fff', 0)}</radialGradient>` +
  `<linearGradient id="bubR" x1="0" y1="0" x2="1" y2="1">${st(0, '#ff9ad8')}${st(0.35, '#ffe08a')}${st(0.65, '#8affd8')}${st(1, '#9ab8ff')}</linearGradient>` +
  `<radialGradient id="bok">${st(0, '#fff', 0.22)}${st(0.8, '#fff', 0.14)}${st(1, '#fff', 0)}</radialGradient>` +
  `<radialGradient id="flr">${st(0, '#d8fff4', 0.05)}${st(0.8, '#bff6ff', 0.2)}${st(1, '#bff6ff', 0)}</radialGradient>`

const BODY =
  SKY +
  layer(1, LAKE) +
  LAWN +
  `<g class="dy">${FLARE}</g>` +
  BOKEH +
  layer(4, BUBBLES) +
  SPARKLES

const SCENE = svg(CSS.replace(/\s*([{};:,>])\s*/g, '$1').replace(/;}/g, '}').replace('scheme:dark', 'scheme: dark'), DEFS, BODY)

export const AERO_CITY: Look = {
  label: 'Aero City',
  args: { colors: theme, backdrop: { scene: 'aero-city', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
