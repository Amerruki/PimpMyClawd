import { makeColors } from './make-colors.js'
import { blob, grade, n, seeded, svg } from './kit'
import { globe, lambertGradient, litPath, projectRing, rimGradient, SPACE_CSS, SPACE_DEFS, starfield, turnCSS, turning, unit, meridian, squash, type Turn, type Vec3 } from './space-inner-kit'
import type { Look } from './look'

// Earth from orbit: the limb fills the lower right corner over the Middle
// East, the Mediterranean and the Gulf, drawn from real coastlines projected
// onto the globe. Cloud systems drift east as the planet turns, the ocean
// carries a sun glint, and a thin blue atmosphere glows along the limb. A
// generic space station crosses slowly and the Moon hangs in the distance,
// lit from the same sun. Night turns the globe to its dark side: golden city
// lights, an aurora over the northern limb, and sunrise breaking along the
// terminator.
const { theme, problems } = makeColors({
  label: 'Earth orbit',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#1769c2', danger: '#d42a3a', success: '#1f9a50', warning: '#a87400', pro: '#8a4ad8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eef3f9',
        'surface-1': '#f4f7fb',
        'surface-2': '#fafcfe',
        'text-primary': '#0f1a2a',
        'text-secondary': '#2c3b52',
        'text-muted': '#4a5a72',
      },
    },
  },
  dark: {
    roles: { accent: '#4aa8ff', pro: '#b08cff' },
    gray: {
      anchors: {
        'surface-0': '#05080f',
        'surface-1': '#0a0f19',
        'surface-2': '#0f1522',
        'surface-3': '#141b2b',
        'text-primary': '#eaf2ff',
        'text-secondary': '#bccbe2',
        'text-muted': '#8e9fbb',
      },
    },
  },
})

const CX = 1600
const CY = 1300
const R = 900
const G = globe(CX, CY, R, 66, -9)
const TURN: Turn = { period: 1500, r: R, tilt: -9 }

// Day light from the upper left, a little in front; night light from behind
// the planet near the top of the limb, so only a thin sunrise crescent shows.
const L_DAY: Vec3 = unit([-0.19, -0.85, 0.5])
const L_NIGHT: Vec3 = unit([0.027, -0.39, -0.92])

type Ring = readonly (readonly [number, number])[]

// ---- Coastlines (lon, lat) ----------------------------------------------------

const AFRICA: Ring = [
  [-5.9, 35.8], [-2.9, 35.3], [-0.6, 35.8], [1.5, 36.5], [3, 36.8], [5.1, 36.8], [7.7, 36.9], [9.8, 37.3], [11.1, 37], [10.5, 36.3],
  [10.7, 35.6], [11.1, 35.2], [10.1, 34.3], [10.1, 33.8], [11.1, 33.2], [13.2, 32.9], [15.2, 32.3], [15.6, 31.4], [17.5, 30.9], [18.9, 30.3],
  [20.1, 30.9], [20, 32.1], [21.5, 32.9], [22.6, 32.8], [23.9, 32.1], [25.2, 31.6], [27.2, 31.4], [29.9, 31.2], [30.6, 31.5], [31.4, 31.6],
  [32.3, 31.3], [32.5, 30.5], [32.55, 29.95], [32.7, 29.4], [33.2, 28.6], [33.6, 27.7], [33.9, 27], [34.3, 26.1], [35, 24.8], [35.6, 23.9],
  [36.5, 22.4], [37.1, 21], [37.3, 19.6], [38.2, 18.2], [38.7, 17.2], [39.5, 15.6], [40.2, 15], [41.3, 13.9], [42.4, 12.9], [43.3, 12.4],
  [43.1, 11.6], [44.2, 10.6], [45, 10.4], [46.5, 10.7], [48, 11.2], [49.4, 11.3], [51.2, 11.8], [51.1, 10.4], [50.6, 9], [49.7, 7],
  [48.5, 5], [47, 3.2], [45.3, 2], [43.6, 0.6], [42, -1], [40.5, -2.5], [39.7, -4], [39.2, -6.8], [39.5, -8.5], [40.5, -10.5],
  [40.6, -14.5], [39.2, -16.6], [36.6, -18.6], [35.3, -21], [35.5, -23.5], [32.9, -25.9], [32.6, -28.4], [30.9, -29.9], [28.2, -32.6], [25.6, -34],
  [20, -34.8], [18.4, -34.3], [18.2, -32], [16.5, -28.6], [15.2, -26.8], [14.5, -22.9], [12.2, -18.4], [11.8, -15.8], [13.4, -12], [13.2, -8.8],
  [12.2, -6], [11.8, -4.6], [9.2, -1], [9.5, 2], [9.7, 4], [8.5, 4.6], [6, 4.3], [4.6, 6.2], [3.4, 6.4], [1.2, 6.1],
  [-0.2, 5.5], [-2, 4.8], [-4, 5.2], [-7.5, 4.4], [-9.4, 5.4], [-11.4, 6.9], [-13.2, 8.4], [-14.8, 10.6], [-16.6, 12.2], [-17.5, 14.7],
  [-16.5, 16.2], [-16.1, 18.1], [-16.4, 19.8], [-17, 20.9], [-16, 23.7], [-14.5, 26.1], [-13, 27.8], [-11.4, 28.4], [-9.8, 29.9], [-9.7, 31.4],
  [-8.6, 33.2], [-7.6, 33.6], [-6.8, 34], [-6.2, 35.1],
]

const EURASIA: Ring = [
  // Levant and Anatolia
  [32.3, 31.3], [34.2, 31.3], [34.8, 32.1], [35, 32.8], [35.5, 33.9], [35.9, 35], [35.8, 35.6], [36.1, 36.6], [35.2, 36.7], [34, 36.3],
  [32.5, 36.1], [30.7, 36.8], [29.6, 36.2], [28.1, 36.7], [27.4, 37.3], [26.8, 38.4], [26.4, 39.4], [26.2, 40], [27, 40.4], [28.9, 40.7],
  [29.1, 41.1], [27.6, 40.9], [26.2, 40.6],
  // Balkans, Greece, Adriatic
  [25.4, 40.9], [24, 40.8], [22.9, 40.6], [22.6, 40], [23.1, 39.3], [22.8, 38.8], [24, 38.2], [23.7, 37.9], [23.1, 36.5], [22.4, 36.4],
  [21.7, 36.8], [21.1, 37.8], [21.6, 38.4], [20.7, 39.2], [20, 39.7], [19.4, 40.4], [19.5, 41.3], [19, 42], [18, 42.6], [16.4, 43.5],
  [15.2, 44.2], [14, 44.9], [13.6, 45.1], [13.7, 45.7], [12.3, 45.4], [12.4, 44.2], [13.6, 43.5], [14.2, 42.4], [16.2, 41.9], [16.9, 41.1],
  [18, 40.6], [18.5, 40.1], [17.2, 40.4], [16.6, 39.6], [17.1, 39], [16.5, 38.4], [15.65, 38], [15.8, 38.7], [16, 39.4], [15.6, 40],
  [14.8, 40.6], [14.2, 40.8], [13, 41.3], [12.2, 41.8], [11.2, 42.4], [10.5, 42.9], [10.3, 43.6], [9.8, 44.1], [8.9, 44.4], [7.5, 43.8],
  [6.6, 43.2], [5.4, 43.3], [4.6, 43.4], [3.3, 43.2], [3.1, 42.5], [3.2, 41.9], [2.2, 41.4], [0.9, 41], [0.2, 40.1], [-0.3, 39.5],
  [0.2, 38.8], [-0.5, 38.3], [-0.8, 37.6], [-2.1, 36.7], [-3.5, 36.7], [-4.4, 36.7], [-5.4, 36.1], [-6.3, 36.5], [-7.4, 37.2], [-8.9, 37],
  [-8.8, 38.5], [-9.5, 38.7], [-9, 40.2], [-8.7, 41.2], [-8.9, 42.1], [-9.3, 43], [-8.2, 43.6], [-5.8, 43.6], [-3.8, 43.45], [-1.8, 43.4],
  [-1.3, 44.6], [-1.2, 46.2], [-2.2, 47.2], [-4.5, 47.8], [-4.8, 48.4], [-3, 48.8], [-1.6, 48.6], [-1.9, 49.7], [-1.3, 49.4], [0.2, 49.5],
  [1.6, 50.2], [1.6, 50.9], [3.2, 51.3], [4.2, 52], [4.7, 52.9], [5.5, 53.4], [7, 53.5], [8.6, 53.9], [8.6, 55.4], [8.1, 56.8],
  [10.6, 57.7], [10.3, 56.3], [10.8, 56], [10, 55], [10.9, 54.4], [12.1, 54.2], [13.8, 54.1], [14.5, 53.9], [16.6, 54.6], [18.6, 54.4],
  [19.9, 54.6], [21.1, 55.7], [21, 56.8], [22.6, 57.7], [24.1, 57], [23.5, 58.5], [24, 59.3], [24.8, 59.4], [28, 59.5], [30.3, 59.9],
  [29, 60.2], [25, 60.2], [22.3, 60.4], [21.4, 61.5], [21.6, 63], [25.4, 65], [24.1, 65.8], [22, 65.6], [21, 64.3], [19, 63.4],
  [17.5, 62.3], [17.3, 61], [18.7, 60], [18, 59.3], [16.7, 57.8], [16.5, 56.5], [14.5, 56], [13, 55.5], [12.6, 56], [11.9, 57.7],
  [11, 59], [10.6, 59.9], [9.5, 59], [8, 58.1], [6, 58.4], [5.6, 59], [5.2, 60.4], [5, 61.6], [6, 62.5], [8.4, 63.2],
  [10.4, 63.4], [11.5, 64.5], [13, 66], [14.4, 67.3], [16, 68.5], [18.9, 69.6], [23, 70.4], [25.8, 71.1], [28.5, 70.9], [31, 70.3],
  [33, 69.4], [36.5, 69], [41, 67.7], [40.5, 66.2], [34.5, 66], [34.8, 64.5], [37, 63.9], [40.5, 64.5], [43.5, 66.3], [44, 68.4],
  [46, 68], [53.5, 68.6], [58, 68.9], [60, 69.7], [66, 69], [68.5, 68.4], [72.5, 72.8], [80, 73.5], [100, 77.5], [113, 73.5],
  [130, 71], [140, 72.5], [160, 69.6], [175, 67], [170, 60], [162, 56], [156, 51], [155, 58], [143, 59], [137, 54],
  [141, 52], [135, 43], [130, 42.5], [129.5, 36], [126.5, 34.5], [126.5, 37.7], [124.5, 39.8], [121.5, 40.9], [118, 39], [120.3, 36],
  [122, 30.8], [119.5, 25.5], [114, 22.2], [108, 21.5], [106.5, 20], [109, 15], [108.5, 11], [105, 8.6], [103, 10.5], [100.9, 13.4],
  [99.5, 10], [100.4, 7], [103.4, 3.8], [104.2, 1.4], [101.4, 2.9], [100.3, 5.5], [98.5, 8], [98.3, 12.5], [97.5, 16.5], [94.3, 16],
  [94.5, 19], [92.3, 21.2], [90.5, 22], [88.5, 21.6], [86.9, 20.6], [85, 19.3], [82.3, 17], [80.3, 13.1], [79.8, 10.3], [77.5, 8.1],
  [76.3, 9.9], [75, 12.8], [73.8, 15.5], [72.8, 19], [72.6, 21.1], [72.2, 21.9], [71, 20.7], [69, 22.3], [68.5, 23.6], [67, 24.8],
  [64, 25.3], [61.6, 25.2], [58.8, 25.6], [57.3, 25.9], [56.3, 27.1], [54.5, 26.6], [52.5, 27.4], [51.4, 28], [50.8, 28.9], [50.1, 30.1],
  [49, 30.4], [48, 29.9], [48.5, 28.4], [49.6, 27], [50.1, 26.3], [50.6, 25.3], [50.8, 24.8], [50.9, 25.6], [51.2, 26.15], [51.55, 25.6],
  [51.55, 25], [51.6, 24.6], [52.5, 24.2], [54.4, 24.5], [55.3, 25.3], [56, 25.7], [56.3, 26.4], [56.35, 25.1], [56.6, 24.4], [58.6, 23.6],
  [59.8, 22.5], [58.8, 20.5], [57.8, 19], [56.6, 18], [55, 17.1], [52.2, 15.6], [49, 14.5], [45, 12.8], [43.5, 12.7], [42.8, 14.8],
  [42.6, 16.5], [41.8, 17.8], [40, 20], [39.2, 21.5], [38, 24.1], [36.5, 26], [35.2, 28], [34.9, 29.5], [34.6, 28.5], [34.3, 27.9],
  [34.25, 27.73], [33.5, 28.5], [32.7, 29.7], [32.55, 29.95],
]

const ISLANDS: Ring[] = [
  // Sicily, Sardinia, Corsica, Crete, Cyprus, Mallorca
  [[12.4, 38.1], [13.4, 38.2], [15.6, 38.3], [15.1, 37.5], [15.1, 36.7], [14.3, 37], [12.5, 37.6]],
  [[8.2, 40.9], [9.2, 41.25], [9.7, 40.9], [9.6, 39.2], [9, 39], [8.4, 38.9], [8.4, 40]],
  [[9.4, 43], [9.55, 42.2], [9.2, 41.4], [8.6, 41.6], [8.6, 42.5]],
  [[23.5, 35.3], [24.5, 35.5], [26.3, 35.3], [26, 35], [24.7, 34.9], [23.6, 35.2]],
  [[32.3, 35.1], [33, 35.35], [34.6, 35.7], [33.9, 35], [33, 34.6], [32.4, 34.8]],
  [[2.4, 39.6], [3.3, 39.8], [3.4, 39.4], [2.7, 39.3]],
  // Great Britain, Ireland
  [[-5.7, 50.1], [-3, 50.7], [1.4, 51.2], [1.7, 52.6], [0.3, 53], [0.1, 53.6], [-1.5, 55], [-2, 55.9], [-3, 56], [-1.8, 57.5], [-3, 58.6], [-5, 58.6], [-5.7, 57.5], [-5.6, 56.3], [-5, 55.5], [-4.8, 54.8], [-3.4, 54.5], [-3, 53.4], [-4.6, 53.3], [-4.2, 52.4], [-5.2, 51.8], [-3.2, 51.4], [-4.2, 51.1]],
  [[-6, 52.2], [-6.2, 53.3], [-5.5, 54.6], [-7.2, 55.3], [-8.5, 54.5], [-10, 54.2], [-9.5, 53], [-10.3, 52], [-9.5, 51.6], [-8, 51.8]],
  // Sri Lanka, Bahrain
  [[79.9, 6.9], [80, 9.8], [81.2, 8.5], [81.8, 7.3], [81, 6], [80.1, 6.1]],
  [[50.45, 26.25], [50.62, 26.2], [50.6, 25.8], [50.5, 25.85]],
]

const SEAS: Ring[] = [
  // Black Sea, Sea of Azov, Caspian
  [[28, 41.6], [29.1, 41.2], [31, 41.1], [33, 41.9], [35, 42], [36.3, 41.3], [38, 40.9], [39.7, 41], [41.6, 41.6], [41.7, 42.6], [40, 43.4], [38.3, 44.4], [37, 45], [36.6, 45.3], [35.4, 45], [34, 44.4], [33.4, 44.6], [32.5, 45.4], [33.5, 46], [31.5, 46.6], [30.7, 46.5], [29.7, 45.3], [28.7, 44.2], [27.9, 43.2], [27.6, 42.4]],
  [[35, 45.4], [35.5, 46.4], [37.5, 47.1], [39.2, 47.2], [38.2, 46.2], [37.3, 45.5], [36.6, 45.3]],
  [[48, 46], [49.5, 46.8], [51.9, 47.1], [53, 46.8], [53.2, 45.3], [51.3, 44.5], [51.2, 43.6], [52.8, 41.8], [52.9, 40], [53.9, 38.9], [54, 37.4], [51.5, 36.8], [49.5, 37.5], [48.9, 38.4], [49.9, 40.4], [48.6, 41.8], [47.5, 43], [47.5, 44.4], [47, 45.5]],
  // Aral remnant, Lake Van, Lake Urmia
  [[58.3, 46.5], [59.6, 45.9], [59.3, 44.6], [58.4, 45.2]],
  [[42.5, 38.9], [43.4, 38.9], [43.1, 38.4]],
  [[45.2, 38.1], [45.9, 37.9], [45.7, 37.3], [45.2, 37.6]],
]

// Regions painted over the land: vegetation, sand seas, dark volcanic fields,
// plateaus. Blurred so they blend like real albedo, not like a map.
type Patch = { ring: Ring; fill: string; op: number }

const BIOMES: Patch[] = [
  // Temperate Europe and the Russian forest
  { ring: [[-9, 43], [-2, 43.3], [3, 43.2], [8, 44.3], [12, 44], [16, 42], [20, 40.5], [24, 41.3], [28, 42], [31, 46], [40, 47], [48, 51], [60, 54], [75, 55], [90, 54], [110, 52], [130, 50], [140, 55], [150, 62], [120, 70], [90, 72], [60, 67], [40, 66], [28, 70], [18, 68], [10, 63], [5, 60], [8, 57], [6, 53], [-1, 50], [-5, 48]], fill: 'var(--forest)', op: 0.85 },
  { ring: [[-10, 51], [-5, 50], [2, 51], [1, 56], [-5, 58.6], [-10, 55]], fill: 'var(--forest)', op: 0.85 },
  // Northern taiga, darker
  { ring: [[25, 62], [40, 60], [60, 60], [80, 62], [110, 62], [140, 64], [130, 69], [90, 70], [60, 66], [40, 65], [30, 66]], fill: 'var(--taiga)', op: 0.8 },
  // Steppe band
  { ring: [[33, 47], [45, 46], [55, 50], [70, 51], [85, 50], [85, 47], [70, 46], [55, 45], [45, 44], [36, 45.5]], fill: 'var(--steppe)', op: 0.7 },
  // Anatolia and Iberian interior, drier
  { ring: [[28, 38], [33, 37.5], [38, 38.5], [42, 39.5], [38, 40.5], [32, 40], [28, 39.5]], fill: 'var(--steppe)', op: 0.7 },
  { ring: [[-7, 38], [-3, 37.5], [0, 39], [-1, 41.5], [-4, 42.3], [-7, 41.5]], fill: 'var(--steppe)', op: 0.55 },
  // Sahel and tropical Africa
  { ring: [[-17, 15], [-8, 14.5], [5, 14.8], [15, 15], [25, 14], [33, 13.5], [38, 15], [40, 10], [33, 9], [20, 10], [5, 10.5], [-12, 11]], fill: 'var(--sahel)', op: 0.85 },
  { ring: [[-15, 11.5], [-5, 9.5], [8, 9.5], [20, 8], [30, 6], [36, 6], [42, 3], [41, -3], [40, -12], [33, -15], [22, -14], [12, -12], [9, -2], [8, 4], [-5, 5], [-12, 7]], fill: 'var(--jungle)', op: 0.9 },
  // Ethiopian highlands
  { ring: [[36.5, 14.5], [39.5, 14.5], [41, 11], [40, 6.5], [36.5, 6], [35, 9.5]], fill: 'var(--jungle)', op: 0.7 },
  // India
  { ring: [[69, 24], [72.5, 21.5], [73.5, 16], [77, 8.3], [80, 10], [80.3, 15], [85, 19.5], [89, 22], [92.5, 25.5], [95, 27.5], [88, 27.2], [80, 29.8], [75.5, 32], [73.5, 30.5], [71.5, 28], [70.5, 26]], fill: 'var(--india)', op: 0.85 },
  // Levant, Caspian shore and Mesopotamia green strips
  { ring: [[34.6, 31.3], [35.2, 33.5], [36, 35.8], [36.6, 35.6], [35.9, 33.5], [35.3, 31.4]], fill: 'var(--forest)', op: 0.55 },
  { ring: [[48.8, 38.3], [50, 37.3], [53.8, 36.8], [54, 36.4], [50.5, 36.7], [48.7, 37.6]], fill: 'var(--forest)', op: 0.75 },
  { ring: [[43.5, 36.5], [44.6, 33.6], [46.4, 32.2], [48, 30.6], [47.4, 30.3], [45.8, 31.6], [43.8, 33.1], [42.5, 35]], fill: 'var(--sahel)', op: 0.6 },
  // Sand seas: Rub' al Khali, Nafud, the great ergs, the Great Sand Sea
  { ring: [[45, 20.5], [49, 22], [52.5, 22.5], [55.5, 21], [55, 18.5], [51, 17.8], [47, 18], [44.6, 19]], fill: 'var(--erg)', op: 0.9 },
  { ring: [[39.5, 28.8], [42, 29.2], [44, 28.2], [42.5, 27.2], [40, 27.4]], fill: 'var(--erg)', op: 0.8 },
  { ring: [[5.5, 31.5], [9, 31.5], [10, 29.5], [7, 28.6], [5, 29.6]], fill: 'var(--erg)', op: 0.8 },
  { ring: [[-2, 31], [1.5, 31], [1.5, 29.4], [-1, 29.2], [-2.5, 30]], fill: 'var(--erg)', op: 0.75 },
  { ring: [[24.5, 29.5], [26.5, 29.5], [27.2, 26.5], [25.8, 24.5], [24.3, 26]], fill: 'var(--erg)', op: 0.8 },
  { ring: [[11, 26.5], [14, 26.8], [15, 25], [12.5, 24.4], [10.8, 25.2]], fill: 'var(--erg)', op: 0.7 },
  // Dark uplands: Tibesti, Hoggar, the Arabian harrats, Tibet, Iranian ranges
  { ring: [[17, 22], [19.5, 22.2], [19.8, 20.2], [17.8, 19.8]], fill: 'var(--rock)', op: 0.85 },
  { ring: [[4.5, 24.5], [7, 24.5], [7, 22.2], [4.6, 22.4]], fill: 'var(--rock)', op: 0.8 },
  { ring: [[37.3, 27.5], [39.6, 26.5], [41.5, 22.5], [40.4, 21.6], [38.4, 24.6], [36.9, 26.6]], fill: 'var(--rock)', op: 0.75 },
  { ring: [[78, 35.5], [88, 36], [98, 34], [98, 29.5], [92, 28.8], [84, 29.5], [79, 31.5]], fill: 'var(--rock)', op: 0.7 },
  { ring: [[44.5, 38.5], [47, 35], [50, 32], [53.5, 29.5], [57.5, 28], [58, 27], [55, 27.4], [51, 29.3], [48, 31.8], [45.6, 34.8], [43.5, 37.3]], fill: 'var(--rock)', op: 0.55 },
  { ring: [[60, 37], [66, 35], [72, 37], [71, 39], [64, 37.8]], fill: 'var(--rock)', op: 0.6 },
]

// Mountain chains as soft ridges with snow on the highest.
const RIDGES: { line: Ring; snow: boolean }[] = [
  { line: [[6.5, 44.4], [7, 46], [9, 46.4], [11, 46.9], [13, 47.1], [15.5, 47.5]], snow: true },
  { line: [[-1.6, 43.1], [0.5, 42.7], [2.8, 42.5]], snow: true },
  { line: [[-9.2, 30.8], [-6, 31.8], [-3, 33], [1, 34.6], [5, 35.4], [8, 35.9]], snow: false },
  { line: [[37.5, 44.4], [40, 43.6], [42.5, 42.9], [45.5, 42], [47.6, 41.3], [49.3, 40.6]], snow: true },
  { line: [[45.5, 35.5], [47.5, 33.6], [50, 31], [52.6, 29.2], [55.5, 27.8]], snow: false },
  { line: [[48.8, 36.9], [51.5, 36], [54.5, 36.5], [56.5, 37.4]], snow: true },
  { line: [[66, 35.3], [70, 36.2], [73.5, 36.4], [76.5, 34.6], [79.5, 31.5], [83.5, 28.8], [87, 27.9], [91, 27.9], [94.5, 28.6]], snow: true },
  { line: [[36.8, 37.4], [39, 38.3], [41.8, 38.8], [43.5, 38.1]], snow: false },
  { line: [[32.5, 37], [35, 37.4], [36.6, 37.6]], snow: false },
]

// The Nile from Lake Nasser to the delta, the Tigris and Euphrates.
const RIVERS: Ring[] = [
  [[32.9, 22], [32.9, 24.1], [32.7, 25.7], [32.6, 26.2], [31.8, 27], [31.2, 27.7], [30.8, 28.8], [31.2, 30], [30.7, 30.8], [30.4, 31.4]],
  [[31.2, 30], [31.4, 30.6], [31.8, 31.4]],
  [[38.5, 36.6], [40.2, 35.3], [42.5, 34.4], [43.8, 33.4], [45.8, 32], [47.2, 30.9], [48.3, 30.3]],
  [[42.8, 37.2], [43.2, 36.3], [44.3, 34.6], [45.6, 32.7], [47.2, 31.1]],
]

// City lights: (lon, lat, brightness).
const CITIES: [number, number, number][] = [
  [-0.1, 51.5, 1], [2.35, 48.85, 1], [4.4, 50.9, 0.7], [4.8, 52.2, 0.8], [7, 51.4, 0.9], [13.4, 52.5, 0.7], [10, 53.55, 0.6], [11.6, 48.1, 0.6],
  [8.7, 50.1, 0.6], [9.2, 45.5, 0.85], [7.7, 45.1, 0.5], [12.5, 41.9, 0.7], [14.25, 40.85, 0.6], [-3.7, 40.4, 0.8], [2.2, 41.4, 0.7], [-9.1, 38.7, 0.5],
  [-0.4, 39.5, 0.4], [5.4, 43.3, 0.5], [4.8, 45.8, 0.5], [16.4, 48.2, 0.5], [19, 47.5, 0.5], [21, 52.2, 0.5], [14.4, 50.1, 0.45], [26.1, 44.4, 0.45],
  [23.7, 38, 0.6], [29, 41, 1.1], [32.85, 39.9, 0.6], [27.1, 38.4, 0.5], [37.6, 55.75, 1.1], [30.3, 59.95, 0.6], [30.5, 50.45, 0.6], [27.55, 53.9, 0.4],
  [36.2, 50, 0.4], [18.1, 59.3, 0.35], [12.6, 55.7, 0.35], [10.75, 59.9, 0.3], [24.9, 60.2, 0.3], [23.3, 42.7, 0.35], [20.5, 44.8, 0.4], [16, 45.8, 0.3],
  [-2.2, 53.5, 0.6], [-1.9, 52.5, 0.5], [-4.25, 55.86, 0.35], [-6.26, 53.35, 0.35], [-8.6, 41.15, 0.35], [-6, 37.4, 0.35], [39, 45, 0.35], [39.7, 47.2, 0.4],
  [44.5, 48.7, 0.35], [50.1, 53.2, 0.35], [49.1, 55.8, 0.35], [44, 56.3, 0.35], [60.6, 56.8, 0.4], [61.4, 55.15, 0.35], [55.95, 54.7, 0.3], [35, 48.5, 0.35],
  [37.8, 48, 0.4], [33.4, 44.6, 0.25], [30.7, 46.5, 0.35], [28.8, 47, 0.25], [24, 49.8, 0.35], [19.9, 50.1, 0.35], [17, 51.1, 0.3], [18.6, 54.4, 0.3],
  [31.24, 30.05, 1.2], [29.9, 31.2, 0.6], [34.8, 32.1, 0.7], [35.9, 31.95, 0.45], [35.5, 33.9, 0.4], [36.3, 33.5, 0.45], [37.15, 36.2, 0.35], [44.4, 33.3, 0.6],
  [47.8, 30.5, 0.4], [47.98, 29.37, 0.65], [46.7, 24.7, 0.75], [39.2, 21.5, 0.6], [39.83, 21.42, 0.45], [39.6, 24.47, 0.35], [50.1, 26.4, 0.55], [50.58, 26.22, 0.45],
  [51.53, 25.29, 0.7], [54.37, 24.47, 0.55], [55.3, 25.2, 0.85], [55.4, 25.35, 0.45], [58.4, 23.6, 0.4], [44.2, 15.35, 0.3], [45, 12.8, 0.25], [51.4, 35.7, 0.95],
  [51.7, 32.65, 0.45], [59.6, 36.3, 0.45], [52.5, 29.6, 0.35], [46.3, 38.1, 0.35], [48.7, 31.3, 0.3], [49.85, 40.4, 0.45], [44.8, 41.7, 0.35], [44.5, 40.2, 0.3],
  [67, 24.86, 0.85], [74.35, 31.55, 0.75], [73.05, 33.7, 0.45], [77.2, 28.6, 1.1], [72.88, 19.07, 0.95], [72.6, 23, 0.5], [75.8, 26.9, 0.4], [69.2, 34.55, 0.3],
  [69.25, 41.3, 0.45], [76.9, 43.25, 0.35], [32.55, 15.6, 0.4], [38.75, 9, 0.3], [13.2, 32.9, 0.4], [10.2, 36.8, 0.45], [3.05, 36.75, 0.5], [-7.6, 33.6, 0.5],
  [-6.84, 34, 0.35], [20.07, 32.1, 0.3], [-5, 34, 0.3], [-1.9, 34.7, 0.25], [6.6, 36.4, 0.3], [32.9, 24.1, 0.25], [32.7, 25.7, 0.3], [31.2, 27.2, 0.3],
  [30.8, 28.8, 0.3], [56.3, 27.2, 0.3], [53, 34.6, 0.3], [48.5, 34.8, 0.3], [47.1, 34.3, 0.35], [43.1, 36.35, 0.4], [44, 36.2, 0.3], [41.0, 39.9, 0.25],
  [76.7, 30.7, 0.35], [80.9, 26.85, 0.5], [75.85, 22.7, 0.4], [79.1, 21.15, 0.4], [85.1, 25.6, 0.4], [83, 25.3, 0.35], [78, 27.2, 0.4], [73.8, 18.5, 0.6],
]

// The Nile and the Gulf coast as chains of small lights.
const LIGHT_LINES: Ring[] = [
  [[32.9, 24.1], [32.7, 25.7], [32.3, 26.2], [31.7, 27.2], [31.1, 28.2], [30.9, 29.2], [31.2, 30]],
  [[30.1, 31.3], [30.9, 30.6], [31.5, 31.1], [32.2, 31.2], [31.4, 30.4]],
  [[47.9, 29.3], [49.6, 27], [50.2, 26.2], [51.5, 25.3], [53.5, 24.2], [55.2, 25.1], [56.2, 25.5]],
  [[34.8, 32], [35.4, 33.6], [35.8, 34.9], [36.2, 36.4]],
  [[29, 41], [27, 38.4], [28.3, 37], [30.7, 36.9], [32.6, 36.6], [35.3, 36.9]],
  [[44.4, 33.3], [45.9, 32.3], [47, 31.2], [47.8, 30.5]],
  [[3, 36.8], [5, 36.7], [7.7, 36.9], [10.2, 36.8], [10.8, 35.7]],
]

// ---- Building the surface ---------------------------------------------------------

const ring = (r: Ring, close = true) => projectRing(r, G, close)
const LAND = [AFRICA, EURASIA, ...ISLANDS].map(r => ring(r)).join('')
const SEA = SEAS.map(r => ring(r)).join('')

function ridges(): string {
  return RIDGES.map(({ line, snow }) => {
    const d = ring(line, false)

    return (
      `<path d="${d}" fill="none" stroke="var(--ridge)" stroke-width="7" stroke-opacity=".35" stroke-linecap="round" stroke-linejoin="round"/>` +
      (snow ? `<path d="${d}" fill="none" stroke="var(--snow)" stroke-width="2.5" stroke-opacity=".6" stroke-linecap="round" stroke-linejoin="round"/>` : '')
    )
  }).join('')
}

function cityLights(): string {
  const rand = seeded(4040)
  const core: string[] = []
  const small: string[] = []
  let halos = ''
  const put = (lon: number, lat: number, w: number) => {
    const [x, y, z] = G.at(lon, lat)
    if (z < 0.02 || y > 1010 || x < 600) return
    const f = Math.max(0.3, z)
    if (w > 0.2) halos += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${Math.round(8 * w + 3)}"/>`
    core.push(`M${Math.round(x)} ${Math.round(y)}h0`)
    const k = Math.round(1 + w * 5)
    for (let i = 0; i < k; i++) {
      const a = rand() * Math.PI * 2
      const d = Math.pow(rand(), 1.6) * (5 + w * 12)
      small.push(`M${Math.round(x + Math.cos(a) * d)} ${Math.round(y + Math.sin(a) * d * f)}h0`)
    }
  }
  for (const [lon, lat, w] of CITIES) put(lon, lat, w)
  for (const line of LIGHT_LINES) {
    for (let i = 0; i < line.length - 1; i++) {
      const [a0, b0] = line[i] as [number, number]
      const [a1, b1] = line[i + 1] as [number, number]
      for (let t = 0; t < 1; t += 0.14) {
        const [x, y, z] = G.at(a0 + (a1 - a0) * t + (rand() - 0.5) * 0.35, b0 + (b1 - b0) * t + (rand() - 0.5) * 0.35)
        if (z > 0.02 && x > 600) small.push(`M${Math.round(x)} ${Math.round(y)}h0`)
      }
    }
  }
  // Scattered towns over the most lit regions.
  const fields: [number, number, number, number, number][] = [
    [-5, 43, 20, 55, 90],
    [20, 44, 42, 58, 80],
    [26, 36, 45, 42, 50],
    [44, 29, 58, 38, 45],
    [36, 31, 46, 37, 30],
    [70, 18, 88, 31, 80],
    [40, 52, 62, 58, 40],
  ]
  for (const [lo0, la0, lo1, la1, count] of fields) {
    for (let i = 0; i < count; i++) {
      const [x, y, z] = G.at(lo0 + rand() * (lo1 - lo0), la0 + rand() * (la1 - la0))
      if (z > 0.02 && x > 600) small.push(`M${Math.round(x)} ${Math.round(y)}h0`)
    }
  }

  return (
    `<g class="ea-lights" fill="url(#ea-city)">${halos}</g>` +
    `<defs><path id="ea-towns" d="${small.join('')}"/></defs>` +
    `<g style="filter:blur(1.5px)"><use href="#ea-towns" stroke="var(--city)" stroke-width="4" stroke-linecap="round" stroke-opacity=".35"/></g>` +
    `<use class="si-tw2" href="#ea-towns" stroke="var(--city)" stroke-width="1.7" stroke-linecap="round" stroke-opacity=".85"/>` +
    `<path d="${core.join('')}" stroke="var(--city-core)" stroke-width="2.4" stroke-linecap="round"/>`
  )
}

// Cloud systems that ride the turning globe. A few cluster shapes are drawn
// once at unit scale; each system places one, squashed by the view.
type Kind = 'front' | 'cells' | 'streak' | 'swirl'
type Cloud = { lon: number; lat: number; kind: Kind; size: number; v: 0 | 1; rot?: number }

function clusterShape(kind: Kind, seed: number): string {
  const rand = seeded(seed)
  let out = ''
  const puff = (x: number, y: number, rx: number, ry: number, op: number, rot = 0) => {
    const r = Math.round
    out += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(ry)}" fill-opacity="${op.toFixed(1).replace('0.', '.')}"${rot ? ` transform="rotate(${r(rot)} ${r(x)} ${r(y)})"` : ''}/>`
  }
  if (kind === 'front') {
    // A long curved band trailing from a comma head.
    for (let i = 0; i < 28; i++) {
      const t = i / 27
      const x = -110 + t * 240
      const y = -Math.sin(t * Math.PI * 1.05) * 30 + t * 50
      puff(x + (rand() - 0.5) * 16, y + (rand() - 0.5) * 12, 9 + rand() * 14 * (1 - t * 0.5), 6 + rand() * 7, 0.4 + rand() * 0.45, -20 + t * 40)
    }
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 1.7 + 0.3
      const r = 10 + i * 2.3
      puff(-112 + Math.cos(a) * r, -6 + Math.sin(a) * r * 0.8, 10 + rand() * 6, 7 + rand() * 4, 0.5 + rand() * 0.35, (a * 180) / Math.PI)
    }
  } else if (kind === 'cells') {
    // Scattered convective towers in loose clusters.
    for (let c = 0; c < 4; c++) {
      const cx = (rand() - 0.5) * 180
      const cy = (rand() - 0.5) * 60
      for (let i = 0; i < 6; i++) puff(cx + (rand() - 0.5) * 34, cy + (rand() - 0.5) * 20, 8 + rand() * 12, 6 + rand() * 9, 0.35 + rand() * 0.45)
    }
  } else if (kind === 'streak') {
    for (let i = 0; i < 11; i++) puff((rand() - 0.5) * 220, (rand() - 0.5) * 40, 25 + rand() * 45, 2.5 + rand() * 4, 0.3 + rand() * 0.35, (rand() - 0.5) * 8)
  } else {
    // A spiral low: arms of cloud winding into a clear eye.
    for (let i = 0; i < 32; i++) {
      const t = i / 31
      const a = t * Math.PI * 3.4
      const r = 8 + t * 80
      puff(Math.cos(a) * r, Math.sin(a) * r * 0.8, 7 + (1 - t) * 8 + rand() * 5, 4 + rand() * 4, 0.35 + (1 - t) * 0.5, (a * 180) / Math.PI + 90)
    }
  }

  return out
}

const KINDS: Kind[] = ['front', 'cells', 'streak', 'swirl']
const CLOUD_DEFS = KINDS.map((k, i) => [0, 1].map(v => `<g id="ea-${k}${v}">${clusterShape(k, 100 + i * 10 + v)}</g>`).join('')).join('')

function cloud(c: Cloud): string {
  const [, my] = meridian(c.lat, TURN)
  const sq = squash(c.lat, TURN)
  const k = c.size / 100

  return turning(`<use href="#ea-${c.kind}${c.v}" transform="translate(${CX} ${n(CY + my)}) scale(${n(k)} ${n(k * sq)}) rotate(${c.rot ?? 0})"/>`, c.lon - G.lon0, c.lat, TURN)
}

const CLOUDS: Cloud[] = [
  { lon: 5, lat: 52, kind: 'front', size: 170, v: 0, rot: -10 },
  { lon: 28, lat: 60, kind: 'swirl', size: 144, v: 0 },
  { lon: 45, lat: 50, kind: 'streak', size: 153, v: 0 },
  { lon: 66, lat: 57, kind: 'front', size: 153, v: 1 },
  { lon: 18, lat: 45, kind: 'cells', size: 102, v: 0 },
  { lon: -18, lat: 46, kind: 'swirl', size: 170, v: 1 },
  { lon: 85, lat: 48, kind: 'streak', size: 153, v: 1 },
  { lon: 105, lat: 56, kind: 'front', size: 170, v: 0, rot: 12 },
  { lon: 36, lat: 41, kind: 'streak', size: 102, v: 1 },
  { lon: -2, lat: 8, kind: 'cells', size: 136, v: 0 },
  { lon: 22, lat: 6, kind: 'cells', size: 153, v: 1 },
  { lon: 42, lat: 9, kind: 'cells', size: 119, v: 0 },
  { lon: 62, lat: 4, kind: 'cells', size: 153, v: 1 },
  { lon: 84, lat: 13, kind: 'cells', size: 136, v: 0 },
  { lon: 125, lat: 40, kind: 'swirl', size: 153, v: 0 },
  { lon: 150, lat: 50, kind: 'front', size: 170, v: 1 },
  { lon: -45, lat: 55, kind: 'front', size: 170, v: 0, rot: 8 },
  { lon: -60, lat: 28, kind: 'cells', size: 136, v: 1 },
  { lon: 74, lat: 31, kind: 'streak', size: 119, v: 0 },
  { lon: 52, lat: 64, kind: 'streak', size: 170, v: 1 },
  { lon: 165, lat: 25, kind: 'cells', size: 136, v: 0 },
  { lon: -85, lat: 45, kind: 'swirl', size: 153, v: 1 },
  { lon: 12, lat: 38, kind: 'cells', size: 110, v: 1 },
  { lon: 58, lat: 44, kind: 'cells', size: 120, v: 0 },
  { lon: 95, lat: 35, kind: 'streak', size: 150, v: 0 },
  { lon: 30, lat: 70, kind: 'front', size: 170, v: 1 },
  { lon: 78, lat: 66, kind: 'swirl', size: 140, v: 0 },
  { lon: 50, lat: 20, kind: 'cells', size: 70, v: 1 },
]

// The aurora: a curtain along the auroral oval, rising off the northern limb.
// A soft ribbon of light whose top edge folds slowly (two shapes, SMIL), fine
// rays over it shimmering, and a blurred glow underneath.
function aurora(seed: number): string {
  const rand = seeded(seed)
  const base: [number, number, number, number][] = []
  for (let i = 0; i <= 60; i++) {
    const lon = -6 + (i / 60) * 92
    const lat = 65.5 + Math.sin(i * 0.13) * 2 + Math.sin(i * 0.41) * 0.8
    const [x, y, z] = G.at(lon, lat)
    const dx = x - CX
    const dy = y - CY
    const d = Math.hypot(dx, dy)
    const ux = dx / d
    const uy = dy / d
    // Curtains behind the limb still show above it, lifted by their height.
    const lift = z < 0 ? -z * R * 0.55 : 0
    base.push([x + ux * lift, y + uy * lift, ux, uy])
  }
  const env = (i: number) => Math.min(1, i / 8, (60 - i) / 12)
  const top = (k: number) =>
    base.map(([x, y, ux, uy], i) => {
      const h = (38 + Math.sin(i * 0.35 + k * 2.1) * 16 + Math.sin(i * 0.9 + k) * 8) * env(i) + 4
      return `${n(x + ux * h)} ${n(y + uy * h)}`
    })
  const bottom = base.map(([x, y]) => `${n(x)} ${n(y)}`).reverse()
  const ribbon = (k: number) => `M${top(k).join('L')}L${bottom.join('L')}Z`
  const r0 = ribbon(0)
  const r1 = ribbon(1)
  const morph = `<animate attributeName="d" values="${r0};${r1};${r0}" dur="27s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`
  const rays: string[] = ['', '']
  base.forEach(([x, y, ux, uy], i) => {
    const h = (26 + rand() * 46) * env(i) + 3
    rays[i % 2] += `M${n(x)} ${n(y)}l${n(ux * h)} ${n(uy * h)}`
  })

  return (
    `<defs><path id="ea-curtain" d="${r0}">${morph}</path></defs>` +
    `<g class="ea-aur" fill="url(#ea-aur)"><g style="filter:blur(9px)"><use href="#ea-curtain" fill-opacity=".6"/></g><use href="#ea-curtain" fill-opacity=".3"/></g>` +
    `<g class="ea-aur b blur-0" fill="none" stroke="url(#ea-aur)">` +
    rays.map((d, i) => `<path class="ea-ray${i}" d="${d}" stroke-width="${[1.4, 2][i]}" stroke-opacity="${[0.7, 0.45][i]}"/>`).join('') +
    `</g>`
  )
}

// The Moon, lit from the same sun as the Earth below.
const MX = 250
const MY = 170
const MR = 38

function moon(): string {
  const maria: [number, number, number, number][] = [
    [-0.32, -0.42, 0.28, 0.24], [0.18, -0.38, 0.17, 0.16], [0.35, -0.08, 0.2, 0.17], [0.68, -0.28, 0.11, 0.1], [0.6, 0.15, 0.13, 0.15],
    [0.36, 0.32, 0.1, 0.09], [-0.62, 0.0, 0.26, 0.4], [-0.2, 0.42, 0.17, 0.13], [-0.52, 0.42, 0.1, 0.09], [0.0, -0.72, 0.4, 0.07],
  ]
  const d = maria.map(([x, y, rx, ry], i) => blob(MX + x * MR, MY + y * MR, rx * MR, ry * MR, 300 + i, 0.18, 9)).join('')

  return (
    `<g>` +
    `<circle cx="${MX}" cy="${MY}" r="${MR + 14}" fill="url(#ea-mglow)"/>` +
    `<circle cx="${MX}" cy="${MY}" r="${MR}" fill="var(--moon)"/>` +
    `<g class="blur-0"><path d="${d}" fill="var(--maria)" fill-opacity=".5"/></g>` +
    `<circle cx="${n(MX - 0.12 * MR)}" cy="${n(MY + 0.72 * MR)}" r="2" fill="#fff" fill-opacity=".8"/>` +
    `<circle cx="${n(MX - 0.3 * MR)}" cy="${n(MY - 0.12 * MR)}" r="1.4" fill="#fff" fill-opacity=".6"/>` +
    `<circle cx="${MX}" cy="${MY}" r="${MR}" fill="url(#ea-mlimb)"/>` +
    `<g opacity="var(--day)"><path d="${litPath(MX, MY, MR, L_DAY, true, 14)}" fill="var(--moon-night)" fill-opacity="var(--moon-night-op)" class="blur-0"/></g>` +
    `<g opacity="var(--night)"><path d="${litPath(MX, MY, MR, L_NIGHT, true, 14)}" fill="var(--moon-night)" fill-opacity="var(--moon-night-op)" class="blur-0"/></g>` +
    `</g>`
  )
}

// A generic station: a pressurised module stack across a long truss, eight
// solar wings and white radiators, with blinking navigation lights.
function station(): string {
  const wing = (x: number, y: number, flip: number) =>
    `<g transform="translate(${x} ${y}) scale(1 ${flip})">` +
    `<rect x="-7" y="4" width="14" height="44" fill="url(#ea-panel)"/>` +
    `<path d="M-7 15h14M-7 26h14M-7 37h14M0 4v44" stroke="var(--panel-line)" stroke-width=".6"/>` +
    `<rect x="-1" y="0" width="2" height="5" fill="#b9c2cc"/></g>`
  const wings = [-52, -36, 36, 52].map(x => wing(x, 2, 1) + wing(x, -2, -1)).join('')

  return (
    `<g class="ea-st" transform="rotate(-14) skewX(-22) scale(.62 .5)">` +
    wings +
    `<rect x="-60" y="-2.5" width="120" height="5" fill="#c9d1da"/><path d="M-60 -2.5h120M-60 2.5h120" stroke="#7d8896" stroke-width=".7"/>` +
    `<path d="M-56 -2.5l4 5M-48 -2.5l4 5M-40 -2.5l4 5M-32 -2.5l4 5M32 -2.5l4 5M40 -2.5l4 5M48 -2.5l4 5M56 -2.5l4 5" stroke="#8a95a3" stroke-width=".6"/>` +
    `<g><rect x="-8" y="-24" width="16" height="48" rx="6" fill="#e9edf2"/><rect x="-8" y="-24" width="16" height="48" rx="6" fill="url(#k-side)"/>` +
    `<rect x="-20" y="8" width="40" height="11" rx="5" fill="#e3e8ee"/><rect x="-20" y="8" width="40" height="11" rx="5" fill="url(#k-lo)"/>` +
    `<rect x="-5" y="-34" width="10" height="11" rx="4" fill="#dfe5ec"/><circle cx="0" cy="-36" r="3.5" fill="#cfd6de"/></g>` +
    `<path d="M-24 -8h-10v-14h10zM24 -8h10v-14h-10z" fill="#f4f6f8" stroke="#aab4c0" stroke-width=".5"/>` +
    `<g class="ea-st-shade"><rect x="-60" y="-36" width="120" height="86" fill="var(--st-shade)"/></g>` +
    `<circle class="ea-nav" cx="-60" cy="0" r="1.8" fill="#ff4a4a"/><circle class="ea-nav b" cx="60" cy="0" r="1.8" fill="#4aff8a"/><circle class="ea-nav c" cx="0" cy="-38" r="1.6" fill="#ffffff"/>` +
    `</g>`
  )
}

// Sunrise: layered bands along the limb at the sub-solar direction, and the
// sun itself about to clear the limb.
const SUN_A = Math.atan2(L_NIGHT[1], L_NIGHT[0])
const SX = CX + Math.cos(SUN_A) * R
const SY = CY + Math.sin(SUN_A) * R

function arc(r: number, spread: number): string {
  const a0 = SUN_A - spread
  const a1 = SUN_A + spread

  return `M${n(CX + Math.cos(a0) * r)} ${n(CY + Math.sin(a0) * r)}A${r} ${r} 0 0 1 ${n(CX + Math.cos(a1) * r)} ${n(CY + Math.sin(a1) * r)}`
}

function sunrise(): string {
  const bands: [number, number, string, number][] = [
    [R + 1, 4, '#ff3a1a', 0.9],
    [R + 5, 4, '#ff8a2a', 0.85],
    [R + 9, 4, '#ffd27a', 0.7],
    [R + 15, 8, '#bfe6ff', 0.55],
    [R + 30, 18, '#3a7aff', 0.35],
  ]

  return (
    `<g class="ea-sunrise">` +
    `<g style="filter:blur(2.5px)" mask="url(#ea-sunmask)">${bands.map(([r, w, c, o]) => `<path d="${arc(r, 0.42)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}"/>`).join('')}</g>` +
    `<circle cx="${n(SX)}" cy="${n(SY - 6)}" r="220" fill="url(#ea-sun)"/>` +
    `<ellipse cx="${n(SX)}" cy="${n(SY - 4)}" rx="260" ry="5" fill="url(#ea-streak)" transform="rotate(${n((SUN_A * 180) / Math.PI + 90)} ${n(SX)} ${n(SY - 4)})"/>` +
    `</g>`
  )
}

// Terrain mottling over the land: soft light and dark patches at a few
// scales, so the deserts and plains read as ground, not flat paint.
function terrain(): string {
  const rand = seeded(5150)
  const T = 240
  let body = ''
  for (let i = 0; i < 18; i++) {
    const x = Math.round(30 + rand() * (T - 60))
    const y = Math.round(30 + rand() * (T - 60))
    const r = Math.round(14 + rand() * 30)
    body += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${Math.round(r * (0.5 + rand() * 0.4))}" fill="url(#ea-${rand() < 0.5 ? 'tdk' : 'tlt'})"/>`
  }

  return (
    `<radialGradient id="ea-tdk"><stop offset="0" stop-color="#3a2410" stop-opacity=".2"/><stop offset="1" stop-color="#3a2410" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ea-tlt"><stop offset="0" stop-color="#fff6e0" stop-opacity=".22"/><stop offset="1" stop-color="#fff6e0" stop-opacity="0"/></radialGradient>` +
    `<pattern id="ea-terrain" width="${T}" height="${T}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24) scale(1 .7)">${body}</pattern>`
  )
}

// ---- Scene -----------------------------------------------------------------------

const [GX, GY] = (() => {
  const h = unit([L_DAY[0], L_DAY[1], L_DAY[2] + 1])

  return [CX + h[0] * R, CY + h[1] * R]
})()

const CSS = `
:root, svg {
  --bg0:#36558c; --bg1:#6688c0; --bg2:#9dbbe0; --bg3:#dcebf8;
  --stars:.55; --day:1; --night:0;
  --ocean0:#08305e; --ocean1:#124f8c; --ocean2:#2a78b8;
  --land:#cfac78; --forest:#4f6a36; --taiga:#36502f; --steppe:#a39466; --sahel:#9a8a56; --jungle:#2f5428; --india:#76784a;
  --erg:#e6c08a; --rock:#8a6a52; --ridge:#6a5442; --snow:#f4f8fc; --river:#3d5e2a; --sea:#123f74; --shelf:#4ab8c8;
  --cloud:#ffffff; --cloud-op:.95;
  --haze:#cfe8ff; --haze-op:.7; --halo:#cfe9ff; --halo-op:.95;
  --glint:#fffdf0; --glint-op:.9;
  --city:#ffc56a; --city-core:#fff1c8; --lights:0;
  --moon:#dcd8cf; --maria:#8a8781; --moon-night:#2a3550; --moon-night-op:.95; --mglow:#ffffff;
  --panel:#24456e; --panel-hi:#6f9fd6; --panel-line:#c7a35a; --st-shade:#000; --st-shade-op:0;
}
@media (prefers-color-scheme: dark) {
  :root, svg {
    --bg0:#010208; --bg1:#03060f; --bg2:#06102a; --bg3:#0b1d44;
    --stars:1; --day:0; --night:1;
    --ocean0:#061a36; --ocean1:#0b2b55; --ocean2:#164a84;
    --land:#8a6a44; --forest:#304a24; --taiga:#22381f; --steppe:#6a6040; --sahel:#6a5a36; --jungle:#203f1a; --india:#4c5228;
    --erg:#9a7a4c; --rock:#5a4434; --ridge:#3a2c22; --snow:#c8d4e4; --river:#2a4a1e; --sea:#0b2b55; --shelf:#1a6a80;
    --cloud:#c8d4ea; --cloud-op:.55;
    --haze:#4a8aff; --haze-op:.4; --rim:#4f9aff; --halo:#2a6aff; --halo-op:.55;
    --glint:#fffbe8; --glint-op:0;
    --city:#ffb04a; --city-core:#fff0c0; --lights:1;
    --moon:#cfcac0; --maria:#5f5c58; --moon-night:#0a0f1c; --moon-night-op:.8; --mglow:#9fb8ff;
    --panel:#142a4a; --panel-hi:#3a5a8a; --panel-line:#8a7440; --st-shade:#02040a; --st-shade-op:.55;
  }
}
.ea-st-shade { opacity: var(--st-shade-op); }
.ea-nav { animation: ea-nav 2.4s steps(1) infinite; }
.ea-nav.b { animation-delay: -1.2s; } .ea-nav.c { animation-duration: 3.1s; }
@keyframes ea-nav { 0%, 70% { opacity: 0; } 72%, 82% { opacity: 1; } 84% { opacity: 0; } }
.ea-aur { transform-box: view-box; transform-origin: ${CX}px ${CY}px; animation: ea-aur 31s ease-in-out infinite alternate; }
.ea-aur.b { animation-duration: 23s; animation-delay: -7s; }
@keyframes ea-aur { from { transform: rotate(-.7deg) scale(.995); opacity: .75; } to { transform: rotate(.7deg) scale(1.006); opacity: 1; } }
.ea-ray0 { animation: ea-ray 4.7s ease-in-out infinite alternate; }
.ea-ray1 { animation: ea-ray 6.3s ease-in-out infinite alternate -2s; }
.ea-ray2 { animation: ea-ray 3.9s ease-in-out infinite alternate -1s; }
@keyframes ea-ray { from { opacity: 1; } to { opacity: .35; } }
.ea-glint { animation: ea-glint 9s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes ea-glint { from { opacity: .8; transform: scale(.96); } to { opacity: 1; transform: scale(1.05); } }
.ea-lights { animation: pulse 13s ease-in-out infinite; }
.ea-sunrise { animation: si-glow 17s ease-in-out infinite alternate; }
${SPACE_CSS}
`

const shade = (L: Vec3, id: string) =>
  `<rect x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" fill="url(#${id})"/>` +
  `<g style="filter:blur(14px)"><path d="${litPath(CX, CY, R, L, true)}" fill="var(--night-fill, #01030a)" fill-opacity=".92"/></g>`

const BODY = `
<rect width="1600" height="1000" fill="url(#ea-bg)"/>
${starfield(4401, { far: 420, mid: 170, near: 60, bright: 8, keep: (x, y) => Math.hypot(x - CX, y - CY) > R + 60 && Math.hypot(x - MX, y - MY) > MR + 10 })}
<g opacity="var(--day)"><circle cx="-80" cy="-120" r="700" fill="url(#ea-sunglare)"/></g>
${moon()}
<g><g>${station()}<animateMotion dur="190s" begin="-70s" repeatCount="indefinite" path="M1720 120 Q800 210 -140 360"/></g></g>
<circle cx="${CX}" cy="${CY}" r="${R + 90}" fill="url(#ea-halo)"/>
<g clip-path="url(#ea-disc)">
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ea-ocean)"/>
  <g style="filter:blur(6px)"><path d="${ring([[47.5, 30.6], [50.5, 30.4], [56.6, 27.3], [56.8, 24.6], [52, 23.4], [49.8, 24], [48, 27.2]])}${ring([[32.2, 30], [35, 28.2], [43.6, 12.4], [42, 12.6], [36.5, 20], [32.4, 29]])}" fill="var(--shelf)" fill-opacity=".55"/></g>
  <g style="filter:blur(4px)"><use href="#ea-land" fill="none" stroke="var(--shelf)" stroke-width="9" stroke-opacity=".4"/></g>
  <use href="#ea-land" fill="var(--land)"/>
  <g mask="url(#ea-landmask)"><g style="filter:blur(7px)">${BIOMES.map(b => `<path d="${ring(b.ring)}" fill="${b.fill}" fill-opacity="${b.op}"/>`).join('')}</g>
  <g style="filter:blur(2.5px)">${ridges()}</g>
  <g style="filter:blur(1.5px)"><path d="${RIVERS.map(r => ring(r, false)).join('')}" fill="none" stroke="var(--river)" stroke-width="2.4" stroke-opacity=".45" stroke-linecap="round"/></g>
  <rect x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" fill="url(#ea-terrain)"/>
  </g>
  <use href="#ea-sea" fill="url(#ea-ocean)"/>
  <g opacity="var(--day)"><g mask="url(#ea-seamask)"><g class="ea-glint"><ellipse cx="${n(GX)}" cy="${n(GY)}" rx="260" ry="200" fill="url(#ea-glint)"/></g></g></g>
  <g fill="url(#ea-puff)" opacity="var(--cloud-op)">${CLOUDS.map(cloud).join('')}</g>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ea-haze)"/>
  <g opacity="var(--day)">${shade(L_DAY, 'ea-lam-d')}</g>
  <g opacity="var(--night)">${shade(L_NIGHT, 'ea-lam-n')}</g>
  <g opacity="var(--lights)" mask="url(#ea-nightmask)">${cityLights()}</g>
  <g opacity="var(--night)"><path d="${litPath(CX, CY, R, L_NIGHT)}" fill="url(#ea-dawn)" class="blur-2"/></g>
</g>
<g opacity="var(--day)"><circle cx="${CX}" cy="${CY}" r="${R + 2}" fill="none" stroke="url(#ea-rim-d)" stroke-width="5" class="blur-1"/></g>
<g opacity="var(--night)"><circle cx="${CX}" cy="${CY}" r="${R + 2}" fill="none" stroke="url(#ea-rim-n)" stroke-width="4" class="blur-1"/>
<circle cx="${CX}" cy="${CY}" r="${R + 11}" fill="none" stroke="#9dff7a" stroke-opacity=".22" stroke-width="2" class="blur-0"/>
${aurora(4402)}${sunrise()}</g>
${grade([200, 60], '#fff3d8', '#06205a', 0.55)}
`

const DEFS = `
${SPACE_DEFS}
<linearGradient id="ea-bg" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="var(--bg0)"/><stop offset=".45" stop-color="var(--bg1)"/><stop offset=".8" stop-color="var(--bg2)"/><stop offset="1" stop-color="var(--bg3)"/></linearGradient>
<radialGradient id="ea-sunglare"><stop offset="0" stop-color="#fffdf2" stop-opacity=".95"/><stop offset=".35" stop-color="#fff6dc" stop-opacity=".45"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
<clipPath id="ea-disc"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
<radialGradient id="ea-ocean" gradientUnits="userSpaceOnUse" cx="${n(GX)}" cy="${n(GY)}" r="${R * 1.4}"><stop offset="0" stop-color="var(--ocean2)"/><stop offset=".45" stop-color="var(--ocean1)"/><stop offset="1" stop-color="var(--ocean0)"/></radialGradient>
<path id="ea-land" d="${LAND}"/><path id="ea-sea" d="${SEA}"/>
<mask id="ea-landmask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><use href="#ea-land" fill="#fff"/><use href="#ea-sea" fill="#000"/></mask>
<mask id="ea-seamask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><rect width="1600" height="1000" fill="#fff"/><use href="#ea-land" fill="#000"/><use href="#ea-sea" fill="#fff"/></mask>
<radialGradient id="ea-puff"><stop offset="0" stop-color="var(--cloud)"/><stop offset=".5" stop-color="var(--cloud)" stop-opacity=".6"/><stop offset="1" stop-color="var(--cloud)" stop-opacity="0"/></radialGradient>
${CLOUD_DEFS}
<mask id="ea-nightmask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><path d="${litPath(CX, CY, R, L_NIGHT, true)}" fill="#fff"/></mask>
${terrain()}
<radialGradient id="ea-glint"><stop offset="0" stop-color="var(--glint)" stop-opacity="var(--glint-op)"/><stop offset=".12" stop-color="var(--glint)" style="stop-opacity:calc(var(--glint-op) * .6)"/><stop offset=".45" stop-color="var(--glint)" style="stop-opacity:calc(var(--glint-op) * .18)"/><stop offset="1" stop-color="var(--glint)" stop-opacity="0"/></radialGradient>
<radialGradient id="ea-haze" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${R}"><stop offset=".8" stop-color="var(--haze)" stop-opacity="0"/><stop offset=".95" stop-color="var(--haze)" style="stop-opacity:calc(var(--haze-op) * .5)"/><stop offset="1" stop-color="var(--haze)" stop-opacity="var(--haze-op)"/></radialGradient>
<radialGradient id="ea-halo" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${R + 90}"><stop offset="${n(R / (R + 90) - 0.005)}" stop-color="var(--halo)" stop-opacity="var(--halo-op)"/><stop offset="${n((R + 20) / (R + 90))}" stop-color="var(--halo)" style="stop-opacity:calc(var(--halo-op) * .35)"/><stop offset="1" stop-color="var(--halo)" stop-opacity="0"/></radialGradient>
${lambertGradient('ea-lam-d', CX, CY, R, L_DAY, '#000814', 0.7)}
${lambertGradient('ea-lam-n', CX, CY, R, L_NIGHT, '#000814', 0.9)}
${rimGradient('ea-rim-d', CX, CY, R, L_DAY, '#bfe6ff', 0.25)}
${rimGradient('ea-rim-n', CX, CY, R, L_NIGHT, '#5aa8ff', 0.15)}
<radialGradient id="ea-dawn" gradientUnits="userSpaceOnUse" cx="${n(SX)}" cy="${n(SY)}" r="420"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".9"/><stop offset=".5" stop-color="#ff7a3a" stop-opacity=".45"/><stop offset="1" stop-color="#7a2a4a" stop-opacity=".15"/></radialGradient>
<radialGradient id="ea-city"><stop offset="0" stop-color="var(--city)" stop-opacity=".9"/><stop offset=".35" stop-color="var(--city)" stop-opacity=".35"/><stop offset="1" stop-color="var(--city)" stop-opacity="0"/></radialGradient>
<radialGradient id="ea-aur" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${R + 110}"><stop offset="${n((R - 40) / (R + 110))}" stop-color="#5affa0" stop-opacity=".9"/><stop offset="${n((R + 30) / (R + 110))}" stop-color="#2ad890" stop-opacity=".75"/><stop offset="${n((R + 70) / (R + 110))}" stop-color="#b04aff" stop-opacity=".45"/><stop offset="1" stop-color="#ff3a6a" stop-opacity="0"/></radialGradient>
<mask id="ea-sunmask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><circle cx="${n(SX)}" cy="${n(SY)}" r="420" fill="url(#si-soft)"/></mask>
<radialGradient id="ea-sun"><stop offset="0" stop-color="#ffffff"/><stop offset=".06" stop-color="#fff4d0" stop-opacity=".95"/><stop offset=".25" stop-color="#ffb060" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a3a" stop-opacity="0"/></radialGradient>
<linearGradient id="ea-streak"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="ea-mglow"><stop offset=".7" stop-color="var(--mglow)" stop-opacity=".25"/><stop offset="1" stop-color="var(--mglow)" stop-opacity="0"/></radialGradient>
<radialGradient id="ea-mlimb"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
<linearGradient id="ea-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--panel-hi)"/><stop offset=".45" stop-color="var(--panel)"/><stop offset="1" stop-color="var(--panel)"/></linearGradient>
`

export const SPACE_EARTH: Look = {
  label: 'Earth orbit',
  args: { colors: theme, backdrop: { scene: 'space-earth', glass: { blur: 26, opacity: 0.52 } } },
  problems,
  scene: svg(CSS + turnCSS(), DEFS, BODY),
}
