// What surrounds the Milky Way's disc and does not turn with it: the faint
// halo, globular clusters, the two Magellanic Clouds, and the far field of
// other galaxies.
import { seeded, type Pt } from './kit'
import { dotPath, gauss, glowFill, glows, soft, stop, type Glow } from './space-galaxy-kit'

export const SKY_DEFS =
  `<radialGradient id="mw-bloom">${[1, 0.75, 0.52, 0.33, 0.18, 0.08, 0.02, 0].map((v, i) => stop(Math.round((i / 7) * 100) / 100, '--old', v * 0.34)).join('')}</radialGradient>` +
  glowFill('mw-gg', '--gc', 0.9) +
  soft('mw-fa', '--far-a', 0.9) +
  soft('mw-fb', '--far-b', 0.8) +
  soft('mw-mc', '--mc', 0.72) +
  soft('mw-mb', '--mc-bar', 0.6)

// The halo, old stars in a ball far larger than the disc, as a glow folded
// into the sky's own gradient so the frame is painted once rather than
// twice. r is its radius as a share of the sky gradient's.
export function haloSky(r: number): string {
  const halo = [1, 0.8, 0.62, 0.47, 0.34, 0.23, 0.14, 0.07, 0.025, 0]
  const sky = (t: number): string =>
    t < 0.45 ? `color-mix(in srgb, var(--bg-0) ${Math.round((1 - t / 0.45) * 100)}%, var(--bg-1))` : `color-mix(in srgb, var(--bg-1) ${Math.round((1 - (t - 0.45) / 0.55) * 100)}%, var(--bg-2))`
  const at = (t: number, h: number): string =>
    `<stop offset="${Math.round(t * 1000) / 1000}" style="stop-color:color-mix(in srgb, var(--halo) ${Math.round(h * 30)}%, ${sky(t)})"/>`

  return halo.map((h, i) => at((i / 9) * r, h)).join('') + at(1, 0)
}

// The glare of the bulge and inner disc, spilling over the plane.
export const bloom = (kpc: number, squash: number): string =>
  `<ellipse rx="${Math.round(7.5 * kpc)}" ry="${Math.round(7.5 * kpc * (squash + 0.14))}" fill="url(#mw-bloom)"/>`

// Globular clusters swarm about the centre in a ball, most of them close in.
// Each is placed in three dimensions and projected through the same tilt as
// the disc. Returns the ones behind the disc and the ones in front.
export function globulars(kpc: number, squash: number): { back: string; front: string } {
  const rand = seeded(6121)
  const rise = Math.sqrt(1 - squash * squash)
  const out: { back: Glow[]; front: Glow[] } = { back: [], front: [] }
  const cores: { back: Pt[]; front: Pt[] } = { back: [], front: [] }
  let made = 0

  while (made < 26) {
    const r = 2 + 30 * Math.pow(rand(), 2.4)
    const z = (rand() * 2 - 1) * r
    const a = rand() * Math.PI * 2
    const flat = Math.sqrt(r * r - z * z)
    const x = Math.cos(a) * flat * kpc
    const depth = Math.sin(a) * flat
    const y = (depth * squash - z * rise) * kpc
    // Lost against the bright inner disc.
    if (Math.abs(z) < 1.2 && flat < 9) {
      continue
    }
    const side = z > 0 ? 'front' : 'back'
    const s = 3.2 + rand() * 2.6

    out[side].push({ x, y, r: s, f: 'mw-gg', o: 0.6 + rand() * 0.4 })
    cores[side].push([x, y])
    made++
  }

  return {
    back: glows(out.back) + dotPath('mw-s mw-sg', 1.5, cores.back),
    front: glows(out.front) + dotPath('mw-s mw-sg', 1.5, cores.front),
  }
}

const oval = (x: number, y: number, rx: number, ry: number, turn: number, fill: string, o: number): string =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${fill})" fill-opacity="${o}"${turn ? ` transform="rotate(${turn} ${x} ${y})"` : ''}/>`

const scatter = (seed: number, count: number, sx: number, sy: number): Pt[] => {
  const rand = seeded(seed)

  return Array.from({ length: count }, () => [gauss(rand) * sx, gauss(rand) * sy] as Pt)
}

const knot = (x: number, y: number, r: number, k: number): string =>
  `<circle class="mw-k${k}" cx="${x}" cy="${y}" r="${Math.round(r * 7.2) / 10}" fill="url(#mw-gh)"/><circle cx="${x}" cy="${y}" r=".9" fill="var(--sh)"/>`

// The Large Magellanic Cloud: a bar of older stars set off-centre in a
// ragged disc, one loose arm curling from the bar's end, and the Tarantula
// nebula glowing beside it. The Small Cloud: a wedge with a wing drawn out
// toward its larger companion. Both are dwarf irregulars, drawn at the
// disc's own scale but brought in from their true distance to fit the frame.
export const magellanic = (lx: number, ly: number, sx: number, sy: number, k: number): string =>
  `<g transform="translate(${lx} ${ly}) rotate(-28) scale(${k})">` +
  oval(0, 0, 96, 78, 0, 'mw-mc', 0.5) +
  oval(14, -10, 60, 40, -20, 'mw-mc', 0.6) +
  oval(-30, 22, 44, 30, 15, 'mw-mc', 0.5) +
  oval(54, -30, 26, 18, -50, 'mw-mc', 0.5) +
  oval(40, -54, 24, 14, 10, 'mw-mc', 0.4) +
  oval(8, -62, 22, 12, 28, 'mw-mc', 0.3) +
  oval(0, 0, 80, 62, 0, 'mw-g2', 0.9) +
  oval(8, -6, 52, 34, -20, 'mw-f1', 0.8) +
  oval(-6, 8, 46, 12, -8, 'mw-mb', 1) +
  oval(-6, 8, 38, 8, -8, 'mw-f3', 1) +
  knot(40, -14, 7, 0) +
  knot(-20, 30, 3.5, 2) +
  knot(10, -42, 3.5, 3) +
  knot(-46, -4, 3, 4) +
  dotPath('mw-s mw-sw', 1.2, scatter(811, 40, 36, 28)) +
  dotPath('mw-s mw-sb', 1.7, scatter(813, 9, 38, 28)) +
  `</g>` +
  `<g transform="translate(${sx} ${sy}) rotate(50) scale(${k})">` +
  oval(0, 0, 52, 30, 0, 'mw-mc', 0.5) +
  oval(-4, 2, 30, 14, 6, 'mw-mc', 0.6) +
  oval(38, -12, 24, 12, -24, 'mw-mc', 0.4) +
  oval(0, 0, 42, 22, 0, 'mw-g2', 0.9) +
  oval(-4, 2, 26, 11, 6, 'mw-f1', 0.8) +
  oval(-6, 2, 20, 6, 6, 'mw-mb', 0.7) +
  knot(12, -3, 3.5, 1) +
  dotPath('mw-s mw-sw', 1.2, scatter(823, 16, 20, 9)) +
  dotPath('mw-s mw-sb', 1.7, scatter(825, 4, 20, 9)) +
  `</g>`

// Other galaxies, far beyond: specks and small smudges of every tilt, warm
// ellipticals and bluer discs. keep(x, y) thins them where they would sit
// under the conversation or on top of the Milky Way.
export function farField(keep: (x: number, y: number) => number): string {
  const rand = seeded(2203)
  let out = ''
  let made = 0

  while (made < 22) {
    const x = 30 + rand() * 1540
    const y = 30 + rand() * 940

    if (rand() > keep(x, y)) {
      continue
    }
    const kind = rand()
    const s = 2.5 + Math.pow(rand(), 3) * 13
    const at = `translate(${Math.round(x)} ${Math.round(y)}) rotate(${Math.round(rand() * 180)})`
    const o = Math.round((0.35 + rand() * 0.6) * 10) / 10
    // The far field's dimming goes on each shape rather than on a group.
    const e = (rx: number, ry: number, f: string): string =>
      `<ellipse transform="${at}" rx="${Math.round(rx * 10) / 10}" ry="${Math.round(ry * 10) / 10}" fill="url(#mw-${f})" style="fill-opacity:calc(var(--far-op) * ${o})"/>`

    // The warm core of a small disc galaxy is under two pixels: left out.
    const core = (rx: number, ry: number): string => (s < 5 ? '' : e(rx, ry, 'fa'))

    if (kind < 0.36) {
      out += e(s, s * (0.6 + rand() * 0.35), 'fa')
    } else if (kind < 0.66) {
      out += e(s * 1.9, s * 0.32, 'fb') + core(s * 0.55, s * 0.26)
    } else {
      const tilt = 0.4 + rand() * 0.55

      out += e(s * 1.5, s * 1.5 * tilt, 'fb') + core(s * 0.5, s * 0.5 * tilt)
    }
    made++
  }

  return out
}

// A repeating tile of the faintest galaxies, too far to show a shape.
export function farTile(id: string, seed: number, size: number, count: number): string {
  const rand = seeded(seed)
  const a: Pt[] = []
  const b: Pt[] = []

  for (let i = 0; i < count; i++) {
    ;(rand() < 0.6 ? a : b).push([rand() * size, rand() * size])
  }

  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${dotPath('mw-s mw-sf', 0.9, a)}${dotPath('mw-s mw-sf', 1.4, b)}</pattern>`
}
