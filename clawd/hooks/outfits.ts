const r = (x: number, y: number, w: number, h: number, f: string): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`
const p = (pts: string, f: string): string => `<polygon points="${pts}" fill="${f}"/>`
const g = (body: string): string => `<g shape-rendering="crispEdges">${body}</g>`
const loop = (type: string, values: string, dur: string): string =>
  `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" repeatCount="indefinite"/>`
const each = <T>(xs: readonly T[], f: (x: T, i: number) => string): string => xs.map(f).join('')

const C = {
  ink: '#1F1E24', white: '#F4F1EA', cream: '#EFE4CC', red: '#D64545', navy: '#22305C',
  blue: '#3E7BD6', sky: '#A9CBF2', yellow: '#F2C230', gold: '#E8A93A', green: '#3FA34D',
  teal: '#1FA99B', pink: '#F08BB4', purple: '#7B4FC9', brown: '#7A4B2A', tan: '#B7854F',
  grey: '#8A94A0', dgrey: '#5E6670',
}

const torso = (f: string, sleeve = f, long = false): string =>
  r(9, 12, 36, 12, f) + (long ? r(3, 12, 6, 6, sleeve) + r(45, 12, 6, 6, sleeve) : r(6, 12, 3, 6, sleeve) + r(45, 12, 3, 6, sleeve))

const flower = (x: number, y: number, petal: string, core = C.yellow): string =>
  r(x, y, 6, 6, petal) + r(x + 1.5, y + 1.5, 3, 3, core)

const HAT: Record<string, () => string> = {
  propeller: () =>
    g(r(9, -6, 9, 8, C.red) + r(18, -6, 9, 8, C.yellow) + r(27, -6, 9, 8, C.blue) + r(36, -6, 9, 8, C.green) +
      r(12, -9, 15, 3, C.red) + r(27, -9, 15, 3, C.blue) + r(9, 0, 36, 2, C.navy) + r(25.5, -13, 3, 4, C.ink)) +
    `<g transform="translate(27 0)"><g>${loop('scale', '1 1;0.2 1;-1 1;0.2 1;1 1', '0.5s')}` +
    r(-12, -16, 12, 3, C.red) + r(0, -16, 12, 3, C.yellow) + r(-1.5, -17, 3, 5, C.ink) + '</g></g>',
  nightcap: () =>
    g(r(9, -6, 36, 6, C.sky) + r(15, -10, 27, 4, C.sky) + r(24, -14, 21, 4, C.sky) + r(42, -11, 9, 5, C.sky) +
      r(18, -6, 6, 6, C.white) + r(33, -10, 6, 4, C.white) + r(39, -14, 3, 4, C.white) +
      r(7, -1, 40, 3, C.white)) +
    `<g>${loop('translate', '0 0;1 1;0 0;-1 1;0 0', '2.4s')}${g(r(47, -7, 6, 6, C.white) + r(48.5, -5.5, 3, 3, C.cream))}</g>`,
  cowboy: () =>
    g(r(15, -14, 9, 11, C.tan) + r(30, -14, 9, 11, C.tan) + r(24, -12, 6, 9, C.tan) + r(15, -6, 24, 3, C.brown) +
      r(0, -3, 54, 3, C.tan) + r(3, 0, 6, 2, C.tan) + r(45, 0, 6, 2, C.tan) + r(18, -5.5, 3, 2, C.gold)),
  hijab: () => {
    const h = '#8E5A9B', d = '#6E3F7C'
    return g(r(9, -4, 36, 4, h) + r(6, -1, 42, 7, h) + r(6, 6, 6, 12, h) + r(42, 6, 6, 12, h) +
      r(3, 12, 9, 9, h) + r(42, 12, 9, 9, h) + r(12, 1.5, 30, 3, d) + r(9, -3, 6, 2, '#B07FBC') +
      r(6, 18, 6, 3, d) + r(42, 18, 6, 3, d))
  },
  fez: () =>
    g(p('15,1 39,1 36,-12 18,-12', '#B8322E') + r(15, -2, 24, 3, '#8E2522') + r(27, -14, 9, 3, C.ink) +
      r(33, -11, 3, 7, C.ink) + r(31.5, -5, 6, 4, C.gold)),
  ushanka: () => {
    const fur = '#C9B79A', hide = C.brown
    return g(r(9, -13, 36, 9, hide) + r(15, -15, 24, 2, hide) + r(6, -5, 42, 7, fur) + r(3, 0, 9, 15, fur) +
      r(42, 0, 9, 15, fur) + r(3, 12, 9, 3, '#AE9C7E') + r(42, 12, 9, 3, '#AE9C7E') +
      r(12, -3, 3, 3, C.cream) + r(24, -4, 3, 3, C.cream) + r(36, -3, 3, 3, C.cream) + r(24, -11, 6, 3, '#5E3820'))
  },
  beret: () =>
    g(r(6, -4, 39, 5, C.navy) + r(3, -8, 39, 4, C.navy) + r(9, -10, 27, 2, C.navy) + r(21, -13, 3, 3, C.navy) +
      r(9, -7, 12, 2, '#33467E') + r(6, 0, 39, 1.5, '#16203F')),
  party: () =>
    g(p('12,2 42,2 27,-16', C.pink) + r(15, -3, 3, 3, C.yellow) + r(30, -6, 3, 3, C.blue) + r(24, -11, 3, 3, C.yellow) +
      r(21, -4, 3, 3, C.teal) + r(34.5, -1, 3, 3, C.yellow) + r(12, 0, 30, 2, '#C9608F') +
      r(24, -20, 6, 6, C.yellow) + r(25.5, -18.5, 3, 3, C.white)),
  chef: () =>
    g(r(12, -4, 30, 6, C.white) + r(9, -13, 36, 9, C.white) + r(12, -17, 9, 4, C.white) + r(24, -19, 9, 6, C.white) +
      r(36, -16, 6, 3, C.white) + r(12, -4, 30, 1.5, '#C9CCD2') + r(21, -12, 3, 8, '#DADDE2') + r(33, -11, 3, 7, '#DADDE2')),
  tophat: () =>
    g(r(13, -19, 28, 16, C.ink) + r(6, -3, 42, 3, C.ink) + r(13, -7, 28, 4, C.red) + r(16, -17, 3, 9, '#3A3944') +
      r(9, 0, 36, 1.5, '#0E0D12')),
  cap: () =>
    g(r(9, -7, 33, 8, C.red) + r(15, -10, 21, 3, C.red) + r(24, -12, 3, 2, '#A92F2F') + r(36, -2, 18, 3, '#A92F2F') +
      r(18, -6, 6, 4, C.white) + r(9, -1, 30, 2, '#A92F2F')),
  flowers: () =>
    g(r(6, -2, 42, 3, C.green) + r(3, 0, 6, 3, C.green) + r(45, 0, 6, 3, C.green) +
      flower(6, -7, C.pink) + flower(15, -9, C.white) + flower(24, -10, C.red) + flower(33, -9, C.sky) +
      flower(42, -7, C.pink) + r(21, -4, 3, 3, '#5DBF6A') + r(39, -4, 3, 3, '#5DBF6A')),
  grad: () =>
    g(r(12, -6, 30, 7, C.ink) + p('3,-8 27,-13 51,-8 27,-3', '#2A2933') + r(25.5, -9.5, 3, 3, C.gold) +
      r(28.5, -8.5, 18, 2, C.gold) + r(45, -8, 3, 10, C.gold) + r(43.5, 1, 6, 5, C.gold)),
}

const TOP: Record<string, () => string> = {
  breton: () =>
    g(torso(C.white) + r(9, 15, 36, 3, C.navy) + r(9, 21, 36, 3, C.navy) + r(6, 15, 3, 3, C.navy) +
      r(45, 15, 3, 3, C.navy) + r(18, 12, 18, 1.5, C.navy)),
  pyjamas: () => {
    const dots: [number, number][] = [[12, 13.5], [36, 13.5], [18, 19.5], [39, 19.5], [12, 21]]
    return g(torso(C.sky, C.sky, true) + each(dots, ([x, y]) => r(x, y, 3, 3, C.white)) + r(27, 12, 1.5, 12, '#86ABD9') +
      r(28.5, 13.5, 3, 3, C.pink) + r(28.5, 19.5, 3, 3, C.pink) + r(3, 16, 6, 2, C.white) + r(45, 16, 6, 2, C.white))
  },
  hawaiian: () =>
    g(torso(C.teal) + p('19,12 27,12 24,16', C.yellow) + p('35,12 27,12 30,16', C.yellow) +
      flower(10.5, 15, C.pink) + flower(36, 13.5, C.red, C.white) + flower(21, 18, C.yellow, C.red) +
      flower(31.5, 19.5, C.pink) + r(6, 12, 3, 6, C.pink)),
  hoodie: () =>
    g(torso(C.grey, C.grey, true) + r(15, 12, 24, 2, C.dgrey) + r(21, 12, 3, 5, C.white) + r(30, 12, 3, 5, C.white) +
      r(16.5, 18, 21, 5, C.dgrey) + r(3, 16, 6, 2, C.dgrey) + r(45, 16, 6, 2, C.dgrey) + r(9, 22.5, 36, 1.5, C.dgrey)),
  overalls: () => {
    const den = '#3D6FB5', dd = '#2C5590'
    return g(r(9, 12, 36, 6, '#E9E2D2') + r(18, 12, 18, 6, den) + r(12, 12, 6, 3, den) + r(36, 12, 6, 3, den) +
      r(9, 18, 36, 6, den) + r(18, 13, 3, 3, C.yellow) + r(33, 13, 3, 3, C.yellow) + r(24, 15, 6, 3, dd) +
      r(25.5, 19.5, 3, 4.5, dd) + r(6, 12, 3, 6, '#E9E2D2') + r(45, 12, 3, 6, '#E9E2D2'))
  },
  tuxedo: () =>
    g(torso(C.ink) + p('19.5,12 34.5,12 27,24', C.white) + p('19.5,12 24,12 27,24', '#2E2D36') +
      p('34.5,12 30,12 27,24', '#2E2D36') + r(26, 17, 2, 2, C.ink) + r(26, 20.5, 2, 2, C.ink) +
      p('21,12 27,14.5 21,17', C.red) + p('33,12 27,14.5 33,17', C.red) + r(25.5, 13, 3, 3, '#A32E2E')),
  sweater: () => {
    const base = '#C8423B'
    return g(torso(base, base, true) + each([9, 15, 21, 27, 33, 39], (x) => r(x, 15, 3, 3, C.cream)) +
      each([12, 18, 24, 30, 36, 42], (x) => r(x, 18, 3, 3, C.cream)) + r(9, 22, 36, 2, '#9E2F2A') +
      r(18, 12, 18, 2, '#9E2F2A') + r(3, 16, 6, 2, '#9E2F2A') + r(45, 16, 6, 2, '#9E2F2A'))
  },
  labcoat: () =>
    g(torso(C.white, C.white, true) + p('22,12 32,12 27,19', C.blue) + p('22,12 25,12 27,22', '#C9CCD2') +
      p('32,12 29,12 27,22', '#C9CCD2') + r(27, 12, 1.5, 12, '#C9CCD2') + r(33, 17, 6, 5, '#DADDE2') +
      r(34.5, 15, 1.5, 3, C.blue) + r(3, 16, 6, 2, '#DADDE2') + r(45, 16, 6, 2, '#DADDE2')),
  cape: () => {
    const cr = '#C8323B'
    return g(torso(C.blue) + r(9, 12, 36, 2.5, cr) + r(12, 12, 3, 3, C.gold) + r(39, 12, 3, 3, C.gold) +
      p('24,16 30,16 27,21', C.yellow)) +
      `<g>${loop('translate', '0 0;-1 0;0 0', '1.2s')}${g(r(0, 11, 3, 13, cr) + r(3, 18, 6, 6, cr) + r(0, 22, 6, 2, '#9E2730'))}</g>` +
      `<g>${loop('translate', '0 0;1 0;0 0', '1.2s')}${g(r(51, 11, 3, 13, cr) + r(45, 18, 6, 6, cr) + r(48, 22, 6, 2, '#9E2730'))}</g>`
  },
  raincoat: () =>
    g(torso(C.yellow, C.yellow, true) + r(16.5, 12, 21, 2, '#D9A91F') + r(27, 14, 1.5, 10, '#D9A91F') +
      r(22.5, 15, 3, 2, C.ink) + r(22.5, 19.5, 3, 2, C.ink) + r(30, 15, 3, 2, C.ink) + r(30, 19.5, 3, 2, C.ink) +
      r(9, 22, 36, 2, '#D9A91F') + r(3, 16, 6, 2, '#D9A91F') + r(45, 16, 6, 2, '#D9A91F')),
  referee: () =>
    g(torso(C.yellow, C.ink) + r(18, 12, 18, 2.5, C.ink) + r(9, 12, 3, 12, C.ink) + r(42, 12, 3, 12, C.ink) +
      r(27, 14.5, 1.5, 9.5, C.ink) + r(15, 16, 6, 4, '#D9A91F') + r(33, 16, 6, 3, C.red) + r(9, 22.5, 36, 1.5, C.ink)),
}

const goalie = (base: string, dark: string, glove: string, cuff: string): string =>
  g(torso(base, base, true) + r(9, 15, 36, 3, dark) + r(16.5, 12, 21, 2, dark) + r(25.5, 18, 3, 4.5, C.white) +
    r(23.5, 18, 2, 2, C.white) + r(9, 22.5, 36, 1.5, dark) + r(2, 11, 8, 8, glove) + r(44, 11, 8, 8, glove) + r(2, 17, 8, 2, cuff) +
    r(44, 17, 8, 2, cuff) + r(4, 12, 4, 3, C.white) + r(46, 12, 4, 3, C.white))

TOP['goalieA'] = () => goalie(C.green, '#2C7A38', '#F2F2F2', C.ink)
TOP['goalieB'] = () => goalie(C.purple, '#5A3699', C.yellow, '#C98E1A')

const SPECIAL = ['grad', 'referee', 'goalieA', 'goalieB']

export const HATS: readonly string[] = Object.keys(HAT).filter((k) => !SPECIAL.includes(k))
export const TOPS: readonly string[] = Object.keys(TOP).filter((k) => !SPECIAL.includes(k))

export function hat(name: string): string {
  return HAT[name]?.() ?? ''
}

export function top(name: string): string {
  return TOP[name]?.() ?? ''
}
