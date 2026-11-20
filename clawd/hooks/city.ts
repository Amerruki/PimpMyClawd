export type Daypart = 'dawn' | 'day' | 'dusk' | 'night'

type Palette = {
  sky: [number, string][]
  far: string
  mid: string
  near: string
  lit: number
  win: string[]
  winOp: number
  neon: number
  glow: number
  body: string
  lights: number
  stars: number
  rain: boolean
}

type Building = { x: number; w: number; y: number }

const PINK = '#FF3EA5'
const CYAN = '#2DE2E6'
const VIOLET = '#9B5CFF'
const NEON = [PINK, CYAN, VIOLET]
const WARM = '#FFC66B'

const PALETTES: Record<Daypart, Palette> = {
  dawn: {
    sky: [[0, '#2B1650'], [0.45, '#6E3479'], [0.8, '#E0707A'], [1, '#FFA868']],
    far: '#6A3F73', mid: '#3F2554', near: '#1E1230',
    lit: 0.22, win: [WARM, WARM, '#FFDFA0'], winOp: 0.85,
    neon: 0.75, glow: 0.45, body: '#241838', lights: 0.8, stars: 6, rain: false,
  },
  day: {
    sky: [[0, '#3A8BDD'], [0.6, '#86BDEE'], [1, '#D6EAF7']],
    far: '#A3BCD2', mid: '#7590AB', near: '#435A76',
    lit: 0.07, win: ['#FFF3C8', '#DDF4FF'], winOp: 0.55,
    neon: 0.35, glow: 0.12, body: '#2A3348', lights: 0.35, stars: 0, rain: false,
  },
  dusk: {
    sky: [[0, '#1E1A4A'], [0.45, '#6A2A7A'], [0.8, '#E2506A'], [1, '#FFA552']],
    far: '#57305F', mid: '#311C47', near: '#170E26',
    lit: 0.4, win: [WARM, WARM, '#7FF6FF', '#FF9BD2'], winOp: 0.9,
    neon: 0.95, glow: 0.65, body: '#1A1430', lights: 0.95, stars: 0, rain: false,
  },
  night: {
    sky: [[0, '#04050E'], [0.55, '#0E0F2A'], [1, '#2A1342']],
    far: '#1D1B3A', mid: '#121029', near: '#08071A',
    lit: 0.5, win: [WARM, WARM, '#7FF6FF', '#7FF6FF', '#FF9BD2'], winOp: 1,
    neon: 1, glow: 0.85, body: '#141228', lights: 1, stars: 26, rain: true,
  },
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (v: number): string => String(Math.round(v * 10) / 10)

export function cityWindow(w: number, h: number, part: Daypart): string {
  const pal = PALETTES[part]
  // Everything is laid out on a grid of `px`-sized pixels so the art stays
  // blocky and integer-aligned at any size; 54px tall maps to 1px per cell.
  const px = Math.max(1, Math.round(h / 54))
  const gw = Math.ceil(w / px)
  const gh = Math.ceil(h / px)
  const k = gh / 54
  const P = (v: number): string => n(v * px)
  const R = (x: number, y: number, rw: number, rh: number): string =>
    `M${P(x)} ${P(y)}h${P(rw)}v${P(rh)}h${P(-rw)}z`
  const rect = (x: number, y: number, rw: number, rh: number, fill: string, extra = '', inner = ''): string =>
    `<rect x="${P(x)}" y="${P(y)}" width="${P(rw)}" height="${P(rh)}" fill="${fill}"${extra}` +
    (inner ? `>${inner}</rect>` : '/>')
  const path = (d: string, fill: string, extra = ''): string =>
    d ? `<path d="${d}" fill="${fill}"${extra}/>` : ''
  const blink = (values: string, dur: number, begin: number): string =>
    `<animate attributeName="opacity" values="${values}" dur="${n(dur)}s" begin="${n(begin)}s" repeatCount="indefinite"/>`

  // Geometry uses one fixed seed so all dayparts share the same skyline;
  // lighting uses a per-part seed.
  const geo = mulberry32(0xc17e)
  const lightRng = mulberry32(0x5eed + ['dawn', 'day', 'dusk', 'night'].indexOf(part) * 7919)
  const int = (rng: () => number, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1))

  const skyline = (minW: number, maxW: number, minH: number, maxH: number, gap: number): Building[] => {
    const out: Building[] = []
    let x = -int(geo, 0, Math.round(minW * k))
    while (x < gw) {
      const bw = int(geo, Math.round(minW * k), Math.round(maxW * k))
      const bh = Math.round(gh * (minH + geo() * (maxH - minH)))
      out.push({ x, w: bw, y: gh - bh })
      x += bw + int(geo, 0, Math.round(gap * k))
    }
    return out
  }

  const far = skyline(6, 13, 0.36, 0.64, 0)
  const mid = skyline(7, 14, 0.28, 0.52, 3)
  const near = skyline(9, 16, 0.3, 0.6, 12)

  let mega = near[0]!
  for (const b of near) {
    if (Math.abs(b.x + b.w / 2 - gw * 0.62) < Math.abs(mega.x + mega.w / 2 - gw * 0.62)) mega = b
  }
  mega.w = Math.max(mega.w, Math.round(14 * k))
  mega.y = Math.round(gh * 0.24)

  const sky = `url(#city-sky-${part})`
  const out: string[] = []

  out.push(
    `<defs><linearGradient id="city-sky-${part}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${n(h)}">` +
      pal.sky.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
      `</linearGradient><filter id="city-glow-${part}" filterUnits="userSpaceOnUse" x="0" y="0" width="${n(w)}" height="${n(h)}">` +
      `<feGaussianBlur stdDeviation="${n(px * 1.2)}"/></filter></defs>`,
    `<rect width="${n(w)}" height="${n(h)}" fill="${sky}"/>`,
  )

  if (pal.stars) {
    const sr = mulberry32(0x57a2)
    let still = ''
    for (let i = 0; i < pal.stars; i++) {
      const x = int(sr, 0, gw - 1)
      const y = int(sr, 0, Math.round(gh * 0.55))
      if (i % 5 === 0) out.push(rect(x, y, 1, 1, '#FFFFFF', '', blink('1;0.2;1', 2 + (i % 3), (i * 0.37) % 3)))
      else still += R(x, y, 1, 1)
    }
    out.push(path(still, '#DCE6FF', ` opacity="${part === 'night' ? 0.8 : 0.45}"`))
  }

  const disc = (cx: number, cy: number, r: number): string => {
    let d = ''
    for (let y = -r; y < r; y++) {
      const half = Math.round(Math.sqrt(r * r - (y + 0.5) * (y + 0.5)))
      if (half > 0) d += R(cx - half, cy + y, half * 2, 1)
    }
    return d
  }

  if (part === 'night') {
    const cx = Math.round(gw * 0.14)
    const cy = Math.round(gh * 0.22)
    const r = Math.max(3, Math.round(gh * 0.08))
    out.push(
      path(disc(cx, cy, r + 2), '#E8E4FF', ' opacity="0.12"'),
      path(disc(cx, cy, r), '#F1EED8'),
      path(R(cx - 1, cy - 1, 1, 1) + R(cx + 1, cy + 1, 2, 1) + R(cx - 2, cy + 2, 1, 1), '#C9C4A8'),
    )
  } else {
    const at = { dawn: [0.22, 0.44, 0.17], day: [0.8, 0.22, 0.09], dusk: [0.86, 0.44, 0.19] }[part]
    const cx = Math.round(gw * at[0]!)
    const cy = Math.round(gh * at[1]!)
    const r = Math.max(3, Math.round(gh * at[2]!))
    const [halo, core] = ({ dawn: ['#FFB35C', '#FFD890'], day: ['#FFF6C9', '#FFFDF0'], dusk: ['#FF7A3D', '#FFB65C'] } as const)[part]
    out.push(path(disc(cx, cy, r + Math.max(2, Math.round(r / 3))), halo, ' opacity="0.25"'), path(disc(cx, cy, r), core))
    if (part !== 'day') {
      let bands = ''
      for (let y = 2, s = 1; y < r; y += 2 + s, s++) bands += R(cx - r, cy + y, r * 2, s)
      out.push(path(bands, sky))
    }
  }

  const layer = (bs: Building[], fill: string, roof: (b: Building) => string): string =>
    path(bs.map((b) => R(b.x, b.y, b.w, gh - b.y) + roof(b)).join(''), fill)

  out.push(
    layer(far, pal.far, (b) => (geo() < 0.35 ? R(b.x + 2, b.y - 2, Math.max(1, b.w - 4), 2) : '')),
    `<rect y="${n(h * 0.6)}" width="${n(w)}" height="${n(h * 0.4)}" fill="${sky}" opacity="0.35"/>`,
    layer(mid, pal.mid, (b) => (geo() < 0.3 ? R(b.x + 1, b.y - 1, Math.max(1, Math.floor(b.w / 3)), 1) : '')),
  )

  const flicker: string[] = []
  const windows = (bs: Building[], step: number, ww: number, op: number): string => {
    // Windows are 1px-tall strokes: "M12 30.5h2" is far shorter than a filled subpath.
    const byColor = pal.win.map(() => '')
    for (const b of bs) {
      for (let y = b.y + 2; y < gh - 2; y += step) {
        for (let x = b.x + 2; x + ww <= b.x + b.w - 1; x += ww + 1) {
          if (x < 0 || x >= gw || lightRng() >= pal.lit) continue
          const c = Math.floor(lightRng() * pal.win.length)
          if (flicker.length < 6 && lightRng() < 0.04) {
            const i = flicker.length
            flicker.push(rect(x, y, ww, 1, pal.win[c]!, ` opacity="${op}"`, blink(`${op};${op};0.1;${op};0.2;${op}`, 3 + i * 1.3, i * 0.9)))
          } else byColor[c] += `M${P(x)} ${P(y + 0.5)}h${P(ww)}`
        }
      }
    }
    return pal.win
      .map((c, i) => (byColor[i] ? `<path d="${byColor[i]}" stroke="${c}" stroke-width="${px}" opacity="${op}"/>` : ''))
      .join('')
  }

  out.push(windows(mid, 3, 1, Math.round(pal.winOp * 0.7 * 10) / 10))

  const car = (i: number): string => {
    const y = Math.round(gh * [0.2, 0.34, 0.12, 0.46]![i]!)
    const dur = [11, 15, 8.5, 19][i]!
    const rtl = i % 2 === 1
    const from = rtl ? gw + 12 : -12
    const to = rtl ? -12 : gw + 12
    const front = rtl ? 0 : 5
    const back = rtl ? 5 : 0
    const L = pal.lights
    const g =
      path(R(0, 1, 6, 1) + R(rtl ? 1 : 2, 0, 3, 1), pal.body) +
      rect(back, 1, 1, 1, '#FF2A3D', ` opacity="${L}"`) +
      rect(front, 1, 1, 1, '#FFF6C0', ` opacity="${L}"`) +
      rect(rtl ? -4 : 6, 1, 4, 1, '#FFF6C0', ` opacity="${n(L * 0.25)}"`)
    return (
      `<g transform="translate(${P(from)} ${P(y)})">` + g +
      `<animateTransform attributeName="transform" type="translate" from="${P(from)} ${P(y)}" to="${P(to)} ${P(y)}" dur="${n(dur)}s" begin="${n(i * 2.3)}s" repeatCount="indefinite"/></g>`
    )
  }
  const carCount = part === 'day' ? 2 : 4
  for (let i = 0; i < Math.min(carCount, 3); i++) out.push(car(i))

  let antennas = ''
  let beacons = ''
  const roof = (b: Building): string => {
    if (b === mega) {
      const sx = b.x + Math.floor(b.w / 2)
      beacons += R(sx, b.y - 12, 1, 1)
      return R(b.x + 2, b.y - 2, b.w - 4, 2) + R(b.x + 4, b.y - 4, b.w - 8, 2) + R(sx, b.y - 11, 1, 7)
    }
    if (geo() < 0.45) {
      const ax = b.x + int(geo, 2, b.w - 3)
      const ah = int(geo, 3, 6)
      beacons += R(ax, b.y - ah - 1, 1, 1)
      antennas += R(ax - 1, b.y - 1, 3, 1)
      return R(ax, b.y - ah, 1, ah)
    }
    return ''
  }
  out.push(layer(near, pal.near, roof), path(antennas, pal.near))
  out.push(`<g>${path(beacons, '#FF2A3D')}${blink('1;1;0.1;1', 2.4, 0)}</g>`)
  out.push(windows(near, 3, 2, pal.winOp))
  out.push(...flicker)

  const signs: [number, number, number, number, string][] = []
  near.forEach((b, i) => {
    if (b === mega) {
      signs.push([b.x + 1, b.y + 4, 1, 10, PINK], [b.x + b.w - 2, b.y + 6, 1, 8, CYAN])
      return
    }
    if (i % 2 === 0 || b.y > gh - 8) return
    const c = NEON[i % 3]!
    signs.push(geo() < 0.5 ? [b.x + 1, b.y + 3, 1, int(geo, 4, 7), c] : [b.x + 2, b.y + 2, Math.min(b.w - 4, int(geo, 4, 6)), 1, c])
  })
  const glow = `url(#city-glow-${part})`
  const signRects = (s: [number, number, number, number, string][]): string =>
    s.map(([x, y, sw, sh, c]) => rect(x, y, sw, sh, c)).join('')
  const steady = signs.slice(1)
  const wobbly = signs.slice(0, 1)
  out.push(
    `<g filter="${glow}" opacity="${pal.glow}">${signRects(steady)}</g>`,
    `<g opacity="${pal.neon}">${signRects(steady)}</g>`,
    `<g opacity="${pal.neon}">${blink('1;1;1;1;0.15;1;0.3;1;1', 6, 1.1)}<g filter="${glow}" opacity="${pal.glow}">${signRects(wobbly)}</g>${signRects(wobbly)}</g>`,
  )

  let host: Building | undefined
  for (const b of near) {
    if (b !== mega && b.x >= 0 && b.x + b.w <= gw && b.y < gh - 10 && (!host || b.w > host.w)) host = b
  }
  if (host) {
    const bw = Math.min(10, host.w - 2)
    const bx = host.x + Math.floor((host.w - bw) / 2)
    const by = host.y + 3
    const bh = 5
    let bars = ''
    for (let copy = 0; copy < 2; copy++) {
      ;[PINK, CYAN, VIOLET].forEach((c, j) => {
        bars += rect(bx + 1, by + 1 + copy * 6 + j * 2, bw - 2 - ((j * 2 + 1) % 4), 1, c)
      })
    }
    const steps = [0, 1, 2, 3, 4, 5].map((s) => `0 ${P(-s)}`).join(';')
    out.push(
      `<clipPath id="city-bb-${part}">${rect(bx, by, bw, bh, '#000')}</clipPath>`,
      rect(bx - 1, by - 1, bw + 2, bh + 2, CYAN, ` opacity="${n(pal.glow * 0.35)}"`),
      rect(bx, by, bw, bh, '#0A0A1E', ' opacity="0.9"'),
      `<g clip-path="url(#city-bb-${part})" opacity="${n(Math.max(0.5, pal.neon * 0.9))}"><g>${bars}` +
        `<animateTransform attributeName="transform" type="translate" values="${steps}" calcMode="discrete" dur="2.4s" begin="0s" repeatCount="indefinite"/></g></g>`,
      rect(bx, by + bh - 1, bw, 1, '#FFFFFF', ' opacity="0.15"', blink('0.05;0.3;0.05', 1.7, 0.4)),
    )
  }

  if (carCount > 3) out.push(car(3))

  if (pal.rain) {
    let d = ''
    const rr = mulberry32(0x7a1)
    const drop = Math.round(gh / 4)
    for (let i = 0; i < 14; i++) {
      const x = int(rr, 0, gw + drop)
      const y = int(rr, 0, gh - 1)
      d += `M${P(x)} ${P(y)}l${P(-1)} ${P(3)}M${P(x + drop)} ${P(y - gh)}l${P(-1)} ${P(3)}`
    }
    out.push(
      `<g stroke="#9FC4FF" stroke-width="${P(0.6)}" opacity="0.35"><path d="${d}"/>` +
        `<animateTransform attributeName="transform" type="translate" from="0 0" to="${P(-drop)} ${P(gh)}" dur="0.9s" begin="0s" repeatCount="indefinite"/></g>`,
    )
  }

  return out.join('')
}
