import { seeded } from './kit'
import { Bucket, CAM, F, LX, P, RX, ppm, r1, shape } from './cyber2-kit'
import { puff } from './cyber2-stall'

// The ground: wet road and pavements, far traffic, reflections of every
// light, puddles, and the near road at the camera's feet.

const R = Math.round
// Kerb lines either side.
export const KL = -7.5
export const KR = 7

// Scale steps for something moving along the street at a steady pace, seen
// from a group whose origin is the vanishing point: drawn at depth `ref`, it
// travels from depth z0 to z1.
export function depthFrames(name: string, ref: number, z0: number, z1: number, fade = false): string {
  const steps = [0, 0.3, 0.55, 0.72, 0.84, 0.93, 1]

  return `@keyframes ${name}{${steps
    .map((t, i) => {
      const s = ref / (z0 + (z1 - z0) * t)
      const o = fade ? (i === 0 || i === steps.length - 1 ? ';opacity:0' : i === 1 || i === steps.length - 2 ? ';opacity:1' : '') : ''

      return `${R(t * 100)}%{transform:scale(${(Math.round(s * 1000) / 1000).toString()})${o}}`
    })
    .join('')}}`
}

export function ground(): string {
  const b = new Bucket()
  const far = 420
  const near = 5.5
  const strip = (x0: number, x1: number, z0 = far, z1 = near) => shape([P(x0, 0, z0), P(x0, 0, z1), P(x1, 0, z1), P(x1, 0, z0)])

  b.add('r1', strip(LX, KL)).add('r1', strip(KR, RX))
  b.add('r2 st', strip(KL, KL + 0.3)).add('r2 st', strip(KR - 0.3, KR))
  b.add('r3', strip(KL + 0.3, KL + 0.9)).add('r3', strip(KR - 0.9, KR - 0.3))
  // Lane dashes.
  for (const x of [-3.9, 3.4]) for (let z = 7; z < 150; z += z < 20 ? 5 : z < 60 ? 8 : 14) b.add('r2 ln', strip(x - 0.08, x + 0.08, z + (z < 20 ? 2 : 3), z))
  b.add('r2 ln', strip(-0.37, -0.25, 150, near)).add('r2 ln', strip(-0.07, 0.05, 150, near))
  // The crossing.
  for (let x = -6.9; x < 6.4; x += 1.3) b.add('r2 ln', strip(x, x + 0.62, 49.5, 45))
  // Paving joints on the near pavements.
  let joints = ''
  for (let z = 9; z < 70; z += z < 34 ? 1.6 : 3.2) joints += shape([P(LX, 0, z), P(KL, 0, z)], false) + shape([P(KR, 0, z), P(RX, 0, z)], false)
  for (const x of [-10.5, -13.5, -16.5, 10, 13, 16, 18.5]) joints += shape([P(x, 0, 9), P(x, 0, 90)], false)
  // Drain covers.
  const cover = (x: number, z: number) => {
    const [cx, cy] = P(x, 0, z)

    return `<ellipse class="r3" cx="${R(cx)}" cy="${R(cy)}" rx="${R(ppm(z) * 0.45)}" ry="${r1((ppm(z) * 0.45 * CAM) / z)}"/>`
  }

  return (
    `<rect class="r0" y="560" width="1600" height="440"/>` +
    b.toString() +
    `<path class="jt" d="${joints}"/>` +
    cover(-6, 26) +
    cover(5.6, 31) +
    `<rect y="560" width="1600" height="150" fill="url(#rdh)"/>`
  )
}

// A vertical smear of one light in the wet street, scaled by the mode's
// reflection strength on itself rather than through a group's opacity.
const smear = (x: number, y: number, w: number, h: number, id: string, o: number, cls = ''): string =>
  `<ellipse${cls ? ` class="${cls}"` : ''} cx="${R(x + w / 2)}" cy="${R(y + h * 0.42)}" rx="${R(w * 0.62)}" ry="${R(h * 0.62)}" fill="url(#g${id})" style="fill-opacity:calc(var(--rfo) * ${o})"/>`

export function reflections(): string {
  const rand = seeded(19)
  // Wet sheen: short horizontal glints scattered on the road.
  let glints = ''
  for (let i = 0; i < 46; i++) {
    const z = 7 + rand() * rand() * 70
    const x = KL + 1 + rand() * (KR - KL - 2)
    const [px, py] = P(x, 0, z)
    glints += `M${R(px)} ${R(py)}h${R((8 + rand() * 30) * (14 / z))}`
  }
  const puddle = (x: number, z: number, w: number, id: string, d: number) => {
    const [cx, cy] = P(x, 0, z)
    const rx = ppm(z) * w
    const ry = (rx * CAM) / z

    return (
      `<ellipse cx="${R(cx)}" cy="${R(cy)}" rx="${R(rx * 1.15)}" ry="${r1(ry * 1.15)}" fill="url(#gpd)"/>` +
      `<ellipse class="rf" cx="${R(cx)}" cy="${R(cy)}" rx="${R(rx)}" ry="${r1(ry)}" fill="url(#g${id})" fill-opacity=".5"/>` +
      `<g transform="translate(${R(cx + rx * 0.3)} ${R(cy)})"><ellipse class="rp d${d}" rx="${R(rx * 0.4)}" ry="${r1(ry * 0.4)}"/></g>` +
      `<g transform="translate(${R(cx - rx * 0.4)} ${R(cy + ry * 0.2)})"><ellipse class="rp d${(d + 3) % 7}" rx="${R(rx * 0.3)}" ry="${r1(ry * 0.3)}"/></g>`
    )
  }

  // By day the wet road holds the sky down its middle and the buildings' shade along the kerbs.
  const wet =
    `<g class="dy"><ellipse cx="850" cy="760" rx="380" ry="300" fill="url(#gh)" fill-opacity=".6"/>` +
    `<path d="${shape([P(KL + 0.9, 0, 6), P(KL + 0.9, 0, 400), P(KL + 5, 0, 6)])}${shape([P(KR - 0.9, 0, 6), P(KR - 0.9, 0, 400), P(KR - 5, 0, 6)])}" fill="#4a4636" fill-opacity=".22"/>` +
    `<path d="${shape([P(KL + 0.9, 0, 6), P(KL + 0.9, 0, 400), P(KL + 2.6, 0, 6)])}${shape([P(KR - 0.9, 0, 6), P(KR - 0.9, 0, 400), P(KR - 2.6, 0, 6)])}" fill="#4a4636" fill-opacity=".2"/></g>`
  // A streak under something standing at (x, z).
  const under = (x: number, z: number, w: number, h: number, id: string, o: number) => {
    const [px, py] = P(x, 0, z)

    return smear(px - w / 2, py, w, h, id, o)
  }

  return (
    wet +
    // The hologram's pool, the screens' smear, the far glow down the middle.
    smear(40, 690, 520, 300, 'm', 0.55, 'fl') +
    smear(420, 640, 640, 330, 'm', 0.22, 'fl') +
    smear(1120, 640, 360, 420, 'c', 0.55, 'fl') +
    smear(750, 575, 200, 320, 'h', 0.3) +
    // Narrow streaks under single signs.
    under(LX + 0.6, 50, 16, 110, 'c', 0.6) +
    under(RX - 0.7, 50, 16, 120, 'g', 0.5) +
    under(RX - 1, 36, 30, 220, 'g', 0.45) +
    // Lanterns, shop rows.
    under(-10, 16, 420, 150, 'a', 0.5) +
    under(LX + 1, 42, 240, 110, 'a', 0.3) +
    under(LX + 1, 62, 150, 40, 'a', 0.22) +
    under(RX - 1, 38, 300, 140, 'a', 0.32) +
    under(RX - 1, 60, 160, 44, 'a', 0.22) +
    under(7.6, 14, 240, 110, 'a', 0.45) +
    `<path class="gl" d="${glints}"/>` +
    puddle(-4.6, 13, 1.7, 'm', 0) +
    puddle(2.6, 10, 2.2, 'c', 2) +
    puddle(-3, 23, 1.6, 'm', 5) +
    ''
  )
}

// Far sparkle: tiny lit signs on the facades toward the street's end.
export function farSparkle(): string {
  const rand = seeded(23)
  const dots = ['', '', '']
  for (let i = 0; i < 30; i++) {
    const z = 110 + rand() * 260
    const [px, py] = P(rand() < 0.5 ? LX + 0.6 : RX - 0.6, 2 + rand() * 9, z)
    dots[i % 3] += `M${R(px)} ${R(py)}h2v${1 + (i % 2)}h-2z`
  }

  return `<path d="${dots[0]}" fill="var(--l4)"/><path d="${dots[1]}" fill="var(--l3)"/><path d="${dots[2]}" fill="var(--l1)"/>`
}

// Far ground traffic running to and from the vanishing point, and the tiny
// signals at the far junction.
export function traffic(): string {
  const ref = 75
  const k = F / ref
  const car = (x: number, cls: string, light: string, w = 1.8) =>
    `<g class="${cls}"><rect class="x0" x="${R(x * k - (w * k) / 2)}" y="${R(CAM * k - 14)}" width="${R(w * k)}" height="14" rx="3"/>` +
    `<path d="M${R(x * k - (w * k) / 2 + 2)} ${R(CAM * k - 5)}h5M${R(x * k + (w * k) / 2 - 7)} ${R(CAM * k - 5)}h5" stroke="${light}" stroke-width="4" stroke-linecap="round"/>` +
    `<rect x="${R(x * k - (w * k) / 2)}" y="${R(CAM * k)}" width="${R(w * k)}" height="26" fill="${light}" fill-opacity=".18"/></g>`
  const sig = (x: number) => {
    const [px, py] = P(x, 5.2, 75)

    return `<path class="x0" d="M${R(px)} ${R(py)}h2v${R(5.2 * k)}h-2z"/><circle class="sg" cx="${R(px + 1)}" cy="${R(py)}" r="2" fill="#ff3a2a"/><circle class="sg d3" cx="${R(px + 1)}" cy="${R(py + 5)}" r="2" fill="#3cf08a"/>`
  }

  return (
    `<g transform="translate(850 560)">` +
    car(-5.2, 'tc1', '#fff3c8') +
    car(-1.9, 'tc1 d2', '#fff3c8', 2.2) +
    car(-5.2, 'tc1 d4', '#fff3c8') +
    car(-1.9, 'tc1 d6', '#fff3c8') +
    car(1.6, 'tc2 d1', '#ff3a2a') +
    car(4.9, 'tc2 d3', '#ff3a2a', 2.2) +
    car(1.6, 'tc2 d5', '#ff3a2a') +
    `</g>` +
    sig(KL - 0.6) +
    sig(KR + 0.6)
  )
}

// The near road at the camera's feet: dark and wet, calm under the message
// box, with a soft return of both lights.
export function foreground(): string {
  return (
    `<rect y="800" width="1600" height="200" fill="url(#fgd)"/>` +
    `<ellipse class="fl" cx="300" cy="990" rx="460" ry="80" fill="url(#gm)" fill-opacity="var(--dk)"/><ellipse class="fl" cx="1300" cy="990" rx="440" ry="80" fill="url(#gc)" fill-opacity="var(--dk)"/>`
  )
}

// Steam off the drain covers.
export function vents(): string {
  const [ax, ay] = P(-6, 0, 26)
  const [bx, by] = P(5.6, 0, 31)

  return puff(ax, ay, 9, 'pf d4') + puff(ax, ay, 8, 'pf2 d7') + puff(bx, by, 8, 'pf d0')
}

// Rain: single streaks, each on its own; a moving full-frame pattern layer
// cost more than all of them together.
export function rain(): string {
  const rand = seeded(77)
  let drops = ''
  // Only in the gutters: the middle stays clear behind the conversation.
  for (let i = 0; i < 26; i++) drops += `<path class="rs d${i % 10} r${i % 3}" d="M${R(i % 2 ? 40 + rand() * 470 : 1260 + rand() * 480)}-60l-6 46"/>`

  return drops
}

export const STREET_DEFS =
  `<linearGradient id="rdh" x2="0" y2="1"><stop stop-color="var(--sm)" stop-opacity=".95"/><stop offset=".3" stop-color="var(--sm)" stop-opacity=".5"/><stop offset="1" stop-color="var(--sm)" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="gh"><stop stop-color="var(--hz)" stop-opacity=".7"/><stop offset="1" stop-color="var(--hz)" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="fgd" x2="0" y2="1"><stop stop-color="var(--x0)" stop-opacity="0"/><stop offset="1" stop-color="var(--x0)" stop-opacity="var(--fgo)"/></linearGradient>` +
  `<radialGradient id="gpd"><stop stop-color="var(--pd)" stop-opacity=".75"/><stop offset=".7" stop-color="var(--pd)" stop-opacity=".55"/><stop offset="1" stop-color="var(--pd)" stop-opacity="0"/></radialGradient>`

export const STREET_CSS =
  `.ln{opacity:.3}.jt{fill:none;stroke:var(--r3);stroke-opacity:.6}.gl{fill:none;stroke:var(--r2);stroke-opacity:.5}` +
  `.rf{opacity:var(--rfo)}` +
  `.rp{fill:none;stroke:var(--r2);animation:rp 3.7s ease-out infinite}@keyframes rp{0%{transform:scale(.15);opacity:.9}100%{transform:scale(1.5);opacity:0}}` +
  `.tc1{animation:tc1 31s linear infinite}.tc2{animation:tc1 37s linear infinite reverse}` +
  depthFrames('tc1', 75, 600, 75, true) +
  `.sg{animation:sg 17s steps(1) infinite}@keyframes sg{0%{opacity:1}50%{opacity:.12}}` +
  `.rs{fill:none;stroke:var(--rn);stroke-opacity:.3;stroke-width:1.6;animation:rs .62s linear infinite}.r1{animation-duration:.74s}.r2{animation-duration:.53s}@keyframes rs{to{transform:translate(-150px,1150px)}}`
