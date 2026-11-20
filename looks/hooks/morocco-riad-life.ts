import { n, seeded, taper } from './kit'
import { crown } from './morocco-riad-court'
import { SUN, TOP, P, W, WALLS, affineAt, d3, ppm } from './morocco-riad-geo'
import type { V2, V3 } from './morocco-riad-geo'

// What lives in the Riad: sky, lanterns, the sitting corner with its tea,
// the cat, the tortoise, the sparrows, the bougainvillea and its falling
// bracts, petals turning on the basin, dust in the sunbeam.

const pt = (p: V2): string => `${n(p[0])} ${n(p[1])}`

// The sky over the court: by day drifting fair-weather cloud and swifts,
// by night stars and a young crescent moon.
// `open` says whether a screen point is open sky, so stars stay in it.
export function sky(open: (x: number, y: number) => boolean): { day: string; night: string } {
  const rand = seeded(311)
  const puff = (x: number, y: number, w: number) =>
    [0, 1, 2, 3, 4].map(i => `<ellipse cx="${n(x + (i - 2) * w * 0.32 + rand() * w * 0.1)}" cy="${n(y - Math.sin((i / 4) * Math.PI) * w * 0.12)}" rx="${n(w * (0.28 + rand() * 0.12))}" ry="${n(w * (0.13 + rand() * 0.06))}"/>`).join('')
  const clouds =
    `<g class="day cloud" style="animation-duration:190s;animation-delay:-40s">${puff(300, 120, 240)}</g>` +
    `<g class="day cloud" style="animation-duration:260s;animation-delay:-150s">${puff(700, 60, 320)}${puff(1000, 150, 180)}</g>`
  const stars: string[][] = [[], [], []]
  for (let i = 0; i < 40; i++) {
    const x = 380 + rand() * 1100
    const y = rand() * 330
    if (!open(x, y)) continue
    stars[i % 3]!.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.5 + rand() * rand() * 1.6)}"/>`)
  }
  const swift = (d: number, delay: number, y: number) =>
    `<g class="day swift" style="animation-duration:${d}s;animation-delay:-${delay}s;--y:${y}px"><path d="M0 0Q-7 -3 -13 1Q-7 -1 -1 2L5 0Q-1 -1 -6 -6Q-1 -3 2 -1Z"/></g>`

  return {
    day: clouds + swift(23, 3, 140) + swift(31, 17, 90) + swift(27, 9, 210),
    night:
      stars.map((g, i) => `<g class="star" style="animation-duration:${5 + i * 3}s;animation-delay:-${i * 2}s">${g.join('')}</g>`).join('') +
      `<circle cx="1010" cy="95" r="60" fill="url(#r-moonglow)"/><path class="moon" d="M1020 70A26 26 0 1 0 1032 118A21 21 0 1 1 1020 70Z"/>`,
  }
}

// A Moroccan brass lantern: chain, a domed cap with a finial, a bellied body
// of pierced brass, a pointed foot. Drawn once as a symbol 100 units tall.
export const LANTERN_SYMBOL =
  `<g id="r-lan">` +
  `<circle class="lan-glow" cx="0" cy="30" r="44" fill="url(#r-lglow)"/>` +
  `<path class="brass" d="M0 -40L5 -30Q18 -24 20 -12H-20Q-18 -24 -5 -30Z"/>` +
  `<path class="brass-dk" d="M-20 -12H20L23 -6H-23Z"/>` +
  `<path class="brass" d="M-21 -6Q-28 22 -18 54H18Q28 22 21 -6Z"/>` +
  `<path class="lan-holes" d="M-12 2h3v3h-3zM-3 2h3v3h-3zM6 2h3v3h-3zM-16 14h3v3h-3zM-7 14h3v3h-3zM2 14h3v3h-3zM11 14h3v3h-3zM-12 26h3v3h-3zM-3 26h3v3h-3zM6 26h3v3h-3zM-16 38h3v3h-3zM-7 38h3v3h-3zM2 38h3v3h-3zM11 38h3v3h-3z"/>` +
  `<path class="brass-hi" d="M-15 -2Q-21 22 -13 50" fill="none" stroke-width="3"/>` +
  `<path class="brass-dk" d="M-18 54H18L8 66L0 82L-8 66Z"/>` +
  `<circle class="lan-flame" cx="0" cy="24" r="6"/>` +
  `</g>`

export type Lantern = { at: V3; plane: { o: V3; ex: V3; ey: V3 }; size: number; spotsBox: V3[]; hang?: boolean }

// A lantern hung at a world point, with its glow and, at night, the
// star-shaped light its piercings throw onto the nearest surfaces: a
// pattern laid in that plane's perspective, faded out by distance.
export function lantern(l: Lantern, i: number): { body: string; spots: string; defs: string } {
  const p = P(l.at)
  const k = (ppm(l.at) * l.size) / 120
  const pid = `r-sp${i}`
  const fade = `r-sf${i}`
  const c = P(l.plane.o)
  const r = ppm(l.plane.o) * 1.6

  return {
    defs:
      `<pattern id="${pid}" href="#r-spots" patternTransform="${affineAt(l.plane.o, l.plane.ex, l.plane.ey, 1)}"/>` +
      `<mask id="${fade}m"><rect x="${n(c[0] - r)}" y="${n(c[1] - r)}" width="${n(r * 2)}" height="${n(r * 2)}" fill="url(#r-fade)"/></mask>`,
    spots:
      `<g>` +
      `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(r)}" ry="${n(r * 0.8)}" fill="url(#r-pool)"/>` +
      `<g mask="url(#${fade}m)"><path fill="url(#${pid})" d="${d3(l.spotsBox)}"/></g></g>`,
    body: `<g class="${l.hang === false ? '' : 'lan-sway'}" style="transform-origin:${n(p[0])}px ${n(p[1] - k * 260)}px;animation-delay:-${i * 2.3}s"><use href="#r-lan" transform="translate(${n(p[0])} ${n(p[1] + (l.hang === false ? -k * 82 : k * 40))}) scale(${n(k)})"/>${l.hang === false ? '' : `<path class="chain" d="M${n(p[0])} ${n(p[1] - k * 260)}V${n(p[1])}" stroke-width="${n(Math.max(1, k * 2))}"/>`}</g>`,
  }
}

// The sitting corner along the west walk: a banquette dressed in striped
// cloth with cushions against the arcade, and at its far end a brass tray
// with a silver teapot and painted tea glasses, steam rising.
export function sitting(): { defs: string; body: string; steam: string } {
  const x0 = 0.1
  const x1 = 0.78
  const z0 = 3.0
  const z1 = 6.5
  const h = 0.44
  const top = d3([[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]])
  const front = d3([[x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0]])
  // Cushions as pillows: each quad's corners pulled round through its edge
  // midpoints.
  const pillow = (q: V3[]) => {
    const c = q.map(P)
    const m = (a: V2, b: V2) => `${n((a[0] + b[0]) / 2)} ${n((a[1] + b[1]) / 2)}`
    return `M${m(c[0]!, c[1]!)}${[1, 2, 3, 0].map(i => `Q${n(c[i]![0])} ${n(c[i]![1])} ${m(c[i]!, c[(i + 1) % 4]!)}`).join('')}Z`
  }
  const cushions = [3.6, 4.5, 5.4].map(z => pillow([[0.14, h, z - 0.42], [0.14, h, z + 0.42], [0.26, h + 0.55, z + 0.38], [0.26, h + 0.55, z - 0.38]]))
  const tc: V3 = [0.48, h + 0.02, 6.05]
  const tp = P(tc)
  const k = ppm(tc)
  const pot = (x: number, y: number, s: number) =>
    `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">` +
    `<path class="silver" d="M-8 0Q-14 -8 -9 -16Q-5 -21 0 -21Q5 -21 9 -16Q14 -8 8 0ZM8 -9Q16 -11 20 -24L22 -24Q19 -8 9 -4ZM-6 -21L0 -31L6 -21Z"/><circle class="silver" cx="0" cy="-32" r="2"/>` +
    `<path class="silver-dk" d="M-9 -15Q-17 -15 -16 -8Q-15 -4 -9 -5" fill="none" stroke-width="2"/><path class="silver-hi" d="M-5 -17Q-8 -10 -5 -3" fill="none" stroke-width="2"/></g>`
  const glass = (x: number, y: number, s: number, c: string) =>
    `<path class="${c}" d="M${n(x - 3.2 * s)} ${n(y - 9 * s)}L${n(x + 3.2 * s)} ${n(y - 9 * s)}L${n(x + 2.4 * s)} ${n(y)}L${n(x - 2.4 * s)} ${n(y)}Z"/>`
  const s = k / 110
  const body =
    `<path class="bench-front" d="${front}"/><path fill="url(#r-cloth)" d="${top}"/><path class="bench-sh" d="${front}"/>` +
    cushions.map((d, i) => `<path class="cushion c${i}" d="${d}"/>`).join('') +
    `<path fill="url(#k-hi)" d="${cushions.join('')}"/><path fill="url(#k-lo)" d="${cushions.join('')}"/>` +
    `<ellipse class="tray" cx="${n(tp[0])}" cy="${n(tp[1])}" rx="${n(k * 0.24)}" ry="${n(k * 0.08)}"/><ellipse class="tray-hi" cx="${n(tp[0])}" cy="${n(tp[1] - 1)}" rx="${n(k * 0.2)}" ry="${n(k * 0.06)}"/>` +
    pot(tp[0] - k * 0.04, tp[1] + k * 0.02, s) +
    glass(tp[0] + k * 0.1, tp[1] + k * 0.03, s, 'glass-a') + glass(tp[0] + k * 0.17, tp[1] - k * 0.01, s, 'glass-b') + glass(tp[0] - k * 0.15, tp[1] + k * 0.0, s, 'glass-a')
  const sx = tp[0] - k * 0.04
  const sy = tp[1] - k * 0.38
  const steam = [0, 1, 2]
    .map(i => `<path class="steam" style="animation-delay:-${i * 2.2}s" d="M${n(sx + i * 2)} ${n(sy)}q-6 -10 0 -20t0 -20t-2 -18"/>`)
    .join('')

  return { defs: `<pattern id="r-cloth" href="#z-cloth" patternTransform="${affineAt([x1, h, z0], [0, 0, 1], [-1, 0, 0], 1)}"/>`, body, steam }
}

// A tabby cat asleep in a curl on the banquette, its head tucked on its
// paws, ears up, the tail wrapped round, the tip flicking now and then.
export function cat(at: V3): string {
  const p = P(at)
  const k = ppm(at) / 100
  const t = (x: number, y: number) => `${n(p[0] + x * k)} ${n(p[1] + y * k)}`
  const tpx = (x: number, y: number) => `${n(p[0] + x * k)}px ${n(p[1] + y * k)}px`
  const body = `M${t(-24, 0)}C${t(-30, -14)} ${t(-18, -27)} ${t(-2, -27)}C${t(14, -27)} ${t(24, -17)} ${t(22, -4)}L${t(18, 0)}Z`

  return (
    `<ellipse cx="${n(p[0])}" cy="${n(p[1] + k)}" rx="${n(k * 30)}" ry="${n(k * 5)}" fill="url(#k-shadow)"/>` +
    `<path class="cat" d="${body}"/>` +
    `<path class="cat-dk" d="M${t(-21, -18)}q6 3 5 10M${t(-15, -23)}q7 4 5 12M${t(-8, -26)}q6 5 4 13M${t(-1, -27)}q5 6 3 13M${t(6, -26)}q4 6 2 12M${t(12, -23)}q3 5 1 10" fill="none" stroke-width="${n(k * 0.9)}"/>` +
    `<path class="cat-lt" d="M${t(-20, -1)}Q${t(-4, -6)} ${t(14, -2)}L${t(16, 0)}L${t(-22, 0)}Z"/>` +
    `<path fill="url(#k-lo)" d="${body}"/><path fill="url(#k-hi)" d="${body}"/>` +
    `<path class="cat" d="M${t(12, -2)}C${t(11, -12)} ${t(18, -16)} ${t(25, -15)}C${t(32, -14)} ${t(35, -8)} ${t(33, -2)}C${t(30, 2)} ${t(18, 2)} ${t(12, -2)}Z"/>` +
    `<path class="cat" d="M${t(18, -13)}L${t(19, -22)}L${t(24, -15)}ZM${t(27, -15)}L${t(31, -22)}L${t(31, -12)}Z"/>` +
    `<path class="cat-in" d="M${t(19.5, -15)}L${t(20, -19.5)}L${t(22.5, -15.5)}Z"/>` +
    `<path class="cat-dk" d="M${t(23, -8)}q2 1.2 4 0M${t(29, -8)}q1.6 1 3 0" fill="none" stroke-width="${n(k * 0.8)}"/>` +
    `<path class="cat-lt" d="M${t(26, -4)}q3 2 6 0q-3 3 -6 0Z"/>` +
    // The tail lies wrapped round the front of the body; only its last few
    // centimetres lift and settle, turning about the joint where they meet.
    `<path class="cat" d="M${t(-22, -1)}C${t(-18, 5)} ${t(-6, 6)} ${t(5, 4.7)}L${t(5, 1.9)}C${t(-6, 2.4)} ${t(-16, 1)} ${t(-20, -3)}Z"/>` +
    `<path class="cat-dk" d="M${t(-2, 3.4)}l${n(k * 2)} 0" stroke-width="${n(k * 2)}"/>` +
    `<g class="tail" style="transform-origin:${tpx(4.5, 3.3)}"><path class="cat" d="M${t(4, 4.75)}C${t(8, 4.4)} ${t(12, 3.4)} ${t(14.4, 2)}C${t(15.3, 1.2)} ${t(14.7, 0)} ${t(13.6, 0.3)}C${t(11, 1.5)} ${t(8, 1.9)} ${t(4, 1.85)}Z"/><path class="cat-dk" d="M${t(9, 1.9)}L${t(12.6, 1.2)}" stroke-width="${n(k * 1.6)}"/></g>`
  )
}

// A tortoise crossing the walk, very slowly, from the beds to the fountain.
export function tortoise(a: V3, b: V3): string {
  const p = P(a)
  const q = P(b)
  const k = ppm(a) / 100

  return (
    `<g class="tortoise" style="--tx:${n(q[0] - p[0])}px;--ty:${n(q[1] - p[1])}px"><g transform="translate(${pt(p)}) scale(${n(k)})">` +
    `<ellipse cx="0" cy="1" rx="17" ry="3" fill="url(#k-shadow)"/>` +
    `<path class="tort-skin" d="M10 -2Q17 -6 21 -3Q20 1 13 1ZM-10 0l-3 3h5ZM7 0l2 3h5Z"/>` +
    `<path class="tort-shell" d="M-14 0Q-13 -13 0 -13Q13 -13 14 0Z"/>` +
    `<path class="tort-scute" d="M-7 -1L-5 -8L5 -8L7 -1M-5 -8L-9 -11M5 -8L9 -11M0 -8V-13" fill="none" stroke-width="1"/>` +
    `<path fill="url(#k-hi)" d="M-14 0Q-13 -13 0 -13Q13 -13 14 0Z"/></g></g>`
  )
}

// Sparrows at the basin's rim: one pecking at the water, one that comes
// down from the sky to drink and goes again.
export function sparrows(rim: V3): string {
  const p = P(rim)
  const k = ppm(rim) / 100
  const bird = `<path class="sparrow" d="M-5 0Q-6 -5 -1 -6Q3 -9 6 -6L9 -6L6 -4Q6 0 2 1L-6 3L-10 2Z"/><path class="sparrow-dk" d="M-3 -4Q1 -3 3 -1Q-1 0 -5 -1Z"/><circle cx="4" cy="-6.5" r=".9" fill="#111"/>`

  return (
    `<g transform="translate(${pt(p)}) scale(${n(k * 1.1)})"><g class="peck">${bird}</g></g>` +
    `<g class="flyer"><g transform="translate(${n(p[0] + k * 40)} ${n(p[1] - k * 2)}) scale(${n(-k * 1.1)} ${n(k * 1.1)})">${bird}</g></g>`
  )
}

// Rose petals turning slowly round the basin on the water.
export function petals(c: V3, r: number, flat: number): string {
  const p = P(c)
  const k = ppm(c)
  const rx = k * r
  const ry = rx * flat
  const path = `M${n(p[0] - rx)} ${n(p[1])}a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0`

  return (
    `<path id="r-ring" d="${path}" fill="none"/>` +
    [0, 1, 2, 3, 4].map(i => `<path class="petal" d="M0 0q3 -3 6 0q-3 2 -6 0Z"><animateMotion dur="${70 + i * 13}s" begin="-${i * 17}s" repeatCount="indefinite" rotate="auto"><mpath href="#r-ring"/></animateMotion></path>`).join('')
  )
}

// Bougainvillea climbing a corner pier to the gallery and spilling along
// the balustrade: a woody stem and two crowns of papery magenta bracts lit
// as volumes, a few bracts letting go now and then.
const BOUG_RAMP = ['#6a1446', '#951a5c', '#ba226e', '#d63682', '#ec559a', '#f985b8', '#ffc8df']

export function bougainvillea(): { body: string; fall: string } {
  const wall = WALLS.north
  const at = (u: number, v: number) => P(W(wall, u, v, 0.25))
  const k = ppm(W(wall, 0.6, 4, 0))
  const col = at(0.65, 3.4)
  const top = at(1.9, 5.9)
  const base = at(0.4, 0)
  const stem = taper([[base[0], base[1]], [base[0] + 5, base[1] - k * 1.5], [base[0] - 3, base[1] - k * 3], [col[0], col[1] - k * 1.8]], 7, 2)
  const fall = [0, 1, 2, 3]
    .map(i => {
      const q = at(1.0 + i * 0.7, 5.6 - (i % 2) * 0.8)
      return `<g class="bract-fall" style="animation-duration:${17 + i * 5}s;animation-delay:-${i * 6}s"><path class="bg1" transform="translate(${Math.round(q[0])} ${Math.round(q[1])})" d="M0 -3l3 3l-3 3l-3 -3Z"/></g>`
    })
    .join('')

  return {
    body:
      `<path class="bstem" d="${stem}"/>` +
      crown(col[0], col[1], k * 0.62, k * 2.7, 97, { ramp: BOUG_RAMP, leaves: 95, leaf: k * 0.17, shape: 'round', clusters: 18, light: [-0.6, -0.7, 0.45] }, 'animation-duration:12s') +
      crown(top[0], top[1], k * 1.5, k * 0.42, 98, { ramp: BOUG_RAMP, leaves: 60, leaf: k * 0.16, shape: 'round', clusters: 12, light: [-0.6, -0.7, 0.45] }, 'animation-duration:14s;animation-delay:-5s'),
    fall,
  }
}

// The sunbeam itself: the lit floor patch carried up along the light to the
// roofline, a faint warm volume in the air with dust turning in it.
export function beam(litFloor: V3[]): string {
  if (litFloor.length < 3) return ''
  const up = litFloor.map(p => [p[0] + SUN[0] * (TOP / SUN[1]), TOP, p[2] + SUN[2] * (TOP / SUN[1])] as V3)
  const pts = [...litFloor, ...up].map(P)
  // Convex hull (gift wrap) of the projected corners.
  const hull: V2[] = []
  let start = pts.reduce((a, b) => (b[0] < a[0] ? b : a))
  let cur = start
  do {
    hull.push(cur)
    let next = pts[0] as V2
    for (const q of pts) {
      const cr = (next[0] - cur[0]) * (q[1] - cur[1]) - (next[1] - cur[1]) * (q[0] - cur[0])
      if (next === cur || cr < 0) next = q
    }
    cur = next
  } while (cur !== start && hull.length < 20)
  const rand = seeded(5)
  const minX = Math.min(...hull.map(q => q[0]))
  const maxX = Math.max(...hull.map(q => q[0]))
  const motes = Array.from({ length: 9 }, (_, i) => {
    const x = minX + rand() * (maxX - minX) * 0.8
    const y = 250 + rand() * 520
    return `<circle class="mote" style="animation-duration:${n(16 + rand() * 18)}s;animation-delay:-${n(rand() * 30)}s" cx="${n(x)}" cy="${n(y)}" r="${n(0.8 + rand() * 1.2)}"/>`
  }).join('')

  return `<g class="day"><path class="beam" d="M${hull.map(pt).join('L')}Z"/>${motes}</g>`
}
