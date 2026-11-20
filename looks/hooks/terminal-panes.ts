import type { LooksFeed } from '../types'
import { clockText, cut, escapeXml, seconds } from './feed-state'
import type { Hotspot } from './hotspot'

// The Terminal look's two gutter columns, laid on one grid: 24-unit rows,
// 20-unit pane padding, 14-unit monospace text (about 8.4 units a character).
// Left: the command log and two key caps. Right: the status pane, in sections
// that each carry a label line and one or two value lines. Both columns keep
// to the gutters (GUTTER in gutter.ts): the left ends at x 440, the right
// starts at x 1160, each 64 units from its window edge.

const ROW = 24
const PAD = 20
const CHAR = 8.4
const TITLE_H = 36
const PANE_W = 376
const PANE_Y = 152

export const LEFT_X = 64
export const RIGHT_X = 1160

const LOG_ROWS = 9
const FOOT_H = 42
const LOG_H = TITLE_H + 12 + LOG_ROWS * ROW + 12 + FOOT_H

const SECTIONS = { turn: 84, git: 84, model: 60, context: 64, week: 84 } as const
const sectionY = (() => {
  let y = PANE_Y + TITLE_H
  const at: Record<keyof typeof SECTIONS, number> = { turn: 0, git: 0, model: 0, context: 0, week: 0 }

  for (const k of Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]) {
    at[k] = y
    y += SECTIONS[k]
  }

  return at
})()
const STATUS_H = sectionY.week + SECTIONS.week + 8 - PANE_Y

const KEY_H = 64
const KEY_Y = PANE_Y + STATUS_H - KEY_H
const STOP_W = 168
const MENU_W = 104

export const TERMINAL_SPOTS: readonly Hotspot[] = [
  { action: 'last-command', x: LEFT_X, y: PANE_Y, w: PANE_W, h: LOG_H },
  { action: 'stop', x: LEFT_X, y: KEY_Y, w: STOP_W, h: KEY_H },
  { action: 'menu', x: LEFT_X + PANE_W - MENU_W, y: KEY_Y, w: MENU_W, h: KEY_H },
  { action: 'diff', x: RIGHT_X, y: sectionY.git, w: PANE_W, h: SECTIONS.git },
  { action: 'model', x: RIGHT_X, y: sectionY.model, w: PANE_W, h: SECTIONS.model },
  { action: 'context', x: RIGHT_X, y: sectionY.context, w: PANE_W, h: SECTIONS.context },
  { action: 'usage', x: RIGHT_X, y: sectionY.week, w: PANE_W, h: SECTIONS.week },
]

const fit = (text: string, chars: number): string => escapeXml(cut(text, chars))

// SVG text collapses runs of spaces; a no-break space keeps a gap.
const GAP = '\u00a0\u00a0'

// As many names as fit in `chars`, gapped.
function fitList(names: readonly string[], chars: number): string {
  const kept: string[] = []
  let used = 0

  for (const name of names) {
    const len = name.length + (kept.length === 0 ? 0 : 2)

    if (used + len > chars) {
      break
    }
    kept.push(name)
    used += len
  }

  return kept.length === 0 ? fit(names[0] ?? '', chars) : kept.map(escapeXml).join(GAP)
}

// "claude-opus-5-5" reads "Opus 5.5", "claude-3-5-haiku-20241022" reads
// "Haiku 3.5"; anything else is shown as it came, cut short.
export function shortModel(model: string): string {
  const m = model.toLowerCase().replace(/\[.*?\]/g, '').replace(/^claude-/, '').replace(/-\d{8}$/, '')
  const family = /(opus|sonnet|haiku|fable)/.exec(m)?.[1]

  if (family === undefined) {
    return model.trim() === '' ? '—' : model.trim()
  }
  const version = m
    .replace(family, ' ')
    .split(/[^0-9]+/)
    .filter(p => p !== '')
    .join('.')

  return `${family[0]?.toUpperCase()}${family.slice(1)}${version === '' ? '' : ` ${version}`}`
}

const grouped = (v: number): string => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

function untilText(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000))

  if (mins < 60) {
    return `${mins}m`
  }
  const h = Math.floor(mins / 60)

  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}

const level = (p: number): string => (p >= 85 ? 'hi' : p >= 70 ? 'mid' : 'lo')

// Fill and empty cells of a meter, each merged into one path.
function meter(x: number, y: number, cells: number, percent: number, h: number): string {
  const cw = 8
  const gap = 2.5
  const lit = Math.round((Math.max(0, Math.min(100, percent)) / 100) * cells)
  let on = ''
  let off = ''

  for (let i = 0; i < cells; i++) {
    const seg = `M${(x + i * (cw + gap)).toFixed(1)} ${y}h${cw}v${h}h-${cw}z`

    if (i < lit) on += seg
    else off += seg
  }

  return `${on === '' ? '' : `<path class="m-on ${level(percent)}" d="${on}"/>`}<path class="m-off" d="${off}"/>`
}

function pane(x: number, h: number, title: string, right: string): string {
  return (
    `<rect class="pane" x="${x}" y="${PANE_Y}" width="${PANE_W}" height="${h}" rx="10"/>` +
    `<path class="strip" d="M${x + 10} ${PANE_Y}h${PANE_W - 20}a10 10 0 0 1 10 10v${TITLE_H - 10}h-${PANE_W}v-${TITLE_H - 10}a10 10 0 0 1 10 -10z"/>` +
    `<path class="hair" d="M${x} ${PANE_Y + TITLE_H}h${PANE_W}"/>` +
    `<text class="title" x="${x + PAD}" y="${PANE_Y + 23}">${title}</text>` +
    right
  )
}

// A section the person can click: a hover band, a coral bar at its left
// edge, a label, a hint at the right, and its value lines.
function spot(cls: string, x: number, y: number, h: number, label: string, hint: string, body: string): string {
  return (
    `<g class="spot ${cls}">` +
    `<rect class="hit" x="${x + 6}" y="${y + 4}" width="${PANE_W - 12}" height="${h - 8}" rx="6"/>` +
    `<rect class="bar" x="${x + 6}" y="${y + 14}" width="3" height="${h - 28}" rx="1.5"/>` +
    `<text class="label" x="${x + PAD}" y="${y + 24}">${label}</text>` +
    `<text class="hint" x="${x + PANE_W - PAD}" y="${y + 24}" text-anchor="end">${hint}</text>` +
    body +
    `</g>`
  )
}

const rule = (x: number, y: number) => `<path class="hair" d="M${x + PAD} ${y}h${PANE_W - 2 * PAD}"/>`

const compactedNow = (f: LooksFeed) => f.edge.compactedAt !== null && f.edge.at !== null && f.edge.compactedAt >= f.edge.at

export function logPane(f: LooksFeed): string {
  const x = LEFT_X
  const textX = x + PAD
  const cols = Math.floor((PANE_W - 2 * PAD) / CHAR)
  const lines: string[] = []

  if (f.commands.length === 0) {
    lines.push(`<text class="note" x="${textX}" y="0"># no commands yet this session</text>`)
  }
  const noted = f.edge.compacting || compactedNow(f) ? 1 : 0

  for (const c of f.commands.slice(-(LOG_ROWS - 1 - noted))) {
    const mark = c.ok === null ? '<tspan class="run">…</tspan>' : c.ok ? '<tspan class="ok">✓</tspan>' : '<tspan class="bad">✗</tspan>'

    lines.push(
      `<text class="cmd${c.ok === false ? ' failed' : ''}" x="${textX}" y="0"><tspan class="pr">$ </tspan>${fit(c.text, cols - 4)}</text>` +
        `<text class="mark" x="${x + PANE_W - PAD}" y="0" text-anchor="end">${mark}</text>`,
    )
  }
  if (f.edge.compacting) {
    lines.push(`<text class="note warn" x="${textX}" y="0"># compacting the conversation…</text>`)
  } else if (compactedNow(f)) {
    lines.push(`<text class="note" x="${textX}" y="0"># conversation compacted</text>`)
  }
  const promptRow = lines.length
  const firstBase = PANE_Y + TITLE_H + 12 + 17
  const placed = lines.map((l, i) => l.replaceAll('y="0"', `y="${firstBase + i * ROW}"`)).join('')
  const py = firstBase + promptRow * ROW
  const curX = textX + 2 * CHAR
  const count = f.commands.length === 0 ? 'empty' : `${f.commands.length} cmd${f.commands.length === 1 ? '' : 's'}`
  const footY = PANE_Y + LOG_H - FOOT_H
  const files = f.files.length === 0 ? '<tspan class="dim">none touched yet</tspan>' : fitList(f.files.slice(0, 3), cols - 7)
  const foot = `<path class="hair" d="M${x + PAD} ${footY}h${PANE_W - 2 * PAD}"/><text class="foot" x="${textX}" y="${footY + 26}"><tspan class="label">FILES</tspan>${GAP}${files}</text>`

  return (
    `<g class="spot log">` +
    pane(x, LOG_H, `~/${fit(f.project || 'session', 22)}`, `<text class="hint" x="${x + PANE_W - PAD}" y="${PANE_Y + 23}" text-anchor="end">${count} · last ›</text>`) +
    `<rect class="hit" x="${x + 6}" y="${PANE_Y + TITLE_H + 6}" width="${PANE_W - 12}" height="${LOG_H - TITLE_H - 12}" rx="6"/>` +
    `<g class="rows">${placed}<text class="cmd" x="${textX}" y="${py}"><tspan class="pr">$ </tspan></text>` +
    `<rect class="cur${f.isWorking ? ' busy' : ''}" x="${curX}" y="${py - 13}" width="8.4" height="17" rx="1"/></g>` +
    foot +
    `</g>`
  )
}

export function keyCaps(f: LooksFeed): string {
  const cap = (cls: string, x: number, w: number, big: string, small: string) =>
    `<g class="spot key ${cls}">` +
    `<rect class="cap-base" x="${x}" y="${KEY_Y}" width="${w}" height="${KEY_H}" rx="10"/>` +
    `<rect class="cap-top" x="${x + 3}" y="${KEY_Y + 2}" width="${w - 6}" height="${KEY_H - 9}" rx="8"/>` +
    `<text class="cap-big" x="${x + 18}" y="${KEY_Y + 36}">${big}</text>` +
    `<text class="cap-small" x="${x + w - 16}" y="${KEY_Y + 36}" text-anchor="end">${small}</text>` +
    `</g>`

  const armed = f.armed === 'stop'
  const stop = armed ? 'stop armed' : `stop${f.isWorking ? ' live' : ' idle'}`

  return cap(stop, LEFT_X, STOP_W, '^C', armed ? 'again to stop' : f.isWorking ? 'stop' : 'idle') + cap('menu', LEFT_X + PANE_W - MENU_W, MENU_W, '?', 'menu')
}

function turnLines(f: LooksFeed): [string, string, string] {
  const e = f.edge
  const prompts = `${f.prompts} prompt${f.prompts === 1 ? '' : 's'}`
  const last = f.commands.at(-1)

  if (e.compacting) {
    return ['Compacting the conversation', prompts, 'warn']
  }
  if (f.isWorking) {
    return [f.activity || 'Thinking', `${f.turnStartedAt === null ? 'working' : `since ${clockText(f.turnStartedAt)}`} · prompt ${f.prompts}`, 'hot']
  }
  if (compactedNow(f)) {
    return ['Compacted, ready', `${prompts} · ${e.context === null ? 'context reset' : `context ${e.context}%`}`, 'ok']
  }
  if (f.prompts === 0) {
    return ['Ready for a first prompt', 'new session', '']
  }
  const lastTurn = f.lastTurnMs === null ? '' : ` · last turn ${seconds(f.lastTurnMs)}`

  if (last?.ok === false) {
    return [`${last.text} failed`, `${prompts}${lastTurn}`, 'bad']
  }

  return ['Idle', `${prompts}${lastTurn}`, '']
}

export function statusPane(f: LooksFeed): string {
  const x = RIGHT_X
  const vx = x + PAD
  const e = f.edge
  const cols = Math.floor((PANE_W - 2 * PAD) / CHAR)
  const state = e.compacting ? 'compacting' : f.isWorking ? 'working' : 'idle'
  const chip =
    `<circle class="dot ${state}" cx="${x + PANE_W - PAD - 8.4 * state.length - 12}" cy="${PANE_Y + 19}" r="3.5"/>` +
    `<text class="chip ${state}" x="${x + PANE_W - PAD}" y="${PANE_Y + 23}" text-anchor="end">${state}</text>`
  const [turn1, turn2, turnCls] = turnLines(f)

  const turn =
    `<text class="label" x="${vx}" y="${sectionY.turn + 24}">TURN</text>` +
    `<text class="val ${turnCls}" x="${vx}" y="${sectionY.turn + 48}">${fit(turn1, cols)}</text>` +
    `<text class="sub" x="${vx}" y="${sectionY.turn + 72}">${fit(turn2, cols)}</text>`

  const gy = sectionY.git
  const where = f.branch === null ? fit(f.project || '—', cols) : `${fit(f.project || '—', 20)}<tspan class="dim"> on </tspan>${fit(f.branch, cols - 4 - Math.min(20, (f.project || '—').length))}`
  const d = e.diff
  const diffLine =
    d === null
      ? `<tspan class="dim">not a git repository</tspan>`
      : d.files === 0
        ? `<tspan class="dim">working tree clean</tspan>`
        : `${d.files} file${d.files === 1 ? '' : 's'}${GAP}<tspan class="add">+${grouped(d.added)}</tspan>${GAP}<tspan class="del">−${grouped(d.removed)}</tspan>`
  const git = spot('diff', x, gy, SECTIONS.git, 'GIT', d === null || d.files === 0 ? 'diff ›' : 'review ›', `<text class="val" x="${vx}" y="${gy + 48}">${where}</text><text class="sub" x="${vx}" y="${gy + 72}">${diffLine}</text>`)

  const my = sectionY.model
  const model = spot('model', x, my, SECTIONS.model, 'MODEL', 'switch ›', `<text class="val big" x="${vx}" y="${my + 47}">${fit(shortModel(f.model), 24)}</text>`)

  const cy = sectionY.context
  const ctx = e.context
  const ctxCells = 26
  const context = spot(
    'context',
    x,
    cy,
    SECTIONS.context,
    'CONTEXT',
    '/context ›',
    ctx === null
      ? `<text class="sub" x="${vx}" y="${cy + 48}"><tspan class="dim">no reading yet</tspan></text>`
      : meter(vx, cy + 36, ctxCells, ctx, 11) + `<text class="pct ${level(ctx)}" x="${x + PANE_W - PAD}" y="${cy + 47}" text-anchor="end">${Math.round(ctx)}%</text>`,
  )

  const wy = sectionY.week
  const week = e.week
  const usage = spot(
    'usage',
    x,
    wy,
    SECTIONS.week,
    'WEEK',
    '/usage ›',
    week === null
      ? `<text class="sub" x="${vx}" y="${wy + 48}"><tspan class="dim">no usage reading</tspan></text>`
      : meter(vx, wy + 36, ctxCells, week.percentUsed, 11) +
          `<text class="pct ${level(week.percentUsed)}" x="${x + PANE_W - PAD}" y="${wy + 47}" text-anchor="end">${Math.round(week.percentUsed)}%</text>` +
          `<text class="sub" x="${vx}" y="${wy + 72}">${e.at === null ? 'resets weekly' : `resets in ${untilText(week.resetsAt - e.at)}`}</text>`,
  )
  return (
    pane(x, STATUS_H, fit(f.session || 'session', 24), chip) +
    turn +
    rule(x, gy) +
    git +
    rule(x, my) +
    model +
    rule(x, cy) +
    context +
    rule(x, wy) +
    usage
  )
}
