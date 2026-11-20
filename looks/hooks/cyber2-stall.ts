import { Bucket, P, ppm, r1, shape, wall } from './cyber2-kit'
import { MARK } from './cyber2-sky'
import { holoPanel } from './cyber2-holo'

// The noodle stall on Exchange Square, near the camera: an awning over a
// counter, lanterns along its edge, the vendor at the pots, customers on
// stools, steam, and an ordering kiosk closing the end that faces the camera.
// In an emergency the shutter comes down and the lights go out.

const R = Math.round
// The stall stands free on the broad left pavement, near the camera: its
// back at SX, running from Z0 (off the frame's edge) to Z1.
const SX = -13
const LX = SX
const LW = wall(SX)
const Z0 = 12.2
const Z1 = 20.1
// Counter front, awning edge, stool line: metres out from the wall.
const COUNTER = 1.5
const EDGE = 2.35
const STOOL = 2.15

// Where the kiosk's screen and order strip sit, for the live text.
// The ordering kiosk: a totem on the pavement just past the stall's far end,
// facing the camera.
const kp = (x: number, y: number) => P(-12.45 + x, y, 21.4)
export const KIOSK = {
  x: R(kp(0.2, 0)[0]),
  w: R(kp(2.45, 0)[0] - kp(0.2, 0)[0]),
  order: R(kp(0, 2.72)[1]),
  top: R(kp(0, 2.36)[1]),
  bottom: R(kp(0, 1.3)[1]),
} as const

// A customer seen from behind, seated on a stool: hunched over the bowl,
// knees apart, feet on the stool's footrest.
function customer(z: number, d: number): string {
  const [x, y] = P(LX + STOOL, 0.62, z)
  const s = ppm(z) / 42

  return (
    `<g transform="translate(${R(x)} ${R(y)}) scale(${r1(s)})">` +
    `<path class="a4" d="M-2 2h4v24h-4zM-9 15h18v2h-18zM-8 26h16v2h-16z"/>` +
    `<path class="p0" d="M-10 2l-5 14h5l5-11zM10 2l5 14h-5l-5-11z"/>` +
    `<path class="p0" d="M-11 3q-2-18 5-25q-4-3-4-8a7 7 0 0 1 14 0q0 5-4 8q7 6 5 25z"/><path class="a4" d="M-12 0h24v4h-24z"/>` +
    `<path class="la nod d${d}" d="M-9-22q-3-3-3-8a7 7 0 0 1 9-7"/><path class="la" d="M-12-6q-1-10 5-17"/></g>`
  )
}

// A lantern hanging from the awning's edge, with its glow.
function lantern(z: number, d: number): string {
  const [x, y] = P(LX + EDGE + 0.05, 2.72, z)
  const r = ppm(z) * 0.2

  return (
    `<circle class="nt" cx="${R(x)}" cy="${R(y + r * 1.3)}" r="${R(r * 6.5)}" fill="url(#ga)" fill-opacity=".55"/>` +
    `<g transform="translate(${R(x)} ${R(y)})"><g class="lsw d${d}"><path class="rl" d="M0 0v${r1(r * 0.4)}"/>` +
    `<ellipse cy="${r1(r * 1.4)}" rx="${r1(r)}" ry="${r1(r * 1.1)}" fill="url(#lan)"/>` +
    `<path class="x0" d="M${r1(-r * 0.5)} ${r1(r * 0.3)}h${r1(r)}v${r1(r * 0.2)}h${r1(-r)}zM${r1(-r * 0.5)} ${r1(r * 2.4)}h${r1(r)}v${r1(r * 0.2)}h${r1(-r)}z"/></g></g>`
  )
}

// A puff of steam rising from (x, y).
export const puff = (x: number, y: number, r: number, cls: string): string =>
  `<g transform="translate(${R(x)} ${R(y)})"><circle class="${cls}" r="${r}" fill="url(#gw)"/></g>`

export function stall(): string {
  const b = new Bucket()
  const front = wall(LX + COUNTER)
  const edge = wall(LX + EDGE)

  // The lit back wall: shelves, bottles, hanging menu strips.
  const back = LW.q(Z0, Z1, 0.2, 3.45)
  const inner = new Bucket()
  inner.add('a1', LW.q(15, Z1, 1.62, 1.7)).add('a1', LW.q(15, Z1, 2.2, 2.26))
  ;['l3', 'l4', 'l2', 'l3', 't1', 'l2', 'l4', 'l3', 'l2'].forEach((c, i) => inner.add(c, LW.q(15.9 + i * 0.42, 16.12 + i * 0.42, 1.7, 1.98 + (i % 3) * 0.06)))
  for (let i = 0; i < 6; i++) {
    const z = 15.8 + i * 0.66
    inner.add('l2', LW.q(z, z + 0.4, 2.34, 3.05)).add('p0 st', LW.q(z + 0.12, z + 0.28, 2.45, 2.95))
  }
  // Counter: front with a lit strip under the top, the top itself.
  b.add('a4', front.q(Z0, Z1, 0, 1.05)).add('a1', front.q(Z0, Z1, 0, 0.12))
  b.add('a3', shape([front.pt(Z0, 1.05), front.pt(Z1, 1.05), P(LX + COUNTER - 0.6, 1.05, Z1), P(LX + COUNTER - 0.6, 1.05, Z0)]))
  for (let z = 14; z < Z1; z += 1.5) b.add('a1', front.q(z, z + 0.08, 0.12, 0.92))
  // Pots on the counter's back edge.
  const pot = (z: number) => {
    const [x, y] = P(LX + 1.05, 1.05, z)
    const s = ppm(z) / 40

    return `<path class="a4" d="M${R(x - 9 * s)} ${R(y - 9 * s)}h${R(18 * s)}l${R(-2 * s)} ${R(10 * s)}h${R(-14 * s)}z"/><path class="la" d="M${R(x - 10 * s)} ${R(y - 9 * s)}h${R(20 * s)}"/>`
  }
  // The vendor: headband and apron, an arm at the pot.
  const [vx, vy] = P(LX + 0.95, 1.05, 17)
  const vs = ppm(17) / 40
  const vendor =
    `<g transform="translate(${R(vx)} ${R(vy)}) scale(${r1(vs)})"><g class="bob">` +
    `<path class="p1" d="M-11 2v-16q0-8 8-10q-4-3-4-8a7 7 0 0 1 14 0q0 5-4 8q8 2 8 10v16z"/>` +
    `<path class="t0" d="M-6 2v-17h12v17zM-7-34h14v3h-14z"/><path class="la" d="M11-14q0-8-8-10M7-34q0-6-7-7"/>` +
    `<path class="p1" d="M9-20l14 9-2 4-15-7z"/></g></g>`
  // Stools.
  const stool = (z: number) => {
    const [x, y] = P(LX + STOOL, 0.5, z)
    const s = ppm(z) / 42

    return `<path class="a4" d="M${R(x - 8 * s)} ${R(y)}h${R(16 * s)}v${R(3 * s)}h${R(-6 * s)}v${R(18 * s)}h${R(-4 * s)}v${R(-18 * s)}h${R(-6 * s)}z"/>`
  }
  // Awning: top in wet stripes, valance, poles.
  const aw = new Bucket()
  const top = (z0: number, z1: number) => shape([LW.pt(z0, 3.5), LW.pt(z1, 3.5), edge.pt(z1, 3.08), edge.pt(z0, 3.08)])
  for (let i = 0; i < 13; i++) aw.add(i % 2 ? 't1' : 't0', top(Z0 + i * 0.6, Z0 + (i + 1) * 0.6))
  aw.add('t1', edge.q(Z0, Z1, 2.76, 3.08))
  for (let i = 0; i < 13; i += 2) aw.add('t0', edge.q(Z0 + i * 0.6, Z0 + (i + 1) * 0.6, 2.76, 3.08))
  aw.add('a4', edge.q(Z1 - 0.1, Z1, 0, 2.76))
  // The kiosk wall facing the camera.
  const kq = (x0: number, x1: number, y0: number, y1: number) => shape([kp(x0, y1), kp(x1, y1), kp(x1, y0), kp(x0, y0)])
  const kiosk = new Bucket()
  kiosk.add('a4', kq(0.05, 2.6, 0, 1.2)).add('a1', kq(0.05, 2.6, 0, 0.14)).add('a3', kq(0.05, 2.6, 1.14, 1.2))
  // The lit menu: three bowls and price bars; dark when the stall shuts.
  const menu = new Bucket()
  menu.add('l5', kq(0.2, 2.45, 0.24, 1.14))
  for (let i = 0; i < 3; i++) {
    const [x, y] = kp(0.55 + i * 0.75, 0.72)
    menu.add('l2', `M${R(x - 11)} ${R(y - 6)}h22q0 13-11 13t-11-13z`).add('l1', `M${R(x - 9)} ${R(y + 14)}h18v3h-18z`)
    menu.add('p0 st', `M${R(x - 7)} ${R(y - 6)}q7-7 14 0z`)
  }
  const kx = R(kp(2.6, 0)[0])
  // A banner on a pole at the stall's far corner.
  const [bx, by] = P(LX + EDGE + 0.4, 3.1, Z1 + 3.4)
  const bs = ppm(Z1 + 3.4) / 34
  const banner =
    `<path class="rl" d="M${R(bx)} ${R(by - 4)}V${R(P(LX + EDGE + 0.4, 0, Z1 + 3.4)[1])}"/>` +
    `<g transform="translate(${R(bx)} ${R(by)}) scale(${r1(bs)})"><g class="sway d2"><path d="M0 0h19v72h-19z" fill="#b8243a"/><path class="la" d="M0 0h19"/>` +
    `<text class="jp" font-size="13" text-anchor="middle" fill="#fff"><tspan x="9.5" y="15">ラ</tspan><tspan x="9.5" y="29">ー</tspan><tspan x="9.5" y="43">メ</tspan><tspan x="9.5" y="57">ン</tspan></text></g></g>`
  const [p1x, p1y] = P(LX + 1.05, 1.5, 15.6)
  const [p2x, p2y] = P(LX + 1.05, 1.5, 18.3)
  const steam =
    puff(p1x, p1y, 13, 'pf d1') +
    puff(p2x, p2y, 11, 'pf d3') +
    puff(p1x + 6, p1y, 12, 'pf d5') +
    `<g class="wo">${puff(p1x, p1y, 20, 'pf d0')}${puff(p2x + 10, p2y, 20, 'pf d6')}${puff(p1x + 16, p1y - 10, 22, 'pf2 d3')}</g>`
  const [gx, gy] = P(LX + 3.4, 0, 16)
  // The roller shutter from the awning's edge to the ground.
  let ribs = ''
  for (let y = 0.15; y < 2.76; y += 0.16) ribs += shape([edge.pt(Z0, y), edge.pt(Z1, y)], false)
  const [tx, ty] = edge.pt(17, 1.6)
  const shutter =
    `<g class="ea"><path class="a3" d="${edge.q(Z0, Z1, 0, 2.76)}"/><path d="${ribs}" stroke="var(--a1)" fill="none"/>` +
    `<g transform="translate(${R(tx)} ${R(ty)})"><rect x="-34" y="-14" width="68" height="28" fill="#c8202e"/><text class="jp" y="7" font-size="17" text-anchor="middle" fill="#fff">閉店</text></g></g>`

  return (
    `<path class="l5" d="${back}"/><path class="op" d="${back}" fill="url(#stw)"/>` +
    inner.toString() +
    vendor +
    b.toString() +
    pot(15.6) +
    pot(18.3) +
    `<path class="amb" d="${shape([front.pt(Z0, 0.98), front.pt(Z1, 0.98)], false)}"/>` +
    `<ellipse class="nt op" cx="${R(gx)}" cy="${R(gy)}" rx="210" ry="40" fill="url(#ga)" fill-opacity=".5"/>` +
    [13.8, 17.8, 19.0].map(stool).join('') +
    customer(15, 2) +
    customer(16.7, 5) +
    aw.toString() +
    `<path d="${top(Z0, Z1)}" fill="url(#awm)"/>` +
    `<path class="rm" d="${shape([edge.pt(Z0, 3.08), edge.pt(Z1, 3.08)], false)}"/>` +
    `<g class="op">${[13.1, 14.7, 16.3, 17.9, 19.5].map((z, i) => lantern(z, i + 1)).join('')}</g>` +
    shutter +
    kiosk.toString() +
    `<g class="op">${menu.toString()}</g>` +
    `<path class="rc2" d="M${kx} ${R(kp(0, 1.2)[1])}V${R(kp(0, 0)[1])}"/>` +
    banner +
    `<g class="op">${steam}</g>`
  )
}

// The kiosk's screen: light standing over the pedestal, the order number
// and the last command in it.
export const KIOSK_PANEL = { x: R(kp(0.14, 0)[0]), y: R(kp(0, 2.86)[1]), w: R(kp(2.51, 0)[0] - kp(0.14, 0)[0]), h: R(kp(0, 1.22)[1] - kp(0, 2.86)[1]) }

export const kioskDisplay = (): string => holoPanel(KIOSK_PANEL, 'var(--scr)', { emit: 'none' }) + MARK.kiosk

export const STALL_DEFS =
  `<linearGradient id="stw" x2="0" y2="1"><stop stop-color="#ffb45a" stop-opacity="var(--sto)"/><stop offset="1" stop-color="#ff7a3a" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="lan" cy=".45"><stop stop-color="#fff2c0"/><stop offset=".5" stop-color="#ff9a3a"/><stop offset="1" stop-color="#d0341c"/></radialGradient>` +
  `<linearGradient id="awm" x2="1" y2="1"><stop stop-color="var(--holo)" stop-opacity=".5"/><stop offset=".7" stop-color="var(--holo)" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>`

export const STALL_CSS =
  `.la{fill:none;stroke:#ffb86a;stroke-opacity:var(--lao);stroke-width:1.4}` +
  `.amb{fill:none;stroke:#ffb45a;stroke-opacity:.8;stroke-width:2}` +
  `.lsw{animation:lsw 4.7s ease-in-out infinite alternate}@keyframes lsw{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}` +
  `.bob{animation:bob 2.3s ease-in-out infinite alternate}@keyframes bob{to{transform:translateY(1.5px) rotate(2deg)}}` +
  `.nod{animation:nod 9.1s ease-in-out infinite}@keyframes nod{0%,80%,100%{transform:translateY(0)}88%{transform:translateY(3px)}}` +
  `.pf{animation:pf 6.1s ease-out infinite}@keyframes pf{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:var(--pfo)}100%{transform:translate(26px,-120px) scale(2.6);opacity:0}}` +
  `.pf2{animation:pf2 8.3s ease-out infinite}@keyframes pf2{0%{transform:translate(0,0) scale(.5);opacity:0}12%{opacity:var(--pfo)}100%{transform:translate(-30px,-170px) scale(3.4);opacity:0}}`
