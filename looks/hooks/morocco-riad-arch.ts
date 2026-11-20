import { S, TOP, SUN, W, affine, affineAt, clip, d3, depth, horseshoe, mix3, ppm, wd, wline, wquad } from './morocco-riad-geo'
import type { V2, V3, Wall } from './morocco-riad-geo'

// The Riad's two storeys of arcades. Every wall has the same elevation: a
// wide central horseshoe arch between two narrower ones on slender marble
// columns, a band of carved stucco around them with an alfiz frame to each
// arch, a zellige dado on the corner piers, a carved cedar beam, then the
// upper gallery with its turned-wood balustrade and scalloped cedar valance,
// a cedar frieze on corbels, the carved eave seen from below and the
// green-glazed tile edge against the sky.

export const BAYS = [
  { uc: 2.55, a: 1.35 },
  { uc: 6, a: 1.6 },
  { uc: 9.45, a: 1.35 },
] as const
export const COLS = [3.95, 8.05]

export const VS = 2.0
export const GAL = 2.4
const THICK = 0.45
export const DADO = 1.1
const ALFIZ = 4.5
export const BEAM0 = 4.62
export const FLOOR1 = 5.1
const RAIL = 6.0
const VAL0 = 7.2
const OPEN1 = 7.5
const FRIEZE1 = 7.85
const EAVE = 8.1

const PIERS: [number, number][] = [
  [0, 1.2],
  [10.8, S],
]

const inst = (id: string, base: string, m: string): string => `<pattern id="${id}" href="#${base}" patternTransform="${m}"/>`

// The sun's patch on any polygon in the court: where the light clears all
// four walls' tops.
export function lit(poly: readonly V3[]): V3[] {
  const t = (p: V3) => (TOP - p[1]) / SUN[1]
  let out = [...poly]
  out = clip(out, p => p[0] + SUN[0] * t(p), mix3)
  out = clip(out, p => S - p[0] - SUN[0] * t(p), mix3)
  out = clip(out, p => p[2] + SUN[2] * t(p), mix3)
  out = clip(out, p => S - p[2] - SUN[2] * t(p), mix3)

  return out
}

// A scalloped cedar valance: a row of small lobes along its lower edge.
function scallop(wall: Wall, u0: number, u1: number, v: number, w: number): string {
  const k = Math.max(5, Math.round((u1 - u0) / 0.42))
  const step = (u1 - u0) / k
  const pts: V2[] = [[u0, v + 0.3]]
  for (let i = 0; i < k; i++)
    for (let j = 0; j < 3; j++) {
      const t = (j / 3) * Math.PI
      pts.push([u0 + step * i + (step * (1 - Math.cos(t))) / 2, v - Math.sin(t) * step * 0.4])
    }
  pts.push([u1, v], [u1, v + 0.3])

  return wd(wall, pts, w)
}

export type ArchOut = { defs: string; interior: string; facade: string; outline: string; lit: string; holes: string }

export function arcade(wall: Wall): ArchOut {
  const id = (s: string) => `r${wall.name[0]}${s}`
  const wv: V3 = wall.w
  const sunIn = SUN[0] * wv[0] + SUN[2] * wv[2]
  let defs = ''
  let interior = ''

  // The ground gallery behind the arches: back wall and dado, floor, cedar
  // ceiling on joists, a door in each bay. The facade drawn over it leaves it
  // seen only through the openings.
  const g = (u: number, v: number, w: number) => W(wall, u, v, w)
  interior += `<path class="gal-back" d="${wquad(wall, -GAL, 0, S + GAL, BEAM0, -GAL)}"/>`
  interior += `<path class="gal-floor" d="${d3([g(-GAL, 0, 0), g(S + GAL, 0, 0), g(S + GAL, 0, -GAL), g(-GAL, 0, -GAL)])}"/>`
  interior += `<path class="gal-ceil" d="${d3([g(-GAL, BEAM0, 0), g(S + GAL, BEAM0, 0), g(S + GAL, BEAM0, -GAL), g(-GAL, BEAM0, -GAL)])}"/>`
  defs += inst(id('jo'), 'z-raft', affineAt(g(6, BEAM0, 0), wall.u, wall.w, 2))
  interior += `<path fill="url(#${id('jo')})" d="${d3([g(-GAL, BEAM0, 0), g(S + GAL, BEAM0, 0), g(S + GAL, BEAM0, -GAL), g(-GAL, BEAM0, -GAL)])}"/>`
  defs += inst(id('gd'), 'z-dado', affine(wall, 6, DADO, -GAL, 3))
  interior += `<path fill="url(#${id('gd')})" d="${wquad(wall, -GAL, 0, S + GAL, DADO, -GAL)}"/>`
  interior += `<path class="dado-cap" d="${wquad(wall, -GAL, DADO, S + GAL, DADO + 0.07, -GAL)}"/>`
  BAYS.forEach((b, i) => {
    const dw = i === 1 ? 0.8 : 0.6
    const dh = i === 1 ? 3.1 : 2.75
    interior += `<path class="door-frame" d="${wquad(wall, b.uc - dw - 0.16, 0, b.uc + dw + 0.16, dh + 0.2, -GAL)}"/>`
    const pid = id(`dr${i}`)
    defs += inst(pid, 'z-door', affine(wall, b.uc - dw, dh, -GAL, dw * 2))
    interior += `<path fill="url(#${pid})" d="${wd(wall, horseshoe(b.uc, dw, dh - dw * 1.48, 8), -GAL + 0.01)}"/>`
  })

  // The upper gallery: back wall, painted cedar doors, ceiling.
  interior += `<path class="gal-back up" d="${wquad(wall, -2, FLOOR1, S + 2, FRIEZE1, -2)}"/>`
  interior += `<path class="gal-ceil" d="${d3([g(-2, FRIEZE1, 0), g(S + 2, FRIEZE1, 0), g(S + 2, FRIEZE1, -2), g(-2, FRIEZE1, -2)])}"/>`
  defs += inst(id('ud'), 'z-door', affine(wall, 5.35, FLOOR1 + 2.25, -2, 1.3))
  interior += `<path fill="url(#${id('ud')})" d="${BAYS.map(b => wquad(wall, b.uc - 0.65, FLOOR1, b.uc + 0.65, FLOOR1 + 2.25, -1.99)).join('')}"/>`

  // Sun through the openings: each lit opening cast along the light onto the
  // gallery's back wall and floor, so the arches lie on them as bright
  // shapes.
  if (sunIn > 0.05) {
    let onBack = ''
    let onFloor = ''
    const opens: V2[][] = BAYS.flatMap(b => [horseshoe(b.uc, b.a, VS, 10), [[b.uc - b.a, FLOOR1], [b.uc + b.a, FLOOR1], [b.uc + b.a, OPEN1], [b.uc - b.a, OPEN1]] as V2[]])
    opens.forEach((o, i) => {
      const floorV = i % 2 ? FLOOR1 : 0
      const back = i % 2 ? -2 : -GAL
      const hole = lit(o.map(([u, v]) => g(u, v, 0)))
      if (hole.length < 3) return
      const along = (p: V3, t: number): V3 => [p[0] - SUN[0] * t, p[1] - SUN[1] * t, p[2] - SUN[2] * t]
      const toBack = hole.map(p => along(p, -back / sunIn))
      onBack += d3(clip(toBack, p => p[1] - floorV, mix3))
      const toFloor = hole.map(p => along(p, (p[1] - floorV) / SUN[1]))
      const wOf = (p: V3) => (p[0] - wall.o[0]) * wv[0] + (p[2] - wall.o[2]) * wv[2]
      onFloor += d3(clip(toFloor, p => wOf(p) - back, mix3))
    })
    interior += `<path class="sun-in" d="${onBack}${onFloor}"/>`
  }

  // The facade, with holes for the openings, and each opening's reveal.
  let holes = ''
  let reveals = ''
  BAYS.forEach(b => {
    const o = horseshoe(b.uc, b.a, VS, 8)
    holes += wd(wall, o)
    reveals += wd(wall, o) + wd(wall, o, -THICK)
    const up = wquad(wall, b.uc - b.a, FLOOR1, b.uc + b.a, OPEN1)
    holes += up
    reveals += up + wquad(wall, b.uc - b.a, FLOOR1, b.uc + b.a, OPEN1, -0.35)
  })
  const outline = wquad(wall, 0, 0, S, EAVE)
  let f = `<path class="soffit" fill-rule="evenodd" d="${reveals}"/>` + `<path class="wall" fill-rule="evenodd" d="${outline}${holes}"/>`

  // Carved stucco round the arches, in alfiz frames, with a carved band
  // following each arch.
  defs += inst(id('st'), 'z-stucco', affine(wall, 6, ALFIZ, 0, 3))
  const band: V2[] = [[1.12, VS], ...BAYS.flatMap(b => horseshoe(b.uc, b.a, VS, 8, VS)), [10.88, VS], [10.88, ALFIZ], [1.12, ALFIZ]]
  f += `<path fill="url(#${id('st')})" d="${wd(wall, band)}"/>`
  let frames = ''
  BAYS.forEach(b => {
    const o = b.a * 1.06 + 0.12
    const i = o - 0.06
    frames += wd(wall, [[b.uc - o, VS], [b.uc - o, ALFIZ - 0.04], [b.uc + o, ALFIZ - 0.04], [b.uc + o, VS], [b.uc + i, VS], [b.uc + i, ALFIZ - 0.1], [b.uc - i, ALFIZ - 0.1], [b.uc - i, VS]])
    const sw = Math.max(0.6, ppm(g(b.uc, VS, 0)) * 0.07)
    f += `<path class="archivolt" stroke-width="${sw.toFixed(1)}" d="${wline(wall, horseshoe(b.uc, b.a + 0.05, VS, 9).slice(1, -1), 0.01)}"/>`
  })
  f += `<path class="alfiz" d="${frames}${wquad(wall, 1.1, ALFIZ - 0.02, 10.9, ALFIZ + 0.04)}"/>`

  // Slender marble columns with carved capitals and bases.
  COLS.forEach(u => {
    const w = 0.16
    const shaft = wquad(wall, u - 0.13, 0.26, u + 0.13, VS - 0.5, w)
    const cap = wd(wall, [[u - 0.14, VS - 0.46], [u + 0.14, VS - 0.46], [u + 0.22, VS - 0.12], [u - 0.22, VS - 0.12]], w)
    const abacus = wquad(wall, u - 0.25, VS - 0.12, u + 0.25, VS, w + 0.01)
    const foot = wd(wall, [[u - 0.2, 0], [u + 0.2, 0], [u + 0.2, 0.1], [u + 0.15, 0.18], [u + 0.13, 0.26], [u - 0.13, 0.26], [u - 0.15, 0.18], [u - 0.2, 0.1]], w)
    f += `<path class="marble" d="${shaft}${cap}${abacus}${foot}"/><path fill="url(#k-side)" d="${shaft}${cap}${abacus}${foot}"/>`
    f += `<path class="cap-cut" d="${wquad(wall, u - 0.15, VS - 0.52, u + 0.15, VS - 0.46, w)}${wquad(wall, u - 0.2, VS - 0.24, u + 0.2, VS - 0.2, w)}${wquad(wall, u - 0.25, VS - 0.13, u + 0.25, VS - 0.11, w)}"/>`
  })

  // Zellige dado on the corner piers.
  PIERS.forEach(([u0, u1], i) => {
    if (depth(g(u1, 0, 0)) < 0.6 || depth(g(u0, 0, 0)) < 0.6) return
    const pid = id(`pd${i}`)
    defs += inst(pid, 'z-ros', affine(wall, u0 + 0.05, DADO, 0, 1.1))
    f += `<path fill="url(#${pid})" d="${wquad(wall, u0 + 0.05, 0, u1 - 0.05, DADO)}"/>`
    f += `<path class="dado-cap" d="${wquad(wall, u0, DADO, u1, DADO + 0.07)}"/>`
  })

  // A stucco frieze and the carved cedar beam between the storeys.
  defs += inst(id('bm'), 'z-beam', affine(wall, 0, FLOOR1, 0.12, 3))
  f += `<path class="cedar-under" d="${d3([g(0, BEAM0, 0), g(S, BEAM0, 0), g(S, BEAM0, 0.14), g(0, BEAM0, 0.14)])}"/>`
  f += `<path fill="url(#${id('bm')})" d="${wquad(wall, 0, BEAM0, S, FLOOR1, 0.14)}"/>`

  // Upper storey: turned-wood balustrades, rails, scalloped valances.
  defs += inst(id('ms'), 'z-mash', affine(wall, 4.4, RAIL, -0.05, 3.2))
  BAYS.forEach(b => {
    f += `<path fill="url(#${id('ms')})" d="${wquad(wall, b.uc - b.a, FLOOR1, b.uc + b.a, RAIL, -0.05)}"/>`
    f += `<path class="cedar" d="${wquad(wall, b.uc - b.a, RAIL, b.uc + b.a, RAIL + 0.1, -0.03)}"/>`
    f += `<path class="cedar valance" d="${scallop(wall, b.uc - b.a, b.uc + b.a, VAL0, -0.03)}"/>`
  })

  // The cedar frieze on corbels, the eave seen from below with its rafters,
  // and the green tile edge.
  defs += inst(id('fr'), 'z-beam', affine(wall, 0, FRIEZE1, 0, 3))
  f += `<path fill="url(#${id('fr')})" d="${wquad(wall, 0, OPEN1, S, FRIEZE1)}"/>`
  let corb = ''
  for (let u = 0.2; u < S; u += 0.55) corb += wquad(wall, u, FRIEZE1, u + 0.15, EAVE, 0.03)
  f += `<path class="cedar" d="${corb}"/>`
  defs += inst(id('ra'), 'z-raft', affineAt(g(6, EAVE, 0), wall.u, wall.w, 2))
  const eave = d3([g(-0.7, EAVE, 0.7), g(S + 0.7, EAVE, 0.7), g(S, EAVE, 0), g(0, EAVE, 0)])
  f += `<path fill="url(#${id('ra')})" d="${eave}"/>`
  f += `<path class="cedar-edge" d="${wquad(wall, -0.7, EAVE, S + 0.7, EAVE + 0.1, 0.7)}"/>`
  if (wall.name !== 'west') {
    defs += inst(id('tl'), 'z-tiles', affine(wall, 0, TOP, 0.4, 3))
    f += `<path fill="url(#${id('tl')})" d="${d3([g(-0.75, EAVE + 0.1, 0.75), g(S + 0.75, EAVE + 0.1, 0.75), g(S, TOP, 0), g(0, TOP, 0)])}"/>`
  }
  defs += inst(id('te'), 'z-ends', affine(wall, 0, EAVE + 0.3, 0.76, 3))
  f += `<path fill="url(#${id('te')})" d="${wquad(wall, -0.75, EAVE + 0.1, S + 0.75, EAVE + 0.3, 0.76)}"/>`

  // Ambient occlusion in the far corners, where two walls meet.
  if (wall.name !== 'east') f += `<path fill="url(#r-aoR)" d="${wquad(wall, S - 0.9, 0, S, TOP)}"/>`
  if (wall.name !== 'west') f += `<path fill="url(#r-aoL)" d="${wquad(wall, 0, 0, 0.9, TOP)}"/>`

  // Ambient occlusion where the wall meets the floor.
  f += `<path fill="url(#r-ao)" d="${wquad(wall, 0, 0, S, 1.2, 0.01)}"/>`

  const litPoly = d3(lit([g(0, 0, 0), g(S, 0, 0), g(S, TOP, 0), g(0, TOP, 0)]))

  return { defs, interior, facade: f, outline: wquad(wall, 0, 0, S, TOP), lit: litPoly, holes }
}
