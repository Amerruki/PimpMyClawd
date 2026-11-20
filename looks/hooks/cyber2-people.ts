import { CAM, F, P, r1 } from './cyber2-kit'
import { depthFrames } from './cyber2-street'

// People in the rain. A walk is shown the old way: two straight, still legs
// and the whole figure riding a small calm bounce as it travels, umbrella
// and all. Three paces, so no two lines bob together. People who stand do
// not bounce. Each takes the hologram's magenta on the left of the canopy
// and the screens' cyan on the right.

const R = Math.round
const REF = 22

// The upper body: coat, head, an arm up to the umbrella, the canopy.
// The legs, head and arm share one paint, so they are one path; `extra` adds
// to it (a bag).
const upper = (extra = ''): string =>
  `<path class="p1" d="M-9-58q0-7 7-8h5q7 1 7 8l2 25h-23z"/><path class="p0" d="${LEGS}M-5.5-71a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0zM8-60l3 2-3 13-3-1z${extra}"/>` +
  `<path class="rl" d="M7-48l3-36"/><path fill="currentColor" fill-opacity=".9" d="M-22-82q32-36 64 0q-32-8-64 0z"/>` +
  `<path class="rm" d="M-22-82q14-17 30-19"/><path class="rc2" d="M42-82q-10-13-20-17"/>`
// Two straight legs, side by side.
const LEGS = 'M-7-37h6l-1 37h-4zM1-37h6l-1 37h-4z'
const body = (cls: string, extra = ''): string => `<g class="${cls}">${upper(extra)}</g>`

export const PEOPLE_DEFS =
  `<g id="pd">${body('bn')}</g>` +
  `<g id="pe">${body('bq', 'M-13-44h6v12h-6z')}</g>` +
  `<g id="pf">${body('br2')}</g>` +
  // Standing still.
  `<g id="pt">${upper()}</g>`

const k = F / REF
const at = (x: number, cls: string, id = 'pd') => `<use href="#${id}" x="${R(x * k)}" y="${R(CAM * k)}" class="${cls}"/>`
const stand = (x: number, z: number, cls: string) => {
  const [px, py] = P(x, 0, z)

  return `<g transform="translate(${R(px)} ${R(py)}) scale(${r1(F / z / k)})"><use href="#pt" class="${cls}"/></g>`
}

// The lines by the walls, behind the stall and the cart: drawn before them.
export function peopleFar(): string {
  const cs = F / 47.2 / k

  return (
    stand(17.6, 44, 'u4') +
    stand(18.3, 44.6, 'u2') +
    stand(-15.2, 40, 'u3') +
    `<g transform="translate(0 ${R(560 + (CAM * F) / 47.2)}) scale(${r1(cs)})"><use href="#pf" class="cx u2"/></g>` +
    `<g transform="translate(850 560)">` +
    at(-15.6, 'wt u1 d0') +
    at(-17.4, 'wt u3 d7', 'pf') +
    at(-14.6, 'wv u4 d2', 'pe') +
    at(13.6, 'wt u2 d5', 'pe') +
    at(12, 'wv u3 d3', 'pf') +
    `</g>`
  )
}

// The lines along the kerbs, in front of everything: these pass close to the
// camera and leave by the frame's edges.
export function peopleNear(): string {
  return (
    stand(7.7, 16.4, 'u1') +
    `<g transform="translate(850 560)">` +
    at(-8.4, 'wt u2 d4', 'pe') +
    at(-9.4, 'wt u4 d9', 'pf') +
    at(-8.8, 'wv u1 d8') +
    at(7.2, 'wt u1 d1', 'pf') +
    at(7.4, 'wv u4 d0', 'pe') +
    `</g>`
  )
}

export const PEOPLE_CSS =
  `.u1{color:#d2364c}.u2{color:#d9e6ea}.u3{color:#e8b83a}.u4{color:#3a4a6a}` +
  `.bn{animation:bnc .54s ease-in-out infinite alternate}.bq{animation:bnc .62s ease-in-out infinite alternate;animation-delay:-.2s}.br2{animation:bnc .7s ease-in-out infinite alternate;animation-delay:-.45s}` +
  `@keyframes bnc{from{transform:translateY(0)}to{transform:translateY(-2px)}}` +
  `.wt{animation:wt 47s linear infinite}.wv{animation:wt 53s linear infinite reverse}` +
  depthFrames('wt', REF, 84, 8.6) +
  `.cx{animation:cx 61s linear infinite alternate}@keyframes cx{from{transform:translateX(1480px)}to{transform:translateX(2150px)}}`
