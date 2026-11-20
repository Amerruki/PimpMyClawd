import { n } from './kit'

// The orrery's camera. The ecliptic is the plane Z = 0 with the Sun at the
// origin; X runs right and Y away from the viewer. The camera hangs above
// the plane at elevation PHI, looking at a target point to the right of the
// Sun, so the Sun sits at the left of the frame and the outer orbits sweep
// across it. A true perspective projection: far arcs shrink and rise, near
// arcs grow and fall, and each orbit comes out as an exact ellipse with the
// Sun off its centre, as it would through a real lens.
const PHI = (24 * Math.PI) / 180
const S = Math.sin(PHI)
const C = Math.cos(PHI)
const TX = 550
const D = 3900
const SCX = 800
const SCY = 450

// Screen position of a world point and its scale relative to the Sun's depth.
export function proj(x: number, y: number, z = 0): readonly [number, number, number] {
  const depth = y * C + D - z * S
  const f = D / depth

  return [SCX + (x - TX) * f, SCY - (y * S + z * C) * f, f] as const
}

export const SUN = proj(0, 0)

// Sun-centred world radius of each orbit. Real semi-major axes in AU,
// compressed by a square root so Venus and Neptune share one frame.
export const AU = (a: number): number => 238 * Math.sqrt(a)

// Orbital period from the real one in years, compressed the same way, so
// the order and the ratios' direction hold: the inner planets lap quickly,
// Neptune crawls.
export const PERIOD = (years: number): number => 60 * Math.sqrt(years)

export type Ellipse = { cx: number; cy: number; rx: number; ry: number; rot: number }

// The exact screen ellipse of a circular orbit: a least-squares conic
// through points on the projected circle, then its centre, axes and angle.
export function orbitEllipse(r: number): Ellipse {
  const [ox, oy] = SUN
  const rows: number[][] = []

  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2
    const [sx, sy] = proj(r * Math.cos(t), r * Math.sin(t))
    const x = (sx - ox) / 1000
    const y = (sy - oy) / 1000
    rows.push([x * x, x * y, y * y, x, y])
  }

  const m = Array.from({ length: 5 }, () => new Array<number>(6).fill(0))

  for (const row of rows) {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        m[i]![j]! += row[i]! * row[j]!
      }
      m[i]![5]! += row[i]!
    }
  }

  for (let i = 0; i < 5; i++) {
    let p = i
    for (let k = i + 1; k < 5; k++) {
      if (Math.abs(m[k]![i]!) > Math.abs(m[p]![i]!)) {
        p = k
      }
    }
    ;[m[i], m[p]] = [m[p]!, m[i]!]
    for (let k = 0; k < 5; k++) {
      if (k !== i) {
        const f = m[k]![i]! / m[i]![i]!
        for (let j = i; j < 6; j++) {
          m[k]![j]! -= f * m[i]![j]!
        }
      }
    }
  }

  const [A, B, Cc, Dd, E] = m.map((row, i) => row[5]! / row[i]!) as [number, number, number, number, number]
  const det = 4 * A * Cc - B * B
  const x0 = (B * E - 2 * Cc * Dd) / det
  const y0 = (B * Dd - 2 * A * E) / det
  const f0 = A * x0 * x0 + B * x0 * y0 + Cc * y0 * y0 + Dd * x0 + E * y0 - 1
  const th = 0.5 * Math.atan2(B, A - Cc)
  const la = A * Math.cos(th) ** 2 + B * Math.cos(th) * Math.sin(th) + Cc * Math.sin(th) ** 2
  const lb = A * Math.sin(th) ** 2 - B * Math.cos(th) * Math.sin(th) + Cc * Math.cos(th) ** 2

  return {
    cx: ox + x0 * 1000,
    cy: oy + y0 * 1000,
    rx: Math.sqrt(-f0 / la) * 1000,
    ry: Math.sqrt(-f0 / lb) * 1000,
    rot: (th * 180) / Math.PI,
  }
}

export function ellipseEl(e: Ellipse, attrs: string, inner = ''): string {
  const head = `<ellipse cx="${n(e.cx)}" cy="${n(e.cy)}" rx="${n(e.rx)}" ry="${n(e.ry)}" transform="rotate(${n(e.rot)} ${n(e.cx)} ${n(e.cy)})" ${attrs}`

  return inner ? `${head}>${inner}</ellipse>` : `${head}/>`
}

const deg = (a: number): number => (a * 180) / Math.PI

// Unwrap a list of angles in degrees so each step is the short way round.
function unwrap(list: number[]): number[] {
  for (let i = 1; i < list.length; i++) {
    while (list[i]! - list[i - 1]! > 180) {
      list[i]! -= 360
    }
    while (list[i]! - list[i - 1]! < -180) {
      list[i]! += 360
    }
  }

  return list
}

export type Track = {
  // SMIL value lists, one entry per sample, the last equal to the first.
  at: string
  scale: string
  // The direction from the body to the Sun on screen, in degrees.
  sun: number[]
  dur: number
  keyTimes?: string
}

// A body on a circular orbit, sampled at equal angles so it moves at an even
// angular rate (a constant-speed path would be wrong in perspective).
export function circularTrack(r: number, dur: number, phase: number, samples: number): Track {
  const at: string[] = []
  const scale: string[] = []
  const sun: number[] = []

  for (let i = 0; i <= samples; i++) {
    const t = phase + (i / samples) * Math.PI * 2
    const [sx, sy, k] = proj(r * Math.cos(t), r * Math.sin(t))
    at.push(`${n(sx)},${n(sy)}`)
    scale.push(n(k * 100) === '100' ? '1' : (Math.round(k * 1000) / 1000).toString())
    sun.push(deg(Math.atan2(SUN[1] - sy, SUN[0] - sx)))
  }

  return { at: at.join(';'), scale: scale.join(';'), sun: unwrap(sun), dur }
}

// SMIL for a track: the motion on the outer group and the perspective scale
// on the inner one.
export function moving(track: Track, content: string, begin = 0): string {
  const kt = track.keyTimes ? ` keyTimes="${track.keyTimes}"` : ''
  const b = begin ? ` begin="-${n(begin)}s"` : ''

  return (
    `<g><animateMotion dur="${n(track.dur)}s" repeatCount="indefinite" calcMode="linear"${kt}${b} values="${track.at}"/>` +
    `<g><animateTransform attributeName="transform" type="scale" dur="${n(track.dur)}s" repeatCount="indefinite" calcMode="linear"${kt}${b} values="${track.scale}"/>` +
    content +
    `</g></g>`
  )
}

// A rotate animation that keeps a group's +x axis on the Sun, less `offset`
// degrees for a body drawn inside an already rotated frame.
export function faceSun(track: Track, offset = 0, begin = 0): string {
  const kt = track.keyTimes ? ` keyTimes="${track.keyTimes}"` : ''
  const b = begin ? ` begin="-${n(begin)}s"` : ''

  return `<animateTransform attributeName="transform" type="rotate" dur="${n(track.dur)}s" repeatCount="indefinite" calcMode="linear"${kt}${b} values="${track.sun.map(a => Math.round(a - offset)).join(';')}"/>`
}
