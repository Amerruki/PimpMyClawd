// Drawing parts for the Retro desktop: a paint box that merges every
// rectangle of one paint into a single path, bevels, and pixel-art icons.

// The classes a Paint can hold, in the order they are drawn. Window faces
// come first so wells, title bars and edges lie over them; `gap` breaks a
// group box's etched line under its caption, so it follows the edges.
export const LAYERS = ['drop', 'face', 'ttl-a', 'ttl-i', 'well', 'ink-bg', 'lo', 'sh', 'mid', 'hi', 'gap', 'block', 'add', 'del'] as const
export type Layer = (typeof LAYERS)[number]

export class Paint {
  private readonly parts = new Map<string, string[]>()

  rect(cls: string, x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) {
      return
    }
    const list = this.parts.get(cls) ?? []

    list.push(`M${x} ${y}h${w}v${h}h${-w}z`)
    this.parts.set(cls, list)
  }

  // Every class in `order`, then any others, each as one path.
  draw(order: readonly string[] = LAYERS): string {
    const keys = [...order.filter(k => this.parts.has(k)), ...[...this.parts.keys()].filter(k => !order.includes(k))]

    return keys.map(k => `<path class="${k}" d="${(this.parts.get(k) ?? []).join('')}"/>`).join('')
  }
}

// Edge thickness of every bevel, in scene units.
export const T = 2

export type BevelKind = 'raised' | 'sunk' | 'field' | 'etched'

// A bevelled box: two lines of edge on each side and, unless `noFace`, a face
// inside them. Raised is a window or a button; sunk is a pressed button;
// field is a text well, the darkest edge inside; etched is a group box line.
export function bevel(p: Paint, x: number, y: number, w: number, h: number, kind: BevelKind = 'raised', face = 'face'): void {
  if (kind === 'etched') {
    outline(p, 'lo', x, y, w - T, h - T)
    outline(p, 'hi', x + T, y + T, w - T, h - T)
    return
  }
  const [outTL, outBR, inTL, inBR] =
    kind === 'raised' ? ['mid', 'sh', 'hi', 'lo'] : kind === 'sunk' ? ['sh', 'hi', 'lo', 'mid'] : ['lo', 'hi', 'sh', 'mid']

  edges(p, x, y, w, h, outTL, outBR)
  edges(p, x + T, y + T, w - 2 * T, h - 2 * T, inTL, inBR)
  if (face !== '') {
    p.rect(face, x + 2 * T, y + 2 * T, w - 4 * T, h - 4 * T)
  }
}

function edges(p: Paint, x: number, y: number, w: number, h: number, tl: string, br: string): void {
  p.rect(br, x, y + h - T, w, T)
  p.rect(br, x + w - T, y, T, h - T)
  p.rect(tl, x, y, w - T, T)
  p.rect(tl, x, y + T, T, h - 2 * T)
}

function outline(p: Paint, cls: string, x: number, y: number, w: number, h: number): void {
  p.rect(cls, x, y, w, T)
  p.rect(cls, x, y + h - T, w, T)
  p.rect(cls, x, y + T, T, h - 2 * T)
  p.rect(cls, x + w - T, y + T, T, h - 2 * T)
}

// Pixel art: rows of letters, one per pixel, '.' clear. Each run of one
// letter in a row becomes one rectangle in the paint class `px-<letter>`.
// Returns the outline of every lit pixel, for a selection tint.
export function pixels(p: Paint, rows: readonly string[], x: number, y: number, s: number): string {
  const all: string[] = []

  rows.forEach((row, r) => {
    let c = 0

    while (c < row.length) {
      const ch = row[c] as string
      let end = c + 1

      while (end < row.length && row[end] === ch) {
        end++
      }
      if (ch !== '.') {
        p.rect(`px-${ch}`, x + c * s, y + r * s, (end - c) * s, s)
      }
      c = end
    }
    const lit = /[^.]+/g
    let m: RegExpExecArray | null

    while ((m = lit.exec(row)) !== null) {
      all.push(`M${x + m.index * s} ${y + r * s}h${m[0].length * s}v${s}h${-m[0].length * s}z`)
    }
  })

  return all.join('')
}

// Letters used by the icons: k outline, w white, g light grey, d dark grey,
// b blue, c screen glint, y yellow, n green, r red, o orange, l light blue.
export const PIXEL_LETTERS = ['k', 'w', 'g', 'd', 'b', 'c', 'y', 'n', 'r', 'o', 'l'] as const

export const MONITOR = [
  '................',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwgk.',
  '.kwbbbbbbbbbbdk.',
  '.kwbccbbbbbbbdk.',
  '.kwbcbbbbbbbbdk.',
  '.kwbbbbbbbbbbdk.',
  '.kwbbbbbbbbbbdk.',
  '.kwbbbbbbbbbbdk.',
  '.kwgggggggggndk.',
  '.kgdddddddddddk.',
  '.kkkkkkkkkkkkkk.',
  '......kddk......',
  '...kkkkkkkkkkk..',
  '...kwgggggggdk..',
  '...kkkkkkkkkkk..',
]

export const PAGE_DIFF = [
  '..kkkkkkkkk.....',
  '..kwwwwwwwkk....',
  '..kwwwwwwwkgk...',
  '..kwwwwwwwkkkk..',
  '..kwwwwwwwwwwk..',
  '..kwwnwwddddwk..',
  '..kwnnnwddddwk..',
  '..kwwnwwwwwwwk..',
  '..kwwwwwwwwwwk..',
  '..kwddddddwwwk..',
  '..kwwwwwwwwwwk..',
  '..kwrrrwddddwk..',
  '..kwwwwwwwwwwk..',
  '..kwddddwwwwwk..',
  '..kwwwwwwwwwwk..',
  '..kkkkkkkkkkkk..',
]

export const CHIP = [
  '................',
  '....k.k..k.k....',
  '....k.k..k.k....',
  '...kkkkkkkkkk...',
  '..kkwwwwwwwwkk..',
  '...kwgggggggk...',
  '..kkwgbbbbgdkk..',
  '...kwgbcbbgdk...',
  '...kwgbbbbgdk...',
  '..kkwgbbbbgdkk..',
  '...kwggggggdk...',
  '..kkwdddddddkk..',
  '...kkkkkkkkkk...',
  '....k.k..k.k....',
  '....k.k..k.k....',
  '................',
]

export const CALENDAR = [
  '................',
  '....k......k....',
  '.kkkwkkkkkkwkkk.',
  '.krrrrrrrrrrrrk.',
  '.krrrrrrrrrrrrk.',
  '.kkkkkkkkkkkkkk.',
  '.kwwwwwwwwwwwwk.',
  '.kwdwdwdwdwdwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kwdwdwdwdwdwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kwdwdwbbwdwwwk.',
  '.kwwwwwbbwwwwwk.',
  '.kwdwdwwwwwwwwk.',
  '.kwwwwwwwwwwwwk.',
  '.kkkkkkkkkkkkkk.',
]

export const HOURGLASS = [
  '..kkkkkkkkkkkk..',
  '...kwwwwwwwwk...',
  '...kyyyyyyyyk...',
  '....kyyyyyyk....',
  '.....kyyyyk.....',
  '......kyyk......',
  '.......kk.......',
  '.......kk.......',
  '......kwyk......',
  '.....kwwywk.....',
  '....kwwwywwk....',
  '...kwwwyyywwk...',
  '...kwyyyyyyyk...',
  '...kyyyyyyyyk...',
  '..kkkkkkkkkkkk..',
  '................',
]

// A small page for the file list, 8 by 10.
export const SMALL_PAGE = ['kkkkkk..', 'kwwwwkk.', 'kwwwwkwk', 'kwddwkkk', 'kwwwwwwk', 'kwdddwwk', 'kwwwwwwk', 'kwddddwk', 'kwwwwwwk', 'kkkkkkkk']
export const SMALL_CODE = ['kkkkkk..', 'kwwwwkk.', 'kwwwwkwk', 'kwwwwkkk', 'kwbwwbwk', 'kbwwwwbk', 'kwbwwbwk', 'kwwwwwwk', 'kwwwwwwk', 'kkkkkkkk']

// A round badge with a glyph: `fill` for the disc, `glyph` rows drawn in
// white over it, centred.
export function badge(fill: string, glyph: readonly string[]): string[] {
  const size = 16
  const c = 7.5
  const rows: string[] = []

  for (let r = 0; r < size; r++) {
    let row = ''

    for (let col = 0; col < size; col++) {
      const d = Math.hypot(col - c, r - c)

      row += d <= 6.4 ? fill : d <= 7.6 ? 'k' : '.'
    }
    rows.push(row)
  }
  const top = Math.round((size - glyph.length) / 2)

  glyph.forEach((g, i) => {
    const left = Math.round((size - g.length) / 2)
    const row = rows[top + i] as string

    rows[top + i] = row.slice(0, left) + [...g].map((ch, j) => (ch === '#' ? 'w' : row[left + j])).join('') + row.slice(left + g.length)
  })

  return rows
}

export const INFO_GLYPH = ['.##.', '.##.', '....', '###.', '.##.', '.##.', '.##.', '####']
export const ERROR_GLYPH = ['##...##', '.##.##.', '..###..', '.##.##.', '##...##']

// A disk-space pie: a tilted disc whose used share is drawn blue and the
// rest yellow, with a dark rim for its thickness.
export function pie(used: number): string[] {
  const rows: string[] = []
  const cx = 7.5
  const cy = 6.5
  const rx = 7
  const ry = 5
  const depth = 3
  const inTop = (col: number, r: number) => ((col - cx) / rx) ** 2 + ((r - cy) / ry) ** 2 <= 1
  const inBody = (col: number, r: number) => inTop(col, r) || (r > cy && inTop(col, r - depth))
  const share = Math.max(0, Math.min(1, used))

  for (let r = 0; r < 16; r++) {
    let row = ''

    for (let col = 0; col < 16; col++) {
      if (!inBody(col, r)) {
        row += '.'
        continue
      }
      const edge = !inBody(col - 1, r) || !inBody(col + 1, r) || !inBody(col, r - 1) || !inBody(col, r + 1)

      if (edge) {
        row += 'k'
      } else if (!inTop(col, r)) {
        row += 'd'
      } else {
        // Clockwise from twelve o'clock, as a share of the turn.
        const a = (Math.atan2(col - cx, -(r - cy) * (rx / ry)) / (2 * Math.PI) + 1) % 1

        row += a < share ? 'b' : 'y'
      }
    }
    rows.push(row)
  }

  return rows
}

// "claude-opus-5-5" as "Opus 5.5"; anything else cut short.
export function modelName(model: string): string {
  const m = /(opus|sonnet|haiku|fable)[-_ ]?(\d+)?(?:[-._](\d+))?/i.exec(model)

  if (m === null) {
    return model.length > 18 ? `${model.slice(0, 17)}…` : model
  }
  const name = (m[1] as string).charAt(0).toUpperCase() + (m[1] as string).slice(1).toLowerCase()

  return m[2] === undefined ? name : `${name} ${m[2]}${m[3] === undefined ? '' : `.${m[3]}`}`
}
