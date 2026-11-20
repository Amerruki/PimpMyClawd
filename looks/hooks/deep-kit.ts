// Shared pieces for the deep-space scenes (nebula, spiral galaxy, deep
// field): cheap star dots, diffraction-spiked stars, soft gas, rim-lit dust
// pillars and a sun glare for the bright versions. Filter-free like the rest
// of the kit: glows are gradients or CSS blur.
import { closedCurve, n, seeded, type Pt } from './kit'

// A gradient stop whose colour is a CSS variable, so day and night can
// recolour the same scene.
export const stop = (o: number, v: string, op: number | string = 1): string =>
  `<stop offset="${o}" style="stop-color:var(${v});stop-opacity:${op}"/>`

// A soft round puff of one colour, fading to nothing at the edge.
export const puff = (id: string, v: string, core = 1): string =>
  `<radialGradient id="${id}">${stop(0, v, core)}${stop(0.35, v, n(core * 0.62))}${stop(0.7, v, n(core * 0.18))}${stop(1, v, 0)}</radialGradient>`

// A puff lit from one side: its hot spot sits toward (fx, fy) and the far
// side falls off into the base colour, so a heap of them reads as billowing
// gas lit by a star.
export const litPuff = (id: string, hi: string, base: string, fx = 0.66, fy = 0.34): string =>
  `<radialGradient id="${id}" fx="${fx}" fy="${fy}">${stop(0, hi, 0.95)}${stop(0.3, base, 0.8)}${stop(0.62, base, 0.38)}${stop(1, base, 0)}</radialGradient>`

// A billowing cloud edge: puffs heaped along a line, big at the start and
// smaller toward the end, a second row behind for depth.
export function billows(seed: number, line: readonly Pt[], r0: number, r1: number, count: number, fills: readonly string[]): Puff[] {
  const rand = seeded(seed)
  const out: Puff[] = []

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const f = t * (line.length - 1)
    const k = Math.min(line.length - 2, Math.floor(f))
    const u = f - k
    const a = line[k] as Pt
    const b = line[k + 1] as Pt
    const r = (r0 + (r1 - r0) * t) * (0.65 + rand() * 0.6)
    const x = a[0] + (b[0] - a[0]) * u + (rand() - 0.5) * r * 0.8
    const y = a[1] + (b[1] - a[1]) * u + (rand() - 0.5) * r * 0.8

    out.push({ x, y, rx: r, ry: r * (0.75 + rand() * 0.3), f: fills[Math.floor(rand() * fills.length)] as string, o: 0.55 + rand() * 0.45 })
  }

  return out
}

// A wavy line between two points, for filaments drawn with taper().
export function wave(a: Pt, b: Pt, amp: number, waves: number, phase: number, steps = 14): Pt[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1

  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const o = Math.sin(t * Math.PI * waves + phase) * amp * Math.sin(t * Math.PI)

    return [a[0] + dx * t - (dy / len) * o, a[1] + dy * t + (dx / len) * o] as Pt
  })
}

// Many points as one path of zero-length round-capped segments: a star or a
// speck for about 11 characters. Stroke width sets the dot size.
export const dots = (pts: readonly Pt[]): string => pts.map(([x, y]) => `M${n(x)} ${n(y)}h0`).join('')

export type Box = { x: number; y: number; w: number; h: number }

// A starfield in size buckets, each bucket split into twinkle groups with
// their own phase so the field never pulses as one.
export function starDots(
  seed: number,
  count: number,
  box: Box,
  sizes: readonly number[],
  cls: string,
  twinkleGroups = 0,
  avoid?: (x: number, y: number) => number,
): string {
  const rand = seeded(seed)
  const buckets: Pt[][] = sizes.map(() => [])
  let made = 0
  let tries = 0

  while (made < count && tries < count * 6) {
    tries++
    const x = box.x + rand() * box.w
    const y = box.y + rand() * box.h

    if (avoid && rand() < avoid(x, y)) {
      continue
    }
    // Small stars far outnumber big ones.
    const b = Math.min(sizes.length - 1, Math.floor(Math.pow(rand(), 2.6) * sizes.length))
    ;(buckets[b] as Pt[]).push([x, y])
    made++
  }

  return buckets
    .map((pts, b) => {
      const w = sizes[b] as number

      if (twinkleGroups < 1 || b === 0) {
        return `<path class="${cls}" stroke-width="${w}" d="${dots(pts)}"/>`
      }
      const groups: Pt[][] = Array.from({ length: twinkleGroups }, () => [])
      pts.forEach((p, i) => (groups[i % twinkleGroups] as Pt[]).push(p))

      return groups
        .map(
          (g, k) =>
            `<g class="tw" style="animation-duration:${n(3.5 + k * 1.7 + b)}s;animation-delay:-${n(k * 1.3)}s"><path class="${cls}" stroke-width="${w}" d="${dots(g)}"/></g>`,
        )
        .join('')
    })
    .join('')
}

// A repeating tile of faint stars, for the far field at almost no cost.
export function starTile(id: string, seed: number, size: number, count: number, cls: string, widths: readonly number[] = [0.7, 1.1]): string {
  const rand = seeded(seed)
  const byW = widths.map(() => [] as Pt[])

  for (let i = 0; i < count; i++) {
    ;(byW[Math.floor(rand() * widths.length)] as Pt[]).push([rand() * size, rand() * size])
  }

  return (
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
    byW.map((p, i) => `<path class="${cls}" stroke-width="${widths[i]}" d="${dots(p)}"/>`).join('') +
    `</pattern>`
  )
}

// Definitions for spiked stars. JWST's optics give six long spikes (one
// vertical pair, two pairs at 60 degrees) and a short horizontal pair; the
// halos come in white, blue, gold and red, coloured by CSS variables
// --sk-w, --sk-b, --sk-y, --sk-r and the spikes by --spike.
export const SPIKE_DEFS =
  `<linearGradient id="dk-spg">${stop(0, '--spike', 0)}${stop(0.5, '--spike', 1)}${stop(1, '--spike', 0)}</linearGradient>` +
  `<g id="dk-spk" fill="url(#dk-spg)">` +
  [90, 30, 150].map(a => `<polygon points="-100,0 0,-1.5 100,0 0,1.5" transform="rotate(${a})"/>`).join('') +
  `<polygon points="-40,0 0,-.9 40,0 0,.9"/></g>` +
  (['w', 'b', 'y', 'r'] as const)
    .map(
      k =>
        `<radialGradient id="dk-h${k}"><stop offset="0" style="stop-color:var(--sk-core)"/>${stop(0.07, `--sk-${k}`, 0.95)}${stop(0.22, `--sk-${k}`, 0.32)}${stop(0.55, `--sk-${k}`, 0.08)}${stop(1, `--sk-${k}`, 0)}</radialGradient>`,
    )
    .join('')

export type Spiked = { x: number; y: number; s: number; k: 'w' | 'b' | 'y' | 'r'; d?: number }

// A bright star with a halo and spikes. s = 1 gives spikes 100 long. The
// spikes breathe slowly, out of step with each other.
export function spikeStar({ x, y, s, k, d = 0 }: Spiked): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)})">` +
    `<circle r="${n(s * 22)}" fill="url(#dk-h${k})"/>` +
    `<g class="spk" style="animation-delay:-${n(d)}s;animation-duration:${n(7 + (d % 5))}s"><use href="#dk-spk" transform="scale(${n(s)})"/></g>` +
    `<circle class="sk-dot" r="${n(Math.max(0.8, s * 1.8))}"/></g>`
  )
}

export type Puff = { x: number; y: number; rx: number; ry: number; f: string; a?: number; o?: number }

// Soft gas: gradient-filled ellipses, optionally rotated. Put a set inside a
// blurred group for billowing clouds.
export const puffs = (list: readonly Puff[]): string =>
  list
    .map(p => {
      const [x, y, rx, ry] = [p.x, p.y, p.rx, p.ry].map(Math.round)

      return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${p.f})"${p.o !== undefined ? ` fill-opacity="${n(p.o)}"` : ''}${p.a ? ` transform="rotate(${Math.round(p.a)} ${x} ${y})"` : ''}/>`
    })
    .join('')

// A cluster of puffs scattered around a centre, for gas clouds with lumpy
// structure rather than one smooth ellipse.
export function puffCloud(seed: number, cx: number, cy: number, rx: number, ry: number, count: number, fills: readonly string[], size = 1): Puff[] {
  const rand = seeded(seed)

  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand())
    const s = (0.25 + rand() * 0.6) * size

    return {
      x: cx + Math.cos(a) * rx * r,
      y: cy + Math.sin(a) * ry * r,
      rx: rx * s * (0.6 + rand() * 0.6),
      ry: ry * s * (0.5 + rand() * 0.5),
      f: fills[Math.floor(rand() * fills.length)] as string,
      a: rand() * 180,
      o: 0.45 + rand() * 0.55,
    }
  })
}

// Round-ish puffs scattered over an elliptical area, radius rmin to rmax.
export function scatter(seed: number, cx: number, cy: number, rx: number, ry: number, count: number, rmin: number, rmax: number, fills: readonly string[]): Puff[] {
  const rand = seeded(seed)

  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand())
    const r = rmin + Math.pow(rand(), 1.6) * (rmax - rmin)

    return { x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, rx: r, ry: r * (0.7 + rand() * 0.3), f: fills[Math.floor(rand() * fills.length)] as string, o: 0.4 + rand() * 0.6 }
  })
}

// A dust pillar's outline along a spine from base to tip, widths per spine
// point, the edges roughened by layered noise and the odd knob.
export function pillarPath(spine: readonly Pt[], widths: readonly number[], seed: number, rough = 1): string {
  const rand = seeded(seed)
  const steps = 36
  const ph = [rand() * 9, rand() * 9, rand() * 9, rand() * 9]
  const at = (t: number): { p: Pt; w: number } => {
    const f = t * (spine.length - 1)
    const i = Math.min(spine.length - 2, Math.floor(f))
    const u = f - i
    const a = spine[i] as Pt
    const b = spine[i + 1] as Pt
    const wa = widths[i] as number
    const wb = widths[i + 1] as number
    const e = u * u * (3 - 2 * u)

    return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], w: wa + (wb - wa) * e }
  }
  const left: Pt[] = []
  const right: Pt[] = []
  // Knobs: a few smooth bumps along each edge.
  const knobs = [0, 1].map(() => {
    const out = new Array<number>(steps + 1).fill(0)

    for (let b = 0; b < 4; b++) {
      const c = rand() * steps
      const h = 0.12 + rand() * 0.22
      const spread = 1.5 + rand() * 2.5

      for (let s = 0; s <= steps; s++) {
        out[s] = (out[s] as number) + h * Math.exp(-(((s - c) / spread) ** 2))
      }
    }

    return out
  })

  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const { p, w } = at(t)
    const q = at(Math.min(1, t + 0.02)).p
    const o = at(Math.max(0, t - 0.02)).p
    const dx = q[0] - o[0]
    const dy = q[1] - o[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const noise = (k: number) =>
      1 +
      rough *
        (0.12 * Math.sin(t * 9 + (ph[k] as number)) +
          0.09 * Math.sin(t * 21 + (ph[k + 1] as number) * 2) +
          0.05 * Math.sin(t * 43 + (ph[k] as number) * 3) +
          ((knobs[k / 2]?.[s] ?? 0) as number))
    left.push([p[0] + nx * w * noise(0), p[1] + ny * w * noise(0)])
    right.push([p[0] - nx * w * noise(2), p[1] - ny * w * noise(2)])
  }
  // A rounded, lumpy head at the tip.
  const tip = spine[spine.length - 1] as Pt
  const prev = spine[spine.length - 2] as Pt
  const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0])
  const tw = widths[widths.length - 1] as number
  const head: Pt[] = [-0.9, -0.45, 0, 0.45, 0.9].map(k => {
    const a = ang + k * 1.2
    const r = tw * (0.85 + rand() * 0.35)

    return [tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r]
  })

  return closedCurve([...right, ...head, ...left.reverse()])
}

// The bright version's light: a glaring sun or bright star at a corner, with
// a white core, a warm bloom, a wide pale wash and slowly turning rays.
// Colours from --sun-core, --sun-warm, --sun-wash and --sun-ray.
export function sunGlare(x: number, y: number, r: number, rays: number, seed: number): string {
  const rand = seeded(seed)
  const ray = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * 360 + rand() * 14
    const len = r * (1.6 + rand() * 1.8)
    const w = 0.025 + rand() * 0.05

    return `<polygon points="0,0 ${n(len)},${n(-len * w)} ${n(len)},${n(len * w)}" transform="rotate(${n(a)})" fill-opacity="${n(0.25 + rand() * 0.5)}"/>`
  }).join('')

  return (
    `<g transform="translate(${n(x)} ${n(y)})">` +
    `<circle r="${n(r * 3.2)}" fill="url(#dk-wash)"/>` +
    `<g style="filter:blur(7px);opacity:var(--ray-op, 1)"><g class="sun-rays" fill="url(#dk-ray)">${ray}</g></g>` +
    `<g style="transform:scale(var(--sun-k, 1))"><circle r="${n(r)}" fill="url(#dk-bloom)"/>` +
    `<g class="sun-pulse"><circle r="${n(r * 0.3)}" fill="url(#dk-core)"/></g></g>` +
    `</g>`
  )
}

export const SUN_DEFS =
  `<radialGradient id="dk-wash">${stop(0, '--sun-wash', 0.95)}${stop(0.3, '--sun-wash', 0.55)}${stop(0.65, '--sun-wash', 0.16)}${stop(1, '--sun-wash', 0)}</radialGradient>` +
  `<radialGradient id="dk-bloom">${stop(0, '--sun-core', 1)}${stop(0.2, '--sun-core', 0.95)}${stop(0.42, '--sun-warm', 0.6)}${stop(1, '--sun-warm', 0)}</radialGradient>` +
  `<radialGradient id="dk-core">${stop(0, '--sun-core', 1)}${stop(0.55, '--sun-core', 1)}${stop(0.75, '--sun-core', 0.6)}${stop(1, '--sun-core', 0)}</radialGradient>` +
  `<linearGradient id="dk-ray">${stop(0, '--sun-ray', 0.9)}${stop(0.35, '--sun-ray', 0.4)}${stop(1, '--sun-ray', 0)}</linearGradient>`

// Motion shared by the space scenes.
export const DEEP_CSS = `
.tw { animation: twinkle ease-in-out infinite; }
.spk { animation: spk ease-in-out infinite alternate; }
@keyframes spk { from { transform: scale(.88); opacity: .75; } to { transform: scale(1.06); opacity: 1; } }
.sun-rays { animation: spin 240s linear infinite; }
.sun-pulse { animation: sunp 9s ease-in-out infinite alternate; }
@keyframes sunp { from { transform: scale(.94); } to { transform: scale(1.06); } }
.billow { transform-box: fill-box; transform-origin: center; animation: billow ease-in-out infinite alternate; }
@keyframes billow { from { transform: translate(var(--bx, -12px), var(--by, 6px)) scale(.97); } to { transform: translate(calc(var(--bx, -12px) * -1), calc(var(--by, 6px) * -1)) scale(1.04); } }
.mote { animation: mote linear infinite; }
@keyframes mote { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(var(--mx), var(--my)); opacity: 0; } }
`
