import { seeded } from './kit'
import { Bucket, rooms, shape, type Pt } from './cyber2-kit'

// The sky, the cloud deck and the towers in the smog, from hazy giants deep
// in the middle to the near ones running off the top of the frame. Everything
// here is behind the street.

// A soft round glow and a downward smear in one colour: light without blur.
export const glowDef = (id: string, color: string, a = 0.85, b = 0.28): string =>
  `<radialGradient id="g${id}"><stop stop-color="${color}" stop-opacity="${a}"/><stop offset=".38" stop-color="${color}" stop-opacity="${b}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

export const SKY_DEFS =
  `<linearGradient id="sk" x2="0" y2="1"><stop stop-color="var(--k0)"/><stop offset=".55" stop-color="var(--k1)"/><stop offset="1" stop-color="var(--k2)"/></linearGradient>` +
  `<radialGradient id="hz"><stop stop-color="var(--hz)" stop-opacity="var(--hza)"/><stop offset=".3" stop-color="var(--hz)" stop-opacity="var(--hzb)"/><stop offset="1" stop-color="var(--k2)" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="cl"><stop stop-color="var(--cl)" stop-opacity=".5"/><stop offset=".6" stop-color="var(--cl)" stop-opacity=".16"/><stop offset="1" stop-color="var(--cl)" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="smg" x2="0" y2="1"><stop stop-color="var(--sm)" stop-opacity="0"/><stop offset=".7" stop-color="var(--sm)" stop-opacity=".75"/><stop offset="1" stop-color="var(--sm)" stop-opacity=".95"/></linearGradient>` +
  `<radialGradient id="sun"><stop stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".12" stop-color="#fff4c0" stop-opacity=".6"/><stop offset=".5" stop-color="#ffeeb0" stop-opacity=".18"/><stop offset="1" stop-color="#ffeeb0" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="sry" x2="0" y2="1"><stop stop-color="#fff8d8" stop-opacity=".12"/><stop offset="1" stop-color="#fff8d8" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="cv"><stop stop-color="var(--x0)" stop-opacity="0"/><stop offset=".14" stop-color="var(--x0)" stop-opacity=".42"/><stop offset=".86" stop-color="var(--x0)" stop-opacity=".42"/><stop offset="1" stop-color="var(--x0)" stop-opacity="0"/></linearGradient>` +
  glowDef('m', 'var(--holo)') +
  glowDef('c', 'var(--scr)') +
  glowDef('a', '#ffab3d') +
  glowDef('r', '#ff4a2a') +
  glowDef('g', '#7dff5a') +
  glowDef('w', '#fff', 0.7, 0.2) +
  // Tower window habits: lit floor bands, slits, specks, blocks; and the
  // extra floors that light while the session works.
  `<pattern id="wp0" width="34" height="9" patternUnits="userSpaceOnUse"><path class="fw" d="M0 2h9v3h-9zM22 2h10v3h-10z"/><path class="fv" d="M13 2h5v3h-5z"/></pattern>` +
  `<pattern id="wp1" width="11" height="31" patternUnits="userSpaceOnUse"><path class="fw" d="M2 1h2v11h-2zM7 17h1v9h-1z"/><path class="fv" d="M7 3h1v6h-1z"/></pattern>` +
  `<pattern id="wp2" width="13" height="17" patternUnits="userSpaceOnUse"><path class="fw" d="M2 3h2v2h-2zM9 8h2v2h-2zM5 13h2v2h-2z"/><path class="fv" d="M9 2h2v1h-2zM2 10h2v1h-2z"/></pattern>` +
  `<pattern id="wp3" width="46" height="22" patternUnits="userSpaceOnUse"><path class="fw" d="M3 2h4v4h-4zM21 2h9v4h-9zM38 13h5v4h-5zM9 13h3v4h-3z"/><path class="fv" d="M13 2h3v4h-3zM24 13h6v4h-6z"/></pattern>` +
  `<pattern id="wpw" width="29" height="13" patternUnits="userSpaceOnUse"><path class="fv" d="M4 8h7v3h-7zM18 1h6v3h-6z"/><path class="fw" d="M14 8h3v3h-3z"/></pattern>` +
  `<linearGradient id="bs" x2="0" y2="1"><stop stop-color="var(--rc)" stop-opacity="0"/><stop offset="1" stop-color="var(--rc)" stop-opacity=".32"/></linearGradient>` +
  `<linearGradient id="bs2" x1="1" y1="1" x2="0" y2="0"><stop stop-color="var(--rc)" stop-opacity=".34"/><stop offset="1" stop-color="var(--rc)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="mtl" x2="1" y2="0"><stop stop-color="var(--holo)" stop-opacity="var(--ew)"/><stop offset="1" stop-color="var(--holo)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="mtf" x2="0" y2="1"><stop stop-color="#000" stop-opacity=".3"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="var(--sm)" stop-opacity=".55"/></linearGradient>`

// The skyline: three depths of towers standing over the street walls across
// the whole frame. The far ones are the tallest and the haziest, so the
// middle keeps its scale without its detail.
// Each tower is [depth, centre x, top y, width, kind, window habit, extras].
// Kinds: 0 slab with shoulders, 1 needle with rings, 2 comb of shafts,
// 3 wedge, 4 stepped ziggurat, 5 twin shafts joined by sky bridges.
// Extras: s service floors, c crown light, v vertical strip, a advert,
// p data pulse while working. Window habit 9: close enough to see each
// room, drawn window by window rather than as a pattern.
type Tower = [1 | 2 | 3, number, number, number, number, number, string]

const TOWERS: Tower[] = [
  // Far: hazy giants, the tallest standing deep in the middle.
  [1, 300, 150, 60, 2, 2, 'c'],
  [1, 410, 200, 52, 0, 2, 's'],
  [1, 520, 250, 70, 4, 0, ''],
  [1, 610, 150, 40, 3, 2, 'v'],
  [1, 700, 270, 64, 2, 2, ''],
  [1, 790, 70, 46, 0, 0, 'c'],
  [1, 884, 300, 60, 4, 2, ''],
  [1, 962, 160, 42, 3, 2, ''],
  [1, 1040, 230, 62, 2, 0, 's'],
  [1, 1112, 110, 48, 0, 2, 'v'],
  // Middle.
  [2, 24, -60, 90, 5, 1, 'sp'],
  [2, 200, 40, 96, 0, 9, 'sp'],
  [2, 470, 210, 66, 5, 0, 's'],
  [2, 566, 268, 50, 3, 3, 'c'],
  [2, 664, 170, 26, 1, 2, ''],
  [2, 742, 300, 70, 4, 3, 's'],
  [2, 842, 318, 52, 0, 1, ''],
  [2, 930, 290, 60, 2, 3, 'c'],
  [2, 1012, 200, 58, 5, 1, 'sp'],
  [2, 1100, 150, 56, 0, 0, 'sv'],
  // Near: the frame's left edge, running off the top.
  [3, 34, -120, 96, 0, 9, 'svp'],
]

const BASE = 566

function silhouette(cx: number, top: number, w: number, kind: number): Pt[][] {
  const h = BASE - top
  const x0 = cx - w / 2
  const x1 = cx + w / 2

  if (kind === 0) {
    const s = w * 0.16

    return [[[x0, BASE], [x0, top + h * 0.34], [x0 + s, top + h * 0.34], [x0 + s, top + 12], [x1 - s, top + 12], [x1 - s, top + h * 0.2], [x1, top + h * 0.2], [x1, BASE]], [[cx - w * 0.2, top + 12], [cx - w * 0.2, top], [cx + w * 0.12, top], [cx + w * 0.12, top + 12]]]
  }
  if (kind === 1) {
    const t = w * 0.16

    return [[[cx - w * 0.5, BASE], [cx - w * 0.3, top + h * 0.5], [cx - w, top + h * 0.47], [cx - w, top + h * 0.43], [cx - t, top + h * 0.4], [cx - t, top + h * 0.2], [cx - w * 0.7, top + h * 0.18], [cx - w * 0.7, top + h * 0.15], [cx - 2, top + h * 0.12], [cx - 2, top], [cx + 2, top], [cx + 2, top + h * 0.12], [cx + w * 0.7, top + h * 0.15], [cx + w * 0.7, top + h * 0.18], [cx + t, top + h * 0.2], [cx + t, top + h * 0.4], [cx + w, top + h * 0.43], [cx + w, top + h * 0.47], [cx + w * 0.3, top + h * 0.5], [cx + w * 0.5, BASE]]]
  }
  if (kind === 2) {
    const g = w / 3

    return [[[x0, BASE], [x0, top + 46], [x0 + g - 2, top + 46], [x0 + g - 2, top], [x0 + 2 * g - 2, top], [x0 + 2 * g - 2, top + 28], [x1, top + 28], [x1, BASE]]]
  }
  if (kind === 3) return [[[x0, BASE], [x0, top + w * 0.5], [x0 + w * 0.55, top], [x1, top + 10], [x1, BASE]]]
  if (kind === 4) {
    const s = w * 0.14

    return [[[x0, BASE], [x0, top + h * 0.5], [x0 + s, top + h * 0.5], [x0 + s, top + h * 0.24], [x0 + 2 * s, top + h * 0.24], [x0 + 2 * s, top], [x1 - 2 * s, top], [x1 - 2 * s, top + h * 0.16], [x1 - s, top + h * 0.16], [x1 - s, top + h * 0.42], [x1, top + h * 0.42], [x1, BASE]]]
  }
  const g = w * 0.36

  return [[[x0, BASE], [x0, top + 22], [x0 + g, top + 22], [x0 + g, BASE]], [[x1 - g, BASE], [x1 - g, top], [x1, top], [x1, BASE]], [[x0 + g, top + h * 0.22], [x1 - g, top + h * 0.22], [x1 - g, top + h * 0.22 + 9], [x0 + g, top + h * 0.22 + 9]], [[x0 + g, top + h * 0.52], [x1 - g, top + h * 0.52], [x1 - g, top + h * 0.52 + 9], [x0 + g, top + h * 0.52 + 9]]]
}

const KANA = ['ミライ', 'ネオン', 'ヒカリ', 'ソラ']

export function skyBack(): string {
  const rand = seeded(41)
  // Silhouettes by depth and window habit, drawn once and used twice.
  const groups = new Map<string, string>()
  const detail = [new Bucket(), new Bucket(), new Bucket()]
  let lights = ''
  let extras = ''
  let pulses = ''

  const lit = [new Bucket(), new Bucket(), new Bucket()]
  TOWERS.forEach(([depth, cx, top, w, kind, habit, flags], i) => {
    const key = `${depth}${habit}`
    const parts = silhouette(cx, top, w, kind)
    groups.set(key, (groups.get(key) ?? '') + parts.map(p => shape(p)).join(''))
    const b = detail[depth - 1]!
    const x0 = Math.round(cx - w / 2)
    const h = BASE - top
    if (habit === 9) {
      const s = w * 0.16
      const [bay, storey] = depth === 3 ? [32, 40] : [24, 30]
      // Clawd's hologram stands in front of the middle tower: dark glass there.
      const holes = [{ x: 100, y: 110, w: 210, h: 150 }]
      rooms(b, lit[depth - 1]!, { x: x0 + s, y: top + 16, w: w - 2 * s, h: h * 0.34 - 16 }, bay * 0.8, storey, 50 + i, 0.5, holes, 3)
      rooms(b, lit[depth - 1]!, { x: x0, y: top + h * 0.34 + 4, w, h: h * 0.66 - 4 }, bay, storey, 70 + i, 0.5, holes, 3)
    }
    // A shaded flank gives each tower a second face.
    if (kind !== 1 && kind !== 5) b.add('x0 fk', `M${Math.round(cx + w * 0.2)} ${Math.round(top + h * 0.22)}h${Math.round(w * 0.3)}v${Math.round(h * 0.8)}h${-Math.round(w * 0.3)}z`)
    // Dark service floors.
    if (flags.includes('s')) for (const f of [0.3 + rand() * 0.1, 0.55 + rand() * 0.15]) b.add('x0 sv', `M${x0} ${Math.round(top + h * f)}h${Math.round(w)}v${depth === 3 ? 7 : 4}h${-Math.round(w)}z`)
    // A lit crown line.
    if (flags.includes('c')) extras += `<path d="M${Math.round(cx - w * 0.3)} ${Math.round(top + (kind === 0 ? 13 : 2))}h${Math.round(w * 0.6)}" stroke="${i % 2 ? 'var(--scr)' : '#ffb02e'}" stroke-opacity=".7" stroke-width="${depth}"/>`
    // A vertical strip of light down one edge.
    if (flags.includes('v')) extras += `<path d="M${Math.round(cx - w * 0.3)} ${Math.round(top + h * 0.24)}v${Math.round(h * 0.5)}" stroke="${i % 2 ? '#ff4a2a' : 'var(--scr)'}" stroke-opacity=".6" stroke-width="${depth === 3 ? 2 : 1.2}"/>`
    // A hologram advert hung on the face.
    if (flags.includes('a')) {
      const ax = Math.round(cx - w * 0.36)
      const ay = Math.round(top + h * 0.5)
      extras += `<g class="bk d${i % 10}"><rect x="${ax}" y="${ay}" width="34" height="96" fill="var(--scr)" fill-opacity=".16" stroke="var(--scr)" stroke-opacity=".6"/><text class="jp vt" x="${ax + 17}" y="${ay + 8}" font-size="20" fill="var(--scr)" fill-opacity=".85">${KANA[i % 4]}</text></g>`
    }
    // Data climbing the tower while the session works.
    if (flags.includes('p')) {
      const px = Math.round(cx + w * 0.3)
      pulses += `<g transform="translate(${px} ${BASE - 40})"><rect class="dq d${i % 10}" x="-2" width="4" height="${depth === 3 ? 30 : 20}" rx="2" fill="var(--scr)"/><rect class="dq d${(i + 5) % 10}" x="-2" width="4" height="${depth === 3 ? 30 : 20}" rx="2" fill="#fff"/></g><path d="M${px} ${Math.round(top + 30)}V${BASE - 40}" stroke="var(--scr)" stroke-opacity=".45"/>`
    }
    // Masts and warning lights.
    if (kind !== 3 && rand() < 0.75) {
      const mx = Math.round(kind === 5 ? cx + w * 0.32 : kind === 2 ? cx : cx - w * 0.04)
      const mh = Math.round(10 + rand() * 26 * depth * 0.6)
      b.add('x0', `M${mx - 1} ${Math.round(top - mh)}h2v${mh}h-2z`)
      lights += `<circle class="wl d${i % 10}" cx="${mx}" cy="${Math.round(top - mh - 1)}" r="${depth === 3 ? 2.6 : 1.8}"/>`
    }
  })
  const layer = (depth: number): string =>
    [...groups]
      .filter(([k]) => k.startsWith(String(depth)))
      .map(([k, d]) =>
        k[1] === '9'
          ? `<path d="${d}" class="f${depth}"/>`
          : `<g id="sk${k}"><path d="${d}"/></g><use href="#sk${k}" class="f${depth}"/>${depth > 1 ? `<use href="#sk${k}" fill="url(#wp${k[1]})" class="fo${depth}"/>` : ''}${depth > 2 ? `<use href="#sk${k}" fill="url(#wpw)" class="wo"/>` : ''}`,
      )
      .join('') +
    detail[depth - 1]!.toString() +
    `<g class="wo">${lit[depth - 1]!.toString()}</g>` +
    [...groups].filter(([k]) => k === `${depth}9`).map(([, d]) => `<path d="${d}" fill="url(#glr)"/>`).join('')
  const clouds = [
    [300, 60, 520, 80],
    [1200, 70, 560, 80],
  ]
    .map(([x, y, rx, ry], i) => `<ellipse class="cd d${i}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#cl)"/>`)
    .join('')

  return (
    `<rect width="1600" height="620" fill="url(#sk)"/>` +
    `<ellipse cx="850" cy="566" rx="600" ry="300" fill="url(#hz)"/>` +
    `<g class="dy"><circle cx="820" cy="150" r="300" fill="url(#sun)"/><circle cx="820" cy="150" r="50" fill="url(#sun)"/></g>` +
    clouds +
    layer(1) +
    `<rect y="240" width="1600" height="330" fill="url(#smg)" opacity=".8"/>` +
    layer(2) +
    `<rect y="300" width="1600" height="270" fill="url(#smg)" opacity=".75"/>` +
    layer(3) +
    extras +
    `<g class="wo">${pulses}</g>` +
    lights +
    `<rect y="380" width="1600" height="190" fill="url(#smg)"/>`
  )
}

export const MARK = {
  root: '<!--c2:root-->',
  model: '<!--c2:model-->',
  name: '<!--c2:name-->',
  status: '<!--c2:status-->',
  load: '<!--c2:load-->',
  board: '<!--c2:board-->',
  tape: '<!--c2:tape-->',
  ration: '<!--c2:ration-->',
  kiosk: '<!--c2:kiosk-->',
  purge: '<!--c2:purge-->',
} as const

// The chat sits over the middle of the frame and the scene shows through
// between its cards, so the middle is kept dark and quiet at night: a soft
// veil over the centre, fading out toward both sides.
export const centreVeil = (): string => `<rect class="nt" x="400" width="800" height="1000" fill="url(#cv)"/>`
