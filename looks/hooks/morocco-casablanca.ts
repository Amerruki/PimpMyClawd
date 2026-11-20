import { makeColors } from './make-colors.js'
import { n, seeded, speckle, svg } from './kit'
import type { Look } from './look'
import { CITY_DEFS, city } from './morocco-casablanca-city'
import { BOAT, CANNON_DEF, CAR_DEFS, GULL_DEF, PALM_DEFS, PEOPLE_DEFS, flag, gull, lamps, palm, rocks, sqala, stander, traffic, walker, type Car } from './morocco-casablanca-fore'
import { HZ, compact, gy, patterns, ppm, pr, r0, r1, type P3 } from './morocco-casablanca-geo'
import { MOSQUE_DEFS, mosque, mosquePoint } from './morocco-casablanca-mosque'

// Casablanca as one composed panorama, seen from a rooftop in the old medina
// above the Sqala: the bastion's ochre parapet and cannons at our feet, the
// coast boulevard with its red petits taxis below, the bay, and across it the
// Hassan II Mosque standing out over the Atlantic on the left. To the right
// the white city climbs to the Twin Center and the finance city's tower. The
// landmarks do not share one real sight line; each is drawn true to itself
// and they are set on one ground plane under one light. Day is late
// afternoon, the sun low over the sea on the left. Night is deep blue, the
// mosque floodlit gold and its green laser running east over the city.
const { theme, problems } = makeColors({
  label: 'Casablanca',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#16917c', danger: '#d0393b', success: '#4c9a3c', warning: '#c98a12', pro: '#5b7fd0' },
  light: {
    roles: { accent: '#0f7262' },
    gray: {
      anchors: { 'surface-0': '#e7f0ef', 'surface-1': '#eff6f5', 'surface-2': '#f7fbfa', 'text-primary': '#10201e', 'text-secondary': '#2f403d', 'text-muted': '#4d5f5b' },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#080c16',
        'surface-1': '#0d121e',
        'surface-2': '#131a28',
        'surface-3': '#192132',
        'text-primary': '#f0eee6',
        'text-secondary': '#cbcdc6',
        'text-muted': '#9da29c',
      },
    },
  },
})

// A gradient stop coloured from a CSS variable, so night can repaint it.
const stopVars = new Set<string>()
const st = (o: number, v: string, a: number | string = 1): string => {
  stopVars.add(v)
  return `<stop offset="${o}" class="g-${v}"${a === 1 ? '' : ` stop-opacity="${a}"`}/>`
}
const lg = (id: string, stops: string, dir = 'x1="0" y1="0" x2="0" y2="1"'): string => `<linearGradient id="${id}" ${dir}>${stops}</linearGradient>`
const rg = (id: string, stops: string, at = ''): string => `<radialGradient id="${id}" ${at}>${stops}</radialGradient>`

// ------------------------------------------------------------------ sky

const rs = seeded(11)
const STARS =
  `<g class="nt">` +
  [0, 1]
    .map(k => {
      let d = ''
      for (let i = 0; i < (k ? 18 : 46); i++) d += `M${Math.round(rs() * 1600)} ${Math.round(60 + Math.pow(rs(), 1.4) * 420)}h.01`
      return `<path class="star s${k}" d="${d}"/>`
    })
    .join('') +
  `<circle cx="150" cy="215" r="90" fill="url(#cb-moong)"/><path class="moon" d="M150 195A20 20 0 1 0 150 235A15.5 20 0 1 1 150 195Z" transform="rotate(-28 150 215)"/></g>`

// Cloud: mare's tails of cirrus combed along different winds, each streak a
// long soft lens, and low banks of rounder puffs. All of it gradient, no blur.
function cloud(seed: number, count: number, x: number, y: number, w: number, h: number, tilt: number, puff = 0): string {
  const r = seeded(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const rx = puff ? 34 + r() * 70 : 50 + r() * 170
    out += `<ellipse cx="${r0(x + r() * w)}" cy="${r0(y + r() * h)}" rx="${r0(rx)}" ry="${r0(puff ? rx * (0.2 + r() * 0.14) : 2.5 + r() * r() * 14 + rx * 0.02)}"/>`
  }
  return `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})">${out}</g>`
}
const CLOUDS = `<g fill="url(#cb-cl)">${cloud(3, 9, 40, 170, 560, 90, -12)}${cloud(4, 10, 820, 80, 700, 120, -18)}${cloud(6, 6, 520, 300, 760, 60, -4)}${cloud(9, 5, 1160, 340, 420, 50, 5)}${cloud(5, 9, -80, 430, 440, 50, -2, 1)}${cloud(8, 7, 1180, 180, 300, 44, -6, 1)}${cloud(12, 6, 560, 470, 560, 30, 0, 1)}</g>`

// ------------------------------------------------------------------ sea

// The Atlantic in the bay: long swells drawn in perspective, close together
// far out and broad near the wall, heaving slowly; ripples; and the low
// sun's glitter path on the left.
const X0 = -120
const XW = 1840
function swells(xmax: (y: number) => number): string {
  let d = ''
  for (let i = 0; i < 11; i++) {
    const t = Math.pow((i + 0.5) / 11, 1.5)
    const y = 605 + t * 110
    const L = 130 + t * 230
    let x = X0 - ((i * 131) % L)
    d += `M${r0(x)} ${n(y)}q${r0(L / 2)} ${n(-0.8 - t * 3.4)} ${r0(L)} 0`
    for (x += L; x + L * 0.6 < xmax(y); x += L) d += `t${r0(L)} 0`
  }
  return `<g class="swl"><g class="sw0"><path id="cb-sw" d="${d}"/></g><use href="#cb-sw" class="sw1" y="2.2"/></g>`
}
function ripples(cls: string, count: number, x1: number, y1: number, k: number): string {
  let d = ''
  for (let i = 0; i < count; i++) d += `M${X0 - ((i * 37 * k) % 60)} ${n(HZ + 4 + Math.pow(i / count, 1.7) * (y1 - HZ - 4))}H${x1}`
  return `<path class="${cls}" d="${d}"/>`
}
function glitter(k: number): string {
  let d = ''
  for (let i = 0; i < 20; i++) {
    const t = (i + 0.5) / 20
    const w = 16 + t * 200
    d += `M${r0(70 - w / 2 + ((i * 53 * k) % 24))} ${n(HZ + 3 + Math.pow(t, 1.4) * 152)}h${r0(w)}`
  }
  return `<path class="gl1 shim${k > 1 ? ' sh2' : ''}" d="${d}"/>`
}
const SHIP = `<path class="ship" d="M556 ${HZ}l2-4h9v-4h3v4h30l3-3v3l-3 4Z"/>`
const SEA =
  `<rect x="${X0}" y="${HZ}" width="${XW}" height="${1000 - HZ}" fill="url(#cb-sea)"/>` +
  `<rect x="${X0}" y="${HZ}" width="${XW}" height="200" fill="url(#cb-seasun)"/>` +
  SHIP

// ----------------------------------------------------------- the coast

// The shore runs from the mosque's esplanade round the bay to the boulevard.
const SHORE: P3[] = [
  [-66, 520, 0],
  [-20, 440, 0],
  [14, 350, 0],
  [36, 270, 0],
  [42, 190, 0],
  [27, 127, 0],
]
const shoreScr = SHORE.map(p => pr([p[0], p[1], -4]))
const LAND =
  `<path fill="url(#cb-gd)" d="M${SHORE.map(p => pr(p).map(r1).join(' ')).join('L')}L${X0 + XW} ${r1(gy(125))}V${HZ - 2}H${r1(pr(SHORE[0] as P3)[0])}Z"/>` +
  `<path class="gdw" d="M${SHORE.map(p => pr(p).map(r1).join(' ')).join('L')}L${[...shoreScr].reverse().map(p => p.map(r1).join(' ')).join('L')}Z"/>`
// rocks under the mosque's sea wall, round the bay and at the boulevard's foot
const mq = [mosquePoint(214, 66, -8.4), mosquePoint(100, 67, -8.4), mosquePoint(-60, 67, -8.4), mosquePoint(-190, 66, -8.4)]
const ROCKS =
  rocks(mq, 1, 'rs') +
  rocks(shoreScr.map(([x, y], i) => [x - 2, y + 1 + i * 0.6] as [number, number]), 1.4 , 'rm') +
  rocks([[-10, 712], [300, 714], [700, 712], [1094, 713]], 2, 'rb')
// the mosque lying on the water: its wall, the green of its roofs below
// that, and the minaret as a long streak narrowing as it fades, broken by
// the swell drawn over it; soft by its gradients alone, with no blur
const [mrx, mry] = mosquePoint(-10.5, 12, -9)
const my = Math.round(mry + 2)
const REFLECT =
  `<g><path fill="url(#cb-refl)" d="M70 ${my}H440L400 ${my + 26}H110ZM${r0(mrx - 12)} ${my}h24l-9 118h-6Z"/><path fill="url(#cb-reflg)" d="M120 ${my + 20}H360L340 ${my + 40}H140Z"/></g>`
const xShore = (y: number): number => {
  for (let i = 1; i < shoreScr.length; i++) {
    const a = shoreScr[i - 1] as readonly [number, number]
    const b = shoreScr[i] as readonly [number, number]
    if (y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1])
  }
  return 1094
}
const SEA_TOP = swells(xShore) + ripples('gl0', 14, 1120, 726, 1) + glitter(1) + glitter(2)
// harbour lights along the far shore and the mosque's sea wall, each with
// its streak on the water
const lights = [...mq, ...shoreScr.slice(0, 5), ...shoreScr.slice(1, 5).map(([x, y], i) => [(x + (shoreScr[i] as readonly [number, number])[0]) / 2, (y + (shoreScr[i] as readonly [number, number])[1]) / 2] as const)]
const SHORE_LIGHTS = `<g class="nt"><path class="sl0" d="${lights.map(([x, y]) => `M${r0(x)} ${r0(y - 8)}h.01`).join('')}"/><path class="sl1 shim" d="${lights.map(([x, y]) => `M${r0(x)} ${r0(y + 5)}v${r0(8 + (x % 9))}`).join('')}"/></g>`

// ------------------------------------------------------------ the city

const CITY = city()
const MOSQUE = mosque()
const SQ = sqala()

// park between the boulevard and the apartment blocks: lawns and palms
const lawn = (pts: P3[]) => `M${pts.map(p => pr(p).map(r1).join(' ')).join('L')}Z`
const PARK =
  `<path class="lawn" d="${lawn([[52, 134, 0], [118, 134, 0], [118, 172, 0], [56, 172, 0]])}${lawn([[124, 134, 0], [190, 134, 0], [190, 172, 0], [124, 172, 0]])}${lawn([[58, 180, 0], [118, 180, 0], [118, 236, 0], [60, 236, 0]])}${lawn([[124, 180, 0], [230, 180, 0], [230, 236, 0], [124, 236, 0]])}"/>` +
  `<path class="road2" d="${lawn([[40, 240, 0], [330, 240, 0], [330, 254, 0], [40, 254, 0]])}"/>`
const parkPalms: [number, number, number, number, number][] = [
  [100, 232, 11, 1, 0],
  [68, 208, 10, 3, 0],
  [86, 172, 14, 5, 1],
  [60, 160, 10, 6, 0],
  [110, 205, 12, 4, 1],
  [36, 129, 8, 14, 0],
  [50, 129, 9, 10, 0],
  [64, 129, 8, 15, 0],
  [78, 129, 9, 8, 0],
  [92, 129, 8, 9, 0],
  [106, 129, 9, 16, 0],
]
const pshadow = parkPalms.map(([X, D, h]) => {
  const a = pr([X, D, 0])
  const b = pr([X + 0.87 * h * 1.4, D + 0.49 * h * 1.4, 0])
  return [`M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`]
})
const PALM_SH = `<path class="lsh" d="${pshadow.map(q => q[0]).join('')}"/>`
const PALMS = parkPalms.map(([X, D, h, seed, kind]) => palm(pr([X, D, 0])[0], gy(D), h * ppm(D), seed, kind)).join('')

// The tramway along the street under the apartment blocks: a long low
// orange-red set that glides in to its stop, waits, and leaves again.
const tk = ppm(247)
const TRAM =
  `<g class="tram"><g transform="translate(1150 ${r1(gy(247))}) scale(${n(tk)})">` +
  `<path class="trb" d="M-16-.4V-2.2Q-15.6-3.3-14-3.4H14Q15.6-3.3 16-2.2V-.4Z"/><path class="trs" d="M-16-.95H16V-.35H-16Z"/>` +
  `<path class="trw" d="M-15.2-2.95H15.2Q15.7-2.6 15.6-1.75H-15.6Q-15.7-2.6-15.2-2.95Z"/><path class="trj" d="M-9.6-3.4V-.4M-3.2-3.4V-.4M3.2-3.4V-.4M9.6-3.4V-.4M-12.6-2.95v2.5M-6.4-2.95v2.5M6.4-2.95v2.5M12.6-2.95v2.5M0-2.95v2.5"/>` +
  `<path class="trs" d="M-6-3.4V-3.8H6V-3.4Z"/><path class="trp" d="M-1-3.8L1.4-4.6L-.6-5.3M-2.2-5.3H1"/>` +
  `</g></g>`

// ------------------------------------------------------- the boulevard

const yR0 = gy(84)
const yR1 = gy(118)
const yP = gy(126)
const shoreX = pr(SHORE[5] as P3)[0]
const laneY = [87.6, 94.4, 105.6, 112.4].map(D => gy(D))
const band = (cls: string, D0: number, D1: number, x = X0, w = XW) => `<rect class="${cls}" x="${r1(x)}" y="${r1(gy(D1))}" width="${r1(w)}" height="${r1(gy(D0) - gy(D1))}"/>`
const ROAD =
  // promenade and its sea wall on the bay side
  band('prm', 118, 126) +
  `<rect class="bal" x="${X0}" y="${r1(gy(126, 1.1))}" width="${r1(shoreX - X0)}" height="${r1(yP - gy(126, 1.1))}"/>` +
  `<path class="balr" d="M${X0} ${r1(gy(126, 1.1))}H${r1(shoreX)}"/><path class="balp" d="M${X0} ${r1(gy(126, 0.55))}H${r1(shoreX)}"/>` +
  `<rect x="${X0}" y="${r1(yR1)}" width="${XW}" height="${r1(yR0 - yR1)}" fill="url(#cb-road)"/>` +
  // wheel tracks worn pale, patched asphalt, kerbs, and a planted median
  `<path class="ptc" d="M250 ${r1(laneY[0]! - 8)}h150v11h-150ZM930 ${r1(laneY[2]! - 6)}h96v9h-96ZM1330 ${r1(laneY[1]! - 7)}h190v6h-190ZM610 ${r1(laneY[3]! - 5)}h70v8h-70Z"/>` +
  band('med', 98, 102) +
  band('hdg', 98.9, 101.4) +
  `<path class="dash" d="M${X0} ${r1(gy(109))}h${XW}M${X0} ${r1(gy(91))}h${XW}"/>` +
  `<rect class="prm" x="${X0}" y="${r1(yR0)}" width="${XW}" height="220"/>` +
  `<path class="kerb" d="M${X0} ${r1(yR1)}h${XW}M${X0} ${r1(yR0)}h${XW}M${X0} ${r1(gy(102))}h${XW}M${X0} ${r1(gy(98))}h${XW}"/>`

const CARS: Car[] = [
  { lane: 0, dir: 1, dur: 27, delay: 3, kind: 'taxi', body: 0, rack: true },
  { lane: 0, dir: 1, dur: 27, delay: 14, kind: 'car', body: 1, paint: 'cp0' },
  { lane: 0, dir: 1, dur: 27, delay: 21, kind: 'taxi', body: 1 },
  { lane: 1, dir: 1, dur: 33, delay: 8, kind: 'car', body: 0, paint: 'cp2' },
  { lane: 1, dir: 1, dur: 33, delay: 19, kind: 'taxi', body: 0 },
  { lane: 1, dir: 1, dur: 33, delay: 29, kind: 'car', body: 1, paint: 'cp1' },
  { lane: 2, dir: -1, dur: 31, delay: 2, kind: 'taxi', body: 1, rack: true },
  { lane: 2, dir: -1, dur: 31, delay: 12, kind: 'car', body: 0, paint: 'cp3' },
  { lane: 2, dir: -1, dur: 31, delay: 23, kind: 'taxi', body: 0 },
  { lane: 3, dir: -1, dur: 37, delay: 6, kind: 'car', body: 1, paint: 'cp2' },
  { lane: 3, dir: -1, dur: 37, delay: 17, kind: 'taxi', body: 0, rack: true },
  { lane: 3, dir: -1, dur: 37, delay: 30, kind: 'car', body: 0, paint: 'cp0' },
]
const LANES = traffic(CARS)
const LAMPS = [-24, 8, 40].map((X, i) => palm(pr([X, 100, 0])[0], gy(100, 0.3), 5.4 * ppm(100), 30 + i, 0)).join('') + lamps([-48, -16, 16, 48], 100)
const WALKERS =
  walker(0, 121, 1, 0, 'pc0', 170, 20) +
  walker(0, 122, 1, 1, 'pc1', 190, 24) +
  walker(0, 120, -1, 1, 'pc2', 180, 150) +
  walker(0, 123, 1, 0, 'pc3', 160, 128) +
  walker(0, 121, -1, 0, 'pc4', 175, 36) +
  walker(0, 122, -1, 1, 'pc0', 185, 46) +
  walker(0, 120, 1, 1, 'pc4', 200, 174)
// people where there would be people: a crowd on the esplanade before the
// mosque, small with distance; idlers at the balustrade; visitors on the
// Sqala's platform looking out, with their shadows
const er = seeded(8)
const PC = ['pc0', 'pc1', 'pc2', 'pc3', 'pc4']
const ESPL = Array.from({ length: 10 }, (_, i) => {
  const [x, y] = mosquePoint(-28 - er() * 150, 56 - er() * 60, 0)
  return `<use href="#cb-m${i % 2}s" class="${PC[i % 5]}" transform="translate(${r0(x)} ${r1(y)}) scale(${n(0.2 + (y - 586) * 0.012)})"/>`
}).join('')
const IDLERS = [
  [-58, 0, 0],
  [-55.6, 1, 2],
  [-27, 1, 3],
  [44, 0, 4],
  [47, 1, 1],
  [70, 0, 2],
]
  .map(([X, k, c]) => stander(X!, 124.6, k!, PC[c!]!))
  .join('')
const visitors: [number, number, number, number][] = [
  [-10.8, 38.1, 0, 0],
  [-9.8, 38.3, 1, 1],
  [9.9, 38.2, 1, 3],
  [11, 37.9, 0, 2],
  [11.9, 38.3, 1, 4],
]
const VISITORS =
  `<path class="qsh" d="${visitors.map(([X, D]) => `M${[[X - 0.25, D], [X + 0.25, D], [X + 2.1, D + 0.5], [X + 1.7, D + 0.5]].map(([a, b]) => pr([a!, b!, 6]).map(r0).join(' ')).join('L')}Z`).join('')}"/>` +
  visitors.map(([X, D, k, c]) => stander(X, D, k, PC[c]!, 6)).join('')

const GULLS = gull(300, 470, 1, 46, 4, 260) + gull(520, 380, 0.7, 60, 30, -220) + gull(120, 610, 1.3, 38, 12, 300) + gull(980, 300, 0.6, 70, 50, 240) + gull(1240, 520, 0.9, 52, 20, -260)

// two gulls standing on the parapet
const perch = (X: number, flip: number) => {
  const [x, y] = pr([X, 40.6, 7.2])
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${flip} 1)"><path class="gbl" d="M-1-6v6M2-6v6"/><path class="gb0" d="M-13-9Q-9-17 2-16Q5-22 10-20Q14-19 13-15L17-13.6L12.6-12.8Q10-6 2-5.4Q-6-5-13-9Z"/><path class="gb1" d="M-17-7.6Q-10-15 2-13Q0-8-7-7.6Z"/><circle class="lg" cx="10.6" cy="-17.6" r=".8"/><path class="gb2" d="M13.4-15.6L17.4-13.8L13-13.4Z"/></g>`
}
const PERCH = perch(-5.2, 1) + perch(6.6, -1)
// lichen on the old stone, grey-green and ochre
const lr = seeded(4)
const LICHEN = `<path class="lch" d="${Array.from({ length: 16 }, () => {
  const [x, y] = pr([-15 + lr() * 30, 40.2 + lr() * 0.8, 6.5 + lr() * 0.7])
  return `M${r0(x)} ${r0(y)}a${r0(3 + lr() * 6)} ${n(1 + lr() * 2)} 0 1 0 .1 0`
}).join('')}"/>`

// The laser from the lantern, level and east over the city.
const [lx, ly] = mosquePoint(-10.5, 0, 205)
// the glow is two soft wide strokes and a gradient spot, not a blur
const LASER = `<g class="nt"><path class="lz0" d="M${r1(lx)} ${r1(ly)}L1640 ${r1(ly + 150)}"/><path class="lz3" d="M${r1(lx)} ${r1(ly)}L1640 ${r1(ly + 150)}"/><path class="lz1" d="M${r1(lx)} ${r1(ly)}L1640 ${r1(ly + 150)}"/><circle cx="${r1(lx)}" cy="${r1(ly)}" r="7" fill="url(#cb-lzg)"/></g>`

// ---------------------------------------------------------------- defs

const DEFS =
  MOSQUE_DEFS +
  CITY_DEFS +
  PALM_DEFS +
  CANNON_DEF +
  CAR_DEFS +
  PEOPLE_DEFS +
  GULL_DEF +
  // rampart stone: three courses of blocks of uneven length and tone, dark
  // mortar, chipped corners
  `<pattern id="cb-ms" width="5.6" height="1.2" patternUnits="userSpaceOnUse"><path class="qb0" d="M1.6 0h.9v.4h-.9ZM2.4 .4h1.2v.4H2.4ZM4 .8h1.6v.4H4Z"/><path class="qb1" d="M4.3 0h1.3v.4H4.3ZM0 .4h.7v.4H0ZM1.2 .8h1.9v.4H1.2ZM1.6 .4h.2l-.2-.13ZM3.6 .8h-.24l.24-.14ZM5 .4h.2l-.2.12ZM.7 .8h.2l-.2-.1Z"/><path class="qj" d="M0 .02h5.6M0 .4h5.6M0 .8h5.6M1.6 0v.4M2.5 0v.4M4.3 0v.4M.7 .4v.4M2.4 .4v.4M3.6 .4v.4M5 .4v.4M1.2 .8v.4M3.1 .8v.4M4 .8v.4"/></pattern>` +
  lg('cb-stain', `<stop offset="0" stop-color="#20140a" stop-opacity=".45"/><stop offset="1" stop-color="#20140a" stop-opacity="0"/>`) +
  lg('cb-arch', st(0, 'mk0') + st(1, 'mk')) +
  lg('cb-glass', st(0, 'gt', 'var(--gt-a)') + st(0.5, 'gt', 0) + st(1, 'gb', 'var(--gb-a)')) +
  lg('cb-reflg', st(0, 'mg1', 'var(--rfl-a)') + st(1, 'mg1', 0)) +
  patterns.join('') +
  lg('cb-sky', st(0, 'sk0') + st(0.12, 'sk0') + st(0.52, 'sk1') + st(0.82, 'sk2') + st(1, 'sk3')) +
  rg('cb-sun', st(0, 'sun', 'var(--sun-a)') + st(0.5, 'sun', 'var(--sun-b)') + st(1, 'sun', 0), 'gradientUnits="userSpaceOnUse" cx="-60" cy="500" r="1100"') +
  rg('cb-cl', st(0, 'cl0', 'var(--cl0-a)') + st(0.5, 'cl0', 'calc(var(--cl0-a) * .45)') + st(1, 'cl0', 0)) +
  rg('cb-moong', `<stop offset="0" stop-color="#cfdcff" stop-opacity=".35"/><stop offset="1" stop-color="#cfdcff" stop-opacity="0"/>`) +
  lg('cb-sea', st(0, 'se0') + st(0.1, 'se1') + st(0.45, 'se2') + st(1, 'se3'), `gradientUnits="userSpaceOnUse" x1="0" y1="${HZ}" x2="0" y2="724"`) +
  rg('cb-seasun', st(0, 'sun', 'var(--ss-a)') + st(1, 'sun', 0), 'gradientUnits="userSpaceOnUse" cx="0" cy="560" r="900" gradientTransform="translate(0 560) scale(1 .22) translate(0 -560)"') +
  // stone faces: sky light on top, bounce and grime at the foot by day; floodlight from below by night
  lg('cb-wall', st(0, 'ovt', 'var(--ovt-a)') + st(0.5, 'ovt', 0) + st(0.62, 'ovb', 0) + st(1, 'ovb', 'var(--ovb-a)')) +
  lg('cb-wallsh', st(0, 'shc', 'var(--shc-a)') + st(0.5, 'shc', 0) + st(0.6, 'bnc', 0) + st(1, 'bnc', 'var(--bnc-a)')) +
  lg('cb-far', st(0, 'hz', 'var(--far-a)') + st(1, 'hz', 0), 'x1="0" y1="0" x2="1" y2="0"') +
  lg('cb-shaft', st(0, 'ovt', 'var(--ovt-a)') + st(0.3, 'ovt', 0) + st(0.7, 'ovb', 0) + st(1, 'ovb', 'var(--ovb-a)')) +
  lg('cb-shaftsh', st(0, 'shc', 'var(--shc-a)') + st(0.5, 'shc', 0) + st(0.7, 'bnc', 0) + st(1, 'bnc', 'var(--bnc-a)')) +
  lg('cb-roof', st(0, 'rft', 'var(--rft-a)') + st(0.6, 'rft', 0) + st(1, 'rfb', 'var(--rfb-a)')) +
  lg('cb-dome', `<stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>`, 'x1="0" y1="0" x2="1" y2="0"') +
  lg('cb-quay', `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>`) +
  lg('cb-refl', st(0, 'm1', 'var(--rfl-a)') + st(1, 'm1', 0)) +
  // towers: sky at the top, haze and street light at the foot
  lg('cb-tsh', st(0, 'tst', 'var(--tst-a)') + st(0.4, 'tst', 0) + st(0.6, 'hz2', 0) + st(1, 'hz2', 'var(--hz2-a)')) +
  lg('cb-tsh0', st(0, 'shc', 'var(--shc-a)') + st(0.4, 'shc', 0) + st(0.6, 'hz2', 0) + st(1, 'hz2', 'var(--hz2-a)')) +
  lg('cb-veil', st(0, 'hz', 0) + st(0.72, 'hz', 'var(--veil-a)') + st(1, 'hz', 0)) +
  rg('cb-glare', `<stop offset="0" stop-color="#ffe9b8" stop-opacity=".3"/><stop offset=".4" stop-color="#ffd9a0" stop-opacity=".08"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/>`, 'gradientUnits="userSpaceOnUse" cx="-80" cy="470" r="1000"') +
  lg('cb-gd', st(0, 'gd0') + st(1, 'gd')) +
  speckle('cb-grit', 7, '#3a2a18', 70, 14, 1.3, 0.36) +
  lg('cb-road', st(0, 'rd0') + st(1, 'rd1')) +
  lg('cb-pvsh', `<stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/>`) +
  lg('cb-gunsh', `<stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".22" stop-color="#ffd9b0" stop-opacity=".4"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/>`) +
  lg('cb-carsh', `<stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/>`) +
  lg('cb-flsh', `<stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/>`, 'x1="0" y1="0" x2="1" y2="0"') +
  rg('cb-lamp', `<stop offset="0" stop-color="#fff2c8" stop-opacity="1"/><stop offset=".2" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/>`) +
  rg('cb-pool', `<stop offset="0" stop-color="#ffc878" stop-opacity=".4"/><stop offset="1" stop-color="#ffc878" stop-opacity="0"/>`) +
  rg('cb-lzg', `<stop offset="0" stop-color="#c8ffd8"/><stop offset=".45" stop-color="#c8ffd8" stop-opacity=".8"/><stop offset="1" stop-color="#c8ffd8" stop-opacity="0"/>`) +
  rg('cb-halo', `<stop offset="0" stop-color="#ffc060" stop-opacity=".4"/><stop offset="1" stop-color="#ffc060" stop-opacity="0"/>`)

// ----------------------------------------------------------------- CSS

const CSS = `
:root, svg {
  --sk0: #3a6ea8; --sk1: #7fa9cf; --sk2: #cfd3cf; --sk3: #f8dcae; --sun: #ffdc9c; --sun-a: 1; --sun-b: .42; --ss-a: .75;
  --cl0: #fff6e2; --cl0-a: .8;
  --se0: #e2d3b4; --se1: #94b2b6; --se2: #33748a; --se3: #154a54; --sw0: #0c3540; --sw1: #dff0ee; --gl0: #dff3fb; --gl0-a: .2; --gl1: #fff3d6; --gl1-a: .55; --ship: #7f97a8;
  --m2: #f8e3bf; --m1: #e6d2b3; --m0: #a8958f; --mf2: #fdedd2; --mf0: #bba89e; --mp2: #efd8b0; --mp0: #a08e88;
  --msk: #a98660; --msk-a: .5; --msk2: #fff8e8; --msk2-a: .35;
  --mk: #7a6860; --mk0: #3c2f33; --mb: #9c8058; --bnc: #ffdcae; --bnc-a: .3; --hz: #ecdcc0; --far-a: .3; --msh: #4a3a4a; --msh-a: .22; --ml: #8a7258; --ml-a: .45;
  --mg2: #2fa07e; --mg1: #27896c; --mg0: #1c6f5c; --mt: #0d4a3a; --mt-a: .3; --mrd: #8fd8bd;
  --mz2: #1c9079; --mz0: #14695b; --mzd: #0c5a52; --mzs: #e9e2c0; --mzl: #e9dcc0;
  --mdm: #efe2c8; --mgd: #d9a93a; --mq0: #b9a388; --mq1: #e9dcc4;
  --ovt: #fff8ea; --ovt-a: .28; --ovb: #5a3d2a; --ovb-a: .2; --shc: #8fb0d8; --shc-a: .16;
  --rft: #d8ffe9; --rft-a: .22; --rfb: #06281f; --rfb-a: .25; --rfl-a: .5;
  --gd: #d8c7a8; --gd0: #dcd6c6; --gsh: #3a3050; --gsh-a: .22; --twl: #e9e2cf; --gdw: #9c8c78; --rk0: #6c6158; --rk1: #a3978a; --foam: #ffffff; --lawn: #7fa860; --road2: #b7b0a6;
  --e1: #d3c6b2; --e2: #eadfca; --fw: #8b9aa8; --fw-a: .4; --fwl: #8b9aa8;
  --m-2: #f6ecd8; --m-1: #dcd6cc; --m-0: #b9bcc6; --gz: #86a9c4; --gl: #86a9c4; --crn: #9aa6ae;
  --na2: #fff5e0; --na1: #ebe3d6; --na0: #b9b9c4; --nb2: #fbe6c0; --nb1: #e6d5b8; --nb0: #b8aea8; --nc2: #f9d8c0; --nc1: #e4c8b8; --nc0: #b8a6aa;
  --wn: #52677a; --wl: #52677a; --wb: #5a4a40; --wb-a: .28; --shp: #4f5560; --rkc: #7d7f84;
  --aw0: #c0392f; --aw1: #2e7d5b; --aw2: #f3ead6; --aw3: #2f6ea3;
  --tw2: #fff6e2; --tw1: #e6e4de; --tw0: #a9b0c4; --twk: #6f8194; --tg2: #7db0d6; --tg1: #5f97c4; --tg0: #4a7fae; --tfn: #f4f6f6; --tfl: #2f5f8c; --ant: #c9d0d6;
  --fc2: #fff9ea; --fc1: #ebe9e4; --fc0: #bcc2d2; --fk: #89a6c0; --dgg: #7da6c8; --fe: #ffffff;
  --tst: #ffffff; --tst-a: .25; --hz2: #e9dcc6; --hz2-a: .35; --veil-a: .62; --gt: #f4efe0; --gt-a: .6; --gb: #123a6a; --gb-a: .38; --fcl: #ffffff; --fcd: #a9b0c2; --qv-a: .14; --ghl-a: .7;
  --prm: #d6c6a8; --bal: #efe6d4; --balr: #fffaf0; --balp: #b9aa92; --rd0: #8d8b8a; --rd1: #6f6e70; --med: #b9b3a4; --dash: #f1ece0;
  --lp: #4b4f55; --lph: #f3f0e6; --taxi: #d3231f; --trb: #d4502c; --trs: #b9bcc0; --trw: #2b3644; --cp0: #f1efe9; --cp1: #2c3f5c; --cp2: #9aa1a6; --cp3: #3c3c3e; --cwn: #2b3a48; --ty: #1c1c1e; --hub: #9c9ea0; --hl: #fff8dc; --tl2: #9c1a14; --tsg: #fff1b0; --csh: #000; --csh-a: .3;
  --pc0: #f1ede4; --pc1: #7b3f3a; --pc2: #2f5d8a; --pc3: #c9a36a; --pc4: #3c4a44; --lg: #2a2c33; --sk: #b98562; --hr: #2a211c;
  --ptr: #8b7458; --pbk: #4a3a2a; --pf0: #7a7240; --pf1: #2f5e2c; --pf2: #4e8a3c; --pf3: #9cc45a; --psk: #a58a5e; --pnut: #6a5a34;
  --q2: #edc07c; --q1: #d0a05c; --q0: #9c7848; --qt: #f6d596; --qs: #c2955a; --qc: #8c683a; --qp: #d6b98a; --qj: #7a5a30; --qj-a: .4;
  --gbr: #6a4636; --gcr: #4a3528; --grg: #3a261c; --gw1: #3c2c22; --gw2: #7c6248; --gsp: #3c2c22;
  --bth: #2f6fa8; --btw: #f1ede2; --btc: #f1ede2; --btr: #e9f4f8; --fl: #c1272d; --fls: #1f7a3a; --gull: #ffffff; --gull2: #4d5a66;
}
@media (prefers-color-scheme: dark) { :root, svg {
  --sk0: #050916; --sk1: #0a1430; --sk2: #15234a; --sk3: #2b3560; --sun: #ffb070; --sun-a: .16; --sun-b: .05; --ss-a: .1;
  --cl0: #8f9fd0; --cl0-a: .16;
  --se0: #1c2a4e; --se1: #101c3c; --se2: #0a142c; --se3: #050a16; --sw0: #000; --sw1: #6f86b8; --gl0: #7f95c8; --gl0-a: .12; --gl1: #ffd98a; --gl1-a: .3; --ship: #1a2444;
  --m2: #f0bd62; --m1: #e0a850; --m0: #c98f3e; --mf2: #ffd487; --mf0: #dba552; --mp2: #e2ab52; --mp0: #b98236;
  --msk: #7a4a12; --msk-a: .55; --msk2: #ffe9b0; --msk2-a: .3;
  --mk: #6a4210; --mk0: #2a1602; --mb: #8a5e1c; --bnc: #fff0b0; --bnc-a: .45; --hz: #1a2040; --far-a: .25; --msh: #2a1400; --msh-a: .3; --ml: #6a3c08; --ml-a: .5;
  --mg2: #2a8f6c; --mg1: #1f7558; --mg0: #185e48; --mt: #052a20; --mt-a: .4; --mrd: #9be0c0;
  --mz2: #2aa884; --mz0: #1f8a6c; --mzd: #0b5c4c; --mzs: #d9ffe6; --mzl: #ffe2a0;
  --mdm: #ffd78a; --mgd: #ffd060; --mq0: #6a5a48; --mq1: #5c4c38;
  --ovt: #1a1030; --ovt-a: .42; --ovb: #fff0b0; --ovb-a: .5; --shc: #1a1030; --shc-a: .4;
  --rft: #06121a; --rft-a: .5; --rfb: #ffe6a0; --rfb-a: .3; --rfl-a: .5;
  --gd: #1a1d2c; --gd0: #141a30; --gsh: #000; --gsh-a: .3; --twl: #ffdca0; --gdw: #0d0f1a; --rk0: #0c0e18; --rk1: #2a2c3c; --foam: #9fb0d8; --lawn: #16261e; --road2: #22242e;
  --e1: #10162a; --e2: #171e34; --fw: #ffc878; --fw-a: .0; --fwl: #ffcf88;
  --m-2: #1a2238; --m-1: #141b30; --m-0: #0e1426; --gz: #1c2944; --gl: #ffd48a; --crn: #3a4460;
  --na2: #20263a; --na1: #191e30; --na0: #11162a; --nb2: #22263a; --nb1: #1b1e30; --nb0: #131628; --nc2: #24243a; --nc1: #1d1c30; --nc0: #151428;
  --wn: #0c1020; --wl: #ffcf82; --wb: #000; --wb-a: .3; --shp: #ffc66a; --rkc: #2a3048;
  --aw0: #7a2420; --aw1: #1c4a38; --aw2: #8a8270; --aw3: #1e4468;
  --tw2: #2a3350; --tw1: #222a44; --tw0: #1a2138; --twk: #0c1224; --tg2: #17223e; --tg1: #131c36; --tg0: #0f172c; --tfn: #3a4668; --tfl: #0a1020; --ant: #4a5474;
  --fc2: #46527a; --fc1: #38426a; --fc0: #2a3254; --fk: #0c1224; --dgg: #141d38; --fe: #6a7aa8;
  --tst: #000820; --tst-a: .35; --hz2: #ffb860; --hz2-a: .22; --veil-a: .5; --gt: #2a3a6a; --gt-a: .5; --gb: #000; --gb-a: .4; --fcl: #56628c; --fcd: #1c2240; --qv-a: .05; --ghl-a: .25;
  --prm: #3a3640; --bal: #4a4650; --balr: #6a6670; --balp: #2a2830; --rd0: #2a2a34; --rd1: #1e1e28; --med: #2e2c34; --dash: #7a7684;
  --lp: #14161e; --lph: #fff2c8; --taxi: #8f1814; --trb: #7a2c1a; --trs: #4a4e58; --trw: #ffe2a0; --cp0: #8a8a90; --cp1: #141c2e; --cp2: #4a4e58; --cp3: #16161a; --cwn: #0a0e18; --ty: #060608; --hub: #3a3c44; --hl: #fffbe8; --tl2: #ff3a2a; --tsg: #ffe680; --csh-a: .5;
  --pc0: #6a6870; --pc1: #40252a; --pc2: #1c3450; --pc3: #6a5840; --pc4: #1e2826; --lg: #0c0d12; --sk: #5a4234; --hr: #0c0a08;
  --ptr: #2a2420; --pbk: #0a0806; --pf0: #1a1c14; --pf1: #0f2014; --pf2: #18301c; --pf3: #2a4826; --psk: #2a241a; --pnut: #1a1810;
  --q2: #5a4a38; --q1: #4a3c2e; --q0: #362c24; --qt: #6a5a44; --qs: #40342a; --qc: #2a221c; --qp: #4a4034; --qj: #0a0806; --qj-a: .5;
  --gbr: #2a1e1a; --gcr: #1a1412; --grg: #0e0a08; --gw1: #14100e; --gw2: #2e2620; --gsp: #14100e;
  --bth: #16345a; --btw: #6a6a70; --btc: #6a6a70; --btr: #3a4a6a; --fl: #7a181c; --fls: #124a24; --gull: #8a94b0; --gull2: #1a2030;
} }
.all { transform-origin: 800px 520px; }
@media (min-aspect-ratio: 2/1) { .all { transform: translateY(6px) scale(.95); } }
@media (min-aspect-ratio: 43/20) { .all { transform: translateY(10px) scale(.9); } }
@media (min-aspect-ratio: 23/10) { .all { transform: translateY(14px) scale(.86); } }
.nt { display: none; }
@media (prefers-color-scheme: dark) { .nt { display: inline; } .dy { display: none; } }
.star { fill: none; stroke: #fff; stroke-linecap: round; } .s0 { stroke-width: 1.3; stroke-opacity: .55; } .s1 { stroke-width: 2; stroke-opacity: .9; } .moon { fill: #eef2ff; }
.gl0 { fill: none; stroke: var(--gl0); stroke-opacity: var(--gl0-a); stroke-width: 1.2; stroke-dasharray: 9 31 22 54 6 47 15 80; } .ship { fill: var(--ship); }
.gl1 { fill: none; stroke: var(--gl1); stroke-opacity: var(--gl1-a); stroke-width: 1.3; stroke-linecap: round; stroke-dasharray: 5 60 12 95 8 130; }
.shim { animation: shim 5s ease-in-out infinite; } .sh2 { animation-delay: -2.5s; }
@keyframes shim { 0%, 100% { opacity: .15; } 50% { opacity: 1; } }
.m2 { fill: var(--m2); } .m0 { fill: var(--m0); } .mf2 { fill: var(--mf2); } .mf0 { fill: var(--mf0); } .mp2 { fill: var(--mp2); } .mp0 { fill: var(--mp0); }
.msk { fill: none; stroke: var(--msk); stroke-opacity: var(--msk-a); stroke-width: .55; } .msk2 { fill: none; stroke: var(--msk2); stroke-opacity: var(--msk2-a); stroke-width: .4; }
.mk { fill: url(#cb-arch); } .mcl { fill: none; stroke: var(--ml); stroke-opacity: .22; stroke-width: .12; } .mcb { fill: #fff; fill-opacity: .07; } .mcd { fill: var(--ovb); fill-opacity: .06; } .msh { fill: var(--msh); fill-opacity: var(--msh-a); } .mps { fill: none; stroke: var(--msh); stroke-opacity: .35; stroke-width: .7; } .mb { fill: var(--mb); }
.ml { fill: none; stroke: var(--ml); stroke-opacity: var(--ml-a); stroke-width: .8; }
.mg2 { fill: var(--mg2); } .mg1 { fill: var(--mg1); } .mg0 { fill: var(--mg0); }
.mt { fill: none; stroke: var(--mt); stroke-opacity: var(--mt-a); stroke-width: .7; } .mrd { fill: none; stroke: var(--mrd); stroke-width: 1; stroke-opacity: .7; }
.mz2 { fill: var(--mz2); } .mz0 { fill: var(--mz0); } .mzd { fill: var(--mzd); fill-opacity: .55; } .mzs { fill: none; stroke: var(--mzs); stroke-opacity: .4; stroke-width: .25; }
.mzl { fill: none; stroke: var(--mzl); stroke-width: .8; stroke-opacity: .8; }
.mdm { fill: var(--mdm); } .mdr { fill: none; stroke: var(--ml); stroke-opacity: .6; stroke-width: .6; }
.mgd { fill: none; stroke: var(--mgd); stroke-width: 1.2; } .mgb { fill: var(--mgd); }
.mq0 { fill: var(--mq0); } .mq1 { fill: var(--mq1); }
.sw0 { fill: none; stroke: var(--sw0); stroke-opacity: .3; stroke-width: 1.7; } .sw1 { fill: none; stroke: var(--sw1); stroke-opacity: .3; stroke-width: 1; }
.swl { animation: swl 9s ease-in-out infinite alternate; } @keyframes swl { from { transform: translateX(-26px); } to { transform: translateX(26px); } }
.sl0 { fill: none; stroke: #ffd9a0; stroke-width: 3; stroke-linecap: round; } .sl1 { fill: none; stroke: #ffc878; stroke-width: 2; stroke-opacity: .5; stroke-linecap: round; }
.gsh { fill: var(--gsh); fill-opacity: var(--gsh-a); } .qsh { fill: var(--gsh); fill-opacity: calc(var(--gsh-a) * 1.3); } .twl { fill: var(--twl); } .gdw { fill: var(--gdw); } .rkg path { fill: none; stroke-linejoin: round; } .rk0 { stroke: var(--rk0); stroke-width: 9; stroke-dasharray: 7 1 11 2 5 1 9 3 13 1 4 2; } .rk1 { stroke: var(--rk1); stroke-width: 3; stroke-dasharray: 4 7 6 11 3 9 8 5; stroke-dashoffset: 3; }
.rs .rk0 { stroke-width: 4.5; stroke-dasharray: 4 1 7 1.5 3 1 6 2; } .rs .rk1 { stroke-width: 1.5; stroke-dasharray: 3 4 5 6; } .rm .rk0 { stroke-width: 6; } .rm .rk1 { stroke-width: 2; } .lawn { fill: var(--lawn); } .road2 { fill: var(--road2); }
.foam { stroke: var(--foam); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 14 19 6 26 22 17 3 30; animation: foam 6s ease-in-out infinite; } .rs .foam { stroke-width: 1.2; stroke-dasharray: 9 8 4 13 14 9; animation-delay: -2s; } .rm .foam { animation-delay: -4s; stroke-width: 1.4; }
@keyframes foam { 0%, 100% { opacity: .25; transform: translateY(1.5px); } 45% { opacity: .95; transform: translateY(-1px); } }
.e1 { fill: var(--e1); } .e2 { fill: var(--e2); }
.fw { fill: none; stroke: var(--fw); stroke-opacity: var(--fw-a); stroke-width: 1.4; } .fwl { fill: none; stroke: var(--fwl); stroke-width: 1.4; display: none; }
.k2 { fill: var(--m-2); } .k1 { fill: var(--m-1); } .k0 { fill: var(--m-0); } .lsh { fill: none; stroke: var(--gsh); stroke-opacity: calc(var(--gsh-a) * 1.5); stroke-width: 2.5; stroke-linecap: round; } .gz { fill: var(--gz); } .gl { fill: var(--gl); } .crn { fill: none; stroke: var(--crn); stroke-width: 1.5; stroke-linejoin: round; }
.na2 { fill: var(--na2); } .na1 { fill: var(--na1); } .na0 { fill: var(--na0); } .nb2 { fill: var(--nb2); } .nb1 { fill: var(--nb1); } .nb0 { fill: var(--nb0); } .nc2 { fill: var(--nc2); } .nc1 { fill: var(--nc1); } .nc0 { fill: var(--nc0); }
.wn { fill: var(--wn); } .wl { fill: var(--wl); } .wb { fill: var(--wb); fill-opacity: var(--wb-a); } .shp { fill: var(--shp); } .rk { fill: none; stroke: var(--rkc); stroke-width: .8; }
.aw0 { fill: var(--aw0); } .aw1 { fill: var(--aw1); } .aw2 { fill: var(--aw2); } .aw3 { fill: var(--aw3); }
.tw2 { fill: var(--tw2); } .tw1 { fill: var(--tw1); } .tw0 { fill: var(--tw0); } .twk { fill: var(--twk); } .tg2 { fill: var(--tg2); } .tg1 { fill: var(--tg1); } .tg0 { fill: var(--tg0); }
.tfn { fill: none; stroke: var(--tfn); stroke-width: .55; } .tfl { fill: none; stroke: var(--tfl); stroke-width: .3; stroke-opacity: .5; } .ant { fill: none; stroke: var(--ant); stroke-width: 1.1; }
.fc2 { fill: var(--fc2); } .fcl { fill: var(--fcl); } .fcd { fill: var(--fcd); } .fc1 { fill: var(--fc1); } .fc0 { fill: var(--fc0); } .fk { fill: var(--fk); } .dgg { fill: var(--dgg); } .fe { fill: none; stroke: var(--fe); stroke-width: 1; stroke-opacity: .7; }
.prm { fill: var(--prm); } .bal { fill: var(--bal); } .balr { fill: none; stroke: var(--balr); stroke-width: 1.6; } .balp { fill: none; stroke: var(--balp); stroke-width: 9; stroke-dasharray: 1.5 7; stroke-opacity: .6; }
.med { fill: var(--med); } .hdg { fill: var(--lawn); } .ptc { fill: #000; fill-opacity: .1; } .kerb { fill: none; stroke: var(--balr); stroke-width: 1.5; stroke-opacity: .8; } .dash { fill: none; stroke: var(--dash); stroke-width: 1.4; stroke-dasharray: 26 34; stroke-opacity: .7; }
.lp { fill: none; stroke: var(--lp); stroke-width: 2; stroke-linecap: round; } .lph { fill: none; stroke: var(--lph); stroke-width: 3; stroke-linecap: round; }
.taxi { fill: var(--taxi); } .trb { fill: var(--trb); } .trs { fill: var(--trs); } .trw { fill: var(--trw); } .trj { fill: none; stroke: var(--trb); stroke-width: .22; } .trp { fill: none; stroke: var(--lp); stroke-width: .14; }
.tram { animation: tram 80s ease-in-out infinite; } @keyframes tram { 0% { transform: translateX(760px); } 34%, 52% { transform: translateX(0); } 86%, 100% { transform: translateX(760px); } } .cp0 { fill: var(--cp0); } .cp1 { fill: var(--cp1); } .cp2 { fill: var(--cp2); } .cp3 { fill: var(--cp3); }
.cwn { fill: var(--cwn); } .tyh { fill: var(--hub); stroke: var(--ty); stroke-width: 2.4; } .hl { fill: var(--hl); } .tl { fill: var(--tl2); } .tsg { fill: var(--tsg); stroke: #2a2410; stroke-width: .7; } .tsb { fill: none; stroke: #2a2410; stroke-width: 1.5; stroke-dasharray: 1.4 .8; } .trk { fill: none; stroke: #2a2a2e; stroke-width: 1; }
.csh { fill: var(--csh); fill-opacity: var(--csh-a); } .beam { fill: #fff2c0; fill-opacity: .16; } .hlg { fill: #fff6d0; fill-opacity: .8; } .tlg { fill: #ff2a1a; fill-opacity: .55; }
.drv { animation: drv linear infinite; } .rv { animation-direction: reverse; } @keyframes drv { from { transform: translateX(-120px); } to { transform: translateX(1720px); } }
.wk { animation: drv linear infinite; } .hop { animation: hop .62s infinite; }
@keyframes hop { 0%, 100% { transform: translateY(0); animation-timing-function: ease-out; } 50% { transform: translateY(-.55px); animation-timing-function: ease-in; } }
.pc0 { fill: var(--pc0); } .pc1 { fill: var(--pc1); } .pc2 { fill: var(--pc2); } .pc3 { fill: var(--pc3); } .pc4 { fill: var(--pc4); } .lg { fill: var(--lg); } .psd { fill: #000; fill-opacity: .2; } .sk { fill: var(--sk); }
.pfr { fill: none; stroke-linejoin: bevel; } .pg0 { fill: var(--pf0); } .pg1 { fill: var(--pf1); } .pg2 { fill: var(--pf2); } .pg3 { fill: var(--pf3); }
.pf0 { stroke: var(--pf0); } .pf1 { stroke: var(--pf1); } .pf2 { stroke: var(--pf2); } .pf3 { stroke: var(--pf3); } .psk { fill: var(--psk); } .pnut { fill: var(--pnut); }
.ptr { fill: var(--ptr); } .pbk { fill: none; stroke: var(--pbk); stroke-opacity: .5; stroke-width: .8; }
.sy1 { animation-delay: -3s; } .sy2 { animation-delay: -5.5s; }
.sway { transform-box: fill-box; transform-origin: 50% 55%; animation: sway 7s ease-in-out infinite alternate; } @keyframes sway { from { transform: rotate(-1.4deg); } to { transform: rotate(1.8deg); } }
.q2 { fill: var(--q2); } .q1 { fill: var(--q1); } .q0 { fill: var(--q0); } .qt { fill: var(--qt); } .qs { fill: var(--qs); } .qc { fill: var(--qc); } .qp { fill: var(--qp); } .lch { fill: #8a8a52; fill-opacity: .4; } .qv0 { fill: #fff; fill-opacity: var(--qv-a); } .qv1, .qb1 { fill: #3a2408; fill-opacity: .1; } .qb0 { fill: #fff; fill-opacity: var(--qv-a); } .qj { fill: none; stroke: var(--qj); stroke-opacity: var(--qj-a); stroke-width: .05; }
path.qj { stroke-width: 1; stroke-opacity: .18; } pattern .qj { stroke-width: .05; stroke-opacity: var(--qj-a); }
.gbr { fill: var(--gbr); } .ghl { fill: none; stroke: #ffd9b0; stroke-opacity: var(--ghl-a); stroke-width: .035; stroke-linecap: round; } .grs { fill: #a8521e; fill-opacity: .45; } .gcr { fill: var(--gcr); } .grg { fill: none; stroke: var(--grg); stroke-width: .05; } .gw0 { fill: var(--grg); } .gw1 { fill: var(--gw1); } .gw2 { fill: var(--gw2); } .gsp { fill: none; stroke: var(--gsp); stroke-width: .07; } .gsh { fill: #000; fill-opacity: .3; }
.bth { fill: var(--bth); } .btw { fill: var(--btw); } .btc { fill: var(--btc); } .btr { fill: var(--btr); fill-opacity: .6; }
.bob { animation: bob 5s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 100%; } @keyframes bob { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(1.5px) rotate(2deg); } }
.fl { fill: var(--fl); } .fls { fill: none; stroke: var(--fls); stroke-width: 1.4; }
.flag { transform-box: fill-box; transform-origin: 0 50%; animation: flag 2.8s ease-in-out infinite alternate; } @keyframes flag { from { transform: skewY(-5deg) scaleX(1); } to { transform: skewY(5deg) scaleX(.94); } }
.gb0 { fill: var(--gull); } .gb1 { fill: var(--gull2); } .gb2 { fill: #e0a020; } .gbl { fill: none; stroke: #c9902a; stroke-width: 1.2; }
.gull { fill: var(--gull); stroke: var(--gull2); stroke-width: .5; transform-box: fill-box; transform-origin: 50% 60%; animation: flap .9s ease-in-out infinite alternate; }
@keyframes flap { from { transform: scaleY(1); } to { transform: scaleY(-.5); } }
.gfly { animation: gfly linear infinite alternate; } @keyframes gfly { from { transform: translate(0, 0); } 50% { transform: translate(calc(var(--gx) * .5), -18px); } to { transform: translate(var(--gx), 6px); } }
.lz0 { fill: none; stroke: #3cff8a; stroke-width: 11; stroke-opacity: .06; } .lz3 { fill: none; stroke: #3cff8a; stroke-width: 5; stroke-opacity: .1; } .lz1 { fill: none; stroke: #9dffc0; stroke-width: 1.3; stroke-opacity: .85; animation: pulse 4s ease-in-out infinite; }
`

// The final grade: a warm wash from the sun's side, a cool one opposite,
// and a vignette, painted plainly over the frame rather than blended.
const GRADE =
  `<defs><radialGradient id="cb-grade" gradientUnits="userSpaceOnUse" cx="0" cy="420" r="1500"><stop offset="0" stop-color="#ffe6b8" stop-opacity=".06"/><stop offset=".55" stop-color="#ffe6b8" stop-opacity="0"/><stop offset=".7" stop-color="#0b2a4a" stop-opacity="0"/><stop offset="1" stop-color="#0b2a4a" stop-opacity=".06"/></radialGradient>` +
  `<radialGradient id="cb-vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></radialGradient></defs>` +
  `<rect width="1600" height="1000" fill="url(#cb-grade)"/><rect width="1600" height="1000" fill="url(#cb-vig)"/>`

// ---------------------------------------------------------------- body

const BODY =
  `<g class="all"><rect x="${X0}" y="-80" width="${XW}" height="${HZ + 84}" fill="url(#cb-sky)"/>` +
  `<rect x="${X0}" y="-80" width="${XW}" height="${HZ + 84}" fill="url(#cb-sun)"/>` +
  STARS +
  CLOUDS +
  SEA +
  LAND +
  CITY.far +
  CITY.mid +
  `<rect x="${X0}" y="${HZ - 300}" width="${XW}" height="400" fill="url(#cb-veil)"/>` +
  `<ellipse class="nt" cx="300" cy="470" rx="330" ry="260" fill="url(#cb-halo)"/>` +
  MOSQUE +
  ESPL +
  REFLECT +
  SEA_TOP +
  `<rect x="${X0}" y="${HZ - 180}" width="${XW}" height="250" fill="url(#cb-veil)" opacity=".45"/>` +
  LASER +
  CITY.near +
  PARK +
  TRAM +
  ROCKS +
  SHORE_LIGHTS +
  `<g transform="translate(148 652)"><g class="bob">${BOAT}</g></g>` +
  ROAD +
  PALM_SH +
  PALMS +
  IDLERS +
  WALKERS +
  LANES[3] +
  LANES[2] +
  LAMPS +
  LANES[1] +
  LANES[0] +
  palm(52, 900, 250, 21, 0) +
  palm(1560, 900, 330, 22, 1) +
  flag(-14.5, 40.6, 7.2, 5.4) +
  SQ.back +
  VISITORS +
  LICHEN +
  SQ.front +
  PERCH +
  GULLS +
  `<rect class="dy" x="${X0}" y="-80" width="1220" height="1080" fill="url(#cb-glare)"/></g>` +
  GRADE

const MQ = '@media (prefers-color-scheme: dark)'
const stops = [...stopVars].map(v => `.g-${v}{stop-color:var(--${v})}`).join('')
const CSS_MIN =
  CSS.split(MQ)
    .map((part, pi) => (pi === 1 ? part.replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}') : part.replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').replace(/#([0-9a-f]{6})\b/g, (_m, h: string) => `#${[0, 2, 4].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) / 17).toString(16)).join('')}`)))
    .join(MQ) + stops

const short = (s: string): string => s.replace(/ d="([^"]*)"/g, (_m, d: string) => ` d="${compact(d)}"`)
const SCENE = svg(CSS_MIN, short(DEFS), short(BODY))

export const MOROCCO_CASABLANCA: Look = {
  label: 'Casablanca',
  args: { colors: theme, backdrop: { scene: 'casablanca', glass: { blur: 22, opacity: 0.5 } } },
  problems,
  scene: SCENE,
}
