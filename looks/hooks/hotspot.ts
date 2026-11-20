// Clickable spots in a look's scene. The app hands a mod clicks on the bare
// backdrop (`ui.pointer`) as fractions of the window, and only where no panel
// covers it, so spots belong in the side gutters, outside the chat column
// (x 481 to 1119 of the 1600-wide scene). The scene draws the spot itself and
// may light it on :hover; this file only says where it is and what it does.

export type HotspotAction =
  // A menu of everything below, for a Start button or a terminal prompt.
  | 'menu'
  // Info, shown at once.
  | 'context'
  | 'usage'
  | 'diff'
  | 'last-command'
  | 'session'
  // Changes to the session, each confirmed first.
  | 'model'
  | 'compact'
  | 'stop'

/** A rectangle in the scene's own 1600 by 1000 units, and what a click on it does. */
export type Hotspot = {
  action: HotspotAction
  x: number
  y: number
  w: number
  h: number
}

const W = 1600
const H = 1000
// The app sends no window size with a click; the desktop window is most often
// this shape, and spots are sized to forgive a different one.
const ASPECT = 16 / 9
const SLACK = 14

/**
 * A click's place in scene units, for a scene drawn with `slice`. `align` is
 * the scene's vertical alignment: `mid` for xMidYMid, `min` for xMidYMin.
 */
export function toScene(px: number, py: number, align: 'mid' | 'min' = 'mid', aspect = ASPECT): { x: number; y: number } {
  if (aspect >= W / H) {
    const shown = W / aspect
    const top = align === 'min' ? 0 : (H - shown) / 2

    return { x: px * W, y: top + py * shown }
  }
  const shown = H * aspect

  return { x: (W - shown) / 2 + px * shown, y: py * H }
}

export function hit(spots: readonly Hotspot[], x: number, y: number): Hotspot | undefined {
  return spots.find(s => x >= s.x - SLACK && x <= s.x + s.w + SLACK && y >= s.y - SLACK && y <= s.y + s.h + SLACK)
}
