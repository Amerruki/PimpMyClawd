import { blob, n, seeded, speckle } from './kit'
import { AU, ellipseEl, orbitEllipse, PERIOD, proj, SUN } from './space-orrery-proj'

// The Sun, the sky behind the orrery, the asteroid belt and the comet.

export const SKY_DEFS: string[] = []
const def = (s: string): void => {
  SKY_DEFS.push(s)
}

const [SX, SY] = SUN
export const SUN_R = 66

// ---- Sky -------------------------------------------------------------------

// Stars in three depths: a fine dust of faint ones as a tiled pattern, a
// middle layer in true stellar tints (blue-white, white, yellow, orange),
// some of them twinkling, and a few bright ones with soft halos and thin
// diffraction spikes.
export function starfield(): string {
  def(speckle('so-dust', 7, '#ffffff', 140, 46, 0.55, 0.9))
  def(
    `<radialGradient id="so-halo"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#dce8ff" stop-opacity=".35"/><stop offset="1" stop-color="#dce8ff" stop-opacity="0"/></radialGradient>`,
  )
  const rand = seeded(424)
  let mid = ''

  for (let i = 0; i < 190; i++) {
    const x = rand() * 1600
    const y = rand() * 1000
    const t = 1 + Math.floor(rand() * 4)
    const tw = rand() < 0.3
    const r = 0.45 + rand() * rand() * 1.1
    mid += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" class="so-t${t}${tw ? ' so-tw' : ''}"${tw ? ` style="animation-duration:${n(3 + rand() * 6)}s;animation-delay:-${n(rand() * 8)}s"` : ''}/>`
  }

  const bright = [
    [1380, 120], [1520, 330], [1210, 60], [980, 140], [1450, 760], [1290, 880], [80, 120], [420, 70], [60, 860], [1555, 560], [700, 40], [1120, 300],
  ]
    .map(([x, y], i) => {
      const s = 0.8 + ((i * 37) % 10) / 14

      return (
        `<g class="so-glint" transform="translate(${x} ${y}) scale(${n(s)})" style="animation-duration:${n(5 + (i % 4) * 1.7)}s;animation-delay:-${i * 1.3}s">` +
        `<circle r="9" fill="url(#so-halo)"/><path d="M-11 0H11M0-11V11" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/><circle r="1.5" class="so-t${1 + (i % 3)}"/></g>`
      )
    })
    .join('')

  return (
    `<rect width="1600" height="1000" fill="url(#so-dust)" class="so-far"/>` +
    `<g class="so-stars">${mid}</g>` +
    `<g class="so-bright">${bright}</g>`
  )
}

// A faint band of the Milky Way across the top right corner, with star
// clouds and dark dust lanes.
export function milkyWay(): string {
  def(
    `<linearGradient id="so-mw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6ff" stop-opacity="0"/><stop offset=".4" stop-color="#c9d4ff" stop-opacity=".5"/><stop offset=".55" stop-color="#fff0dc" stop-opacity=".6"/><stop offset=".7" stop-color="#c9d4ff" stop-opacity=".4"/><stop offset="1" stop-color="#9fb6ff" stop-opacity="0"/></linearGradient>` +
      speckle('so-mwd', 19, '#ffffff', 90, 60, 0.5, 0.8),
  )
  const lanes = [
    blob(1200, 80, 120, 16, 3, 0.3),
    blob(1360, 190, 160, 14, 4, 0.3),
    blob(1520, 300, 110, 18, 5, 0.3),
  ]

  return (
    `<g class="so-mw" transform="rotate(32 1300 200)">` +
    `<rect x="850" y="40" width="1000" height="320" fill="url(#so-mw)" class="haze"/>` +
    `<rect x="850" y="110" width="1000" height="180" fill="url(#so-mwd)" opacity=".7"/>` +
    `</g>` +
    `<g class="so-lane blur-3" fill="#02030a">${lanes.map(d => `<path d="${d}"/>`).join('')}</g>`
  )
}

// Soft drifting veils: in the day version a pale cosmic haze, at night a
// faint nebulosity, kept to the corners.
export function haze(): string {
  def(
    `<radialGradient id="so-v1"><stop offset="0" style="stop-color:var(--so-haze1)" stop-opacity=".9"/><stop offset=".5" style="stop-color:var(--so-haze1)" stop-opacity=".4"/><stop offset="1" style="stop-color:var(--so-haze1)" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="so-v2"><stop offset="0" style="stop-color:var(--so-haze2)" stop-opacity=".9"/><stop offset=".5" style="stop-color:var(--so-haze2)" stop-opacity=".4"/><stop offset="1" style="stop-color:var(--so-haze2)" stop-opacity="0"/></radialGradient>`,
  )
  const veils = [
    { x: 1460, y: 150, rx: 460, ry: 240, c: 1, d: 70, r: -12 },
    { x: 1380, y: 900, rx: 520, ry: 220, c: 2, d: 90, r: 8 },
    { x: 140, y: 960, rx: 420, ry: 190, c: 1, d: 80, r: -4 },
    { x: 760, y: -40, rx: 520, ry: 170, c: 2, d: 110, r: 3 },
    { x: 1600, y: 540, rx: 260, ry: 340, c: 2, d: 75, r: 0 },
    { x: 1180, y: 40, rx: 300, ry: 130, c: 1, d: 95, r: 15 },
  ]

  return veils
    .map(
      (v, i) =>
        `<g class="so-veil" style="animation-duration:${v.d}s;animation-delay:-${i * 13}s"><ellipse cx="${v.x}" cy="${v.y}" rx="${v.rx}" ry="${v.ry}" transform="rotate(${v.r} ${v.x} ${v.y})" fill="url(#so-v${v.c})"/></g>`,
    )
    .join('')
}

// Zodiacal light: the dust disc in the plane of the planets, lit by the Sun,
// a faint lens of glow that follows the orbits' perspective.
export function zodiacal(): string {
  def(
    `<radialGradient id="so-zodi"><stop offset="0" style="stop-color:var(--so-zodi);stop-opacity:var(--so-zodi-op)"/><stop offset=".35" style="stop-color:var(--so-zodi);stop-opacity:calc(var(--so-zodi-op) * .45)"/><stop offset="1" style="stop-color:var(--so-zodi)" stop-opacity="0"/></radialGradient>`,
  )

  return ellipseEl(orbitEllipse(AU(6.5)), 'fill="url(#so-zodi)"')
}

// ---- The Sun ---------------------------------------------------------------

// Bloom and rays: the light the Sun throws across the frame. The rays are
// two blurred sets that breathe out of step, so the glare shimmers.
export function sunlight(): string {
  def(
    `<radialGradient id="so-bloom" gradientUnits="userSpaceOnUse" cx="${n(SX)}" cy="${n(SY)}" r="980"><stop offset="0" style="stop-color:var(--so-bloom);stop-opacity:var(--so-bloom-op)"/><stop offset=".12" style="stop-color:var(--so-bloom);stop-opacity:calc(var(--so-bloom-op) * .7)"/><stop offset=".35" style="stop-color:var(--so-bloom);stop-opacity:calc(var(--so-bloom-op) * .25)"/><stop offset="1" style="stop-color:var(--so-bloom)" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="so-glare"><stop offset="0" stop-color="#fff"/><stop offset=".22" stop-color="#fff" stop-opacity=".85"/><stop offset=".5" stop-color="#fffbe6" stop-opacity=".3"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="so-ray" gradientUnits="userSpaceOnUse" cx="${n(SX)}" cy="${n(SY)}" r="1200"><stop offset=".04" style="stop-color:var(--so-bloom)" stop-opacity=".9"/><stop offset=".4" style="stop-color:var(--so-bloom)" stop-opacity=".25"/><stop offset="1" style="stop-color:var(--so-bloom)" stop-opacity="0"/></radialGradient>`,
  )
  const rand = seeded(8)
  const rays = (k: number): string =>
    Array.from({ length: 9 }, (_, i) => {
      const a = ((i + k * 0.5) / 9) * Math.PI * 2 + rand() * 0.3
      const w = 0.025 + rand() * 0.05
      const L = 700 + rand() * 600
      const p = (t: number, l: number): string => `${n(SX + Math.cos(t) * l)} ${n(SY + Math.sin(t) * l)}`

      return `M${p(a - w * 0.3, 40)}L${p(a - w, L)}L${p(a + w, L)}L${p(a + w * 0.3, 40)}Z`
    }).join('')

  return (
    `<rect width="1600" height="1000" fill="url(#so-bloom)" class="so-breathe"/>` +
    `<g class="blur-3 so-rays">` +
    `<path d="${rays(0)}" fill="url(#so-ray)" class="so-ray" style="animation-duration:23s"/>` +
    `<path d="${rays(1)}" fill="url(#so-ray)" class="so-ray" style="animation-duration:31s;animation-delay:-12s"/>` +
    `</g>` +
    `<circle cx="${n(SX)}" cy="${n(SY)}" r="330" fill="url(#so-glare)" class="so-glare"/>`
  )
}

// The disc: a white-hot centre darkening to orange at the limb, a churning
// surface of granulation drifting two ways and slow convection swirls, a
// few sunspots carried across by the Sun's rotation, red prominences arched
// on the limb, and a corona of soft streamers turning very slowly.
export function sun(): string {
  const R = SUN_R
  const rand = seeded(91)
  def(
    `<radialGradient id="so-sun"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff4c6"/><stop offset=".8" stop-color="#ffd662"/><stop offset=".94" stop-color="#ffa236"/><stop offset="1" stop-color="#f07a1c"/></radialGradient>` +
      `<radialGradient id="so-sunlimb"><stop offset=".6" stop-color="#c2460c" stop-opacity="0"/><stop offset=".9" stop-color="#c2460c" stop-opacity=".22"/><stop offset="1" stop-color="#9a2e06" stop-opacity=".5"/></radialGradient>` +
      `<radialGradient id="so-glow"><stop offset=".3" stop-color="#fff7d6" stop-opacity=".95"/><stop offset=".42" style="stop-color:var(--so-corona);stop-opacity:var(--so-corona-op)"/><stop offset=".6" style="stop-color:var(--so-corona);stop-opacity:calc(var(--so-corona-op) * .35)"/><stop offset="1" style="stop-color:var(--so-corona)" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="so-streak" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${R * 4}"><stop offset=".2" style="stop-color:var(--so-corona)" stop-opacity=".8"/><stop offset=".5" style="stop-color:var(--so-corona)" stop-opacity=".25"/><stop offset="1" style="stop-color:var(--so-corona)" stop-opacity="0"/></radialGradient>` +
      `<clipPath id="so-sun-c"><circle cx="${n(SX)}" cy="${n(SY)}" r="${R}"/></clipPath>`,
  )

  // Corona streamers, longer near the equator as at solar minimum.
  let streamers = ''
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand() * 0.25
    const eq = Math.abs(Math.cos(a))
    const L = R * (1.7 + eq * 1.9 + rand() * 0.6)
    const w = R * (0.22 + rand() * 0.2)
    const c = Math.cos(a)
    const s = Math.sin(a)
    const p = (along: number, side: number): string => `${n(c * along - s * side)} ${n(s * along + c * side)}`
    streamers += `M${p(R * 0.8, -w)}Q${p(L * 0.6, -w * 0.35)} ${p(L, 0)}Q${p(L * 0.6, w * 0.35)} ${p(R * 0.8, w)}Z`
  }

  // Prominences: plasma loops standing on the limb.
  const prom = [200, 318, 40]
    .map((deg, i) => {
      const a = (deg * Math.PI) / 180
      const sp = 0.035 + (i % 2) * 0.02
      const h = R * (1.1 + (i % 3) * 0.04)
      const pt = (t: number, l: number): string => `${n(SX + Math.cos(t) * l)} ${n(SY + Math.sin(t) * l)}`

      return `<path class="so-prom" style="animation-duration:${7 + i * 2}s;animation-delay:-${i * 3}s" d="M${pt(a - sp, R * 0.98)}C${pt(a - sp * 1.4, h)} ${pt(a + sp * 1.4, h)} ${pt(a + sp, R * 0.98)}"/>`
    })
    .join('')

  // Spots on a strip that turns with the Sun (west to east, ~25 day period).
  const spots = [
    [-0.3, 0.22, 0.07],
    [-0.18, 0.26, 0.04],
    [0.55, -0.24, 0.05],
    [1.3, 0.2, 0.06],
  ]
    .map(
      ([x, y, s]) =>
        `<ellipse cx="${n(SX + x! * R)}" cy="${n(SY + y! * R)}" rx="${n(s! * R * 1.2)}" ry="${n(s! * R * 0.8)}" fill="#c0601a" fill-opacity=".45"/><ellipse cx="${n(SX + x! * R)}" cy="${n(SY + y! * R)}" rx="${n(s! * R * 0.5)}" ry="${n(s! * R * 0.38)}" fill="#5a2408" fill-opacity=".75"/>`,
    )
    .join('')

  const swirl = (seed: number): string =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + seed
      const d = R * (0.25 + (i % 3) * 0.25)
      return `<path d="${blob(SX + Math.cos(a) * d, SY + Math.sin(a) * d, R * 0.3, R * 0.12, seed + i, 0.4)}" transform="rotate(${n((a * 180) / Math.PI + 70)} ${n(SX + Math.cos(a) * d)} ${n(SY + Math.sin(a) * d)})"/>`
    }).join('')

  const rot = (dur: number, dir = 1): string =>
    `<animateTransform attributeName="transform" type="rotate" from="0 ${n(SX)} ${n(SY)}" to="${dir * 360} ${n(SX)} ${n(SY)}" dur="${dur}s" repeatCount="indefinite"/>`

  return (
    `<circle cx="${n(SX)}" cy="${n(SY)}" r="${R * 3.4}" fill="url(#so-glow)" class="so-breathe" style="animation-duration:11s"/>` +
    `<g><g>${rot(400)}<g style="filter:blur(7px)"><path transform="translate(${n(SX)} ${n(SY)})" d="${streamers}" fill="url(#so-streak)" class="so-corona"/></g></g></g>` +
    `<circle cx="${n(SX)}" cy="${n(SY)}" r="${R}" fill="url(#so-sun)"/>` +
    `<g clip-path="url(#so-sun-c)">` +
    `<g><g>${rot(160)}<g class="blur-3" fill="#fffdf0" fill-opacity=".5">${swirl(10)}</g></g>` +
    `<g>${rot(220, -1)}<g class="blur-3" fill="#f0821e" fill-opacity=".38">${swirl(30)}</g></g></g>` +
    `<g><animateTransform attributeName="transform" type="translate" from="${n(-1.2 * R)} 0" to="${n(1.2 * R)} 0" dur="80s" repeatCount="indefinite"/>${spots}</g>` +
    `<circle cx="${n(SX)}" cy="${n(SY)}" r="${R}" fill="url(#so-sunlimb)"/>` +
    `</g>` +
    `<circle cx="${n(SX)}" cy="${n(SY)}" r="${R - 0.6}" fill="none" stroke="#fff6d0" stroke-opacity=".7" stroke-width="1.2"/>` +
    `<g style="filter:blur(1.8px)" fill="none" stroke="#ff5a22" stroke-opacity=".7" stroke-width="4.5" stroke-linecap="round">${prom}</g>`
  )
}

// ---- Asteroid belt ---------------------------------------------------------

// Rings of dust-grain dots between Mars and Jupiter (2.15 to 3.3 AU), with
// the Kirkwood gaps left thin, each ring's dots flowing round at its own
// Keplerian rate: the inner edge faster than the outer.
export function belt(): string {
  const rand = seeded(2024)
  const gaps = [2.5, 2.82, 2.95]
  let rings = ''
  const glow = orbitEllipse(AU(2.72))

  for (let i = 0; i < 18; i++) {
    let a = 2.15 + (i / 17) * 1.15 + (rand() - 0.5) * 0.04
    const nearGap = gaps.some(g => Math.abs(g - a) < 0.025)
    if (nearGap) {
      a += 0.04
    }
    const e = orbitEllipse(AU(a))
    let dash = ''
    let L = 0
    const count = 10 + Math.floor(rand() * 8)
    for (let k = 0; k < count; k++) {
      const gap = 6 + rand() * rand() * 70
      dash += `0 ${n(gap)} `
      L += gap
    }
    const circ = Math.PI * (3 * (e.rx + e.ry) - Math.sqrt((3 * e.rx + e.ry) * (e.rx + 3 * e.ry)))
    const speed = circ / PERIOD(a ** 1.5)
    const w = 0.9 + rand() * rand() * 1.9
    rings += ellipseEl(
      e,
      `stroke-dasharray="${dash.trim()}" stroke-width="${n(w)}" stroke-opacity="${n(0.5 + rand() * 0.5)}"`,
      `<animate attributeName="stroke-dashoffset" from="0" to="${n(L)}" dur="${n(L / speed)}s" repeatCount="indefinite"/>`,
    )
  }

  return (
    `<g class="blur-3">${ellipseEl(glow, `fill="none" class="so-beltglow" stroke-width="${n(AU(3.3) - AU(2.15))}"`)}</g>` +
    `<g fill="none" stroke-linecap="round" class="so-belt">${rings}</g>`
  )
}

// ---- Comet -----------------------------------------------------------------

// A long-period comet on an inclined, very eccentric orbit, timed by
// Kepler's equation so it crawls far out and whips round the Sun. Its ion
// tail points straight away from the Sun and its curved dust tail lags
// behind its motion; both lengthen as it nears the Sun and are seen
// foreshortened in perspective. It brightens near perihelion and fades
// away far out, so it appears now and then.
export function comet(): string {
  const q = 175
  const ecc = 0.8
  const a = q / (1 - ecc)
  const psi = (-62 * Math.PI) / 180
  const inc = (28 * Math.PI) / 180
  const N = 110
  const pos: [number, number, number][] = []
  const key: number[] = []
  const rr: number[] = []
  const world: [number, number, number][] = []

  for (let i = 0; i <= N; i++) {
    const nu = -Math.PI + (i / N) * Math.PI * 2
    const r = (a * (1 - ecc * ecc)) / (1 + ecc * Math.cos(nu))
    const u = r * Math.cos(nu)
    const v = r * Math.sin(nu)
    const X = u * Math.cos(psi) - v * Math.cos(inc) * Math.sin(psi)
    const Y = u * Math.sin(psi) + v * Math.cos(inc) * Math.cos(psi)
    const Z = v * Math.sin(inc)
    world.push([X, Y, Z])
    pos.push(proj(X, Y, Z) as [number, number, number])
    rr.push(r)
    const E = 2 * Math.atan(Math.sqrt((1 - ecc) / (1 + ecc)) * Math.tan(nu / 2))
    const M = E - ecc * Math.sin(E)
    key.push(i === 0 ? 0 : i === N ? 1 : (M + Math.PI) / (2 * Math.PI))
  }

  const ang: number[] = []
  const scl: string[] = []
  const op: string[] = []
  for (let i = 0; i <= N; i++) {
    const [sx, sy] = pos[i]!
    const [X, Y, Z] = world[i]!
    const r = rr[i]!
    const tail = 60 + 300 * Math.min(1, q / r) ** 0.8
    const [tx, ty] = proj(X + (X / r) * tail, Y + (Y / r) * tail, Z + (Z / r) * tail)
    const dx = tx - sx
    const dy = ty - sy
    const th = Math.atan2(dy, dx)
    ang.push((th * 180) / Math.PI)
    const len = Math.hypot(dx, dy) / 100
    const nx = pos[Math.min(N, i + 1)]!
    const pv = pos[Math.max(0, i - 1)]!
    const vx = nx[0] - pv[0]
    const vy = nx[1] - pv[1]
    const perp = (-Math.sin(th) * vx + Math.cos(th) * vy) / (Math.hypot(vx, vy) || 1)
    scl.push(`${Math.round(len * 100) / 100},${n(Math.max(-1, Math.min(1, -perp * 3)))}`)
    op.push(n(Math.min(1, ((q * 2.2) / r) ** 1.7)))
  }
  for (let i = 1; i < ang.length; i++) {
    while (ang[i]! - ang[i - 1]! > 180) ang[i]! -= 360
    while (ang[i]! - ang[i - 1]! < -180) ang[i]! += 360
  }

  const dur = 200
  const begin = 93
  const kt = key.map(t => Math.round(t * 10000) / 10000).join(';')
  const anim = (attr: string, extra: string, values: string): string =>
    `<${attr} dur="${dur}s" begin="-${begin}s" repeatCount="indefinite" calcMode="linear" keyTimes="${kt}" ${extra} values="${values}"/>`

  def(
    `<linearGradient id="so-ion" x1="0" x2="1"><stop offset="0" style="stop-color:var(--so-ion)" stop-opacity=".85"/><stop offset="1" style="stop-color:var(--so-ion)" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="so-dustt" x1="0" x2="1"><stop offset="0" style="stop-color:var(--so-dust)" stop-opacity=".9"/><stop offset=".5" style="stop-color:var(--so-dust)" stop-opacity=".35"/><stop offset="1" style="stop-color:var(--so-dust)" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="so-coma"><stop offset="0" stop-color="#fff"/><stop offset=".2" style="stop-color:var(--so-coma)" stop-opacity=".8"/><stop offset="1" style="stop-color:var(--so-coma)" stop-opacity="0"/></radialGradient>`,
  )

  return (
    `<g>${anim('animate', 'attributeName="opacity"', op.join(';'))}` +
    anim('animateMotion', '', pos.map(([x, y]) => `${n(x)},${n(y)}`).join(';')) +
    `<g>${anim('animateTransform', 'attributeName="transform" type="rotate"', ang.map(v => Math.round(v)).join(';'))}` +
    `<g>${anim('animateTransform', 'attributeName="transform" type="scale"', scl.join(';'))}` +
    `<path d="M0 -4Q50 -14 100 -36Q106 -14 100 6Q50 6 0 4Z" fill="url(#so-dustt)" opacity=".7"/>` +
    `<path d="M0 -2.5Q45 -8 92 -22Q96 -12 92 -4Q45 1 0 2.5Z" fill="url(#so-dustt)" opacity=".55"/>` +
    `<path d="M0 -2L100 -7L100 7L0 2Z" fill="url(#so-ion)" opacity=".55"/>` +
    `<path d="M0 -.7L60 -1.2L60 1.2L0 .7Z" fill="url(#so-ion)"/>` +
    `</g></g>` +
    `<circle r="9" fill="url(#so-coma)"/><circle r="1.6" fill="#fff"/></g>`
  )
}
