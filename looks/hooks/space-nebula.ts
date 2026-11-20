import { makeColors } from './make-colors.js'
import { seeded, svg, type Pt } from './kit'
import { clamp, contours, curve, fbm, smooth, splatDefs, Splats, steps, Threads } from './space-nebula-field'
import type { Look } from './look'
import { stillScene } from './still'

// The Carina Nebula's "Cosmic Cliffs": banks of dust heaped like a mountain
// range under a field of blue ionised gas. A cluster of hot young stars at
// the upper right lights the scene. The dust facing it glows gold and amber
// along a thin lit skin and steams off into the blue; the far side of every
// billow falls into shadow, and bank on bank recedes into the dark below.
// Hydrogen glows rose behind the great peak on the left, oxygen teal around
// the cluster. Stars shine in front of the gas, inside it and, reddened,
// through it.
//
// Everything is painted with gradient splats (space-nebula-field), placed
// by noise fields and lit by marching toward the cluster through the dust,
// so no cloud has an outline: gas fades into space, dust thins at its edge,
// and the only bright edges are the ones the stars strike. By day the same
// nebula is overexposed into pearl, rose and pale teal, the dust a soft
// warm grey with cream where the light lands.
const { theme, problems } = makeColors({
  label: 'Nebula',
  codeTheme: { light: 'github-light', dark: 'tokyo-night' },
  roles: { accent: '#b3245f', danger: '#c8322f', success: '#2f8f4e', warning: '#a86f00', pro: '#2f6fb8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f1ecec',
        'surface-1': '#f6f2f1',
        'surface-2': '#fbf9f7',
        'text-primary': '#211a20',
        'text-secondary': '#433a43',
        'text-muted': '#5f555f',
      },
    },
  },
  dark: {
    roles: { accent: '#f0679f', pro: '#6fb4ff' },
    gray: {
      anchors: {
        'surface-0': '#05070e',
        'surface-1': '#0a0e18',
        'surface-2': '#0f1420',
        'surface-3': '#141a28',
        'text-primary': '#eef1f7',
        'text-secondary': '#c6ccd9',
        'text-muted': '#9aa2b4',
      },
    },
  },
})

// The hot cluster that lights everything.
const SUN: Pt = [1256, 258]
const rand = seeded(90210)

const toSun = (x: number, y: number): [number, number, number] => {
  const dx = SUN[0] - x
  const dy = SUN[1] - y
  const l = Math.hypot(dx, dy) || 1

  return [dx / l, dy / l, l]
}

const sunDist = (x: number, y: number): number => toSun(x, y)[2]

// The chat covers the middle of the window: 1 at the sides, lower behind it.
const calm = (x: number): number => 1 - 0.5 * smooth(420, 540, x) * (1 - smooth(1060, 1180, x))

// ---- The dust ---------------------------------------------------------------

// One bank of dust. Its edge is not a line: it is wherever a field of noise
// crosses a level, so it billows, overhangs and trails off like cloud.
type Bank = {
  seed: number
  base: (x: number) => number
  // How much light it takes, how much glows back from its shadowed face,
  // and how much steam it gives off. The near bank is drawn coarser.
  glow: number
  ambient: number
  steam: number
  fine: boolean
}

// A curve read thousands of times: sample it once per pixel.
const table = (f: (x: number) => number): ((x: number) => number) => {
  const lut = Float32Array.from({ length: 1900 }, (_, i) => f(i - 150))

  return x => lut[clamp(Math.round(x) + 150, 0, 1899)] as number
}

const BANKS: Bank[] = [
  {
    seed: 23, glow: 1, ambient: 0.5, steam: 1, fine: true,
    base: table(curve([[-10, 470], [110, 420], [200, 330], [290, 300], [360, 360], [420, 480], [480, 520], [540, 620], [640, 740], [760, 780], [880, 840], [1020, 815], [1130, 825], [1230, 760], [1320, 705], [1420, 620], [1530, 635], [1610, 600]])),
  },
  {
    seed: 37, glow: 0.75, ambient: 0.32, steam: 0.6, fine: true,
    base: table(curve([[-10, 660], [150, 620], [300, 540], [390, 560], [480, 670], [610, 790], [800, 870], [1000, 900], [1150, 860], [1270, 815], [1400, 750], [1520, 680], [1610, 660]])),
  },
  {
    seed: 41, glow: 0.4, ambient: 0.16, steam: 0.25, fine: false,
    base: table(curve([[-10, 820], [130, 770], [270, 790], [410, 860], [570, 930], [770, 975], [1010, 985], [1210, 945], [1340, 905], [1490, 850], [1610, 855]])),
  },
]

function dust(b: Bank, x: number, y: number): number {
  const wx = fbm(x / 310, y / 310, b.seed + 5, 3) - 0.5
  const wy = fbm(x / 310 + 5.2, y / 310 + 1.3, b.seed + 6, 3) - 0.5
  const tex = fbm((x + wx * 210) / 280, (y + wy * 210) / 200, b.seed, 5)
  const f = (y - b.base(x)) / 95 + (tex - 0.5) * 3

  return smooth(-0.13, 0.13, f)
}

// How much of the cluster's light reaches a point through this bank.
const MARCH: readonly (readonly [number, number])[] = [[7, 10], [18, 12], [32, 16], [50, 20], [72, 24], [98, 28], [130, 36], [170, 44], [220, 56]]

function lightAt(b: Bank, x: number, y: number): number {
  const [sx, sy, dist] = toSun(x, y)
  let tau = 0

  for (const [t, w] of MARCH) {
    if (t > dist) {
      break
    }
    tau += dust(b, x + sx * t, y + sy * t) * w
    if (tau > 120) {
      return 0
    }
  }

  return Math.exp(-tau / 24) * (0.5 + 0.5 / (1 + (dist / 650) ** 2))
}

// The top of the dust, roughly: enough to place gas and stars by.
const skyline = (x: number): number => Math.min((BANKS[0] as Bank).base(x), (BANKS[1] as Bank).base(x)) - 20

// The dust at a point and all round it: high only well inside the bank.
// On the side toward the cluster it stops deeper still, under the lit skin.
const inner = (b: Bank, x: number, y: number): number => {
  const [sx, sy] = toSun(x, y)

  return Math.min(dust(b, x, y), dust(b, x - 20, y), dust(b, x + 20, y), dust(b, x, y - 20), dust(b, x, y + 20), dust(b, x + sx * 40, y + sy * 40), dust(b, x + sx * 64, y + sy * 64))
}

function paintBank(b: Bank, k: number): string {
  const nearer = BANKS.slice(k + 1)
  const set = new Splats()
  const steam = new Splats()
  const rr = seeded(b.seed * 131)
  const pass = (step: number, dia: number, level: number): void => {
    for (let gy = 150; gy < 1030; gy += step) {
      for (let gx = -20; gx < 1620; gx += step) {
        const jit = level >= 2 ? 0.7 : level === 1 ? 1 : 1.5
        const x = gx + (rr() - 0.5) * step * jit
        const y = gy + (rr() - 0.5) * step * jit

        if (y < b.base(x) - 190) {
          continue
        }
        const d = dust(b, x, y)
        const [sx, sy] = toSun(x, y)

        if (d < 0.06) {
          // Steam: just off a lit face, the dust boils away as pale gas.
          if (level < 2 && b.steam > 0) {
            const reach = level === 0 ? 64 : 24

            if (dust(b, x - sx * reach, y - sy * reach) > 0.45 && !nearer.some(q => dust(q, x, y) > 0.5)) {
              const l = lightAt(b, x, y)

              if (l > 0.3) {
                steam.add(level === 0 ? (rr() < 0.5 ? 't' : 'b') : 'p', l * b.steam * calm(x) * (level === 0 ? 0.15 : 0.22) * (0.5 + fbm(x / 60, y / 110, 77, 3)), dia, x, y)
              }
            }
          }
          continue
        }
        const edge = 4 * d * (1 - d)

        if ((level === 1 && d > 0.9 && rr() < 0.85 && inner(b, x, y) > 0.9) || (level === 2 && edge < 0.4)) {
          continue
        }
        if (nearer.some(q => dust(q, x, y) > 0.93)) {
          continue
        }
        const l = lightAt(b, x, y) * b.glow

        if (level === 2 && l < 0.12) {
          continue
        }
        // The fringe: the dust thins out past its edge, soft and dark.
        if (level === 1) {
          // Lit skin stays translucent; behind it the dust is solid.
          const shade = l < 0.12 ? 1 : Math.max(1 - l * 2.4, dust(b, x + sx * 30, y + sy * 30) > 0.6 ? 1 : 0)

          set.add('u', Math.min(1, d * 1.7) * shade, dia * 0.8, x, y)
        }
        if (l >= 0.1) {
          if (level > 0 || d > 0.5) {
            set.add(l > 0.6 ? 'g' : l > 0.32 ? 'a' : 'r', d * Math.min(1, l * 1.5) * 0.52, dia, x, y)
          }
        } else if (level < 2 && d > 0.5) {
          // The shadowed face is not black: it glows a little, unevenly.
          const tex = fbm(x / 120, y / 70, b.seed + 50, 4)

          if (tex > 0.56) {
            set.add('r', (tex - 0.5) * 0.85 * b.ambient * Math.exp(-Math.max(0, y - b.base(x)) / 320), dia, x, y)
          }
        }
      }
    }
  }

  pass(27, 118, 0)
  pass(15, 64, 1)
  if (b.fine) {
    pass(5.5, 25, 2)
  }
  // The solid heart of the bank, well inside its soft edge, so no light
  // leaks through the middle. The fringe above hides where it ends.
  const loops = contours((x, y) => (y < b.base(x) - 200 ? 0 : y > b.base(x) + 220 ? 1 : inner(b, x, y)), 0.5, b.fine ? 12 : 18, -40, 100, 1640, 1040).filter(l => l.length > 6)

  // The seam: a fine bright line of light exactly along the edge of the
  // dust, only where the cluster strikes it, fading out as the edge turns
  // away. Evenly spaced splats, so it is a glow and never a drawn outline.
  if (b.fine) {
    for (const loop of contours((x, y) => (Math.abs(y - b.base(x)) > 200 ? 0 : dust(b, x, y)), 0.5, 5, -40, 100, 1640, 1040)) {
      let carry = 0

      for (let i = 0; i < loop.length; i++) {
        const [ax, ay] = loop[i] as Pt
        const [bx, by] = loop[(i + 1) % loop.length] as Pt
        const len = Math.hypot(bx - ax, by - ay)

        for (; carry < len; carry += 4) {
          const x = ax + ((bx - ax) * carry) / len
          const y = ay + ((by - ay) * carry) / len

          if (x < -10 || x > 1610 || y > 1000 || calm(x) < 0.75 || nearer.some(q => dust(q, x, y) > 0.4)) {
            continue
          }
          set.add('g', (lightAt(b, x, y) * b.glow - 0.24) * 0.8, 15, x, y)
        }
        carry -= len
      }
    }
  }

  return `<g class="bre bre${k}">${steam.render('btp')}</g>` + `<path class="body" d="${loops.map(l => `${steps(l)}Z`).join('')}"/>` + set.render('urag')
}

// ---- The gas in the sky ----------------------------------------------------

// Hydrogen glows rose in three regions: behind the great peak, low on the
// left, and at the far right edge.
const roseAt = (x: number, y: number): number =>
  Math.max(Math.exp(-(((x - 300) / 330) ** 2 + ((y - 190) / 230) ** 2)), 0.8 * Math.exp(-(((x - 40) / 200) ** 2 + ((y - 470) / 230) ** 2)), 0.5 * Math.exp(-(((x - 1570) / 150) ** 2 + ((y - 470) / 150) ** 2)))

function gasDensity(x: number, y: number, octaves: number): number {
  const wx = fbm(x / 520, y / 520, 3, 3) - 0.5
  const wy = fbm(x / 520 + 9.1, y / 520 + 4.3, 4, 3) - 0.5
  const [sx, sy, dist] = toSun(x, y)
  // Stretch the texture along the line to the cluster, so the gas streams
  // away from it.
  const qx = x + wx * 420
  const qy = y + wy * 420
  const along = qx * sx + qy * sy
  const across = -qx * sy + qy * sx
  const v = fbm(along / 560, across / 230, 7, octaves)
  const structure = smooth(0.3, 0.74, v)
  const above = skyline(x) - y
  const nearRidge = above > 0 ? Math.exp(-above / 230) : 1
  const shell = Math.exp(-(((dist - 260) / 180) ** 2))
  const cavity = 0.2 + 0.8 * smooth(50, 220, dist)

  return structure * (0.16 + 0.6 * nearRidge + 0.9 * shell + 0.75 * roseAt(x, y)) * cavity
}

function skyGas(): { far: string; near: string } {
  const far = new Splats()
  const near = new Splats()
  const pass = (set: Splats, step: number, dia: number, octaves: number, gain: number, zone: (x: number, y: number) => boolean): void => {
    const e = dia * 0.3

    for (let gy = -40; gy < 960; gy += step) {
      for (let gx = -40; gx < 1640; gx += step) {
        const x = gx + (rand() - 0.5) * step * 1.7
        const y = gy + (rand() - 0.5) * step * 1.7

        if (y > skyline(x) + 50 || !zone(x, y)) {
          continue
        }
        const d = gasDensity(x, y, octaves)
        const [sx, sy, dist] = toSun(x, y)
        // Where the gas thins toward the cluster its face is lit; the far
        // side of each billow stays deep.
        const facing = clamp(0.5 + (d - gasDensity(x + sx * e, y + sy * e, octaves)) * 4)
        const hue = fbm(x / 300, y / 300, 21, 3)
        const rose = roseAt(x, y) * (0.5 + hue)
        const teal = Math.exp(-((dist / 470) ** 2)) + 0.12 + (hue - 0.5) * 0.3
        const base = rose > 0.42 && rose > teal ? 'h' : teal > 0.5 ? 't' : 'b'
        const lit = facing > 0.7 && d > 0.3
        const k = lit ? (base === 'b' ? 't' : base === 't' ? (dist < 320 ? 'p' : 't') : 'c') : facing < 0.4 ? (base === 'h' || rose > 0.25 ? 'v' : 'b') : base

        set.add(k, d * gain * (0.6 + 0.8 * facing) * calm(x) * (k === 'p' ? 0.45 : k === 'c' ? 0.6 : k === 'h' ? 0.75 : 1), dia, x, y)
      }
    }
  }
  const heroZone = (x: number, y: number): boolean => {
    const [, , dist] = toSun(x, y)

    return calm(x) > 0.8 && (dist < 430 || roseAt(x, y) > 0.3 || skyline(x) - y < 150)
  }

  pass(far, 46, 204, 2, 0.3, () => true)
  pass(far, 23, 102, 4, 0.31, () => true)
  pass(near, 14, 62, 5, 0.27, heroZone)
  pass(near, 10, 44, 6, 0.2, (x, y) => calm(x) > 0.9 && (sunDist(x, y) < 300 || roseAt(x, y) > 0.62))

  // Dark lanes of dust drifting in front of the glow.
  for (let gy = 0; gy < 940; gy += 26) {
    for (let gx = -20; gx < 1620; gx += 26) {
      const x = gx + (rand() - 0.5) * 26
      const y = gy + (rand() - 0.5) * 26

      if (y > skyline(x) + 40) {
        continue
      }
      const m = fbm(x / 380 + 2.2, y / 170 + 7.7, 31, 4)
      const [, , dist] = toSun(x, y)

      if (m > 0.6 && dist > 300) {
        near.add('k', (m - 0.58) * 1.1 * smooth(300, 500, dist), 112, x, y)
      }
    }
  }

  return { far: far.render('kbvhtcp'), near: near.render('kbvhtcp') }
}

// Filaments: long soft strokes laid along a slow flow that streams away
// from the cluster and curls as it goes, the way field lines comb real
// nebulae into fibres. Each is a row of stretched splats turned to follow
// its path, so it tapers at both ends and has no edge.
function filaments(seed: number, bundles: number, long: number, pick: (x: number, y: number) => boolean): string {
  const set = new Threads()
  const r = seeded(seed)
  let made = 0

  for (let tries = 0; tries < 5000 && made < bundles; tries++) {
    const x0 = r() * 1600
    const y0 = 40 + r() * 860

    if (skyline(x0) - y0 < 0 || !pick(x0, y0) || gasDensity(x0, y0, 4) * calm(x0) < 0.14 + r() * 0.22) {
      continue
    }
    made++
    const lines = 3 + Math.floor(r() * 4)
    const len = 3 + Math.floor(r() * 4)
    const [sx0, sy0] = toSun(x0, y0)

    for (let k = 0; k < lines; k++) {
      // Each line starts a little to the side of the last.
      const off = (k - lines / 2) * (5 + r() * 7)
      let x = x0 - sy0 * off + sx0 * (r() - 0.5) * 70
      let y = y0 + sx0 * off + sy0 * (r() - 0.5) * 70
      const pts: Pt[] = [[x, y]]
      const n = len - Math.floor(r() * 2)

      for (let j = 0; j < n; j++) {
        const [sx, sy] = toSun(x, y)
        const a = Math.atan2(-sy, -sx) + (fbm(x / 520, y / 520, seed, 2) - 0.5) * 2

        x += Math.cos(a) * long * 0.4
        y += Math.sin(a) * long * 0.4
        pts.push([x, y])
      }
      set.add(pts)
    }
  }

  return set.render(`class="fl" stroke-width="${long}"`)
}

// ---- Stars ------------------------------------------------------------------

const dotPath = (cls: string, pts: readonly Pt[]): string => (pts.length ? `<path class="${cls}" d="${pts.map(([x, y]) => `M${Math.round(x)} ${Math.round(y)}h0`).join('')}"/>` : '')

function starField(): { behind: string; front: string; twinkle: string; dust: string } {
  const r = seeded(4242)
  const buckets: Record<string, Pt[]> = {}
  const put = (cls: string, x: number, y: number): void => {
    ;(buckets[cls] ??= []).push([x, y])
  }

  // Behind the gas: dimmed, and reddened where the gas is thick.
  for (let i = 0; i < 520; i++) {
    const x = r() * 1600
    const y = r() * 1000

    if (y > skyline(x) - 4) {
      continue
    }
    const size = r() < 0.72 ? 1 : r() < 0.8 ? 2 : 3

    put(`s${gasDensity(x, y, 3) > 0.3 ? 'r' : r() < 0.3 ? 'b' : 'w'}${size}`, x, y)
  }
  const behind = Object.entries(buckets).map(([cls, pts]) => dotPath(`st ${cls}`, pts)).join('')

  // Through the dust: only the reddest light gets out.
  const through: Pt[][] = [[], []]

  for (let i = 0; i < 150; i++) {
    const x = r() * 1600
    const y = 300 + r() * 640
    const depth = y - skyline(x)

    if (depth > 12) {
      ;(through[r() < 0.75 ? 0 : 1] as Pt[]).push([x, y])
    }
  }
  const dust = dotPath('st sd1', through[0] as Pt[]) + dotPath('st sd2', through[1] as Pt[])

  // In front: crisp, with soft halos. Fewer behind the chat.
  const sharp: Pt[][] = [[], [], []]
  const halos: string[][] = [[], [], [], [], [], []]

  for (let i = 0; i < 330; i++) {
    const x = 10 + r() * 1580
    const y = 10 + r() * 930

    if (r() > calm(x) + 0.15) {
      continue
    }
    const t = r()

    if (t < 0.8) {
      ;(sharp[t < 0.5 ? 0 : t < 0.72 ? 1 : 2] as Pt[]).push([x, y])
    } else {
      ;(halos[Math.floor(r() * 6)] as string[]).push(`${Math.round(x)} ${Math.round(y)}`)
    }
  }
  const front = sharp.map((pts, i) => dotPath(`st sf${i}`, pts)).join('')
  const twinkle = halos.map((list, i) => `<path class="hs${i % 3} tw tw${i}" stroke-width="${[9, 12, 16][i % 3]}" d="M${list.join(' ')}"/>`).join('')

  return { behind, front, twinkle, dust }
}

type Spiked = readonly [x: number, y: number, scale: number, kind: 'w' | 'b' | 'y']

// The cluster, then a few bright field stars, kept clear of the chat.
const CLUSTER: Spiked[] = (
  [
    [0, 0, 1.5, 'b'],
    [56, 54, 0.95, 'b'],
    [-52, -48, 0.8, 'w'],
    [96, -42, 0.62, 'b'],
    [26, -78, 0.5, 'w'],
    [-70, 48, 0.42, 'b'],
  ] satisfies Spiked[]
).map(([x, y, ...rest]) => [SUN[0] + x, SUN[1] + y, ...rest])
const FIELD: Spiked[] = [
  [168, 148, 0.62, 'w'],
  [402, 196, 0.36, 'b'],
  [78, 322, 0.34, 'y'],
  [1508, 418, 0.4, 'w'],
  [1138, 470, 0.3, 'y'],
  [748, 142, 0.26, 'w'],
  [1466, 128, 0.3, 'y'],
  [1556, 236, 0.22, 'b'],
]

const spiked = ([x, y, s, k]: Spiked, i: number, hot: boolean): string =>
  `<g transform="translate(${x} ${y}) rotate(8) scale(${s})"><g class="${hot ? 'br' : 'tw'} tw${i % 6}"><circle class="h${k}" r="${hot ? 60 : 34}"/><use href="#${hot ? 'hot' : 'spk'}"/></g></g>`

// ---- The picture ------------------------------------------------------------

// Built on first use: the fields take a moment to compute, and only the look
// in use needs its scene.
function build(): string {
  const gas = skyGas()
  const stars = starField()
  const cliffs = BANKS.map((b, k) => `<g class="dr bk${k}">${paintBank(b, k)}</g>`).join('')
  const SPLAT = splatDefs({
    b: '--blue',
    t: '--teal',
    p: '--pale',
    h: '--rose',
    c: '--coral',
    v: '--violet',
    k: '--ink',
    g: '--gold',
    a: '--amber',
    r: '--rust',
    u: '--umber',
  }, 'u')

  const CSS = `
  :root, svg {
    --sky-0:#fdf3e6; --sky-1:#f3ecf1; --sky-2:#e2eef0; --sky-3:#f6e9e6;
    --blue:#a9c3ee; --teal:#9bdcd2; --pale:#ffffff; --rose:#f3a3c0; --coral:#ffd9d6; --violet:#c9b6ec; --ink:#cbbcc6;
    --gold:#fffaf0; --amber:#f6d6b4; --rust:#d9b3a4; --umber:#a08c90;
    --star:#ffffff; --star-b:#ffffff; --star-r:#fff4e0; --star-d:#ffe7c4;
    --halo:#ffffff; --halo-w:#ffeccb; --halo-b:#ffe3b3; --halo-y:#ffd6a0; --spike:#f0c27c;
    --glow-a:#ffffff; --glow-b:#bdeee6; --far-op:.5; --vig:#b9a6b4; --vig-op:.22; --wash:#fff6e8; --wash-op:.55;
  }
  @media (prefers-color-scheme: dark) {
    :root, svg {
      --sky-0:#02040b; --sky-1:#061230; --sky-2:#0b2a55; --sky-3:#0a0a1c;
      --blue:#1f56b8; --teal:#1fa7a6; --pale:#bfecef; --rose:#b8305c; --coral:#ff8fa0; --violet:#4a379f; --ink:#02030a;
      --gold:#ffe3a6; --amber:#f09a3e; --rust:#a8481a; --umber:#120704;
      --star:#f4f7ff; --star-b:#b9d2ff; --star-r:#ffb489; --star-d:#ff8a55;
      --halo:#ffffff; --halo-w:#e8eeff; --halo-b:#9fcbff; --halo-y:#ffd28a; --spike:#eaf3ff;
      --glow-a:#d8f6f8; --glow-b:#2fb9c0; --far-op:1; --vig:#000000; --vig-op:.5; --wash:#000; --wash-op:0;
    }
  }
  ${SPLAT.css}
  .st{fill:none;stroke-linecap:round}
  .sw1,.sb1,.sr1{stroke-width:1.1;stroke-opacity:.5}.sw2,.sb2,.sr2{stroke-width:1.6;stroke-opacity:.7}.sw3,.sb3,.sr3{stroke-width:2.3;stroke-opacity:.8}
  .sw1,.sw2,.sw3{stroke:var(--star)}.sb1,.sb2,.sb3{stroke:var(--star-b)}.sr1,.sr2,.sr3{stroke:var(--star-r)}
  .sd1{stroke:var(--star-d);stroke-width:1.5;stroke-opacity:.55}.sd2{stroke:var(--star-r);stroke-width:2.4;stroke-opacity:.7}
  .sf0{stroke:var(--star);stroke-width:1.3;stroke-opacity:.85}.sf1{stroke:var(--star-b);stroke-width:1.9;stroke-opacity:.9}.sf2{stroke:var(--star);stroke-width:2.6}
  .hs0{marker:url(#mh0);fill:none}.hs1{marker:url(#mh1);fill:none}.hs2{marker:url(#mh2);fill:none}
  .far{opacity:var(--far-op)}
  .body{fill:var(--umber)}
  .fl{fill:none}.fc .fl{marker:url(#fc)}.fp .fl{marker:url(#fp)}.ft .fl{marker:url(#ft)}
  .hw{fill:url(#halo-w)}.hb{fill:url(#halo-b)}.hy{fill:url(#halo-y)}
  .sp-a{fill:url(#spk-g)}.sp-b{fill:url(#spk-g);opacity:.4}
  .core{fill:var(--halo)}
  .tw{animation:tw 7s ease-in-out infinite}
  .tw1{animation-duration:9s;animation-delay:-3s}.tw2{animation-duration:11s;animation-delay:-7s}.tw3{animation-duration:6s;animation-delay:-2s}.tw4{animation-duration:13s;animation-delay:-5s}.tw5{animation-duration:8s;animation-delay:-6s}
  @keyframes tw{0%,100%{opacity:1}50%{opacity:.5}}
  .br{animation:br 12s ease-in-out infinite}
  @keyframes br{0%,100%{opacity:1}50%{opacity:.82}}
  .dr{animation:dr 140s ease-in-out infinite alternate}
  .dr2{animation-duration:190s;animation-delay:-60s;--dx:-22px;--dy:8px}
  .dr3{animation-duration:110s;animation-delay:-30s;--dx:16px;--dy:-10px}
  @keyframes dr{from{transform:translate(calc(var(--dx,26px) * -1),calc(var(--dy,-8px) * -1))}to{transform:translate(var(--dx,26px),var(--dy,-8px))}}
  .bre{animation:bre 46s ease-in-out infinite}.bre1{animation-duration:37s;animation-delay:-12s}.bre2{animation-duration:53s;animation-delay:-30s}
  .bk0{animation-duration:170s;--dx:3px;--dy:0px}.bk1{animation-duration:150s;animation-delay:-40s;--dx:-7px;--dy:1px}.bk2{animation-duration:130s;animation-delay:-80s;--dx:13px;--dy:2px}
  .gn{animation-duration:160s;animation-delay:-90s;--dx:-9px;--dy:5px}
  @keyframes bre{0%,100%{opacity:.6}50%{opacity:1}}
  .pulse{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:nbp 34s ease-out infinite}
  .pulse2{animation-duration:47s;animation-delay:-19s}
  @keyframes nbp{0%{transform:scale(.2);opacity:0}5%{opacity:.9}32%{transform:scale(1);opacity:0}100%{transform:scale(1);opacity:0}}
  .creep{animation:creep 58s linear infinite}
  .creep2{animation-duration:74s;animation-delay:-31s}
  @keyframes creep{0%{transform:translate(-5px,14px);opacity:0}25%{opacity:1}75%{opacity:1}100%{transform:translate(8px,-22px);opacity:0}}
  .vig{fill:url(#vig)}.wash{fill:url(#wash)}
  `

  const stops = (list: readonly (readonly [number, string, number | string])[]): string =>
    list.map(([o, v, a]) => `<stop offset="${o}" style="stop-color:var(${v});stop-opacity:${a}"/>`).join('')

  const haloMarker = (id: string, v: string): string =>
    `<radialGradient id="g${id}">${stops([[0, '--halo', 1], [0.1, '--halo', 0.9], [0.2, v, 0.42], [0.45, v, 0.14], [0.75, v, 0.03], [1, v, 0]])}</radialGradient>` +
    `<marker id="m${id}" viewBox="-1 -1 2 2" markerWidth="1" markerHeight="1"><circle r="1" fill="url(#g${id})"/></marker>`

  const WISPS =
    `<g class="creep"><g class="fc">${filaments(771, 8, 70, (x, y) => roseAt(x, y) > 0.3)}</g><g class="fp">${filaments(773, 9, 46, (x, y) => skyline(x) - y < 130 && calm(x) > 0.8)}</g></g>` +
    `<g class="creep creep2"><g class="ft">${filaments(772, 9, 84, (x, y) => sunDist(x, y) < 520)}</g><g class="fp">${filaments(775, 6, 60, (x, y) => sunDist(x, y) < 330)}</g></g>`

  const filamentMarker = (k: string): string =>
    `<marker id="f${k}" viewBox="-1 -1 2 2" markerWidth="1" markerHeight="1" orient="auto"><ellipse rx="1" ry=".1" fill="url(#g${k})" opacity=".13"/></marker>`

  const tinyStars = (id: string, seed: number, size: number, count: number): string => {
    const r = seeded(seed)
    const pts = (k: number): Pt[] => Array.from({ length: k }, () => [r() * size, r() * size] as Pt)

    return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${dotPath('st sw1', pts(Math.round(count * 0.7)))}${dotPath('st sb1', pts(Math.round(count * 0.2)))}${dotPath('st sr2', pts(Math.round(count * 0.1)))}</pattern>`
  }

  const DEFS =
    SPLAT.defs +
    haloMarker('h0', '--halo-b') +
    haloMarker('h1', '--halo-w') +
    haloMarker('h2', '--halo-y') +
    tinyStars('ts1', 5, 307, 34) +
    tinyStars('ts2', 6, 433, 40) +
    `<linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="1100" y2="1000">${stops([[0, '--sky-0', 1], [0.4, '--sky-1', 1], [0.78, '--sky-2', 1], [1, '--sky-3', 1]])}</linearGradient>` +
    filamentMarker('c') +
    filamentMarker('p') +
    filamentMarker('t') +
    // A star's glow in each tint, and its diffraction spikes.
    (['w', 'b', 'y'] as const).map(k => `<radialGradient id="halo-${k}">${stops([[0, '--halo', 1], [0.06, '--halo', 0.95], [0.14, `--halo-${k}`, 0.5], [0.3, `--halo-${k}`, 0.2], [0.55, `--halo-${k}`, 0.06], [1, `--halo-${k}`, 0]])}</radialGradient>`).join('') +
    `<radialGradient id="spk-g" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="100">${stops([[0, '--spike', 1], [0.12, '--spike', 0.75], [0.4, '--spike', 0.28], [1, '--spike', 0]])}</radialGradient>` +
    `<path id="cross" d="M-100 0L0-1.5 100 0 0 1.5ZM0-100L1.5 0 0 100-1.5 0Z"/>` +
    `<g id="spk"><use href="#cross" class="sp-a"/><circle class="core" r="3.2"/></g>` +
    `<g id="hot"><use href="#cross" class="sp-a"/><use href="#cross" class="sp-b" transform="rotate(45) scale(.5)"/><circle class="core" r="3.6"/></g>` +
    `<radialGradient id="vig" cx=".5" cy=".46" r=".78">${stops([[0.5, '--vig', 0], [1, '--vig', 'var(--vig-op)']])}</radialGradient>` +
    `<radialGradient id="wash" gradientUnits="userSpaceOnUse" cx="${SUN[0]}" cy="${SUN[1]}" r="900">${stops([[0, '--wash', 'var(--wash-op)'], [0.5, '--wash', 0]])}</radialGradient>` +
    `<radialGradient id="glow-a">${stops([[0, '--glow-a', 0.5], [0.15, '--glow-a', 0.3], [0.4, '--glow-b', 0.16], [0.7, '--glow-b', 0.05], [1, '--glow-b', 0]])}</radialGradient>` +
    `<radialGradient id="ring">${stops([[0, '--glow-a', 0], [0.55, '--glow-a', 0], [0.8, '--glow-a', 0.3], [1, '--glow-a', 0]])}</radialGradient>`

  // Big soft masses of colour that drift behind the detail.
  const veil = (k: string, x: number, y: number, rx: number, ry: number, o: number, turn = 0): string =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#g${k})" opacity="${o}"${turn ? ` transform="rotate(${turn} ${x} ${y})"` : ''}/>`

  const body =
    `<rect width="1600" height="1000" fill="url(#sky)"/>` +
    `<g class="dr dr2">${veil('b', 760, 520, 900, 420, 0.55)}${veil('h', 250, 210, 520, 360, 0.5, -20)}${veil('v', 60, 520, 380, 300, 0.4)}</g>` +
    `<g class="far"><rect width="1600" height="1000" fill="url(#ts1)"/><rect width="1600" height="1000" fill="url(#ts2)"/>${stars.behind}</g>` +
    `<g class="dr">${veil('t', 1250, 330, 620, 430, 0.5, 24)}${veil('b', 700, 330, 620, 260, 0.35, -8)}${veil('h', 1570, 480, 240, 230, 0.3)}</g>` +
    `<circle class="bre" cx="${SUN[0]}" cy="${SUN[1]}" r="470" fill="url(#glow-a)"/>` +
    `<g class="dr dr3">${gas.far}</g>` +
    `<g class="dr gn">${gas.near}</g>` +
    WISPS +
    `<circle class="pulse" cx="${SUN[0]}" cy="${SUN[1]}" r="520" fill="url(#ring)"/>` +
    `<circle class="pulse pulse2" cx="${SUN[0] + 30}" cy="${SUN[1] + 30}" r="380" fill="url(#ring)"/>` +
    cliffs +
    `<g class="far">${stars.dust}</g>` +
    stars.front +
    stars.twinkle +
    FIELD.map((s, i) => spiked(s, i, false)).join('') +
    CLUSTER.map((s, i) => spiked(s, i, true)).join('') +
    `<rect class="wash" width="1600" height="1000"/>` +
    `<rect class="vig" width="1600" height="1000"/>`

  return svg(CSS, DEFS, body)
}

let built: string | undefined

export const SPACE_NEBULA: Look = {
  label: 'Nebula',
  args: { colors: theme, backdrop: { scene: 'space-nebula', glass: { blur: 24, opacity: 0.5 } } },
  problems,
  // Shown as a picture: the gas is thousands of soft blots, far more than
  // the app will play, and every cheaper way of drawing it lost the softness.
  get scene() {
    return (built ??= stillScene(build()))
  },
}
