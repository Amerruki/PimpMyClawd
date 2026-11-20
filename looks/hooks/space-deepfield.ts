import { makeColors } from './make-colors.js'
import { grade, n, seeded, svg, taper, type Pt } from './kit'
import { DEEP_CSS, dots, SPIKE_DEFS, spikeStar, stop, SUN_DEFS, sunGlare, type Spiked } from './deep-kit'
import type { Look } from './look'

// A deep field: thousands of faint galaxies of every kind, from big nearby
// spirals and ellipticals down to red-shifted specks, with a lensing
// cluster bending the light of the galaxies behind it into thin arcs. The
// view pushes in very slowly, nearer layers more; now and then a supernova
// flares in one of them. A few foreground stars carry diffraction spikes,
// a bright one in the top-right corner. By day that star is a glaring sun
// and the field is a pale, luminous haze with the galaxies in pastel.
const { theme, problems } = makeColors({
  label: 'Deep field',
  codeTheme: { light: 'github-light', dark: 'tokyo-night' },
  roles: { accent: '#3f7fd0', danger: '#d23a3a', success: '#2f9a4e', warning: '#b57a00', pro: '#8a5fd0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eef0f4',
        'surface-1': '#f3f5f8',
        'surface-2': '#f9fafc',
        'text-primary': '#151b26',
        'text-secondary': '#353d4d',
        'text-muted': '#505a6e',
      },
    },
  },
  dark: {
    roles: { accent: '#a9cbff' },
    gray: {
      anchors: {
        'surface-0': '#040509',
        'surface-1': '#090b12',
        'surface-2': '#0e1018',
        'surface-3': '#12141e',
        'text-primary': '#edf1f8',
        'text-secondary': '#c4cad8',
        'text-muted': '#99a1b4',
      },
    },
  },
})

const rand = seeded(7319)

const CSS = `
:root, svg {
  --bg-0:#fffbf3; --bg-1:#f1f3f8; --bg-2:#e7eaf2;
  --el:#d9a066; --el-core:#fff2dc; --disk:#8ea4e2; --arm:#6f8ad8; --core:#f2c48a; --red:#d9826e; --red-core:#f0b0a0; --irr:#8fb0f0; --irr-pink:#e88ab4; --lane:#a89aa6;
  --g-op:.75; --speck-w:#a8a0b8; --speck-y:#d2a070; --speck-b:#8c9fd8; --speck-r:#d08878; --speck-op:.55; --arc:#7f9ae0;
  --spike:#e3b46a; --sk-core:#ffffff; --sk-w:#f2c27a; --sk-b:#8faeff; --sk-y:#efb050; --sk-r:#f08080;
  --sun-core:#ffffff; --sun-warm:#ffe2a8; --sun-wash:#fff2d6; --sun-ray:#f1c27a; --sun-op:1; --sun-k:1; --nova:#ffe9b0; --grade-op:.25;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg-0:#05070e; --bg-1:#020308; --bg-2:#03040a;
    --el:#ffc98a; --el-core:#fff4e2; --disk:#7f9ff0; --arm:#a8c4ff; --core:#ffdca8; --red:#ff6a40; --red-core:#ffb08a; --irr:#9fc0ff; --irr-pink:#ff7ab8; --lane:#0a0608;
    --g-op:1; --speck-w:#e8ecff; --speck-y:#ffd8a0; --speck-b:#a8c4ff; --speck-r:#ff8a68; --speck-op:.9; --arc:#bcd4ff;
    --spike:#e8f0ff; --sk-core:#ffffff; --sk-w:#e8eeff; --sk-b:#8fb8ff; --sk-y:#ffd8a0; --sk-r:#ff7a5a;
    --sun-core:#ffffff; --sun-warm:#cfe0ff; --sun-wash:#0e1630; --sun-ray:#dfe8ff; --sun-op:.6; --sun-k:.22; --ray-op:0; --nova:#ffffff; --grade-op:1;
  }
}
${DEEP_CSS}
.df { opacity: var(--g-op); }
.arm { fill: var(--arm); }
.lane { fill: var(--lane); }
.sp { fill: none; stroke-linecap: round; opacity: var(--speck-op); }
.sw { stroke: var(--speck-w); } .sy { stroke: var(--speck-y); } .sb { stroke: var(--speck-b); } .sr { stroke: var(--speck-r); }
.arc { fill: var(--arc); }
.sk-dot { fill: var(--sk-core); }
.sun { opacity: var(--sun-op); }
.gr { opacity: var(--grade-op); }
.push { transform-origin: 800px 500px; animation: push 90s ease-in-out infinite alternate; }
@keyframes push { from { transform: scale(1) translate(0, 0); } to { transform: scale(var(--pz)) translate(var(--px), var(--py)); } }
.p1 { --pz: 1.025; --px: -4px; --py: 2px; } .p2 { --pz: 1.05; --px: -9px; --py: 4px; } .p3 { --pz: 1.09; --px: -16px; --py: 7px; }
.nova { animation: nova ease-out infinite; opacity: 0; }
@keyframes nova { 0%, 86% { opacity: 0; transform: scale(.2); } 88% { opacity: 1; transform: scale(1.15); } 93% { opacity: .8; transform: scale(.9); } 100% { opacity: 0; transform: scale(.5); } }
`

// One small face-on spiral's two arms, radius about 11.
const ARMS = [0, Math.PI]
  .map(ph => {
    const pts: Pt[] = Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * 4.2
      const r = 2.2 * Math.exp(0.38 * t)

      return [Math.cos(t + ph) * r, Math.sin(t + ph) * r]
    })

    return `<path class="arm" fill-opacity=".5" d="${taper(pts, 2.6, 0.4)}"/>`
  })
  .join('')

const g = (id: string, inner: string): string => `<radialGradient id="${id}">${inner}</radialGradient>`

const DEFS =
  `<linearGradient id="df-bg" x1="1" y1="0" x2="0" y2="1">${stop(0, '--bg-0')}${stop(0.4, '--bg-1')}${stop(1, '--bg-2')}</linearGradient>` +
  g('dg-el', `${stop(0, '--el-core', 1)}${stop(0.15, '--el-core', 0.85)}${stop(0.4, '--el', 0.55)}${stop(0.7, '--el', 0.16)}${stop(1, '--el', 0)}`) +
  g('dg-disk', `${stop(0, '--disk', 0.7)}${stop(0.55, '--disk', 0.3)}${stop(1, '--disk', 0)}`) +
  g('dg-core', `${stop(0, '--el-core', 1)}${stop(0.4, '--core', 0.8)}${stop(1, '--core', 0)}`) +
  g('dg-red', `${stop(0, '--red-core', 1)}${stop(0.35, '--red', 0.7)}${stop(1, '--red', 0)}`) +
  g('dg-irr', `${stop(0, '--irr', 0.9)}${stop(1, '--irr', 0)}`) +
  g('dg-pink', `${stop(0, '--irr-pink', 0.9)}${stop(1, '--irr-pink', 0)}`) +
  g('dg-nova', `<stop offset="0" style="stop-color:#fff"/>${stop(0.2, '--nova', 0.9)}${stop(1, '--nova', 0)}`) +
  // The galaxy kinds, each about 24 across.
  `<g id="d-el"><circle r="12" fill="url(#dg-el)"/></g>` +
  `<g id="d-sp"><circle r="13" fill="url(#dg-disk)"/>${ARMS}<circle r="4" fill="url(#dg-core)"/></g>` +
  `<g id="d-in"><ellipse rx="13" ry="5.5" fill="url(#dg-disk)"/><ellipse rx="4.5" ry="3" fill="url(#dg-core)"/><path class="lane" fill-opacity=".55" d="M-11 1.2Q0 3.4 11 1.2Q0 2.4-11 1.2Z"/></g>` +
  `<g id="d-eo"><ellipse rx="15" ry="2.4" fill="url(#dg-disk)"/><ellipse rx="4" ry="2.6" fill="url(#dg-core)"/><path class="lane" fill-opacity=".7" d="M-13 .2H13V.8H-13Z"/></g>` +
  `<g id="d-ir"><circle cx="-4" cy="-2" r="5" fill="url(#dg-irr)"/><circle cx="3" cy="2" r="6" fill="url(#dg-irr)"/><circle cx="6" cy="-4" r="3" fill="url(#dg-pink)"/><circle cx="-1" cy="5" r="3" fill="url(#dg-irr)"/></g>` +
  `<g id="d-rd"><ellipse rx="7" ry="5" fill="url(#dg-red)"/></g>` +
  SPIKE_DEFS +
  SUN_DEFS

type Kind = 'el' | 'sp' | 'in' | 'eo' | 'ir' | 'rd'
const KINDS: readonly [Kind, number][] = [
  ['el', 0.28],
  ['in', 0.2],
  ['sp', 0.12],
  ['eo', 0.13],
  ['ir', 0.1],
  ['rd', 0.17],
]
const pickKind = (): Kind => {
  let v = rand()

  for (const [k, w] of KINDS) {
    if ((v -= w) < 0) {
      return k
    }
  }

  return 'el'
}

// Fewer and fainter galaxies over the reading column and the message box.
const keep = (x: number, y: number): boolean => {
  const mid = x > 470 && x < 1130 ? 0.55 : 0
  const foot = y > 880 ? 0.35 : 0

  return rand() > mid + foot
}

const use = (k: Kind, x: number, y: number, s: number, a: number, op = 1): string =>
  `<use href="#d-${k}" transform="translate(${Math.round(x)} ${Math.round(y)}) rotate(${Math.round(a)}) scale(${n(s)}${k === 'el' || k === 'sp' ? ` ${n(s * (0.5 + rand() * 0.5))}` : ''})"${op < 1 ? ` opacity="${n(op)}"` : ''}/>`

// Resolved galaxies in three depth layers: far (small), mid, near (larger).
const galaxies = (count: number, smin: number, smax: number, opMin: number): string => {
  let out = ''
  let made = 0

  while (made < count) {
    const x = rand() * 1640 - 20
    const y = rand() * 1040 - 20

    if (!keep(x, y)) {
      continue
    }
    const s = smin + Math.pow(rand(), 2.4) * (smax - smin)
    const k = pickKind()
    out += use(k, x, y, k === 'ir' ? Math.min(s, 0.7) : s, rand() * 360, opMin + rand() * (1 - opMin))
    made++
  }

  return out
}

// Unresolved specks: the faintest, most distant galaxies.
const specks = (count: number, seed: number): string => {
  const r = seeded(seed)
  const classes = ['sw', 'sy', 'sb', 'sr'] as const
  const widths = [1, 1.5, 2.1]
  const buckets = new Map<string, Pt[]>()
  let made = 0

  while (made < count) {
    const x = r() * 1640 - 20
    const y = r() * 1040 - 20

    if (!keep(x, y)) {
      continue
    }
    const key = `${classes[Math.floor(r() * 4)]} ${widths[Math.floor(Math.pow(r(), 2) * 3)]}`
    buckets.set(key, [...(buckets.get(key) ?? []), [x, y]])
    made++
  }

  return [...buckets]
    .map(([key, pts]) => {
      const [c, w] = key.split(' ')

      return `<path class="sp ${c}" stroke-width="${w}" d="${dots(pts)}"/>`
    })
    .join('')
}

// A lensing cluster: a giant elliptical with its companions, and the light
// of galaxies far behind it stretched into thin arcs around it.
const LX = 300
const LY = 300
const cluster =
  `<g transform="translate(${LX} ${LY})">` +
  `<use href="#d-el" transform="scale(5.2 4)" opacity=".9"/>` +
  [
    [-70, 30, 1.6],
    [55, -40, 1.9],
    [90, 50, 1.3],
    [-40, -70, 1.2],
    [20, 95, 1.4],
    [-110, -20, 1],
    [130, -5, 1.1],
  ]
    .map(([x, y, s]) => use('el', x as number, y as number, s as number, rand() * 180))
    .join('') +
  [
    [128, -150, -115],
    [150, 20, 52],
    [112, 120, 150],
    [140, 200, 228],
    [168, -70, -48],
  ]
    .map(([r, a0, a1]) => {
      const pts: Pt[] = Array.from({ length: 12 }, (_, i) => {
        const a = (((a0 as number) + (((a1 as number) - (a0 as number)) * i) / 11) * Math.PI) / 180

        return [Math.cos(a) * (r as number), Math.sin(a) * (r as number) * 0.85]
      })

      return `<path class="arc" fill-opacity=".6" d="${taper(pts.slice(0, 7), 0.6, 2.6)}${taper(pts.slice(5).reverse(), 0.6, 2.6)}"/>`
    })
    .join('') +
  `</g>`

// Supernovae: a point that flares and fades inside a galaxy, rarely.
const NOVAE: [number, number, number, number][] = [
  [1340, 640, 70, 8],
  [210, 760, 90, 40],
  [1460, 300, 110, 75],
]
const novae = NOVAE.map(
  ([x, y, dur, delay]) =>
    `<g transform="translate(${x} ${y})">${use('sp', 0, 0, 1.6, 30, 0.9)}<g class="nova" style="animation-duration:${dur}s;animation-delay:-${delay}s"><circle r="16" fill="url(#dg-nova)"/><use href="#dk-spk" transform="scale(.28)"/></g></g>`,
).join('')

const SPIKED: Spiked[] = [
  { x: 1490, y: 85, s: 1.5, k: 'w', d: 0 },
  { x: 160, y: 520, s: 0.7, k: 'y', d: 3 },
  { x: 1280, y: 820, s: 0.6, k: 'b', d: 5 },
  { x: 640, y: 70, s: 0.42, k: 'w', d: 7 },
  { x: 1180, y: 210, s: 0.45, k: 'y', d: 9 },
  { x: 60, y: 120, s: 0.38, k: 'b', d: 11 },
]

const body =
  `<rect width="1600" height="1000" fill="url(#df-bg)"/>` +
  `<g class="sun">${sunGlare(1490, 85, 240, 28, 31)}</g>` +
  `<g class="push p1 df">${specks(2300, 11)}${galaxies(270, 0.2, 0.55, 0.3)}</g>` +
  `<g class="push p2 df">${galaxies(150, 0.45, 1.3, 0.55)}<g class="blur-0">${cluster}</g></g>` +
  `<g class="push p3 df">${galaxies(28, 1.2, 3.4, 0.85)}${novae}</g>` +
  `<g class="push p3">${SPIKED.map(spikeStar).join('')}</g>` +
  `<g class="gr">${grade([1490, 85], '#fff0d0', '#0a1430', 0.8)}</g>`

export const SPACE_DEEPFIELD: Look = {
  label: 'Deep field',
  args: { colors: theme, backdrop: { scene: 'space-deepfield', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  scene: svg(CSS, DEFS, body),
}
