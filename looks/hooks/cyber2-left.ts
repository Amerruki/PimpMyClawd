import { Bucket, LX, P, rooms, wall } from './cyber2-kit'
import { holoPanel } from './cyber2-holo'
import { MARK } from './cyber2-sky'

// The left gutter: Exchange Square. The stock exchange faces the camera
// across the square, its colonnade under a pediment, the market thrown as
// light in front of the columns and a ticker running along the frieze;
// behind it the ration tower, its power-ration dial projected in front of
// it, and Clawd's hologram on the exchange's roof against the skyline.

const LW = wall(LX)
const R = Math.round

// The exchange's face, in scene units: it stands at depth 45, its right end
// on the street wall's line.
export const EX = { x0: -20, x1: 406, roof: 378, ground: 622, apex: 300, cx: 206 } as const
export const BOARD = { x: 36, y: 440, w: 340, h: 68 } as const
export const TAPE = { x0: 0, x1: 406, y: 386, h: 16 } as const
export const CLOCK = { cx: 382, cy: 182, r: 50 } as const
const COLS = [22, 83, 145, 206, 267, 328, 390]

// A neon blade sign hanging off the wall, facing the camera: glow, housing,
// lit frame, and upright characters.
export function bladeSign(
  w: typeof LW,
  z: number,
  out: number,
  y0: number,
  y1: number,
  text: string,
  col: string,
  glow: string,
  cls = '',
  inner = 0,
): string {
  const sg = w.X < 0 ? 1 : -1
  const a = P(w.X + sg * inner, y1, z)
  const c = P(w.X + sg * out, y0, z)
  const x = R(Math.min(a[0], c[0]))
  const y = R(a[1])
  const wd = R(Math.abs(c[0] - a[0]))
  const h = R(c[1] - a[1])
  const chars = [...text]
  const size = Math.min(wd * 0.78, (h - 6) / chars.length / 1.08)
  const step = (h - 6) / chars.length
  const cx = x + wd / 2
  const glyphs = chars.map((ch, i) => `<tspan x="${R(cx)}" y="${R(y + 3 + step * (i + 0.5) + size * 0.36)}">${ch}</tspan>`).join('')
  // Brackets back to the wall.
  const wx = R(P(w.X, y1, z)[0])
  const arm = inner > 0 ? `<path class="rl" d="M${wx} ${y + 6}H${sg > 0 ? x : x + wd}M${wx} ${y + h - 6}H${sg > 0 ? x : x + wd}"/>` : ''

  return (
    `<g${cls ? ` class="${cls}"` : ''}>` +
    `<ellipse class="nt" cx="${R(cx)}" cy="${R(y + h / 2)}" rx="${R(wd * 1.5 + 30)}" ry="${R(h * 0.72 + 24)}" fill="url(#g${glow})" fill-opacity=".5"/>` +
    arm +
    `<rect class="hd" x="${x}" y="${y}" width="${wd}" height="${h}" rx="2"/><rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="2" fill="${col}" fill-opacity=".14"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="${wd - 4}" height="${h - 4}" rx="1.5" fill="none" stroke="${col}" stroke-opacity=".8"/>` +
    `<text class="jp ns" font-size="${R(size)}" text-anchor="middle" stroke="${col}">${glyphs}</text></g>`
  )
}


// The tower behind the square, running off the top: close enough that each
// window is a room. The ration clock is projected in front of it.
export function rationTower(): string {
  const b = new Bucket()
  const wo = new Bucket()
  const { cx, cy, r } = CLOCK
  rooms(b, wo, { x: 340, y: -40, w: 126, h: 420 }, 31, 38, 5, 0.5, [{ x: cx - r - 14, y: cy - r - 14, w: 2 * r + 28, h: 2 * r + 28 }], 3)

  return (
    `<path class="a0" d="M330-60h136v440h-136z"/><path class="a1" d="M330-60h10v440h-10z"/>` +
    b.toString() +
    `<g class="wo">${wo.toString()}</g>` +
    `<path class="x0 sv" d="M330 60h136v6h-136zM330 300h136v6h-136z"/>` +
    `<path class="rc2" d="M466-60V380"/>`
  )
}

// The ration clock as a projected dial: a ring of light round a faint
// field, the hour ticks, the week's use as the arc.
export function rationDial(): string {
  const { cx, cy, r } = CLOCK
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    const [s, c] = [Math.sin(a), Math.cos(a)]
    ticks += `M${R(cx + s * (r - 3))} ${R(cy - c * (r - 3))}L${R(cx + s * (r - (i % 3 ? 7 : 11)))} ${R(cy - c * (r - (i % 3 ? 7 : 11)))}`
  }

  return (
    `<circle class="nt" cx="${cx}" cy="${cy}" r="${r + 30}" fill="url(#gc)" fill-opacity=".3"/>` +
    `<circle class="hd" cx="${cx}" cy="${cy}" r="${r + 4}"/>` +
    `<circle class="hf" cx="${cx}" cy="${cy}" r="${r + 4}" fill="var(--scr)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="url(#hsc)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="var(--scr)" stroke-width="2"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="none" stroke="var(--scr)" stroke-opacity=".35" stroke-dasharray="3 5"/>` +
    `<path d="${ticks}" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>` +
    MARK.ration +
    `<path d="M${cx + r - 4} ${cy + r - 2}l5 5-5 5" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2"/>`
  )
}

// The exchange: steps, colonnade, the trading floor behind it, the board,
// the frieze with its ticker, cornice and pediment.
export function exchange(): string {
  const { x0, x1, roof, ground, apex, cx } = EX
  const z = 52
  const [sx, sy] = P(LX, (ground - roof) / 22.22, z)
  const [, gy] = P(LX, 0, z)
  // The side along the street, receding.
  const sideFace = `M${x1} ${roof}L${R(sx)} ${R(sy)}V${R(gy)}L${x1} ${ground}z`
  let shafts = ''
  let caps = ''
  let flutes = ''
  for (const c of COLS) {
    shafts += `M${c - 10} 430h20v160h-20z`
    caps += `M${c - 15} 422h30v8h-30zM${c - 14} 590h28v8h-28z`
    flutes += `M${c - 4} 432v156M${c + 4} 432v156`
  }
  // The trading floor: rows of dealing screens under a warm hall light.
  let desks = ''
  for (let i = 0; i < 26; i++) desks += `M${-10 + i * 16} 548h11v7h-11zM${-4 + i * 16} 566h11v7h-11z`

  return (
    `<path class="e1" d="${sideFace}"/><path d="${sideFace}" fill="url(#lwc)"/>` +
    `<path class="e2" d="M${x0} 422h${x1 - x0}v176h${x0 - x1}z"/>` +
    `<path d="M${x0} 470h${x1 - x0}v128h${x0 - x1}z" fill="url(#hall)"/>` +
    `<path class="l3" d="${desks}"/>` +
    `<path class="e0" d="${shafts}"/><path d="${flutes}" stroke="var(--e1)" fill="none"/><path class="e0" d="${caps}"/>` +
    `<path d="${shafts}" fill="url(#upl)"/>` +
    // Steps.
    `<path class="e0" d="M${x0} 598h${x1 - x0 + 4}v6h${x0 - x1 - 4}zM${x0} 610h${x1 - x0 + 8}v6h${x0 - x1 - 8}z"/><path class="e1" d="M${x0} 604h${x1 - x0 + 6}v6h${x0 - x1 - 6}zM${x0} 616h${x1 - x0 + 10}v6h${x0 - x1 - 10}z"/>` +
    // Entablature: architrave with its inscription, frieze with the tape, cornice.
    `<path class="e0" d="M${x0} 402h${x1 - x0}v20h${x0 - x1}z"/><path class="e1" d="M${x0} 418h${x1 - x0}v4h${x0 - x1}z"/>` +
    `<text class="jp xi" x="${cx}" y="416" font-size="12.5" letter-spacing="4" text-anchor="middle">取引所 · STOCK EXCHANGE</text>` +
    `<path class="e2" d="M${x0} 386h${x1 - x0}v16h${x0 - x1}z"/>` +
    `<path class="e0" d="M${x0 - 4} ${roof}h${x1 - x0 + 8}v8h${x0 - x1 - 8}z"/><path class="e2" d="M${x0 - 4} ${roof + 8}h${x1 - x0 + 8}v2h${x0 - x1 - 8}z"/>` +
    // Pediment and its tympanum.
    `<path class="e0" d="M14 ${roof}L${cx} ${apex}L398 ${roof}z"/><path class="e1" d="M38 ${roof - 4}L${cx} ${apex + 10}L374 ${roof - 4}z"/>` +
    `<text class="jp xg" x="${cx}" y="${roof - 12}" font-size="20" text-anchor="middle">取引所</text>` +
    `<path class="rm" d="M14 ${roof}L${cx} ${apex}L398 ${roof}"/>` +
    ''
  )
}

// The market as light thrown from the architrave onto the air in front of
// the colonnade, the ticker running in the frieze above it.
export function boardDisplay(): string {
  const b = BOARD

  return (
    `<ellipse class="nt" cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" rx="${b.w * 0.6}" ry="${b.h * 1.05}" fill="url(#gc)" fill-opacity=".25"/>` +
    holoPanel(b, 'var(--scr)', { sweep: true, emit: 'above' }) +
    MARK.board +
    MARK.tape
  )
}

export const LEFT_DEFS =
  `<clipPath id="tpc"><rect x="${TAPE.x0}" y="${TAPE.y}" width="${TAPE.x1 - TAPE.x0}" height="${TAPE.h}"/></clipPath>` +
  `<linearGradient id="lwc" x1="0" y1="0" x2="1" y2="0"><stop stop-color="var(--scr)" stop-opacity="0"/><stop offset="1" stop-color="var(--scr)" stop-opacity="var(--wc)"/></linearGradient>` +
  `<linearGradient id="hall" x2="0" y2="1"><stop stop-color="#ffb45a" stop-opacity="0"/><stop offset="1" stop-color="#ffb45a" stop-opacity="var(--sto)"/></linearGradient>` +
  `<linearGradient id="upl" x2="0" y2="1"><stop stop-color="#ffd59a" stop-opacity="0"/><stop offset="1" stop-color="#ffd59a" stop-opacity="calc(var(--sto) * .8)"/></linearGradient>`

export const LEFT_CSS =
  `.st{fill-opacity:.5}` +
  `.rl{fill:none;stroke:var(--a4);stroke-width:1.4}` +
  `.rm{fill:none;stroke:var(--rm);stroke-width:1.3;stroke-opacity:.8}.rc2{fill:none;stroke:var(--rc);stroke-width:1.2;stroke-opacity:.65}` +
  `.ns{fill:#fff;stroke-width:1.5;paint-order:stroke}` +
  `.xi{fill:var(--e2)}.xg{fill:var(--e2)}` +
  `.sway{animation:sway 5.3s ease-in-out infinite alternate}@keyframes sway{from{transform:skewX(-7deg)}to{transform:skewX(6deg)}}` +
  `.flk{animation:flk 7.9s steps(1) infinite}@keyframes flk{0%{opacity:1}61%{opacity:.4}66%{opacity:1}89%{opacity:.5}}`

export const LEFT_NIGHT = `.xi{fill:#ffd27a}.xg{fill:#ff5ac8}`

// Neon blades on the blocks down the street, kept out of the middle.
export function leftSigns(): string {
  return bladeSign(LW, 50, 1.2, 3.9, 7, '麻雀', '#22e6ff', 'c')
}
