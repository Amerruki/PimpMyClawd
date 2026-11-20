import { MARK as MARKS } from './cyber2-sky'
import { depthFrames } from './cyber2-street'

// Everything in the air: Clawd's hologram on the exchange roof (a
// translucent projection with the skyline showing through, the model written
// on the ring he stands in), the two flying-traffic lanes running to the
// vanishing point, courier drones, and the police craft that come out as the
// context window fills, all kept to the side gutters.

// Clawd's pixel rows, as the terminal draws it.
const BODY = ['...XXXXXXXXXXXX...', '...XXeXXXXXXeXX...', '.XXXXXXXXXXXXXXXX.', '...XXXXXXXXXXXX...']
const LEGS = '....X.X....X.X....'
// At work: claws thrown up.
const CLAWS = ['X................X', 'XX..............XX']
const PW = 10
const PH = 20

function runs(row: string, y: number): string {
  let out = ''
  for (let x = 0; x < row.length; ) {
    if (row[x] !== 'X') {
      x += 1
      continue
    }
    let end = x
    while (end < row.length && row[end] === 'X') end += 1
    out += `M${x * PW} ${y * PH}h${(end - x) * PW}v${PH}h${-(end - x) * PW}z`
    x = end
  }

  return out
}

// The projector on the pediment's apex, Clawd above it, and the ring he
// stands in, where the model is written.
export const HOLO = { x: 206, lens: 300, ring: 244, rx: 118, ry: 16 } as const
const CX = HOLO.x - 9 * PW
const CY = 136

export function hologram(): string {
  const { x, lens, ring, rx, ry } = HOLO
  const fig = `<use href="#cw" x="${CX}" y="${CY}"/>`
  const claws = `<path transform="translate(${CX} ${CY})" class="wo" d="${CLAWS.map((r, i) => runs(r, i)).join('')}"/>`
  const back = `M${x - rx} ${ring}A${rx} ${ry} 0 0 1 ${x + rx} ${ring}`
  const front = `M${x - rx} ${ring}A${rx} ${ry} 0 0 0 ${x + rx} ${ring}`

  return (
    `<g>` +
    // The halo and the cone from the lens up to the ring.
    `<ellipse class="fl" cx="${x}" cy="${CY + 50}" rx="${rx + 30}" ry="110" fill="url(#gm)" fill-opacity=".4"/>` +
    `<path class="fl" d="M${x - 5} ${lens}L${x - rx} ${ring}A${rx} ${ry} 0 0 0 ${x + rx} ${ring}L${x + 5} ${lens}z" fill="url(#hb)"/>` +
    `<path d="M${x - 12} ${lens + 2}l5-9h14l5 9z" class="x0"/><circle class="hfl" cx="${x}" cy="${lens - 6}" r="22" fill="url(#ln)"/>` +
    `<path d="${back}" fill="none" stroke="var(--holo)" stroke-opacity=".55" stroke-width="2"/>` +
    `<g class="hbo"><g class="hfg">` +
    `<g class="ghB" fill="#22e6ff" fill-opacity=".38">${fig}</g>` +
    `<g fill="url(#hl)">${fig}<path transform="translate(${CX} ${CY})" d="${runs(LEGS, 4)}"/>${claws}</g>` +
    `<g fill="url(#band)">${fig}</g>` +
    `</g></g>` +
    `<path id="rg" d="${front}" fill="none" stroke="var(--holo)" stroke-width="2.5"/>` +
    `<ellipse cx="${x}" cy="${ring}" rx="${rx}" ry="${ry}" fill="var(--holo)" fill-opacity=".14"/>` +
    MARKS.model +
    `</g>`
  )
}

const CAR =
  `<path class="x0" d="M-22 5q0-13 11-14h22q11 1 11 14l-5 5h-34z"/><path class="g1" d="M-12-7h24l4 6h-32z"/>`

export const AIR_DEFS =
  `<g id="cw"><path d="${BODY.map((r, y) => runs(r, y)).join('')}"/></g>` +
  // The hologram's paint: a soft fill with a bright scan line every 4 px.
  `<pattern id="hl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="var(--holo)" fill-opacity="var(--ho)"/><rect width="4" height="1.3" fill="var(--holo)" fill-opacity=".7"/></pattern>` +
  `<radialGradient id="ln"><stop stop-color="#fff"/><stop offset=".25" stop-color="var(--holo)" stop-opacity=".8"/><stop offset="1" stop-color="var(--holo)" stop-opacity="0"/></radialGradient>` +
  // A bright band swept down through the figure: the gradient itself moves, so nothing is clipped.
  `<linearGradient id="band" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="340"><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".53" stop-color="#fff" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="0 -100;0 200" dur="3.4s" repeatCount="indefinite"/></linearGradient>` +
  `<linearGradient id="hb" x1="0" y1="1" x2="0" y2="0"><stop stop-color="var(--holo)" stop-opacity=".6"/><stop offset=".5" stop-color="var(--holo)" stop-opacity=".14"/><stop offset="1" stop-color="var(--holo)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="sl" x2="0" y2="1"><stop stop-color="#eaf6ff" stop-opacity=".27"/><stop offset="1" stop-color="#eaf6ff" stop-opacity="0"/></linearGradient>` +
  // Lane cars: one coming, headlights; one going, tail lights.
  `<g id="fa">${CAR}<path d="M-18 2h8M10 2h8" stroke="#fff6d8" stroke-width="3.5" stroke-linecap="round"/><ellipse cy="12" rx="17" ry="4" fill="url(#gc)"/><circle class="bk" cy="-11" r="2" fill="#7dff5a"/></g>` +
  `<g id="fb">${CAR}<path d="M-19 2h10M9 2h10" stroke="#ff3a2a" stroke-width="3.5" stroke-linecap="round"/><ellipse cy="12" rx="17" ry="4" fill="url(#ga)"/><circle class="bk" cy="-11" r="2" fill="#ff3a2a"/></g>` +
  // A police craft, 120 wide at scale 1: wedge hull, canopy, light bar,
  // markings, belly lamp.
  `<g id="pc"><path class="x0" d="M-60 6l14-18h86l20 18-16 12h-88z"/><path class="g1" d="M-28-10h46l8 9h-62z"/><path d="M-60 6h120" stroke="#dfe8ff" stroke-opacity=".7" stroke-width="1.5"/>` +
  `<path d="M-40 10h76" stroke="#ffffff" stroke-opacity=".85" stroke-width="3"/><text x="-2" y="17" font-size="7" font-weight="700" letter-spacing="2" text-anchor="middle" fill="#fff" font-family="ui-monospace,Menlo,monospace">POLICE 警察</text>` +
  `<rect class="sr" x="-24" y="-17" width="22" height="6" fill="#ff2a3a"/><rect class="sb" x="2" y="-17" width="22" height="6" fill="#2a6aff"/>` +
  `<circle class="sr" cx="-14" cy="-14" r="34" fill="url(#gr)" fill-opacity=".8"/><circle class="sb" cx="14" cy="-14" r="34" fill="url(#gb)" fill-opacity=".8"/>` +
  `<circle cy="18" r="5" fill="#fff"/><circle cx="-54" cy="6" r="2.5" fill="#ff3a2a"/><circle cx="56" cy="6" r="2.5" fill="#7dff5a"/></g>` +
  `<radialGradient id="go"><stop stop-color="#ff9a6a" stop-opacity=".9"/><stop offset=".3" stop-color="#d97757" stop-opacity=".4"/><stop offset="1" stop-color="#d97757" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="gb"><stop stop-color="#3a7aff" stop-opacity=".85"/><stop offset=".38" stop-color="#3a7aff" stop-opacity=".28"/><stop offset="1" stop-color="#3a7aff" stop-opacity="0"/></radialGradient>`

// Flying traffic: lane A comes from the far end toward the upper left, lane
// B leaves toward the far end from the upper right.
export function lanes(): string {
  const car = (id: string, x: number, y: number, cls: string) => `<use href="#${id}" x="${x}" y="${y}" class="${cls}"/>`
  const a: [number, number, number][] = [[0, 0, 0], [26, -14, 2], [-10, 12, 5], [8, -20, 8]]
  const b: [number, number, number][] = [[0, 0, 1], [-28, 12, 3], [14, -10, 4], [-20, -16, 6], [6, 14, 8], [-34, -4, 9]]
  const A = (list: [number, number, number][]) => list.map(([x, y, d]) => car('fa', -458 + x, -560 + y, `fy d${d}`)).join('')
  const B = (list: [number, number, number][]) => list.map(([x, y, d]) => car('fb', 300 + x, -560 + y, `fz d${d}`)).join('')

  return `<g transform="translate(850 560)">${A(a.slice(0, 3))}${B(b.slice(0, 4))}</g>`
}

// Courier drones on slow errands in the gutters.
export function drones(): string {
  const one = (x: number, y: number, s: number, cls: string) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="${cls}"><path class="x0" d="M-7-2h14v4h-14zM-3 2h6v6h-6z"/><path class="rl" d="M-11-3h8M3-3h8"/><circle class="bk" cy="-1" r="1.6" fill="#ffb02e"/></g></g>`

  return one(300, 560, 1.3, 'dn d1') + one(1330, 540, 1.1, 'dn2 d4') + `<g class="wo">${one(80, 330, 0.9, 'dn d2')}${one(1250, 455, 0.8, 'dn2 d8')}</g>`
}

// The emergency: the ward washed in the alarm colour, beacons on the roofs.
export function alarm(): string {
  const spots: [number, number][] = [[14, 378], [398, 378], [1150, 432], [1600, 432]]

  return (
    `<g class="ea"><rect width="1600" height="1000" fill="#ff5a2a" fill-opacity=".15"/>` +
    spots.map(([x, y], i) => `<g class="bc d${i % 10}"><circle cx="${x}" cy="${y}" r="40" fill="url(#go)"/><circle cx="${x}" cy="${y}" r="4" fill="#fff"/></g>`).join('') +
    `</g>`
  )
}

// Police: each craft belongs to the level that brings it out, and all of
// them come out in an emergency. They hold to the gutters, the bigger ones
// with a searchlight down onto the street.
export function police(): string {
  const cone = (h: number, w: number) => `<g class="sx"><path d="M0 18L${-w} ${h}H${w}z" fill="url(#sl)"/></g>`
  const craft = (lv: number, x: number, y: number, s: number, cls: string, light = '') =>
    `<g class="q q${lv}" transform="translate(${x} ${y}) scale(${s})"><g class="${cls}">${light}<use href="#pc"/></g></g>`

  return (
    craft(1, 1470, 522, 0.8, 'pt') +
    craft(2, 362, 528, 1, 'pt2 d3', cone(150, 50)) +
    craft(3, 1300, 488, 1.6, 'pt2 d7', cone(170, 60)) +
    craft(4, 140, 548, 1.6, 'pt d2', cone(150, 60)) +
    craft(4, 1560, 452, 1, 'pt d5')
  )
}

export const AIR_CSS =
  `.hfl{animation:hfl 4.3s steps(1) infinite}@keyframes hfl{0%{opacity:1}31%{opacity:.6}36%{opacity:1}}` +
  `.hfg{animation:hfg 6.1s steps(1) infinite}@keyframes hfg{0%{opacity:.9}40%{opacity:.75}46%{opacity:.9}88%{opacity:.55;transform:translateX(3px)}92%{opacity:.9;transform:none}}` +
  `.ghB{animation:gh 6.1s steps(1) infinite}@keyframes gh{0%,86%{transform:translate(3px,0)}87%{transform:translate(-5px,0)}92%{transform:translate(3px,0)}}` +
  `.hbo{animation:hbo 3.5s ease-in-out infinite alternate}@keyframes hbo{to{transform:translateY(-5px)}}.wk .hbo{animation-duration:1.2s}` +
  `.fy{animation:fy 26s linear infinite}.fz{animation:fy 31s linear infinite reverse}` +
  depthFrames('fy', 50, 560, 40, true) +
  `.dn{animation:dn 29s ease-in-out infinite alternate}@keyframes dn{0%{transform:translate(0,0)}40%{transform:translate(70px,-60px)}100%{transform:translate(120px,-20px)}}` +
  `.dn2{animation:dn2 37s ease-in-out infinite alternate}@keyframes dn2{0%{transform:translate(0,0)}55%{transform:translate(-90px,-40px)}100%{transform:translate(-40px,30px)}}` +
  `.sr{animation:sr 2s steps(1) infinite}.sb{animation:sb 2s steps(1) infinite}@keyframes sr{0%{opacity:1}50%{opacity:.15}}@keyframes sb{0%{opacity:.15}50%{opacity:1}}` +
  `.bc{animation:bc 2.4s ease-in-out infinite}@keyframes bc{0%,100%{opacity:1}50%{opacity:.2}}` +
  `.pt{animation:pt 23s ease-in-out infinite alternate}@keyframes pt{from{transform:translate(-26px,6px)}to{transform:translate(30px,-9px)}}` +
  `.pt2{animation:pt2 31s ease-in-out infinite alternate}@keyframes pt2{from{transform:translate(30px,-8px)}to{transform:translate(-30px,10px)}}` +
  `.sx{animation:sx 9s ease-in-out infinite alternate}@keyframes sx{from{transform:rotate(-12deg)}to{transform:rotate(12deg)}}`
