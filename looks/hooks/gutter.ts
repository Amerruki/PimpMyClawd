// Keeping a scene's side displays clear of the conversation.
//
// The desktop app draws the conversation as a centred column 766 px wide, a
// fixed pixel width, over the scene. The scene is 1600 units wide and drawn
// with `slice`, so in a window W px wide (and at least 1.6 times as wide as
// tall) a unit is W / 1600 px and the column's edges sit at
// 800 ± 383 × 1600 / W units: x 481 to 1119 at 1920 px, closer to the window
// edges as the window narrows.
//
// Design every display for a 1920 x 1080 window inside the gutters below,
// left content in a group with class `g-l` and right content in one with
// `g-r`. GUTTER_CSS shrinks each group towards its window edge in narrower
// windows, so it keeps the same clearance from the column.

/** At 1920 px, left-gutter content ends by this x and right-gutter content starts at this x. */
export const GUTTER = { leftMax: 440, rightMin: 1160 } as const

const COLUMN_HALF_PX = 383
const CLEAR_PX = 40
const DESIGN_W = 1920
const FLOOR = 0.4

// How much a gutter group must shrink in a window `w` px wide.
export function gutterScale(w: number): number {
  const room = w / 2 - COLUMN_HALF_PX - CLEAR_PX
  const needed = (GUTTER.leftMax * w) / 1600

  return Math.max(FLOOR, Math.min(1, room / needed))
}

function rules(): string {
  const base =
    '.g-l{transform-box:view-box;transform-origin:0px 500px}' + '.g-r{transform-box:view-box;transform-origin:1600px 500px}'
  const steps: string[] = []

  // Bands of 80 px, each scaled for its narrowest width; later rules win.
  for (let w = DESIGN_W - 1; w >= 960; w -= 80) {
    const k = Math.round(gutterScale(w - 79) * 1000) / 1000

    if (k < 1) {
      steps.push(`@media (max-width:${w}px){.g-l,.g-r{transform:scale(${k})}}`)
    }
  }

  return base + steps.join('')
}

/** CSS for a scene's stylesheet: add it once. */
export const GUTTER_CSS = rules()
