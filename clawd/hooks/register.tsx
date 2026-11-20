import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Activity, CrewMode, Ensemble, GitAct, GitKind, Kind, Repo, Scene, Usage } from '../types'
import type { Action } from './model'
import {
  ENSEMBLES, GIT_MS, HAPPY_MS, LEAVE_MS, PLAYS, REFILL_MS, SWEEP_TAIL_MS,
  daypartOf, gitActOf, gitKindOf, initialScene, kindOf, reduce, running,
} from './model'
import { FOCUS_VIEW, W, labelOf, sceneSvg } from './scene'
import type { View } from './scene'

const RECONCILE_MS = 8000
const DIRECTOR_MS = 15_000
const KIND_SETTLE_MS = 1200
const INTERLUDE_MS = 15_000
const BREAK_MS = 16_000
const LIVE = new Set(['pending', 'running', 'waiting'])
// The Svg element takes at most 131072 characters; keep clear of it.
const SVG_BUDGET = 125_000
// The desktop band is about 10.4px per column (887px across 85 columns, read
// off a screenshot): left to size itself it draws the scene at half width.
const PX_PER_COLUMN = 10.4
// And about 18.75px per row: the 12-row band measured 225px.
const PX_PER_ROW = 18.75
const MIN_HEIGHT = 130
const MAX_HEIGHT = 320
// Below the widest band (where the prompt stops growing), the view narrows
// towards Clawd's desk until the band is this narrow.
const WIDE_PX = 860
const NARROW_PX = 440
// The room is 128 units tall; the string of lights needs about 30 more.
const TALL_UNITS = 160

const scene = atom({ plugin: 'clawd', key: 'scene' } as const, initialScene(0))
const isHidden = atom({ plugin: 'clawd', key: 'isHidden' } as const, false)
const isImage = atom({ plugin: 'clawd', key: 'isImage' } as const, false)
const forcedWidth = atom({ plugin: 'clawd', key: 'width' } as const, null as number | null)

let pendingKind: Timer | null = null
let hourOverride: number | null = null
let usagePinned = false
let repoPinned = false
let directorTicks = 0
// What the band last said about its size, for /clawd debug.
let lastLayout = 'not drawn yet'

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}

function hourAt(ms: number): number {
  return hourOverride ?? new Date(ms).getHours()
}

async function dispatch($: EngineInterface, action: Action) {
  const now = await $.clock.now()
  // A write redraws the scene, so an action that changes nothing writes nothing.
  const current = await read($, scene)
  if (reduce(current, action, now) === current) return
  await update($, scene, (s): Scene => reduce(s, action, now))
}

// Timed changes (the cheer ending, a helper gone through the door, a git
// routine finishing) land as a tick once their time is up.
function tickAfter($: EngineInterface, ms: number) {
  $.clock.after(ms + 100, () => void dispatch($, { type: 'tick' }))
}

// Bursts of tool calls settle into one change of what Clawd is doing, so the
// scene is not redrawn for every call.
function settleKind($: EngineInterface, kind: Kind) {
  pendingKind?.cancel()
  pendingKind = $.clock.after(KIND_SETTLE_MS, () => void dispatch($, { type: 'tool', kind }))
}

async function playGit($: EngineInterface, kind: GitKind, chosen?: GitAct) {
  const act = chosen ?? gitActOf(kind, running(await read($, scene)).length, Math.random())
  await dispatch($, { type: 'git', kind, act })
  tickAfter($, GIT_MS)
}

function usageOf(
  context: { percent?: number },
  limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[],
): Partial<Usage> {
  const usage: Partial<Usage> = {}
  if (context.percent !== undefined) usage.context = context.percent
  const fiveHour = limits.find(l => l.kind === 'five_hour')
  const week = limits.find(l => l.kind === 'seven_day')
  if (fiveHour) {
    usage.fiveHour = fiveHour.percentUsed
    const resets = fiveHour.resetsAt ? Date.parse(fiveHour.resetsAt) : NaN
    if (!Number.isNaN(resets)) usage.fiveHourResetsAt = resets
  }
  if (week) usage.week = week.percentUsed
  return usage
}

async function applyUsage($: EngineInterface, usage: Partial<Usage>) {
  const before = (await read($, scene)).refill
  await dispatch($, { type: 'usage', usage })
  if ((await read($, scene)).refill !== before) tickAfter($, REFILL_MS)
}

async function measured($: EngineInterface, usage: Partial<Usage>) {
  if (!usagePinned) await applyUsage($, usage)
}

async function git($: EngineInterface, args: string[]): Promise<string | null> {
  try {
    const { exitCode, stdout } = await $.process.run(['git', ...args], { timeoutMs: 3000 })
    return exitCode === 0 ? stdout.trim() : null
  } catch {
    return null
  }
}

// The branch the session is on, the branch it would merge into, and how far
// apart the two are.
async function readRepo($: EngineInterface) {
  if (repoPinned) return
  const branch = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch === null) {
    await dispatch($, { type: 'repo', repo: null })
    return
  }
  const remoteHead = await git($, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  const base = remoteHead?.replace(/^origin\//, '') ?? ((await git($, ['rev-parse', '--verify', '--quiet', 'main'])) !== null ? 'main' : 'master')
  let ahead = 0
  let behind = 0
  if (branch !== base) {
    const counts = await git($, ['rev-list', '--left-right', '--count', `${base}...HEAD`])
    const [b, a] = (counts ?? '0 0').split(/\s+/).map(Number)
    behind = b ?? 0
    ahead = a ?? 0
  }
  await dispatch($, { type: 'repo', repo: { branch, base, ahead, behind } })
}

// What the band shows and the size to ask for. The view narrows with the
// band, so a narrow band shows Clawd's desk large rather than the whole room
// small, and asks for the height that view needs. The size is only a hint,
// since the scene fills whatever frame it gets; the phone sizes it itself.
export function frameFor(
  surface: string,
  columns: number,
  rows: number,
  forcedWidth: number | null,
): { px: { width: number; height: number } | null; view: View } {
  if (surface === 'mobile' && forcedWidth === null) return { px: null, view: FOCUS_VIEW }
  const width = forcedWidth ?? Math.floor(columns * PX_PER_COLUMN)
  const t = Math.min(1, Math.max(0, (WIDE_PX - width) / (WIDE_PX - NARROW_PX)))
  const view = { x: Math.round(FOCUS_VIEW.x * t), span: Math.round(W + (FOCUS_VIEW.span - W) * t) }
  const fits = (width / view.span) * TALL_UNITS
  const height = Math.round(Math.min(fits, Math.max(rows * PX_PER_ROW, MIN_HEIGHT), MAX_HEIGHT))
  return { px: { width, height }, view }
}

// Catches helpers whose start or end the turn events missed, such as ones
// already running when the mod loaded.
async function reconcile($: EngineInterface) {
  const agents = await $.agent.list()
  const live = new Set(agents.filter(a => LIVE.has(a.status)).map(a => a.id))
  const s = await read($, scene)
  for (const mini of running(s)) {
    if (!live.has(mini.id) && !mini.id.startsWith(DEMO)) {
      await dispatch($, { type: 'agentEnd', id: mini.id })
      tickAfter($, LEAVE_MS)
    }
  }
  for (const id of live) {
    if (!s.minis.some(m => m.id === id)) await dispatch($, { type: 'agentStart', id })
  }
}

// Every so often: Clawd leads the helpers in a routine, the helpers take a
// break (toys, football, sandcastles, a split, a tower), and Clawd whistles
// them back to work.
async function direct($: EngineInterface) {
  const now = await $.clock.now()
  directorTicks += 1
  await dispatch($, { type: 'daypart', daypart: daypartOf(hourAt(now)) })
  await dispatch($, { type: 'clock' })
  if (directorTicks % 2 === 0) await readRepo($)
  const s = await read($, scene)
  if (running(s).length === 0 || s.git || s.wait || s.compact) return
  const crewFor = now - s.crew.since
  if (s.crew.mode !== 'work') {
    if (crewFor > BREAK_MS) await dispatch($, { type: 'crew', mode: 'work' })
    return
  }
  if (s.turn?.interlude) {
    if (now - s.turn.interludeSince > INTERLUDE_MS) await dispatch($, { type: 'interlude', ensemble: null })
    return
  }
  const roll = Math.random()
  if (s.turn && roll < 0.25) await dispatch($, { type: 'interlude', ensemble: pick(ENSEMBLES) })
  else if (crewFor > 25_000 && roll < 0.75) await dispatch($, { type: 'crew', mode: pick(PLAYS) })
}

// ---------------------------------------------------------------- demo

const DEMO = 'demo-'
const SOLO: Kind[] = ['thinking', 'typing', 'research', 'errand']
const GIT_KINDS: GitKind[] = ['commit', 'push', 'pull', 'merge', 'conflict', 'pr']
const CREW: CrewMode[] = ['work', ...PLAYS]
const STATES: Activity[] = ['idle', 'happy', ...SOLO, ...ENSEMBLES]
const USAGE = [
  'Usage:',
  '/clawd · show or hide',
  '/clawd tour · every animation in about four minutes; /clawd stop ends it',
  `/clawd <${STATES.join('|')}>`,
  '/clawd helpers <0-12> · more than 6 sit with laptops',
  `/clawd git <${GIT_KINDS.join('|')}> [more…] · merge takes docs or crew: /clawd git merge crew`,
  `/clawd crew <${CREW.join('|')}>`,
  '/clawd tests <pass|fail>',
  '/clawd wait <permission|question|off>',
  '/clawd time [0-23|auto]',
  '/clawd repo <main|branch-name [ahead] [behind]|none>',
  '/clawd context <0-100> · /clawd week <0-100> · /clawd clock <minutes> [percent] (pin the numbers until /clawd stop)',
  '/clawd compact · /clawd refill',
  '/clawd render <frame|image> · /clawd size <px|auto> · /clawd debug',
].join('\n')

let tour: Timer[] = []
let demoCount = 0

// Pretend helpers for trying the scene; reconcile leaves their ids alone.
async function demoHelpers($: EngineInterface, n: number) {
  const demo = running(await read($, scene)).filter(m => m.id.startsWith(DEMO))
  for (const mini of demo.slice(n)) {
    await dispatch($, { type: 'agentEnd', id: mini.id })
    tickAfter($, LEAVE_MS)
  }
  for (let i = demo.length; i < n; i++) {
    demoCount += 1
    await dispatch($, { type: 'agentStart', id: `${DEMO}${demoCount}` })
  }
}

async function demoState($: EngineInterface, state: Activity) {
  const s = await read($, scene)
  if (state === 'idle') {
    await demoHelpers($, 0)
    await dispatch($, { type: 'quiet' })
  } else if (state === 'happy') {
    if (!s.turn) await dispatch($, { type: 'turnStart' })
    await dispatch($, { type: 'turnEnd' })
    tickAfter($, HAPPY_MS)
  } else if ((SOLO as string[]).includes(state)) {
    if (!s.turn || state === 'thinking') await dispatch($, { type: 'turnStart' })
    if (s.turn?.interlude) await dispatch($, { type: 'interlude', ensemble: null })
    if (state !== 'thinking') await dispatch($, { type: 'tool', kind: state as Kind })
  } else {
    if (!s.turn) await dispatch($, { type: 'turnStart' })
    if (running(s).length === 0) await demoHelpers($, 3)
    await dispatch($, { type: 'crew', mode: 'work' })
    await dispatch($, { type: 'interlude', ensemble: state as Ensemble })
  }
}

async function setHour($: EngineInterface, hour: number | null) {
  hourOverride = hour
  await dispatch($, { type: 'daypart', daypart: daypartOf(hourAt(await $.clock.now())) })
}

async function pinUsage($: EngineInterface, usage: Partial<Usage>) {
  usagePinned = true
  await applyUsage($, usage)
}

async function pinRepo($: EngineInterface, repo: Repo | null) {
  repoPinned = true
  await dispatch($, { type: 'repo', repo })
}

async function playCompact($: EngineInterface, seconds: number) {
  await dispatch($, { type: 'compactStart' })
  tour.push(
    $.clock.after(seconds * 1000, () => {
      void dispatch($, { type: 'compactEnd' })
      tickAfter($, SWEEP_TAIL_MS)
    }),
  )
}

async function stopDemo($: EngineInterface) {
  for (const timer of tour) timer.cancel()
  tour = []
  usagePinned = false
  repoPinned = false
  await setHour($, null)
  await demoHelpers($, 0)
  await dispatch($, { type: 'wait', wait: null })
  await dispatch($, { type: 'quiet' })
  const usage = await $.session.usage()
  await measured($, usageOf(usage.context, usage.rateLimits))
  await readRepo($)
}

// Every state, helper routine, git routine, time of day and usage sign in one
// pass.
function runTour($: EngineInterface) {
  const steps: [number, () => Promise<unknown>][] = [
    [0, () => demoState($, 'idle')],
    [1, () => pinRepo($, { branch: 'feature/clawd-room', base: 'main', ahead: 3, behind: 1 })],
    [6, () => demoState($, 'thinking')],
    [11, () => demoState($, 'research')],
    [16, () => demoState($, 'typing')],
    [21, () => playGit($, 'pull')],
    [29, () => playGit($, 'commit')],
    [37, () => playGit($, 'push')],
    [45, () => playGit($, 'testsFail')],
    [53, () => playGit($, 'testsPass')],
    [61, () => dispatch($, { type: 'wait', wait: 'permission' })],
    [66, () => dispatch($, { type: 'wait', wait: null })],
    [67, () => demoHelpers($, 6)],
    [74, () => demoState($, 'conduct')],
    [82, () => demoState($, 'errand')],
    [84, () => dispatch($, { type: 'crew', mode: 'football' })],
    [100, () => dispatch($, { type: 'crew', mode: 'work' })],
    [106, () => dispatch($, { type: 'crew', mode: 'sand' })],
    [118, () => dispatch($, { type: 'crew', mode: 'split' })],
    [130, () => dispatch($, { type: 'crew', mode: 'tower' })],
    [140, () => dispatch($, { type: 'crew', mode: 'work' })],
    [146, () => demoHelpers($, 8)],
    [152, () => playGit($, 'merge', 'mergeCrew')],
    [162, () => playGit($, 'merge', 'mergeDocs')],
    [171, () => playGit($, 'conflict')],
    [180, () => playGit($, 'pr')],
    [188, () => dispatch($, { type: 'wait', wait: 'question' })],
    [193, () => dispatch($, { type: 'wait', wait: null })],
    [194, () => pinRepo($, { branch: 'main', base: 'main', ahead: 0, behind: 0 })],
    [195, () => setHour($, 6)],
    [199, () => setHour($, 13)],
    [203, () => setHour($, 18)],
    [207, () => setHour($, 23)],
    [211, () => pinUsage($, { context: 40, week: 30, fiveHour: 20, fiveHourResetsAt: Date.now() + 3 * 3_600_000 })],
    [215, () => pinUsage($, { context: 78, week: 70, fiveHour: 60 })],
    [220, () => pinUsage($, { context: 94, week: 96, fiveHour: 92, fiveHourResetsAt: Date.now() + 12 * 60_000 })],
    [226, () => playCompact($, 6)],
    [235, () => pinUsage($, { context: 12 })],
    [237, () => pinUsage($, { week: 2 })],
    [252, () => demoHelpers($, 0)],
    [256, () => demoState($, 'happy')],
    [263, () => stopDemo($)],
  ]
  tour = steps.map(([at, step]) => $.clock.after(at * 1000, () => void step()))
}

async function demoCommand($: EngineInterface, args: string): Promise<string> {
  const words = args.trim().split(/\s+/)
  const what = (words[0] ?? '').toLowerCase()
  const rest = words.slice(1)
  const arg = (rest[0] ?? '').toLowerCase()
  switch (what) {
    case 'tour':
      await stopDemo($)
      runTour($)
      return 'Clawd tour started: every state, routine, time of day and usage sign in about four and a half minutes. /clawd stop ends it.'
    case 'stop':
      await stopDemo($)
      return 'Demo stopped; pretend helpers are heading out and the real clock, usage and branch are back.'
    case 'helpers': {
      const n = Number(arg)
      if (arg === '' || !Number.isInteger(n) || n < 0 || n > 12) return USAGE
      if (n > 0 && !(await read($, scene)).turn) await dispatch($, { type: 'turnStart' })
      await demoHelpers($, n)
      return `${n} pretend helper${n === 1 ? '' : 's'} on duty.`
    }
    case 'git': {
      const plays: [GitKind, 'docs' | 'crew' | null][] = []
      for (const word of rest.map(w => w.toLowerCase())) {
        const last = plays[plays.length - 1]
        if ((word === 'docs' || word === 'crew') && last?.[0] === 'merge' && last[1] === null) last[1] = word
        else if ((GIT_KINDS as string[]).includes(word)) plays.push([word as GitKind, null])
        else return USAGE
      }
      if (plays.length === 0) return USAGE
      plays.forEach(([kind, variant], i) => {
        const play = () =>
          variant === null ? playGit($, kind) : playGit($, kind, variant === 'crew' ? 'mergeCrew' : 'mergeDocs')
        if (i === 0) void play()
        else tour.push($.clock.after(i * (GIT_MS + 500), () => void play()))
      })
      return `Playing ${plays.map(([k, v]) => (v ? `${k} (${v})` : k)).join(', then ')}.`
    }
    case 'tests':
      if (arg !== 'pass' && arg !== 'fail') return USAGE
      await playGit($, arg === 'pass' ? 'testsPass' : 'testsFail')
      return arg === 'pass' ? 'Tests pass: green light.' : 'Tests fail: red light.'
    case 'crew':
      if (!(CREW as string[]).includes(arg)) return USAGE
      if (running(await read($, scene)).length === 0) await demoHelpers($, 6)
      await dispatch($, { type: 'crew', mode: arg as CrewMode })
      return `Helpers: ${arg}.`
    case 'wait':
      if (arg !== 'permission' && arg !== 'question' && arg !== 'off') return USAGE
      await dispatch($, { type: 'wait', wait: arg === 'off' ? null : arg })
      return arg === 'off' ? 'Clawd stops waiting.' : `Clawd is waiting on a ${arg}.`
    case 'time': {
      if (arg === '' || arg === 'auto') {
        if (arg === 'auto') await setHour($, null)
        const now = await $.clock.now()
        return `Clawd reads the hour as ${hourAt(now)}:00 (${daypartOf(hourAt(now))}). /clawd time <0-23> pretends another hour.`
      }
      const hour = Number(arg)
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return USAGE
      await setHour($, hour)
      return `Pretending it is ${hour}:00: ${daypartOf(hour)}.`
    }
    case 'repo': {
      if (arg === '') return USAGE
      if (arg === 'none') {
        await pinRepo($, null)
        return 'Pretending there is no repository.'
      }
      const branch = rest[0]!
      const ahead = Number(rest[1] ?? 3)
      const behind = Number(rest[2] ?? 1)
      await pinRepo($, branch === 'main' ? { branch: 'main', base: 'main', ahead: 0, behind: 0 } : { branch, base: 'main', ahead, behind })
      return branch === 'main' ? 'Pretending we are on main.' : `Pretending we are on ${branch}, ${ahead} ahead and ${behind} behind main.`
    }
    case 'context':
    case 'week': {
      const n = Number(arg)
      if (arg === '' || !Number.isFinite(n) || n < 0 || n > 100) return USAGE
      await pinUsage($, { [what]: n })
      return `Pretending ${what === 'week' ? 'the weekly limit' : 'the context'} is ${n}% used. /clawd stop returns to the real numbers.`
    }
    case 'clock': {
      const minutes = Number(arg)
      const percent = Number(rest[1] ?? 50)
      if (arg === '' || !Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(percent)) return USAGE
      await pinUsage($, { fiveHourResetsAt: (await $.clock.now()) + minutes * 60_000, fiveHour: percent })
      return `Pretending the 5-hour window resets in ${minutes} minutes, ${percent}% used.`
    }
    case 'compact':
      await playCompact($, 6)
      return 'Clawd sweeps up the context for six seconds.'
    case 'refill':
      await dispatch($, { type: 'refill' })
      tickAfter($, REFILL_MS)
      return 'A fresh carafe is on its way.'
    case 'debug': {
      const width = await read($, forcedWidth)
      return `Band layout: ${lastLayout}. Width: ${width === null ? `auto (${PX_PER_COLUMN}px per column)` : `${width}px`}.`
    }
    case 'size': {
      if (arg === 'auto') {
        await update($, forcedWidth, () => null)
        return 'Clawd sizes himself to the band again.'
      }
      const px = Number(arg)
      if (!Number.isFinite(px) || px < 200 || px > 4000) return USAGE
      await update($, forcedWidth, () => Math.round(px))
      return `Clawd is drawn ${Math.round(px)}px wide.`
    }
    case 'render':
      if (arg !== 'frame' && arg !== 'image') return USAGE
      await update($, isImage, () => arg === 'image')
      return arg === 'image'
        ? 'Drawing Clawd as an image: swaps may flash less, but the animation may not play there.'
        : 'Drawing Clawd in an animated frame (the default).'
  }
  if ((STATES as string[]).includes(what)) {
    await demoState($, what as Activity)
    return `Clawd: ${what}.`
  }
  return USAGE
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd',
      description: 'Show or hide the crab; tour, a state, helpers, git, crew, tests, wait, time, repo or usage to try the animations',
    })
    const now = await $.clock.now()
    await dispatch($, { type: 'reset', daypart: daypartOf(hourAt(now)) })
    const usage = await $.session.usage()
    await measured($, usageOf(usage.context, usage.rateLimits))
    await readRepo($)
    $.clock.every(RECONCILE_MS, () => void reconcile($))
    $.clock.every(DIRECTOR_MS, () => void direct($))

    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    if (e.args.trim() === '') {
      const hidden = await update($, isHidden, h => !h)
      return { text: hidden ? 'Clawd is napping.' : 'Clawd is back.' }
    }
    await update($, isHidden, () => false)
    return { text: await demoCommand($, e.args) }
  })

  on('turn.start', async ($, e, next) => {
    await dispatch($, e.agentId ? { type: 'agentStart', id: e.agentId } : { type: 'turnStart' })

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      await dispatch($, { type: 'agentEnd', id: e.agentId })
      tickAfter($, LEAVE_MS)
    } else {
      pendingKind?.cancel()
      await dispatch($, { type: 'turnEnd' })
      tickAfter($, HAPPY_MS)
    }

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await measured($, usageOf(e.context, e.rateLimits))

    return next(e)
  })

  // Clawd sweeps for exactly as long as the compaction runs.
  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    await dispatch($, { type: 'compactStart' })
    try {
      return await next(e)
    } finally {
      await dispatch($, { type: 'compactEnd' })
      tickAfter($, SWEEP_TAIL_MS)
    }
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    await dispatch($, { type: 'wait', wait: 'permission' })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'AskUserQuestion') await dispatch($, { type: 'wait', wait: 'question' })
    else settleKind($, kindOf(String(e.tool)))
    const ran = await next(e)
    if ((await read($, scene)).wait) await dispatch($, { type: 'wait', wait: null })
    if (e.tool === 'Bash' && !('deny' in ran && ran.deny)) {
      const kind = gitKindOf(e.command, ran.text ?? '', ran.isError === true)
      if (kind) await playGit($, kind)
      if (/\bgit\b/.test(e.command)) await readRepo($)
    }

    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    const s = await read($, scene)

    // The animation runs on the surface itself: SMIL inside the SVG on the
    // remote surfaces, the terminal's frame clock in a Client there.
    if (e.surface === 'terminal') {
      const { Client } = $.ui.resolve(e)
      return (
        <Client
          key="crab"
          module="./crab-terminal.tsx"
          props={{ activity: s.main.activity, helpers: running(s).length, label: labelOf(s) }}
          height={5}
        />
      )
    }

    // Sized from the band's columns (or the person's /clawd size), height
    // following the scene's proportions; the phone sizes it itself.
    lastLayout = JSON.stringify({ surface: e.surface, bodyColumns: e.props.bodyColumns, maxRows: e.props.maxRows, viewport: e.viewport ?? null })
    const { Svg } = $.ui.resolve(e)
    const now = await $.clock.now()
    const label = labelOf(s)
    const image = await read($, isImage)
    const forced = await read($, forcedWidth)
    const box = frameFor(e.surface, e.props.bodyColumns, e.props.maxRows, forced)
    const full = sceneSvg(s, now, false, box.view, box.px === null)
    return (
      <Svg
        source={full.length > SVG_BUDGET ? sceneSvg(s, now, true, box.view, box.px === null) : full}
        alt={label === '' ? 'Clawd the crab in his room' : `Clawd the crab: ${label}`}
        {...(box.px ?? {})}
        {...(image ? {} : { isInteractive: true as const })}
      />
    )
  })
}
