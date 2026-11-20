export type Daypart = 'dawn' | 'day' | 'dusk' | 'night'

type Tint = { light: string; mid: string; shade: string; grey: string; fog: string }

const TINTS: Record<Daypart, Tint> = {
  dawn: { light: '#FFC9B8', mid: '#E8919A', shade: '#A25F82', grey: '#7E6178', fog: '#F2AFA4' },
  day: { light: '#FFFFFF', mid: '#E2E9F1', shade: '#AFBDCC', grey: '#8D96A4', fog: '#E6EBF0' },
  dusk: { light: '#FFB792', mid: '#E07F80', shade: '#8A4B6F', grey: '#634A65', fog: '#EE9A84' },
  night: { light: '#3E3966', mid: '#25213F', shade: '#13112A', grey: '#0C0B1C', fog: '#2A2745' },
}

type Plan = {
  clouds: number; wMin: number; wMax: number; hMin: number; hMax: number; yMin: number; yMax: number
  deck: number; dur: number; op: number; wisp: boolean
}

const SKY_PLANS: Plan[] = [
  { clouds: 0, wMin: 0, wMax: 0, hMin: 0, hMax: 0, yMin: 0, yMax: 0, deck: 0, dur: 160, op: 0.8, wisp: true },
  { clouds: 3, wMin: 16, wMax: 26, hMin: 4, hMax: 6, yMin: 2, yMax: 14, deck: 0, dur: 140, op: 0.85, wisp: true },
  { clouds: 5, wMin: 20, wMax: 36, hMin: 5, hMax: 8, yMin: 2, yMax: 20, deck: 0, dur: 120, op: 0.9, wisp: false },
  { clouds: 6, wMin: 24, wMax: 44, hMin: 6, hMax: 10, yMin: 5, yMax: 24, deck: 7, dur: 100, op: 0.95, wisp: false },
  { clouds: 6, wMin: 30, wMax: 50, hMin: 7, hMax: 11, yMin: 12, yMax: 28, deck: 15, dur: 80, op: 1, wisp: false },
]

const NIGHT_PLANS: Plan[] = [
  { clouds: 2, wMin: 20, wMax: 30, hMin: 3, hMax: 5, yMin: 2, yMax: 10, deck: 0, dur: 150, op: 0.5, wisp: false },
  { clouds: 4, wMin: 20, wMax: 34, hMin: 4, hMax: 7, yMin: 0, yMax: 10, deck: 0, dur: 110, op: 0.85, wisp: false },
  { clouds: 5, wMin: 24, wMax: 40, hMin: 5, hMax: 8, yMin: 2, yMax: 12, deck: 4, dur: 80, op: 0.95, wisp: false },
  { clouds: 5, wMin: 28, wMax: 46, hMin: 6, hMax: 9, yMin: 4, yMax: 14, deck: 8, dur: 55, op: 1, wisp: false },
  { clouds: 6, wMin: 30, wMax: 50, hMin: 6, hMax: 10, yMin: 6, yMax: 16, deck: 12, dur: 35, op: 1, wisp: false },
]

// [count, slant (dx per dy), streak length, fall duration]
const RAIN: [number, number, number, number][] = [
  [0, 0, 0, 1], [30, 0.2, 3, 0.9], [50, 0.3, 4, 0.8], [75, 0.45, 4, 0.7], [110, 0.65, 5, 0.55],
]

// [bolts, period of the first bolt]; each later bolt gets a longer, offset period
const STORM: [number, number][] = [[0, 0], [0, 0], [1, 9], [2, 6.5], [3, 3.7]]

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
const k2 = (v: number): string => String(Math.round(v * 100) / 100)

function mix(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16)
  const cb = parseInt(b.slice(1), 16)
  let out = '#'
  for (const s of [16, 8, 0]) {
    const v = Math.round(((ca >> s) & 255) * (1 - t) + ((cb >> s) & 255) * t)
    out += v.toString(16).padStart(2, '0')
  }
  return out.toUpperCase()
}

const bucketOf = (i: number): number => (i < 0.2 ? 0 : i < 0.4 ? 1 : i < 0.6 ? 2 : i < 0.85 ? 3 : 4)

export function weather(w: number, h: number, part: Daypart, intensity: number): string {
  const b = bucketOf(Number.isFinite(intensity) ? intensity : 0)
  const px = Math.max(1, Math.round(h / 54))
  const gw = Math.ceil(w / px)
  const gh = Math.ceil(h / px)
  const k = gh / 54
  const P = (v: number): string => n(v * px)
  const R = (x: number, y: number, rw: number, rh: number): string =>
    rw > 0 && rh > 0 ? `M${P(x)} ${P(y)}h${P(rw)}v${P(rh)}h${P(-rw)}z` : ''
  const night = part === 'night'
  const rng = mulberry32(0x3e47 + ['dawn', 'day', 'dusk', 'night'].indexOf(part) * 7919 + b * 104729)
  const int = (lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1))
  const id = (s: string): string => `wx-${part}-${b}-${s}`
  const plan = (night ? NIGHT_PLANS : SKY_PLANS)[b]!
  const T = TINTS[part]
  const grey = night ? 0 : [0, 0.1, 0.25, 0.45, 0.6][b]!
  const light = mix(T.light, T.grey, grey)
  const mid = mix(T.mid, T.grey, grey)
  const shade = mix(T.shade, T.grey, grey * 0.8)
  const defs: string[] = []
  const out: string[] = []

  // Clouds are flat-bottomed unions of domes, emitted as horizontal pixel runs per row.
  const cloud = (x0: number, y0: number, cw: number, ch: number): string => {
    const hgt = new Array<number>(cw).fill(0)
    const puffs = 2 + Math.floor(cw / 14)
    for (let p = 0; p < puffs; p++) {
      const r = ch * (0.55 + rng() * 0.45)
      const cx = r + rng() * Math.max(0, cw - 2 * r)
      for (let c = 0; c < cw; c++) {
        const d = c + 0.5 - cx
        const v = Math.min(ch, Math.round(Math.sqrt(Math.max(0, r * r - d * d))))
        if (v > (hgt[c] ?? 0)) hgt[c] = v
      }
    }
    for (let c = 1; c < cw - 1; c++) hgt[c] = Math.max(hgt[c] ?? 0, 2)
    let d = ''
    for (let row = 0; row < ch; row++) {
      let start = -1
      for (let c = 0; c <= cw; c++) {
        const on = c < cw && (hgt[c] ?? 0) > row
        if (on && start < 0) start = c
        if (!on && start >= 0) {
          d += R(x0 + start, y0 + ch - 1 - row, c - start, 1)
          start = -1
        }
      }
    }
    return d
  }

  // A layer is drawn twice, one width apart, and slid by one width so the loop is seamless.
  // Shading reuses one fill-less path: shadow below, light body, mid body offset (1,1)
  // which leaves a light rim along the top-left edges.
  const drift = (d: string, name: string, dur: number, op: number, shaded = true, fill = light): string => {
    if (!d) return ''
    defs.push(`<path id="${id(name)}" d="${d}"/>`)
    const ref = `href="#${id(name)}"`
    const body = shaded
      ? `<use ${ref} fill="${shade}" transform="translate(0 ${P(2)})"/><use ${ref} fill="${light}"/><use ${ref} fill="${mid}" transform="translate(${P(1)} ${P(1)})"/>`
      : `<use ${ref} fill="${fill}"/>`
    return (
      `<g opacity="${n(op)}"><g>${body}</g><g transform="translate(${P(-gw)} 0)">${body}</g>` +
      `<animateTransform attributeName="transform" type="translate" from="0 0" to="${P(gw)} 0" dur="${n(dur)}s" begin="0s" repeatCount="indefinite"/></g>`
    )
  }

  if (!night && b >= 3) {
    out.push(`<rect width="${n(w)}" height="${n(h * 0.55)}" fill="${T.grey}" opacity="${b === 4 ? 0.3 : 0.2}"/>`)
  }

  if (plan.wisp) {
    const x = int(0, gw - 40)
    const y = int(3, Math.round(10 * k))
    const d = R(x + 6, y, int(14, 20), 1) + R(x, y + 1, int(28, 36), 1) + R(x + 12, y + 2, int(10, 16), 1)
    out.push(drift(d, 'wisp', plan.dur * 1.4, 0.55, false, light))
  }

  const back: string[] = []
  const front: string[] = []
  for (let i = 0; i < plan.clouds; i++) {
    const cw = Math.round(int(plan.wMin, plan.wMax) * k)
    const ch = Math.round(int(plan.hMin, plan.hMax) * k)
    // Spread clouds across the width so the loop never shows a long empty stretch.
    const x = Math.round(((i + rng() * 0.6) / plan.clouds) * gw)
    const y = Math.round(int(plan.yMin, plan.yMax) * k)
    ;(i % 2 ? front : back).push(cloud(x, y, cw, ch))
  }
  out.push(drift(back.join(''), 'cb', plan.dur * 1.5, plan.op * 0.85), drift(front.join(''), 'cf', plan.dur, plan.op))

  if (plan.deck) {
    const depth = Math.round(plan.deck * k)
    let d = R(0, -2, gw, depth + 2)
    for (let x = 0; x < gw; ) {
      const step = Math.min(int(3, 8), gw - x)
      d += R(x, depth, step, int(0, Math.round(depth * 0.6) + 2))
      x += step
    }
    out.push(drift(d, 'deck', plan.dur * 1.2, plan.op))
  }

  if (!night && b >= 2) {
    const fog = mix(T.fog, T.grey, grey * 0.5)
    if (b === 4) out.push(`<rect y="${P(gh * 0.68)}" width="${n(w)}" height="${n(h * 0.33)}" fill="${fog}" opacity="0.4"/>`)
    const bands = b === 2 ? 1 : b === 3 ? 2 : 3
    for (let i = 0; i < bands; i++) {
      const top = Math.round(gh * (b === 4 ? 0.58 : 0.78) + i * 4 * k)
      let d = ''
      for (let x = 0; x < gw; ) {
        const step = Math.min(int(5, 12), gw - x)
        const j = int(0, 3)
        d += R(x, top - j, step, gh - top + j)
        x += step
      }
      const lo = [0, 0, 0.15, 0.2, 0.25][b]!
      const hi = lo + 0.1
      const sw = `<animate attributeName="opacity" values="${n(lo)};${n(hi)};${n(lo)}" dur="${n(9 + i * 4)}s" begin="0s" repeatCount="indefinite"/>`
      const bob = `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${P(-2)};0 0" dur="${n(13 + i * 5)}s" begin="0s" repeatCount="indefinite"/>`
      out.push(`<g>${sw}${bob}${drift(d, `fog${i}`, 70 + i * 25, 1, false, fog)}</g>`)
    }
  }

  if (night) {
    const [count, slant, len, dur] = RAIN[b]!
    if (count) {
      const dx = slant * gh
      const streaks = (c: number, l: number): string => {
        let d = ''
        for (let i = 0; i < c; i++) {
          const x = int(0, Math.ceil(gw + dx))
          const y = int(0, gh - 1)
          const seg = `l${P(-slant * l)} ${P(l)}`
          d += `M${P(x)} ${P(y)}${seg}M${P(x + dx)} ${P(y - gh)}${seg}`
        }
        return d
      }
      const layer = (c: number, l: number, sw: number, op: number, du: number): string =>
        `<g stroke="#9FC4FF" stroke-width="${P(sw)}" opacity="${n(op)}"><path d="${streaks(c, l)}"/>` +
        `<animateTransform attributeName="transform" type="translate" from="0 0" to="${P(-dx)} ${P(gh)}" dur="${n(du)}s" begin="0s" repeatCount="indefinite"/></g>`
      const far = Math.round(count * 0.4)
      out.push(layer(far, len - 1, 0.6, 0.3, dur * 1.3), layer(count - far, len, b === 4 ? 1 : 0.7, 0.5, dur))
    }

    if (b >= 3) {
      const groups = b === 4 ? 4 : 2
      for (let g = 0; g < groups; g++) {
        let d = ''
        for (let i = 0; i < (b === 4 ? 8 : 5); i++) {
          const x = int(1, gw - 2)
          d += R(x - 1, gh - 3, 1, 1) + R(x + 1, gh - 3, 1, 1) + R(x - 1, gh - 1, 3, 1)
        }
        out.push(
          `<path d="${d}" fill="#BFD6FF" opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="${n(0.5 + g * 0.1)}s" begin="${n(g * 0.13)}s" repeatCount="indefinite"/></path>`,
        )
      }
    }

    const [bolts, period] = STORM[b]!
    for (let i = 0; i < bolts; i++) {
      let x = int(Math.round(gw * 0.15), Math.round(gw * 0.85))
      let y = Math.round((plan.deck + 2) * k)
      const pts = [`${P(x)},${P(y)}`]
      let branch = ''
      while (y < gh * 0.72) {
        x += int(-4, 4)
        y += int(3, 6)
        pts.push(`${P(x)},${P(y)}`)
        if (!branch && rng() < 0.3) branch = `${P(x)},${P(y)} ${P(x + int(3, 6))},${P(y + int(3, 5))} ${P(x + int(5, 9))},${P(y + int(7, 10))}`
      }
      const line = (p: string): string =>
        `<polyline points="${p}" stroke="#B9A8FF" stroke-width="${P(3)}" opacity="0.4"/><polyline points="${p}" stroke="#F6F4FF" stroke-width="${P(1)}"/>`
      const f = 0.1 + rng() * 0.7
      const double = b === 4 && i !== 1
      const [values, times] = double
        ? ['0;0;1;0.2;0;1;0;0', [0, f, f + 0.01, f + 0.02, f + 0.04, f + 0.05, f + 0.08, 1]]
        : ['0;0;1;0.3;0;0', [0, f, f + 0.01, f + 0.02, f + 0.04, 1]]
      out.push(
        `<g opacity="0" fill="none"><rect width="${n(w)}" height="${n(h)}" fill="#FFFFFF" opacity="${b === 4 ? 0.6 : 0.4}"/>` +
          line(pts.join(' ')) + (branch ? line(branch) : '') +
          `<animate attributeName="opacity" values="${values}" keyTimes="${times.map(k2).join(';')}" dur="${n(period + i * 2.3)}s" begin="${n(i * 0.7)}s" repeatCount="indefinite"/></g>`,
      )
    }
  }

  return (defs.length ? `<defs>${defs.join('')}</defs>` : '') + out.join('')
}
