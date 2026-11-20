import { Bucket, P, RX, ppm, r1, rooms, shape, wall } from './cyber2-kit'
import { holoPanel } from './cyber2-holo'
import { puff } from './cyber2-stall'
import { bladeSign } from './cyber2-left'
import { MARK } from './cyber2-sky'

// The right gutter: the session's megabuilding, a glass tower running off the
// top of the frame with its screens set into the curtain wall, and below it
// the low shopfronts and the grill cart at the kerb.

const RW = wall(RX)

// The tower's front face, and where each projected panel floats in front of
// it. Every panel sits right of x 1160, clear of the conversation.
export const MB = { x0: 1150, x1: 1640, top: -60, foot: 566 } as const
export const BANNER = { x: 1164, y: 116, w: 48, h: 356 } as const
export const SCREEN = { x: 1222, y: 120, w: 256, h: 172 } as const
export const PURGE = { x: 1222, y: 336, w: 118, h: 84 } as const
export const LOADP = { x: 1352, y: 336, w: 126, h: 84 } as const
const EDGE = { x: 1500, y: 128, w: 40, h: 160 } as const
const WRAP = { y: 302, h: 22 } as const

// The side face recedes toward the vanishing point.
const SIDE = 1122
const side = (y: number): number => Math.round(560 + (y - 560) * ((SIDE - 850) / (MB.x0 - 850)))

export const RIGHT_CSS =
  `.arm{animation:arm 2.6s ease-in-out infinite alternate}@keyframes arm{from{opacity:.45}to{opacity:1}}` +
  `.gr2{fill:none;stroke:var(--q2);stroke-width:3}`

export const RIGHT_DEFS =
  `<linearGradient id="gls" x2="0" y2="1"><stop stop-color="var(--q0)"/><stop offset="1" stop-color="var(--q1)"/></linearGradient>` +
  `<linearGradient id="glr" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="var(--q3)" stop-opacity="0"/><stop offset=".5" stop-color="var(--q3)" stop-opacity=".35"/><stop offset=".56" stop-color="var(--q3)" stop-opacity=".08"/><stop offset=".7" stop-color="var(--q3)" stop-opacity="0"/></linearGradient>` +
  `<pattern id="hz2" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#ffc21a" fill-opacity=".75"/></pattern>`

// The curtain wall, close enough to see into: a room behind every window,
// lit or dark, office floors a storey high; the lobby below. The panels are
// light thrown in front of it (rightDisplays), so the rooms behind them stay
// dark glass.
export function megabuilding(): string {
  const b = new Bucket()
  const wo = new Bucket()
  const { x0, x1, top, foot } = MB
  const sideFace = shape([[x0, top], [SIDE, side(top)], [SIDE, foot], [x0, foot]])
  // Side face floor lines, converging.
  let sideLines = ''
  for (let y = -30; y < 430; y += 46) sideLines += `M${x0} ${y}L${SIDE} ${side(y)}`
  sideLines += `M${x0 - 14} ${top}V${foot}`
  const area = { x: x0, y: -30, w: 460, h: 460 }
  const holes = [SCREEN, PURGE, LOADP, EDGE, { x: x0, y: WRAP.y - 6, w: 460, h: WRAP.h + 12 }].map(r => ({ x: r.x - 8, y: r.y - 20, w: r.w + 16, h: r.h + 28 }))
  rooms(b, wo, area, 41, 46, 7, 0.55, holes, 4, false)
  // Mullions between the bays, a slab edge at every floor.
  let grid = ''
  for (let i = 0; i <= 11; i++) grid += `M${Math.round(x0 + (i * 460) / 11)} ${top}V430`
  for (let y = -30; y <= 430; y += 46) grid += `M${x0} ${y}H${x1}`
  b.add('x0', `M${x0} 326h${x1 - x0}v8h${x0 - x1}z`)

  // The wrap: a band of light running round the corner onto the side face.
  const wrap =
    `<path d="${shape([[x0, WRAP.y], [SIDE, side(WRAP.y)], [SIDE, side(WRAP.y + WRAP.h)], [x0, WRAP.y + WRAP.h]])}" fill="var(--holo)" fill-opacity=".35"/>` +
    `<path d="M${x0} ${WRAP.y}h${x1 - x0}v${WRAP.h}h${x0 - x1}z" fill="var(--holo)" fill-opacity=".22"/>` +
    `<path d="M${x0} ${WRAP.y + 1}h${x1 - x0}M${x0} ${WRAP.y + WRAP.h - 1}h${x1 - x0}" stroke="var(--holo)" stroke-width="2"/>`

  // The lobby: a double-height hall of warm light behind the glass.
  const lobby =
    `<path class="l5" d="M${x0} 438h${x1 - x0}v128h${x0 - x1}z"/><path class="l1" d="M${x0} 438h${x1 - x0}v5h${x0 - x1}z"/>` +
    `<path class="a1" d="M${x0} 432h${x1 - x0}v6h${x0 - x1}z${[1196, 1262, 1328, 1394, 1460, 1526, 1592].map(x => `M${x} 438h5v128h-5z`).join('')}"/>`

  // Data climbing the corner while the session works.
  const pulses = [0, 1, 2, 3].map(i => `<rect class="dp d${i * 2}" x="${x0 - 3}" y="500" width="6" height="34" rx="3" fill="#fff"/>`).join('')
  // Police strobes thrown on the side face at level 3 and up.
  const wash = `<g class="q q3"><path class="sr" d="${sideFace}" fill="#ff2a3a" fill-opacity=".26"/></g>`

  return (
    `<path class="m1" d="${sideFace}"/><path d="${sideFace}" fill="url(#mtl)"/>` +
    `<path d="${sideLines}" stroke="var(--q2)" stroke-opacity=".5" fill="none"/>` +
    `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${foot - top}" fill="url(#gls)"/>` +
    b.toString() +
    `<g class="wo">${wo.toString()}</g>` +
    `<path class="gr2" d="${grid}"/>` +
    `<path d="M${x0} ${top}h${x1 - x0}v${430 - top}h${x0 - x1}z" fill="url(#glr)"/>` +
    lobby +
    `<path class="rc2" d="M${x0} ${top}V${foot}"/>` +
    wash +
    wrap +
    `<g class="wo">${pulses}<path d="M${x0} 100v420" stroke="var(--scr)" stroke-opacity=".8" stroke-width="3"/></g>`
  )
}

// The panels in front of the megabuilding, all in the right gutter group:
// the session banner, the main status display, the band's message, the
// purge control and the load board, and a narrow advert down the far edge.
export function rightDisplays(): string {
  const s = SCREEN
  const n = BANNER
  const e = EDGE
  const screen =
    `<ellipse class="fl nt" cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w * 0.75}" ry="${s.h * 0.85}" fill="url(#gc)" fill-opacity=".22"/>` +
    holoPanel(s, 'var(--scr)', { sweep: true, emit: 'above' }) +
    MARK.status
  const band =
    `<text class="jp ti" x="1395" y="${WRAP.y + 16}" font-size="12" letter-spacing="3" text-anchor="middle" fill="#fff">ミライ都市 · NEON WARD · 第七区</text>` +
    `<text class="jp tc" x="1395" y="${WRAP.y + 16}" font-size="13" letter-spacing="2" text-anchor="middle" fill="#ff6a5a">▲ CAPACITY CRITICAL ▲ 容量限界 ▲</text>` +
    `<text class="jp ea" x="1395" y="${WRAP.y + 16}" font-size="13" letter-spacing="1" text-anchor="middle" fill="#ffc21a">⚠ 記憶圧縮中 · COMPACTING MEMORY ⚠</text>`
  const banner =
    `<ellipse class="nt" cx="${n.x + n.w / 2}" cy="${n.y + n.h / 2}" rx="60" ry="${n.h * 0.6}" fill="url(#gm)" fill-opacity=".35"/>` +
    holoPanel(n, 'var(--holo)', { emit: 'below' }) +
    MARK.name
  const edge =
    holoPanel(e, 'var(--scr)', { cue: false, emit: 'none' }) +
    `<text class="jp" x="${e.x + 20}" y="160" font-size="22" text-anchor="middle" fill="#fff"><tspan x="${e.x + 20}">ネ</tspan><tspan x="${e.x + 20}" dy="34">オ</tspan><tspan x="${e.x + 20}" dy="34">ン</tspan><tspan x="${e.x + 20}" dy="34">街</tspan></text>`

  return (
    `<g class="g-r hx">` +
    screen +
    band +
    MARK.purge +
    holoPanel(LOADP, 'var(--scr)', { emit: 'above' }) +
    MARK.load +
    banner +
    edge +
    `</g>`
  )
}

// The purge control as light: an amber field, hazard stripes along its top
// and foot, the button a ring of red light. Armed, the whole frame pulses
// and asks for the second tap; during the purge itself it says so.
export function purgeControl(armed: boolean, purging: boolean): string {
  const p = PURGE
  const cx = p.x + p.w / 2
  const stripes = `<path d="M${p.x} ${p.y}h${p.w}v6h${-p.w}zM${p.x} ${p.y + p.h - 6}h${p.w}v6h${-p.w}z" fill="url(#hz2)"/>`
  const panel = holoPanel(p, '#ffb02e', { emit: 'above', cue: !armed })

  if (armed) {
    return (
      panel +
      stripes +
      `<g class="arm"><rect x="${p.x - 4}" y="${p.y - 4}" width="${p.w + 8}" height="${p.h + 8}" fill="#ffb02e" fill-opacity=".22" stroke="#ffc21a" stroke-width="3"/></g>` +
      `<text class="jp" x="${cx}" y="${p.y + 24}" font-size="11" letter-spacing=".5" text-anchor="middle" fill="#fff" textLength="104" lengthAdjust="spacingAndGlyphs">CONFIRM PURGE</text>` +
      `<text class="jp" x="${cx}" y="${p.y + 44}" font-size="15" text-anchor="middle" fill="#ffc21a">消去しますか</text>` +
      `<text class="jp arm" x="${cx}" y="${p.y + 68}" font-size="13" letter-spacing="1.5" text-anchor="middle" fill="#fff">TAP AGAIN ›</text>`
    )
  }
  if (purging) {
    return (
      panel +
      stripes +
      `<text class="jp" x="${cx}" y="${p.y + 30}" font-size="16" text-anchor="middle" fill="#fff">消去中</text>` +
      `<text x="${cx}" y="${p.y + 46}" font-size="9" font-weight="700" letter-spacing="1.5" text-anchor="middle" fill="#ffc21a" font-family="ui-monospace,Menlo,monospace">PURGING…</text>` +
      `<circle class="pb" cx="${cx}" cy="${p.y + 64}" r="9" fill="none" stroke="#ff4a3d" stroke-width="3"/>`
    )
  }

  return (
    panel +
    stripes +
    `<text class="jp" x="${cx}" y="${p.y + 27}" font-size="15" text-anchor="middle" fill="#fff">記憶消去</text>` +
    `<text x="${cx}" y="${p.y + 41}" font-size="8.5" font-weight="700" letter-spacing="1.5" text-anchor="middle" fill="#ffc21a" font-family="ui-monospace,Menlo,monospace">MEMORY PURGE</text>` +
    `<circle class="pb" cx="${cx}" cy="${p.y + 62}" r="14" fill="url(#gr)"/>` +
    `<circle cx="${cx}" cy="${p.y + 62}" r="8" fill="#ff4a3d" fill-opacity=".55" stroke="#ff8a8a" stroke-width="2"/>`
  )
}

export function rightSigns(): string {
  return bladeSign(RW, 50, 1.3, 4.2, 7.6, '喫茶', '#7dff5a', 'g', '', 0.1)
}

// A second trade in the right foreground, at the kerb: a grill cart under a
// canopy, two lanterns, its cook at the grill, smoke. Shuttered in an
// emergency.
export function cart(): string {
  const w = wall(10.1)
  const b = new Bucket()
  const [face, end, cap] = w.box(12.6, 15.2, 0.25, 1.1, 1.5)
  b.add('a4', face).add('a1', end).add('a3', cap)
  const [cf, ce, cc] = w.box(12.3, 15.5, 2.3, 2.45, 2)
  b.add('t1', cf).add('a1', ce).add('x0', cc)
  for (const z of [12.4, 15.4]) b.add('a4', w.box(z, z + 0.08, 0, 2.3, 0.08)[0]).add('a4', wall(8.5).box(z, z + 0.08, 0, 2.3, 0.06)[0])
  b.add('x0', wall(8.6).q(12.8, 13.3, 0, 0.3)).add('x0', wall(8.6).q(14.5, 15, 0, 0.3))
  const [vx, vy] = P(9.7, 1.1, 14)
  const s = ppm(14) / 40
  const cook =
    `<g transform="translate(${Math.round(vx)} ${Math.round(vy)}) scale(${r1(s)})"><g class="bob d3"><path class="p1" d="M-10 2v-16q0-8 8-10q-4-3-4-8a7 7 0 0 1 14 0q0 5-4 8q8 2 8 10v16z"/><path class="t0" d="M-5-34h12v3h-12z"/>` +
    `<path class="la" d="M-10-14q0-8 8-10M-6-34q0-6 7-7"/><path class="p1" d="M-9-20l-14 9 2 4 15-7z"/></g></g>`
  const lamp = (z: number, d: number) => {
    const [x, y] = P(8.05, 2.2, z)
    const r = ppm(z) * 0.2

    return `<circle class="nt" cx="${Math.round(x)}" cy="${Math.round(y + r)}" r="${Math.round(r * 6)}" fill="url(#ga)" fill-opacity=".5"/><g transform="translate(${Math.round(x)} ${Math.round(y)})"><g class="lsw d${d}"><ellipse cy="${r1(r * 1.3)}" rx="${r1(r)}" ry="${r1(r * 1.1)}" fill="url(#lan)"/></g></g>`
  }
  const [px, py] = P(8.9, 1.3, 13.6)
  const [gx, gy] = P(7.9, 0, 13.9)
  // The roller shutter: the canopy's street face down to the ground.
  const sh = wall(8.5)
  let ribs = ''
  for (let y = 0.2; y < 2.3; y += 0.18) ribs += shape([sh.pt(12.4, y), sh.pt(15.4, y)], false)
  // And its near end, facing the camera, so the cart closes all round.
  const endAt = (x: number, y: number) => P(x, y, 12.4)
  const endFace = shape([endAt(8.4, 2.45), endAt(12.5, 2.45), endAt(12.5, 0), endAt(8.4, 0)])
  for (let y = 0.2; y < 2.4; y += 0.18) ribs += shape([endAt(8.4, y), endAt(12.5, y)], false)

  return (
    `<g class="op"><ellipse class="nt" cx="${Math.round(gx)}" cy="${Math.round(gy)}" rx="230" ry="46" fill="url(#ga)" fill-opacity=".5"/>` +
    cook +
    `</g>` +
    b.toString() +
    `<g class="op"><path class="amb" d="${shape([wall(8.6).pt(12.6, 1.04), wall(8.6).pt(15.2, 1.04)], false)}"/>` +
    lamp(13, 2) +
    lamp(15, 6) +
    puff(px, py, 9, 'pf d2') +
    puff(px + 8, py, 8, 'pf d7') +
    `<g class="wo">${puff(px, py, 14, 'pf d5')}</g></g>` +
    `<g class="ea"><path class="a3" d="${sh.q(12.4, 15.4, 0, 2.3)}${endFace}"/><path d="${ribs}" stroke="var(--a1)" fill="none"/></g>`
  )
}
