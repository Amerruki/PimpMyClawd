import { Layers, Paint, patId, arch, archTop, line, patterns, planeFill, poly, pr, r1, wall, wallMatrix, wline, wpoly, wrect, type P2, type P3, type Sink, type Wall } from './morocco-casablanca-geo'

// The Hassan II Mosque, built in metres and seen from the bay to its
// south-east: the long prayer hall runs away to the left over the Atlantic,
// and the minaret stands at the centre of the landward face on the right.
// u runs along the hall from the landward face out to sea, v across it
// (positive toward the viewer), z up from the esplanade.

const TH = (30 * Math.PI) / 180
const A: P2 = [-Math.cos(TH), Math.sin(TH)]
const B: P2 = [-Math.sin(TH), -Math.cos(TH)]
const NA: P2 = [-A[0], -A[1]]
const NB: P2 = [-B[0], -B[1]]
const O: P2 = [-196, 668]
export const MZ = 4
const MW = 21
const MH = MW / 2

const W = (u: number, v: number): P2 => [O[0] + A[0] * u + B[0] * v, O[1] + A[1] * u + B[1] * v]
const M = (u: number, v: number, z: number): P3 => [...W(u, v), MZ + z]
export const mosquePoint = (u: number, v: number, z: number): P2 => pr(M(u, v, z))

// A portal: carved frame, the arch's dark depth, and a bronze door below
// the springing.
function portal(p: Sink, w: Wall, c: number, hw: number, zb: number, zs: number, t: number, door = true, carve = ''): void {
  const top = archTop(hw, zs)
  const fr = wrect(w, c - hw * 1.5, c + hw * 1.5, zb, top + hw * 0.55)
  p.add(`mf${t}`, fr)
  // the carved surround: fine lattice over the frame, a plain band round the
  // arch; portals along one wall can share one lattice fill
  if (hw > 4.5) {
    p.add(carve || planeFill('cb-carve', w, c - hw * 1.5, zb), fr)
    p.add(`mf${t}`, wpoly(w, arch(c, hw * 1.16, zb, zs, 0.35, 3)))
  }
  p.add('mk', wpoly(w, arch(c, hw, zb, zs, 0.35, 4)))
  if (door) p.add('mb', wrect(w, c - hw * 0.86, c + hw * 0.86, zb, zs * 0.96 + zb * 0.04))
}

// A run of small round horseshoe arches as a pattern in the wall's plane,
// in stretches short enough that the flat pattern follows the perspective
// closely enough at this size.
function arcade(p: Sink, w: Wall, s0: number, s1: number, count: number, hw: number, zb: number, zs: number, cls = 'mk'): void {
  const step = (s1 - s0) / count
  const R = hw * 1.13
  const per = Math.max(1, Math.round(80 / step))
  for (let i = 0; i < count; i += per) {
    const a = s0 + i * step
    const b = Math.min(s1, a + per * step)
    const id = patId()
    patterns.push(
      `<pattern id="${id}" width="${r2(step)}" height="99" patternUnits="userSpaceOnUse" patternTransform="${wallMatrix(w, a, zb, (a + b) / 2)}"><path class="${cls}" d="M${r2(step / 2 - hw)} 0V${r2(zs - zb)}A${r2(R)} ${r2(R)} 0 1 0 ${r2(step / 2 + hw)} ${r2(zs - zb)}V0Z"/></pattern>`,
    )
    p.add(`url(#${id})`, wrect(w, a, b, zb, zs + R * 2))
  }
}
const r2 = (v: number): string => (Math.round(v * 100) / 100).toString()

// Faint coursing and uneven tone over a stone face, in short stretches.
function courses(p: Sink, w: Wall, s0: number, s1: number, z0: number, z1: number, seg = 1): void {
  for (let i = 0; i < seg; i++) {
    const a = s0 + ((s1 - s0) * i) / seg
    const b = s0 + ((s1 - s0) * (i + 1)) / seg
    p.add(planeFill('cb-crs', w, a, z0, (a + b) / 2), wrect(w, a, b, z0, z1))
  }
}

// A square pavilion with a green pyramid roof, its two seen faces dressed.
function pavilion(p: Sink, u0: number, u1: number, v0: number, v1: number, h: number, roof: number, dress: (p: Sink, side: Wall, front: Wall) => void, us = u1): void {
  const side = wall(W(us, v1), NA, MZ)
  const front = wall(W(u0, v1), NB, MZ)
  p.add('m2', wrect(side, 0, us - u0, 0, h))
  p.add('m0', wrect(front, 0, v1 - v0, 0, h))
  dress(p, side, front)
  p.add('mg0', wrect(side, 0, us - u0, h - 1.6, h)).add('mg0', wrect(front, 0, v1 - v0, h - 1.6, h))
  const ap = M((u0 + u1) / 2, (v0 + v1) / 2, h + roof)
  p.add('mg2', poly([M(u1, v1, h), M(u0, v1, h), ap]))
  p.add('mg0', poly([M(u0, v1, h), M(u0, v0, h), ap]))
  p.add('mrd', `M${line([M(u0, v1, h), ap])}`)
  p.add('mgd', `M${line([ap, [ap[0], ap[1], ap[2] + 4]])}`)
}

function build(): string {
  const p = new Paint()
  const LS = wall(W(200, 50), NA, MZ) // long side, s = 200 - u, left to right
  const LW = wall(W(0, 50), NB, MZ) // landward face, s = 50 - v
  const su = (u: number) => 200 - u

  // ---- prayer hall, lower tier: its two faces meet at one corner and do
  // not overlap, so their details share paths layer by layer
  const h = new Layers()
  h.add(0, 'm2', wrect(LS, 0, 200, 0, 28)).add(0, 'm0', wrect(LW, 0, 100, 0, 28))
  h.add(1, 'url(#cb-wall)', wrect(LS, 0, 200, 0, 28)).add(1, 'url(#cb-far)', wrect(LS, 0, 200, 0, 28)).add(1, 'url(#cb-wallsh)', wrect(LW, 0, 100, 0, 28))
  courses(h.unit(2), LS, 0, 200, 0, 26, 2)
  courses(h.unit(2), LW, 0, 100, 0, 26)
  // long side: a base arcade, a string course, tall arched bays above
  for (const u of [25, 43, 61, 79, 121, 139, 157, 175]) {
    h.add(3, 'mf2', wrect(LS, su(u) - 6.6, su(u) + 6.6, 11.5, 26))
    h.add(6, 'mk', wpoly(LS, arch(su(u), 4.1, 12.5, 18.2, 0.35, 3)))
    h.add(7, 'mb', wrect(LS, su(u) - 3.5, su(u) + 3.5, 12.5, 17))
  }
  // landward face: great portals either side of the minaret, one carved
  // lattice laid across all four
  const carve = planeFill('cb-carve', LW, 50, 0)
  for (const s of [14, 29, 71, 86]) portal(h.unit(3), LW, s, 4.7, 0, 12.5, 0, true, carve)
  arcade(h.unit(8), LS, su(184), su(112), 12, 1.9, 0, 4.6)
  arcade(h.unit(8), LS, su(88), su(16), 12, 1.9, 0, 4.6)
  h.add(9, 'ml', wline(LS, [[0, 10], [200, 10]]))
  h.add(10, 'msh', wrect(LS, 0, 200, 24.6, 26.4) + wrect(LS, su(88), su(88) + 4.5, 0, 26.4) + wrect(LS, su(186), su(186) + 3.5, 0, 26.4) + wrect(LW, 0, 100, 23.6, 26.4))
  h.add(11, 'mg1', wrect(LS, 0, 200, 26.4, 28)).add(11, 'mg0', wrect(LW, 0, 100, 26.4, 28))
  p.raw(h.done())

  // ---- lower roofs
  const ra = [M(200, 50, 28), M(0, 50, 28), M(18, 32, 38), M(182, 32, 38)]
  p.add('mg2', poly(ra))
  const rl = [M(0, 50, 28), M(0, -50, 28), M(18, -32, 38), M(18, 32, 38)]
  p.add('mg0', poly(rl))
  let tiles = ''
  for (let u = 5; u < 200; u += 10) {
    const k = Math.min(1, Math.min(u, 200 - u) / 18)
    tiles += `M${line([M(u, 50, 28), M(u, 50 - 18 * k, 28 + 10 * k)])}`
  }
  p.add('mt', tiles)
  p.add('mrd', `M${line([M(0, 50, 28), M(18, 32, 38), M(182, 32, 38)])}`)
  // ---- upper tier and main roof
  const US = wall(W(182, 32), NA, MZ)
  const UW = wall(W(18, 32), NB, MZ)
  const up = new Layers()
  up.add(0, 'm2', wrect(US, 0, 164, 38, 47)).add(0, 'm0', wrect(UW, 0, 64, 38, 47))
  arcade(up.unit(1), US, 3, 161, 20, 1.5, 39.6, 42.6, 'mk')
  arcade(up.unit(1), UW, 4, 60, 7, 1.5, 39.6, 42.6, 'mk')
  up.add(2, 'msh', wrect(US, 0, 164, 44, 45.8) + wrect(UW, 0, 64, 43, 45.8))
  up.add(3, 'mg1', wrect(US, 0, 164, 45.8, 47)).add(3, 'mg0', wrect(UW, 0, 64, 45.8, 47))
  p.raw(up.done())
  p.add('mg2', poly([M(182, 32, 47), M(18, 32, 47), M(52, 0, 62), M(148, 0, 62)]))
  p.add('mg0', poly([M(18, 32, 47), M(18, -32, 47), M(52, 0, 62)]))
  tiles = ''
  for (let u = 24; u < 182; u += 10) {
    const k = Math.min(1, Math.min(u - 18, 182 - u) / 34)
    tiles += `M${line([M(u, 32, 47), M(u, 32 - 32 * k, 47 + 15 * k)])}`
  }
  p.add('mt', tiles)
  p.add('mrd', `M${line([M(148, 0, 62), M(52, 0, 62), M(18, 32, 47)])}`)
  p.add('url(#cb-roof)', poly([M(200, 50, 28), M(0, 50, 28), M(18, 32, 38), M(18, 32, 47), M(52, 0, 62), M(148, 0, 62), M(182, 32, 47), M(182, 32, 38)]))

  // ---- pavilions: far corner, centre, near corners; they stand apart, so
  // they too share paths
  const pv = new Layers()
  const bay = (q: Sink, side: Wall, front: Wall, len: number, wid: number) => {
    portal(q, side, len / 2, len * 0.2, 0, 15, 2)
    portal(q, front, wid / 2, wid * 0.2, 0, 15, 0)
  }
  pavilion(pv.unit(), 186, 204, 40, 55, 34, 9, (q, s, f) => bay(q, s, f, 18, 15))
  pavilion(pv.unit(), 88, 112, 44, 57, 37, 12, (q, s, f) => {
    portal(q, s, 12, 6.2, 0, 17, 2)
    q.add('mk', wpoly(f, arch(6.5, 2.4, 3, 14)))
  })
  pavilion(pv.unit(), -3, 15, 40, 55, 34, 9, (q, s, f) => bay(q, s, f, 18, 15))
  // right end of the landward face
  pavilion(pv.unit(), -3, 15, -55, -40, 34, 9, (q, _s, f) => portal(q, f, 7.5, 3, 0, 15, 0), 0)
  p.raw(pv.done())

  // ---- the minaret, square, in front of the landward face; its two seen
  // faces share paths
  const TK = 0.075 / 165
  const MS: Wall = { ...wall(W(0, MH), NA, MZ), tp: { c: MH, k: TK, n: NB } } // lit face
  const MF: Wall = { ...wall(W(-MW, MH), NB, MZ), tp: { c: MH, k: TK, n: A } } // shaded face
  const faces: [Wall, number][] = [
    [MS, 2],
    [MF, 0],
  ]
  const mn = new Layers()
  for (const [w, t] of faces) {
    // stepped merlons on the parapet, then the shaft
    let mer = ''
    const ms = MW / 6
    for (let i = 0; i < 6; i++) {
      const c = ms / 2 + i * ms
      mer += wpoly(w, [[c - 1.4, 165.4], [c - 1.4, 167.2], [c - 0.7, 167.2], [c - 0.7, 168.8], [c + 0.7, 168.8], [c + 0.7, 167.2], [c + 1.4, 167.2], [c + 1.4, 165.4]])
    }
    mn.add(0, `m${t}`, mer + wrect(w, 0, MW, 0, 165))
    mn.add(1, `url(#${t ? 'cb-shaft' : 'cb-shaftsh'})`, wrect(w, 0, MW, 0, 165))
    courses(mn.unit(2), w, 0, MW, 0, 129)
    // door in the plinth, and the cornice
    mn.add(3, `mf${t}`, wrect(w, -0.7, MW + 0.7, 163, 165.4))
    portal(mn.unit(3), w, MH, 3.6, 0, 6.5, t)
    // three tall sebka panels, each with paired windows at its foot; one
    // lattice fill runs through all three
    let panels = ''
    let wins = ''
    let edges = ''
    for (const z0 of [18, 55, 92]) {
      panels += wrect(w, 2.6, MW - 2.6, z0, z0 + 34)
      wins += wpoly(w, arch(MH - 2.5, 1.3, z0 + 3, z0 + 7, 0.3, 3)) + wpoly(w, arch(MH + 2.5, 1.3, z0 + 3, z0 + 7, 0.3, 3))
      edges += wline(w, [[2.6, z0], [2.6, z0 + 34], [MW - 2.6, z0 + 34]])
    }
    mn.add(6, `mp${t}`, panels).add(7, planeFill('cb-sebka', w, 2.6, 18), panels).add(8, 'mk', wins).add(9, 'mps', edges)
    mn.add(9, 'ml', wline(w, [[0, 15], [MW, 15]]) + wline(w, [[0, 129], [MW, 129]]))
    // the green zellige band with its chevron foot
    const zig: P2[] = [[0, 157]]
    for (let i = 0; i <= 10; i++) zig.push([(i * MW) / 10, i % 2 ? 131 : 135.5])
    zig.push([MW, 157])
    const band = wpoly(w, zig)
    mn.add(10, `mz${t}`, band).add(11, planeFill('cb-zel', w, 0, 131), band).add(12, 'mzl', wline(w, [[0, 157], [MW, 157]]))
    // frieze of small arches under the cornice's shadow
    arcade(mn.unit(13), w, 1.2, MW - 1.2, 7, 0.8, 158.5, 160.4)
    mn.add(14, 'msh', wrect(w, 0, MW, 161.4, 163))
  }
  p.raw(mn.done())
  // ---- the lantern, banded with green tile
  const LH = 4.3
  const LSd = wall(W(-MH + LH, LH), NA, MZ)
  const LF = wall(W(-MH - LH, LH), NB, MZ)
  const lf: [Wall, number][] = [
    [LSd, 2],
    [LF, 0],
  ]
  const ln = new Layers()
  for (const [w, t] of lf) {
    let mer = ''
    for (let i = 0; i < 3; i++) {
      const c = (LH / 3) * (1 + i * 2)
      mer += wpoly(w, [[c - 1, 197], [c - 1, 198.2], [c - 0.45, 198.2], [c - 0.45, 199.4], [c + 0.45, 199.4], [c + 0.45, 198.2], [c + 1, 198.2], [c + 1, 197]])
    }
    ln.add(0, `m${t}`, mer + wrect(w, 0, LH * 2, 165, 197))
    ln.add(1, 'mk', wpoly(w, arch(LH, 1.3, 168, 172.5, 0.3, 3)))
    ln.add(2, `mz${t}`, wrect(w, 0, LH * 2, 177, 190)).add(3, planeFill('cb-zel', w, 0, 177), wrect(w, 0, LH * 2, 177, 190))
    ln.add(4, `mf${t}`, wrect(w, -0.5, LH * 2 + 0.5, 195.4, 197))
  }
  p.raw(ln.done())
  // ribbed dome and the three golden balls
  const [dx, dy] = pr(M(-MH, 0, 197))
  const k = Math.abs(pr(M(-MH, 0, 198))[1] - dy)
  const dome = (rx: number) => `M${r1(dx - rx * k)} ${r1(dy)}C${r1(dx - rx * k * 1.05)} ${r1(dy - 4 * k)} ${r1(dx - rx * k * 0.45)} ${r1(dy - 6.4 * k)} ${r1(dx)} ${r1(dy - 7.6 * k)}C${r1(dx + rx * k * 0.45)} ${r1(dy - 6.4 * k)} ${r1(dx + rx * k * 1.05)} ${r1(dy - 4 * k)} ${r1(dx + rx * k)} ${r1(dy)}Z`
  p.add('mdm', dome(3.7))
  p.add('url(#cb-dome)', dome(3.7))
  p.add('mdr', [-0.55, 0, 0.55].map(q => `M${r1(dx + q * 3.7 * k)} ${r1(dy)}Q${r1(dx + q * 4 * k)} ${r1(dy - 4.4 * k)} ${r1(dx)} ${r1(dy - 7.6 * k)}`).join(''))
  p.add('mgd', `M${r1(dx)} ${r1(dy - 7.4 * k)}V${r1(dy - 18 * k)}`)
  // the balls as one path of circles
  p.add(
    'mgb',
    [
      [9.4, 1.5],
      [12.2, 1.15],
      [14.5, 0.85],
    ]
      .map(([z, r]) => `M${r1(dx - r! * k)} ${r1(dy - z! * k)}a${r1(r! * k)} ${r1(r! * k)} 0 1 0 ${r1(2 * r! * k)} 0a${r1(r! * k)} ${r1(r! * k)} 0 1 0 ${r1(-2 * r! * k)} 0Z`)
      .join(''),
  )
  return p.done()
}

const MOSQUE = build()

// The esplanade and the sea wall under the hall.
function platform(): string {
  const p = new Paint()
  const top = [M(214, 64, 0), M(-190, 64, 0), M(-190, -110, 0), M(214, -64, 0)]
  // the minaret's long shadow runs back across the esplanade, away from the sun
  const shadow = poly([M(-MW, -MH, 0), M(0, -MH, 0), M(-58, -110, 0), M(-58 - MW, -110, 0)]) + poly([M(-MW, MH, 0), M(-MW, -MH, 0), M(-58 - MW, -110, 0), M(-70 - MW, -110, 0)])
  const SW = wall(W(214, 64), NA, -5)
  p.add('mq0', wrect(SW, 0, 404, 0, MZ + 5))
  p.add('mq1', poly(top)).add('msh', shadow)
  p.add('url(#cb-quay)', wrect(SW, 0, 404, 0, MZ + 5))
  return p.done()
}

export const mosque = (): string => platform() + MOSQUE

// Stone and tile patterns in metres, laid into a wall by planeFill.
export const MOSQUE_DEFS =
  `<pattern id="cb-sebka" width="3.8" height="6.2" patternUnits="userSpaceOnUse"><path class="msk" d="M0 0L1.9 3.1L3.8 0M0 6.2L1.9 3.1L3.8 6.2"/><path class="msk2" d="M.5 0L1.9 2.3L3.3 0M.5 6.2L1.9 3.9L3.3 6.2"/></pattern>` +
  `<pattern id="cb-carve" width="1.5" height="1.5" patternUnits="userSpaceOnUse"><path class="msk" d="M0 .75L.75 0L1.5 .75L.75 1.5Z"/></pattern>` +
  `<pattern id="cb-crs" width="11" height="4.4" patternUnits="userSpaceOnUse"><path class="mcl" d="M0 .1h11M0 2.3h11M3 .1v2.2M8 .1v2.2M5.5 2.3v2.1M10.4 2.3v2.1"/><path class="mcb" d="M3 .1h5v2.2H3Z"/><path class="mcd" d="M5.5 2.3h4.9v2.1H5.5Z"/></pattern>` +
  `<pattern id="cb-zel" width="2.1" height="3" patternUnits="userSpaceOnUse"><path class="mzd" d="M1.05 0L2.1 1.5L1.05 3L0 1.5Z"/><path class="mzs" d="M0 0L1.05 1.5L2.1 0M0 3L1.05 1.5L2.1 3"/></pattern>`
