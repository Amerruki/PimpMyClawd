import { makeColors } from './make-colors.js'
import { grade, H, n, seeded, svg, W } from './kit'
import type { Look } from './look'

// Binary rain: columns of 0s and 1s streaming down (and a few up) at three
// depths, each with a bright head and a fading trail, digits flickering as
// they change. One generator, one hue per look. Night is the classic glow on
// black; day is the same rain as a pale tint on paper.

type Hue = {
  id: string
  label: string
  // Night rain and the night accent.
  glow: string
  // A softer second tone for far columns at night.
  deep: string
  // Day ink and the day accent.
  ink: string
  // Surface tint for both modes.
  night: { s0: string; s1: string; s2: string; s3: string; t1: string; t2: string; t3: string }
  day: { s0: string; s1: string; s2: string; t1: string; t2: string; t3: string }
  pro: string
}

const DIGITS = 30

// How much of the day ink goes into the day digits; the rest is paper. The
// app stills a scene whose brightness swings too much, and dark digits
// streaming over pale paper did: 0.3 passes its check, 0.45 does not.
const DAY_RAIN = 0.25

function mixHex(a: string, b: string, share: number): string {
  const part = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)

  return `#${[0, 1, 2].map(i => Math.round(part(a, i) * share + part(b, i) * (1 - share)).toString(16).padStart(2, '0')).join('')}`
}

function column(rand: () => number): string {
  return Array.from({ length: DIGITS }, () => (rand() < 0.5 ? '0' : '1')).join('')
}

type Layer = { count: number; size: number; opacity: number; speed: [number, number]; sides: boolean; flicker: boolean }

// Kept cheap to draw on purpose: the app froze a heavier version after a few
// seconds. No masks and no blur on anything that moves; the trail fades by
// opacity steps on the digits themselves.
const LAYERS: Layer[] = [
  { count: 70, size: 11, opacity: 0.4, speed: [10, 17], sides: false, flicker: false },
  { count: 44, size: 17, opacity: 0.75, speed: [6, 11], sides: false, flicker: false },
  { count: 16, size: 25, opacity: 1, speed: [4.5, 8], sides: true, flicker: true },
]

// Opacity of each digit along a falling stream, tail first: faint to full.
const FADE = [0.06, 0.14, 0.26, 0.42, 0.62, 0.85]

// A stream's digits as text: tspans in opacity steps, the leading digit white.
function stream(digits: string, up: boolean, head: boolean, size: number, tone: string): string {
  const chars = up ? [...digits].reverse() : [...digits]
  const step = chars.length / FADE.length
  let body = ''

  FADE.forEach((o, k) => {
    let part = chars.slice(Math.round(k * step), Math.round((k + 1) * step))

    if (head && k === FADE.length - 1) {
      body += `<tspan fill-opacity="${o}">${part.slice(0, -1).join('')}</tspan><tspan class="c-head">${part[part.length - 1] ?? '1'}</tspan>`

      return
    }
    body += `<tspan fill-opacity="${o}">${part.join('')}</tspan>`
  })
  // A rising stream reads bottom to top, so its head is its first digit.
  if (up) {
    body = body.split('</tspan>').filter(t => t !== '').reverse().map(t => {
      const open = t.indexOf('>') + 1

      return `${t.slice(0, open)}${[...t.slice(open)].reverse().join('')}</tspan>`
    }).join('')
  }

  return `<text x="0" y="0" font-size="${size}" class="col ${tone}">${body}</text>`
}

function rain(seed: number): string {
  const rand = seeded(seed)

  return LAYERS.map((L, li) => {
    const cols = Array.from({ length: L.count }, (_, i) => {
      // Near columns stay at the sides, clear of the chat.
      const x = L.sides ? (i % 2 === 0 ? 20 + rand() * 360 : 1220 + rand() * 360) : (i + rand() * 0.8) * (W / L.count)
      const up = rand() < 0.18
      const dur = L.speed[0] + rand() * (L.speed[1] - L.speed[0])
      const delay = rand() * dur
      const len = L.size * 1.05 * DIGITS
      const a = up ? H + 40 : -len
      const b = up ? -len : H + 40
      const tone = li === 0 ? 'c-far' : 'c-trail'
      const head = li > 0
      // Two strings of digits swapped in steps: the near streams flicker.
      // Both halves share one offset, so exactly one shows at any moment.
      const flip = `style="animation-delay:-${n(rand() * 1.6)}s"`
      const digits = L.flicker
        ? `<g class="flip-a" ${flip}>${stream(column(rand), up, head, L.size, tone)}</g><g class="flip-b" ${flip}>${stream(column(rand), up, head, L.size, tone)}</g>`
        : stream(column(rand), up, head, L.size, tone)

      return `<g transform="translate(${n(x)} 0)"><g class="fall" style="--a:${n(a)}px;--b:${n(b)}px;animation-duration:${n(dur)}s;animation-delay:-${n(delay)}s">${digits}</g></g>`
    }).join('')

    return `<g opacity="${L.opacity}">${cols}</g>`
  }).join('')
}

function build(h: Hue, seed: number): Look {
  const { theme, problems } = makeColors({
    label: h.label,
    roles: { accent: h.glow, danger: '#ff4a4a', success: '#3ddc84', warning: '#f0b429', pro: h.pro },
    codeTheme: { light: 'github-light', dark: 'github-dark' },
    light: {
      roles: { accent: h.ink },
      gray: {
        anchors: {
          'surface-0': h.day.s0,
          'surface-1': h.day.s1,
          'surface-2': h.day.s2,
          'text-primary': h.day.t1,
          'text-secondary': h.day.t2,
          'text-muted': h.day.t3,
        },
      },
    },
    dark: {
      gray: {
        anchors: {
          'surface-0': h.night.s0,
          'surface-1': h.night.s1,
          'surface-2': h.night.s2,
          'surface-3': h.night.s3,
          'text-primary': h.night.t1,
          'text-secondary': h.night.t2,
          'text-muted': h.night.t3,
        },
      },
    },
  })

  const dayRain = mixHex(h.ink, h.day.s2, DAY_RAIN)
  const css = `
:root, svg { --bg0: ${h.day.s2}; --bg1: ${h.day.s0}; --head: ${dayRain}; --trail: ${dayRain}; --trail-far: ${dayRain}; --glow: ${h.ink}; --glow-op: .18; --veil: ${h.day.s2}; }
@media (prefers-color-scheme: dark) {
  :root, svg { --bg0: ${h.night.s1}; --bg1: ${h.night.s0}; --head: #ffffff; --trail: ${h.glow}; --trail-far: ${h.deep}; --glow: ${h.glow}; --glow-op: .55; --veil: ${h.night.s0}; }
}
.bg0 { stop-color: var(--bg0); } .bg1 { stop-color: var(--bg1); }
.c-trail { fill: var(--trail); } .c-far { fill: var(--trail-far); } .c-head { fill: var(--head); }
.v0 { stop-color: var(--veil); stop-opacity: 0; } .v1 { stop-color: var(--veil); stop-opacity: .72; }
.col { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 600; writing-mode: vertical-rl; text-orientation: upright; letter-spacing: .05em; }
.fall { animation: fall linear infinite; }
@keyframes fall { from { transform: translateY(var(--a)); } to { transform: translateY(var(--b)); } }
.flip-a { animation: flip 1.6s steps(1) infinite; }
.flip-b { animation: flop 1.6s steps(1) infinite; }
@keyframes flip { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes flop { 0% { opacity: 0; } 50% { opacity: 1; } }
`
  const defs =
    '<linearGradient id="mx-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="bg0"/><stop offset="1" class="bg1"/></linearGradient>' +

    // Dims the middle of the frame, where the chat sits.
    '<linearGradient id="mx-calm" x1="0" y1="0" x2="1" y2="0"><stop offset=".2" class="v0"/><stop offset=".38" class="v1"/><stop offset=".62" class="v1"/><stop offset=".8" class="v0"/></linearGradient>'
  const scene = svg(
    css,
    defs,
    `<rect width="${W}" height="${H}" fill="url(#mx-bg)"/>${rain(seed)}<rect width="${W}" height="${H}" fill="url(#mx-calm)"/>${grade([W / 2, -200], h.glow, '#000000', 0.6)}`,
  )

  return {
    label: h.label,
    args: { colors: theme, backdrop: { scene: h.id, glass: { blur: 14, opacity: 0.55 } } },
    problems,
    scene,
  }
}

export const MATRIX = build(
  {
    id: 'matrix',
    label: 'Matrix',
    glow: '#3dff7a',
    deep: '#1f9e4a',
    ink: '#0d7a3a',
    night: { s0: '#030a05', s1: '#06120a', s2: '#0a1a0f', s3: '#0e2114', t1: '#d6ffe2', t2: '#9fdcb2', t3: '#6fae84' },
    day: { s0: '#e6efe8', s1: '#eef5f0', s2: '#f6faf7', t1: '#0c2614', t2: '#2a4a33', t3: '#476652' },
    pro: '#38d6c4',
  },
  101,
)

export const MATRIX_ORANGE = build(
  {
    id: 'matrix-orange',
    label: 'Matrix (orange)',
    glow: '#d97757',
    deep: '#9a4f36',
    ink: '#b4502e',
    night: { s0: '#0c0705', s1: '#140c08', s2: '#1b110c', s3: '#221610', t1: '#ffe6dc', t2: '#e4bba9', t3: '#b98b77' },
    day: { s0: '#f1e9e4', s1: '#f6f0ec', s2: '#fbf8f5', t1: '#2a140c', t2: '#4d3125', t3: '#6b4d40' },
    pro: '#e8a23a',
  },
  202,
)

export const MATRIX_MAGENTA = build(
  {
    id: 'matrix-magenta',
    label: 'Matrix (magenta)',
    glow: '#ff3fd2',
    deep: '#a3238a',
    ink: '#a81c87',
    night: { s0: '#0b040a', s1: '#130811', s2: '#1a0c18', s3: '#21101f', t1: '#ffe0f7', t2: '#e2b2d6', t3: '#b583a9' },
    day: { s0: '#f1e7ef', s1: '#f6eff4', s2: '#fbf7fa', t1: '#2a0c24', t2: '#4b2944', t3: '#69475f' },
    pro: '#8a6cff',
  },
  303,
)

export const MATRIX_CYAN = build(
  {
    id: 'matrix-cyan',
    label: 'Matrix (cyan)',
    glow: '#22e6ff',
    deep: '#138da0',
    ink: '#0a7a94',
    night: { s0: '#03090b', s1: '#061014', s2: '#0a171c', s3: '#0e1d23', t1: '#dcfaff', t2: '#a6d8e2', t3: '#77a9b4' },
    day: { s0: '#e5eef1', s1: '#edf4f6', s2: '#f6fafb', t1: '#0b2229', t2: '#29454e', t3: '#46636c' },
    pro: '#4d8cff',
  },
  404,
)
