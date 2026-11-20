// Rendering kit for every look's scene. A scene is one SVG the app draws
// behind the chat, in a frame with no script.
//
// The one hard rule: no SVG filters. A <filter> element or a filter="url(...)"
// anywhere in a scene makes the app draw it as a still picture, so nothing
// animates. Everything here is built from what keeps motion: gradients,
// masks, clip paths, patterns, mix-blend-mode, <symbol>/<use>, CSS and SMIL
// animation, and CSS `filter: blur()` (the blur-* classes below).
//
// Cost: a CSS blur on a moving element is redrawn every frame. Blur still
// groups and move a parent when you can, and keep blurred areas small.

export const W = 1600
export const H = 1000

// A small deterministic random, so a scene is the same on every load.
export function seeded(seed: number): () => number {
  let s = seed

  return () => {
    s = (s * 16807) % 2147483647

    return s / 2147483647
  }
}

export const n = (v: number): string => (Math.round(v * 10) / 10).toString()

export type Pt = readonly [number, number]

// A smooth closed path through the points (Catmull-Rom as cubic Béziers).
export function closedCurve(pts: readonly Pt[]): string {
  const k = pts.length
  const at = (i: number): Pt => pts[((i % k) + k) % k] as Pt
  let d = `M${n(at(0)[0])} ${n(at(0)[1])}`

  for (let i = 0; i < k; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`
  }

  return `${d}Z`
}

// An organic closed shape around (cx, cy): rx by ry, its edge pushed in and
// out by `jitter` (0 smooth, .3 rough) at `points` places. Rocks, bushes,
// cloud puffs, coral heads, anything that needs an irregular silhouette
// without a displacement filter.
export function blob(cx: number, cy: number, rx: number, ry: number, seed: number, jitter = 0.18, points = 11): string {
  const rand = seeded(seed)
  const pts: Pt[] = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2 + rand() * 0.25
    const r = 1 + (rand() - 0.5) * 2 * jitter

    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]
  })

  return closedCurve(pts)
}

// A filled ribbon along the points, `w0` wide at the start tapering to `w1`.
// Use it for branches, coral, kelp, grass, tails: anything a constant-width
// stroke would turn into a pipe cleaner. Give 4+ points for a smooth curve.
export function taper(pts: readonly Pt[], w0: number, w1: number): string {
  const k = pts.length
  const left: Pt[] = []
  const right: Pt[] = []

  for (let i = 0; i < k; i++) {
    const a = pts[Math.max(0, i - 1)] as Pt
    const b = pts[Math.min(k - 1, i + 1)] as Pt
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const w = (w0 + (w1 - w0) * (i / (k - 1))) / 2
    const p = pts[i] as Pt
    left.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w])
    right.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w])
  }
  const line = (list: readonly Pt[]) => list.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')

  return `M${line(left)} L${line([...right].reverse())}Z`
}

// Gradients every scene can use by id. Include KIT_DEFS in <defs> once.
//   #k-hi      top highlight to lay over a shape: white .55 fading by 45%
//   #k-lo      bottom shade to lay over a shape: black fading in from 55%
//   #k-rim     a rim-light stroke, bright toward the upper left
//   #k-side    a cylinder: lit left edge, dark right edge, for towers, trunks
//   #k-shadow  a soft contact shadow, for ellipses under objects
//   #orb-*     the glass orb's layers
export const KIT_DEFS = `
<linearGradient id="k-hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="k-lo" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
<linearGradient id="k-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="k-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".75" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
<radialGradient id="k-vol" cx=".32" cy=".22" r=".95"><stop offset="0" stop-color="#eaffc0" stop-opacity=".1"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".68"/></radialGradient>
<radialGradient id="k-shadow"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".6" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="orb-body" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="var(--orb-core,#ffffff)" stop-opacity=".04"/><stop offset=".72" stop-color="var(--orb-tint,#7fd0ff)" stop-opacity=".16"/><stop offset=".94" stop-color="var(--orb-tint,#7fd0ff)" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity=".85"/></radialGradient>
<radialGradient id="orb-caustic" cx=".5" cy=".85" r=".45"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="orb-spec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
`

// A shape with relief and no filter: its fill, a top highlight, a bottom
// shade and a rim light. `d` is the shape's path data. The highlight and
// shade gradients run over the shape's own box, so they follow any shape.
export function relief(d: string, fill: string, cls = ''): string {
  return (
    `<g class="${cls}">` +
    `<path d="${d}" fill="${fill}"/>` +
    `<path d="${d}" fill="url(#k-lo)"/>` +
    `<path d="${d}" fill="url(#k-hi)"/>` +
    `<path d="${d}" fill="none" stroke="url(#k-rim)" stroke-width="1.5"/>` +
    `</g>`
  )
}

// A soft contact shadow under an object standing at (x, y), rx wide.
export function contactShadow(x: number, y: number, rx: number, strength = 1): string {
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.18)}" fill="url(#k-shadow)" opacity="${n(strength)}"/>`
}

// A glass orb at (cx, cy) of radius r: tinted fresnel edge, a clear center,
// a caustic glow at the bottom, a soft crescent highlight at the top and a
// small sharp catchlight. Tint it with --orb-tint and --orb-core.
export function orb(cx: number, cy: number, r: number, cls = ''): string {
  return (
    `<g class="orb ${cls}">` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#orb-body)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.92)}" fill="url(#orb-caustic)"/>` +
    `<ellipse class="blur-0" cx="${n(cx)}" cy="${n(cy - r * 0.48)}" rx="${n(r * 0.62)}" ry="${n(r * 0.36)}" fill="url(#orb-spec)"/>` +
    `<ellipse cx="${n(cx - r * 0.42)}" cy="${n(cy - r * 0.42)}" rx="${n(r * 0.12)}" ry="${n(r * 0.07)}" fill="#ffffff" transform="rotate(-40 ${n(cx - r * 0.42)} ${n(cy - r * 0.42)})"/>` +
    `</g>`
  )
}

export type Rising = { x: number; r: number; dur: number; delay: number; sway: number }

// Orbs rising from below the frame, swaying as they go.
export function risingOrbs(list: readonly Rising[], startY = H + 80): string {
  return list
    .map(
      b =>
        `<g class="rise" style="animation-duration:${b.dur}s;animation-delay:-${b.delay}s;--sway:${b.sway}px">${orb(b.x, startY, b.r)}</g>`,
    )
    .join('')
}

// Out-of-focus light discs, screen-blended and softly blurred.
export function bokeh(count: number, seed: number, area: { x: number; y: number; w: number; h: number }, color: string, maxR = 60): string {
  const rand = seeded(seed)

  return `<g class="blur-1">${Array.from({ length: count }, () => {
    const r = 10 + rand() * (maxR - 10)
    const x = area.x + rand() * area.w
    const y = area.y + rand() * area.h

    return `<circle class="bokeh" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}" fill-opacity="${n(0.08 + rand() * 0.22)}" style="animation-delay:-${n(rand() * 20)}s;animation-duration:${n(14 + rand() * 16)}s"/>`
  }).join('')}</g>`
}

// A glow behind something bright: a blurred copy of `content` under the
// sharp one. Use on still content; for a moving glow, move the parent.
export function bloom(content: string, px = 8, opacity = 0.8): string {
  return `<g><g style="filter:blur(${px}px)" opacity="${n(opacity)}">${content}</g>${content}</g>`
}

// Lens ghosts along the line from a light source through the frame center.
export function flare(sx: number, sy: number, color = '#ffffff'): string {
  const cx = W / 2
  const cy = H / 2
  const ghosts = [
    { t: 0.35, r: 26, o: 0.12 },
    { t: 0.55, r: 12, o: 0.18 },
    { t: 0.8, r: 54, o: 0.08 },
    { t: 1.15, r: 18, o: 0.14 },
    { t: 1.45, r: 70, o: 0.06 },
  ]

  return (
    `<g class="flare" style="mix-blend-mode:screen">` +
    ghosts
      .map(g => {
        const x = sx + (cx - sx) * g.t * 2
        const y = sy + (cy - sy) * g.t * 2
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 3) * k + Math.PI / 6

          return `${n(x + g.r * Math.cos(a))},${n(y + g.r * Math.sin(a))}`
        }).join(' ')

        return `<polygon points="${pts}" fill="${color}" opacity="${g.o}"/>`
      })
      .join('') +
    `</g>`
  )
}

// A foliage ramp: seven greens from the shadowed underside to the sunlit top,
// darkest first. Pass your own for autumn, night, coral, anything leafy.
export const LEAF_RAMP = ['#0b2e14', '#134a1f', '#1f6a28', '#358a32', '#5aaa3c', '#93cf55', '#d6f39a'] as const

export type CanopyOptions = {
  // Colors from shadow to light, any length; LEAF_RAMP if absent.
  ramp?: readonly string[]
  // Leaves in the crown; about 34 characters each.
  leaves?: number
  // Leaf length in user units; width follows.
  leaf?: number
  // Lumps the crown grows in.
  clusters?: number
  // Where the light comes from, as a direction toward it (x right, y down, z toward the viewer).
  light?: readonly [number, number, number]
  // A few near-white specks on the brightest leaves, the glossy Aero sheen.
  sheen?: boolean
  // Leaf shape: 'leaf' pointed broadleaf, 'needle' thin conifer, 'round' boxwood.
  shape?: 'leaf' | 'needle' | 'round'
}

// A tree crown, bush or hedge lit as a real volume. Leaves sit in lumpy
// clusters on a rough ellipsoid at (cx, cy) of radii rx, ry; each is shaded
// from its 3D facing toward the light, inner leaves fall into shadow, and
// leaves of one shade share one path, painted shadow first so the lit ones
// lie on top. No filters, no <use>: a 400-leaf crown is about 14 KB.
// Wrap the result in class="wind" to sway.
export function canopy(cx: number, cy: number, rx: number, ry: number, seed: number, opts: CanopyOptions = {}): string {
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
  const rz = (rx + ry) / 2
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
  const tile = Math.max(26, len * 3.4)
  const tr = seeded(seed + 31)
  const tileLeaves = Array.from({ length: 4 }, (_, j) => {
    const fill = ramp[Math.min(steps - 1, 1 + j)]
    const d = Array.from({ length: 16 }, () => {
      const x = tr() * tile
      const y = tr() * tile
      const a = tr() * Math.PI * 2
      const l = len * (0.5 + tr() * 0.4)
      const w = l * wid
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const mx = x + ca * l * 0.5
      const my = y + sa * l * 0.5

      return `M${n(x)} ${n(y)}Q${n(mx - sa * w)} ${n(my + ca * w)} ${n(x + ca * l)} ${n(y + sa * l)}Q${n(mx + sa * w)} ${n(my - ca * w)} ${n(x)} ${n(y)}Z`
    }).join('')

    return `<path fill="${fill}" d="${d}"/>`
  }).join('')
  const pid = `k-lp${seed}`
  // The body is the union of the clusters (plus a heart between them), so it
  // always sits inside the leaves that cover each cluster's surface. A mask
  // makes the union, and the textured fill and its light are rectangles
  // over the crown's box.
  const circle = (x: number, y: number, r: number) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`
  const shapes =
    `<path d="${blob(cx, cy, rx * 0.6, ry * 0.58, seed + 7, 0.12)}"/>` +
    clusters.map(c => circle(cx + c.x * rx, cy + c.y * ry, c.r * Math.min(rx, ry) * 0.92)).join('')
  const mid = `k-m${seed}`
  const box = `x="${n(cx - rx * 1.1)}" y="${n(cy - ry * 1.1)}" width="${n(rx * 2.2)}" height="${n(ry * 2.2)}"`

  return (
    `<g>` +
    `<defs><pattern id="${pid}" width="${n(tile)}" height="${n(tile)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${n(tr() * 90)})"><rect width="${n(tile)}" height="${n(tile)}" fill="${ramp[0]}"/>${tileLeaves}</pattern>` +
    `<mask id="${mid}"><g fill="#fff">${shapes}</g></mask></defs>` +
    `<g mask="url(#${mid})"><rect ${box} fill="url(#${pid})"/><rect ${box} fill="url(#k-vol)"/></g>` +
    buckets.map((list, i) => (list.length ? `<path fill="${ramp[i]}" d="${list.join('')}"/>` : '')).join('') +
    (specks.length ? `<path fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.4" stroke-linecap="round" d="${specks.join('')}"/>` : '') +
    `</g>`
  )
}

// A tree: tapered trunk and a few limbs into a canopy, with a contact shadow.
// (x, y) is where the trunk meets the ground; h is the full height.
export function tree(x: number, y: number, h: number, seed: number, opts: CanopyOptions & { bark?: string } = {}): string {
  const rand = seeded(seed + 99)
  const crownR = h * 0.36
  const cy = y - h + crownR * 0.95
  const lean = (rand() - 0.5) * h * 0.08
  const trunk = taper([[x, y], [x + lean * 0.3, y - h * 0.3], [x + lean * 0.7, y - h * 0.5], [x + lean, cy + crownR * 0.2]], h * 0.07, h * 0.03)
  const limbs = [-1, 1]
    .map(side => taper([[x + lean * 0.6, y - h * 0.45], [x + lean + side * crownR * 0.35, cy + crownR * 0.25], [x + lean + side * crownR * 0.55, cy]], h * 0.025, h * 0.008))
    .join('')
  const bark = opts.bark ?? '#4a3426'

  return (
    `<g>` +
    contactShadow(x, y, crownR * 1.1, 0.9) +
    `<g fill="${bark}"><path d="${trunk}"/><path d="${limbs}"/></g>` +
    `<path d="${trunk}" fill="url(#k-side)"/>` +
    canopy(x + lean, cy, crownR * 1.05, crownR * 0.9, seed, opts) +
    `</g>`
  )
}

// Kept for scenes written against the first kit: a bush as a canopy.
export function foliage(cx: number, cy: number, w: number, h: number, seed: number, _pal?: unknown, density = 1): string {
  return canopy(cx, cy, w / 2, h / 2, seed, { leaves: Math.round(((w * h) / 4 / 22) * density) })
}

// Fine speckle as a pattern, standing in for noise textures (sand, concrete,
// grain): `<rect fill="url(#id)">` over an area. Put the result in <defs>.
export function speckle(id: string, seed: number, color: string, size = 64, dots = 40, maxR = 1.2, opacity = 0.25): string {
  const rand = seeded(seed)
  const body = Array.from(
    { length: dots },
    () => `<circle cx="${n(rand() * size)}" cy="${n(rand() * size)}" r="${n(0.3 + rand() * maxR)}" fill-opacity="${n(rand() * opacity)}"/>`,
  ).join('')

  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><g fill="${color}">${body}</g></pattern>`
}

// Atmospheric perspective: a veil in the sky's color laid over a far layer,
// so distance shifts it toward the sky and not only blurs it. Put it right
// after the layer's content, inside the same group.
export function atmos(color: string, opacity: number, box = { x: 0, y: 0, w: W, h: H }): string {
  return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${color}" fill-opacity="${n(opacity)}"/>`
}

// The final grade over the whole frame: a warm wash from the light's
// corner, a cool one opposite, and a vignette. Last element of the body.
export function grade(light: Pt, warm = '#ffe9c0', cool = '#0a3a8a', strength = 1): string {
  const [lx, ly] = light

  return (
    `<defs><radialGradient id="k-grade" gradientUnits="userSpaceOnUse" cx="${lx}" cy="${ly}" r="1500">` +
    `<stop offset="0" stop-color="${warm}" stop-opacity="${n(0.16 * strength)}"/><stop offset=".55" stop-color="${warm}" stop-opacity="0"/>` +
    `<stop offset=".7" stop-color="${cool}" stop-opacity="0"/><stop offset="1" stop-color="${cool}" stop-opacity="${n(0.16 * strength)}"/></radialGradient>` +
    `<radialGradient id="k-vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${n(0.22 * strength)}"/></radialGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#k-grade)" style="mix-blend-mode:soft-light"/>` +
    `<rect width="${W}" height="${H}" fill="url(#k-vig)"/>`
  )
}

// Parallax depth layers: each layer drifts on the same slow camera path, the
// nearer layers further. Wrap content as layer(depth, content), depth 1 far
// to 4 near.
export function layer(depth: 1 | 2 | 3 | 4, content: string, extra = ''): string {
  return `<g class="cam cam-${depth}" ${extra}>${content}</g>`
}

export const MOTION_CSS = `
.blur-0 { filter: blur(1.2px); } .blur-1 { filter: blur(2px); } .blur-2 { filter: blur(5px); } .blur-3 { filter: blur(10px); } .haze { filter: blur(22px); }
.cam { animation: cam 60s ease-in-out infinite alternate; }
.cam-1 { --cx: 8px; --cy: 2px; } .cam-2 { --cx: 18px; --cy: 4px; } .cam-3 { --cx: 34px; --cy: 7px; } .cam-4 { --cx: 56px; --cy: 11px; }
@keyframes cam { from { transform: translate(calc(var(--cx) * -1), 0); } to { transform: translate(var(--cx), var(--cy)); } }
.rise { animation: rise linear infinite; }
@keyframes rise {
  0% { transform: translate(0, 0); opacity: 0; }
  8% { opacity: 1; }
  50% { transform: translate(var(--sway), -560px); }
  92% { opacity: 1; }
  100% { transform: translate(0, -1240px); opacity: 0; }
}
.bokeh { mix-blend-mode: screen; animation: bokeh ease-in-out infinite alternate; }
@keyframes bokeh { from { transform: translate(-14px, 8px); } to { transform: translate(14px, -10px); } }
.wind { transform-box: fill-box; transform-origin: 50% 100%; animation: wind 7s cubic-bezier(.45,0,.55,1) infinite alternate; }
@keyframes wind { from { transform: rotate(-1.5deg); } to { transform: rotate(2deg); } }
@keyframes drift { from { transform: translateX(-400px); } to { transform: translateX(2000px); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .6; } }
@keyframes twinkle { 0%,100% { opacity: .9; } 50% { opacity: .2; } }
@keyframes spin { to { transform: rotate(360deg); } }
`

// The whole document. css and defs are the scene's own; KIT_DEFS and
// MOTION_CSS are always included.
export function svg(css: string, defs: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><style>${MOTION_CSS}${css}</style><defs>${KIT_DEFS}${defs}</defs>${body}</svg>`
}

// True when a scene holds an SVG filter, which would freeze it in the app.
export function hasSvgFilter(scene: string): boolean {
  return /<filter[\s>]|filter="url\(/.test(scene)
}
