import { seeded } from './kit'
import { Layers, Paint, boxFaces, gy, line, planeFill, poly, ppm, pr, r0, r1, wline, wpoly, wrect, type Face, type P2, type P3 } from './morocco-casablanca-geo'

// The city on the right of the bay: the far carpet of flat roofs, the
// apartment district, the Twin Center and the finance city's tower.

type Tint = 'a' | 'b' | 'c'
type BOpts = { tint?: Tint; win?: string; shops?: boolean; seed?: number; band?: 'n' | 'k' }

const AW = ['aw0', 'aw1', 'aw2', 'aw3']

// An apartment block: lit and shaded faces, windows laid in each wall's
// plane, a shop floor with awnings, and the clutter of a flat roof.
function block(p: Paint, X: number, D: number, len: number, wid: number, h: number, rot: number, o: BOpts = {}): void {
  const a: P2 = [Math.cos(rot), Math.sin(rot)]
  const rand = seeded((o.seed ?? 1) * 97 + 13)
  const band = o.band ?? 'n'
  const tint = band === 'n' ? (o.tint ?? 'a') : ''
  const faces = boxFaces([X, D], a, len, wid, 0, h)
  // the block's own parts stack in layers; its two faces do not overlap,
  // so each layer is one path per paint
  const L = new Layers()
  L.add(0, 'gsh', shadow(X, D, a, len, wid, h))
  // roof clutter first, behind the parapet line
  const f0 = faces[faces.length - 1] as Face
  for (let i = 0; i < 2; i++) {
    const s = 2 + rand() * (f0.len - 9)
    const bw = 3 + rand() * 4
    L.add(1, `${band}${tint}0`, wrect(f0.w, s, s + bw, h, h + 2.2 + rand() * 1.6, r0))
    L.add(2, `${band}${tint}2`, wrect(f0.w, s - 0.8, s, h, h + 2.6, r0))
  }
  const ax = f0.len * (0.2 + rand() * 0.6)
  L.add(2, 'rk', wline(f0.w, [[ax, h], [ax, h + 4 + rand() * 3]], r0))
  for (const f of faces) {
    L.add(3, `${band}${tint}${f.t}`, wrect(f.w, 0, f.len, 0, h))
    const top = h - 1.2
    const z0 = o.shops ? 4.2 : 0.6
    L.add(4, planeFill(o.win ?? 'cb-wa', f.w, 0.7, z0, f.len / 2), wrect(f.w, 0.7, f.len - 0.7, z0, top))
    if (o.shops) {
      L.add(5, 'shp', wrect(f.w, 0.5, f.len - 0.5, 0, 3.4))
      for (let s = 1, k = Math.floor(rand() * 4); s < f.len - 4; s += 5.2, k++) {
        if (rand() < 0.75) L.add(6, AW[k % 4] as string, wpoly(f.w, [[s, 3.7], [s + 4.4, 3.7], [s + 4.6, 2.7], [s - 0.2, 2.7]]))
      }
    }
  }
  p.raw(L.done())
}

// The long afternoon shadow a box throws on the ground, away from the sun.
function shadow(X: number, D: number, a: P2, len: number, wid: number, h: number): string {
  const sx = 0.87 * h * 1.5
  const sd = 0.49 * h * 1.5
  const c1: P2 = [X + a[0] * len, D + a[1] * len]
  const c2: P2 = [c1[0] - a[1] * wid, c1[1] + a[0] * wid]
  return poly([[X, D, 0], [c1[0], c1[1], 0], [c1[0] + sx, c1[1] + sd, 0], [c2[0] + sx, c2[1] + sd, 0], [c2[0], c2[1], 0]], r0)
}

// ---- the far carpet: rows of flat-roofed blocks fading into haze

function carpet(seed: number, D: number, x0: number, x1: number, hmin: number, hmax: number, op: number, sides = true): string {
  const rand = seeded(seed)
  const k = ppm(D)
  const base = r0(gy(D) + 3)
  let front = ''
  let side = ''
  let x = x0
  while (x < x1) {
    const w = (20 + rand() * 36) * k
    const top = r1(gy(D) - (hmin + rand() * (hmax - hmin)) * k)
    const sw = w * (0.1 + rand() * 0.14)
    if (sides) side += `M${r0(x)} ${top}h${r0(sw)}V${base}h${r0(-sw)}Z`
    front += `M${r0(x + sw)} ${top}h${r0(w - sw)}V${base}h${r0(sw - w)}Z`
    if (rand() < 0.35) front += `M${r0(x + sw + w * 0.3)} ${top}v${r1(-2.6 * k)}h${r0(w * 0.25)}v${r1(2.6 * k)}Z`
    x += w + (rand() < 0.3 ? rand() * 10 * k : 0)
  }
  // each part takes the row's haze as its own opacity: no group layer
  return `<path class="e1" fill-opacity="${op}" d="${front}"/><path fill="url(#cb-fw)" opacity="${op}" d="${front}"/>${sides ? `<path class="e2" fill-opacity="${op}" d="${side}"/>` : ''}`
}

// A plain tower or slab in the middle distance.
function slab(p: Paint, X: number, D: number, len: number, wid: number, h: number, rot: number, win = 'cb-wg'): void {
  const L = new Layers()
  for (const f of boxFaces([X, D], [Math.cos(rot), Math.sin(rot)], len, wid, 0, h)) {
    L.add(0, `k${f.t}`, wrect(f.w, 0, f.len, 0, h, r0))
    L.add(1, planeFill(win, f.w, 0.8, 2, f.len / 2), wrect(f.w, 0.8, f.len - 0.8, 2, h - 2, r0))
  }
  p.raw(L.done())
}

// A tower crane: mast, jib, counter-jib and tie bars.
function crane(X: number, D: number, h: number, jib: number, dir: number): string {
  const b = pr([X, D, 0])
  const t = pr([X, D, h])
  const k = ppm(D)
  const j = (v: number) => r1(t[0] + v * k * dir)
  const ty = t[1]
  return `M${r1(b[0])} ${r1(b[1])}V${r1(ty - 5 * k)}M${j(-jib * 0.28)} ${r1(ty)}H${j(jib)}M${j(-jib * 0.28)} ${r1(ty)}L${r1(t[0])} ${r1(ty - 5 * k)}L${j(jib * 0.6)} ${r1(ty)}M${j(-jib * 0.26)} ${r1(ty)}v${r1(2.4 * k)}h${r1(3 * k * dir)}v${r1(-2.4 * k)}M${j(jib * 0.7)} ${r1(ty)}v${r1(h * 0.3 * k)}`
}

// A port gantry crane on the quay: portal legs, the long boom over the
// water, the apex frame and its stays, the machinery house.
function gantry(X: number, D: number, flip = 1): string {
  const k = ppm(D)
  const [x, y] = pr([X, D, 2])
  const q = (dx: number, dz: number) => `${r1(x + dx * k * flip)} ${r1(y - dz * k)}`
  return `M${q(-8, 0)}L${q(-7, 30)}M${q(8, 0)}L${q(7, 30)}M${q(-8, 12)}L${q(8, 12)}M${q(-20, 30)}L${q(40, 30)}M${q(-20, 30)}L${q(0, 46)}L${q(40, 30)}M${q(0, 30)}L${q(0, 46)}M${q(-14, 31)}h${r1(9 * k * flip)}v${r1(-3.4 * k)}h${r1(-9 * k * flip)}Z`
}

// ---- the Twin Center: two identical slim towers, pale piers at the
// corners and a broad field of blue glass between, on a shared podium

function twin(p: Paint, X: number, D: number, rot: number): void {
  const a: P2 = [Math.cos(rot), Math.sin(rot)]
  const S = 27
  // each tower's parts in layers; its seen faces do not overlap
  const tower = (x: number, d: number) => {
    const L = new Layers()
    // crown first: a recessed top storey and the roof plant
    for (const f of boxFaces([x + a[0] * 3 - a[1] * 3, d + a[1] * 3 + a[0] * 3], a, S - 6, S - 6, 108, 7)) {
      L.add(0, `tw${f.t}`, wrect(f.w, 0, f.len, 0, 7))
      L.add(1, 'twk', wrect(f.w, 1.5, f.len - 1.5, 1.2, 5.4))
    }
    for (const f of boxFaces([x, d], a, S, S, 0, 108)) {
      f.t = f.t === 2 ? 2 : 0
      const d0 = wrect(f.w, 0, S, 0, 108)
      const g = wrect(f.w, 4, S - 4, 4, 105)
      L.add(2, `tw${f.t}`, d0).add(3, `tg${f.t}`, g).add(4, planeFill('cb-tw', f.w, 4, 4, S / 2), g).add(5, 'url(#cb-glass)', g)
      L.add(6, `url(#cb-tsh${f.t ? '' : '0'})`, d0).add(7, 'twk', wrect(f.w, 0, S, 105.6, 108))
    }
    const c: P3 = [x + (a[0] - a[1]) * S * 0.5, d + (a[1] + a[0]) * S * 0.5, 115]
    L.add(8, 'ant', `M${line([c, [c[0], c[1], 141]])}M${line([[c[0] + 5, c[1], 115], [c[0] + 5, c[1], 128]])}M${line([[c[0] - 6, c[1] + 3, 115], [c[0] - 6, c[1] + 3, 124]])}`)
    p.raw(L.done())
  }
  const gap = 15
  const x2 = X + a[0] * (S + gap)
  const d2 = D + a[1] * (S + gap)
  // far tower, podium, near tower: the rotation puts the right one further off
  tower(x2, d2)
  const L = new Layers()
  for (const f of boxFaces([X + a[0] * (S - 2) + a[1] * 2, D + a[1] * (S - 2) - a[0] * 2], a, gap + 4, S * 0.8, 0, 24)) {
    const g = wrect(f.w, 1, f.len - 1, 1, 22)
    L.add(0, `tw${f.t}`, wrect(f.w, 0, f.len, 0, 24)).add(1, `tg${f.t}`, g).add(2, planeFill('cb-tw', f.w, 1, 1, f.len / 2), g)
  }
  p.raw(L.done())
  tower(X, D)
}

// ---- the finance city's tower: a white diagrid over glass, its top
// breaking into a crown of sharp facets at different heights

function finance(p: Paint, X: number, D: number, rot: number): void {
  const a: P2 = [Math.cos(rot), Math.sin(rot)]
  const S = 34
  const H0 = 88
  const faces = boxFaces([X, D], a, S, S, 0, H0)
  // the top edge of each face, folded: they meet at the shared corner
  const tops: P2[][] = [
    [[0, 103], [7, 121], [15, 97], [24, 112], [34, 106]],
    [[0, 106], [9, 100], [20, 118], [27, 95], [34, 109]],
  ]
  const L = new Layers()
  faces.forEach((f, i) => {
    f.t = f.t === 2 ? 2 : 0
    const top = tops[faces.length === 1 ? 1 : i] as P2[]
    // the inside of the far shards, seen through the notches
    L.add(0, 'fk', wpoly(f.w, [[1, H0], [1, 99], [9, 112], [18, 102], [26, 113], [33, 101], [33, H0]]))
    const d = wpoly(f.w, [[0, 0], ...top, [S, 0]])
    L.add(1, `fc${f.t}`, d)
    // the folds: each facet turned a little more or less to the light
    L.add(2, f.t ? 'fc1' : 'fcd', wpoly(f.w, [top[1] as P2, top[2] as P2, [(top[2] as P2)[0] + 3, 58], [(top[1] as P2)[0] - 2, 76]]) + wpoly(f.w, [top[3] as P2, top[4] as P2, [S, 66], [(top[3] as P2)[0] - 1, 80]]))
    L.add(3, f.t ? 'fcl' : 'fc1', wpoly(f.w, [top[0] as P2, top[1] as P2, [(top[1] as P2)[0] - 2, 76], [0, 84]]) + wpoly(f.w, [top[2] as P2, top[3] as P2, [(top[3] as P2)[0] - 1, 80], [(top[2] as P2)[0] + 3, 58]]))
    L.add(4, planeFill('cb-dg', f.w, 0, 0, S / 2), d).add(5, 'url(#cb-glass)', d).add(6, `url(#cb-tsh${f.t ? '' : '0'})`, d)
    L.add(7, 'fe', wline(f.w, top)).add(7, 'fk', wrect(f.w, 1.5, S - 1.5, 0, 6))
  })
  // the glass sheen at half strength, as one path over both faces
  p.raw(L.done().replace('fill="url(#cb-glass)"', 'fill="url(#cb-glass)" opacity=".5"'))
}

export function city(): { far: string; mid: string; near: string } {
  // far carpet behind everything, from the mosque's esplanade round to the right edge
  const far =
    carpet(4, 1500, 500, 1690, 14, 56, 0.5, false) +
    `<path class="crn" stroke-opacity=".7" d="${gantry(-70, 900, -1) + gantry(-30, 900, -1) + gantry(34, 940, -1)}"/>` +
    carpet(5, 800, 570, 1400, 10, 32, 0.66) +
    carpet(6, 540, 640, 1200, 8, 20, 0.8) +
    carpet(7, 400, 800, 1140, 7, 15, 0.92)
  const m = new Paint()
  slab(m, 395, 1050, 30, 22, 96, 0.3)
  slab(m, 250, 980, 40, 18, 64, -0.2)
  slab(m, 470, 900, 26, 26, 82, 0.5)
  m.add('crn', crane(330, 900, 92, 46, -1) + crane(520, 860, 104, 50, -1))
  slab(m, 100, 760, 46, 16, 44, 0.1, 'cb-wb')
  slab(m, 190, 720, 34, 18, 52, -0.1, 'cb-wb')
  slab(m, 385, 700, 30, 20, 70, 0.35)
  const mid = m.done()
  const p = new Paint()
  twin(p, 150, 540, 0.42)
  finance(p, 262, 500, 0.5)
  // the apartment district in front of the towers
  block(p, 196, 400, 30, 16, 27, 0.1, { tint: 'b', seed: 2, band: 'k', win: 'cb-wb' })
  block(p, 90, 380, 34, 14, 22, -0.05, { tint: 'a', seed: 3, band: 'k' })
  block(p, 262, 330, 30, 16, 24, 0.15, { tint: 'c', seed: 4, shops: true, win: 'cb-wb' })
  block(p, 142, 318, 30, 15, 30, 0.02, { tint: 'a', seed: 5, shops: true })
  block(p, 66, 300, 30, 15, 20, 0.04, { tint: 'b', seed: 6, shops: true, win: 'cb-wb' })
  block(p, 204, 262, 28, 15, 26, 0.06, { tint: 'b', seed: 7, shops: true })
  block(p, 106, 256, 30, 15, 23, 0, { tint: 'c', seed: 8, shops: true })
  return { far, mid, near: p.done() }
}

// Window and glass patterns in metres. Night lights a share of the panes.
const cells = (cols: number, rows: number, bw: number, fh: number, cell: (x: number, y: number, lit: boolean) => string, seed: number): string => {
  const rand = seeded(seed)
  let out = ''
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out += cell(i * bw, j * fh, rand() < 0.3)
  return out
}
const rect = (cls: string, x: number, y: number, w: number, h: number): string => `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"/>`
export const CITY_DEFS =
  `<pattern id="cb-wa" width="10.5" height="6.4" patternUnits="userSpaceOnUse">${cells(3, 2, 3.5, 3.2, (x, y, lit) => rect('wb', x + 0.3, y + 0.2, 2.9, 0.7) + rect(lit ? 'wl' : 'wn', x + 0.9, y + 1.1, 1.7, 1.6), 5)}</pattern>` +
  `<pattern id="cb-wb" width="9" height="6.4" patternUnits="userSpaceOnUse">${cells(3, 2, 3, 3.2, (x, y, lit) => rect(lit ? 'wl' : 'wn', x + 0.8, y + 0.7, 1.3, 2), 9)}</pattern>` +
  `<pattern id="cb-wg" width="9" height="7.2" patternUnits="userSpaceOnUse">${cells(3, 2, 3, 3.6, (x, y, lit) => rect(lit ? 'gl' : 'gz', x + 0.25, y + 0.5, 2.5, 2.7), 7)}</pattern>` +
  // Twin Center glass: white fins, faint floors, a few lit bays by night
  `<pattern id="cb-tw" width="9.5" height="15.6" patternUnits="userSpaceOnUse">${cells(1, 4, 9.5, 3.9, (x, y, lit) => (lit ? rect('twl', x + ((y * 7) % 6), y + 0.6, 2.2, 2.8) : ''), 3)}<path class="tfl" d="M0 0h9.5M0 3.9h9.5M0 7.8h9.5M0 11.7h9.5"/><path class="tfn" d="M0 0v15.6M2.375 0v15.6M4.75 0v15.6M7.125 0v15.6"/></pattern>` +
  // finance tower: glass under a white diagonal lattice
  `<pattern id="cb-dg" width="2.2" height="3.6" patternUnits="userSpaceOnUse"><path class="dgg" d="M1.1 .3L1.95 1.8L1.1 3.3L.25 1.8Z"/></pattern>` +
  `<pattern id="cb-fw" width="9" height="7" patternUnits="userSpaceOnUse"><path class="fw" d="M1 2h1.6M5 2h1.6M3 5.4h1.6M7 5.4h1.4"/><path class="fwl" d="M1 2h1.6M7 5.4h1.4"/></pattern>`
