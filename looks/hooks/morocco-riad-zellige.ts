// Zellige for the Riad look, drawn as real star-and-polygon geometry.
//
// Every field comes from the polygons-in-contact method the craft uses: an
// underlying polygon tiling, and from each edge's midpoint two lines leaving
// at the same angle to the edge. Inside each polygon they meet as a star whose
// points touch the edge midpoints; the corner pieces of the polygons round a
// vertex join into one tile. Lines run straight across every edge, so the
// strapwork is continuous, as it is on a wall in Fez.

type P = readonly [number, number]

const r1 = (v: number): string => (Math.round(v * 10) / 10).toString()
const pts = (list: readonly P[]): string => `M${list.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`

function hit(a: P, da: P, b: P, db: P): P {
  const den = da[0] * db[1] - da[1] * db[0]
  const t = ((b[0] - a[0]) * db[1] - (b[1] - a[1]) * db[0]) / den

  return [a[0] + da[0] * t, a[1] + da[1] * t]
}

// One polygon of the underlying tiling: its star (tips on the edge
// midpoints) and its corner pieces. `angle` is the lines' angle to the edge.
export function pic(poly: readonly P[], angle: number): { star: P[]; corners: P[][] } {
  const k = poly.length
  const cx = poly.reduce((s, p) => s + p[0], 0) / k
  const cy = poly.reduce((s, p) => s + p[1], 0) / k
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const edge = (i: number) => {
    const a = poly[i % k] as P
    const b = poly[(i + 1) % k] as P
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const e: P = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    const m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    let nIn: P = [-e[1], e[0]]
    if ((cx - m[0]) * nIn[0] + (cy - m[1]) * nIn[1] < 0) nIn = [e[1], -e[0]]

    return { m, e, nIn }
  }
  const star: P[] = []
  const corners: P[][] = []

  for (let i = 0; i < k; i++) {
    const A = edge(i)
    const B = edge(i + 1)
    const da: P = [ca * A.e[0] + sa * A.nIn[0], ca * A.e[1] + sa * A.nIn[1]]
    const db: P = [-ca * B.e[0] + sa * B.nIn[0], -ca * B.e[1] + sa * B.nIn[1]]
    const x = hit(A.m, da, B.m, db)
    star.push(A.m, x)
    corners.push([A.m, poly[(i + 1) % k] as P, B.m, x])
  }

  return { star, corners }
}

const regular = (cx: number, cy: number, r: number, k: number, rot: number): P[] =>
  Array.from({ length: k }, (_, i) => {
    const a = rot + (i / k) * Math.PI * 2

    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P
  })

export type Palette = { ground: string; a: string; b: string; c: string; line: string }

// The 4.8.8 field: eight-pointed stars in the octagons, four-pointed stars in
// the squares, joined by the big interlocking ground pieces. A 2 by 2 block
// so the octagon stars alternate in two colours. `a` is the tile's side.
export function field488(id: string, a: number, pal: Palette, angle = (67.5 * Math.PI) / 180, lineW = 0.9): string {
  const s = a / (1 + Math.SQRT2)
  const R = s / (2 * Math.sin(Math.PI / 8))
  const sq = s / Math.SQRT2
  const fills: Record<string, string[]> = { a: [], b: [], c: [] }

  const add = (poly: P[], starKey: string) => fills[starKey]!.push(pts(pic(poly, angle).star))
  for (let i = 0; i <= 2; i++)
    for (let j = 0; j <= 2; j++) add(regular(i * a, j * a, R, 8, Math.PI / 8), (i + j) % 2 ? 'b' : 'a')
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) add(regular(i * a + a / 2, j * a + a / 2, sq, 4, 0), 'c')

  const w = r1(a * 2)
  const st = `stroke="${pal.line}" stroke-width="${lineW}"`

  return (
    `<pattern id="${id}" width="${w}" height="${w}" patternUnits="userSpaceOnUse">` +
    `<rect width="${w}" height="${w}" fill="${pal.ground}"/>` +
    `<path fill="${pal.a}" ${st} d="${fills.a!.join('')}"/><path fill="${pal.b}" ${st} d="${fills.b!.join('')}"/><path fill="${pal.c}" ${st} d="${fills.c!.join('')}"/>` +
    `</pattern>`
  )
}

// A sixteen-fold rosette in the classic construction: a sixteen-pointed
// star, sixteen hexagonal petals each set in the notch between two star
// points with sides parallel to its axis, and sixteen kite shields where the
// petals' outer edges meet. Centred on (0, 0), star points at radius 1.
// `rc` is the star's notch radius, `h` the petals' straight side.
export function rosette16(rc = 0.62, h = 0.36): { star: P[]; petals: P[][]; shields: P[][]; rim: number } {
  const k = 16
  const al = (Math.PI * 2) / k
  const at = (r: number, a: number): P => [Math.cos(a) * r, Math.sin(a) * r]
  const T = (i: number) => at(1, i * al)
  const C = (i: number) => at(rc, (i + 0.5) * al)
  const star: P[] = []
  const petals: P[][] = []
  const shields: P[][] = []
  const A: P[] = []
  const Ap: P[] = []
  const O: P[] = []
  for (let i = 0; i < k; i++) {
    star.push(T(i), C(i))
    const u = at(1, (i + 0.5) * al)
    const t0 = T(i)
    const t1 = T(i + 1)
    const c = C(i)
    const a: P = [t0[0] + u[0] * h, t0[1] + u[1] * h]
    const ap: P = [t1[0] + u[0] * h, t1[1] + u[1] * h]
    const o: P = [a[0] + t1[0] - c[0], a[1] + t1[1] - c[1]]
    A.push(a)
    Ap.push(ap)
    O.push(o)
    petals.push([c, t1, ap, o, a, t0])
  }
  let rim = 0
  for (let i = 0; i < k; i++) {
    const j = (i + k - 1) % k
    const ap = Ap[j] as P
    const a = A[i] as P
    const s = hit(ap, [ap[0] - (O[j] as P)[0], ap[1] - (O[j] as P)[1]], a, [a[0] - (O[i] as P)[0], a[1] - (O[i] as P)[1]])
    rim = Math.max(rim, Math.hypot(s[0], s[1]), Math.hypot((O[i] as P)[0], (O[i] as P)[1]))
    shields.push([T(i), ap, s, a])
  }
  return { star, petals, shields, rim }
}

// Carved plaster: the same eight-fold lattice cut into the stucco, each
// line a groove with a lit lip above and a shadow below, on a ground that
// is cut deeper between.
export function stucco(id: string, a: number, angle = (67.5 * Math.PI) / 180): string {
  const s = a / (1 + Math.SQRT2)
  const R = s / (2 * Math.sin(Math.PI / 8))
  const sq = s / Math.SQRT2
  const lines: string[] = []
  const stars: string[] = []
  for (let i = 0; i <= 1; i++)
    for (let j = 0; j <= 1; j++) {
      const st = pic(regular(i * a, j * a, R, 8, Math.PI / 8), angle).star
      lines.push(pts(st))
      stars.push(pts(st))
    }
  lines.push(pts(pic(regular(a / 2, a / 2, sq, 4, 0), angle).star))

  return (
    `<pattern id="${id}" width="${r1(a)}" height="${r1(a)}" patternUnits="userSpaceOnUse">` +
    `<rect width="${r1(a)}" height="${r1(a)}" class="stc-deep"/>` +
    `<path class="stc-face" d="${stars.join('')}"/>` +
    `<circle cx="0" cy="0" r="${r1(R * 0.28)}" class="stc-deep"/><circle cx="${r1(a)}" cy="0" r="${r1(R * 0.28)}" class="stc-deep"/><circle cx="0" cy="${r1(a)}" r="${r1(R * 0.28)}" class="stc-deep"/><circle cx="${r1(a)}" cy="${r1(a)}" r="${r1(R * 0.28)}" class="stc-deep"/>` +
    `<path class="stc-lo" transform="translate(.6 .9)" d="${lines.join('')}"/>` +
    `<path class="stc-hi" d="${lines.join('')}"/>` +
    `</pattern>`
  )
}

// A square zellige panel, `size` across, holding one sixteen-fold rosette on
// a white ground, eight-pointed stars in the corners and a black frame.
export function rosettePanel(id: string, size: number): string {
  const r = rosette16()
  const k = (size * 0.44) / r.rim
  const c = size / 2
  const at = (list: readonly P[]): P[] => list.map(([x, y]) => [c + x * k, c + y * k] as P)
  const corner = (x: number, y: number) => pts(pic(regular(x, y, size * 0.13, 8, Math.PI / 8), (67.5 * Math.PI) / 180).star)
  const s = r1(size)

  return (
    `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse">` +
    `<rect width="${s}" height="${s}" fill="#141414"/><rect x="${r1(size * 0.03)}" y="${r1(size * 0.03)}" width="${r1(size * 0.94)}" height="${r1(size * 0.94)}" fill="#efe6d3"/>` +
    `<path fill="#18784a" d="${corner(size * 0.03, size * 0.03)}${corner(size * 0.97, size * 0.03)}${corner(size * 0.03, size * 0.97)}${corner(size * 0.97, size * 0.97)}"/>` +
    `<circle cx="${r1(c)}" cy="${r1(c)}" r="${r1(r.rim * k * 1.02)}" fill="#141414"/>` +
    `<path fill="#d6a12a" d="${pts(at(r.star))}"/>` +
    `<path fill="#1f5fbf" stroke="#efe6d3" stroke-width=".5" d="${r.petals.map(p => pts(at(p))).join('')}"/>` +
    `<path fill="#18784a" d="${r.shields.map(p => pts(at(p))).join('')}"/>` +
    `<circle cx="${r1(c)}" cy="${r1(c)}" r="${r1(k * 0.2)}" fill="#efe6d3"/>` +
    `</pattern>`
  )
}
