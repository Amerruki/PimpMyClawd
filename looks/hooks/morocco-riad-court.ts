import { LEAF_RAMP, blob, n, seeded, taper } from './kit'
import type { CanopyOptions } from './kit'
import type { Pt } from './kit'
import { P, d3, depth, ppm } from './morocco-riad-geo'
import type { V2, V3 } from './morocco-riad-geo'

// A crown of leaves lit as a volume: the kit's canopy, written lean for
// this scene's size budget (whole-pixel coordinates, a lighter leaf tile).
// Only the loose leaves sway (in a group styled by `sway`, with `extra`
// such as fruit riding along); the masked body stays still, which keeps
// the moving area cheap to repaint.
export function crown(cx: number, cy: number, rx: number, ry: number, seed: number, opts: CanopyOptions = {}, sway = '', extra = ''): string {
  const rand = seeded(seed)
  const ramp = opts.ramp ?? LEAF_RAMP
  const steps = ramp.length
  const total = opts.leaves ?? Math.round(Math.min(420, (rx * ry) / 34))
  const len = opts.leaf ?? Math.max(5, Math.min(rx, ry) / 5.5)
  const shape = opts.shape ?? 'leaf'
  const wid = shape === 'needle' ? 0.12 : shape === 'round' ? 0.62 : 0.36
  const [lx0, ly0, lz0] = opts.light ?? [-0.55, -0.75, 0.45]
  const ll = Math.hypot(lx0, ly0, lz0)
  const L = [lx0 / ll, ly0 / ll, lz0 / ll]
  const k = opts.clusters ?? 14 + Math.round(rand() * 6)
  const clusters = Array.from({ length: k }, () => {
    // Cluster centers all over the crown's shell, so the silhouette is lumpy
    // on every side, the underside included.
    const th = rand() * Math.PI * 2
    const ph = Math.acos(1 - 2 * rand())
    const nx = Math.sin(ph) * Math.cos(th)
    const ny = Math.cos(ph) * (rand() < 0.65 ? -1 : 1)
    const nz = Math.sin(ph) * Math.sin(th)

    return { x: nx * 0.66, y: ny * 0.66, z: nz * 0.66, r: 0.26 + rand() * 0.18 }
  })
  const buckets: string[][] = Array.from({ length: steps }, () => [])
  const specks: string[] = []

  for (let i = 0; i < total; i++) {
    const c = clusters[Math.floor(rand() * k)] as { x: number; y: number; z: number; r: number }
    // A point on the cluster's surface, mostly the outward half.
    let ux = rand() * 2 - 1
    let uy = rand() * 2 - 1
    let uz = rand() * 2 - 1
    const ul = Math.hypot(ux, uy, uz) || 1
    ux /= ul
    uy /= ul
    uz /= ul
    const out = Math.hypot(c.x, c.y, c.z) || 1
    if (ux * c.x + uy * c.y + uz * c.z < 0 && rand() < 0.7) {
      ux = -ux
      uy = -uy
      uz = -uz
    }
    const depth = 0.75 + rand() * 0.25
    const px = c.x + ux * c.r * depth
    const py = c.y + uy * c.r * depth
    const pz = c.z + uz * c.r * depth
    // Normal: mostly the cluster's own surface, a little the crown's.
    let nx = ux * 0.7 + (c.x / out) * 0.3
    let ny = uy * 0.7 + (c.y / out) * 0.3
    let nz = uz * 0.7 + (c.z / out) * 0.3
    const nl = Math.hypot(nx, ny, nz) || 1
    nx /= nl
    ny /= nl
    nz /= nl
    const lam = Math.max(0, nx * L[0]! + ny * L[1]! + nz * L[2]!)
    const reach = Math.hypot(px, py, pz)
    // Leaves deep inside or on the far side sit in shadow.
    const occl = Math.min(1, Math.max(0, (reach - 0.35) / 0.55)) * (pz < -0.25 ? 0.55 : 1)
    let v = 0.08 + lam * 0.72 * occl + (pz > 0 ? pz * 0.12 : 0) + (rand() - 0.5) * 0.16
    v = Math.min(0.999, Math.max(0, v))
    const b = Math.floor(v * steps)
    const x = cx + px * rx
    const y = cy + py * ry
    // Leaves point outward from the cluster, drooping a little.
    const ang = Math.atan2(uy, ux) + (rand() - 0.5) * 1.3 + 0.25
    const l = len * (0.7 + rand() * 0.6)
    const w = l * wid * (0.45 + Math.abs(nz) * 0.75)
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const tx = x + ca * l
    const ty = y + sa * l
    const mx = x + ca * l * 0.5
    const my = y + sa * l * 0.5
    const r = (v: number) => Math.round(v)
    buckets[b]!.push(`M${r(x)} ${r(y)}Q${r(mx - sa * w)} ${r(my + ca * w)} ${r(tx)} ${r(ty)}Q${r(mx + sa * w)} ${r(my - ca * w)} ${r(x)} ${r(y)}Z`)
    if (opts.sheen !== false && b === steps - 1 && rand() < 0.35) {
      specks.push(`M${r(mx)} ${r(my)}h${Math.max(1, r(l * 0.18))}`)
    }
  }
  // The crown's body: a tile of small shaded leaves fills it, and a light
  // gradient over it rounds it into a volume, so the gaps between the loose
  // leaves read as more leaves in shade, not paint.
  const tile = Math.round(Math.max(26, len * 3.4))
  const tr = seeded(seed + 31)
  const tileLeaves = Array.from({ length: 3 }, (_, j) => {
    const fill = ramp[Math.min(steps - 1, 1 + j)]
    const d = Array.from({ length: 9 }, () => {
      const x = tr() * tile
      const y = tr() * tile
      const a = tr() * Math.PI * 2
      const l = len * (0.5 + tr() * 0.4)
      const w = l * wid
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const mx = x + ca * l * 0.5
      const my = y + sa * l * 0.5

      const r = Math.round
      return `M${r(x)} ${r(y)}Q${r(mx - sa * w)} ${r(my + ca * w)} ${r(x + ca * l)} ${r(y + sa * l)}Q${r(mx + sa * w)} ${r(my - ca * w)} ${r(x)} ${r(y)}Z`
    }).join('')

    return `<path fill="${fill}" d="${d}"/>`
  }).join('')
  const pid = `r-lp${seed}`
  // The body is the union of the clusters (plus a heart between them), so it
  // always sits inside the leaves that cover each cluster's surface. A mask
  // makes the union, and the textured fill and its light are rectangles
  // over the crown's box.
  const circle = (x: number, y: number, r: number) => `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${Math.round(r)}"/>`
  const shapes =
    `<path d="${blob(cx, cy, rx * 0.6, ry * 0.58, seed + 7, 0.12)}"/>` +
    clusters.map(c => circle(cx + c.x * rx, cy + c.y * ry, c.r * Math.min(rx, ry) * 0.92)).join('')
  const mid = `r-m${seed}`
  const box = `x="${Math.round(cx - rx * 1.1)}" y="${Math.round(cy - ry * 1.1)}" width="${Math.round(rx * 2.2)}" height="${Math.round(ry * 2.2)}"`

  return (
    `<g>` +
    `<defs><pattern id="${pid}" width="${Math.round(tile)}" height="${Math.round(tile)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${Math.round(tr() * 90)})"><rect width="100%" height="100%" fill="${ramp[0]}"/>${tileLeaves}</pattern>` +
    `<mask id="${mid}"><g fill="#fff">${shapes}</g></mask></defs>` +
    `<g mask="url(#${mid})"><rect ${box} fill="url(#${pid})"/><rect ${box} fill="url(#k-vol)"/></g>` +
    (sway ? `<g class="wind" style="${sway}">` : '<g>') +
    buckets.map((list, i) => (list.length ? `<path fill="${ramp[i]}" d="${list.join('')}"/>` : '')).join('') +
    (specks.length ? `<path fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.4" stroke-linecap="round" d="${specks.join('')}"/>` : '') +
    extra +
    `</g></g>`
  )
}


// The garden court: the paving, the zellige rosette round the fountain, the
// raised beds with their myrtle, roses, orange trees and banana, and the
// fountain itself with its star-shaped basin, marble bowl and jet.

export const FOUNT: V3 = [6, 0, 6]
const CURB = 0.32


// The round plaza of zellige the fountain stands in: the eight-fold star
// field, a black and white rim.
export function plaza(): string {
  const ring = (rr: number) => d3(Array.from({ length: 30 }, (_, i) => [FOUNT[0] + Math.cos((i / 30) * Math.PI * 2) * rr, 0.004, FOUNT[2] + Math.sin((i / 30) * Math.PI * 2) * rr] as V3))

  return `<path class="pl-marble" d="${ring(1.8)}"/><path fill="url(#r-pl)" fill-rule="evenodd" d="${ring(1.72)}${ring(1.5)}"/><path class="pl-rim" fill-rule="evenodd" d="${ring(1.8)}${ring(1.72)}${ring(1.5)}${ring(1.46)}"/>`
}

// A raised bed: its visible curb faces clad in zellige, a marble coping, the
// soil inside.
export function bed(x0: number, z0: number, x1: number, z1: number, faces: ('s' | 'w' | 'e')[]): string {
  const q = (a: V3, b: V3, c: V3, e: V3) => d3([a, b, c, e])
  let s = ''
  for (const f of faces) {
    if (f === 's') s += q([x0, 0, z0], [x1, 0, z0], [x1, CURB, z0], [x0, CURB, z0])
    if (f === 'w') s += q([x0, 0, z1], [x0, 0, z0], [x0, CURB, z0], [x0, CURB, z1])
    if (f === 'e') s += q([x1, 0, z0], [x1, 0, z1], [x1, CURB, z1], [x1, CURB, z0])
  }
  const top = (o: number) => d3([[x0 + o, CURB, z0 + o], [x1 - o, CURB, z0 + o], [x1 - o, CURB, z1 - o], [x0 + o, CURB, z1 - o]])

  return `<path fill="url(#r-curb)" d="${s}"/><path class="curb-sh" d="${s}"/><path class="coping" fill-rule="evenodd" d="${top(0)}${top(0.1)}"/><path class="soil" d="${top(0.1)}"/>`
}

const ORANGE_RAMP = ['#0b2216', '#10331d', '#174626', '#215a2f', '#2f7139', '#4c8d48', '#8cba6c']

// An orange tree standing at (x, z) on a bed: a short trunk, a dense round
// glossy crown, fruit hung through it. `leaves` sets the crown's detail.
export function orangeTree(x: number, z: number, h: number, size: number, seed: number, leaves: number): string {
  const base = P([x, CURB, z])
  const top = P([x, h, z])
  const k = ppm([x, h, z])
  const cr = size * k
  const cy = top[1] + cr * 0.95
  const trunk = taper([[base[0], base[1]], [base[0] + cr * 0.04, base[1] - (base[1] - cy) * 0.4], [base[0] - cr * 0.03, cy + cr * 0.3], [base[0] + cr * 0.02, cy]], k * 0.16, k * 0.07)
  const limbs = [-1, 1]
    .map(sd => taper([[base[0], cy + cr * 0.45], [base[0] + sd * cr * 0.3, cy + cr * 0.05], [base[0] + sd * cr * 0.5, cy - cr * 0.2]], k * 0.06, k * 0.02))
    .join('')
  const rand = seeded(seed + 5)
  const fruit: string[] = []
  for (let i = 0; i < Math.round(leaves / 9); i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 0.86
    const fx = base[0] + Math.cos(a) * r * cr * 1.05
    const fy = cy + Math.sin(a) * r * cr * 0.9
    fruit.push(`<circle cx="${n(fx)}" cy="${n(fy)}" r="${n(k * (0.045 + rand() * 0.015))}"/>`)
  }

  return (
    `<ellipse cx="${n(base[0])}" cy="${n(base[1])}" rx="${n(cr * 0.9)}" ry="${n(cr * 0.14)}" fill="url(#k-shadow)"/>` +
    `<path class="bark" d="${trunk}${limbs}"/><path d="${trunk}" fill="url(#k-side)"/>` +
    crown(base[0], cy, cr * 1.08, cr * 0.95, seed, { ramp: ORANGE_RAMP, leaves, leaf: Math.max(5, k * 0.11), light: [-0.35, -0.85, 0.4], clusters: 16 }, `animation-duration:${n(8 + rand() * 5)}s;animation-delay:-${n(rand() * 9)}s`, `<g class="fruit">${fruit.join('')}</g>`)
  )
}

// Myrtle clipped low along a bed's front edge, with roses behind.
export function hedge(x0: number, x1: number, z: number, seed: number): string {
  const a = P([x0, CURB + 0.3, z])
  const b = P([x1, CURB + 0.3, z])
  const k = ppm([(x0 + x1) / 2, 0, z])
  const rand = seeded(seed)
  const roses: string[] = []
  for (let i = 0; i < 20; i++) {
    const t = rand()
    roses.push(`<circle cx="${n(a[0] + (b[0] - a[0]) * t)}" cy="${n(a[1] + (b[1] - a[1]) * t - k * (0.2 + rand() * 0.25))}" r="${n(k * (0.035 + rand() * 0.02))}"/>`)
  }

  return (
    crown((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - k * 0.25, Math.abs(b[0] - a[0]) / 2, k * 0.32, seed, { ramp: ORANGE_RAMP, leaves: 55, leaf: k * 0.12, shape: 'round', clusters: 12 }, 'animation-duration:11s', `<g class="rose">${roses.join('')}</g>`)
  )
}

// A banana plant: a few great paddle leaves with midribs, some split by the
// wind, arching from a green pseudo-stem.
export function banana(x: number, z: number, seed: number): string {
  const base = P([x, CURB, z])
  const k = ppm([x, 1.5, z])
  const top: Pt = [base[0], base[1] - k * 1.7]
  const rand = seeded(seed)
  const leaves: string[] = []
  const ribs: string[] = []
  const angles = [-2.5, -2.05, -1.75, -1.35, -1.05, -0.6, -0.2]
  angles.forEach((a0, i) => {
    const a = a0 + (rand() - 0.5) * 0.2
    const len = k * (1.1 + rand() * 0.5)
    const droop = k * (0.3 + rand() * 0.4)
    const tip: Pt = [top[0] + Math.cos(a) * len, top[1] + Math.sin(a) * len * 0.75 + droop]
    const mid: Pt = [top[0] + Math.cos(a) * len * 0.55, top[1] + Math.sin(a) * len * 0.55 - droop * 0.2]
    const w = k * 0.24
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    leaves.push(
      `<path class="ban${i % 3}" d="M${n(top[0])} ${n(top[1])}Q${n(mid[0] + nx * w * 1.6)} ${n(mid[1] + ny * w * 1.6)} ${n(tip[0])} ${n(tip[1])}Q${n(mid[0] - nx * w * 1.2)} ${n(mid[1] - ny * w * 1.2)} ${n(top[0])} ${n(top[1])}Z"/>`,
    )
    ribs.push(`M${n(top[0])} ${n(top[1])}Q${n(mid[0])} ${n(mid[1])} ${n(tip[0])} ${n(tip[1])}`)
  })
  const stem = taper([[base[0], base[1]], [base[0] + k * 0.03, base[1] - k * 0.8], [top[0], top[1]]], k * 0.2, k * 0.12)

  return (
    `<ellipse cx="${n(base[0])}" cy="${n(base[1])}" rx="${n(k * 0.8)}" ry="${n(k * 0.12)}" fill="url(#k-shadow)"/>` +
    `<path class="ban-stem" d="${stem}"/><path d="${stem}" fill="url(#k-side)"/>` +
    `<g class="wind banana" style="animation-duration:9s">${leaves.join('')}<path class="ban-rib" d="${ribs.join('')}"/></g>`
  )
}

// The fountain: a basin shaped as an eight-pointed star of two squares, its
// faces clad in zellige under a marble coping, water in it, a turned marble
// shaft carrying a lobed bowl, the jet, and thin streams spilling from the
// bowl's lobes into the basin.
export function fountain(): { body: string; water: string; ripples: string; streams: string; jet: string } {
  const [cx, , cz] = FOUNT
  const R = 1.3
  const h = 0.5
  const star = (r: number): V2[] =>
    Array.from({ length: 16 }, (_, i) => {
      const rr = i % 2 ? r * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8) : r
      const a = (i / 16) * Math.PI * 2

      return [cx + Math.cos(a) * rr, cz + Math.sin(a) * rr] as V2
    })
  const outer = star(R)
  const faces: { d: string; dep: number; lum: number }[] = []
  for (let i = 0; i < 16; i++) {
    const a = outer[i] as V2
    const b = outer[(i + 1) % 16] as V2
    const mx = (a[0] + b[0]) / 2
    const mz = (a[1] + b[1]) / 2
    // Outward normal, and whether it looks toward the camera.
    const nx = b[1] - a[1]
    const nz = -(b[0] - a[0])
    const flip = nx * (mx - cx) + nz * (mz - cz) < 0 ? -1 : 1
    const camDir = [1.7 - mx, 0.8 - mz]
    if ((nx * camDir[0]! + nz * camDir[1]!) * flip <= 0) continue
    const lum = 0.55 + 0.45 * Math.max(0, (nx * -0.5 + nz * -0.8) * flip / Math.hypot(nx, nz))
    faces.push({ d: d3([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]]]), dep: depth([mx, 0, mz]), lum })
  }
  faces.sort((p, q) => q.dep - p.dep)
  const ring = (list: V2[], y: number) => d3(list.map(([x, z]) => [x, y, z] as V3))
  const inner = star(R - 0.16)
  const body =
    `<ellipse cx="${n(P([cx, 0, cz])[0])}" cy="${n(P([cx, 0, cz - 0.3])[1])}" rx="${n(ppm([cx, 0, cz]) * 1.6)}" ry="${n(ppm([cx, 0, cz]) * 0.3)}" fill="url(#k-shadow)"/>` +
    faces.map(f => `<path fill="url(#r-fz)" d="${f.d}"/><path class="fface" fill-opacity="${n(1 - f.lum)}" d="${f.d}"/>`).join('') +
    `<path class="coping" fill-rule="evenodd" d="${ring(outer, h)}${ring(inner, h)}"/>`
  const water = `<path class="water" d="${ring(inner, h - 0.04)}"/><path class="water-sky" d="${ring(inner, h - 0.04)}"/>`

  // Ripples: rings on the water round the falling streams.
  const c = P([cx, h - 0.04, cz])
  const k = ppm([cx, h, cz])
  const flat = (P([cx, h - 0.04, cz - 1])[1] - P([cx, h - 0.04, cz + 1])[1]) / 2 / k
  const ripples = [0.55, 0.62, 0.7, 0.58]
    .map((r, i) => {
      const a = (i / 4) * Math.PI * 2 + 0.6
      const p = P([cx + Math.cos(a) * r, h - 0.04, cz + Math.sin(a) * r])
      return `<ellipse class="ripple" style="animation-delay:-${i * 1.3}s;animation-duration:${4 + i * 0.7}s" cx="${n(p[0])}" cy="${n(p[1])}" rx="${n(k * 0.22)}" ry="${n(k * 0.22 * flat)}"/>`
    })
    .join('') +
    `<ellipse class="ripple" style="animation-duration:6.5s" cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(k * 0.5)}" ry="${n(k * 0.5 * flat)}"/>`

  // The shaft, the bowl and its lobed rim.
  const shaftB = P([cx, h, cz])
  const bowlY = 0.95
  const bowl = P([cx, bowlY, cz])
  const sw = k * 0.09
  const lobes: string[] = []
  const br = 0.5
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const p = P([cx + Math.cos(a) * br, bowlY, cz + Math.sin(a) * br])
    lobes.push(`${n(p[0])},${n(p[1])}`)
  }
  const bowlRx = k * br
  const bowlRy = bowlRx * flat
  const jetTop = P([cx, 1.32, cz])
  const streamsList: string[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26
    const s0 = P([cx + Math.cos(a) * br, bowlY - 0.02, cz + Math.sin(a) * br])
    const s1 = P([cx + Math.cos(a) * 0.68, h - 0.04, cz + Math.sin(a) * 0.68])
    streamsList.push(`M${n(s0[0])} ${n(s0[1])}Q${n(s0[0] + (s1[0] - s0[0]) * 0.7)} ${n(s0[1] + 2)} ${n(s1[0])} ${n(s1[1])}`)
  }
  const shaft =
    `<path class="marble" d="M${n(shaftB[0] - sw)} ${n(shaftB[1])}L${n(shaftB[0] - sw * 0.6)} ${n(bowl[1])}L${n(shaftB[0] + sw * 0.6)} ${n(bowl[1])}L${n(shaftB[0] + sw)} ${n(shaftB[1])}Z"/>` +
    `<path fill="url(#k-side)" d="M${n(shaftB[0] - sw)} ${n(shaftB[1])}L${n(shaftB[0] - sw * 0.6)} ${n(bowl[1])}L${n(shaftB[0] + sw * 0.6)} ${n(bowl[1])}L${n(shaftB[0] + sw)} ${n(shaftB[1])}Z"/>` +
    `<path class="marble" d="M${n(bowl[0] - bowlRx)} ${n(bowl[1])}Q${n(bowl[0])} ${n(bowl[1] + bowlRx * 0.9)} ${n(bowl[0] + bowlRx)} ${n(bowl[1])}Z"/>` +
    `<path fill="url(#k-side)" d="M${n(bowl[0] - bowlRx)} ${n(bowl[1])}Q${n(bowl[0])} ${n(bowl[1] + bowlRx * 0.9)} ${n(bowl[0] + bowlRx)} ${n(bowl[1])}Z"/>` +
    `<polygon class="marble-cap" points="${lobes.join(' ')}"/>` +
    `<ellipse class="water" cx="${n(bowl[0])}" cy="${n(bowl[1])}" rx="${n(bowlRx * 0.86)}" ry="${n(bowlRy * 0.8)}"/>` +
    `<path class="marble" d="M${n(bowl[0] - k * 0.05)} ${n(bowl[1])}L${n(bowl[0] - k * 0.03)} ${n(bowl[1] - k * 0.16)}L${n(bowl[0] + k * 0.03)} ${n(bowl[1] - k * 0.16)}L${n(bowl[0] + k * 0.05)} ${n(bowl[1])}Z"/>`
  const jet =
    `<path class="jet" d="M${n(bowl[0])} ${n(bowl[1] - k * 0.16)}L${n(jetTop[0])} ${n(jetTop[1])}"/>` +
    `<path class="jet-fall" d="M${n(jetTop[0])} ${n(jetTop[1])}Q${n(jetTop[0] - k * 0.12)} ${n(jetTop[1] - 4)} ${n(bowl[0] - k * 0.2)} ${n(bowl[1])}M${n(jetTop[0])} ${n(jetTop[1])}Q${n(jetTop[0] + k * 0.12)} ${n(jetTop[1] - 4)} ${n(bowl[0] + k * 0.2)} ${n(bowl[1])}"/>`

  return { body: body + water, water: '', ripples, streams: shaft + `<path class="stream" d="${streamsList.join('')}"/>`, jet }
}
