import { n, seeded, type Pt } from './kit'

// Sky pieces for Aero City: soft cumulus, the sunburst, a rainbow, white
// ribbons and airships. Every soft edge is a radial gradient fading to
// transparent, so nothing needs a blur.

const ell = (cls: string, x: number, y: number, rx: number, ry: number) =>
  `<ellipse class="${cls}" cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"/>`

// A cumulus `w` wide standing on a base at `y`: a dome of overlapping lit
// puffs, a few higher crown puffs, then cool shade blobs laid over the base.
export function cloud(x: number, y: number, w: number, tall: number, seed: number): string {
  const r = seeded(seed)
  const count = Math.round(7 + w / 50)
  let s = ''
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const dome = Math.sin(Math.PI * t)
    const rad = w * (0.07 + 0.075 * dome + r() * 0.03)
    s += ell('ck', x + (t - 0.5) * w * 0.86 + (r() - 0.5) * w * 0.05, y - dome * tall * (0.45 + r() * 0.3) - rad * 0.15, rad * 1.2, rad)
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.28 + 0.44 * r()
    const rad = w * (0.09 + r() * 0.04)
    s += ell('ck', x + (t - 0.5) * w * 0.8, y - tall * (0.8 + r() * 0.25), rad * 1.1, rad)
  }
  for (let i = 0; i < 3; i++) s += ell('cs', x + (i - 1) * w * 0.25, y - tall * 0.16, w * 0.19, tall * 0.34)

  return s
}

// Rays from the sun as thin wedges in one path, faded by a radial gradient.
export function rays(c: Pt, count: number, seed: number): string {
  const r = seeded(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.12
    const half = 0.025 + r() * 0.035
    const len = 760 + r() * 360
    d += `M${c[0]} ${c[1]}L${n(c[0] + Math.cos(a - half) * len)} ${n(c[1] + Math.sin(a - half) * len)}L${n(c[0] + Math.cos(a + half) * len)} ${n(c[1] + Math.sin(a + half) * len)}Z`
  }

  return d
}

// A ribbon that swells from nothing to `width` and back along a cubic curve.
export function ribbon(p0: Pt, c1: Pt, c2: Pt, p1: Pt, width: number): string {
  const at = (t: number): Pt => {
    const u = 1 - t
    return [
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ]
  }
  const top: string[] = []
  const bot: string[] = []
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const [x, y] = at(t)
    const [ax, ay] = at(Math.max(0, t - 0.01))
    const [bx, by] = at(Math.min(1, t + 0.01))
    const len = Math.hypot(bx - ax, by - ay) || 1
    const h = (Math.sin(Math.PI * t) * width) / 2
    top.push(`${n(x - ((by - ay) / len) * h)} ${n(y + ((bx - ax) / len) * h)}`)
    bot.push(`${n(x + ((by - ay) / len) * h)} ${n(y - ((bx - ax) / len) * h)}`)
  }

  return `M${top.join('L')}L${bot.reverse().join('L')}Z`
}

// A rainbow: one thick stroked arc whose radial gradient lays the bands.
export function rainbow(cx: number, cy: number, r: number, width: number): { def: string; art: string } {
  const r0 = r - width / 2
  const r1 = r + width / 2
  const at = (radius: number) => Math.round((radius / r1) * 1000) / 1000
  const bands = ['#b48cff', '#6fa8ff', '#6fe0c0', '#fff27a', '#ffb860', '#ff7a8a']
  let stops = `<stop offset="${at(r0)}" stop-color="${bands[0]}" stop-opacity="0"/>`
  bands.forEach((c, i) => {
    stops += `<stop offset="${at(r0 + ((i + 0.5) / bands.length) * width)}" stop-color="${c}"/>`
  })
  stops += `<stop offset="1" stop-color="${bands[bands.length - 1]}" stop-opacity="0"/>`

  return {
    def: `<radialGradient id="rbw" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r1}">${stops}</radialGradient>`,
    art: `<path class="rbw" d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" stroke-width="${width}"/>`,
  }
}

// A glossy airship facing right, about 150 wide at scale 1.
export function airship(x: number, y: number, s: number, cls: string): string {
  return (
    `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${s})">` +
    `<path class="af" d="M-56 -5L-82 -24L-74 -3ZM-56 5L-82 24L-74 3Z"/>` +
    `<ellipse rx="72" ry="20" class="ah"/>` +
    `<ellipse cx="-6" cy="-9" rx="46" ry="5" class="ahl"/>` +
    `<path class="ast" d="M-66 4C-24 8 30 8 70 3"/>` +
    `<path class="ag" d="M-17 18H17Q15 26 11 26H-11Q-15 26 -17 18Z"/>` +
    `<path class="nt agw" d="M-11 22H11"/>` +
    `</g></g>`
  )
}
