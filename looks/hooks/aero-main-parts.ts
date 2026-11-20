// Parts for the Aero wallpaper scene. Every soft thing is a plain shape
// filled with a shared gradient that fades to transparent, so the scene gets
// its gloss from a few gradients instead of blur, masks or many elements.
import { n, seeded } from './kit'
import type { Pt } from './kit'

// A gradient stop whose color is the CSS variable --c, so one gradient
// serves day and night.
export const stop = (o: number, c: string, a: number | string = 1): string => `<stop offset="${o}" style="stop-color:var(--${c});stop-opacity:${a}"/>`

// ---- Curves ----
export type C4 = readonly [Pt, Pt, Pt, Pt]

export function bez(p: C4, t: number): Pt {
  const u = 1 - t
  const [a, b, c, d] = p

  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ]
}

// A crest as a chain of cubic curves, with its height at any x.
export type Crest = { start: Pt; segs: readonly (readonly [number, number, number, number, number, number])[] }

export const crestPath = (h: Crest): string => `M${h.start[0]} ${h.start[1]}` + h.segs.map(s => `C${s.join(' ')}`).join('')

export const groundPath = (h: Crest): string => {
  const last = h.segs[h.segs.length - 1]!

  return `${crestPath(h)}L${last[4]} 1010L${h.start[0]} 1010Z`
}

export function crestY(h: Crest): (x: number) => number {
  const pts: Pt[] = []
  let p0 = h.start
  for (const s of h.segs) {
    const c: C4 = [p0, [s[0], s[1]], [s[2], s[3]], [s[4], s[5]]]
    for (let i = 0; i <= 40; i++) pts.push(bez(c, i / 40))
    p0 = [s[4], s[5]]
  }

  return x => pts.reduce((best, p) => (Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best))[1]
}

// ---- Clouds ----
// A cumulus from soft blobs: a lower row of puffs, a cool shaded base laid
// over it, then a domed upper row of bright puffs that covers the shade
// where the cloud catches the sun.
export function cloud(cx: number, cy: number, w: number, h: number, seed: number): string {
  const r = seeded(seed)
  const out: string[] = []
  const blob = (x: number, y: number, rx: number, ry: number, g: string): void => {
    out.push(`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#${g})"/>`)
  }
  const low = Math.max(4, Math.round(w / 90))
  const gap = (w * 0.86) / low
  for (let i = 0; i < low; i++) {
    const t = (i + 0.5) / low
    const ry = h * (0.4 + r() * 0.12)
    blob(cx + (t - 0.5) * w * 0.86, cy + h * 0.2, Math.max(ry * 1.5, gap * 0.95), ry, 'puff')
  }
  const shade = Math.max(3, Math.round(low * 0.7))
  for (let i = 0; i < shade; i++) {
    const t = (i + 0.5) / shade
    blob(cx + (t - 0.5) * w * 0.78 + (r() - 0.5) * 20, cy + h * 0.36, (w / shade) * 0.9, h * 0.22, 'puffLo')
  }
  // The domed upper row, then a crown on taller clouds: smaller puffs
  // toward the edges and big ones in the middle make the cauliflower top.
  const rows = h / w > 0.25 ? 2 : 1
  for (let row = 0; row < rows; row++) {
    const top = Math.max(3, Math.round((w * (row ? 0.5 : 1)) / (rows > 1 ? 80 : 120)))
    const span = w * (row ? 0.4 : 0.74)
    for (let i = 0; i < top; i++) {
      const t = (i + 0.5) / top
      const dome = Math.sin(Math.PI * (0.1 + t * 0.8))
      const ry = h * (row ? 0.26 : 0.24 + 0.26 * dome) * (0.7 + r() * 0.6)
      const y = cy - h * (row ? 0.5 : 0.3 * dome) + h * 0.06 + (r() - 0.5) * h * 0.12
      blob(cx + (t - 0.5) * span + (r() - 0.5) * 30 + (row ? w * 0.04 : 0), y, ry * (1.1 + r() * 0.35), ry, 'puff')
    }
  }

  return out.join('')
}

// ---- Light ribbons ----
// A band along a cubic curve, thickest in its middle, and the line of its
// upper edge for the bright rim.
function edge(p: C4, th: number, f: number): string[] {
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    const [x, y] = bez(p, t)
    const [x1, y1] = bez(p, Math.max(0, t - 0.003))
    const [x2, y2] = bez(p, Math.min(1, t + 0.003))
    const len = Math.hypot(x2 - x1, y2 - y1)
    const o = th * Math.sin(Math.PI * t) * (f - 0.5)

    return `${n(x - ((y2 - y1) / len) * o)} ${n(y + ((x2 - x1) / len) * o)}`
  })
}

export function ribbon(p: C4, th: number, cls: string): string {
  return (
    `<g class="rib ${cls}">` +
    `<path d="M${edge(p, th, 0).join('L')}L${edge(p, th, 1).reverse().join('L')}Z" class="rib-body"/>` +
    `<path d="M${edge(p, th, 0.08).join('L')}" class="rib-edge"/>` +
    `</g>`
  )
}

// ---- Sparkles ----
// A four-point star, wider than tall, as one subpath.
export function star4(x: number, y: number, r: number): string {
  const w = r * 1.4
  const c = `${n(x)} ${n(y)}`

  return `M${n(x)} ${n(y - r)}Q${c} ${n(x + w)} ${n(y)}Q${c} ${n(x)} ${n(y + r)}Q${c} ${n(x - w)} ${n(y)}Q${c} ${n(x)} ${n(y - r)}Z`
}

// ---- Soap bubbles ----
// A bubble drawn round its own origin: a nearly clear body with a bright
// rim, a thin rainbow film, a crescent highlight, a hot spot and the lawn's
// green reflected low on the far side.
function crescent(r: number, a0: number, a1: number, inner: number): string {
  const p = (rad: number, a: number): string => `${n(rad * Math.cos(a))} ${n(rad * Math.sin(a))}`
  const d = (a: number): number => (a * Math.PI) / 180

  return `M${p(r, d(a0))}A${n(r)} ${n(r)} 0 0 1 ${p(r, d(a1))}A${n(r * inner)} ${n(r * inner)} 0 0 0 ${p(r, d(a0))}Z`
}

export function bubble(r: number): string {
  return (
    `<circle r="${n(r)}" fill="url(#bubB)"/>` +
    `<circle r="${n(r * 0.96)}" class="bub-film" stroke-width="${n(Math.max(1, r * 0.05))}"/>` +
    `<path d="${crescent(r * 0.84, 192, 282, 1.25)}" class="bub-hi"/>` +
    `<ellipse cx="${n(-r * 0.4)}" cy="${n(-r * 0.46)}" rx="${n(r * 0.12)}" ry="${n(r * 0.07)}" transform="rotate(-42 ${n(-r * 0.4)} ${n(-r * 0.46)})" class="bub-hot"/>` +
    `<path d="${crescent(r * 0.86, 18, 92, 1.4)}" class="bub-refl"/>`
  )
}

// ---- Grass ----
// Fine blades rooted below the frame's bottom edge, sorted into tones, each
// tone one path. `height(x)` sets how tall the fringe stands at x.
export function blades(seed: number, count: number, x0: number, x1: number, height: (x: number) => number, tones: number): string[] {
  const r = seeded(seed)
  const paths: string[][] = Array.from({ length: tones }, () => [])
  for (let i = 0; i < count; i++) {
    const x = x0 + ((i + r()) / count) * (x1 - x0)
    const h = height(x) * (0.7 + r() * 0.5)
    const lean = (r() - 0.5) * h * 0.45
    const w = 2.4 + r() * 2.2
    const tip: Pt = [x + lean, 1004 - h]
    const mid: Pt = [x + lean * 0.3, 1004 - h * 0.55]
    paths[Math.floor(r() * tones)]!.push(
      `M${n(x - w / 2)} 1004Q${n(mid[0] - w * 0.3)} ${n(mid[1])} ${n(tip[0])} ${n(tip[1])}Q${n(mid[0] + w * 0.3)} ${n(mid[1])} ${n(x + w / 2)} 1004Z`,
    )
  }

  return paths.map(p => p.join(''))
}

// ---- Small life ----
// A butterfly round its own origin; each side flaps about the body line.
export function butterfly(): string {
  const wing = 'M0 0C-6 -14 -20 -20 -24 -12C-27 -5 -15 0 0 1ZM0 1C-12 3 -18 10 -14 16C-10 20 -4 12 0 3Z'

  return (
    `<g class="wing"><path d="${wing}" class="bf-w"/></g>` +
    `<g transform="scale(-1 1)"><g class="wing"><path d="${wing}" class="bf-w"/></g></g>` +
    `<path d="M-1 -6 L1 -6 L1.2 12 L-1.2 12Z" class="bf-b"/>`
  )
}

// A dandelion seed: a short stalk and a fan of fine hairs, as one stroked path.
export function seedPuff(): string {
  const hairs = Array.from({ length: 7 }, (_, k) => {
    const a = (-150 + k * 20) * (Math.PI / 180)

    return `M0 0L${n(8 * Math.cos(a))} ${n(8 * Math.sin(a))}`
  }).join('')

  return `<path d="M0 0L0.6 11${hairs}" class="seed"/>`
}
