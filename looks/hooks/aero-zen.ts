import { makeColors } from './make-colors.js'
import { bloom, bokeh, grade, layer, n, speckle, svg } from './kit'
import type { Look } from './look'

// Technozen: the quiet, Japanese side of mid-2000s tech. A pearl studio lit
// from the upper left, one warm orange lamp set in a brushed silver ring with
// embossed concentric grooves, floating rounded glass tiles with bright
// refracting edges, a calm horizon with a soft reflection. Night is graphite
// and smoked glass around the same orange glow.
const { theme, problems } = makeColors({
  label: 'Aero Zen',
  roles: { accent: '#e8721c', danger: '#c8283c', success: '#3f9a5a', warning: '#c79a12', pro: '#5a7ad0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eceef1',
        'surface-1': '#f2f3f5',
        'surface-2': '#f8f9fa',
        'text-primary': '#1c2129',
        'text-secondary': '#3a414c',
        'text-muted': '#545c68',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#121417',
        'surface-1': '#181b1f',
        'surface-2': '#1e2126',
        'surface-3': '#23272d',
        'text-primary': '#eceef1',
        'text-secondary': '#c6cad1',
        'text-muted': '#9ca2ac',
      },
    },
  },
})

const LAMP = { x: 1290, y: 270 }
const HORIZON = 772

const st = (o: number, v: string, a: number | string = 1): string =>
  `<stop offset="${o}" style="stop-color:var(--${v});stop-opacity:${a}"/>`

const ws = (o: number, a: number): string => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`

// An annulus as one even-odd path.
function annulus(r1: number, r2: number): string {
  const c = (r: number) => `M${LAMP.x - r} ${LAMP.y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`

  return `<path fill-rule="evenodd" d="${c(r2)}${c(r1)}"/>`
}

// A polished ring with a bevel drawn in gradients: the silver body, a bright
// inner lip toward the key light and a dark outer lip away from it.
function bevel(cx: number, cy: number, r: number, w: number): string {
  const c = (rr: number, sw: number, paint: string) => `<circle cx="${cx}" cy="${cy}" r="${n(rr)}" stroke="url(#${paint})" stroke-width="${n(sw)}"/>`

  return `<g fill="none">${c(r, w, 'z-silver')}${c(r - w * 0.3, w * 0.3, 'z-bev-hi')}${c(r + w * 0.36, w * 0.24, 'z-bev-lo')}${c(r - w * 0.48, 1, 'z-bev-lo')}${c(r + w * 0.12, w * 0.18, 'z-bev-hi')}</g>`
}

// The lamp: an orange glass sphere set in a brushed silver ring, with
// embossed grooves around it. Everything here is still; light sweeps across
// it in a separate group.
const RINGS = [
  { r1: 208, r2: 228 },
  { r1: 296, r2: 322 },
]

// Lathe-turned finish on the silver ring: fine concentric hairlines
// alternating light and dark.
const turned = Array.from({ length: 26 }, (_, i) => `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="${112 + i * 3}" class="${i % 2 ? 'z-tl' : 'z-td'}"/>`).join('')

const lamp =
  `<g class="z-amb"><circle cx="${LAMP.x}" cy="${LAMP.y}" r="640" fill="url(#z-amb)"/></g>` +
  `<g id="z-rings">` +
  `<g class="z-ringset">${RINGS.map(r => bevel(LAMP.x, LAMP.y, (r.r1 + r.r2) / 2, r.r2 - r.r1)).join('')}</g>` +
  bevel(LAMP.x, LAMP.y, 149, 82) +
  `<g class="z-turned">${turned}</g>` +
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="258" class="z-hair"/><circle cx="${LAMP.x}" cy="${LAMP.y}" r="372" class="z-hair"/>` +
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="108" class="z-well"/>` +
  `</g>` +
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="282" class="z-meter" stroke-dasharray="560 1300" transform="rotate(-200 ${LAMP.x} ${LAMP.y})"/>` +
  `<g class="z-breathe"><circle cx="${LAMP.x}" cy="${LAMP.y}" r="230" fill="url(#z-halo)"/></g>` +
  bloom(`<circle cx="${LAMP.x}" cy="${LAMP.y}" r="92" fill="url(#z-core)"/>`, 14, 0.85) +
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="86" fill="url(#z-caustic)"/>` +
  `<ellipse cx="${LAMP.x - 8}" cy="${LAMP.y - 46}" rx="60" ry="34" fill="url(#z-spec)" class="blur-1"/>` +
  `<ellipse cx="${LAMP.x - 40}" cy="${LAMP.y - 42}" rx="10" ry="6" fill="#fff" transform="rotate(-35 ${LAMP.x - 40} ${LAMP.y - 42})"/>`

// The lamp as the floor sees it: the same glow and rings, unlit and still.
const reflection =
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="640" fill="url(#z-amb)"/>` +
  `<g fill="url(#z-silver)">${RINGS.map(r => annulus(r.r1, r.r2)).join('')}${annulus(108, 190)}</g>` +
  `<circle cx="${LAMP.x}" cy="${LAMP.y}" r="92" fill="url(#z-core)"/>`

// Reflections gliding round the rings: arcs on a slowly turning
// group.
const arc = (r: number, a0: number, a1: number): string => {
  const p = (a: number) => `${n(r * Math.cos((a * Math.PI) / 180))} ${n(r * Math.sin((a * Math.PI) / 180))}`

  return `M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}`
}

const sweep =
  `<g transform="translate(${LAMP.x} ${LAMP.y})"><g class="z-sweep">` +
  `<path d="${arc(220, 190, 250)}" class="z-glint" stroke-width="3"/>` +
  `<path d="${arc(309, 200, 236)}" class="z-glint" stroke-width="4"/>` +
  `<path d="${arc(150, 10, 70)}" class="z-glint" stroke-width="10" stroke-opacity=".35"/>` +
  `</g></g>`

// Concentric arcs from the upper-left corner, like a speaker grille seen
// edge-on: hairlines with one embossed band.
const grille =
  `<g id="z-grille"><g class="z-grille">${Array.from({ length: 8 }, (_, i) => `<circle cx="-140" cy="-170" r="${330 + i * 38}"/>`).join('')}</g>` +
  bevel(-140, -170, 539, 22) +
  `</g>`

type Tile = { x: number; y: number; w: number; h: number; d: number; refr: [number, number] }

// A floating glass tile: soft shadow, a translucent body, the scene behind it
// shifted inside (a cheap refraction), a bright edge that catches the light
// at the lit corner, a top gloss, and a reflection sliding across now and then.
function tile(t: Tile, i: number): string {
  const rx = Math.min(t.w, t.h) * 0.22
  const body = `<rect width="${t.w}" height="${t.h}" rx="${n(rx)}"/>`

  return (
    `<g transform="translate(${t.x} ${t.y})">` +
    `<g class="z-sh" style="animation-duration:${t.d}s;animation-delay:-${i * 4}s;transform-origin:${n(t.w / 2 + 14)}px ${n(t.h)}px"><g class="blur-3"><rect x="14" y="${n(t.h * 0.18 + 14)}" width="${t.w}" height="${n(t.h * 0.85)}" rx="${n(rx)}" class="z-shadow"/></g></g>` +
    `<g class="z-hover" style="animation-duration:${t.d}s;animation-delay:-${i * 4}s">` +
    `<clipPath id="z-c${i}">${body}</clipPath>` +
    `<rect width="${t.w}" height="${t.h}" rx="${n(rx)}" fill="url(#z-glass)"/>` +
    `<g clip-path="url(#z-c${i})">` +
    // What lies behind the tile, shifted and magnified a little by the glass.
    `<g class="z-behind" transform="translate(${n(-t.x * 1.04 + 9)} ${n(-t.y * 1.04 + 7)}) scale(1.04)"><use href="#z-rings"/><use href="#z-grille"/><rect x="-80" y="${HORIZON - 1}" width="1760" height="3" fill="url(#z-hz)"/></g>` +
    `<rect width="${t.w}" height="${t.h}" fill="url(#z-tint)"/>` +
    `<circle cx="${t.refr[0]}" cy="${t.refr[1]}" r="${n(Math.max(t.w, t.h) * 0.9)}" fill="url(#z-refr)"/>` +
    `<rect x="${n(-t.w * 0.1)}" y="${n(t.h * 0.62)}" width="${n(t.w * 1.2)}" height="${n(t.h * 0.5)}" fill="url(#z-floor-in)"/>` +
    `<path d="M0 0 H${t.w} V${n(t.h * 0.42)} Q${n(t.w * 0.5)} ${n(t.h * 0.52)} 0 ${n(t.h * 0.36)} Z" fill="url(#z-gloss)"/>` +
    `<g class="z-slide" style="animation-delay:-${i * 5 + 2}s"><rect x="${n(-t.w * 0.9)}" y="-20" width="${n(t.w * 0.35)}" height="${t.h + 40}" fill="url(#z-band)" transform="skewX(-22)"/></g>` +
    `</g>` +
    `<rect x=".75" y=".75" width="${t.w - 1.5}" height="${t.h - 1.5}" rx="${n(rx)}" fill="none" stroke="url(#z-edge)" stroke-width="1.5"/>` +
    `<rect x="3" y="3" width="${t.w - 6}" height="${t.h - 6}" rx="${n(rx - 2)}" fill="none" stroke="url(#z-edge2)" stroke-width="1"/>` +
    `</g></g>`
  )
}

const TILES_FAR: Tile[] = [
  { x: 330, y: 420, w: 96, h: 96, d: 22, refr: [120, 160] },
  { x: 1150, y: 640, w: 84, h: 84, d: 20, refr: [150, -330] },
]
const TILES_NEAR: Tile[] = [
  { x: 86, y: 150, w: 214, h: 214, d: 18, refr: [300, 40] },
  { x: 120, y: 560, w: 180, h: 124, d: 24, refr: [250, -260] },
  { x: 1400, y: 560, w: 150, h: 150, d: 19, refr: [-80, -280] },
  { x: 1468, y: 80, w: 104, h: 104, d: 21, refr: [-160, 170] },
]

// Where the lamp's light meets the floor: a soft contact shadow under it
// and, inside the shadow, the warm caustic the orange glass focuses there.
const POOL_Y = HORIZON + 34
const pool =
  `<ellipse cx="${LAMP.x + 30}" cy="${POOL_Y}" rx="330" ry="34" fill="url(#z-cshadow)"/>` +
  `<g class="z-breathe"><ellipse cx="${LAMP.x + 18}" cy="${POOL_Y - 2}" rx="170" ry="17" fill="url(#z-caus)"/>` +
  `<ellipse cx="${LAMP.x + 10}" cy="${POOL_Y - 3}" rx="64" ry="6" fill="url(#z-caus-core)"/></g>` +
  `<g class="z-ripple"><ellipse cx="${LAMP.x + 18}" cy="${POOL_Y - 2}" rx="120" ry="11" fill="none" stroke="#ffb15a" stroke-opacity=".35" stroke-width="1.2"/></g>`

// Small glints orbiting the rings at their own slow speeds, a bright
// point with a short fading tail.
const glint = (r: number, a: number, len: number): string => {
  const p = (d: number) => `${n(r * Math.cos((d * Math.PI) / 180))} ${n(r * Math.sin((d * Math.PI) / 180))}`
  const [x, y] = p(a).split(' ')

  return `<path d="M${p(a - len)} A${r} ${r} 0 0 1 ${p(a)}" class="z-glint" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="2.6" fill="#fff" class="z-pt"/>`
}
const orbit =
  `<g transform="translate(${LAMP.x} ${LAMP.y})">` +
  `<g class="z-orb" style="animation-duration:46s">${glint(218, 300, 34)}${glint(218, 120, 22)}</g>` +
  `<g class="z-orb" style="animation-duration:83s;animation-direction:reverse">${glint(309, 40, 26)}${glint(309, 210, 40)}</g>` +
  `<g class="z-orb" style="animation-duration:61s">${glint(190, 80, 18)}${glint(372, 250, 30)}</g>` +
  `</g>`

const DEFS =
  `<linearGradient id="z-bg" x1="0" y1="0" x2="1" y2="1">${st(0, 'bg0')}${st(0.55, 'bg1')}${st(1, 'bg2')}</linearGradient>` +
  `<radialGradient id="z-key" gradientUnits="userSpaceOnUse" cx="160" cy="40" r="1100">${st(0, 'key', 0.9)}${st(0.5, 'key', 0.25)}${st(1, 'key', 0)}</radialGradient>` +
  `<linearGradient id="z-floor" x1="0" y1="0" x2="0" y2="1">${st(0, 'fl0')}${st(0.35, 'fl1')}${st(1, 'fl2')}</linearGradient>` +
  `<linearGradient id="z-hz" x1="0" y1="0" x2="1" y2="0">${st(0, 'hz', 0)}${st(0.25, 'hz', 0.9)}${st(0.8, 'hz', 0.9)}${st(1, 'hz', 0)}</linearGradient>` +
  `<linearGradient id="z-hzs" x1="0" y1="0" x2="0" y2="1">${st(0, 'hzs', 0)}${st(1, 'hzs', 0.5)}</linearGradient>` +
  `<radialGradient id="z-amb" gradientUnits="userSpaceOnUse" cx="${LAMP.x}" cy="${LAMP.y}" r="640">${st(0, 'glow', 0.55)}${st(0.3, 'glow', 0.22)}${st(0.65, 'glow', 0.07)}${st(1, 'glow', 0)}</radialGradient>` +
  `<radialGradient id="z-halo">${st(0.35, 'glow', 0.7)}${st(0.55, 'glow', 0.25)}${st(1, 'glow', 0)}</radialGradient>` +
  `<radialGradient id="z-core" fx=".4" fy=".36" r=".55"><stop offset="0" stop-color="#fff6e0"/><stop offset=".25" stop-color="#ffc06a"/><stop offset=".62" stop-color="#ff861f"/><stop offset=".92" stop-color="#e2580c"/><stop offset="1" stop-color="#c94a08"/></radialGradient>` +
  `<radialGradient id="z-caustic" cx=".5" cy=".86" r=".5"><stop offset="0" stop-color="#fff2a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="z-spec" x1="0" y1="0" x2="0" y2="1">${ws(0, 0.95)}${ws(1, 0)}</linearGradient>` +
  `<linearGradient id="z-silver" gradientUnits="userSpaceOnUse" x1="${LAMP.x - 380}" y1="${LAMP.y - 380}" x2="${LAMP.x + 380}" y2="${LAMP.y + 380}">${st(0, 'ag0')}${st(0.3, 'ag1')}${st(0.5, 'ag2')}${st(0.7, 'ag1')}${st(1, 'ag3')}</linearGradient>` +
  `<radialGradient id="z-well-g" fx=".6" fy=".65">${st(0.7, 'well0')}${st(1, 'well1')}</radialGradient>` +
  `<linearGradient id="z-glint-g" x1="0" y1="0" x2="1" y2="1">${ws(0, 0)}${ws(0.5, 1)}${ws(1, 0)}</linearGradient>` +
  `<linearGradient id="z-glass" x1="0" y1="0" x2=".3" y2="1">${st(0, 'gl0', 'var(--gl0-a)')}${st(1, 'gl1', 'var(--gl1-a)')}</linearGradient>` +
  `<radialGradient id="z-refr">${st(0, 'glow', 0.55)}${st(0.4, 'glow', 0.18)}${st(1, 'glow', 0)}</radialGradient>` +
  `<linearGradient id="z-floor-in" x1="0" y1="0" x2="0" y2="1">${st(0, 'hzs', 0)}${st(1, 'hzs', 0.18)}</linearGradient>` +
  `<linearGradient id="z-gloss" x1="0" y1="0" x2="0" y2="1">${st(0, 'gloss', 'var(--gloss-a)')}${st(1, 'gloss', 0)}</linearGradient>` +
  `<linearGradient id="z-band" x1="0" y1="0" x2="1" y2="0">${ws(0, 0)}${ws(0.5, 0.55)}${ws(1, 0)}</linearGradient>` +
  `<linearGradient id="z-edge" x1="0" y1="0" x2="1" y2="1">${st(0, 'edge0')}${st(0.35, 'edge1', 0.15)}${st(0.65, 'edge1', 0.1)}${st(1, 'edge0', 0.7)}</linearGradient>` +
  `<linearGradient id="z-edge2" x1="1" y1="1" x2="0" y2="0">${st(0, 'edge0', 0.55)}${st(0.4, 'edge0', 0)}</linearGradient>` +
  `<linearGradient id="z-bev-hi" x1=".15" y1=".15" x2=".85" y2=".85">${st(0, 'bevh', 0.95)}${st(0.5, 'bevh', 0.15)}${st(1, 'bevh', 0)}</linearGradient>` +
  `<linearGradient id="z-bev-lo" x1=".15" y1=".15" x2=".85" y2=".85">${st(0, 'bevl', 0)}${st(0.5, 'bevl', 0.2)}${st(1, 'bevl', 0.6)}</linearGradient>` +
  `<linearGradient id="z-refl" x1="0" y1="0" x2="0" y2="1">${ws(0, 1)}${ws(1, 0)}</linearGradient>` +
 `<radialGradient id="z-cshadow">${st(0, 'shadow', 'var(--cs-a)')}${st(0.55, 'shadow', 'calc(var(--cs-a) * .4)')}${st(1, 'shadow', 0)}</radialGradient>` +
  `<radialGradient id="z-caus">${st(0, 'caus', 0.75)}${st(0.4, 'glow', 0.35)}${st(1, 'glow', 0)}</radialGradient>` +
  `<radialGradient id="z-caus-core">${ws(0, 0.95)}${st(0.5, 'caus', 0.6)}${st(1, 'caus', 0)}</radialGradient>` +
  `<linearGradient id="z-tint" x1="0" y1="0" x2="1" y2="1">${st(0, 'bg1', 'var(--tint-a)')}${st(1, 'bg2', 'calc(var(--tint-a) * .7)')}</linearGradient>` +
  speckle('z-grain', 23, 'var(--grain)', 151, 60, 0.7, 0.1) +
  `<mask id="z-fade" maskUnits="userSpaceOnUse" x="0" y="${HORIZON}" width="1600" height="260"><rect x="0" y="${HORIZON}" width="1600" height="200" fill="url(#z-refl)"/></mask>`

const CSS = `
:root, svg {
  --bg0:#ffffff; --bg1:#eef0f3; --bg2:#d8dce2; --key:#ffffff;
  --fl0:#dfe3e8; --fl1:#eceef1; --fl2:#f5f6f8; --hz:#ffffff; --hzs:#9aa3ae;
  --glow:#ff8a2a; --ag0:#ffffff; --ag1:#d9dde3; --ag2:#f6f7f9; --ag3:#aab1bb; --well0:#e9ecf0; --well1:#b9c0ca;
  --grille:#b3bac4; --grille-op:.55; --meter:#ff8a2a;
  --gl0:#ffffff; --gl0-a:.55; --gl1:#e2e8ef; --gl1-a:.14; --gloss:#ffffff; --gloss-a:.75;
  --edge0:#ffffff; --edge1:#c4ccd6; --shadow:#5a6472; --shadow-a:.2;
  --refl:.32; --glint:.85; --bk:#ffffff; --cs-a:.28; --caus:#ffc27a; --tint-a:.4; --grain:#5a6472; --turn-l:.35; --turn-d:.12; --bevh:#ffffff; --bevl:#7a8492;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#2a2d33; --bg1:#17191d; --bg2:#0b0c0e; --key:#5a6270;
    --fl0:#121316; --fl1:#0d0e10; --fl2:#08090a; --hz:#6a717c; --hzs:#000000;
    --glow:#ff7a1a; --ag0:#7d848f; --ag1:#2c3036; --ag2:#555b65; --ag3:#141619; --well0:#1b1d21; --well1:#08090a;
    --grille:#3a4049; --grille-op:.7; --meter:#ff8a2a;
    --gl0:#4a505a; --gl0-a:.45; --gl1:#121418; --gl1-a:.5; --gloss:#ffffff; --gloss-a:.18;
    --edge0:#c9d0da; --edge1:#3a4049; --shadow:#000000; --shadow-a:.55;
    --refl:.55; --glint:.45; --bk:#ff9a4a; --cs-a:.7; --caus:#ffb060; --tint-a:.08; --grain:#c9d0da; --turn-l:.08; --turn-d:.3; --bevh:#c3cad4; --bevl:#000000;
  }
}
.z-ringset { opacity: .9; }
.z-well { fill: url(#z-well-g); }
.z-turned circle { fill: none; stroke-width: 1.2; }
.z-tl { stroke: #fff; stroke-opacity: var(--turn-l); } .z-td { stroke: var(--ag3); stroke-opacity: var(--turn-d); }
.z-hair { fill: none; stroke: var(--grille); stroke-opacity: var(--grille-op); stroke-width: 1.2; }
.z-meter { fill: none; stroke: var(--meter); stroke-width: 2.5; stroke-linecap: round; stroke-opacity: .75; }
.z-breathe { animation: pulse 14s ease-in-out infinite; }
.z-sweep { animation: spin 70s linear infinite; }
.z-glint { fill: none; stroke: url(#z-glint-g); stroke-opacity: var(--glint); stroke-linecap: round; }
.z-grille circle { fill: none; stroke: var(--grille); stroke-opacity: var(--grille-op); stroke-width: 1.2; }
.z-shadow { fill: var(--shadow); fill-opacity: var(--shadow-a); }
.z-hover { animation: z-hover ease-in-out infinite; }
.z-sh { animation: z-sh ease-in-out infinite; }
@keyframes z-sh { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: translate(4px, 3px) scale(1.06); opacity: .7; } }
.z-orb { animation: spin linear infinite; }
.z-pt { opacity: var(--glint); }
.z-ripple { transform-box: fill-box; transform-origin: center; animation: z-ripple 7s ease-out infinite; }
@keyframes z-ripple { from { transform: scale(.5); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
.z-amb { animation: z-amb 23s ease-in-out infinite alternate; }
@keyframes z-amb { from { opacity: .8; } to { opacity: 1; } }
.z-behind { opacity: .55; }
@keyframes z-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.z-slide { animation: z-slide 16s ease-in-out infinite; }
@keyframes z-slide { 0%, 70% { transform: translateX(0); } 100% { transform: translateX(520px); } }
.z-refl { opacity: var(--refl); }
.z-bk circle { fill: var(--bk); }
`

const BODY = `
<rect width="1600" height="1000" fill="url(#z-bg)"/>
<rect width="1600" height="1000" fill="url(#z-key)"/>
${layer(1, grille)}
<rect x="-80" y="${HORIZON}" width="1760" height="300" fill="url(#z-floor)"/>
<g class="z-refl" mask="url(#z-fade)"><g class="blur-3"><g transform="translate(0 ${HORIZON}) scale(1 -.32) translate(0 ${-HORIZON})">${reflection}</g></g></g>
<rect x="-80" y="${HORIZON - 40}" width="1760" height="40" fill="url(#z-hzs)" opacity=".25"/>
<rect x="-80" y="${HORIZON - 1}" width="1760" height="2" fill="url(#z-hz)"/>
${layer(2, pool)}
${layer(2, lamp + sweep + orbit)}
<g class="z-bk">${bokeh(6, 13, { x: 1000, y: 40, w: 560, h: 520 }, '#fff', 46)}${bokeh(5, 29, { x: 40, y: 380, w: 380, h: 360 }, '#fff', 36)}</g>
${layer(3, TILES_FAR.map((t, i) => tile(t, i)).join(''))}
${layer(4, TILES_NEAR.map((t, i) => tile(t, i + TILES_FAR.length)).join(''))}
<rect width="1600" height="1000" fill="url(#z-grain)"/>
${grade([160, 40], '#fff2dc', '#3a4a6a', 0.7)}
`

const SCENE = svg(CSS, DEFS, BODY)

export const AERO_ZEN: Look = {
  label: 'Aero Zen',
  args: { colors: theme, backdrop: { scene: 'aero-zen', glass: { blur: 20, opacity: 0.55 } } },
  problems,
  scene: SCENE,
}
