import { n, seeded, taper, type Pt } from './kit'

// Pieces of the Marrakech scene: the Koutoubia minaret, date palms, people,
// food stalls, juice carts, the calèche, swifts, the street lamp, the
// macaques and the window with the tea. Colours are CSS classes the scene
// defines for day and night.
// Light comes from the right and a little in front, the low afternoon sun.

// Gradient stop painted from a CSS variable, so night can recolour it.
// Colour and opacity are shared classes (`g<var>`, `q<n>`), whose rules
// stopCss() writes once for the scene's stylesheet.
const stopColours = new Set<string>()
const stopAlphas = new Map<string, string>()
export const st = (o: number, v: string, a: number | string = 1): string => {
  stopColours.add(v)
  if (a === 1) return `<stop offset="${o}" class="g${v}"/>`
  const key = String(a)
  let q = stopAlphas.get(key)
  if (q === undefined) {
    q = typeof a === 'number' ? `q${Math.round(a * 100)}` : `qv${stopAlphas.size}`
    stopAlphas.set(key, q)
  }
  return `<stop offset="${o}" class="g${v} ${q}"/>`
}
export const stopCss = (): string =>
  [...stopColours].map(v => `.g${v}{stop-color:var(--${v})}`).join('') + [...stopAlphas].map(([a, q]) => `.${q}{stop-opacity:${a}}`).join('')

// ------------------------------------------------------------- baking

// Repeated pieces are baked into the scene's own coordinates and merged by
// paint, so a whole row of stalls or a crowd draws as a handful of paths
// rather than one element per part per copy.

const TOKEN = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g
const ARITY: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, Q: 4, S: 4, C: 6, A: 7, Z: 0 }

// Numbers joined the short way SVG allows: no space before a minus sign.
const nums = (v: readonly number[]): string => v.map((x, j) => (j && x >= 0 ? ' ' : '') + n(x).replace(/^(-?)0\./, '$1.')).join('')

const n4 = (v: number): string => String(Math.round(v * 1e4) / 1e4)

export type Pen = { x: number; y: number }

// Path data moved by (tx, ty) after scaling by s about the origin, written
// in relative commands from where the pen was left, so the numbers stay
// short and pieces can follow one another in one path. Points are rounded
// to the step q, each against the rounded pen position, so rounding never
// drifts.
export function bake(d: string, tx: number, ty: number, s: number, pen: Pen = { x: 0, y: 0 }, q = 0.1): string {
  const tok = d.match(TOKEN) ?? []
  const r = (v: number) => Math.round(v / q) * q
  let out = ''
  let cmd = ''
  let i = 0
  // the pen, true and as written, and the subpath start as written
  let ax = 0
  let ay = 0
  let px = pen.x
  let py = pen.y
  let sx = px
  let sy = py
  let last = ''
  while (i < tok.length) {
    const t = tok[i] as string
    if (/[a-zA-Z]/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        out += 'z'
        last = 'z'
        ax = sx
        ay = sy
        px = sx
        py = sy
        continue
      }
    }
    const up = cmd.toUpperCase()
    const isRel = cmd !== up
    const k = ARITY[up] as number
    const v = tok.slice(i, i + k).map(Number)
    i += k
    // absolute coordinates of each point in the command
    const X = (x: number) => (isRel ? ax + x * s : x * s + tx)
    const Y = (y: number) => (isRel ? ay + y * s : y * s + ty)
    let w: number[]
    let nx = ax
    let ny = ay
    if (up === 'H') nx = X(v[0]!)
    else if (up === 'V') ny = Y(v[0]!)
    else {
      nx = X(v[k - 2]!)
      ny = Y(v[k - 1]!)
    }
    const qx = r(nx) - px
    const qy = r(ny) - py
    if (up === 'H') w = [qx]
    else if (up === 'V') w = [qy]
    else if (up === 'A') w = [v[0]! * s, v[1]! * s, v[2]!, v[3]!, v[4]!, qx, qy]
    else {
      w = []
      for (let j = 0; j < k - 2; j += 2) w.push(r(X(v[j]!)) - px, r(Y(v[j + 1]!)) - py)
      w.push(qx, qy)
    }
    let lead = up.toLowerCase()
    const body = up === 'A' ? `${nums(w.slice(0, 2))} ${w[2]} ${w[3]} ${w[4]} ${nums(w.slice(5))}`.replace(/ (-)/g, '$1') : nums(w)
    // a repeated command needs no letter, only a gap before a positive number
    if (lead === last && lead !== 'm') lead = body.startsWith('-') ? '' : ' '
    else last = lead
    out += lead + body
    if (up === 'M') {
      sx = r(nx)
      sy = r(ny)
    }
    ax = nx
    ay = ny
    px = r(nx)
    py = r(ny)
    // a moveto's extra pairs are linetos
    if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
  }
  pen.x = px
  pen.y = py
  return out
}

export const ell = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${n(cx - rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)}A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`
export const box = (x: number, y: number, w: number, h: number): string => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`

// Collects path data by class and writes one path per class, in the order
// the classes were first seen.
// A sheet made with mult above 1 writes its paths mult times too large in
// whole numbers, inside a group that scales them back: short numbers, steps
// of 1/mult. Only for filled shapes, since the group would thin strokes.
export class Sheet {
  private parts = new Map<string, string[]>()
  private pens = new Map<string, Pen>()
  constructor(private mult = 1) {}
  // path data d placed at (x, y) and scaled by s, rounded to the step q
  add(cls: string, d: string, x = 0, y = 0, s = 1, q = 0.1): void {
    let pen = this.pens.get(cls)
    if (!pen) this.pens.set(cls, (pen = { x: 0, y: 0 }))
    const list = this.parts.get(cls)
    const k = this.mult
    const baked = k > 1 ? bake(d, x * k, y * k, s * k, pen, 1) : bake(d, x, y, s, pen, q)
    if (list) list.push(baked)
    else this.parts.set(cls, [baked])
  }
  // path data kept exactly as written, such as the zero-length dots of a
  // round-capped stroke
  raw(cls: string, d: string): void {
    const list = this.parts.get(cls)
    if (list) list.push(d)
    else this.parts.set(cls, [d])
    this.pens.set(cls, { x: 0, y: 0 })
  }
  // a piece drawn in its own units, placed at (x, y) and scaled by s
  put(piece: readonly (readonly [string, string])[], x: number, y: number, s: number): void {
    for (const [cls, d] of piece) this.add(cls, d, x, y, s)
  }
  out(order?: readonly string[]): string {
    const keys = order ? [...order.filter(k => this.parts.has(k)), ...[...this.parts.keys()].filter(k => !order.includes(k))] : [...this.parts.keys()]
    const paths = keys.map(k => `<path class="${k}" d="${(this.parts.get(k) as string[]).join('')}"/>`).join('')
    return this.mult > 1 ? `<g transform="scale(${n4(1 / this.mult)})">${paths}</g>` : paths
  }
}

// ---------------------------------------------------------------- Koutoubia

// A horseshoe arch opening, x-squeezed by sx for a face seen at an angle.
function horseshoe(x: number, yb: number, w: number, h: number, sx: number): string {
  const hw = w / sx / 2
  const r = hw * 1.14
  const dy = Math.sqrt(r * r - hw * hw)
  const cy = yb - h + r
  return `M${n(x)} ${n(yb)}V${n(cy + dy)}A${n(r * sx)} ${n(r)} 0 1 1 ${n(x + w)} ${n(cy + dy)}V${n(yb)}Z`
}

// A polylobed arch opening: small lobes along a slightly pointed arch.
function lobed(x: number, yb: number, w: number, h: number, sx: number, lobes = 5): string {
  const hw = w / 2
  const rise = (w / sx / 2) * 1.08
  const ys = yb - h + rise
  const cx = x + hw
  let d = `M${n(x)} ${n(yb)}V${n(ys)}`
  const pts: Pt[] = []
  for (let k = 0; k <= lobes; k++) {
    const a = Math.PI + (k / lobes) * Math.PI
    // a slight point at the crown
    const pk = 1 - 0.12 * Math.abs(Math.cos(a))
    pts.push([cx + Math.cos(a) * hw, ys + Math.sin(a) * rise * (k === 0 || k === lobes ? 1 : 1 / pk)])
  }
  for (let k = 1; k < pts.length; k++) {
    const p = pts[k] as Pt
    const q = pts[k - 1] as Pt
    const ch = Math.hypot(p[0] - q[0], p[1] - q[1])
    d += `A${n(ch * 0.56)} ${n(ch * 0.56)} 0 0 1 ${n(p[0])} ${n(p[1])}`
  }
  return `${d}V${n(yb)}Z`
}

// One stepped merlon, base at (x, y), bw wide, h tall.
function merlon(x: number, y: number, bw: number, h: number): string {
  const s = bw / 6
  const t = h / 3
  return `M${n(x)} ${n(y)}v${n(-t)}h${n(s)}v${n(-t)}h${n(s)}v${n(-t)}h${n(bw - 4 * s)}v${n(t)}h${n(s)}v${n(t)}h${n(s)}v${n(t)}Z`
}

type Face = { x0: number; fw: number; top: number; W: number; sx: number }

// The decoration of every face, gathered by paint so the four faces draw as
// one path per paint.
type Deco = { band: string[]; rec: string[]; sebA: string[]; sebB: string[]; hole: string[]; arc: string[]; lit: string[] }

// Decoration of one face of a shaft, in face units: u across 0..1, v down
// from the top in shaft widths.
function faceDeco(f: Face, variant: 'A' | 'B' | 'L', out: Deco): void {
  const X = (u: number) => f.x0 + u * f.fw
  const Y = (v: number) => f.top + v * f.W
  const { rec, hole, lit } = out
  const net = variant === 'B' ? out.sebB : out.sebA
  const box = (u0: number, v0: number, u1: number, v1: number) => {
    rec.push(`M${n(X(u0))} ${n(Y(v0))}H${n(X(u1))}V${n(Y(v1))}H${n(X(u0))}Z`)
    lit.push(`M${n(X(u0) + 0.5)} ${n(Y(v0) + 0.8)}V${n(Y(v1))}M${n(X(u0))} ${n(Y(v1) - 0.3)}H${n(X(u1))}`)
  }
  const sebka = (u0: number, v0: number, u1: number, v1: number) => {
    net.push(`M${n(X(u0))} ${n(Y(v0))}H${n(X(u1))}V${n(Y(v1))}H${n(X(u0))}Z`)
  }
  const arch = (kind: 'h' | 'l', uc: number, vb: number, uw: number, vh: number, into: string[], lobes = 5) => {
    const x = X(uc - uw / 2)
    const w = uw * f.fw
    into.push(kind === 'h' ? horseshoe(x, Y(vb), w, vh * f.W, f.sx) : lobed(x, Y(vb), w, vh * f.W, f.sx, lobes))
  }
  const L = variant === 'L'
  // ceramic band and the arcade of four intersecting lobed arches under it
  const band = L ? [0.06, 0.16] : [0.1, 0.32]
  const arc = out.arc
  if (!L) {
    box(0.06, 0.46, 0.94, 1.12)
    for (let i = 0; i < 4; i++) {
      const uc = 0.2 + i * 0.2
      arch('l', uc, 1.08, 0.15, 0.5, hole, 5)
      // the intersecting arcs that link each arch to the next but one
      const a = X(uc - 0.1)
      const b = X(uc + 0.3)
      if (i < 3) arc.push(`M${n(a)} ${n(Y(1.08))}V${n(Y(0.78))}Q${n((a + b) / 2)} ${n(Y(0.3))} ${n(b)} ${n(Y(0.78))}V${n(Y(1.08))}`)
    }
  }
  if (variant === 'A') {
    box(0.12, 1.3, 0.88, 2.32)
    sebka(0.18, 1.36, 0.82, 1.86)
    arch('l', 0.36, 2.27, 0.2, 0.36, hole, 5)
    arch('l', 0.64, 2.27, 0.2, 0.36, hole, 5)
    box(0.3, 2.58, 0.7, 3.18)
    arch('h', 0.5, 3.13, 0.26, 0.5, hole)
    arch('l', 0.5, 3.6, 0.12, 0.2, hole, 3)
    box(0.47, 3.92, 0.53, 4.06)
  } else if (variant === 'B') {
    box(0.16, 1.28, 0.84, 1.98)
    arch('l', 0.5, 1.95, 0.5, 0.62, hole, 7)
    box(0.14, 2.18, 0.86, 2.9)
    sebka(0.2, 2.22, 0.8, 2.52)
    arch('h', 0.37, 2.86, 0.16, 0.3, hole)
    arch('h', 0.63, 2.86, 0.16, 0.3, hole)
    box(0.33, 3.3, 0.43, 3.46)
    box(0.57, 3.3, 0.67, 3.46)
    box(0.47, 3.86, 0.53, 4)
  } else {
    // the lantern: twin windows in a lobed frame, a sebka panel above
    box(0.12, 0.22, 0.88, 0.98)
    sebka(0.16, 0.26, 0.84, 0.5)
    arch('l', 0.5, 0.95, 0.6, 0.42, rec, 5)
    arch('l', 0.38, 0.92, 0.14, 0.26, hole, 3)
    arch('l', 0.62, 0.92, 0.14, 0.26, hole, 3)
  }
  out.band.push(`M${n(f.x0 + 0.6)} ${n(Y(band[0] as number))}h${n(f.fw - 1.2)}V${n(Y(band[1] as number))}h${n(-(f.fw - 1.2))}Z`)
  lit.push(`M${n(f.x0)} ${n(Y(band[0] as number) - 0.6)}h${n(f.fw)}M${n(f.x0)} ${n(Y(band[1] as number) + 0.6)}h${n(f.fw)}`)
}

const decoPaths = (o: Deco): string =>
  (
    [
      ['class="kz"', o.band],
      ['class="kr"', o.rec],
      ['fill="url(#m-sebA)"', o.sebA],
      ['fill="url(#m-sebB)"', o.sebB],
      ['class="kw"', o.hole],
      ['class="kp"', o.arc],
      ['class="kh"', o.lit],
    ] as const
  )
    .filter(([, d]) => d.length)
    .map(([paint, d]) => `<path ${paint} d="${d.join('')}"/>`)
    .join('')

// The Koutoubia: a square sandstone shaft 12.8 m wide and 55.7 m tall,
// stepped merlons over a band of green and white ceramic, a lantern 6.9 m
// wide and 13.8 m tall with its own band and merlons, a fluted dome, and
// the finial of three gilded copper spheres. Two faces show, each with its
// own composition of windows and blind arches.
export function koutoubia(cx: number, base: number, W: number): string {
  const aL = W * 0.7
  const aR = W * 0.4
  const xl = cx - (aL + aR) / 2
  const xf = xl + aL
  const xr = xf + aR
  const top = base - W * 4.35
  const s = 0.537
  const lxl = cx - (s * (aL + aR)) / 2
  const lxf = lxl + s * aL
  const lxr = lxf + s * aR
  const lt = top - W * 1.08
  const shaft = `M${n(xl)} ${n(base)}V${n(top)}H${n(xr)}V${n(base)}Z`
  const lant = `M${n(lxl)} ${n(top)}V${n(lt)}H${n(lxr)}V${n(top)}Z`
  // merlons: four to a face along the shaft top, three along the lantern's
  const mer = (x0: number, w: number, y: number, k: number, h: number) => {
    const bw = w / k
    return Array.from({ length: k }, (_, i) => merlon(x0 + i * bw + bw * 0.08, y, bw * 0.84, h)).join('')
  }
  const domeY = lt - W * 0.07
  const dw = s * (aL + aR) * 0.3
  const dh = W * 0.27
  const dome = `M${n(cx - dw)} ${n(domeY)}Q${n(cx - dw)} ${n(domeY - dh * 1.05)} ${n(cx)} ${n(domeY - dh)}Q${n(cx + dw)} ${n(domeY - dh * 1.05)} ${n(cx + dw)} ${n(domeY)}Z`
  const ribs = [-0.66, -0.33, 0, 0.33, 0.66]
    .map(k => `M${n(cx + k * dw)} ${n(domeY)}Q${n(cx + k * dw * 0.9)} ${n(domeY - dh * 0.8)} ${n(cx)} ${n(domeY - dh)}`)
    .join('')
  const pole0 = domeY - dh
  const balls = [
    { y: pole0 - W * 0.16, r: W * 0.082 },
    { y: pole0 - W * 0.38, r: W * 0.064 },
    { y: pole0 - W * 0.56, r: W * 0.048 },
  ]
  const ball = (y: number, r: number) =>
    `<circle cx="${n(cx)}" cy="${n(y)}" r="${n(r)}" class="kball"/><ellipse cx="${n(cx)}" cy="${n(y + r * 0.98)}" rx="${n(r * 0.45)}" ry="${n(r * 0.16)}" class="kg"/>`
  const fL: Face = { x0: xl, fw: aL, top, W, sx: aL / W }
  const fR: Face = { x0: xf, fw: aR, top, W, sx: aR / W }
  const gL: Face = { x0: lxl, fw: s * aL, top: lt, W, sx: (s * aL) / W }
  const gR: Face = { x0: lxf, fw: s * aR, top: lt, W, sx: (s * aR) / W }
  const deco = (): Deco => ({ band: [], rec: [], sebA: [], sebB: [], hole: [], arc: [], lit: [] })
  const lanternDeco = deco()
  faceDeco(gL, 'L', lanternDeco)
  faceDeco(gR, 'L', lanternDeco)
  const shaftDeco = deco()
  faceDeco(fL, 'A', shaftDeco)
  faceDeco(fR, 'B', shaftDeco)
  return (
    `<g id="m-kout">` +
    // the lantern behind the shaft's merlons
    `<path class="k1" d="M${n(lxl)} ${n(top)}V${n(lt)}H${n(lxf)}V${n(top)}Z"/><path class="k2" d="M${n(lxf)} ${n(top)}V${n(lt)}H${n(lxr)}V${n(top)}Z"/>` +
    `<path fill="url(#m-rub)" d="${lant}"/>` +
    decoPaths(lanternDeco) +
        // dome, finial pole, spheres and the flag mast
    `<path d="${dome}" fill="url(#m-dome)"/><path class="kp" d="${ribs}"/>` +
    `<path class="kmast" d="M${n(lxr - 2)} ${n(lt - 1)}l1.6 ${n(-W * 0.78)}m-.7 ${n(W * 0.08)}h4"/>` +
    `<path class="kpole" d="M${n(cx)} ${n(pole0)}V${n(pole0 - W * 0.72)}"/>` +
    balls.map(b => ball(b.y, b.r)).join('') +
    `<path class="kpole" d="M${n(cx)} ${n(pole0 - W * 0.6)}v${n(-W * 0.1)}"/>` +
    `<path class="k1" d="${mer(lxl, s * aL, lt, 3, W * 0.14)}"/><path class="k2" d="${mer(lxf, s * aR, lt, 2, W * 0.14)}"/>` +
    // the shaft
    `<path class="k1" d="M${n(xl)} ${n(base)}V${n(top)}H${n(xf)}V${n(base)}Z"/><path class="k2" d="M${n(xf)} ${n(base)}V${n(top)}H${n(xr)}V${n(base)}Z"/>` +
    `<path fill="url(#m-rub)" d="${shaft}"/>` +
    decoPaths(shaftDeco) +
    `<path class="k1" d="${mer(xl, aL, top, 4, W * 0.22)}"/><path class="k2" d="${mer(xf, aR, top, 3, W * 0.22)}"/>` +
    // light: the lit corner, the sunlit right edge, a soft fall-off toward the ground
    `<path class="kh2" d="M${n(xf)} ${n(top - W * 0.2)}V${n(base)}M${n(xr - 0.6)} ${n(top)}V${n(base)}M${n(lxf)} ${n(lt)}V${n(top)}"/>` +
    `<path d="${shaft}" fill="url(#m-kfade)"/>` +
    `</g>`
  )
}

// --------------------------------------------------------------- palms

// A date palm frond pointing right from the origin, 100 long: a tapered
// rachis and two rows of stiff leaflets angled forward, drooping a little.
// Both rows are one zigzag outline that runs out along one side of the
// rachis, leaflet by leaflet, and back along the other, k leaflets a side
// set edge to edge at the base.
function frond(seed: number, droop: number, k: number): string {
  const rand = seeded(seed)
  const c: Pt = [45, -20 + droop * 0.5]
  const e: Pt = [100, 22 + droop]
  const at = (t: number): Pt => [2 * (1 - t) * t * c[0] + t * t * e[0], 2 * (1 - t) * t * c[1] + t * t * e[1]]
  const spine: Pt[] = [0, 0.35, 0.7, 1].map(at)
  const pt = ([x, y]: Pt) => `${n(x)} ${n(y)}`
  const base: Pt[] = [at(0.07 - 0.46 / (k - 1))]
  const tips: [Pt, Pt][] = []
  for (let i = 0; i < k; i++) {
    const t = 0.07 + (i / (k - 1)) * 0.92
    const p = at(t)
    const q = at(Math.min(1, t + 0.01))
    let tx = q[0] - p[0]
    let ty = q[1] - p[1]
    const tl = Math.hypot(tx, ty) || 1
    tx /= tl
    ty /= tl
    const tip: Pt[] = []
    for (const side of [-1, 1]) {
      const ang = side * (0.95 - t * 0.35) + (rand() - 0.5) * 0.25
      let dx = tx * Math.cos(ang) - ty * Math.sin(ang)
      let dy = tx * Math.sin(ang) + ty * Math.cos(ang) + 0.32
      const dl = Math.hypot(dx, dy) || 1
      dx /= dl
      dy /= dl
      const l = 25 * (1 - t * 0.68) * (0.8 + rand() * 0.4)
      tip.push([p[0] + dx * l, p[1] + dy * l])
    }
    tips.push(tip as unknown as [Pt, Pt])
    base.push(at(Math.min(1, t + 0.46 / (k - 1))))
  }
  let d = `M${pt(base[0] as Pt)}`
  for (let i = 0; i < k; i++) d += `L${pt(tips[i]![0])}L${pt(base[i + 1] as Pt)}`
  for (let i = k - 1; i >= 0; i--) d += `L${pt(tips[i]![1])}L${pt(base[i] as Pt)}`
  return taper(spine, 3, 0.6) + `${d}Z`
}

// The fronds are drawn five times their size in whole units; each use
// scales one back down, so the points are fine enough with no decimals.
const FROND_UNIT = 5
const frondDef = (id: string, seed: number, droop: number, k: number) =>
  `<path id="${id}" d="${bake(frond(seed, droop, k), 0, 0, FROND_UNIT, { x: 0, y: 0 }, 1)}"/>`

// A palm crown around the origin, sized for a 100-tall palm: stiff fronds
// fanning up and out, older ones hanging, shaded by where each one points.
// fr and frh name the straight and the hanging frond to draw it with.
function crown(id: string, seed: number, fr: string, frh: string): string {
  const rand = seeded(seed)
  const items: { cls: string; t: string }[] = []
  // light from the upper right: fronds pointing that way are lit
  const shade = (a: number) => {
    const lam = Math.cos(((a + 35) * Math.PI) / 180)
    return lam > 0.45 ? 'fa' : lam > -0.25 ? 'fb' : 'fc'
  }
  const m = (a: number, sc: number, flip: boolean) => {
    const c = (Math.cos((a * Math.PI) / 180) * sc) / FROND_UNIT
    const si = (Math.sin((a * Math.PI) / 180) * sc) / FROND_UNIT
    const f = flip ? -1 : 1
    return `matrix(${[c, si, -si * f, c * f].map(v => n4(v).replace(/^(-?)0\./, '$1.')).join(' ')} 0 0)`
  }
  const fans = 11
  for (let i = 0; i < fans; i++) {
    const a = -172 + (i / (fans - 1)) * 164 + (rand() - 0.5) * 10
    const sc = 0.34 * (0.8 + rand() * 0.35)
    items.push({ cls: shade(a), t: `<use href="#${fr}" class="${shade(a)}" transform="${m(a, sc, Math.cos((a * Math.PI) / 180) < 0)}"/>` })
  }
  for (let i = 0; i < 4; i++) {
    const a = 26 + i * 42 + (rand() - 0.5) * 12
    const flip = Math.cos((a * Math.PI) / 180) < 0
    const sc = 0.34 * (0.7 + rand() * 0.3)
    items.push({ cls: 'fc', t: `<use href="#${frh}" class="${i % 2 ? 'fd' : 'fc'}" transform="${m(a - (flip ? -25 : 25), sc, flip)}"/>` })
  }
  const order = ['fc', 'fd', 'fb', 'fa']
  items.sort((p, q) => order.indexOf(p.cls) - order.indexOf(q.cls))
  return `<g id="${id}">${items.map(i => i.t).join('')}<ellipse class="fd" cx="0" cy="1.2" rx="3.5" ry="3"/></g>`
}

// Near crowns (the tall palms on the terraces) have 16 leaflets a side to a
// frond; the two far palms by the minaret share one crown of 8.
export const PALM_DEFS =
  frondDef('m-fr', 11, 0, 16) +
  frondDef('m-frh', 23, 45, 16) +
  frondDef('m-frf', 11, 0, 8) +
  frondDef('m-frhf', 23, 45, 8) +
  crown('m-crA', 5, 'm-fr', 'm-frh') +
  crown('m-crB', 12, 'm-fr', 'm-frh') +
  crown('m-crf', 12, 'm-frf', 'm-frhf') +
  `<pattern id="m-scar" width="9" height="7" patternUnits="userSpaceOnUse"><path d="M0 1.5Q4.5 5.5 9 1.5" fill="none" class="scar"/></pattern>` +
  `<linearGradient id="m-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".55" stop-color="#000" stop-opacity=".05"/><stop offset=".8" class="cylhi"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>`

// A date palm standing at (x, y), h tall to the crown.
export function palm(x: number, y: number, h: number, seed: number, sway = true): string {
  const rand = seeded(seed)
  const lean = (rand() - 0.5) * h * 0.16
  const cx = x + lean
  const cy = y - h
  const trunk = taper([[x, y], [x + lean * 0.2, y - h * 0.35], [x + lean * 0.6, y - h * 0.7], [cx, cy + h * 0.02]], h * 0.05, h * 0.036)
  const sc = ((h / 100) * (0.92 + rand() * 0.16)).toFixed(2)
  const swayAttr = sway ? ` class="sway" style="transform-origin:${n(cx)}px ${n(cy)}px;animation-duration:${n(6 + rand() * 5)}s;animation-delay:-${n(rand() * 9)}s"` : ''
  return (
    `<g><defs><path id="m-tr${seed}" d="${trunk}"/></defs><use href="#m-tr${seed}" class="tr"/><use href="#m-tr${seed}" fill="url(#m-scar)"/><use href="#m-tr${seed}" fill="url(#m-cyl)"/>` +
    `<g${swayAttr}><use href="#m-cr${h < 150 ? 'f' : seed % 2 ? 'A' : 'B'}" transform="translate(${n(cx)} ${n(cy)}) scale(${sc})"/></g></g>`
  )
}

// ------------------------------------------------------------- people

// People 40 units tall, feet at the origin. The body takes its fill from
// the <use>; face, rim light and the day shadow have their own classes.
// The ground under a figure (its long day shadow and the dark contact patch
// at the feet) is a separate piece, so a walker's body can bounce while its
// shadow stays on the paving.
const WALKER_DEFS =
  `<g id="m-pg"><path class="psh" d="M-6 0L-68 7L-66 10L6 1Z"/><ellipse class="pcs" cx="0" cy=".4" rx="8.5" ry="2"/></g>` +
  `<g id="m-pab"><path d="M-6.5 0L-5.5-20Q-6-27-3.6-30Q-4.4-37 0-42Q4.4-37 3.6-30Q6-27 5.5-20L6.5 0Z"/>` +
  `<ellipse class="skin" cx=".9" cy="-33.5" rx="2" ry="2.6"/><path class="plit" d="M3.8-30Q6.2-26.5 5.5-20L6.5 0L5.2 0L4.4-20Q4.8-26 3-30Z"/></g>` +
  `<g id="m-pbb"><path d="M-7 0L-5-21Q-5.6-28-3-30.5Q-4.8-34-3.6-37Q0-40.5 3.6-37Q4.8-34 3-30.5Q5.6-28 5-21L7 0Z"/>` +
  `<ellipse class="skin" cx=".8" cy="-34" rx="1.9" ry="2.5"/><path class="plit" d="M3.2-30.5Q5.8-27 5-21L7 0L5.6 0L4.2-21Q4.6-27 2.6-30.5Z"/></g>` +
  `<g id="m-pcb"><path class="trs" d="M-3.6 0L-3.2-17H3.2L3.6 0H1.6L.1-12.5L-1.6 0Z"/><path d="M-4.6-16L-5.2-28Q-3-30.5 0-30.5Q3-30.5 5.2-28L4.6-16Z"/>` +
  `<circle class="skin" cx=".3" cy="-34" r="3.5"/><path class="hair" d="M-3.4-34.6Q-3-38.2 .4-38Q3.6-38 3.6-34.8Q1-36.4-3.4-34.6Z"/><path class="plit" d="M3.4-29Q5.2-28 5.2-26L4.6-16H3.6Z"/></g>`

// Far walkers, under 20 px tall, leave out the rim light, which would be
// under a pixel wide there.
export const PEOPLE_DEFS =
  WALKER_DEFS +
  WALKER_DEFS.replace(/<g id="m-pg">.*?<\/g>/, '')
    .replace(/<path class="plit"[^>]*>/g, '')
    .replace(/id="(m-p.b)"/g, 'id="$1f"')

const PEOPLE_FILLS = ['pw', 'pk', 'pn', 'pr', 'pg', 'py']

// How big a person stands at a given depth: the stall rows are laid out
// for a horizon at y 390, and a person is 0.62 of a stall's height.
export const pscale = (y: number): number => 0.00176 * (y - 390)

// The standing figures as baked pieces, the same drawings as PEOPLE_DEFS.
// 'body' stands for the figure's own colour.
const GROUND: [string, string][] = [
  ['psh', 'M-6 0L-68 7L-66 10L6 1Z'],
  ['pcs', ell(0, 0.4, 8.5, 2)],
]
const FIGURES: [string, string][][] = [
  [
    ['body', 'M-6.5 0L-5.5-20Q-6-27-3.6-30Q-4.4-37 0-42Q4.4-37 3.6-30Q6-27 5.5-20L6.5 0Z'],
    ['skin', ell(0.9, -33.5, 2, 2.6)],
    ['plit', 'M3.8-30Q6.2-26.5 5.5-20L6.5 0L5.2 0L4.4-20Q4.8-26 3-30Z'],
  ],
  [
    ['body', 'M-7 0L-5-21Q-5.6-28-3-30.5Q-4.8-34-3.6-37Q0-40.5 3.6-37Q4.8-34 3-30.5Q5.6-28 5-21L7 0Z'],
    ['skin', ell(0.8, -34, 1.9, 2.5)],
    ['plit', 'M3.2-30.5Q5.8-27 5-21L7 0L5.6 0L4.2-21Q4.6-27 2.6-30.5Z'],
  ],
  [
    ['trs', 'M-3.6 0L-3.2-17H3.2L3.6 0H1.6L.1-12.5L-1.6 0Z'],
    ['body', 'M-4.6-16L-5.2-28Q-3-30.5 0-30.5Q3-30.5 5.2-28L4.6-16Z'],
    ['skin', ell(0.3, -34, 3.5, 3.5)],
    ['hair', 'M-3.4-34.6Q-3-38.2 .4-38Q3.6-38 3.6-34.8Q1-36.4-3.4-34.6Z'],
    ['plit', 'M3.4-29Q5.2-28 5.2-26L4.6-16H3.6Z'],
  ],
]
// The same figures for the far crowd, where a figure is under 20 px tall:
// straight-sided outlines, a square head, a flat contact patch and no rim
// light, which would be under a pixel wide there.
const FAR_GROUND: [string, string][] = [
  ['psh', 'M-6 0L-68 7L-66 10L6 1Z'],
  ['pcs', 'M-8 -1h16v3h-16Z'],
]
const FAR_FIGURES: [string, string][][] = [
  [
    ['body', 'M-6.5 0L-5.5-20L-5-27L-3.6-30L-4-36L0-42L4-36L3.6-30L5-27L5.5-20L6.5 0Z'],
    ['skin', 'M-1-36h4v5h-4Z'],
  ],
  [
    ['body', 'M-7 0L-5-21L-5-28L-3-30.5L-4.4-34L-3-38L0-40L3-38L4.4-34L3-30.5L5-28L5-21L7 0Z'],
    ['skin', 'M-1-36.5h4v5h-4Z'],
  ],
  [
    ['trs', 'M-3.6 0L-3.2-17H3.2L3.6 0H1.6L0-12.5L-1.6 0Z'],
    ['body', 'M-4.6-16L-5.2-28L-3-30H3L5.2-28L4.6-16Z'],
    ['skin', 'M-3-37.5h6.6v7h-6.6Z'],
    ['hair', 'M-3.4-34.6L-3-37.5H3.6V-34.8Z'],
  ],
]
const CROWD_ORDER = ['psh', 'pcs', 'trs', ...PEOPLE_FILLS, 'skin', 'hair', 'plit']

// A standing person: x, y, kind 0..2, colour, and a size factor.
export type Stand = [number, number, number, number, number?]

// A group of standing people, sized for their depth, drawn as one path per
// paint: shadows, then clothes by colour, then faces and the rim light.
export function people(list: readonly Stand[]): string {
  const sheet = new Sheet(5)
  for (const [x, y, kind, colour, k = 1] of [...list].sort((a, b) => a[1] - b[1])) {
    const fill = PEOPLE_FILLS[colour % PEOPLE_FILLS.length] as string
    const s = pscale(Math.round(y)) * k
    const far = s < 0.5
    const piece = [...(far ? FAR_GROUND : GROUND), ...((far ? FAR_FIGURES : FIGURES)[kind % 3] as [string, string][])].map(([c, d]) => [c === 'body' ? fill : c, d] as const)
    sheet.put(piece, Math.round(x), Math.round(y), s)
  }
  return sheet.out(CROWD_ORDER)
}

// One person walking: legs still, the whole body riding a small even bounce
// while it carries along and back. The shadow stays on the ground. The walk
// is measured in the figure's own units, so a near walker covers more of the
// picture at the same pace. Six gaits, each with its own stride length,
// bounce rhythm and starting point, so no two neighbours move together.
export function walker(x: number, y: number, kind: number, colour: number, seed: number): string {
  const id = ['m-pab', 'm-pbb', 'm-pcb'][kind % 3] + (pscale(y) < 0.5 ? 'f' : '')
  return (
    `<g transform="translate(${Math.round(x)} ${Math.round(y)}) scale(${pscale(y).toFixed(2)})"><g class="walk w${seed % 6}"><use href="#m-pg"/>` +
    `<g class="hop"><use href="#${id}" class="${PEOPLE_FILLS[colour % PEOPLE_FILLS.length]}"/></g></g></g>`
  )
}

// The six gaits: distance in figure units (40 is a person's height), the
// time to walk it, a start offset, then the bounce period and offset.
const GAITS: [number, number, number, number, number][] = [
  [220, 15, 3, 0.64, 0.1],
  [-260, 17, 9, 0.58, 0.31],
  [300, 19, 5, 0.7, 0.47],
  [-200, 14, 12, 0.61, 0.22],
  [240, 16, 1, 0.67, 0.4],
  [-280, 18, 7, 0.6, 0.05],
]
export const GAIT_CSS = GAITS.map(
  ([dx, d, o, b, bo], i) => `.w${i}{--dx:${dx}px;animation-duration:${d}s;animation-delay:-${o}s}.w${i} .hop{animation-duration:${b}s;animation-delay:-${bo}s}`,
).join('')

// ------------------------------------------------- stalls, carts, carriage

// A fresh orange juice cart: wheels, the painted body, the orange pyramid,
// a canopy on poles, the vendor behind.
const CART: [string, string][] = [
  ['dsh', 'M0 0H36L-30 7H-62Z'],
  ['pk', 'M14-24L13.4-36Q14-40 18-40.5Q22-40 22.6-36L22-24Z'],
  ['skin', ell(18, -44, 3.4, 3.4)],
  ['postf', box(0.4, -55, 1.2, 31) + box(34.4, -55, 1.2, 31)],
  ['awn', 'M-3-55H39V-50Q36-47.5 33-50Q30-47.5 27-50Q24-47.5 21-50Q18-47.5 15-50Q12-47.5 9-50Q6-47.5 3-50Q0-47.5-3-50Z'],
  ['crt', box(0, -24, 36, 19)],
  ['crth', box(0, -24, 36, 2.5)],
  ['cvn', box(13, -18, 10, 6)],
  ['orgh', [4, 9, 13.6, 18.2, 22.8, 27.4, 32].map(x => box(x - 0.4, -28, 1.8, 1)).join('') + [11.3, 15.9, 20.5, 25.1, 29.7].map(x => box(x - 0.4, -31.5, 1.8, 1)).join('')],
  ['whl', ell(7, -3.5, 3.5, 3.5) + ell(29, -3.5, 3.5, 3.5)],
]

// A row of stalls at one depth, scaled by s, each standing at its x on y:
// the shadows, then one patterned rectangle for each run of neighbours.
export function stalls(xs: readonly number[], y: number, s: number): string {
  const shadows = new Sheet(5)
  for (const x of xs) shadows.add('dsh', 'M0 0H60L-14 9H-74Z', x, y, s)
  const runs: number[][] = []
  xs.forEach((x, i) => {
    if (i && x - (xs[i - 1] as number) < 62 * s) runs[runs.length - 1]!.push(x)
    else runs.push([x])
  })
  return (
    shadows.out() +
    runs
      .map(r => `<rect transform="translate(${r[0]} ${y}) scale(${s})" y="-45" width="${n(r.length * PITCH - 0.7)}" height="45" fill="url(#m-stp)"/>`)
      .join('')
  )
}

// Carts standing at the given points, all at scale s.
export function carts(at: readonly Pt[], s: number): string {
  const u = 5
  const sheet = new Sheet(u)
  for (const [x, y] of at) sheet.put(CART, x, y, s)
  const body = sheet.out()
  // the orange pyramid is the same on every cart: one shape, used on each
  // inside the sheet's scaled group, drawn before the highlights
  const cut = body.indexOf('<path class="orgh"')
  const piles = at.map(([x, y]) => `<use href="#m-org" class="org" transform="translate(${x * u} ${y * u}) scale(${n(s * u)})"/>`).join('')
  return body.slice(0, cut) + piles + body.slice(cut)
}

export const ORANGES = `<path id="m-org" d="${[7, 6, 5, 4].map((k, r) => Array.from({ length: k }, (_, i) => ell(18 - (k - 1) * 2.3 + i * 4.6, -26.5 - r * 3.6, 2.3, 2.3)).join('')).join('')}"/>`

// A food stall 60 wide and 42 tall, standing on the origin's left corner:
// the canvas roof seen just from above, its valance with the stall number,
// the dark interior with diners on the bench, the lit counter, a grill.
// Stalls stand in runs side by side, so the stall is a pattern tile one
// stall's pitch wide and a run is one rectangle filled with it; only the
// shadows on the ground are drawn per stall.
const PITCH = 61.3
export const STALL_DEFS =
  `<pattern id="m-stp" width="${PITCH}" height="45" patternUnits="userSpaceOnUse">` +
  `<path class="cvt" d="M0 5H${PITCH}L58 0H3Z"/>` +
  `<path class="sin" d="M1 10h58v22H1Z"/>` +
  `<path class="seat" d="${[6, 14, 22, 38, 46, 53].map((x, i) => `M${x - 2} ${n(25.4 + (i % 3) * 0.3)}h4v4h-4Z`).join('')}"/>` +
  `<path class="cnt" d="M0 32h60v13H0Z"/><path class="cnth" d="M0 32h60v2H0Z"/>` +
  `<path class="food" d="M5 30h7v2h-7zM15 29.5h6v2.5h-6zM40 30h8v2h-8zM50 29.6h6v2.4h-6z"/>` +
  `<path class="cv" d="M0 4h${PITCH}v6.5H0Z"/><path class="cvn" d="M26 5h8v4.5h-8Z"/>` +
  `<path class="postf" d="M0 10h.6v35H0ZM59.4 10h1.2v35h-1.2Z"/><path class="grill" d="M27 28h9v4h-9Z"/></pattern>` +
  // a green calèche drawn by a grey horse, heading right
  `<g id="m-cal"><path class="dsh" d="M2 0H46L10 5H-36Z"/>` +
  `<path class="hor" d="M30-14Q33-17 38-16Q41-20 43-24L46-23.5L45-20Q43-16 42-13Q41-9 36-9.5H31Q28-10 28-12.5Z"/>` +
  `<path class="horl" d="M31-10L30.5 0M33.5-10L35 0M39-10L39.5 0M41-11L43 0M28.5-12.5Q26-11 26.5-6"/>` +
  `<path class="shaft" d="M20-11L33-12.5"/>` +
  `<path class="calh" d="M5-16Q6-26 14-25.5Q16-21 15.5-16Z"/><rect class="calb" x="4" y="-17" width="18" height="7" rx="1"/>` +
  `<circle class="whl2" cx="10" cy="-6" r="6"/><circle class="whl2" cx="23" cy="-4.5" r="4.5"/><path class="spk" d="M10-12V0M4-6H16M23-9V0M18.5-4.5H27.5"/>` +
  `<path class="pk" d="M18-17L18.2-23Q19.5-25 21-23L21.5-17Z"/><circle class="skin" cx="19.8" cy="-25.6" r="1.8"/></g>`

// -------------------------------------------------------------- birds

// A swift from below, flying along +x: scythe wings swept back, forked tail.
export const SWIFT = `<path id="m-sw" d="M5 0Q3-1.4 .5-1.6L-4-9.5Q-2.4-3.6-2.6-1.2L-6.5-2.4L-5-.3L-6.5 2.4L-2.6 1.2Q-2.4 3.6-4 9.5L.5 1.6Q3 1.4 5 0Z"/>`

// ---------------------------------------------------------- the lamp post

// Path data written as "x,y" pairs about a local origin, moved to (x, y).
const shift = (x: number, y: number) => (d: string): string =>
  d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_, a, b) => `${n(x + Number(a))} ${n(y + Number(b))}`)

// A street lamp of the medina rising from the street below the terrace: a
// slim black iron post with two collars and a pair of scrolls under the head,
// a lantern of four panes flaring to the top, a pointed cap and a finial. The
// lantern's foot is at (x, y); the post runs down to foot. By day the glass
// is pale and the iron takes the sun on its right; at night the lamp burns
// steady and warms the wall around it.
export function lampPost(x: number, y: number, foot: number): string {
  const P = shift(x, y)
  const H = foot - y
  const glass = P('M-6.5,0L-10.5,-30L10.5,-30L6.5,0Z')
  return (
    `<g>` +
    `<g class="nt"><circle cx="${x}" cy="${y - 16}" r="190" fill="url(#m-lglow)"/></g>` +
    `<path class="lpi" d="${P(`M-2.4,8L-3.4,${H}L3.4,${H}L2.4,8Z`)}${P('M-4.6,44h9.2v4.5h-9.2ZM-5,47.5h10l-1.6 3h-6.8Z')}${P(`M-5.6,${H - 70}h11.2v6h-11.2Z`)}` +
    `${P('M-3,9C-3,5 -8,4 -8.5,0L8.5,0C8,4 3,5 3,9Z')}${P('M-9,1.5h18v-3h-18Z')}` +
    `${P('M-13.5,-30h27v-3.5h-27Z')}${P('M-12.5,-33.5C-9,-38 -4,-44 0,-53C4,-44 9,-38 12.5,-33.5Z')}${P('M-1.2,-55h2.4l-.4-8h-1.6Z')}"/>` +
    `<circle class="lpi" cx="${x}" cy="${y - 55}" r="2.6"/>` +
    `<path class="lps" d="${P('M-3,12C-9,12 -12.5,8 -10.5,4.5C-9.2,2.6 -6.8,3.6 -7.6,5.4M3,12C9,12 12.5,8 10.5,4.5C9.2,2.6 6.8,3.6 7.6,5.4')}"/>` +
    `<path class="lgl" d="${glass}"/><path class="nt lgn" d="${glass}"/>` +
    `<path class="lpm" d="${P('M-2.2,0L-3.4,-30M2.2,0L3.4,-30M-6.5,0L-10.5,-30M6.5,0L10.5,-30')}"/>` +
    `<path class="lph" d="${P(`M2.6,10L3.1,${H}M8.6,0.5C8.2,3.5 4.4,5 3.4,8.6M12.2,-34C9,-38.5 4.6,-43 1.2,-50.5M6.2,-1L9.6,-28`)}"/>` +
    `</g>`
  )
}

// ---------------------------------------------------------- macaques

// Barbary macaques sitting, about 40 tall, the seat at the origin: thick fur
// with darker limbs and a paler belly, a bare pink face, no tail. One faces
// us; one sits side on, facing left. The head is its own piece so it can
// turn about the neck.
type Piece = readonly (readonly [string, string])[]
const MQ_FRONT: Piece = [
  ['mq1', 'M-12 0C-16-7-15-19-9-25C-6-27.5 6-27.5 9-25C15-19 16-7 12 0Z'],
  ['mq3', ell(0, -12, 5.6, 8.5)],
  ['mq2', ell(-7, -4, 6, 4.6) + ell(7, -4, 6, 4.6) + 'M-9-23C-12.5-15-11.5-8-8.5-3L-5-3C-7-9-7-15-5.6-21ZM9-23C12.5-15 11.5-8 8.5-3L5-3C7-9 7-15 5.6-21Z'],
  ['mqs', ell(-6.6, -2.4, 2.4, 1.5) + ell(6.6, -2.4, 2.4, 1.5)],
  ['mqr', 'M12 0C15.4-7 14.6-18 9-25C12.6-17.6 13.2-8 10.4 0Z'],
]
const MQ_FRONT_HEAD: Piece = [
  ['mq1', 'M-8.8-31.5C-10.6-33-10.4-36-8-37C-6.6-40 -3.4-41.2 0-41.2C3.4-41.2 6.6-40 8-37C10.4-36 10.6-33 8.8-31.5C9-27 5.6-24.4 0-24.4C-5.6-24.4-9-27-8.8-31.5Z'],
  ['mqf', 'M-5.2-33.6C-5.8-29.4-3-25.8 0-25.8C3-25.8 5.8-29.4 5.2-33.6C3.6-35.4 1.2-34.8 0-33.6C-1.2-34.8-3.6-35.4-5.2-33.6Z'],
  ['mqe', ell(-2.3, -31.8, 1, 0.9) + ell(2.3, -31.8, 1, 0.9) + 'M-1.2-28.6h2.4v.8h-2.4Z'],
  ['mqr', 'M8.8-31.5C10.6-33 10.4-36 8-37C6.6-40 3.4-41.2 1-41.2C4.6-40 6.8-38.4 7.2-36.4C8.8-35.6 9.2-33.2 7.6-31.5Z'],
]
const MQ_SIDE: Piece = [
  ['mq1', 'M11 0C15.5-6 14.5-18 8.5-25C4.5-29.5-3-29.5-6.5-25.5C-9.5-20.5-9.5-9-7.5 0Z'],
  ['mq3', 'M-6.5-23C-8.5-17-8.6-9-7-3H-3C-4.6-10-4.4-17-3-22Z'],
  ['mq2', 'M-6.5 0C-8.4-5-6.4-11.6 .4-11.6C5.6-11.6 8.6-6 7.6 0ZM-3.6-24C-8-18.4-9.4-9.6-9.4-1.6H-6C-6.2-9-4.4-16-1-21.6Z'],
  ['mqs', ell(-8.6, -1.2, 2.6, 1.3)],
  ['mqr', 'M11 0C15.5-6 14.5-18 8.5-25C12.6-17 12.8-8 9.6 0Z'],
]
const MQ_SIDE_HEAD: Piece = [
  ['mq1', 'M-2.6-31C-2.4-36.4-6.2-39.4-9.8-38.8C-13.4-38.2-15.4-34.6-15-31.2C-14.6-27.6-11.4-25-7.8-25.6C-4.4-26.2-2.8-28.4-2.6-31Z'],
  ['mqf', 'M-11.6-34.4C-14.4-34.4-17-31.8-17-29.6C-17-27.4-14.8-26.4-12.8-27C-11-27.6-10-30.4-11.6-34.4Z'],
  ['mqe', ell(-12.6, -32.2, 0.9, 0.85) + 'M-16.2-29.4h1v.8h-1Z'],
  ['mqr', 'M-2.6-31C-2.4-36.4-6.2-39.4-9.4-38.9C-5.6-37.6-3.8-34.6-4-31Z'],
]
const MQ_ORDER = ['mq1', 'mq3', 'mq2', 'mqs', 'mqf', 'mqe', 'mqr']

// Macaques: x, y (the seat), scale, front or side, and whether its head
// turns (the class of its head motion, or none).
export function macaques(list: readonly [number, number, number, boolean, string?][]): string {
  const bodies = new Sheet()
  const heads: string[] = []
  for (const [x, y, s, front, turn] of list) {
    bodies.put(front ? MQ_FRONT : MQ_SIDE, x, y, s)
    const head = front ? MQ_FRONT_HEAD : MQ_SIDE_HEAD
    if (!turn) bodies.put(head, x, y, s)
    else {
      const h = new Sheet()
      h.put(head, 0, 0, 1)
      const neck = front ? '0px -25px' : '-5px -27px'
      heads.push(`<g transform="translate(${x} ${y}) scale(${s})"><g class="${turn}" style="transform-origin:${neck}">${h.out(MQ_ORDER)}</g></g>`)
    }
  }
  return bodies.out(MQ_ORDER) + heads.join('')
}

// ---------------------------------------------- the window with the tea

// A Moroccan teapot of polished nickel silver at (x, y), body bulbous over a
// short foot, a tiered lid with a bud finial, a long curved spout to the
// left, a C handle to the right. 99 tall; it is drawn small, scaled in a
// group, so its parts share the chrome gradient as one path.
function teapot(x: number, y: number): string {
  const P = shift(x, y)
  const metal =
    P('M12,-62C30,-66 40,-52 34,-36C31,-28 26,-22 20,-18L18,-21C24,-26 28,-31 30,-38C34,-50 28,-60 13,-58Z') +
    P('M-22,-20C-34,-26 -40,-44 -46,-60C-49,-68 -54,-72 -60,-76L-60,-72C-55,-68 -52,-64 -50,-58C-45,-42 -40,-24 -24,-14Z') +
    P('M-14,0L-12,-5L12,-5L14,0Z') +
    P('M-16,-4C-30,-14 -30,-40 -18,-56C-14,-60 -12,-62 -11,-66L11,-66C12,-62 14,-60 18,-56C30,-40 30,-14 16,-4Z') +
    P('M-11,-66C-12,-72 -8,-76 -6,-78C-9,-80 -6,-86 0,-88C6,-86 9,-80 6,-78C8,-76 12,-72 11,-66Z') +
    P('M-2.5,-88C-4,-92 -1.5,-96 0,-99C1.5,-96 4,-92 2.5,-88Z')
  return (
    `<path d="${metal}" fill="url(#m-chrome)"/>` +
    `<path d="${P('M-16,-4C-30,-14 -30,-40 -18,-56C-14,-60 -12,-62 -11,-66L11,-66C12,-62 14,-60 18,-56C30,-40 30,-14 16,-4Z')}" fill="url(#m-chromev)"/>` +
    `<path class="eng" d="${P('M-24,-34C-12,-31 12,-31 24,-34M-17,-56C-6,-54 6,-54 17,-56M-11,-67C-4,-65 4,-65 11,-67')}"/>` +
    `<path class="spec" d="${P('M17,-50C22,-42 22,-26 15,-14')}"/>`
  )
}

// Tea glasses, each at (x, y), 34 tall: amber tea, a gilt band, froth. Each
// part is one path for all of them; only the glass itself, whose sheen runs
// across each glass, is drawn per glass.
function glasses(list: readonly [number, number][]): string {
  const part = (f: (x: number, y: number) => string) => list.map(([x, y]) => f(x, y)).join('')
  return (
    `<path fill="url(#m-tea)" d="${part((x, y) => `M${x - 7.6} ${y - 28}L${x - 6} ${y}H${x + 6}L${x + 7.6} ${y - 28}Z`)}"/>` +
    `<path class="froth" d="${part((x, y) => `M${n(x - 7.7)} ${y - 29}h15.4v2.4h-15.4Z`)}"/>` +
    `<path class="gilt0" d="${part((x, y) => `M${x - 7.2} ${y - 22}L${x - 6.6} ${y - 13}H${x + 6.6}L${x + 7.2} ${y - 22}Z`)}"/>` +
    part((x, y) => `<path d="M${x - 8} ${y - 34}L${x - 6} ${y}H${x + 6}L${x + 8} ${y - 34}Z" fill="url(#m-glass)"/>`) +
    `<path class="glr" d="${part((x, y) => `M${x - 8} ${y - 34}H${x + 8}M${x + 5.6} ${y - 31}L${x + 4.4} ${y - 3}`)}"/>`
  )
}

// Rising steam: k wisps, d seconds each, from (x, y).
const steam = (x: number, y: number, k: number, d: number): string =>
  Array.from({ length: k }, (_, i) => {
    const dx = (i % 2 ? 1 : -1) * (3 + i)
    return `<g class="steam" style="animation-duration:${n(d + i * 0.9)}s;animation-delay:-${n(i * (d / k))}s"><path d="M${x} ${y}c${dx} -10 ${-dx} -18 ${dx * 0.6} -30c${-dx} -9 ${dx * 0.5} -16 0 -24" class="stm"/><path d="M${x} ${y}c${dx} -10 ${-dx} -18 ${dx * 0.6} -30" class="stm stm2"/></g>`
  }).join('')

// A window in the wall across the roof, its carved cedar frame under a green
// tiled hood, the lattice shutters swung open, and on the sill two glasses
// of tea and a small teapot. The opening is xl..xr wide, its sill at ys.
// By day the room behind is dark; at night it is lit and the tea shows
// against it.
export function teaWindow(xl: number, xr: number, top: number, ys: number): string {
  const w = xr - xl
  const spring = top + w * 0.36
  const open = `M${xl} ${ys}V${n(spring)}A${n(w / 2)} ${n(w * 0.36)} 0 0 1 ${xr} ${n(spring)}V${ys}Z`
  // the shutters, open toward us: the outer edge nearer, so a little taller
  const sw = 15
  const lsh = `M${xl - 2} ${ys - 1}L${xl - 2 - sw} ${ys + 3}V${n(spring + 1)}Q${xl - 2 - sw * 0.7} ${n(top - 1)} ${xl - 2} ${n(top + 6)}Z`
  const rsh = `M${xr + 2} ${ys - 1}L${xr + 2 + sw} ${ys + 3}V${n(spring + 1)}Q${xr + 2 + sw * 0.7} ${n(top - 1)} ${xr + 2} ${n(top + 6)}Z`
  const glassAt: [number, number][] = [
    [xl + w * 0.62, ys],
    [xl + w * 0.83, ys + 1],
  ]
  const gs = 0.36
  const gl = glassAt.map(([x, y]) => [n(x / gs), n(y / gs)].map(Number) as [number, number])
  return (
    `<g>` +
    `<g class="nt"><ellipse cx="${n((xl + xr) / 2)}" cy="${n(ys - 30)}" rx="110" ry="90" fill="url(#m-tglow)"/></g>` +
    // its shadow on the wall below the sill, by day
    `<path class="shd2" d="M${xl - 8} ${ys + 9}h${w + 16}l-26 9h-${w - 6}Z"/>` +
    // frame, hood and the opening
    `<path class="ced" d="M${xl - 6} ${ys + 1}V${n(spring)}A${n(w / 2 + 6)} ${n(w * 0.36 + 6)} 0 0 1 ${xr + 6} ${n(spring)}V${ys + 1}Z"/>` +
    `<path class="cedh" d="M${xr + 6} ${n(spring)}V${ys}M${xl - 3} ${ys}V${n(spring)}A${n(w / 2 + 3)} ${n(w * 0.36 + 3)} 0 0 1 ${xr + 3} ${n(spring)}V${ys}"/>` +
    `<path class="gt" d="M${xl - 14} ${n(top - 2)}l10-12h${w + 8}l8 12Z"/><path class="gth2" d="M${xl - 6} ${n(top - 11)}h${w + 10}"/>` +
    `<path class="win" d="${open}"/><path class="nt nroom" d="${open}"/>` +
    `<path class="shd2" d="M${xl} ${n(spring)}A${n(w / 2)} ${n(w * 0.36)} 0 0 1 ${xr} ${n(spring)}V${n(spring + 8)}H${xl}Z"/>` +
    // the shutters, cedar with a lattice and a frame
    `<path class="ced2" d="${lsh}${rsh}"/><path fill="url(#m-lat)" d="${lsh}${rsh}"/>` +
    `<path class="shut" d="${lsh}${rsh}"/><path class="cedh" d="M${xl - 2 - sw} ${ys + 3}V${n(spring + 1)}M${xr + 2} ${ys - 1}V${n(top + 6)}"/>` +
    // the sill: its lit top, its tiled front
    `<path class="wtop" d="M${xl - 6} ${ys}h${w + 12}l3 4h-${w + 18}Z"/><path class="gt" d="M${xl - 9} ${ys + 4}h${w + 18}v4h-${w + 18}Z"/>` +
    // the tea: the pot on the left, two glasses, the steam from the glasses
    `<path class="glsh" d="M${n(xl + w * 0.18)} ${ys + 0.6}h${n(w * 0.75)}l-4 2.6h-${n(w * 0.75)}Z"/>` +
    `<g transform="translate(${n(xl + w * 0.3)} ${ys}) scale(.22)">${teapot(0, 0)}</g>` +
    `<g transform="scale(${gs})">${glasses(gl)}</g>` +
    `<g class="stmg">${glassAt.map(([x, y], i) => `<g transform="translate(${n(x)} ${n(y - 34 * gs)}) scale(.5)">${steam(0, 0, 2, 8 + i)}</g>`).join('')}</g>` +
    `</g>`
  )
}
