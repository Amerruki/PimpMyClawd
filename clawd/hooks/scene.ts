import type { Activity, CrewMode, Mini, Scene, Usage } from '../types'
import { cityWindow } from './city'
import {
  CENTER_X, DESK_X, DOOR_S, DOOR_X, IDLE_X, MINI_HOP, MINI_SPEED, PATHS, PODIUM_X,
  STAND_UP_S, TOY_X, mainX, running, seatVisits, seatX, startX, transitSeconds,
} from './model'
import { HATS, TOPS, hat, top } from './outfits'
import { weather } from './weather'

export const W = 656
export const H = 128
const FLOOR = 102
const PX_W = 3
const PX_H = 6
const STAND_Y = FLOOR - 5 * PX_H
const SIT_Y = 66
const PODIUM_H = 8
const MINI_Y = FLOOR - (5 * PX_H) / 2
const MINI_SIT_Y = MINI_Y + 3
const STOOL_Y = 75
const CLIMB_SPEED = 60
const ORANGE = '#D97757'
const EYE = '#141413'
const WHITE = '#E8E8E4'
const DARK = '#2B2F36'
const METAL = '#9AA0A6'
const LEATHER = '#B07A52'
const MATRIX = '#3BE37A'
const TINTS = ['#D97757', '#E08A6D', '#C9694A', '#E39B7F', '#D4805F', '#CC7350']
const IDLE_LOOP = 30
const FONT = 'font-family="system-ui, -apple-system, sans-serif"'
const MONO = 'font-family="ui-monospace, SFMono-Regular, Menlo, monospace"'
const WINDOW = { x: 152, y: 6, w: 220, h: 60 }
const TOY_SPOTS = [114, 128, 142, 121, 135, 149]
const SAND_SPOTS = [22, 44, 66, 33, 55, 72].map(dx => IDLE_X + dx)
const LAPTOP_SPOTS = [62, 82, IDLE_X + 40, IDLE_X + 62, 72, IDLE_X + 51, 92, IDLE_X + 73]
const BOARD = { x: 58, y: 8, w: 80, h: 36 }
const GLASS_X = 380
const GAUGE = { x: 468, y: 26 }
const CABINET_X = 496
const BIN_X = 522

// Clawd decoded from the terminal logo's quadrant glyphs, one char per pixel:
// X body, e eye (body underneath, eye drawn on top), . empty.
const BODY = [
  '...XXXXXXXXXXXX...',
  '...XXeXXXXXXeXX...',
  '.XXXXXXXXXXXXXXXX.',
  '...XXXXXXXXXXXX...',
]
const CHEER = [
  '.X.XXXXXXXXXXXX.X.',
  '..XXXeXXXXXXeXXX..',
  '...XXXXXXXXXXXX...',
  '...XXXXXXXXXXXX...',
]
const LEGS_A = '....X.X....X.X....'
const LEGS_B = '...X.X......X.X...'

// Every timed animation is placed by its start relative to `now`, so a redraw
// resumes each one mid-flight instead of restarting it.
type Ctx = { now: number; lite: boolean }
const sec = (n: number) => `${n.toFixed(3)}s`
const from = (ctx: Ctx, ms: number) => (ms - ctx.now) / 1000

// A small seeded generator, so a redraw draws the same random-looking things.
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function runs(row: string, y: number, match: (c: string) => boolean, fill: string, h = PX_H, dy = 0): string {
  let out = ''
  for (let x = 0; x < row.length; ) {
    if (!match(row[x]!)) {
      x += 1
      continue
    }
    let end = x
    while (end < row.length && match(row[end]!)) end += 1
    out += `<rect x="${x * PX_W}" y="${y * PX_H + dy}" width="${(end - x) * PX_W}" height="${h}" fill="${fill}"/>`
    x = end
  }
  return out
}

const isBody = (c: string) => c === 'X' || c === 'e'
const isEye = (c: string) => c === 'e'

function legs(row: string, fill: string): string {
  return runs(row, 4, isBody, fill)
}

function trot(beat: number, fill: string): string {
  const a = `<animate attributeName="opacity" values="1;0" calcMode="discrete" dur="${sec(beat * 2)}" repeatCount="indefinite"/>`
  const b = `<animate attributeName="opacity" values="0;1" calcMode="discrete" dur="${sec(beat * 2)}" repeatCount="indefinite"/>`
  return `<g>${legs(LEGS_A, fill)}${a}</g><g opacity="0">${legs(LEGS_B, fill)}${b}</g>`
}

function bobbing(inner: string, beat: number, lift: number, begin = 0): string {
  return (
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -${lift}" calcMode="discrete" ` +
    `dur="${sec(beat * 2)}" begin="${sec(begin)}" repeatCount="indefinite"/>${inner}</g>`
  )
}

const BLINK = `<animate attributeName="opacity" values="1;1;0;1" keyTimes="0;0.92;0.96;1" dur="4s" repeatCount="indefinite"/>`

type CrabOpts = {
  fill?: string
  rows?: string[]
  eyes?: 'open' | 'closed' | 'blink'
  look?: string
  lookAnim?: string
  legs: 'none' | 'still' | 'trot'
  beat?: number
  bob?: number
  bobBegin?: number
  outfit?: string
}

// Clawd's own colour for the scene being drawn: it flushes as context fills.
let mainFill = ORANGE

// Pieces drawn once per scene in <defs> and placed with <use>: every crab
// body, set of legs and outfit repeats across poses, and the Svg element's
// size limit is tight once a dozen helpers are about.
let shared = new Map<string, string>()

function once(key: string, draw: () => string): string {
  const id = `s-${key.replace(/[^a-zA-Z0-9-]/g, '')}`
  if (!shared.has(id)) shared.set(id, `<g id="${id}">${draw()}</g>`)
  return `<use href="#${id}"/>`
}

function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
}

function flushOf(usage: Usage): string {
  const c = usage.context ?? 0
  return c <= 60 ? ORANGE : mix(ORANGE, '#C8402E', Math.min(1, (c - 60) / 40))
}

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return h >>> 0
}

function crab(o: CrabOpts): string {
  const fill = o.fill ?? mainFill
  const rows = o.rows ?? BODY
  const eyeRects =
    o.eyes === 'closed'
      ? rows.map((row, y) => runs(row, y, isEye, EYE, 2, PX_H - 2)).join('')
      : rows.map((row, y) => runs(row, y, isEye, EYE)).join('')
  const eyes = `<g${o.look ? ` transform="translate(${o.look})"` : ''}>${eyeRects}${o.eyes === 'blink' ? BLINK : ''}${o.lookAnim ?? ''}</g>`
  const beat = o.beat ?? 0.14
  const feet =
    o.legs === 'trot' ? once(`trot-${fill}-${beat}`, () => trot(beat, fill)) : o.legs === 'still' ? once(`legs-${fill}`, () => legs(LEGS_A, fill)) : ''
  const body = once(`body-${fill}-${rows === CHEER ? 'cheer' : 'body'}`, () => rows.map((row, y) => runs(row, y, isBody, fill)).join(''))
  const outfit = o.outfit ? once(`fit-${o.outfit.length}-${hash(o.outfit)}`, () => o.outfit!) : ''
  const inner = body + outfit + eyes + feet
  return o.bob ? bobbing(inner, o.beat ?? 0.14, o.bob, o.bobBegin) : inner
}

// Opacity phases over one loop: `on` is the [from, to] fraction of the loop.
function phase(on: [number, number], loop: number, begin: number): string {
  const [a, b] = on
  const values = a === 0 ? (b === 1 ? '1;1' : '1;0') : b === 1 ? '0;1' : '0;1;0'
  const times = a === 0 ? (b === 1 ? '0;1' : `0;${b}`) : b === 1 ? `0;${a}` : `0;${a};${b}`
  return `<animate attributeName="opacity" values="${values}" keyTimes="${times}" calcMode="discrete" dur="${sec(loop)}" begin="${sec(begin)}" repeatCount="indefinite"/>`
}

function showAt(begin: number): string {
  return `<set attributeName="opacity" to="1" begin="${sec(begin)}" fill="freeze"/>`
}

function hideAt(begin: number): string {
  return `<set attributeName="opacity" to="0" begin="${sec(begin)}" fill="freeze"/>`
}

// A one-shot move: `points` are [seconds after begin, "x y"], held at the end.
function moveOnce(points: [number, string][], begin: number, type = 'translate'): string {
  const total = Math.max(points[points.length - 1]![0], 0.001)
  return (
    `<animateTransform attributeName="transform" type="${type}" values="${points.map(([, v]) => v).join(';')}" ` +
    `keyTimes="${points.map(([t]) => (t / total).toFixed(4)).join(';')}" dur="${sec(total)}" begin="${sec(begin)}" fill="freeze"/>`
  )
}

function fadeOnce(values: string, times: string, dur: number, begin: number): string {
  return `<animate attributeName="opacity" values="${values}" keyTimes="${times}" dur="${sec(dur)}" begin="${sec(begin)}" fill="freeze"/>`
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------- props held

function openBook(): string {
  return (
    `<rect x="14" y="13" width="26" height="12" fill="#7A4E2D"/>` +
    `<rect x="15" y="14" width="11" height="10" fill="#F2EEE3"/><rect x="28" y="14" width="11" height="10" fill="#F2EEE3"/>` +
    `<rect x="17" y="16" width="7" height="1" fill="#B9B3A4"/><rect x="17" y="19" width="6" height="1" fill="#B9B3A4"/>` +
    `<rect x="30" y="16" width="7" height="1" fill="#B9B3A4"/><rect x="30" y="19" width="5" height="1" fill="#B9B3A4"/>` +
    `<g transform="translate(27 14)"><rect width="11" height="10" fill="#FFFFFF">` +
    `<animateTransform attributeName="transform" type="scale" values="1 1;0 1;1 1" keyTimes="0;0.06;0.12" dur="4s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.03;0.12" dur="4s" repeatCount="indefinite"/></rect></g>`
  )
}

function mug(x: number, y: number): string {
  return (
    `<g transform="translate(${x} ${y})"><rect width="7" height="8" fill="#EDEDED"/><rect x="7" y="2" width="2" height="4" fill="#EDEDED"/>` +
    `<rect x="1" y="1" width="5" height="2" fill="#6B4428"/>` +
    `<rect x="2" y="-5" width="1" height="3" fill="#FFFFFF" opacity="0.5"><animate attributeName="y" values="-3;-8" dur="1.4s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.6;0" dur="1.4s" repeatCount="indefinite"/></rect></g>`
  )
}

const PARCEL = `<rect width="14" height="11" fill="#C9A27A"/><rect x="6" width="2" height="11" fill="#8B5E3C"/><rect y="4" width="14" height="2" fill="#8B5E3C"/>`
const DOC =
  `<rect width="11" height="14" fill="#F2EEE3"/><rect x="2" y="3" width="7" height="1" fill="#B9B3A4"/>` +
  `<rect x="2" y="6" width="6" height="1" fill="#B9B3A4"/><rect x="2" y="9" width="7" height="1" fill="#B9B3A4"/>`

function zzz(): string {
  return [0, 1, 2]
    .map(
      i =>
        `<text x="50" y="0" font-size="${8 + i * 2}" ${FONT} font-weight="700" fill="#9FB3C8" opacity="0">z` +
        `<animate attributeName="opacity" values="0;1;0" dur="3s" begin="${i}s" repeatCount="indefinite"/>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;10 -18" dur="3s" begin="${i}s" repeatCount="indefinite"/></text>`,
    )
    .join('')
}

function sparkles(points: [number, number][], color = ORANGE): string {
  return points
    .map(
      ([x, y], i) =>
        `<rect x="${x}" y="${y}" width="3" height="3" fill="${color}" opacity="0">` +
        `<animate attributeName="opacity" values="0;1;0" dur="0.9s" begin="${(i * 0.3).toFixed(1)}s" repeatCount="indefinite"/></rect>`,
    )
    .join('')
}

function bubble(x: number, y: number, glyph: string, fill: string, ink: string): string {
  return (
    `<g transform="translate(${x} ${y})"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.6s" repeatCount="indefinite"/>` +
    `<rect x="-8" y="-12" width="16" height="14" rx="4" fill="${fill}"/><polygon points="-3,2 3,2 0,6" fill="${fill}"/>` +
    `<text x="0" y="-1" font-size="12" font-weight="800" text-anchor="middle" fill="${ink}" ${FONT}>${glyph}</text></g></g>`
  )
}

function sweat(): string {
  return (
    `<rect x="4" y="-2" width="3" height="4" fill="#7FB3E0"><animate attributeName="y" values="-4;8" dur="0.8s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="indefinite"/></rect>`
  )
}

// ---------------------------------------------------------------- main poses

function idlePose(begin: number): string {
  const read = `<g>${phase([0, 0.4], IDLE_LOOP, begin)}${crab({ legs: 'none', look: '0 2', eyes: 'open' })}${openBook()}</g>`
  const nap = `<g opacity="0">${phase([0.4, 0.8], IDLE_LOOP, begin)}${crab({ legs: 'none', eyes: 'closed' })}${zzz()}</g>`
  const sip =
    `<g opacity="0">${phase([0.8, 1], IDLE_LOOP, begin)}${crab({ legs: 'none', eyes: 'blink' })}` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;-8 -6;-8 -6;0 0" keyTimes="0;0.2;0.6;0.8" dur="3s" repeatCount="indefinite"/>${mug(44, 12)}</g></g>`
  return `<g>${moveOnce([[0, '0 -6'], [0.3, '0 0']], begin)}${read}${nap}${sip}</g>`
}

// Swaps from one pose to another `at` seconds into the act.
function swap(before: string, after: string, at: number): string {
  return `<g>${hideAt(at)}${before}</g><g opacity="0">${showAt(at)}${after}</g>`
}

// Bobbling in place with a bubble overhead: waiting on the person.
function waitPose(glyph: string, fill: string, ink: string): string {
  return (
    `<g transform="translate(27 30)"><g><animateTransform attributeName="transform" type="rotate" values="-9;9;-9" dur="0.7s" repeatCount="indefinite"/>` +
    `<g transform="translate(-27 -30)">${crab({ legs: 'trot', beat: 0.18, bob: 2, look: '0 -1' })}</g></g></g>` +
    bubble(27, -8, glyph, fill, ink)
  )
}

function gitPose(act: string, b: number): string {
  switch (act) {
    case 'pull':
      return (
        swap(crab({ legs: 'still', look: '2 0', eyes: 'blink' }), crab({ rows: CHEER, legs: 'still' }), b + 1.4) +
        `<g opacity="0">${fadeOnce('0;1', '0;1', 0.3, b)}<g>${moveOnce([[0, '40 -6'], [0.4, '40 -6'], [1.4, '20 -16']], b)}${PARCEL}</g></g>`
      )
    case 'push':
      return (
        swap(crab({ rows: CHEER, legs: 'still' }), crab({ legs: 'still', eyes: 'blink', look: '-2 0' }), b + 0.9) +
        `<g>${fadeOnce('1;1;0', '0;0.7;1', 1.3, b)}<g>${moveOnce([[0, '20 -16'], [0.9, '-18 0']], b)}${PARCEL}</g></g>` +
        `<g opacity="0">${fadeOnce('0;1;0', '0;0.3;1', 1.4, b + 1.1)}` +
        [0, 1, 2].map(i => `<rect x="${-22 + i * 6}" y="${-8 - i * 3}" width="4" height="1" fill="#7FB3E0"/>`).join('') +
        `</g>`
      )
    case 'commit':
      return (
        crab({ legs: 'still', look: '2 0', eyes: 'blink' }) +
        `<g>${fadeOnce('1;1;0', '0;0.85;1', 2.1, b)}<g>${moveOnce([[0, '20 -14'], [0.6, '20 -14'], [1.4, '42 0'], [2.0, '50 0']], b)}${DOC}</g></g>`
      )
    case 'mergeDocs':
      return (
        swap(crab({ legs: 'still', look: '0 -1' }), crab({ rows: CHEER, legs: 'still' }), b + 1.6) +
        `<g>${hideAt(b + 1.6)}<g>${moveOnce([[0, '-8 4'], [0.6, '-8 4'], [1.6, '16 -12']], b)}${DOC}</g>` +
        `<g>${moveOnce([[0, '51 4'], [0.6, '51 4'], [1.6, '26 -12']], b)}${DOC}</g></g>` +
        `<g opacity="0">${showAt(b + 1.6)}<g transform="translate(21 -16)">${DOC}<circle cx="8" cy="11" r="3" fill="#E8C07A"/></g></g>` +
        `<circle cx="26" cy="-8" r="4" fill="none" stroke="#E8C07A" stroke-width="2" opacity="0">` +
        `${fadeOnce('1;0', '0;1', 0.8, b + 1.6)}<animate attributeName="r" values="4;16" dur="0.8s" begin="${sec(b + 1.6)}" fill="freeze"/></circle>`
      )
    case 'mergeCrew':
      return crab({ legs: 'still', look: '-2 0', bob: 1, beat: 0.25, eyes: 'blink' })
    case 'conflict':
      return waitPose('!', '#E05A47', '#FFFFFF') + sweat()
    case 'pr':
      return (
        swap(crab({ rows: CHEER, legs: 'still' }), crab({ legs: 'still', look: '0 -1', eyes: 'blink' }), b + 0.6) +
        `<g>${fadeOnce('1;1;0', '0;0.75;1', 2.4, b)}<g>${moveOnce(
          [[0, '30 -8'], [0.8, '60 -34'], [1.6, '34 -52'], [2.4, '28 -48']],
          b,
        )}<polygon points="0,6 16,0 6,10" fill="#F2EEE3"/><polygon points="6,10 16,0 8,13" fill="#C9C4B6"/></g></g>`
      )
    case 'testsPass':
      return (
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="0.5s" repeatCount="indefinite"/>${crab({ rows: CHEER, legs: 'still' })}</g>` +
        bubble(27, -8, '✓', '#5FCB6B', '#FFFFFF') +
        sparkles([[-8, 2], [58, -2], [62, 16]], '#5FCB6B')
      )
    case 'testsFail':
      // A claw over the eyes: a facepalm.
      return (
        crab({ legs: 'still', eyes: 'closed' }) +
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0" dur="1.2s" repeatCount="indefinite"/>` +
        `<rect x="12" y="5" width="30" height="5" fill="${mainFill}"/><rect x="40" y="9" width="6" height="8" fill="${mainFill}"/></g>` +
        bubble(27, -8, '✗', '#E05A47', '#FFFFFF')
      )
  }
  return crab({ legs: 'still' })
}

function mainPose(activity: Activity, begin: number): string {
  if (activity.startsWith('git-')) return gitPose(activity.slice(4), begin)
  switch (activity) {
    case 'idle':
      return idlePose(begin)
    case 'happy':
      return (
        `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -12;0 0" keyTimes="0;0.4;1" dur="0.6s" ` +
        `calcMode="spline" keySplines="0.2 0.8 0.4 1;0.6 0 0.8 0.2" repeatCount="indefinite"/>${crab({ rows: CHEER, legs: 'still' })}</g>` +
        sparkles([[-10, 0], [60, -4], [66, 14], [-6, 18]])
      )
    case 'compact':
      return (
        crab({ legs: 'trot', beat: 0.2, bob: 1, look: '2 1', eyes: 'blink' }) +
        `<g transform="translate(46 6)"><g><animateTransform attributeName="transform" type="rotate" values="-10;14;-10" dur="0.6s" repeatCount="indefinite"/>` +
        `<rect x="0" y="0" width="2" height="22" fill="#8B5E3C" transform="rotate(-24)"/><rect x="7" y="18" width="10" height="6" fill="#C9A27A" transform="rotate(-24)"/></g></g>`
      )
    case 'wait-permission':
      return waitPose('!', '#F2C94C', '#2B2F36')
    case 'wait-question':
      return waitPose('?', '#7FB3E0', '#FFFFFF')
    case 'thinking':
      return (
        crab({ legs: 'trot', beat: 0.3, bob: 1, look: '0 -1', eyes: 'blink' }) +
        `<circle cx="50" cy="-2" r="2" fill="#EDEDED" opacity="0.85"/><circle cx="57" cy="-8" r="3" fill="#EDEDED" opacity="0.85"/>` +
        `<ellipse cx="72" cy="-18" rx="13" ry="8" fill="#EDEDED" opacity="0.9"/>` +
        [0, 1, 2]
          .map(
            i =>
              `<circle cx="${66 + i * 6}" cy="-18" r="1.6" fill="#555"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="${(i * 0.3).toFixed(1)}s" repeatCount="indefinite"/></circle>`,
          )
          .join('')
      )
    case 'typing':
      return crab({ legs: 'still', bob: 1, beat: 0.1, look: '2 0' })
    case 'research':
      return (
        crab({ legs: 'still', look: '0 2', eyes: 'blink' }) +
        openBook() +
        `<g><animateTransform attributeName="transform" type="translate" values="16 14;30 16;16 14" dur="3s" repeatCount="indefinite"/>` +
        `<circle r="4" fill="#BFE3FF" fill-opacity="0.25" stroke="#C9C9C9" stroke-width="1.5"/><rect x="3" y="3" width="2" height="6" fill="#8B5E3C" transform="rotate(-45 4 6)"/></g>`
      )
    case 'errand':
      return bobbing(
        crab({ legs: 'trot', beat: 0.12 }) +
          `<rect x="18" y="-12" width="16" height="10" fill="#F2EEE3"/><rect x="20" y="-9" width="12" height="1" fill="#B9B3A4"/><rect x="20" y="-6" width="9" height="1" fill="#B9B3A4"/>`,
        0.12,
        2,
      )
    case 'conduct':
      return (
        crab({ legs: 'still', bob: 1, beat: 0.5, bobBegin: begin, look: '0 -1' }) +
        `<g transform="translate(51 13)"><g><animateTransform attributeName="transform" type="rotate" values="-35;25;-35" dur="1s" begin="${sec(begin)}" repeatCount="indefinite"/>` +
        `<rect x="0" y="-1" width="16" height="2" fill="#EDEDED" transform="rotate(-40)"/></g></g>`
      )
    case 'scurry':
      return (
        crab({
          legs: 'trot',
          beat: 0.1,
          bob: 2,
          lookAnim: `<animateTransform attributeName="transform" type="translate" values="2 0;-2 0" keyTimes="0;0.5" calcMode="discrete" dur="${sec(PATHS.scurry.loop)}" begin="${sec(begin)}" repeatCount="indefinite"/>`,
        }) + sweat()
      )
    case 'coffee':
      return crab({ legs: 'trot', beat: 0.16 }) + mug(48, 8)
    case 'standup':
      return (
        crab({ legs: 'still', look: '-2 -1', eyes: 'blink' }) +
        `<g transform="translate(48 4)"><g><animateTransform attributeName="transform" type="rotate" values="-8;6;-8" dur="2s" repeatCount="indefinite"/>` +
        `<rect x="0" y="-1" width="30" height="2" fill="${METAL}" transform="rotate(-62)"/></g></g>`
      )
    case 'inspect':
      return (
        crab({ legs: 'trot', beat: 0.25, look: '0 1' }) +
        `<rect x="44" y="4" width="11" height="14" fill="${DARK}"/><rect x="45" y="6" width="9" height="11" fill="#F2EEE3"/>` +
        `<rect x="47" y="8" width="5" height="1" fill="#7FB37F"/><rect x="47" y="11" width="5" height="1" fill="#7FB37F"/><rect x="47" y="14" width="3" height="1" fill="#B9B3A4"/>`
      )
  }
  return crab({ legs: 'still' })
}

function yOf(activity: Activity): number {
  if (activity === 'idle') return SIT_Y
  if (activity === 'conduct') return STAND_Y - PODIUM_H
  return STAND_Y
}

// What Clawd carries on the way to a git errand.
function carried(activity: Activity): string {
  if (activity === 'git-push') return `<g transform="translate(20 -16)">${PARCEL}</g>`
  if (activity === 'git-commit') return `<g transform="translate(20 -14)">${DOC}</g>`
  return ''
}

function actBegin(scene: Scene, ctx: Ctx): number {
  return from(ctx, scene.main.since) + transitSeconds(scene.main)
}

function mainSvg(scene: Scene, ctx: Ctx): string {
  const m = scene.main
  const d = transitSeconds(m)
  const b0 = from(ctx, m.since)
  const bLoop = b0 + d
  const fromY = m.fromSitting ? SIT_Y : STAND_Y
  const toX = startX(m)
  const hasPath = m.activity in PATHS
  const y = hasPath ? yOf(m.activity) : STAND_Y
  let motion = ''

  if (d > 0) {
    const up = m.fromSitting && m.activity !== 'idle' ? STAND_UP_S : 0
    const points: [number, string][] = [[0, `${m.fromX} ${up > 0 ? fromY : STAND_Y}`]]
    if (up > 0) points.push([up, `${m.fromX} ${STAND_Y}`])
    if (Math.abs(toX - m.fromX) >= 1) points.push([d, `${toX} ${STAND_Y}`])
    motion += moveOnce(points, b0)
  }

  const path = hasPath ? PATHS[m.activity as keyof typeof PATHS] : { keys: [[0, m.fromX]] as [number, number][], loop: 1 }
  if (path.keys.length > 1) {
    const keys = [...path.keys, [path.loop, path.keys[0]![1]] as [number, number]]
    motion +=
      `<animateTransform attributeName="transform" type="translate" values="${keys.map(([, x]) => `${x.toFixed(1)} ${y}`).join(';')}" ` +
      `keyTimes="${keys.map(([t]) => (t / path.loop).toFixed(4)).join(';')}" dur="${sec(path.loop)}" begin="${sec(bLoop)}" repeatCount="indefinite"/>`
  } else {
    const x = path.keys[0]![1]
    motion += moveOnce([[0, `${x} ${y}`], [0.001, `${x} ${y}`]], bLoop)
  }

  const walking = d > 0 ? `<g>${hideAt(bLoop)}${crab({ legs: 'trot', beat: 0.12, bob: 2 })}${carried(m.activity)}</g>` : ''
  const strain = (scene.usage.context ?? 0) >= 75 && m.activity !== 'idle' ? sweat() : ''
  const pose = `<g opacity="${d > 0 ? 0 : 1}">${d > 0 ? showAt(bLoop) : ''}${mainPose(m.activity, bLoop)}</g>`
  return `<g transform="translate(${m.fromX} ${fromY})">${motion}${walking}${pose}${strain}</g>`
}

// Clawd whistles the helpers back from a break.
function whistle(scene: Scene, ctx: Ctx): string {
  const { crew } = scene
  if (crew.mode !== 'work' || crew.prev === 'work' || crew.prev === 'fight' || crew.prev === 'merge') return ''
  if (ctx.now - crew.since > 4000) return ''
  const x = mainX(scene.main, crew.since)
  const b = from(ctx, crew.since)
  return (
    `<g opacity="0">${fadeOnce('1;1;0', '0;0.85;1', 2.6, b)}${bubble(x + 27, STAND_Y - 8, '!', ORANGE, '#FFFFFF')}` +
    [0, 1].map(i => `<path d="M${x + 44 + i * 5} ${STAND_Y - 14 - i * 3} q4 4 0 8" fill="none" stroke="${ORANGE}" stroke-width="1.5"/>`).join('') +
    `</g>`
  )
}

// ---------------------------------------------------------------- room

function slidingDoor(scene: Scene, ctx: Ctx, timelines: Map<string, Timeline>): string {
  const swings: number[] = []
  for (const mini of scene.minis) {
    swings.push(from(ctx, mini.arrivedAt))
    const t = timelines.get(mini.id)
    if (t?.leaveEnd != null) swings.push(t.leaveEnd - DOOR_S * 1.6)
    if (t?.reenter != null) swings.push(t.reenter - DOOR_S)
  }
  if (scene.refill) {
    const b = from(ctx, scene.refill.at)
    swings.push(b, b + REFILL_OUT - DOOR_S * 1.6)
  }
  const exit = graduationExit(scene, ctx)
  if (exit !== null) swings.push(exit - DOOR_S * 1.6)
  const anims = swings
    .map(
      b =>
        `<animateTransform attributeName="transform" type="translate" values="0 0;21 0;21 0;0 0" keyTimes="0;0.2;0.75;1" dur="${sec(DOOR_S * 4)}" begin="${sec(b)}"/>`,
    )
    .join('')
  const glass = (x: number) =>
    `<rect x="${x}" y="30" width="22" height="72" fill="#A8DCEB" fill-opacity="0.16" stroke="${METAL}" stroke-width="1.5"/>` +
    `<path d="M${x + 4} 40 l10 -8 M${x + 4} 50 l14 -12" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5"/>`
  return (
    `<rect x="6" y="26" width="50" height="76" fill="#141A21"/><rect x="6" y="26" width="50" height="3" fill="${METAL}"/>` +
    `<rect x="8" y="94" width="46" height="8" fill="#1C232C"/>` +
    glass(31) +
    `<g>${anims}${glass(9)}<rect x="27" y="58" width="2" height="16" fill="${METAL}"/></g>`
  )
}

function inbox(scene: Scene, ctx: Ctx): string {
  const x = DESK_X + 7
  const lit =
    scene.main.activity === 'git-push'
      ? `<rect x="${x + 1}" y="82.5" width="16" height="1.5" fill="#7FB3E0" opacity="0">${fadeOnce('0;1;1;0', '0;0.1;0.8;1', 2.5, actBegin(scene, ctx) + 1)}</rect>`
      : ''
  return (
    `<rect x="${x}" y="84" width="18" height="4" fill="${WHITE}"/><rect x="${x + 1}" y="83" width="16" height="1.5" fill="#C9CBCF"/>` +
    `<text x="${x + 9}" y="87.3" font-size="3.5" text-anchor="middle" fill="#6B7280" ${FONT}>IN</text>${lit}`
  )
}

function cubeShelf(): string {
  const cells: [number, number][] = [[62, 48], [83, 48], [62, 66], [83, 66], [62, 84], [83, 84]]
  const contents = [
    `<rect x="65" y="54" width="3" height="11" fill="#4F6D8F"/><rect x="69" y="52" width="3" height="13" fill="#D9A441"/><rect x="73" y="55" width="3" height="10" fill="#B5523B"/>`,
    `<ellipse cx="93" cy="62" rx="5" ry="3" fill="#5E8C4A"/><rect x="89" y="62" width="8" height="3" fill="${WHITE}"/>`,
    `<circle cx="72" cy="76" r="4" fill="#9AA0A6"/><circle cx="72" cy="76" r="2" fill="${ORANGE}" opacity="0.7"/>`,
    `<rect x="85" y="72" width="3" height="11" fill="#7A6A55"/><rect x="89" y="70" width="3" height="13" fill="#3F7A8C"/><rect x="93" y="74" width="3" height="9" fill="#8E5A9B"/><rect x="97" y="73" width="3" height="10" fill="#5E8C4A"/>`,
    `<rect x="65" y="94" width="14" height="6" fill="#C9A27A"/>`,
    `<rect x="86" y="90" width="3" height="11" fill="#D9A441"/><rect x="90" y="92" width="3" height="9" fill="#4F6D8F"/>`,
  ]
  return (
    `<rect x="60" y="46" width="44" height="56" fill="${WHITE}"/>` +
    cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="19" height="16" fill="#C9CBCF"/>`).join('') +
    contents.join('')
  )
}

function toyCorner(roles: Map<string, Role>, ctx: Ctx, scene: Scene): string {
  const playing = [...roles.values()].some(r => r.kind === 'toys')
  const ball = playing
    ? `<circle r="3" fill="#E05A47"><animateTransform attributeName="transform" type="translate" values="120 98;132 74;144 98;136 80;126 98;120 98" dur="2.4s" repeatCount="indefinite" begin="${sec(from(ctx, scene.crew.since))}"/></circle>`
    : `<circle cx="120" cy="98" r="3" fill="#E05A47"/>`
  return (
    `<ellipse cx="${TOY_X + 22}" cy="101" rx="24" ry="3" fill="#6C8EBF" opacity="0.45"/>` +
    `<rect x="144" y="90" width="14" height="12" fill="${WHITE}"/><rect x="143" y="88" width="16" height="3" fill="#7FB3E0"/>` +
    `<rect x="127" y="96" width="5" height="5" fill="#D9A441"/><rect x="132" y="96" width="5" height="5" fill="#5E8C4A"/><rect x="129" y="91" width="5" height="5" fill="#8E5A9B"/>` +
    ball
  )
}

// The checkout as a little branch diagram: main through the middle, green when
// that is where we are; otherwise our branch forking off it, with a dashed
// line to where it would merge back.
function gitBoard(scene: Scene, ctx: Ctx): string {
  const { x, y, w, h } = BOARD
  const cy = y + h / 2 + 2
  const repo = scene.repo
  const onBase = repo !== null && repo.branch === repo.base
  const mainColor = onBase ? '#5FCB6B' : '#5B6470'
  const forkX = x + 22
  const branchY = y + 9
  const mergeX = x + h * 2 - 6
  const tipX = forkX + 14 + Math.min(5, Math.max(1, repo?.ahead ?? 1)) * 6
  let body =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#1B1F24"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="#0E1217"/>` +
    `<line x1="${x + 7}" y1="${cy}" x2="${x + w - 7}" y2="${cy}" stroke="${mainColor}" stroke-width="2"${repo === null ? ' stroke-dasharray="3 2"' : ''}/>`
  if (repo === null) {
    body += `<text x="${x + w / 2}" y="${cy - 5}" font-size="5" text-anchor="middle" fill="#8A8F98" ${FONT}>no repository</text>`
  } else if (onBase) {
    body +=
      [0, 1, 2, 3].map(i => `<circle cx="${x + 14 + i * 16}" cy="${cy}" r="2.5" fill="${mainColor}"/>`).join('') +
      `<text x="${x + 7}" y="${cy - 5}" font-size="5" fill="#9FE3A8" ${FONT}>${escape(repo.base)}</text>`
  } else {
    const ahead = Math.min(5, repo.ahead)
    const behind = Math.min(3, repo.behind)
    body +=
      `<circle cx="${x + 12}" cy="${cy}" r="2.5" fill="${mainColor}"/><circle cx="${forkX}" cy="${cy}" r="2.5" fill="${mainColor}"/>` +
      Array.from({ length: behind }, (_, i) => `<circle cx="${forkX + 12 + i * 8}" cy="${cy}" r="2" fill="none" stroke="#8A8F98" stroke-width="1"/>`).join('') +
      `<path d="M${forkX} ${cy} C${forkX + 6} ${branchY} ${forkX + 8} ${branchY} ${forkX + 14} ${branchY} L${tipX} ${branchY}" fill="none" stroke="${ORANGE}" stroke-width="2"/>` +
      Array.from({ length: ahead }, (_, i) => `<circle cx="${forkX + 18 + i * 6}" cy="${branchY}" r="2" fill="${ORANGE}"/>`).join('') +
      `<path d="M${tipX} ${branchY} C${tipX + 6} ${branchY} ${mergeX - 6} ${cy} ${mergeX} ${cy}" fill="none" stroke="${ORANGE}" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.8"/>` +
      `<circle cx="${mergeX}" cy="${cy}" r="2.5" fill="none" stroke="${ORANGE}" stroke-width="1.2"/>` +
      `<text x="${forkX + 14}" y="${branchY - 3}" font-size="5" fill="#F2B49C" ${FONT}>${escape(repo.branch.length > 18 ? `${repo.branch.slice(0, 17)}…` : repo.branch)}</text>` +
      `<text x="${x + 7}" y="${cy + 8}" font-size="5" fill="#8A8F98" ${FONT}>${escape(repo.base)}${repo.behind > 0 ? ` +${repo.behind}` : ''}</text>`
  }

  const g = scene.git
  let fx = ''
  if (g) {
    const b = from(ctx, g.at)
    const tip = onBase || repo === null ? x + w - 12 : tipX
    const tipY = onBase || repo === null ? cy : branchY
    switch (g.kind) {
      case 'commit':
        fx =
          `<circle cx="${tip}" cy="${tipY}" r="0" fill="${ORANGE}"><animate attributeName="r" values="0;4;2.5" dur="0.5s" begin="${sec(b + 2)}" fill="freeze"/></circle>` +
          `<circle cx="${tip}" cy="${tipY}" r="3" fill="none" stroke="${ORANGE}" opacity="0"><animate attributeName="r" values="3;10" dur="0.8s" begin="${sec(b + 2)}" fill="freeze"/>` +
          `${fadeOnce('1;0', '0;1', 0.8, b + 2)}</circle>`
        break
      case 'push':
        fx =
          `<g opacity="0">${fadeOnce('0;1;1;0', '0;0.1;0.8;1', 2, b + 1.4)}<g>${moveOnce([[0, '0 0'], [2, '0 -8']], b + 1.4)}` +
          `<polygon points="${tip - 3},${tipY - 4} ${tip + 3},${tipY - 4} ${tip},${tipY - 9}" fill="#7FB3E0"/></g></g>`
        break
      case 'pull':
        fx =
          `<circle cx="${x + w - 4}" cy="${cy}" r="2.5" fill="#7FB3E0" opacity="0"><animate attributeName="cx" values="${x + w - 4};${x + w - 14}" dur="0.8s" begin="${sec(b)}" fill="freeze"/>` +
          `${fadeOnce('0;1', '0;1', 0.8, b)}</circle>`
        break
      case 'merge':
        fx =
          `<path d="M${tipX} ${branchY} C${tipX + 6} ${branchY} ${mergeX - 6} ${cy} ${mergeX} ${cy}" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="40">` +
          `<animate attributeName="stroke-dashoffset" values="40;0" dur="0.8s" begin="${sec(b + 1.6)}" fill="freeze"/></path>` +
          `<circle cx="${mergeX}" cy="${cy}" r="3" fill="${ORANGE}" opacity="0">${fadeOnce('0;1', '0;1', 0.2, b + 2.4)}` +
          `<animate attributeName="r" values="3;5;3" dur="0.6s" begin="${sec(b + 2.4)}" repeatCount="4"/></circle>`
        break
      case 'conflict':
        fx =
          `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" fill="#C0392B" opacity="0"><animate attributeName="opacity" values="0;0.6;0" dur="0.6s" begin="${sec(b)}" repeatCount="6"/></rect>` +
          `<text x="${mergeX}" y="${cy + 3}" font-size="12" font-weight="800" ${FONT} fill="#FFB4A8" text-anchor="middle" opacity="0">!${fadeOnce('0;1', '0;1', 0.2, b)}</text>`
        break
      case 'pr':
        fx =
          `<g opacity="0">${fadeOnce('0;1;1;0', '0;0.1;0.85;1', 4, b + 1)}<rect x="${mergeX - 5}" y="${cy - 12}" width="10" height="7" fill="#F2EEE3"/>` +
          `<path d="M${mergeX - 5} ${cy - 12} l5 4 l5 -4" fill="none" stroke="#B9B3A4"/></g>`
        break
    }
  }
  return body + fx
}

// A light by the git board: green when tests pass, red and spinning when not.
function statusLight(scene: Scene, ctx: Ctx): string {
  const act = scene.git?.act
  if (act !== 'testsPass' && act !== 'testsFail') {
    return `<rect x="140" y="12" width="10" height="3" fill="${DARK}"/><path d="M141 12 Q145 4 149 12 Z" fill="#4A4F57"/>`
  }
  const b = from(ctx, scene.git!.at)
  const color = act === 'testsPass' ? '#5FCB6B' : '#E05A47'
  const spin =
    act === 'testsFail'
      ? `<g opacity="0">${showAt(b)}<polygon points="145,8 168,2 168,14" fill="${color}" opacity="0.25"><animateTransform attributeName="transform" type="rotate" values="0 145 8;360 145 8" dur="0.8s" repeatCount="indefinite"/></polygon></g>`
      : ''
  return (
    `<rect x="140" y="12" width="10" height="3" fill="${DARK}"/><path d="M141 12 Q145 4 149 12 Z" fill="${color}"/>` +
    `<circle cx="145" cy="9" r="8" fill="${color}" opacity="0"><animate attributeName="opacity" values="0;0.45;0" dur="${act === 'testsPass' ? 1.2 : 0.5}s" repeatCount="indefinite" begin="${sec(b)}"/></circle>` +
    spin
  )
}

function windowView(scene: Scene, ctx: Ctx): string {
  const { x, y, w, h } = WINDOW
  const storm = Math.min(1, Math.max(0, (scene.usage.week ?? 0) / 100))
  return (
    `<defs><clipPath id="win-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs>` +
    `<g clip-path="url(#win-clip)"><g transform="translate(${x} ${y})">${cityWindow(w, h, scene.daypart)}${ctx.lite ? '' : weather(w, h, scene.daypart, storm)}</g></g>` +
    `<rect x="${x - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" fill="none" stroke="#3A4048" stroke-width="3"/>` +
    `<rect x="${x + w / 2 - 1}" y="${y}" width="2" height="${h}" fill="#3A4048"/>` +
    `<rect x="${x - 5}" y="${y + h + 2}" width="${w + 10}" height="3" fill="${WHITE}"/>`
  )
}

function glassBoard(scene: Scene, ctx: Ctx): string {
  const x = GLASS_X
  const drawing =
    scene.main.activity === 'standup'
      ? `<polyline points="${x + 6},38 ${x + 20},32 ${x + 32},35 ${x + 44},24 ${x + 56},27 ${x + 62},16" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="80" stroke-dashoffset="80">` +
        `<animate attributeName="stroke-dashoffset" values="80;0;0" keyTimes="0;0.6;1" dur="4s" begin="${sec(from(ctx, scene.main.since))}" repeatCount="indefinite"/></polyline>`
      : ''
  return (
    `<rect x="${x}" y="10" width="64" height="36" fill="#DDEFF5" fill-opacity="0.18" stroke="${METAL}" stroke-opacity="0.6"/>` +
    [[3, 3], [61, 3], [3, 33], [61, 33]].map(([dx, dy]) => `<circle cx="${x + dx!}" cy="${10 + dy!}" r="1.2" fill="${METAL}"/>`).join('') +
    `<rect x="${x + 6}" y="16" width="26" height="2" fill="#7FB3E0" opacity="0.6"/><rect x="${x + 6}" y="21" width="18" height="2" fill="#7FB3E0" opacity="0.6"/>${drawing}`
  )
}

// Green code rain on a screen: one falling streak per column, each at its own
// pace, clipped to the glass.
function matrix(id: string, x: number, y: number, w: number, h: number, pace: number): string {
  const random = seeded(x * 131 + y * 7)
  let drops = ''
  for (let cx = 0; cx < w; cx += 2) {
    const dur = (0.7 + random() * 0.9) * pace
    const begin = -random() * dur
    drops +=
      `<g><animateTransform attributeName="transform" type="translate" values="0 ${-8};0 ${h}" dur="${dur.toFixed(2)}s" begin="${begin.toFixed(2)}s" repeatCount="indefinite"/>` +
      `<rect x="${x + cx}" y="${y}" width="1" height="6" fill="${MATRIX}" opacity="0.35"/><rect x="${x + cx}" y="${y + 6}" width="1" height="2" fill="#C8FFD8"/></g>`
  }
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#${id})">${drops}</g>`
}

function desk(seat: number, workFrom: number | null, workUntil: number | null, lite: boolean): string {
  const x = seatX(seat)
  const screen =
    workFrom === null || lite
      ? ''
      : `<g opacity="0">${showAt(workFrom)}${workUntil !== null ? hideAt(workUntil) : ''}${matrix(`mx-${seat}`, x + 26, 74, 13, 10, 1)}</g>`
  return (
    `<rect x="${x - 2}" y="90" width="42" height="3" fill="${WHITE}"/><rect x="${x}" y="93" width="2" height="9" fill="${DARK}"/><rect x="${x + 36}" y="93" width="2" height="9" fill="${DARK}"/>` +
    `<rect x="${x + 31}" y="86" width="3" height="4" fill="#3A3A3A"/><rect x="${x + 24}" y="72" width="17" height="14" fill="#2C2C2C"/><rect x="${x + 26}" y="74" width="13" height="10" fill="#0B140E"/>${screen}` +
    `<rect x="${x + 16}" y="88" width="14" height="2" fill="#4A4A4A"/>` +
    `<ellipse cx="${x + 13}" cy="90.5" rx="9" ry="1.8" fill="${DARK}"/><rect x="${x + 12}" y="91" width="2" height="10" fill="${METAL}"/><rect x="${x + 7}" y="100" width="12" height="2" fill="${METAL}"/>`
  )
}

function mainDesk(scene: Scene, ctx: Ctx): string {
  const a = scene.main.activity
  const busy = a === 'typing' || a === 'git-pull' || a === 'git-testsPass' || a === 'git-testsFail'
  const flash =
    a === 'git-pull'
      ? `<rect x="${DESK_X + 29}" y="61" width="32" height="20" fill="#FFFFFF" opacity="0">${fadeOnce('0;0.8;0', '0;0.2;1', 0.6, actBegin(scene, ctx))}</rect>`
      : ''
  return (
    `<rect x="${DESK_X - 6}" y="88" width="78" height="3" fill="${WHITE}"/><rect x="${DESK_X - 2}" y="91" width="3" height="11" fill="${DARK}"/><rect x="${DESK_X + 64}" y="91" width="3" height="11" fill="${DARK}"/>` +
    `<rect x="${DESK_X - 4}" y="100" width="10" height="2" fill="${DARK}"/><rect x="${DESK_X + 60}" y="100" width="10" height="2" fill="${DARK}"/>` +
    `<rect x="${DESK_X + 44}" y="82" width="4" height="6" fill="#3A3A3A"/><rect x="${DESK_X + 26}" y="58" width="38" height="26" fill="#2C2C2C"/><rect x="${DESK_X + 29}" y="61" width="32" height="20" fill="#0B140E"/>` +
    matrix('mx-main', DESK_X + 29, 61, 32, 20, busy ? 0.6 : 2.4) +
    flash +
    `<rect x="${DESK_X - 4}" y="77" width="9" height="11" rx="1" fill="${DARK}"/><circle cx="${DESK_X + 0.5}" cy="80" r="1" fill="${ORANGE}"/>`
  )
}

function cabinet(scene: Scene, ctx: Ctx): string {
  const x = CABINET_X
  const filing = scene.main.activity === 'git-commit'
  const b = filing ? actBegin(scene, ctx) : 0
  const drawer = filing ? moveOnce([[0, '0 0'], [0.3, '0 0'], [0.6, '-8 0'], [1.9, '-8 0'], [2.3, '0 0']], b) : ''
  const tick = filing
    ? `<text x="${x + 10}" y="52" font-size="12" font-weight="700" text-anchor="middle" fill="#7FB37F" ${FONT} opacity="0">✓${fadeOnce('0;1;1;0', '0;0.1;0.8;1', 2, b + 2.3)}</text>`
    : ''
  return (
    `<rect x="${x}" y="70" width="20" height="32" fill="${WHITE}"/>` +
    `<g>${drawer}<rect x="${x}" y="71" width="20" height="9" fill="#F2F2EF" stroke="#C9CBCF" stroke-width="0.8"/><rect x="${x + 7}" y="74" width="6" height="1.5" fill="${METAL}"/></g>` +
    `<rect x="${x + 1}" y="82" width="18" height="9" fill="none" stroke="#C9CBCF" stroke-width="0.8"/><rect x="${x + 7}" y="85" width="6" height="1.5" fill="${METAL}"/>` +
    `<rect x="${x + 1}" y="92" width="18" height="9" fill="none" stroke="#C9CBCF" stroke-width="0.8"/><rect x="${x + 7}" y="95" width="6" height="1.5" fill="${METAL}"/>${tick}`
  )
}

function lounge(scene: Scene): string {
  const on = scene.daypart === 'night' || scene.daypart === 'dusk'
  const lamp = IDLE_X + 70
  const plant = IDLE_X + 90
  return (
    `<style>.lamp-light{opacity:${on ? 1 : 0}}@media (prefers-color-scheme: dark){.lamp-light{opacity:1}}</style>` +
    `<rect x="${IDLE_X - 8}" y="100" width="86" height="2" fill="#C9CBCF" opacity="0.35"/>` +
    `<rect x="${IDLE_X - 6}" y="60" width="64" height="32" rx="9" fill="#3A3F47"/>` +
    `<rect x="${IDLE_X}" y="63" width="52" height="25" rx="7" fill="${LEATHER}"/><rect x="${IDLE_X - 2}" y="88" width="56" height="6" rx="3" fill="${LEATHER}"/>` +
    `<rect x="${IDLE_X + 24}" y="94" width="4" height="6" fill="${METAL}"/><rect x="${IDLE_X + 8}" y="100" width="36" height="2" fill="${METAL}"/>` +
    `<g class="lamp-light"><circle cx="${lamp}" cy="44" r="20" fill="#FFD58A" opacity="0.14"><animate attributeName="opacity" values="0.12;0.17;0.12" dur="5s" repeatCount="indefinite"/></circle>` +
    `<polygon points="${lamp - 6},47 ${lamp + 6},47 ${lamp + 20},102 ${lamp - 20},102" fill="#FFE2A8" opacity="0.07"/></g>` +
    `<rect x="${lamp - 1}" y="46" width="2" height="54" fill="${METAL}"/><rect x="${lamp - 6}" y="99" width="12" height="3" fill="${DARK}"/>` +
    `<polygon points="${lamp - 8},47 ${lamp + 8},47 ${lamp + 5},36 ${lamp - 5},36" fill="${WHITE}"/><rect x="${lamp - 4}" y="46" width="8" height="2" fill="#FFE2A8" class="lamp-light"/>` +
    `<rect x="${plant}" y="86" width="16" height="16" fill="${WHITE}"/>` +
    `<g transform="translate(${plant + 8} 86)"><g><animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur="6s" repeatCount="indefinite"/>` +
    `<ellipse cx="-6" cy="-9" rx="4" ry="9" fill="#4E7F3E" transform="rotate(-30 -6 -9)"/><ellipse cx="6" cy="-10" rx="4" ry="10" fill="#5E8C4A" transform="rotate(28 6 -10)"/>` +
    `<ellipse cx="0" cy="-14" rx="4" ry="12" fill="#6FA35A"/></g></g>`
  )
}

// A low sandbox in the lamplight; castles rise while helpers dig.
function sandbox(roles: Map<string, Role>): string {
  const digging = [...roles.values()].filter(r => r.kind === 'sand').length
  const castles = digging === 0
    ? `<rect x="${IDLE_X + 28}" y="94" width="6" height="4" fill="#D9B97A"/>`
    : [0, 1, 2]
        .map(i => {
          const x = IDLE_X + 24 + i * 22
          const steps = [`<rect x="${x}" y="94" width="10" height="4" fill="#D9B97A"/>`, `<rect x="${x + 2}" y="90" width="6" height="4" fill="#D2B06F"/>`, `<rect x="${x + 2}" y="88" width="2" height="2" fill="#D2B06F"/><rect x="${x + 6}" y="88" width="2" height="2" fill="#D2B06F"/>`]
          return steps
            .map(
              (step, j) =>
                `<g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;${(0.15 + j * 0.2 + i * 0.05).toFixed(2)};0.92;1" calcMode="discrete" dur="9s" repeatCount="indefinite"/>${step}</g>`,
            )
            .join('')
        })
        .join('') + `<polygon points="${IDLE_X + 49},86 ${IDLE_X + 49},82 ${IDLE_X + 53},84" fill="#E05A47"/>`
  return `<rect x="${IDLE_X + 16}" y="96" width="66" height="6" rx="1" fill="#E8D5A6"/><rect x="${IDLE_X + 14}" y="95" width="70" height="2" fill="${WHITE}"/>${castles}`
}

function podium(scene: Scene): string {
  return scene.main.activity === 'conduct'
    ? `<rect x="${PODIUM_X + 2}" y="${FLOOR - PODIUM_H}" width="50" height="${PODIUM_H}" fill="${DARK}"/><rect x="${PODIUM_X + 2}" y="${FLOOR - PODIUM_H}" width="50" height="2" fill="${METAL}"/>`
    : ''
}

// ---------------------------------------------------------------- usage

const PILE_SPOTS: [number, number][] = [[414, 0], [426, 3], [478, 1], [490, 4], [402, 2], [440, 5], [466, 2], [452, 6]]
const CARAFE_X = CABINET_X + 2
const CARAFE_Y = 59
const REFILL_IN = (CARAFE_X - DOOR_X) / MINI_SPEED
const REFILL_OUT = REFILL_IN * 2 + 1.2

function sheets(x: number, height: number): string {
  let out = ''
  for (let y = 0; y < height; y += 2) {
    const dx = (y * 7) % 3 - 1
    out += `<rect x="${x + dx}" y="${FLOOR - y - 2}" width="12" height="2" fill="${y % 4 ? '#F2EEE3' : '#D6D1C4'}"/>`
  }
  return out
}

// Paper piles up around the desk as the context fills; a compaction sweeps
// it into the bin.
function paperPile(scene: Scene, ctx: Ctx): string {
  const c = scene.usage.context ?? 0
  const count = Math.min(PILE_SPOTS.length, Math.ceil(c / 12.5))
  let pile = ''
  for (let i = 0; i < count; i++) {
    const [x, jitter] = PILE_SPOTS[i]!
    pile += sheets(x, Math.round(3 + (c / 100) * 10 + jitter / 2))
  }
  if (c >= 85) {
    pile +=
      `<rect x="${DESK_X + 6}" y="84" width="14" height="4" fill="#F2EEE3"/><rect x="${DESK_X + 8}" y="81" width="12" height="3" fill="#D6D1C4"/>` +
      [386, 498, 364].map((x, i) => `<circle cx="${x}" cy="${FLOOR - 2}" r="${2 + (i % 2)}" fill="#E8E4D8"/>`).join('')
  }
  const sweep = scene.compact
  if (!sweep) return pile
  const stream = [0, 1, 2, 3]
    .map(
      i =>
        `<rect width="6" height="3" fill="#F2EEE3"><animateTransform attributeName="transform" type="translate" values="${426 + i * 14} ${FLOOR - 4};${486 + i * 4} 80;${BIN_X + 4} 88" ` +
        `dur="0.9s" begin="${(i * 0.22).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="0.9s" begin="${(i * 0.22).toFixed(2)}s" repeatCount="indefinite"/></rect>`,
    )
    .join('')
  const flying = sweep.endedAt === null ? stream : `<g>${hideAt(from(ctx, sweep.endedAt) + 1)}${stream}</g>`
  const settled = sweep.endedAt === null ? '' : fadeOnce('1;0', '0;1', 1, from(ctx, sweep.endedAt))
  return `<g>${settled}${pile}</g>${flying}`
}

function bin(): string {
  return (
    `<rect x="${BIN_X}" y="88" width="9" height="14" fill="#5E8C4A"/><rect x="${BIN_X - 1}" y="86" width="11" height="3" fill="#4E7F3E"/>` +
    `<path d="M${BIN_X + 2.5} 96 l2 -3 l2 3 z" fill="none" stroke="#DDEFD5" stroke-width="0.8"/>`
  )
}

function gauge(scene: Scene): string {
  const { x: gx, y: gy } = GAUGE
  const c = scene.usage.context
  const angle = -120 + ((c ?? 0) / 100) * 240
  const arc = (start: number, end: number, color: string) => {
    const point = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180
      return `${(gx + 12 * Math.cos(rad)).toFixed(1)} ${(gy + 12 * Math.sin(rad)).toFixed(1)}`
    }
    return `<path d="M${point(start)} A12 12 0 0 1 ${point(end)}" fill="none" stroke="${color}" stroke-width="3"/>`
  }
  const steam =
    (c ?? 0) >= 80
      ? [0, 1, 2]
          .map(
            i =>
              `<circle cx="${gx - 4 + i * 4}" cy="${gy - 12}" r="2.5" fill="#EDEDED" opacity="0"><animate attributeName="opacity" values="0.7;0" dur="1.2s" begin="${(i * 0.4).toFixed(1)}s" repeatCount="indefinite"/>` +
              `<animate attributeName="cy" values="${gy - 12};${gy - 24}" dur="1.2s" begin="${(i * 0.4).toFixed(1)}s" repeatCount="indefinite"/></circle>`,
          )
          .join('')
      : ''
  const shake = (c ?? 0) >= 90 ? `<animateTransform attributeName="transform" type="rotate" values="${angle - 4} ${gx} ${gy};${angle + 4} ${gx} ${gy}" dur="0.15s" repeatCount="indefinite"/>` : ''
  return (
    `<circle cx="${gx}" cy="${gy}" r="16" fill="${METAL}"/><circle cx="${gx}" cy="${gy}" r="14.5" fill="#1B1F24"/>` +
    arc(-120, 24, '#5E8C4A') + arc(24, 84, '#D9A441') + arc(84, 120, '#E05A47') +
    `<g transform="rotate(${angle.toFixed(1)} ${gx} ${gy})">${shake}<rect x="${gx - 0.7}" y="${gy - 10}" width="1.4" height="11" fill="#F2EEE3"/></g><circle cx="${gx}" cy="${gy}" r="2" fill="${METAL}"/>` +
    `<text x="${gx}" y="${gy + 11}" font-size="5" text-anchor="middle" fill="#C9CBCF" ${FONT}>${c === null ? 'CTX' : `${Math.round(c)}%`}</text>${steam}`
  )
}

// A wall clock counting down to the 5-hour window's reset. It carries the next
// 35 minutes so it keeps ticking until the half-hourly redraw.
function clock(scene: Scene, ctx: Ctx): string {
  const x = 490
  const y = 14
  const resets = scene.usage.fiveHourResetsAt
  const used = Math.min(100, Math.max(0, scene.usage.fiveHour ?? 0))
  const face = (text: string) => `<text x="${x + 22}" y="${y + 15}">${text}</text>`
  let digits: string
  if (resets === null) {
    digits = face('--:--')
  } else {
    const left = Math.max(0, resets - ctx.now)
    const minutes = Math.floor(left / 60_000)
    const intoMinute = (left % 60_000) / 1000
    const frames: string[] = []
    for (let i = 0; i < 35 && minutes - i >= 0; i++) {
      const m = minutes - i
      const text = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
      const start = i === 0 ? null : intoMinute + (i - 1) * 60
      const end = intoMinute + i * 60
      frames.push(`<g${start === null ? '' : ' opacity="0"'}>${start === null ? '' : showAt(start)}${minutes - i > 0 ? hideAt(end) : ''}${face(text)}</g>`)
    }
    digits = frames.join('')
  }
  digits = `<g font-size="11" font-weight="700" text-anchor="middle" fill="#FFB347" ${MONO}>${digits}</g>`
  return (
    `<rect x="${x}" y="${y}" width="44" height="24" rx="2" fill="#141518" stroke="#3A3F47"/>` +
    `<text x="${x + 3}" y="${y + 5.5}" font-size="4" fill="#8A8F98" ${FONT}>5H RESET</text>${digits}` +
    `<rect x="${x + 4}" y="${y + 19}" width="36" height="2" fill="#2B2F36"/><rect x="${x + 4}" y="${y + 19}" width="${(36 * used / 100).toFixed(1)}" height="2" fill="${used >= 85 ? '#E05A47' : '#FFB347'}"/>`
  )
}

function coffeeLevel(week: number | null): number {
  return 9 * (1 - Math.min(100, Math.max(0, week ?? 0)) / 100)
}

function carafeShape(level: number, extra = ''): string {
  return (
    `<rect x="0" y="0" width="9" height="11" rx="1.5" fill="#A8DCEB" fill-opacity="0.18" stroke="#C9CBCF" stroke-width="0.8"/>` +
    `<rect x="1" y="${(10 - level).toFixed(1)}" width="7" height="${level.toFixed(1)}" fill="#6B4428">${extra}</rect>` +
    `<rect x="9" y="3" width="2" height="5" fill="none" stroke="#C9CBCF" stroke-width="0.8"/><rect x="-0.5" y="-1.5" width="10" height="2" fill="${DARK}"/>`
  )
}

// The coffee left in the carafe is the week's limit left; a reset brings a
// fresh carafe through the door.
function carafe(scene: Scene, ctx: Ctx): string {
  const level = coffeeLevel(scene.usage.week)
  if (!scene.refill) return `<g transform="translate(${CARAFE_X} ${CARAFE_Y})">${carafeShape(level)}</g>`
  const b = from(ctx, scene.refill.at) + REFILL_IN
  const before = coffeeLevel(scene.refill.from)
  const grow =
    `<animate attributeName="height" values="${before.toFixed(1)};${level.toFixed(1)}" dur="0.6s" begin="${sec(b)}" fill="freeze"/>` +
    `<animate attributeName="y" values="${(10 - before).toFixed(1)};${(10 - level).toFixed(1)}" dur="0.6s" begin="${sec(b)}" fill="freeze"/>`
  return `<g transform="translate(${CARAFE_X} ${CARAFE_Y})">${carafeShape(before, grow)}</g>`
}

// A helper in a delivery cap brings the fresh carafe and heads back out.
function delivery(scene: Scene, ctx: Ctx): string {
  if (!scene.refill) return ''
  const b = from(ctx, scene.refill.at) + DOOR_S
  const there = `${CARAFE_X - 22} ${MINI_Y}`
  return (
    `<g opacity="0" transform="translate(${DOOR_X} ${MINI_Y})">${showAt(b)}` +
    moveOnce([[0, `${DOOR_X} ${MINI_Y}`], [REFILL_IN, there], [REFILL_IN + 1.2, there], [REFILL_OUT, `${DOOR_X} ${MINI_Y}`]], b) +
    `<animate attributeName="opacity" values="1;0" dur="0.3s" begin="${sec(b + REFILL_OUT)}" fill="freeze"/>` +
    `<g transform="scale(0.5)">${crab({ fill: '#7FB3E0', legs: 'trot', beat: 0.1, bob: 2, outfit: hat('cap') })}</g>` +
    `<g transform="translate(15 -8)">${hideAt(b + REFILL_IN)}${carafeShape(9)}</g></g>`
  )
}

// ---------------------------------------------------------------- helpers

type RoleKind = 'work' | 'toys' | 'player' | 'ref' | 'goalieA' | 'goalieB' | 'sand' | 'tower' | 'fight' | 'merge' | 'laptop'
type Role = { kind: RoleKind; x: number; y: number; stool: boolean }

function seatedOf(scene: Scene, include?: Mini): Mini[] {
  return scene.minis
    .filter(m => m.seat >= 0 && (m.leftAt === null || m.id === include?.id))
    .sort((a, b) => a.seat - b.seat)
}

function footballRoles(list: Mini[], out: Map<string, Role>) {
  if (list.length < 2) {
    list.forEach((m, k) => out.set(m.id, { kind: 'toys', x: TOY_SPOTS[k]!, y: MINI_Y, stool: false }))
    return
  }
  const players = [...list]
  if (list.length >= 5) out.set(players.pop()!.id, { kind: 'ref', x: 272, y: MINI_Y, stool: false })
  if (list.length >= 6) {
    out.set(players.shift()!.id, { kind: 'goalieA', x: 156, y: MINI_Y, stool: false })
    out.set(players.pop()!.id, { kind: 'goalieB', x: 390, y: MINI_Y, stool: false })
  }
  const spread = (i: number) => (players.length === 1 ? 276 : Math.round(188 + (i * 176) / (players.length - 1)))
  players.forEach((m, i) => out.set(m.id, { kind: 'player', x: spread(i), y: MINI_Y, stool: false }))
}

// Where each helper is and what it does for a crew mode. Helpers past the six
// desks sit with laptops by the shelf or the plant whatever the mode.
function rolesFor(mode: CrewMode, seated: Mini[], seed: number): Map<string, Role> {
  const out = new Map<string, Role>()
  const work = (m: Mini): Role => ({ kind: 'work', x: seatX(m.seat), y: STOOL_Y, stool: true })
  const assign = (group: Mini[], what: 'work' | 'toys' | 'football' | 'sand') => {
    if (what === 'football') return footballRoles(group, out)
    group.forEach((m, k) => {
      if (what === 'work') out.set(m.id, work(m))
      else if (what === 'toys') out.set(m.id, { kind: 'toys', x: TOY_SPOTS[k % TOY_SPOTS.length]!, y: MINI_Y, stool: false })
      else out.set(m.id, { kind: 'sand', x: SAND_SPOTS[k % SAND_SPOTS.length]!, y: MINI_SIT_Y, stool: false })
    })
  }
  switch (mode) {
    case 'work':
    case 'toys':
    case 'football':
    case 'sand':
      assign(seated, mode)
      break
    case 'split': {
      const half = Math.ceil(seated.length / 2)
      const [a, b] = [seated.slice(0, half), seated.slice(half)]
      const variant = Math.abs(Math.floor(seed / 1000)) % 3
      if (variant === 0) (assign(a, 'football'), assign(b, 'sand'))
      else if (variant === 1) (assign(a, 'work'), assign(b, 'sand'))
      else (assign(a, 'toys'), assign(b, b.length >= 2 ? 'football' : 'sand'))
      break
    }
    case 'tower':
      seated.forEach((m, k) => out.set(m.id, { kind: 'tower', x: CENTER_X, y: MINI_Y - k * 12, stool: false }))
      break
    case 'fight':
      seated.forEach((m, k) => out.set(m.id, { kind: 'fight', x: CENTER_X - 14 + (k % 4) * 9, y: MINI_Y, stool: false }))
      break
    case 'merge':
      seated.forEach((m, k) => out.set(m.id, k < 2 ? { kind: 'merge', x: CENTER_X - 6 + k * 12, y: MINI_Y, stool: false } : work(m)))
      break
  }
  return out
}

function laptopRole(scene: Scene, mini: Mini): Role {
  const overflow = scene.minis.filter(m => m.seat < 0)
  const j = Math.max(0, overflow.findIndex(m => m.id === mini.id))
  return { kind: 'laptop', x: LAPTOP_SPOTS[j % LAPTOP_SPOTS.length]!, y: MINI_SIT_Y, stool: false }
}

// A walk between two spots: off the stool (or down the tower), across the
// floor, then up onto the stool (or the tower, or down to sit).
function walkPoints(a: Spot, b: Spot): [number, string][] {
  const points: [number, string][] = [[0, `${a.x} ${a.y}`]]
  let t = 0
  if (a.y !== MINI_Y) {
    t += a.stool ? MINI_HOP : Math.abs(MINI_Y - a.y) / CLIMB_SPEED
    points.push([t, `${a.x} ${MINI_Y}`])
  }
  if (a.x !== b.x) {
    t += Math.abs(b.x - a.x) / MINI_SPEED
    points.push([t, `${b.x} ${MINI_Y}`])
  }
  if (b.y !== MINI_Y) {
    t += b.stool ? MINI_HOP : Math.abs(MINI_Y - b.y) / CLIMB_SPEED
    points.push([t, `${b.x} ${b.y}`])
  }
  return points
}

type Spot = { x: number; y: number; stool: boolean }
const DOOR_SPOT: Spot = { x: DOOR_X, y: MINI_Y, stool: false }

type Segment = { begin: number; points: [number, string][]; to: Role | 'gone' }
type Timeline = {
  segments: Segment[]
  arrive: number
  leaveEnd: number | null
  reenter: number | null
  workFrom: number | null
  workUntil: number | null
}

function fusionPair(scene: Scene): Mini[] {
  return seatedOf(scene).filter(m => m.leftAt === null).slice(0, 2)
}

function miniTimeline(scene: Scene, mini: Mini, ctx: Ctx): Timeline {
  const { crew } = scene
  const seated = seatedOf(scene, mini)
  const roleIn = (mode: CrewMode, seed: number): Role => (mini.seat < 0 ? laptopRole(scene, mini) : rolesFor(mode, seated, seed).get(mini.id)!)
  const now = roleIn(crew.mode, crew.since)
  const before = roleIn(crew.prev, crew.prevSince)
  const arrive = from(ctx, mini.arrivedAt) + DOOR_S
  const arrivedBeforeCrew = mini.arrivedAt < crew.since
  const first = arrivedBeforeCrew ? before : now
  const segments: Segment[] = [{ begin: arrive, points: walkPoints(DOOR_SPOT, first), to: first }]
  const leftBeforeCrew = mini.leftAt !== null && mini.leftAt < crew.since
  // The two that graduated after a merge come back in through the door.
  const graduated = crew.prev === 'merge' && fusionPair(scene).some(m => m.id === mini.id)
  let reenter: number | null = null
  if (arrivedBeforeCrew && !leftBeforeCrew && crew.prev !== crew.mode && mini.seat >= 0) {
    const k = seated.findIndex(m => m.id === mini.id)
    const begin = from(ctx, crew.since) + Math.max(0, k) * 0.15
    const pts = walkPoints(graduated ? DOOR_SPOT : before, now)
    if (graduated) reenter = begin
    if (pts.length > 1) segments.push({ begin, points: pts, to: now })
  }
  let leaveEnd: number | null = null
  if (mini.leftAt !== null) {
    const pts = walkPoints(leftBeforeCrew ? before : now, DOOR_SPOT)
    const begin = from(ctx, mini.leftAt)
    segments.push({ begin, points: pts, to: 'gone' })
    leaveEnd = begin + pts[pts.length - 1]![0]
  }
  // When the helper sits at its own screen, so the screen lights up with it.
  let workFrom: number | null = null
  let workUntil: number | null = null
  for (const s of segments) {
    const end = s.begin + s.points[s.points.length - 1]![0]
    const working = s.to !== 'gone' && s.to.kind === 'work'
    if (working && workFrom === null) workFrom = end
    else if (!working && workFrom !== null && workUntil === null) workUntil = s.begin
  }
  return { segments, arrive, leaveEnd, reenter, workFrom, workUntil }
}

type Extras = { look?: string; lookAnim?: string; beat: number; bobBegin?: number; above: string }

function workExtras(scene: Scene, mini: Mini, ctx: Ctx): Extras {
  const m = scene.main
  const loopBegin = actBegin(scene, ctx)
  const x = seatX(mini.seat)
  switch (m.activity) {
    case 'scurry':
      return {
        lookAnim: `<animateTransform attributeName="transform" type="translate" values="2 0;-2 0" keyTimes="0;0.5" calcMode="discrete" dur="${sec(PATHS.scurry.loop)}" begin="${sec(loopBegin)}" repeatCount="indefinite"/>`,
        beat: 0.3,
        above:
          `<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.3;0.6" calcMode="discrete" dur="${sec(3 + mini.seat * 0.7)}" begin="${sec(mini.seat * 0.9)}" repeatCount="indefinite"/>` +
          `<rect x="${x + 4}" y="52" width="18" height="10" rx="4" fill="#EDEDED"/><text x="${x + 13}" y="60" font-size="9" text-anchor="middle" fill="#555" ${FONT}>…</text></g>`,
      }
    case 'standup':
      return { look: '-2 -1', beat: 0.6, above: '' }
    case 'conduct':
      return {
        look: '0 -1',
        beat: 0.5,
        bobBegin: loopBegin,
        above:
          `<text x="${x + 10}" y="64" font-size="10" fill="${ORANGE}" ${FONT} opacity="0">${mini.seat % 2 ? '♪' : '♫'}` +
          `<animate attributeName="opacity" values="0;1;0" dur="2s" begin="${sec(mini.seat * 0.33)}" repeatCount="indefinite"/>` +
          `<animateTransform attributeName="transform" type="translate" values="0 0;4 -16" dur="2s" begin="${sec(mini.seat * 0.33)}" repeatCount="indefinite"/></text>`,
      }
    case 'coffee': {
      const at = seatVisits('coffee')[mini.seat]! / PATHS.coffee.loop
      return {
        look: '2 0',
        beat: 0.16,
        above: `<g opacity="0"><animate attributeName="opacity" values="0;1" keyTimes="0;${at.toFixed(4)}" calcMode="discrete" dur="${sec(PATHS.coffee.loop)}" begin="${sec(loopBegin)}" repeatCount="indefinite"/>${mug(x + 35, 82)}</g>`,
      }
    }
    case 'inspect': {
      const at = seatVisits('inspect')[mini.seat]! / PATHS.inspect.loop
      return {
        look: '2 0',
        beat: 0.16,
        above:
          `<g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;${at.toFixed(4)};${Math.min(1, at + 0.2).toFixed(4)}" calcMode="discrete" dur="${sec(PATHS.inspect.loop)}" begin="${sec(loopBegin)}" repeatCount="indefinite"/>` +
          `<text x="${x + 12}" y="62" font-size="12" font-weight="700" text-anchor="middle" fill="#7FB37F" ${FONT}>✓</text></g>`,
      }
    }
    default:
      return { look: '2 0', beat: 0.14, above: '' }
  }
}

// Seats are distinct while helpers are present, and a stride of 3 over 10 tops
// keeps the six seats in six different tops. Agent ids that arrive together
// often hash to neighbouring tints, so the tint alone repeats tops.
function everyday(mini: Mini): { hat: string; top: string } {
  const pick = mini.seat >= 0 ? mini.seat * 3 + 1 : Math.imul(mini.tint + 1, 2654435761) >>> 8
  return { hat: HATS[mini.tint % HATS.length]!, top: TOPS[pick % TOPS.length]! }
}

function outfitFor(mini: Mini, kind: RoleKind | 'walk'): string {
  const wear = everyday(mini)
  if (kind === 'ref') return hat(wear.hat) + top('referee')
  if (kind === 'goalieA' || kind === 'goalieB') return hat('cap') + top(kind)
  return top(wear.top) + hat(wear.hat)
}

function rolePose(kind: RoleKind, fill: string, extras: Extras, outfit: string, hop: string): string {
  switch (kind) {
    case 'work':
      return crab({ fill, legs: 'still', bob: 2, beat: extras.beat, bobBegin: extras.bobBegin, look: extras.look, lookAnim: extras.lookAnim, eyes: 'blink', outfit })
    case 'toys':
      return crab({ fill, legs: 'trot', beat: 0.3, bob: 8, eyes: 'blink', look: '-2 -1', outfit })
    case 'player':
      return `<g>${hop}${crab({ fill, legs: 'trot', beat: 0.16, bob: 2, look: '2 0', outfit })}</g>`
    case 'ref':
      return (
        crab({ fill, legs: 'still', eyes: 'blink', look: '-2 0', outfit }) +
        `<rect x="44" y="12" width="5" height="3" fill="#C9CBCF"><animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite"/></rect>`
      )
    case 'goalieA':
    case 'goalieB':
      return `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0;0 0" dur="1.6s" repeatCount="indefinite"/>${crab({ fill, legs: 'still', eyes: 'blink', look: kind === 'goalieA' ? '2 0' : '-2 0', outfit })}</g>`
    case 'sand':
      return (
        crab({ fill, legs: 'none', eyes: 'blink', look: '0 2', outfit }) +
        `<g transform="translate(48 18)"><g><animateTransform attributeName="transform" type="rotate" values="-30;20;-30" dur="0.9s" repeatCount="indefinite"/>` +
        `<rect x="0" y="0" width="3" height="10" fill="#8B5E3C"/><rect x="-2" y="9" width="7" height="5" fill="#E05A47"/></g></g>`
      )
    case 'tower':
      return `<g><animateTransform attributeName="transform" type="translate" values="-2 0;2 0;-2 0" dur="1.6s" repeatCount="indefinite"/>${crab({ fill, legs: 'still', eyes: 'blink', look: '0 -1', outfit })}</g>`
    case 'fight':
      return crab({ fill, legs: 'trot', beat: 0.06, bob: 4, look: '2 0', outfit })
    case 'merge':
      return crab({ fill, legs: 'still', eyes: 'blink', outfit })
    case 'laptop':
      return (
        bobbing(crab({ fill, legs: 'none', eyes: 'blink', look: '0 1', outfit }), 0.15, 1) +
        `<rect x="14" y="10" width="26" height="15" rx="1" fill="#C9CBCF"/><circle cx="27" cy="17" r="2" fill="${ORANGE}" opacity="0.8"/>` +
        `<rect x="10" y="25" width="34" height="3" fill="${METAL}"/>`
      )
  }
}

// Football: passes along the ground with the odd header, run on one loop so
// the ball and the players' hops stay in step.
type Match = { ball: string; goals: string; hops: Map<string, string> }

function footballMatch(scene: Scene, roles: Map<string, Role>, ctx: Ctx): Match | null {
  const players = [...roles.entries()].filter(([, r]) => r.kind === 'player' || r.kind === 'goalieA' || r.kind === 'goalieB')
  if (players.length < 2) return null
  const random = seeded(scene.crew.since)
  const begin = from(ctx, scene.crew.since) + 2
  const ground = FLOOR - 3
  const keys: [number, number, number][] = []
  const heads = new Map<string, number[]>()
  let t = 0
  let at = 0
  const passes = 10
  for (let i = 0; i < passes; i++) {
    let to = Math.floor(random() * players.length)
    if (to === at) to = (to + 1) % players.length
    const a = players[at]![1]
    const [toId, b] = players[to]!
    const ax = a.x + 13
    const bx = b.x + 13
    const header = i % 3 === 2
    keys.push([t, ax, ground])
    if (header) {
      keys.push([t + 0.5, (ax + bx) / 2, ground - 34])
      keys.push([t + 1, bx, ground - 14])
      heads.set(toId, [...(heads.get(toId) ?? []), t + 1])
      t += 1.25
    } else {
      t += 0.8
    }
    at = to
  }
  keys.push([t, players[at]![1].x + 13, ground])
  const loop = t + 0.6
  keys.push([loop, players[0]![1].x + 13, ground])
  const ball =
    `<g opacity="0">${showAt(begin)}<circle r="2.5" fill="#F2F2EF" stroke="#2B2F36" stroke-width="0.8">` +
    `<animateTransform attributeName="transform" type="translate" values="${keys.map(([, x, y]) => `${x.toFixed(1)} ${y}`).join(';')}" ` +
    `keyTimes="${keys.map(([k]) => (k / loop).toFixed(4)).join(';')}" dur="${sec(loop)}" begin="${sec(begin)}" repeatCount="indefinite"/></circle></g>`
  const hops = new Map<string, string>()
  for (const [id, times] of heads) {
    const points: [number, number][] = [[0, 0]]
    for (const h of times) points.push([Math.max(0, h - 0.25) / loop, 0], [h / loop, -10], [Math.min(loop, h + 0.25) / loop, 0])
    points.push([1, 0])
    hops.set(
      id,
      `<animateTransform attributeName="transform" type="translate" values="${points.map(([, y]) => `0 ${y}`).join(';')}" keyTimes="${points.map(([k]) => k.toFixed(4)).join(';')}" dur="${sec(loop)}" begin="${sec(begin)}" repeatCount="indefinite"/>`,
    )
  }
  const keepers = players.some(([, r]) => r.kind === 'goalieA')
  const goal = (x: number) =>
    `<rect x="${x}" y="${FLOOR - 18}" width="2" height="18" fill="#F2F2EF"/><rect x="${x + 12}" y="${FLOOR - 18}" width="2" height="18" fill="#F2F2EF"/><rect x="${x}" y="${FLOOR - 18}" width="14" height="2" fill="#F2F2EF"/>` +
    `<path d="M${x + 2} ${FLOOR - 16} h10 M${x + 2} ${FLOOR - 10} h10 M${x + 2} ${FLOOR - 4} h10" stroke="#C9CBCF" stroke-width="0.5"/>`
  return { ball, goals: keepers ? goal(142) + goal(408) : '', hops }
}

function miniSvg(scene: Scene, mini: Mini, ctx: Ctx, t: Timeline, hop: string): string {
  const fill = TINTS[mini.tint % TINTS.length]!
  const extras = mini.seat >= 0 ? workExtras(scene, mini, ctx) : { beat: 0.14, above: '' }

  let motion = ''
  const windows: { pose: RoleKind | 'walk'; from: number; until: number | null }[] = []
  for (const s of t.segments) {
    motion += moveOnce(s.points, s.begin)
    const end = s.begin + s.points[s.points.length - 1]![0]
    const last = windows[windows.length - 1]
    if (last && last.until === null) last.until = s.begin
    windows.push({ pose: 'walk', from: s.begin, until: end })
    if (s.to !== 'gone') windows.push({ pose: s.to.kind, from: end, until: null })
    else motion += `<animate attributeName="opacity" values="1;0" dur="0.3s" begin="${sec(end)}" fill="freeze"/>`
  }

  const poses = [...new Set(windows.map(w => w.pose))]
  const groups = poses
    .map(pose => {
      const sets = windows
        .filter(w => w.pose === pose)
        .map(w => showAt(w.from) + (w.until !== null ? hideAt(w.until) : ''))
        .join('')
      const outfit = outfitFor(mini, pose)
      const body = pose === 'walk' ? crab({ fill, legs: 'trot', beat: 0.1, bob: 2, outfit }) : rolePose(pose, fill, extras, outfit, hop)
      return `<g opacity="0">${sets}${body}</g>`
    })
    .join('')

  const work = windows.find(w => w.pose === 'work')
  const above =
    extras.above && work
      ? `<g opacity="0">${showAt(work.from)}${work.until !== null ? hideAt(work.until) : ''}${extras.above}</g>`
      : ''
  const svg = `<g opacity="0" transform="translate(${DOOR_X} ${MINI_Y})">${showAt(t.arrive)}${motion}<g transform="scale(0.5)">${groups}</g></g>${above}`
  return t.reenter === null ? svg : `<g opacity="0">${showAt(t.reenter)}${svg}</g>`
}

// Dust, claws and stars while the helpers fight over a conflict.
function scuffle(scene: Scene, ctx: Ctx): string {
  if (scene.crew.mode !== 'fight') return ''
  const b = from(ctx, scene.crew.since) + 1.6
  const puffs = [0, 1, 2, 3, 4]
    .map(
      i =>
        `<circle cx="${CENTER_X + 10 + (i - 2) * 9}" cy="${MINI_Y + 6 - (i % 2) * 5}" r="9" fill="#C9CBCF" opacity="0.85">` +
        `<animate attributeName="r" values="8;11;8" dur="${(0.4 + i * 0.07).toFixed(2)}s" repeatCount="indefinite"/></circle>`,
    )
    .join('')
  const bits = ['✶', '✷', '✶', '✦']
    .map(
      (glyph, i) =>
        `<text x="${CENTER_X + 10}" y="${MINI_Y}" font-size="8" fill="${i % 2 ? ORANGE : '#E8C07A'}" ${FONT}>${glyph}` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;${[-24, 22, -14, 28][i]} ${[-18, -14, -26, -6][i]}" dur="0.7s" begin="${(i * 0.17).toFixed(2)}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="1;0" dur="0.7s" begin="${(i * 0.17).toFixed(2)}s" repeatCount="indefinite"/></text>`,
    )
    .join('')
  const claw = `<rect x="${CENTER_X + 4}" y="${MINI_Y - 8}" width="6" height="3" fill="${ORANGE}"><animateTransform attributeName="transform" type="translate" values="0 0;-12 -4;8 -2;0 0" dur="0.5s" repeatCount="indefinite"/></rect>`
  return `<g opacity="0">${showAt(b)}${puffs}${claw}${bits}</g>`
}

const FUSE_S = 2.6
const GRAD_S = 1.4

// When the graduate reaches the door, or null when nobody is graduating.
function graduationExit(scene: Scene, ctx: Ctx): number | null {
  if (scene.crew.mode !== 'merge' || fusionPair(scene).length < 2) return null
  return from(ctx, scene.crew.since) + FUSE_S + GRAD_S + (CENTER_X - DOOR_X) / MINI_SPEED
}

// Two helpers bump together into one bigger helper in a mortarboard, who
// walks out of the door.
function fusion(scene: Scene, ctx: Ctx): string {
  const exit = graduationExit(scene, ctx)
  if (exit === null) return ''
  const pair = fusionPair(scene)
  const b = from(ctx, scene.crew.since) + FUSE_S
  const first = pair[0]!
  const fill = TINTS[first.tint % TINTS.length]!
  const poof =
    `<g opacity="0">${fadeOnce('0;1;0', '0;0.3;1', 0.6, b)}` +
    [0, 1, 2].map(i => `<circle cx="${CENTER_X + 8 + (i - 1) * 9}" cy="${MINI_Y + 4}" r="8" fill="#EDEDED"/>`).join('') +
    `</g>`
  const graduate =
    `<g opacity="0" transform="translate(${CENTER_X - 4} ${MINI_Y - 9})">${showAt(b + 0.2)}` +
    moveOnce([[0, `${CENTER_X - 4} ${MINI_Y - 9}`], [GRAD_S - 0.2, `${CENTER_X - 4} ${MINI_Y - 9}`], [exit - b - 0.2, `${DOOR_X} ${MINI_Y - 9}`]], b + 0.2) +
    `<animate attributeName="opacity" values="1;0" dur="0.3s" begin="${sec(exit)}" fill="freeze"/>` +
    `<g transform="scale(0.8)">${swap(
      crab({ fill, legs: 'still', bob: 3, beat: 0.25, eyes: 'blink', rows: CHEER, outfit: top(everyday(first).top) + hat('grad') }),
      crab({ fill, legs: 'trot', beat: 0.12, bob: 2, outfit: top(everyday(first).top) + hat('grad') }),
      b + GRAD_S,
    )}</g></g>`
  const cheer = `<g opacity="0">${showAt(b + 0.2)}${hideAt(b + GRAD_S)}${sparkles([[CENTER_X - 10, MINI_Y - 20], [CENTER_X + 24, MINI_Y - 16]], '#E8C07A')}</g>`
  return poof + graduate + cheer
}

// The pair that fuses hides once the graduate stands in for them.
function fusedAway(scene: Scene, mini: Mini, ctx: Ctx, svg: string): string {
  if (graduationExit(scene, ctx) === null || !fusionPair(scene).some(m => m.id === mini.id)) return svg
  return `<g>${hideAt(from(ctx, scene.crew.since) + FUSE_S + 0.2)}${svg}</g>`
}

// ---------------------------------------------------------------- label

const GIT_LABELS = {
  pull: 'Pulled the latest',
  push: 'Pushed to origin',
  commit: 'Committed',
  mergeDocs: 'Merged',
  mergeCrew: 'Merged: two helpers graduate',
  conflict: 'Merge conflict! Claws out',
  pr: 'Opened a pull request',
  testsPass: 'Tests passed',
  testsFail: 'Tests failed',
} as const

const CREW_LABELS: Partial<Record<CrewMode, string>> = {
  toys: 'Helpers on a break',
  football: 'Football match!',
  sand: 'Sandcastles under the lamp',
  split: 'Helpers split up',
  tower: 'Crab tower!',
}

// Drawn up from the frame's bottom edge.
function pill(text: string): string {
  const width = Math.round(text.length * 6.4 + 18)
  return (
    `<g><rect x="6" y="-21" width="${width}" height="17" rx="8.5" fill="${ORANGE}" fill-opacity="0.16"/>` +
    `<text x="15" y="-9" font-size="11" font-weight="500" ${FONT} fill="${ORANGE}">${escape(text)}</text></g>`
  )
}

// Only what Claude's own status line does not already say.
export function labelOf(scene: Scene): string {
  if (scene.wait === 'permission') return 'Waiting on your permission'
  if (scene.wait === 'question') return 'Waiting on your answer'
  if (scene.compact) return 'Tidying up the context'
  if (scene.git) return GIT_LABELS[scene.git.act]
  if (scene.refill) return 'Fresh coffee: the weekly limit reset'
  const parts: string[] = []
  const helpers = running(scene).length
  if (helpers > 0) parts.push(CREW_LABELS[scene.crew.mode] ?? `${helpers} helper${helpers === 1 ? '' : 's'}`)
  const c = scene.usage.context ?? 0
  if (c >= 80) parts.push(`Context ${Math.round(c)}%`)
  return parts.join(' · ')
}

function label(scene: Scene, ctx: Ctx): string {
  const text = labelOf(scene)
  if (text !== '') return pill(text)
  if (scene.turn || scene.main.activity !== 'idle') return ''
  // Idle with nobody around: the label follows what Clawd is doing in his chair.
  const begin = actBegin(scene, ctx)
  return (
    `<g>${phase([0, 0.4], IDLE_LOOP, begin)}${pill('Reading')}</g>` +
    `<g opacity="0">${phase([0.4, 0.8], IDLE_LOOP, begin)}${pill('Napping')}</g>` +
    `<g opacity="0">${phase([0.8, 1], IDLE_LOOP, begin)}${pill('Tea break')}</g>`
  )
}

// ---------------------------------------------------------------- frame

const BULBS = ['#FFD58A', '#FF8FB1', '#8FD3FF', '#B6F28F']
// Far enough past the room's box to reach any edge the band can have.
const BEYOND = 4000
const SPAN = W / 4

// The part of the room a band shows, in room units: all of it in a wide band,
// narrowing towards the focus as the band narrows.
export type View = { x: number; span: number }
export const FULL_VIEW: View = { x: 0, span: W }
// Clawd's desk, the helpers' terminals and his couch.
export const FOCUS_VIEW: View = { x: 138, span: 468 }

// The frame's real size is only estimated (the band reports cells, and the
// sandboxed frame runs no script), so every layer shares one viewBox and one
// `meet` scale and differs only in which edge it holds to. Whatever the frame
// adds around the view shows more room, floor, wall and ceiling, never an
// empty band.
function lowered(body: string, fixed: boolean): string {
  return fixed ? body : `<g class="low">${body}</g>`
}

function layer(align: string, body: string, view: View, className = ''): string {
  return (
    `<svg${className === '' ? '' : ` class="${className}"`} width="100%" height="100%" viewBox="${view.x} 0 ${view.span} ${H}" ` +
    `preserveAspectRatio="${align} meet" overflow="visible">${body}</svg>`
  )
}

// The app keeps the <style> block but not inline style attributes, so every
// rule lives here. `.fill`: inline in an HTML frame a 100% height resolves
// against a body of no height and collapses to 150px; viewport units hold to
// the frame however it is loaded. `.low`: a frame taller than the view has
// 100vh - (128/span)·100vw spare, split evenly by the centred layers; moving
// the room and floor down a quarter of it leaves three quarters to wall and
// ceiling, and no spare height means no move. With the room lowered, the
// string of lights needs a frame no wider than span:156 and the pendants
// span:176.
function frameCss(view: View): string {
  const ratio = (units: number) => `${Math.round((view.span / units) * 100)}/100`
  return (
    `<style>svg{color-scheme:light dark}svg svg{overflow:visible}.fill{position:fixed;inset:0;width:100vw;height:100vh}` +
    `.low{transform:translateY(max(0px,calc(25vh - ${((H / view.span) * 25).toFixed(3)}vw)))}` +
    `@media (min-aspect-ratio: ${ratio(156)}){.ceil{display:none}}@media (min-aspect-ratio: ${ratio(176)}){.pend{display:none}}</style>`
  )
}

function backdrop(scene: Scene): string {
  const night =
    scene.daypart === 'night'
      ? `<rect x="${-BEYOND}" y="${-BEYOND}" width="${W + 2 * BEYOND}" height="${FLOOR + BEYOND}" fill="#0B1026" opacity="0.18"/>`
      : ''
  return (
    `<rect x="${-BEYOND}" y="${FLOOR}" width="${W + 2 * BEYOND}" height="${BEYOND}" fill="#000" fill-opacity="0.16"/>` +
    `<rect x="${-BEYOND}" y="${FLOOR + 8}" width="${W + 2 * BEYOND}" height="${BEYOND}" fill="url(#planks)"/>` +
    night
  )
}

function pendants(): string {
  return [260, 456]
    .map(
      x =>
        `<rect x="${x - 0.5}" y="${-BEYOND}" width="1" height="${BEYOND - 12}" fill="#4A4F57"/>` +
        `<path d="M${x - 9} -4 Q${x} -14 ${x + 9} -4 Z" fill="${DARK}"/>` +
        `<g class="lamp-light"><ellipse cx="${x}" cy="2" rx="22" ry="10" fill="#FFD58A" opacity="0.1"/></g>`,
    )
    .join('')
}

// Arches of a quarter room each, from half a room to the left to half past
// the right, for a band wider than the room's proportions.
function ceiling(scene: Scene): string {
  const y = 10
  const sag = 4
  let path = `M${-2 * SPAN} ${y}`
  for (let x = -2 * SPAN; x < W + 2 * SPAN; x += SPAN) path += ` Q${x + SPAN / 2} ${y + 2 * sag} ${x + SPAN} ${y}`
  let lights = `<path d="${path}" fill="none" stroke="#4A4F57" stroke-width="1"/>`
  for (let x = -2 * SPAN + 20, i = 0; x < W + 2 * SPAN; x += 39, i++) {
    const t = (((x % SPAN) + SPAN) % SPAN) / SPAN
    const by = y + 4 * sag * t * (1 - t) + 2
    lights +=
      `<circle cx="${x}" cy="${by.toFixed(1)}" r="1.8" fill="${BULBS[i % BULBS.length]}">` +
      `<animate attributeName="opacity" values="1;0.35;1" dur="${(1.6 + (i % 5) * 0.37).toFixed(2)}s" begin="${((i * 0.29) % 2).toFixed(2)}s" repeatCount="indefinite"/></circle>`
  }
  const on = scene.daypart === 'night' || scene.daypart === 'dusk'
  return (
    `<rect x="${-BEYOND}" y="${-BEYOND}" width="${W + 2 * BEYOND}" height="${BEYOND + 3}" fill="#3A3F47"/>` +
    `<g opacity="${on ? 1 : 0.55}">${lights}</g>`
  )
}

// ---------------------------------------------------------------- scene

const HOLD_S = 36000

// Chrome drops the frozen end value of an animation whose whole interval lies
// before the document loaded, and every redraw places finished walks there. So
// each one-shot animation is stretched to ten hours: it plays its motion in
// the first seconds and then holds its last value while still active.
function holdFrozen(svg: string): string {
  return svg.replace(/<(animate|animateTransform)\b([^>]*?)fill="freeze"([^>]*)\/>/g, (_tag, name: string, a: string, b: string) => {
    const attrs = a + b
    const get = (key: string) => new RegExp(`\\b${key}="([^"]*)"`).exec(attrs)?.[1]
    const values = get('values')!.split(';')
    const dur = parseFloat(get('dur')!)
    const scale = dur / HOLD_S
    const times = get('keyTimes')?.split(';').map(Number) ?? values.map((_, i) => i / (values.length - 1))
    const splines = get('keySplines')
    let rest = attrs
      .replace(/\bvalues="[^"]*"/, '')
      .replace(/\bkeyTimes="[^"]*"/, '')
      .replace(/\bkeySplines="[^"]*"/, '')
      .replace(/\bdur="[^"]*"/, '')
    if (splines) rest += ` keySplines="${splines};0 0 1 1"`
    return (
      `<${name}${rest} values="${[...values, values[values.length - 1]].join(';')}" ` +
      `keyTimes="${[...times.map(t => (t * scale).toFixed(7)), '1'].join(';')}" dur="${HOLD_S}s" fill="freeze"/>`
    )
  })
}

// `lite` leaves out the weather and the helpers' screen rain, for a crowded
// scene that would otherwise pass the Svg element's size limit. `fixed` gives
// the drawing the view's own proportions, for a surface that sizes the frame
// from the markup; otherwise it fills whatever frame it is given.
export function sceneSvg(scene: Scene, now: number, lite = false, view = FULL_VIEW, fixed = false): string {
  const ctx: Ctx = { now, lite }
  mainFill = flushOf(scene.usage)
  shared = new Map()
  const seated = seatedOf(scene)
  const roles = rolesFor(scene.crew.mode, seated, scene.crew.since)
  const timelines = new Map(scene.minis.map(m => [m.id, miniTimeline(scene, m, ctx)]))
  const match = footballMatch(scene, roles, ctx)
  const bySeat = new Map(scene.minis.filter(m => m.seat >= 0).map(m => [m.seat, timelines.get(m.id)!]))
  const room =
    `<rect x="0" y="${FLOOR - 1}" width="${W}" height="1" fill="#FFFFFF" fill-opacity="0.06"/>` +
    windowView(scene, ctx) +
    gitBoard(scene, ctx) +
    statusLight(scene, ctx) +
    glassBoard(scene, ctx) +
    gauge(scene) +
    clock(scene, ctx) +
    slidingDoor(scene, ctx, timelines) +
    inbox(scene, ctx) +
    cubeShelf() +
    toyCorner(roles, ctx, scene) +
    Array.from({ length: 6 }, (_, seat) => {
      const t = bySeat.get(seat)
      return desk(seat, t?.workFrom ?? null, t?.workUntil ?? null, ctx.lite)
    }).join('') +
    mainDesk(scene, ctx) +
    carafe(scene, ctx) +
    cabinet(scene, ctx) +
    bin() +
    lounge(scene) +
    sandbox(roles) +
    podium(scene) +
    (match?.goals ?? '') +
    scene.minis.map(mini => fusedAway(scene, mini, ctx, miniSvg(scene, mini, ctx, timelines.get(mini.id)!, match?.hops.get(mini.id) ?? ''))).join('') +
    (match?.ball ?? '') +
    fusion(scene, ctx) +
    scuffle(scene, ctx) +
    mainSvg(scene, ctx) +
    paperPile(scene, ctx) +
    delivery(scene, ctx) +
    whistle(scene, ctx)
  const planks = `<pattern id="planks" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="1" fill="#FFFFFF" fill-opacity="0.03"/></pattern>`
  // The pill keeps its size whatever the view: in the frame's own pixels,
  // or in the view's units where the drawing has a fixed viewBox.
  const pillAt = `<svg y="100%" width="1" height="1" overflow="visible">${label(scene, ctx)}</svg>`
  const inner =
    frameCss(view) +
    lowered(layer('xMidYMid', backdrop(scene), view), fixed) +
    layer('xMidYMin', ceiling(scene), view, 'ceil') +
    lowered(layer('xMidYMid', `<g class="pend">${pendants()}</g>` + room, view), fixed) +
    pillAt
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"${fixed ? ` viewBox="0 0 ${view.span} ${H}"` : ''} shape-rendering="crispEdges"` +
    `${fixed ? '' : ' class="fill"'}>${holdFrozen(`<defs>${planks}${[...shared.values()].join('')}</defs>${inner}`)}</svg>`
  )
}
