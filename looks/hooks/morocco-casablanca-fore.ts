import { n, seeded, taper, type Pt } from './kit'
import { Layers, Paint, gy, line, planeFill, poly, ppm, pr, r0, r1, wall, wpoly, type P2, type P3, type Sink, type Wall } from './morocco-casablanca-geo'

// The near things: the Sqala's parapet and cannons, palms, the boulevard's
// cars and petits taxis, people, lamp posts, the boat, gulls and the flag.

// ------------------------------------------------------------- palms

// A crown is drawn as a few paths, one per layer and green, with each frond
// already turned into place: a palm costs a handful of shapes, not one per
// frond. `M` is a frond's 2 by 2 matrix into the crown.
type M2 = readonly [number, number, number, number]
const mx = (m: M2, x: number, y: number): Pt => [Math.round(m[0] * x + m[2] * y), Math.round(m[1] * x + m[3] * y)]
// Short polylines in whole crown units, written as relative moves so the
// long merged paths stay short. Each leaflet pair is one stroke, tip to
// base to tip.
function strokes(list: Pt[][]): string {
  let d = ''
  let at: Pt = [0, 0]
  for (const pts of list) {
    const [a] = pts as [Pt]
    d += `m${a[0] - at[0]} ${a[1] - at[1]}l` + pts.slice(1).map((p, i) => `${p[0] - pts[i]![0]} ${p[1] - pts[i]![1]}`).join(' ')
    at = pts[pts.length - 1]!
  }
  return d.replace(/ -/g, '-')
}

// One date-palm frond pointing right, 100 long: an arching rachis with two
// rows of stiff leaflets, the far row shorter, all drooping toward the tip.
// `count` leaflet pairs: small far palms get fewer.
function frond(seed: number, droop: number, count: number, m: M2, solid = false): string {
  const rand = seeded(seed)
  const c: Pt = [48, -26 + droop * 0.4]
  const e: Pt = [100, 14 + droop]
  const at = (t: number): Pt => [2 * (1 - t) * t * c[0] + t * t * e[0], 2 * (1 - t) * t * c[1] + t * t * e[1]]
  const [cx, cy] = mx(m, c[0], c[1])
  const [ex, ey] = mx(m, e[0], e[1])
  const list: Pt[][] = []
  for (let i = 0; i < count; i++) {
    const t = 0.1 + (i / (count - 1)) * 0.9
    const [x, y] = at(t)
    const [x2, y2] = at(Math.min(1, t + 0.02))
    const a = Math.atan2(y2 - y, x2 - x)
    // a solid blade has no stroke width, so its leaflets reach a little further
    const l = (22 - Math.abs(t - 0.45) * 22) * (0.85 + rand() * 0.3) * (solid ? 1.2 : 1)
    const tip = (side: number): Pt => {
      const b = a + side * (1.05 - t * 0.5)
      return mx(m, x + Math.cos(b) * l * (side < 0 ? 0.8 : 1), y + Math.sin(b) * l + l * (side < 0 ? 0.25 : 0.55))
    }
    list.push([tip(-1), mx(m, x, y), tip(1)])
  }
  if (solid) {
    // the frond as one filled blade with a saw edge, a tooth per leaflet
    const left = list.map(q => q[0]!)
    const right = list.map(q => q[2]!).reverse()
    const mid = list.map(q => q[1]!)
    const pts: Pt[] = [[0, 0]]
    left.forEach((p, i) => pts.push(p, mid[Math.min(i + 1, mid.length - 1)]!))
    pts.push([ex, ey])
    right.forEach((p, i) => pts.push(p, mid[Math.max(mid.length - 2 - i, 0)]!))
    return `M${pts.map(p => `${p[0]} ${p[1]}`).join('L')}Z`
  }
  return `M0 0Q${cx} ${cy} ${ex} ${ey}M0 0${strokes(list)}`.replace(/ -/g, '-')
}
// A fan-palm leaf at the end of its stalk: a pleated half disc of blades,
// drawn in pairs that meet at the stalk's end.
function fan(seed: number, count: number, m: M2, solid = false): string {
  const rand = seeded(seed)
  const base = mx(m, 30, 0)
  const tips: Pt[] = []
  for (let i = 0; i < count; i++) {
    const a = -1.35 + (i / (count - 1)) * 2.7
    const l = 30 * (0.85 + rand() * 0.2) * (1 - Math.abs(a) * 0.1)
    tips.push(mx(m, 30 + Math.cos(a) * l, Math.sin(a) * l + Math.abs(a) * 4))
  }
  if (solid) {
    // a pleated half disc: blade tips with the folds between them, on a stalk
    const fold = (i: number): Pt => [Math.round((tips[i]![0] + tips[i + 1]![0] + base[0]) / 3), Math.round((tips[i]![1] + tips[i + 1]![1] + base[1]) / 3)]
    const pts: Pt[] = []
    tips.forEach((t, i) => pts.push(t, ...(i + 1 < count ? [fold(i)] : [])))
    // a broad stalk, so the heads close over their middle as stroked
    // stalks did
    const [sx, sy] = mx(m, 0, 3)
    const [bx, by] = mx(m, 0, 2)
    return `M${-sx} ${-sy}L${base[0] - bx} ${base[1] - by}L${pts.map(p => `${p[0]} ${p[1]}`).join('L')}L${base[0] + bx} ${base[1] + by}L${sx} ${sy}Z`
  }
  const list: Pt[][] = [[[0, 0], base, tips[0]!]]
  for (let i = 1; i < count; i += 2) list.push(i + 1 < count ? [tips[i]!, base, tips[i + 1]!] : [base, tips[i]!])
  return `M0 0${strokes(list)}`
}

// Layers in drawing order, each a map from green to its path data; a layer
// carries the stroke width its fronds had at their own scale. Solid fronds
// fold their layers together into one filled path per green.
function crownPaths(layers: { w: number; d: Map<string, string> }[], solid: boolean): string {
  if (solid) {
    const all = new Map<string, string>()
    for (const l of layers) for (const [cls, d] of l.d) put(all, cls, d)
    return [...all]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([cls, d]) => `<path class="pg${cls.slice(2)}" d="${d}"/>`)
      .join('')
  }
  return layers.map(({ w, d }) => [...d].map(([cls, dd]) => `<path class="pfr ${cls}" stroke-width="${n(w)}" d="${dd}"/>`).join('')).join('')
}
const put = (map: Map<string, string>, cls: string, d: string) => map.set(cls, (map.get(cls) ?? '') + d)

// Full crowns for the two near palms; `lod` gives the small ones along the
// boulevard and in the park fewer fronds, each a solid saw-edged blade.
function dateCrown(id: string, seed: number, lod = false): string {
  const rand = seeded(seed)
  const items: [number, number, string, number, number][] = []
  const k = lod ? [6, 9, 5] : [6, 11, 6]
  // hanging old fronds, then the spreading ones, then the young upright ones
  for (let i = 0; i < k[0]!; i++) items.push([12 + (i / (k[0]! - 1)) * 156 + (rand() - 0.5) * 12, 0.7 + rand() * 0.2, i % 2 ? 'pf0' : 'pf1', 1, 0])
  for (let i = 0; i < k[1]!; i++) items.push([-18 - (i / (k[1]! - 1)) * 144 + (rand() - 0.5) * 10, 0.9 + rand() * 0.25, i < k[1]! / 2 ? 'pf1' : 'pf2', 0, 1])
  for (let i = 0; i < k[2]!; i++) items.push([-50 - (i / (k[2]! - 1)) * 80 + (rand() - 0.5) * 14, 0.72 + rand() * 0.2, i < k[2]! / 2 ? 'pf2' : 'pf3', 0, 2])
  const layers = [0.8, 1.02, 0.82].map(s => ({ w: 2.4 * s * 1.04, d: new Map<string, string>() }))
  for (const [a, sc, cls, v, L] of items) {
    const rad = (a * Math.PI) / 180
    const flip = Math.cos(rad) < 0
    // mirror the frond for the left half so its droop always falls down
    const m: M2 = flip ? [-Math.cos(Math.PI - rad) * sc, Math.sin(Math.PI - rad) * sc, Math.sin(Math.PI - rad) * sc, Math.cos(Math.PI - rad) * sc] : [Math.cos(rad) * sc, Math.sin(rad) * sc, -Math.sin(rad) * sc, Math.cos(rad) * sc]
    put(layers[L]!.d, cls, frond(v ? 6 : 5, v ? 26 : 0, lod ? 9 : 20, m, lod))
  }
  // the dates under a small crown are hidden by its fronds
  return `<symbol id="${id}" overflow="visible">${crownPaths(layers, lod)}${lod ? '' : '<circle class="pnut" r="7"/>'}</symbol>`
}

function fanCrown(id: string, seed: number, lod = false): string {
  const rand = seeded(seed)
  // the skirt of dead fronds hanging down the trunk under the crown
  let sk = 'M-20 4'
  for (let i = 0; i <= 10; i++) sk += `L${n(-20 + i * 1.2 + (i % 2) * 5)} ${n(18 + i * 7 + (i % 2) * 7)}`
  for (let i = 10; i >= 0; i--) sk += `L${n(20 - i * 1.2 - (i % 2) * 5)} ${n(14 + i * 7 + (i % 2) * 8)}`
  const items: [number, number, string, number][] = []
  const k = lod ? [5, 9, 6] : [6, 11, 7]
  // a full round head: hanging leaves, the spreading ring, the lit top
  for (let i = 0; i < k[0]!; i++) items.push([15 + (i / (k[0]! - 1)) * 150 + (rand() - 0.5) * 12, 0.62 + rand() * 0.14, i % 2 ? 'pf0' : 'pf1', 0])
  for (let i = 0; i < k[1]!; i++) items.push([-4 - (i / (k[1]! - 1)) * 172 + (rand() - 0.5) * 10, 0.7 + rand() * 0.16, i % 3 ? 'pf1' : 'pf2', 1])
  for (let i = 0; i < k[2]!; i++) items.push([-28 - (i / (k[2]! - 1)) * 124 + (rand() - 0.5) * 14, 0.48 + rand() * 0.14, i % 2 ? 'pf2' : 'pf3', 2])
  const layers = [0, 1, 2].map(() => ({ w: 0, d: new Map<string, string>() }))
  for (const [a, sc, cls, L] of items) {
    const r = (Math.round(a) * Math.PI) / 180
    put(layers[L]!.d, cls, fan(7, lod ? 9 : 15, [Math.cos(r) * sc, Math.sin(r) * sc, -Math.sin(r) * sc, Math.cos(r) * sc], true))
  }
  // fan leaves are solid pleated discs at every size
  return `<symbol id="${id}" overflow="visible"><path class="psk" d="${sk}L20 4Z"/>${crownPaths(layers, true)}</symbol>`
}

export const PALM_DEFS =
  dateCrown('cb-dc', 3) +
  fanCrown('cb-fc', 4) +
  dateCrown('cb-dcs', 3, true) +
  fanCrown('cb-fcs', 4, true) +
  `<pattern id="cb-bark" width="6" height="5" patternUnits="userSpaceOnUse"><path class="pbk" d="M0 0L3 2.5L6 0M0 5L3 2.5L6 5"/></pattern>`

// A palm standing at screen (x, y), h px to the crown; kind 0 date, 1 fan.
export function palm(x: number, y: number, h: number, seed: number, kind = 0): string {
  const rand = seeded(seed * 31 + 7)
  const lean = (rand() - 0.5) * h * 0.14
  const cx = x + lean
  const cy = y - h
  const w = kind ? h * 0.034 : h * 0.045
  const trunk = taper([[x, y], [x + lean * 0.25, y - h * 0.35], [x + lean * 0.65, y - h * 0.7], [cx, cy]], w * 1.25, w).replace(/(\.\d)\d*/g, '$1')
  const sc = (h / (kind ? 440 : 320)) * (0.95 + rand() * 0.15)
  return (
    (h < 120 ? `<path class="ptr" d="${trunk.replace(/\.\d/g, '')}"/>` : `<g class="ptr"><path id="cb-t${seed}" d="${trunk}"/></g><use href="#cb-t${seed}" fill="url(#cb-bark)"/><use href="#cb-t${seed}" fill="url(#k-side)"/>`) +
    `<g class="sway sy${seed % 3}"><use href="#cb-${kind ? 'fc' : 'dc'}${h < 120 ? 's' : ''}" transform="translate(${n(cx)} ${n(cy)}) scale(${sc.toFixed(2)})"/></g>`
  )
}

// ------------------------------------------------------------- Sqala

const PZ = 6
const MT = 1.2
const ST = 0.5
const TH = 1.2

// A crenellated wall face in its own plane: merlons `mw` wide between
// embrasures `gw` wide, starting with a merlon at s0.
function crenel(s0: number, s1: number, mw: number, gw: number, first = 0): { face: P2[]; gaps: [number, number][] } {
  const face: P2[] = [[s0, 0]]
  const gaps: [number, number][] = []
  let s = s0
  let m = first === 0
  face.push([s0, m ? MT : ST])
  while (s < s1) {
    const e = Math.min(s1, s + (m ? mw : gw))
    if (!m) gaps.push([s, e])
    face.push([e, m ? MT : ST])
    if (e < s1) face.push([e, m ? ST : MT])
    s = e
    m = !m
  }
  face.push([s1, 0])
  return { face, gaps }
}

function parapet(p: Sink, inner: Wall, out: P2, s0: number, s1: number, tone: number, first = 0): void {
  // out: the offset from inner to outer face in the ground plane
  const outer = wall([inner.o[0] + out[0], inner.o[1] + out[1]], inner.d, inner.z0)
  const { face } = crenel(s0, s1, 2.7, 1.15, first)
  const top = (a: number, b: number, z: number) => poly([wp3(inner, a, z), wp3(inner, b, z), wp3(outer, b, z), wp3(outer, a, z)], r0)
  // sills and merlon tops, then the inner face with its masonry
  let s = s0
  let m = first === 0
  let tops = ''
  let sills = ''
  let cheeks = ''
  let stain = ''
  while (s < s1) {
    const e = Math.min(s1, s + (m ? 2.7 : 1.15))
    if (m) tops += top(s, e, MT)
    else {
      sills += top(s, e, ST)
      stain += wpoly(inner, [[s - 0.2, ST], [e + 0.2, ST], [e - 0.1, 0], [s + 0.1, 0]], r0)
      for (const q of [s, e]) cheeks += poly([wp3(inner, q, ST), wp3(inner, q, MT), wp3(outer, q, MT), wp3(outer, q, ST)], r0)
    }
    s = e
    m = !m
  }
  p.add('qc', cheeks).add('qs', sills)
  const d = wpoly(inner, face, r0)
  p.add(`q${tone}`, d)
  // masonry, the dark streaks rain leaves under each embrasure, lichen on the tops
  p.add(planeFill('cb-ms', inner, s0, 0, (s0 + s1) / 2), d)
  if (stain) p.add('url(#cb-stain)', stain)
  p.add('qt', tops)
}
const wp3 = (w: Wall, s: number, z: number): P3 => [w.o[0] + w.d[0] * s, w.o[1] + w.d[1] * s, w.z0 + z]

// An old iron gun on its low carriage, in metres, muzzle to the left.
// Each paint is one path: both far wheels, both near wheels' rims and hubs
// (a ring and a disc, even-odd), the trunnion with the carriage.
const r3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()
const disc = (x: number, y: number, r: number): string => `M${r3(x - r)} ${r3(y)}a${r3(r)} ${r3(r)} 0 1 0 ${r3(2 * r)} 0a${r3(r)} ${r3(r)} 0 1 0 ${r3(-2 * r)} 0Z`
export const CANNON_DEF =
  `<symbol id="cb-gun" overflow="visible">` +
  // far wheels
  `<path class="gw0" d="${disc(-0.5, -0.44, 0.4)}${disc(1.2, -0.44, 0.4)}"/>` +
  // carriage cheek, stepped down to the rear, and the trunnion on it
  `<path class="gcr" d="M-.95-.42L-.95-.98L-.3-.98L-.3-.84L.5-.84L.5-.7L1.2-.7L1.2-.56L1.7-.56L1.7-.36L-.95-.36Z${disc(-0.207, -1.02, 0.13)}"/>` +
  // barrel: muzzle swell, chase, reinforce rings, breech and cascabel
  `<g transform="rotate(4 -.2 -1.12)"><path class="gbr" d="M-2.25-1.3L-2.12-1.33L-2-1.3L-1.95-1.27L.9-1.38L.98-1.4L1.3-1.4L1.42-1.3L1.46-1.12L1.42-.94L1.3-.84L.98-.84L.9-.86L-1.95-.97L-2-.94L-2.12-.91L-2.25-.94Z${disc(1.58, -1.12, 0.11)}"/>` +
  `<path fill="url(#cb-gunsh)" d="M-2.25-1.3L-2.12-1.33L-2-1.3L-1.95-1.27L.9-1.38L.98-1.4L1.3-1.4L1.42-1.3L1.46-1.12L1.42-.94L1.3-.84L.98-.84L.9-.86L-1.95-.97L-2-.94L-2.12-.91L-2.25-.94Z"/>` +
  `<path class="grg" d="M-1.5-1.3V-.96M-.5-1.34V-.92M.35-1.37V-.89M.98-1.4V-.84"/><path class="ghl" d="M-1.9-1.24L.88-1.345M1-1.365h.28"/><path class="grs" d="M-1.3-1.1h.5l-.2.1h-.4ZM-.1-1.06h.36l-.1.12H-.2ZM.5-1.2h.3l-.06.2H.46ZM-1.9-1.05h.3l-.1.06Z"/></g>` +
  // near wheels with spokes
  `<path class="gw2" d="${disc(-0.62, -0.45, 0.33)}${disc(1.08, -0.45, 0.33)}"/>` +
  `<path class="gsp" d="${[-0.62, 1.08].map(x => `M${r3(x - 0.33)}-.45h.66M${x}-.78v.66M${r3(x - 0.23)}-.68l.46 .46M${r3(x - 0.23)}-.22l.46-.46`).join('')}"/>` +
  `<path class="gw1" fill-rule="evenodd" d="${[-0.62, 1.08].map(x => disc(x, -0.45, 0.45) + disc(x, -0.45, 0.33) + disc(x, -0.45, 0.09)).join('')}"/>` +
  `</symbol>`

export function sqala(): { back: string; front: string } {
  const b = new Paint()
  // platform paving
  const pv = [
    [-16, 41, PZ],
    [16, 41, PZ],
    [16, 26, PZ],
    [-16, 26, PZ],
  ] as P3[]
  b.add('qp', poly(pv, r0))
  // worn slabs of uneven size, some paler, some darker
  let joints = ''
  const tones = ['', '']
  const jr = seeded(9)
  for (let d = 27.4; d < 38.5; ) {
    const dd = 1.3 + jr() * 1
    joints += `M${line([[-16, d, PZ], [16, d, PZ]], r0)}`
    for (let x = -16 + jr() * 2; x < 16; ) {
      const w = 2.2 + jr() * 3
      joints += `M${line([[x, d, PZ], [x, d + dd, PZ]], r0)}`
      const k = jr()
      if (k < 0.34 && x + w < 16) tones[k < 0.17 ? 0 : 1] += poly([[x, d, PZ], [x + w, d, PZ], [x + w, d + dd, PZ], [x, d + dd, PZ]], r0)
      x += w
    }
    d += dd
  }
  b.add('qv0', tones[0] as string).add('qv1', tones[1] as string)
  b.add('qj', joints)
  b.raw(`<path fill="url(#cb-grit)" d="${poly(pv, r0)}"/>`)
  // the firing step under the far parapet, and the low sun's shadows
  b.add('qs', poly([[-16, 40, PZ], [16, 40, PZ], [16, 38.6, PZ], [-16, 38.6, PZ]], r0))
  b.add('qt', poly([[-16, 40, PZ + 0.35], [16, 40, PZ + 0.35], [16, 38.6, PZ + 0.35], [-16, 38.6, PZ + 0.35]], r0))
  // the left parapet's shadow, toothed like the wall that throws it
  const sh: P3[] = [[-16, 40, PZ]]
  for (let d = 40, m = true; d > 26; m = !m) {
    const e = d - (m ? 2.7 : 1.15)
    const w = m ? 3.4 : 1.4
    sh.push([-16 + w, d + 1.2, PZ], [-16 + w, e + 1.2, PZ])
    d = e
  }
  sh.push([-16, 26, PZ])
  b.add('qsh', poly(sh, r0))
  // far parapet, facing us across the platform
  parapet(b, wall([-17.2, 40], [1, 0], PZ), [0, TH], 0, 34.4, 1)
  // side parapets beyond the guns: they stand apart, so they share paths
  const sb = new Layers()
  parapet(sb.unit(), wall([-16, 40], [0, -1], PZ), [-TH, 0], 0, 3.85, 0)
  parapet(sb.unit(), wall([16, 40], [0, -1], PZ), [TH, 0], 0, 3.85, 2)
  b.raw(sb.done())
  const k = ppm(36.7)
  const gun = (X: number, flip: number) => {
    const [x, y] = pr([X, 36.7, PZ])
    return `<use href="#cb-gun" transform="translate(${r1(x)} ${r1(y)}) scale(${r1(k * flip)} ${r1(k)})"/>`
  }
  // each gun's shadow lies on the paving, away from the sun
  for (const X of [-13.3, 13.3]) {
    const q = X < 0 ? -0.6 : 0
    b.add('qsh', poly([[X - 2.1 + q, 36.5, PZ], [X + 1.9 + q, 36.5, PZ], [X + 3.9 + q, 37.7, PZ], [X + 0.4 + q, 37.9, PZ]], r0))
  }
  b.raw(gun(-13.3, 1) + gun(13.3, -1))
  const f = new Paint()
  const sf = new Layers()
  parapet(sf.unit(), wall([-16, 36.15], [0, -1], PZ), [-TH, 0], 0, 10, 0)
  parapet(sf.unit(), wall([16, 36.15], [0, -1], PZ), [TH, 0], 0, 10, 2)
  f.raw(sf.done())
  return { back: b.done(), front: f.done() }
}

// ------------------------------------------------------------- cars

// Side views in a 16 px to the metre frame, nose to the right, wheels on y = 0.
// a wheel is its hub filled and its tyre stroked round it: one path
const WHEELS = (a: number, b: number) => `<path class="tyh" d="${disc(a, -4.6, 3.5)}${disc(b, -4.6, 3.5)}"/>`
const LIGHTS = (front: number, rear: number, y: number) =>
  `<rect class="hl" x="${front - 2.5}" y="${y}" width="2.5" height="2.6" rx="1"/><rect class="tl" x="${rear}" y="${y - 0.5}" width="2" height="3" rx=".8"/>` +
  `<g class="nt"><path class="beam" d="M${front} ${y + 1}l46 -5v14Z"/><circle class="hlg" cx="${front}" cy="${y + 1.3}" r="5"/><circle class="tlg" cx="${rear + 1}" cy="${y + 1}" r="4.5"/></g>`
const HATCH = 'M-30-4L-30-13Q-30-16.5-27-17.5L-22-24Q-21-25.5-18-25.5L4-25.5Q8-25.5 11-23L19-16.5L27-14.5Q31-13.5 31-9.5L31-4Z'
const HATCH_W = 'M-25-17.5L-20.6-23.3Q-20-24-18.6-24L-9-24L-9-17.5ZM-7.2-24L4-24Q7-24 9.4-22L15.6-17.5L-7.2-17.5Z'
const SALOON = 'M-33-4L-33-13Q-33-16-29.5-16.5L-22-17L-16-23.6Q-14.6-25-12-25L5-25Q8.5-25 11-23L19-16.5L28-14.5Q32-13.5 32-9.5L32-4Z'
const SALOON_W = 'M-19.6-17.2L-14.8-22.6Q-14-23.5-12.6-23.5L-5.6-23.5L-5.6-17.2ZM-3.8-23.5L5-23.5Q7.6-23.5 9.6-21.8L15.6-17.2L-3.8-17.2Z'
const car = (id: string, body: string, win: string, len: number, extra = ''): string =>
  `<symbol id="${id}" overflow="visible"><ellipse class="csh" cx="0" cy=".4" rx="${len + 3}" ry="2.6"/>` +
  `<path d="${body}"/><path fill="url(#cb-carsh)" d="${body}"/><path class="cwn" d="${win}"/>` +
  WHEELS(-19, 19.5) +
  LIGHTS(len + 1, -len - 1, -13.6) +
  extra +
  `</symbol>`
const SIGN = 'M-6.8-31.4h9.6a1.2 1.2 0 0 1 1.2 1.2v2.6a1.2 1.2 0 0 1-1.2 1.2h-9.6a1.2 1.2 0 0 1-1.2-1.2v-2.6a1.2 1.2 0 0 1 1.2-1.2Z'
export const CAR_DEFS =
  car('cb-hat', HATCH, HATCH_W, 30) +
  car('cb-sal', SALOON, SALOON_W, 32) +
  // the petit taxi's roof sign and rack
  // the sign's feet and the rack are open subpaths of the sign's own
  // outlined path
  `<symbol id="cb-sign" overflow="visible"><path class="tsg" d="${SIGN}M-5-25.5v-1M1-25.5v-1"/><path class="tsb" d="M-6-28.9h8"/></symbol>` +
  `<symbol id="cb-signr" overflow="visible"><path class="trk" d="M-15-25.5v-2.6h18v2.6M-9-28.1v2.6M-3-28.1v2.6"/><path class="tsg" d="${SIGN}M-5-25.5v-1M1-25.5v-1"/><path class="tsb" d="M-6-28.9h8"/></symbol>`

export type Car = { lane: number; dir: 1 | -1; dur: number; delay: number; kind: 'taxi' | 'car'; body: 0 | 1; paint?: string; rack?: boolean }

// lane: 0 nearest .. 3 furthest. Near lanes run right, far lanes left.
const LANE_D = [87.6, 94.4, 105.6, 112.4]
export function traffic(cars: readonly Car[]): string[] {
  const lanes: string[] = ['', '', '', '']
  for (const c of cars) {
    const D = LANE_D[c.lane] as number
    const k = ppm(D) / 16
    const body = `<use href="#cb-${c.body ? 'sal' : 'hat'}" class="${c.kind === 'taxi' ? 'taxi' : (c.paint ?? 'cp0')}"/>` + (c.kind === 'taxi' ? `<use href="#cb-sign${c.rack ? 'r' : ''}"/>` : '')
    lanes[c.lane] += `<g class="drv${c.dir > 0 ? '' : ' rv'}" style="animation-duration:${c.dur}s;animation-delay:-${c.delay}s"><g transform="translate(0 ${r1(gy(D))}) scale(${n(k * c.dir)} ${n(k)})">${body}</g></g>`
  }
  return lanes
}

// ------------------------------------------------------------- people

// Small figures in a frame of 10 px to the metre, feet at y = 0: straight
// still legs, the whole body riding a calm bounce as it travels.
// The skin of hands, neck and face is one path, and so are the legs with
// the hair or scarf (both near black). Far figures, a few pixels tall, are
// one silhouette each.
export const PEOPLE_DEFS =
  // a man in shirt and trousers, arms at his sides, the off-sun half in shade
  `<symbol id="cb-m0" overflow="visible"><path d="M-2.8-14.4Q-2.6-15.5 0-15.6Q2.6-15.5 2.8-14.4L3.5-9.4L2.8-9.2L2.4-12V-8.4H-2.4V-12L-2.8-9.2L-3.5-9.4Z"/><path class="sk" d="M-3.6-9.4h.9v.9h-.9ZM2.7-9.4h.9v.9h-.9ZM-.6-16h1.2v.8H-.6Z${disc(0, -17, 1.45)}"/><path class="lg" d="M-2-8.8h1.9L-.3 0h-1.6ZM.2-8.8h1.9L1.9 0H.4ZM-1.5-17.1A1.5 1.55 0 0 1 1.5-17.1L1.3-16.4H-1.3Z"/><path class="psd" d="M0-15.6Q2.6-15.5 2.8-14.4L3.5-9.4L2.4-9L2.1 0H.3L.6-8.6Z"/></symbol>` +
  // a figure in a long djellaba with the hood or scarf up
  `<symbol id="cb-m1" overflow="visible"><path d="M-2.6-14.2Q-2.4-15.4 0-15.5Q2.4-15.4 2.6-14.2L3.3-1.2H-3.3Z"/><circle class="sk" cy="-16.9" r="1.4"/><path class="lg" d="M-1.8-1.4h1.5V0h-1.7ZM.4-1.4h1.5L2.1 0H.4ZM-1.7-16.6A1.7 1.8 0 0 1 1.7-16.6Q1.6-14.8 2.2-14.2H-2.2Q-1.6-14.8-1.7-16.6Z"/><path class="psd" d="M0-18.4A1.7 1.8 0 0 1 1.7-16.6Q1.6-14.8 2.6-14.2L3.3-1.2H.2Z"/></symbol>` +
  `<path id="cb-m0s" d="M-2.8-14.4Q-2.6-15.5 0-15.6Q2.6-15.5 2.8-14.4L3.5-9.4L2.4-9L2.1 0H-2.1L-2.4-9L-3.5-9.4Z${disc(0, -17, 1.6)}"/>` +
  `<path id="cb-m1s" d="M-2.6-14.2Q-2.4-15.4 0-15.5Q2.4-15.4 2.6-14.2L3.3 0H-3.3Z${disc(0, -16.9, 1.6)}"/>`

export function walker(x0: number, D: number, dir: 1 | -1, kind: number, cls: string, dur: number, delay: number, z = 0): string {
  const k = ppm(D) / 10
  return `<g class="wk${dir > 0 ? '' : ' rv'}" style="animation-duration:${dur}s;animation-delay:-${delay}s"><g transform="translate(${x0} ${r1(gy(D, z))}) scale(${n(k)})"><use href="#cb-m${kind}" class="${cls} hop" style="animation-delay:-${n((delay * 0.37) % 0.7)}s"/></g></g>`
}
export function stander(X: number, D: number, kind: number, cls: string, z = 0): string {
  const [x, y] = pr([X, D, z])
  return `<use href="#cb-m${kind}" class="${cls}" transform="translate(${r1(x)} ${r1(y)}) scale(${n(ppm(D) / 10)})"/>`
}

// ------------------------------------------------------------- street

// Corniche lamp posts on the median, each a tall mast with two arms: all
// the posts' shadows, masts and lamp heads are one path each.
export function lamps(list: readonly number[], D: number): string {
  let sh = ''
  let mast = ''
  let head = ''
  let glow = ''
  for (const X of list) {
    const [x, y] = pr([X, D, 0])
    const k = ppm(D)
    const t = y - 9.5 * k
    const [sx, sy] = pr([X + 17, D + 9.6, 0])
    sh += `M${r1(x)} ${r1(y)}L${r1(sx)} ${r1(sy)}`
    mast += `M${r1(x)} ${r1(y)}V${r1(t)}M${r1(x - 2.4 * k)} ${r1(t + 0.5 * k)}Q${r1(x)} ${r1(t - 0.9 * k)} ${r1(x + 2.4 * k)} ${r1(t + 0.5 * k)}`
    head += `M${r1(x - 3 * k)} ${r1(t + 0.5 * k)}h${r1(1.2 * k)}M${r1(x + 1.8 * k)} ${r1(t + 0.5 * k)}h${r1(1.2 * k)}`
    glow += `<circle cx="${r1(x - 2.4 * k)}" cy="${r1(t + 0.9 * k)}" r="${r1(2.6 * k)}" fill="url(#cb-lamp)"/><circle cx="${r1(x + 2.4 * k)}" cy="${r1(t + 0.9 * k)}" r="${r1(2.6 * k)}" fill="url(#cb-lamp)"/><ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(13 * k)}" ry="${r1(1.6 * k)}" fill="url(#cb-pool)"/>`
  }
  return `<path class="lsh" d="${sh}"/><path class="lp" d="${mast}"/><path class="lph" d="${head}"/><g class="nt">${glow}</g>`
}

// A gull, wings up; the flap is a vertical squash in CSS.
export const GULL_DEF = `<path id="cb-gull" d="M-9-3Q-5-5 0 0Q5-5 9-3Q5-2.6 0 2Q-5-2.6-9-3Z"/>`
export function gull(x: number, y: number, s: number, dur: number, delay: number, dx: number): string {
  return `<g class="gfly" style="animation-duration:${dur}s;animation-delay:-${delay}s;--gx:${dx}px"><g transform="translate(${x} ${y}) scale(${s})"><use href="#cb-gull" class="gull" style="animation-delay:-${n(delay * 0.13)}s"/></g></g>`
}

// A small blue fishing boat of the port, in px, waterline at y = 0.
export const BOAT =
  `<path class="bth" d="M-22-1L-25-7L15-7L24-10L20-1Z"/><path class="btw" d="M-25-7L15-7L24-10L23.4-8.4L15-5.6L-24.4-5.6Z"/>` +
  `<path class="btc" d="M-12-7V-14H0V-7Z"/><path class="cwn" d="M-10-12.6h3.4v3h-3.4ZM-5-12.6h3.4v3H-5Z"/><path class="lp" d="M-13-14.4H1.4M6-7V-21M6-20L-14-11"/>` +
  `<path class="btr" d="M-23-.6Q0 1.4 20-.6L19 1.2Q0 2.6-22 1.2Z"/>`

// The flag of Morocco on its mast: red, with the green five-pointed star.
export function flag(X: number, D: number, z: number, h: number): string {
  const [x, y] = pr([X, D, z])
  const k = ppm(D)
  const t = y - h * k
  const w = 3 * k
  const hh = 2 * k
  const cx = x + w * 0.5
  const cy = t + hh * 0.52
  const r = hh * 0.24
  const star = [0, 2, 4, 1, 3].map((i, j) => `${j ? 'L' : 'M'}${r1(cx + Math.sin((i * 2 * Math.PI) / 5) * r)} ${r1(cy - Math.cos((i * 2 * Math.PI) / 5) * r)}`).join('') + 'Z'
  return (
    `<path class="lp" d="M${r1(x)} ${r1(y)}V${r1(t - 0.3 * k)}"/>` +
    `<g class="flag"><path class="fl" d="M${r1(x)} ${r1(t)}q${r1(w * 0.25)} ${r1(-hh * 0.08)} ${r1(w * 0.5)} 0t${r1(w * 0.5)} 0v${r1(hh)}q${r1(-w * 0.25)} ${r1(hh * 0.08)} ${r1(-w * 0.5)} 0t${r1(-w * 0.5)} 0Z"/><path class="fls" d="${star}"/><path fill="url(#cb-flsh)" d="M${r1(x)} ${r1(t)}h${r1(w)}v${r1(hh)}h${r1(-w)}Z"/></g>`
  )
}

// Riprap along a waterline through screen points: a broken band of dark
// stones, their lit tops, and the surf washing at their foot.
export function rocks(pts: readonly Pt[], k: number, cls: string): string {
  const d = `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}`
  return `<g class="rkg ${cls}"><path class="rk0" d="${d}"/><path class="rk1" d="${d}" transform="translate(${r1(-k)} ${r1(-k * 1.6)})"/><path class="foam" d="${d}" transform="translate(0 ${r1(k * 2.6)})"/></g>`
}
