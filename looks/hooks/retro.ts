import { makeColors } from './make-colors.js'
import type { LooksFeed } from '../types'
import { EMPTY_FEED, escapeXml, seconds } from './feed-state'
import { GUTTER_CSS } from './gutter'
import type { Hotspot } from './hotspot'
import { svg } from './kit'
import type { Look } from './look'
import {
  badge,
  bevel,
  CALENDAR,
  CHIP,
  ERROR_GLYPH,
  HOURGLASS,
  INFO_GLYPH,
  modelName,
  MONITOR,
  PAGE_DIFF,
  Paint,
  pie,
  pixels,
  SMALL_CODE,
  SMALL_PAGE,
  T,
} from './retro-kit'

// A late-90s desktop. The middle of the screen, behind the conversation, is
// bare desktop colour. The left gutter holds a column of desktop icons and a
// window on the project; the right gutter a status dialog and a console with
// the last commands. Icons, dialog buttons and the console are hotspots.
// Compact… confirms in the scene: the first click presses it in as
// "Confirm?" and the dialog asks for a second click.
const { theme, problems } = makeColors({
  label: 'Retro',
  contrast: 'more',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#000080', danger: '#c00000', success: '#007a00', warning: '#a86a00', pro: '#800080' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#d4d0c8',
        'surface-1': '#e0ddd6',
        'surface-2': '#f0eee9',
        'surface-3': '#f0eee9',
        'text-primary': '#000000',
        'text-secondary': '#1e1e1e',
        'text-muted': '#3c3c3c',
      },
    },
    git: {
      added: '#007a00',
      removed: '#c00000',
      modified: '#000080',
      merged: '#800080',
      closed: '#c00000',
      conflicting: '#a86a00',
      draft: '#505050',
    },
  },
  dark: {
    roles: { accent: '#6f9cf0', danger: '#e0473c', success: '#3fae49', warning: '#f0b020', pro: '#a07de6' },
    gray: {
      anchors: {
        'surface-0': '#16191c',
        'surface-1': '#1d2125',
        'surface-2': '#24292e',
        'surface-3': '#2b3137',
        'text-primary': '#eeeeea',
        'text-secondary': '#c8c8c2',
        'text-muted': '#a0a09a',
      },
    },
    git: {
      added: '#4cc456',
      removed: '#f2665c',
      modified: '#e8b030',
      merged: '#b08ef0',
      closed: '#f2665c',
      conflicting: '#f0a040',
      draft: '#8e99a9',
    },
  },
})

// Layout, in scene units on an 8-unit grid. The chat column is x 481 to 1119;
// the left gutter's content, drop shadow included, ends by x 440 and the
// right gutter's starts at x 1160 (GUTTER in gutter.ts).
const TOP = 208
const ICON_X = 32
const ICON_W = 104
const ICON_STEP = 104
const EXP = { x: 160, y: TOP, w: 272, h: 472 }
const DLG = { x: 1160, y: TOP, w: 400, h: 224 }
const CON = { x: 1160, y: TOP + 256, w: 400, h: 216 }
const BTN_W = 112
const BTN_H = 32
const BTN_Y = DLG.y + DLG.h - 48
const CANCEL_X = DLG.x + DLG.w - 20 - BTN_W
const COMPACT_X = CANCEL_X - 12 - BTN_W

type IconDef = { label: string; action: Hotspot['action']; art: (f: LooksFeed) => readonly string[] }

const ICONS: readonly IconDef[] = [
  { label: 'Session', action: 'session', art: () => MONITOR },
  { label: 'Context', action: 'context', art: f => pie((f.edge.context ?? 0) / 100) },
  { label: 'Changes', action: 'diff', art: () => PAGE_DIFF },
  { label: 'Model', action: 'model', art: () => CHIP },
  { label: 'Usage', action: 'usage', art: () => CALENDAR },
]

const iconTop = (i: number) => TOP + i * ICON_STEP

export const RETRO_HOTSPOTS: readonly Hotspot[] = [
  ...ICONS.map((icon, i) => ({ action: icon.action, x: ICON_X, y: iconTop(i) - 8, w: ICON_W, h: 96 })),
  { action: 'compact', x: COMPACT_X, y: BTN_Y - 14, w: BTN_W, h: 60 },
  { action: 'stop', x: CANCEL_X, y: BTN_Y - 14, w: BTN_W, h: 60 },
  { action: 'last-command', x: CON.x, y: CON.y, w: CON.w, h: CON.h },
]

const fit = (text: string, max: number) => {
  const one = text.replace(/\s+/g, ' ').trim()

  return escapeXml(one.length <= max ? one : `${one.slice(0, max - 1)}…`)
}
const plural = (n: number, one: string) => `${n.toLocaleString('en-US')} ${one}${n === 1 ? '' : 's'}`

function hoursText(ms: number): string {
  const h = ms / 3_600_000

  if (h < 1) {
    return `${Math.max(1, Math.round(h * 60))}m`
  }
  if (h < 24) {
    return `${Math.round(h)}h`
  }
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`
}

// A window: drop shadow, raised frame, a title bar (active navy, inactive
// grey, or none when `bar` is 'hover' and the caller draws one that lights
// up) and caption buttons, drawn into `cap`. Text goes to `txt`.
function frame(
  p: Paint,
  txt: string[],
  b: { x: number; y: number; w: number; h: number },
  title: string,
  bar: 'active' | 'inactive' | 'hover',
  captions: 1 | 3,
  cap: Paint = p,
): void {
  p.rect('drop', b.x + 8, b.y + 8, b.w, b.h)
  bevel(p, b.x, b.y, b.w, b.h)
  if (bar !== 'hover') {
    p.rect(bar === 'active' ? 'ttl-a' : 'ttl-i', b.x + 2 * T + 2, b.y + 2 * T + 2, b.w - 4 * T - 4, 24)
    const room = Math.floor((b.w - 24 - captions * 22) / 7.6)

    txt.push(`<text class="${bar === 'active' ? 'title' : 'title off'}" x="${b.x + 14}" y="${b.y + 2 * T + 19}">${fit(title, room)}</text>`)
  }
  const cy = b.y + 2 * T + 6
  let cx = b.x + b.w - 2 * T - 6 - 20

  for (let i = 0; i < captions; i++) {
    bevel(cap, cx, cy, 20, 16)
    const kind = captions === 1 || i === 0 ? 'close' : i === 1 ? 'max' : 'min'

    if (kind === 'close') {
      for (let k = 0; k < 4; k++) {
        cap.rect('glyph', cx + 5 + k, cy + 3 + k, 2, 2)
        cap.rect('glyph', cx + 13 - k, cy + 3 + k, 2, 2)
        cap.rect('glyph', cx + 5 + k, cy + 11 - k, 2, 2)
        cap.rect('glyph', cx + 13 - k, cy + 11 - k, 2, 2)
      }
      cap.rect('glyph', cx + 9, cy + 7, 2, 2)
    } else if (kind === 'max') {
      cap.rect('glyph', cx + 5, cy + 3, 10, 3)
      cap.rect('glyph', cx + 5, cy + 6, 2, 5)
      cap.rect('glyph', cx + 13, cy + 6, 2, 5)
      cap.rect('glyph', cx + 5, cy + 11, 10, 2)
    } else {
      cap.rect('glyph', cx + 5, cy + 10, 8, 3)
    }
    cx -= i === 0 && captions === 3 ? 24 : 20
  }
}

// Left gutter: the desktop icons, each its own hover group.
function icons(p: Paint, f: LooksFeed): string {
  return ICONS.map((icon, i) => {
    const top = iconTop(i)
    const ix = ICON_X + (ICON_W - 48) / 2
    const tint = pixels(p, icon.art(f), ix, top, 3)
    const lw = Math.round(icon.label.length * 7.4 + 12)
    const lx = ICON_X + (ICON_W - lw) / 2

    return (
      `<g class="spot ico">` +
      `<path class="itint" d="${tint}"/>` +
      `<rect class="lbg" x="${lx}" y="${top + 56}" width="${lw}" height="20"/>` +
      `<rect class="focus" x="${lx + 0.5}" y="${top + 56.5}" width="${lw - 1}" height="19"/>` +
      `<text class="lbl" x="${ICON_X + ICON_W / 2}" y="${top + 71}" text-anchor="middle">${icon.label}</text>` +
      `<rect class="hit" x="${ICON_X}" y="${top - 8}" width="${ICON_W}" height="96"/>` +
      `</g>`
    )
  }).join('')
}

// A meter well of square blocks: `share` of it lit, red once past `warn`.
function meter(p: Paint, x: number, y: number, w: number, share: number | null, warn = 0.85): void {
  bevel(p, x, y, w, 18, 'field', 'well')
  if (share === null) {
    return
  }
  const count = Math.floor((w - 4 * T - 4) / 10)
  const lit = Math.round(Math.max(0, Math.min(1, share)) * count)

  for (let i = 0; i < lit; i++) {
    p.rect(share >= warn ? 'del' : 'block', x + 2 * T + 2 + i * 10, y + 2 * T + 1, 8, 18 - 4 * T - 2)
  }
}

// Left gutter: a window on the project: recent files, then the session's numbers.
function explorer(p: Paint, txt: string[], f: LooksFeed): void {
  const b = EXP
  const e = f.edge

  frame(p, txt, b, f.project || 'Project', 'inactive', 3)
  const gx = b.x + 14
  const gw = b.w - 28
  // Recent files.
  const g1 = b.y + 48

  bevel(p, gx, g1, gw, 196, 'etched')
  p.rect('gap', gx + 8, g1 - 2, 98, 6)
  txt.push(`<text class="body" x="${gx + 12}" y="${g1 + 5}">Recent files</text>`)
  bevel(p, gx + 10, g1 + 16, gw - 20, 168, 'field', 'well')
  const files = f.files.slice(0, 6)

  if (files.length === 0) {
    txt.push(`<text class="wtxt dim" x="${gx + 22}" y="${g1 + 42}">No files opened yet.</text>`)
  }
  files.forEach((name, i) => {
    const ry = g1 + 22 + i * 26
    const isCode = /\.[a-z]{1,5}$/i.test(name) && !/\.(md|txt|pdf|png|jpe?g|svg)$/i.test(name)

    if (i === 0) {
      p.rect('sel', gx + 40, ry + 2, Math.min(gw - 56, name.length * 7.4 + 10), 20)
    }
    pixels(p, isCode ? SMALL_CODE : SMALL_PAGE, gx + 20, ry + 2, 2)
    txt.push(`<text class="${i === 0 ? 'wtxt on' : 'wtxt'}" x="${gx + 45}" y="${ry + 17}">${fit(name, 22)}</text>`)
  })
  // The session in numbers.
  const g2 = g1 + 216
  const gh = b.y + b.h - 16 - g2

  bevel(p, gx, g2, gw, gh, 'etched')
  p.rect('gap', gx + 8, g2 - 2, 92, 6)
  txt.push(`<text class="body" x="${gx + 12}" y="${g2 + 5}">This session</text>`)
  const lx = gx + 14
  const vx = gx + 96
  const row = (y: number, k: string, v: string) =>
    txt.push(`<text class="body" x="${lx}" y="${y}">${k}</text><text class="body" x="${vx}" y="${y}">${v}</text>`)

  row(g2 + 30, 'Branch', f.branch === null ? 'No git' : fit(f.branch, 18))
  row(g2 + 52, 'Prompts', String(f.prompts))
  const d = e.diff

  row(
    g2 + 74,
    'Changes',
    d === null
      ? 'None'
      : d.files === 0
        ? 'Clean'
        : `${plural(d.files, 'file')} <tspan class="t-add">+${d.added.toLocaleString('en-US')}</tspan> <tspan class="t-del">−${d.removed.toLocaleString('en-US')}</tspan>`,
  )
  txt.push(`<text class="body" x="${lx}" y="${g2 + 104}">Context</text>`)
  txt.push(`<text class="body" x="${gx + gw - 14}" y="${g2 + 104}" text-anchor="end">${e.context === null ? 'No reading' : `${e.context}%`}</text>`)
  meter(p, lx, g2 + 112, gw - 28, e.context === null ? null : e.context / 100)
  const w = e.week
  const resets = w !== null && e.at !== null ? ` · resets in ${hoursText(w.resetsAt - e.at)}` : ''

  txt.push(`<text class="body" x="${lx}" y="${g2 + 152}">This week</text>`)
  txt.push(
    `<text class="body" x="${gx + gw - 14}" y="${g2 + 152}" text-anchor="end">${w === null ? 'No reading' : `${Math.round(w.percentUsed)}%${resets}`}</text>`,
  )
  meter(p, lx, g2 + 160, gw - 28, w === null ? null : w.percentUsed / 100)
}

// A push button that presses in on hover. `isDefault` gives it the thick
// outline of the default button; a disabled one has etched grey text.
function button(x: number, y: number, label: string, isEnabled: boolean, isDefault: boolean, isArmed = false): string {
  const up = new Paint()
  const down = new Paint()

  if (isDefault) {
    up.rect('sh', x - 2, y - 2, BTN_W + 4, 2)
    up.rect('sh', x - 2, y + BTN_H, BTN_W + 4, 2)
    up.rect('sh', x - 2, y, 2, BTN_H)
    up.rect('sh', x + BTN_W, y, 2, BTN_H)
  }
  bevel(up, x, y, BTN_W, BTN_H, isArmed ? 'sunk' : 'raised', '')
  bevel(down, x, y, BTN_W, BTN_H, 'sunk', '')
  if (isDefault) {
    down.rect('sh', x - 2, y - 2, BTN_W + 4, 2)
    down.rect('sh', x - 2, y + BTN_H, BTN_W + 4, 2)
    down.rect('sh', x - 2, y, 2, BTN_H)
    down.rect('sh', x + BTN_W, y, 2, BTN_H)
  }
  const cx = x + BTN_W / 2 + (isArmed ? 1 : 0)
  const cy = y + 21 + (isArmed ? 1 : 0)
  const text = isArmed
    ? `<text class="btxt strong" x="${cx}" y="${cy}" text-anchor="middle">${label}</text>`
    : isEnabled
    ? `<text class="btxt" x="${cx}" y="${cy}" text-anchor="middle">${label}</text>`
    : `<text class="btxt etch" x="${cx + 1}" y="${cy + 1}" text-anchor="middle">${label}</text><text class="btxt gone" x="${cx}" y="${cy}" text-anchor="middle">${label}</text>`

  return (
    `<g class="spot btn${isArmed ? ' armed' : ''}">` +
    `<g class="up">${up.draw()}</g><g class="dn">${down.draw()}</g>` +
    `<g class="bl">${text}</g>` +
    `<rect class="hit" x="${x}" y="${y - 14}" width="${BTN_W}" height="60"/>` +
    `</g>`
  )
}

// Right gutter: what the session is doing now.
function dialog(p: Paint, txt: string[], f: LooksFeed): string {
  const b = DLG
  const e = f.edge
  const last = f.commands.at(-1)
  const failed = !f.isWorking && last?.ok === false
  const compacting = e.compacting
  const compacted = !compacting && e.compactedAt !== null
  const full = (e.context ?? 0) >= 85
  const head = compacting ? 'Compacting…' : f.isWorking ? 'Working on…' : compacted ? 'Compacted' : 'Ready'
  const detail = compacting
    ? 'Summarising the conversation.'
    : f.isWorking
      ? f.activity || 'Thinking'
      : compacted
        ? `Context is down to ${e.context ?? 0}%.`
        : failed
          ? `Last command failed: ${last?.text ?? ''}`
          : f.lastTurnMs === null
            ? 'Waiting for your first prompt.'
            : `Last turn took ${seconds(f.lastTurnMs)}.`
  const third = [modelName(f.model), f.branch ?? '', plural(f.prompts, 'prompt')].filter(t => t !== '').join(' · ')

  frame(p, txt, b, f.session || 'Session status', 'active', 1)
  const ix = b.x + 22
  const iy = b.y + 50
  const art = compacting || f.isWorking ? null : failed ? badge('r', ERROR_GLYPH) : badge('l', INFO_GLYPH)
  let busy = ''

  if (art === null) {
    const glass = new Paint()

    pixels(glass, HOURGLASS, ix, iy, 2)
    busy = `<g class="busy">${glass.draw()}</g>`
  } else {
    pixels(p, art, ix, iy, 2)
  }
  const tx = b.x + 70

  txt.push(`<text class="body strong" x="${tx}" y="${b.y + 62}">${head}</text>`)
  txt.push(`<text class="body" x="${tx}" y="${b.y + 82}">${fit(detail, 40)}</text>`)
  txt.push(`<text class="body dim" x="${tx}" y="${b.y + 102}">${fit(third, 40)}</text>`)
  const wx = b.x + 22
  const wy = b.y + 118
  const ww = b.w - 44

  bevel(p, wx, wy, ww, 22, 'field', 'well')
  let march = ''

  if (f.isWorking || compacting) {
    const run = new Paint()

    for (let i = 0; i < 6; i++) {
      run.rect('block', wx + 2 * T + 2 + i * 16 - 6 * 16, wy + 2 * T + 2, 12, 22 - 4 * T - 4)
    }
    march = `<g clip-path="url(#r-well)"><g class="march">${run.draw()}</g></g>`
  } else if (f.lastTurnMs !== null) {
    const count = Math.floor((ww - 4 * T - 4) / 16)

    for (let i = 0; i < count; i++) {
      p.rect('block', wx + 2 * T + 2 + i * 16, wy + 2 * T + 2, 12, 22 - 4 * T - 4)
    }
  }
  const armed = f.armed === 'compact'
  const note = armed
    ? 'Click again to compact.'
    : compacting
    ? 'This takes a moment.'
    : f.isWorking
      ? 'Cancel stops the turn.'
      : full
        ? `Context ${e.context}% full: compact soon.`
        : 'Compact… summarises the chat to free context.'

  if (note !== '') {
    txt.push(`<text class="body ${armed ? 'strong ask' : full ? 'warn' : 'dim'}" x="${wx}" y="${wy + 40}">${note}</text>`)
  }
  const canCompact = !f.isWorking && !compacting

  return (
    `<defs><clipPath id="r-well"><rect x="${wx + 2 * T}" y="${wy + 2 * T}" width="${ww - 4 * T}" height="${22 - 4 * T}"/></clipPath></defs>` +
    busy +
    march +
    (armed ? button(COMPACT_X, BTN_Y, 'Confirm?', true, true, true) : button(COMPACT_X, BTN_Y, 'Compact…', canCompact, canCompact && full)) +
    button(CANCEL_X, BTN_Y, 'Cancel', f.isWorking, f.isWorking)
  )
}

// Right gutter: the last shell commands and how each ended. The whole
// window is a hotspot, and its title bar turns active on hover.
function consoleWindow(p: Paint, f: LooksFeed): string {
  const b = CON
  const cap = new Paint()

  frame(p, [], b, 'Console', 'hover', 3, cap)
  bevel(p, b.x + 12, b.y + 38, b.w - 24, b.h - 50, 'field', 'ink-bg')
  const rows = f.commands.slice(-6)
  const x = b.x + 26
  const end = b.x + b.w - 26
  const lines = rows.map((c, i) => {
    const y = b.y + 64 + i * 20
    const [cls, mark] = c.ok === null ? ['c-run', '...'] : c.ok ? ['c-ok', 'OK'] : ['c-bad', 'ERR']

    return `<text class="con" x="${x}" y="${y}">&gt; ${fit(c.text, 36)}</text><text class="con ${cls}" x="${end}" y="${y}" text-anchor="end">${mark}</text>`
  })
  const py = b.y + 64 + rows.length * 20

  return (
    `<g class="spot win">` +
    `<rect class="tbar" x="${b.x + 2 * T + 2}" y="${b.y + 2 * T + 2}" width="${b.w - 4 * T - 4}" height="24"/>` +
    `<text class="title tt" x="${b.x + 14}" y="${b.y + 2 * T + 19}">Console</text>` +
    cap.draw() +
    lines.join('') +
    `<text class="con" x="${x}" y="${py}">&gt;</text>` +
    `<rect class="caret" x="${x + 16}" y="${py - 2}" width="8" height="3"/>` +
    `<text class="con cue" x="${end}" y="${py}" text-anchor="end">details ›</text>` +
    `<rect class="hit" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>` +
    `</g>`
  )
}

const MARCH_STEPS = Math.ceil((DLG.w - 44 + 96) / 16)

const CSS = `
:root, svg {
  --desk: #1f7a7a; --face: #c9c5bc; --hi: #ffffff; --mid: #e4e1da; --lo: #868279; --sh: #1a1a1a;
  --ink: #000000; --well: #ffffff; --well-ink: #000000; --label: #ffffff; --sel: #000080; --sel-ink: #ffffff;
  --block: #000080; --add: #007a00; --del: #b00000; --drop: rgba(0, 0, 0, .28);
  --ta: #0a246a; --tb: #3a6ea5; --ia: #7f7c76; --ib: #b4b1aa; --tink: #ffffff; --tink-off: #e4e1da;
  --px-k: #000000; --px-w: #ffffff; --px-g: #c6c3bc; --px-d: #7b786f; --px-b: #1c3f94; --px-c: #7fb3ff;
  --px-y: #f0c838; --px-n: #23b04a; --px-r: #d03a2c; --px-o: #e8862a; --px-l: #1d63c8;
}
.ta { stop-color: var(--ta); } .tb { stop-color: var(--tb); } .ia { stop-color: var(--ia); } .ib { stop-color: var(--ib); }
@media (prefers-color-scheme: dark) {
  :root, svg {
    --desk: #0f2a2e; --face: #6a6862; --hi: #96938b; --mid: #7c7a73; --lo: #3e3c38; --sh: #0b0b0b;
    --ink: #f2f0ea; --well: #2c2b28; --well-ink: #e8e6e0; --label: #d6e2e2; --sel: #2c4a8a; --sel-ink: #ffffff;
    --block: #5b86d8; --add: #5cc866; --del: #f06a5e; --drop: rgba(0, 0, 0, .45);
    --ta: #1c2f66; --tb: #3a5a96; --ia: #45433f; --ib: #5c5a55; --tink: #eeeeea; --tink-off: #a9a7a0;
    --px-k: #0d0d0d; --px-w: #d2cfc8; --px-g: #a29f98; --px-d: #615e58; --px-b: #2a4a96; --px-c: #6f9be0;
    --px-y: #c9a83a; --px-n: #2f9a48; --px-r: #b84034; --px-o: #c47a34; --px-l: #2e62b4;
  }
}
.desk { fill: var(--desk); }
.drop { fill: var(--drop); }
.face, .gap { fill: var(--face); } .hi { fill: var(--hi); } .mid { fill: var(--mid); } .lo { fill: var(--lo); } .sh { fill: var(--sh); }
.well { fill: var(--well); } .ink-bg { fill: #000000; }
.ttl-a { fill: url(#r-ta); } .ttl-i { fill: url(#r-ti); }
.glyph { fill: #000000; }
.block { fill: var(--block); } .add { fill: var(--add); } .del { fill: var(--del); } .sel { fill: var(--sel); }
.px-k { fill: var(--px-k); } .px-w { fill: var(--px-w); } .px-g { fill: var(--px-g); } .px-d { fill: var(--px-d); }
.px-b { fill: var(--px-b); } .px-c { fill: var(--px-c); } .px-y { fill: var(--px-y); } .px-n { fill: var(--px-n); }
.px-r { fill: var(--px-r); } .px-o { fill: var(--px-o); } .px-l { fill: var(--px-l); }
text { font-family: Tahoma, Verdana, "Segoe UI", Geneva, sans-serif; font-size: 13px; }
.title { fill: var(--tink); font-weight: bold; } .title.off { fill: var(--tink-off); }
.body { fill: var(--ink); } .strong { font-weight: bold; } .dim { fill-opacity: .72; } .warn { fill: var(--del); font-weight: bold; }
.wtxt { fill: var(--well-ink); } .wtxt.on { fill: var(--sel-ink); }
.t-add { fill: var(--add); } .t-del { fill: var(--del); }
.btxt { fill: var(--ink); } .etch { fill: var(--hi); } .gone { fill: var(--lo); }
.con { font-family: "Lucida Console", Monaco, Menlo, Consolas, monospace; font-size: 13px; fill: #c0c0c0; white-space: pre; }
.c-ok { fill: #4ad04a; } .c-bad { fill: #ff6a5a; } .c-run { fill: #e8d040; }
.caret { fill: #c0c0c0; animation: caret 2.4s step-end infinite; }
@keyframes caret { 50% { opacity: 0; } }
.hit { fill: #000000; fill-opacity: 0; }
.lbl { fill: var(--label); }
.lbg { fill: var(--sel); fill-opacity: 0; } .focus { fill: none; stroke: none; }
.itint { fill: var(--sel); fill-opacity: 0; }
.ico:hover .lbg { fill-opacity: 1; } .ico:hover .itint { fill-opacity: .45; }
.ico:hover .focus { stroke: #ffff80; stroke-width: 1; stroke-dasharray: 1 1; }
.cue { fill: #8a8a8a; } .ask { animation: ask 2.4s ease-in-out infinite; }
@keyframes ask { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
.dn { display: none; } .btn.armed:hover .bl { transform: none; } .btn:hover .up { display: none; } .btn:hover .dn { display: inline; } .btn:hover .bl { transform: translate(1px, 1px); }
.tbar { fill: url(#r-ti); } .win:hover .tbar { fill: url(#r-ta); } .tt { fill: var(--tink-off); } .win:hover .tt { fill: var(--tink); }
.busy { transform-box: fill-box; transform-origin: center; animation: flip 6s steps(1) infinite; }
@keyframes flip { 0% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
.march { animation: march 7s steps(${MARCH_STEPS}) infinite; }
@keyframes march { from { transform: translateX(0); } to { transform: translateX(${MARCH_STEPS * 16}px); } }
${GUTTER_CSS}
`

const DEFS =
  '<linearGradient id="r-ta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="ta"/><stop offset="1" class="tb"/></linearGradient>' +
  '<linearGradient id="r-ti" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="ia"/><stop offset="1" class="ib"/></linearGradient>'

// The desktop for one moment of the session.
export function retroScene(f: LooksFeed): string {
  const left = new Paint()
  const right = new Paint()
  const leftTxt: string[] = []
  const rightTxt: string[] = []

  explorer(left, leftTxt, f)
  const spots = icons(left, f)
  const over = dialog(right, rightTxt, f)
  const con = consoleWindow(right, f)

  return svg(
    CSS,
    DEFS,
    `<rect class="desk" width="1600" height="1000"/>` +
      `<g class="g-l"><g shape-rendering="crispEdges">${left.draw()}</g>${leftTxt.join('')}<g shape-rendering="crispEdges">${spots}</g></g>` +
      `<g class="g-r"><g shape-rendering="crispEdges">${right.draw()}</g>${rightTxt.join('')}<g shape-rendering="crispEdges">${over}${con}</g></g>`,
  )
}

export const RETRO: Look = {
  label: 'Retro',
  args: { colors: theme, backdrop: { scene: 'retro', glass: { blur: 16, opacity: 0.82 } } },
  problems,
  scene: retroScene(EMPTY_FEED),
  hotspots: RETRO_HOTSPOTS,
  align: 'mid',
  confirmInScene: ['compact'],
}
