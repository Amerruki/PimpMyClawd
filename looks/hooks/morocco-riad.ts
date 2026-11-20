import { makeColors } from './make-colors.js'
import { grade, n, svg } from './kit'
import type { Look } from './look'
import { S, TOP, P, W, WALLS, d3, floorAffine, ppm, wquad } from './morocco-riad-geo'
import type { V3 } from './morocco-riad-geo'
import { arcade, lit } from './morocco-riad-arch'
import { field488, rosettePanel, stucco } from './morocco-riad-zellige'
import { FOUNT, banana, bed, fountain, hedge, orangeTree, plaza } from './morocco-riad-court'
import { LANTERN_SYMBOL, beam, bougainvillea, cat, lantern, petals, sitting, sky, sparrows, tortoise } from './morocco-riad-life'

// Riad: inside the courtyard of a traditional house in the medina, standing
// in its south-west corner and looking across the garden. Two storeys of
// horseshoe arcades on marble columns, carved stucco, cedar and
// green-glazed tile round a sky of its own; zellige dados and rosette
// panels, a star-shaped fountain, orange trees, banana and bougainvillea.
// By day a mid-morning sun cuts across the far corner and the rest lies in
// cool shade; by night the lanterns are lit and throw their pierced light
// on the walls under the stars.
const { theme, problems } = makeColors({
  label: 'Riad',
  roles: { accent: { seed: '#1f5fbf' }, danger: '#c8323c', success: '#2f9a5a', warning: '#c99212', pro: '#7a5ad0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f1ece4',
        'surface-1': '#f6f2ec',
        'surface-2': '#fbf8f4',
        'text-primary': '#1f1c1a',
        'text-secondary': '#3d3833',
        'text-muted': '#5a534c',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#11141c',
        'surface-1': '#161a24',
        'surface-2': '#1c2130',
        'surface-3': '#222838',
        'text-primary': '#efe9df',
        'text-secondary': '#cbc4b8',
        'text-muted': '#9e978c',
      },
    },
  },
})

const PATTERNS =
  field488('z-dado', 12, { ground: '#efe6d3', a: '#1f5fbf', b: '#18784a', c: '#d6a12a', line: '#3a3029' }, (67.5 * Math.PI) / 180, 0.5) +
  stucco('z-stucco', 18) +
  rosettePanel('z-ros', 110) +
  `<pattern id="z-beam" width="40" height="50" patternUnits="userSpaceOnUse"><rect width="40" height="50" class="cedar"/><path class="cedar-dk" d="M0 8H40V11H0ZM0 39H40V42H0ZM4 15H18V35H4ZM22 15H36V35H22Z"/><path class="cedar-lt" d="M6 17L11 25L6 33ZM16 17L11 25L16 33ZM24 17L29 25L24 33ZM34 17L29 25L34 33Z"/></pattern>` +
  `<pattern id="z-mash" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" class="mash-gap"/><path class="cedar" d="M0 2.8H7V4.2H0ZM2.8 0H4.2V7H2.8Z"/><circle cx="3.5" cy="3.5" r="1.8" class="cedar"/><circle cx="3" cy="3" r=".8" class="cedar-lt"/></pattern>` +
  `<pattern id="z-door" width="120" height="220" patternUnits="userSpaceOnUse"><rect width="120" height="220" class="cedar"/><path class="paint-a" d="M8 8H112V212H8Z"/><path class="cedar" d="M14 14H57V206H14ZM63 14H106V206H63Z"/><path class="paint-b" d="M35 60L50 90L35 120L20 90ZM85 60L100 90L85 120L70 90Z"/><path class="paint-c" d="M35 140L47 160L35 180L23 160ZM85 140L97 160L85 180L73 160Z"/><path class="cedar-dk" d="M59 8H61V212H59Z"/></pattern>` +
  `<pattern id="z-raft" width="42" height="42" patternUnits="userSpaceOnUse"><rect width="42" height="42" class="cedar-under"/><path class="cedar" d="M4 0H16V42H4Z"/><path class="cedar-lt" d="M4 0H6V42H4Z"/></pattern>` +
  `<pattern id="z-ends" width="16" height="20" patternUnits="userSpaceOnUse"><rect width="16" height="20" class="tile-dk"/><path class="tile" d="M1 20V8Q8 0 15 8V20Z"/><path class="tile-hi" d="M4 9Q7 4 10 5"/></pattern>` +
  `<pattern id="z-tiles" width="16" height="24" patternUnits="userSpaceOnUse"><rect width="16" height="24" class="tile-dk"/><path class="tile" d="M1 0H15V22H1Z"/><path class="tile-hi" d="M4 1H7V21H4Z"/></pattern>` +
  `<pattern id="z-rug" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#8e2a1e"/><path fill="#d9a441" d="M30 6L50 30L30 54L10 30Z"/><path fill="#8e2a1e" d="M30 14L43 30L30 46L17 30Z"/><path fill="#1f3f6a" d="M30 22L37 30L30 38L23 30Z"/><path fill="#efe2c8" d="M0 0H60V3H0ZM0 3L6 9L0 15ZM60 3L54 9L60 15Z"/></pattern>` +
  `<pattern id="z-cloth" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#a3342a"/><path fill="#e2b04a" d="M0 4H40V8H0ZM0 22H40V24H0Z"/><path fill="#2c4a7a" d="M0 12H40V17H0Z"/><path fill="#efe2c8" d="M0 30H40V31H0Z"/></pattern>` +
  `<pattern id="r-spots" width="34" height="34" patternUnits="userSpaceOnUse"><path fill="url(#r-spot)" d="M17 3L20 14L31 17L20 20L17 31L14 20L3 17L14 14Z"/><circle cx="0" cy="0" r="4" fill="url(#r-spot)"/><circle cx="34" cy="0" r="4" fill="url(#r-spot)"/><circle cx="0" cy="34" r="4" fill="url(#r-spot)"/><circle cx="34" cy="34" r="4" fill="url(#r-spot)"/></pattern>` +
  `<pattern id="r-tad" width="420" height="420" patternUnits="userSpaceOnUse"><rect width="420" height="420" class="tad"/><g fill="url(#r-blot)"><ellipse cx="80" cy="90" rx="120" ry="70"/><ellipse cx="300" cy="60" rx="90" ry="60"/><ellipse cx="260" cy="260" rx="150" ry="80"/><ellipse cx="60" cy="330" rx="90" ry="70"/></g><g fill="url(#r-blotd)"><ellipse cx="180" cy="170" rx="110" ry="50"/><ellipse cx="380" cy="380" rx="90" ry="60"/><ellipse cx="40" cy="220" rx="60" ry="40"/></g></pattern>`

const walls = (['north', 'east', 'west'] as const).map(k => arcade(WALLS[k]))

const floorSq: V3[] = [[0, 0, 0], [S, 0, 0], [S, 0, S], [0, 0, S]]
const litFloor = lit(floorSq)

// The court's tiles as a checker: every other row and every other column,
// filled even-odd, so 24 strips make 288 squares.
let checker = ''
for (let i = 0; i < 24; i += 2) {
  checker += d3([[i * 0.5, 0, 0], [i * 0.5 + 0.5, 0, 0], [i * 0.5 + 0.5, 0, S], [i * 0.5, 0, S]])
  checker += d3([[0, 0, i * 0.5], [S, 0, i * 0.5], [S, 0, i * 0.5 + 0.5], [0, 0, i * 0.5 + 0.5]])
}

const F = fountain()
const rim: V3 = [FOUNT[0] - 1.05, 0.5, FOUNT[2] - 0.75]
const flat = (P([6, 0.38, 5])[1] - P([6, 0.38, 7])[1]) / 2 / ppm([6, 0.38, 6])
const B = bougainvillea()
const SIT = sitting()
// The style sheet with its spacing taken out, keeping the night query's
// exact text, which /skin rewrites to force a version.
const css = (t: string) =>
  t
    .replace(/\s*\n\s*/g, '')
    .replace(/\s*([{};:,])\s*/g, '$1')
    .replace('@media (prefers-color-scheme:dark)', '@media (prefers-color-scheme: dark) ')

// Lanterns: in the west, north and east arcades, and a big one standing on
// the floor by the sitting corner. Each lights the plane beside it at night.
const back = (w: 'west' | 'north' | 'east', u: number) => {
  const wall = WALLS[w]
  return { o: W(wall, u, 1.9, -2.4), ex: wall.u, ey: [0, -1, 0] as V3 }
}
const backBox = (w: 'west' | 'north' | 'east', u0: number, u1: number): V3[] => {
  const wall = WALLS[w]
  return [W(wall, u0, 0, -2.4), W(wall, u1, 0, -2.4), W(wall, u1, 4.6, -2.4), W(wall, u0, 4.6, -2.4)]
}
const LANTERNS = [
  { at: W(WALLS.west, 6, 3.05, -0.9), plane: back('west', 6.2), size: 0.55, spotsBox: backBox('west', 3.6, 8.8) },
  { at: W(WALLS.north, 6, 3.05, -0.9), plane: back('north', 6), size: 0.55, spotsBox: backBox('north', 3.6, 8.4) },
  { at: W(WALLS.east, 2.55, 2.95, -0.9), plane: back('east', 2.55), size: 0.55, spotsBox: backBox('east', 0, 5.2) },
  { at: [0.9, 0, 7.0] as V3, plane: { o: [0, 1.0, 7.0] as V3, ex: [0, 0, 1] as V3, ey: [0, -1, 0] as V3 }, size: 0.75, hang: false, spotsBox: [[0, 0, 4.6], [0, 0, 9.6], [0, 3.4, 9.6], [0, 3.4, 4.6]] as V3[] },
].map(lantern)


// The sky's own outline, so stars stay in it.
const skyPoly = [P([S + 0.75, TOP, 1.5]), P([S + 0.75, TOP, S + 0.75]), P([-0.75, TOP, S + 0.75]), P([-0.75, TOP, 2.2])]
const openSky = (x: number, y: number): boolean => {
  // Above every edge of the roofline, which runs left to right across the frame.
  for (let i = 0; i < skyPoly.length - 1; i++) {
    const [a, b] = [skyPoly[i + 1]!, skyPoly[i]!]
    if (x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])) {
      const yy = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])
      if (y > yy - 6) return false
    }
  }
  return true
}
const SKY = sky(openSky)

// The leaf of a carved cedar door, open toward the camera at the left edge,
// in deep shade: panels with star medallions and rows of iron studs.
const door = (() => {
  const x0 = -10
  const x1 = 118
  const y0 = (x: number) => -40 + x * 0.25
  const y1 = (x: number) => 1040 - x * 0.12
  const at = (x: number, t: number) => y0(x) + (y1(x) - y0(x)) * t
  const quad = (a: number, b: number, t0: number, t1: number) => `M${n(a)} ${n(at(a, t0))}L${n(b)} ${n(at(b, t0))}L${n(b)} ${n(at(b, t1))}L${n(a)} ${n(at(a, t1))}Z`
  let panels = ''
  let studs = ''
  for (const [t0, t1] of [[0.05, 0.3], [0.34, 0.66], [0.7, 0.95]] as const) {
    panels += quad(18, 100, t0, t1)
    for (let t = t0 + 0.02; t < t1; t += 0.045) studs += `M10 ${n(at(10, t))}h3M105 ${n(at(105, t))}h3`
  }
  const star = (cx: number, cy: number, r: number) =>
    `M${Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2
      const rr = i % 2 ? r * 0.55 : r
      return `${n(cx + Math.cos(a) * rr * 0.62)} ${n(cy + Math.sin(a) * rr)}`
    }).join('L')}Z`

  return (
    `<path class="door-leaf" d="${quad(x0, x1, 0, 1)}"/><path fill="url(#k-side)" d="${quad(x0, x1, 0, 1)}"/>` +
    `<path class="door-panel" d="${panels}"/><path class="door-groove" d="${panels}"/>` +
    `<path class="door-star" d="${star(59, at(59, 0.175), 34)}${star(59, at(59, 0.5), 46)}${star(59, at(59, 0.825), 34)}"/>` +
    `<path class="stud" d="${studs}"/><path class="door-edge" d="M${x1} ${n(y0(x1))}V${n(y1(x1))}"/>`
  )
})()

// Warm light in a few of the upper rooms at night.
// At night the arcades glow from within: a warm wash over each gallery,
// light in a few of the upper rooms, the lanterns' pierced light on the
// back walls. All of it lies behind the facades, so it shows only through
// the arches.
// A striped cotton curtain hung in a doorway of the north arcade, breathing
// in the draught.
const curt = (u0: number, u1: number) => wquad(WALLS.north, u0, 0, u1, 2.62, -2.37)
const curtain = `<g class="curtain"><path class="curt" d="${curt(1.95, 3.15)}"/><path class="curt-a" d="${curt(2.1, 2.22)}${curt(2.88, 3.0)}"/><path class="curt-b" d="${curt(2.52, 2.58)}"/><path fill="url(#k-lo)" d="${curt(1.95, 3.15)}"/></g>`

// Lamplight caught on the basin's water at night.
const glints = [[-0.5, -0.3], [0.45, -0.4], [-0.2, 0.5], [0.6, 0.3]]
  .map(([dx, dz], i) => {
    const p = P([FOUNT[0] + (dx as number), 0.47, FOUNT[2] + (dz as number)])
    return `<ellipse class="glint" style="animation-delay:-${i * 1.3}s" cx="${n(p[0])}" cy="${n(p[1])}" rx="${7 - i}" ry="1.6"/>`
  })
  .join('')

const nightInside =
  `<g class="night">` +
  walls.map((w, i) => `<path fill="url(#r-warm${i})" d="${w.outline}"/>`).join('') +
  `<path class="win" d="${wquad(WALLS.north, 5.5, 5.1, 6.5, 7.2, -1.98)}${wquad(WALLS.east, 2.0, 5.1, 3.1, 7.2, -1.98)}${wquad(WALLS.west, 9.0, 5.1, 9.9, 7.0, -1.98)}"/>` +
  LANTERNS.slice(0, 3).map(l => l.spots).join('') +
  `</g>`

const DEFS =
  PATTERNS +
  LANTERN_SYMBOL +
  walls.map(w => w.defs).join('') +
  LANTERNS.map(l => l.defs).join('') +
  SIT.defs +
  `<pattern id="r-curb" href="#z-dado" patternTransform="scale(.75)"/><pattern id="r-fz" href="#z-dado" patternTransform="scale(.95)"/><pattern id="r-pl" href="#z-dado" patternTransform="${floorAffine(6, 6)}"/>` +
  `<radialGradient id="r-orange" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#ffd27a"/><stop offset=".45" stop-color="#f08a1c"/><stop offset="1" stop-color="#b8520c"/></radialGradient>` +
  `<linearGradient id="r-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--water0)"/><stop offset="1" style="stop-color:var(--water1)"/></linearGradient>` +
  `<linearGradient id="r-aoL"><stop offset="0" stop-color="#1a1430" stop-opacity=".3"/><stop offset="1" stop-color="#1a1430" stop-opacity="0"/></linearGradient><linearGradient id="r-aoR" href="#r-aoL" x1="1" x2="0"/>` +
  `<linearGradient id="r-ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a10" stop-opacity="0"/><stop offset="1" stop-color="#2a1a10" stop-opacity=".35"/></linearGradient>` +
  `<linearGradient id="r-shade" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="900"><stop offset="0" style="stop-color:var(--shade);stop-opacity:var(--shade-a0)"/><stop offset="1" style="stop-color:var(--shade);stop-opacity:var(--shade-a1)"/></linearGradient>` +
  `<linearGradient id="r-floorsh" gradientUnits="userSpaceOnUse" x1="0" y1="760" x2="0" y2="1000"><stop offset="0" style="stop-color:var(--shade);stop-opacity:var(--shade-a1)"/><stop offset="1" style="stop-color:var(--shade);stop-opacity:var(--shade-a0)"/></linearGradient>` +
  `<radialGradient id="r-blot"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-blotd"><stop offset="0" stop-color="#5a2a10" stop-opacity=".1"/><stop offset="1" stop-color="#5a2a10" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-cloud"><stop offset=".3" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-moonglow"><stop offset=".3" stop-color="#cfe0ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-lglow"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".9"/><stop offset=".35" stop-color="#ffab45" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a20" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-fade" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-spot"><stop offset="0" stop-color="#ffd890" stop-opacity=".9"/><stop offset="1" stop-color="#ffb050" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="r-pool"><stop offset="0" stop-color="#ffb35a" stop-opacity=".42"/><stop offset=".6" stop-color="#ff9a40" stop-opacity=".12"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="r-beam" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="860"><stop offset="0" stop-color="#fff4d8" stop-opacity="0"/><stop offset="1" stop-color="#fff0c8" stop-opacity=".16"/></linearGradient>` +
  [WALLS.north, WALLS.east, WALLS.west]
    .map((w, i) => {
      const c = P(W(w, 6, 2.2, -1.2))
      return `<radialGradient id="r-warm${i}" gradientUnits="userSpaceOnUse" cx="${n(c[0])}" cy="${n(c[1])}" r="${n(ppm(W(w, 6, 2, -1)) * 5)}"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".42"/><stop offset="1" stop-color="#ff8a2a" stop-opacity=".1"/></radialGradient>`
    })
    .join('') +
  `<linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky0)"/><stop offset=".55" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>`

const CSS = `
.night { display: none; }
:root, svg {
  --sky0:#3f7fcf; --sky1:#8dbbe6; --sky2:#d6e8f4;
  --tad:#e0b78b; --soffit:#c2946b; --gal:#8c6a52; --gal-floor:#9a7a60; --ceil:#4a2c1c;
  --cedar:#7a4526; --cedar-dk:#4e2a17; --cedar-lt:#a9683a;
  --stc-face:#efe3cc; --stc-deep:#b9a185; --stc-hi:#fffaf0; --stc-lo:#8d7660;
  --shade:#1f3c80; --shade-a0:.18; --shade-a1:.36;
  --sun:#ffcf86; --sun-a:.14;
  --floor0:#e8dfcd; --floor1:#b7c8b6; --water0:#5c9cb0; --water1:#24586a;
  --brass:#b98a3a; --brass-dk:#6f4f1c; --brass-hi:#f3d58a; --holes:#3a2410; --flame:0;
  --veil1:0; --veil2:0; --dl:#4a2816; --dp:#5a321c; --ds:#6a3c20;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --sky0:#0e1f52; --sky1:#2a4a9a; --sky2:#3d5ca8;
    --sun:#1f3c80; --sun-a:.36;
    --water0:#3a5a78; --water1:#16283a;
    --brass:#6a4a20; --brass-dk:#2a1a08; --brass-hi:#c98a3a; --holes:#ffd27a; --flame:1;
    --veil1:.45; --veil2:.58; --gal:#d08e54; --gal-floor:#b8804e; --ceil:#6a3a1c; --soffit:#b07a4a; --dl:#1a100c; --dp:#20140e; --ds:#2a1a12;
  }
  .day, .sun-in { display: none; }
  .night { display: inline; }
}
.sky { fill: url(#rs-sky); }
.tad { fill: var(--tad); }
.wall { fill: url(#r-tad); }
.soffit { fill: var(--soffit); }
.gal-back { fill: var(--gal); } .gal-floor { fill: var(--gal-floor); } .gal-ceil { fill: var(--ceil); }
.cedar { fill: var(--cedar); } .cedar-dk { fill: var(--cedar-dk); } .cedar-lt { fill: var(--cedar-lt); }
.cedar-under { fill: var(--ceil); } .cedar-edge { fill: var(--cedar-dk); }
.stc-face { fill: var(--stc-face); } .stc-deep { fill: var(--stc-deep); }
.stc-hi { fill: none; stroke: var(--stc-hi); stroke-width: 1.1; } .stc-lo { fill: none; stroke: var(--stc-lo); stroke-width: 1.1; }
.alfiz { fill: var(--stc-face); }
.archivolt { fill: none; stroke: var(--stc-hi); stroke-opacity: .8; }
.dado-cap { fill: #1c3f2c; }
.door-frame { fill: var(--stc-face); }
.mash-gap { fill: #2a1a12; }
.paint-a { fill: #7a2f22; } .paint-b { fill: #2f6f5a; } .paint-c { fill: #c9902e; }
.tile { fill: #2f8a4e; } .tile-dk { fill: #164a2c; } .tile-hi { fill: #9fe0a8; fill-opacity: .5; stroke: #c8f2c8; stroke-opacity: .5; }
.floor { fill: var(--floor0); } .floor-k { fill: var(--floor1); }
.shade { fill: url(#r-shade); } .floor-shade { fill: url(#r-floorsh); }
.sunlit { fill: var(--sun); fill-opacity: var(--sun-a); }
.sun-in { fill: #ffe2b0; fill-opacity: .55; }
.marble { fill: #ebe6dc; } .marble-cap { fill: #d8d0c2; } .cap-cut { fill: #8f877c; }
.pl-rim { fill: #1c3a2c; } .pl-marble { fill: #ece6da; }
.curb-sh { fill: #10204a; fill-opacity: .22; } .coping { fill: #ece6da; } .soil { fill: #4a3426; }
.bark { fill: #5a4030; } .fruit circle { fill: url(#r-orange); } .rose circle { fill: #e2567a; }
.ban0 { fill: #4f8a2e; } .ban1 { fill: #3d7426; } .ban2 { fill: #6a9e38; } .ban-rib { fill: none; stroke: #c9dc8a; stroke-width: 1.2; stroke-opacity: .7; } .ban-stem { fill: #5f7a32; }
.fface { fill: #0d1a3a; }
.water { fill: url(#r-water); } .water-sky { fill: #bfe0ff; fill-opacity: .2; }
.ripple { fill: none; stroke: #fff; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: ripple 5s ease-out infinite; }
@keyframes ripple { from { transform: scale(.3); opacity: .9; } to { transform: scale(1.5); opacity: 0; } }
.stream { fill: none; stroke: #e8f6ff; stroke-width: 1.4; stroke-opacity: .8; stroke-dasharray: 6 5; animation: flow 1.4s linear infinite; }
.jet { fill: none; stroke: #f2fbff; stroke-width: 2.2; stroke-opacity: .85; }
.jet-fall { fill: none; stroke: #e8f6ff; stroke-width: 1.2; stroke-opacity: .7; stroke-dasharray: 4 4; animation: flow 1.1s linear infinite; }
@keyframes flow { to { stroke-dashoffset: -22; } }
.cloud ellipse { fill: url(#r-cloud); } .cloud { animation: drift linear infinite; }
.swift { fill: #1a1d26; animation: swift linear infinite; }
@keyframes swift { from { transform: translate(300px, var(--y)) rotate(-6deg); } 50% { transform: translate(900px, calc(var(--y) - 40px)) rotate(4deg); } to { transform: translate(1500px, var(--y)) rotate(-4deg); } }
.star { fill: #fff; animation: twinkle ease-in-out infinite; }
.moon { fill: #f4efdf; }
.chain { stroke: var(--brass-dk); stroke-width: 2; stroke-dasharray: 4 2; }
.brass { fill: var(--brass); } .brass-dk { fill: var(--brass-dk); } .brass-hi { stroke: var(--brass-hi); stroke-opacity: .6; }
.lan-holes { fill: var(--holes); }
.lan-glow, .lan-flame { opacity: var(--flame); } .lan-flame { fill: #fff2c0; } .lan-glow { animation: lamp 4.3s ease-in-out infinite; }
.lan-sway { animation: sway 9s ease-in-out infinite alternate; }
@keyframes sway { from { transform: rotate(-1.2deg); } to { transform: rotate(1.4deg); } }
@keyframes lamp { 0%,100% { opacity: var(--flame); } 40% { opacity: calc(var(--flame) * .75); } 70% { opacity: calc(var(--flame) * .95); } }
.bench-front { fill: #5a1c14; } .bench-sh { fill: #0a1430; fill-opacity: .3; } .c0 { fill: #9c2a22; } .c1 { fill: #c98a2a; } .c2 { fill: #2c4f80; }
.tray { fill: #9a7428; } .tray-hi { fill: #d8b25a; }
.silver { fill: #c9ccd2; } .silver-dk { stroke: #7a7e86; } .silver-hi { stroke: #fff; stroke-opacity: .8; }
.glass-a { fill: #c9762a; fill-opacity: .85; } .glass-b { fill: #2a7a5a; fill-opacity: .85; }
.steam { fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; opacity: 0; animation: steam 6.6s ease-out infinite; }
@keyframes steam { 0% { transform: translateY(6px); opacity: 0; } 30% { opacity: .45; } 100% { transform: translate(5px, -26px); opacity: 0; } }
.cat { fill: #a8865e; } .cat-dk { stroke: #5a4430; fill: none; } .cat-in { fill: #d89a8a; } .cat-lt { fill: #efe4d2; }
.tail { animation: tail 11s ease-in-out infinite; }
@keyframes tail { 0%,62%,100% { transform: rotate(0); } 72% { transform: rotate(-16deg); } 80% { transform: rotate(-5deg); } 88% { transform: rotate(-12deg); } }
.tortoise { animation: tort 260s linear infinite; }
@keyframes tort { from { transform: translate(0, 0); } to { transform: translate(var(--tx), var(--ty)); } }
.tort-shell { fill: #6a5a34; } .tort-scute { stroke: #3a2f18; } .tort-skin { fill: #8a7a58; }
.sparrow { fill: #8a6a4a; } .sparrow-dk { fill: #4a3626; }
.peck { animation: peck 7s ease-in-out infinite; transform-origin: 0 2px; }
@keyframes peck { 0%,60%,100% { transform: rotate(0); } 66% { transform: rotate(28deg) translateY(1px); } 72% { transform: rotate(0); } 78% { transform: rotate(30deg); } 84% { transform: rotate(0); } }
.flyer { animation: flyer 41s ease-in-out infinite; }
@keyframes flyer { 0% { transform: translate(-380px, -520px); opacity: 0; } 4% { opacity: 1; } 12%,48% { transform: translate(0, 0); } 50% { transform: translate(0, -4px); } 52%,58% { transform: translate(0, 0); } 70% { transform: translate(420px, -560px); opacity: 1; } 72%,100% { opacity: 0; transform: translate(420px, -560px); } }
.petal { fill: #e86a8a; }
.bstem { fill: #5a3a22; } .bg1 { fill: #d12a7c; }
.bract-fall { animation: fall linear infinite; }
@keyframes fall { 0% { transform: translate(0, 0) rotate(0); opacity: 0; } 5% { opacity: 1; } 50% { transform: translate(22px, 260px) rotate(200deg); } 90% { opacity: 1; } 100% { transform: translate(-6px, 520px) rotate(420deg); opacity: 0; } }
.beam { fill: url(#r-beam); }
.mote { fill: #fff8e0; animation: mote ease-in-out infinite alternate; }
@keyframes mote { from { transform: translate(-10px, 12px); opacity: .1; } 50% { opacity: .85; } to { transform: translate(14px, -18px); opacity: .2; } }
.door-leaf { fill: var(--dl); } .door-panel { fill: var(--dp); } .door-groove { fill: none; stroke: #2a160a; stroke-width: 3; }
.door-star { fill: var(--ds); stroke: #2a160a; stroke-width: 1.5; } .stud { stroke: #1a120c; stroke-width: 4; stroke-linecap: round; } .door-edge { stroke: #8a5a34; stroke-width: 2; }
.veil1 { fill: #071030; fill-opacity: var(--veil1); } .veil2 { fill: #050b22; fill-opacity: var(--veil2); }
.win { fill: #ffb45a; fill-opacity: .55; }
.curt { fill: #ece2cc; } .curt-a { fill: #b8452e; } .curt-b { fill: #3f7a5a; }
.curtain { transform-box: fill-box; transform-origin: 50% 0; animation: breathe 11s ease-in-out infinite alternate; }
@keyframes breathe { from { transform: skewX(-1.5deg) scaleX(.97); } to { transform: skewX(2deg) scaleX(1.01); } }
.glint { fill: #ffd690; animation: twinkle 3.7s ease-in-out infinite; }
`

const BODY =
  `<rect width="1600" height="1000" class="sky"/>` +
  `<g class="day">${SKY.day}</g>` +
  walls.map(w => w.interior).join('') +
  curtain +
  nightInside +
  `<path class="floor" d="${d3(floorSq)}"/><path class="floor-k" fill-rule="evenodd" d="${checker}"/>` +
  plaza() +
  `<path class="floor-shade" fill-rule="evenodd" d="${d3(floorSq)}${d3(litFloor)}"/><path class="sunlit" d="${d3(litFloor)}"/>` +
  walls.map(w => w.facade + `<path class="shade" fill-rule="evenodd" d="${w.outline}${w.lit}"/><path class="sunlit" d="${w.lit}"/>`).join('') +
  B.body +
  `<path class="veil1" fill-rule="evenodd" d="M0 0H1600V1000H0Z${walls.map(w => w.holes).join('')}"/>` +
  beam(litFloor) +
  B.fall +
  bed(7.4, 7.4, 10.7, 10.7, ['s', 'w']) +
  banana(10.1, 8.0, 7) +
  orangeTree(8.9, 9.0, 3.4, 1.25, 41, 66) +
  bed(1.3, 7.4, 4.6, 10.7, ['s']) +
  hedge(1.5, 4.4, 7.65, 12) +
  tortoise([10.6, 0, 5.6], [8.3, 0, 5.4]) +
  F.body +
  `<g class="ripples">${F.ripples}</g>` +
  petals([FOUNT[0], 0.47, FOUNT[2]], 0.8, flat) +
  F.streams +
  F.jet +
  sparrows(rim) +
  bed(7.4, 1.3, 10.7, 4.6, ['s', 'w']) +
  orangeTree(7.8, 4.1, 3.9, 1.5, 77, 165) +
  SIT.body +
  cat([0.42, 0.46, 4.25]) +
  SIT.steam +
  `<rect width="1600" height="1000" class="veil2"/>` +
  `<g class="night">${glints}${(LANTERNS[3] as { spots: string }).spots}${SKY.night}</g>` +
  LANTERNS.map(l => l.body).join('') +
  door +
  grade([480, 200], '#ffe6b8', '#2a4a8a', 0.8)

const SCENE = svg(css(CSS), DEFS, BODY)

export const MOROCCO_RIAD: Look = {
  label: 'Riad',
  args: { colors: theme, backdrop: { scene: 'riad', glass: { blur: 22, opacity: 0.55 } } },
  problems,
  scene: SCENE,
}
