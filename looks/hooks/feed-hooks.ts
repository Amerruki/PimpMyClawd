import type { EngineInterface, Register } from 'claude-code'

import type { LooksDiff, LooksEdge, LooksFeed } from '../types'
import {
  activityOf, baseName, changeFeed as change, commandText, cut, parseShortstat, pushCommand, pushFile, pushTool, shortActivity, snapshotFeed as snapshot,
} from './feed-state'

type On = Parameters<Register>[0]

const FILE_TOOLS = new Set(['Read', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit'])

async function branchOf($: EngineInterface, cwd: string): Promise<string | null> {
  try {
    // symbolic-ref names the branch even before its first commit, where
    // rev-parse HEAD fails.
    const { exitCode, stdout } = await $.process.run(['git', 'symbolic-ref', '--short', '-q', 'HEAD'], { cwd, timeoutMs: 3000 })
    const name = stdout.trim()

    return exitCode === 0 && name !== '' ? cut(name, 40) : null
  } catch {
    return null
  }
}

async function where($: EngineInterface): Promise<Pick<LooksFeed, 'project' | 'branch' | 'model'>> {
  let root = ''
  let model = ''

  try {
    root = await $.session.root()
  } catch {
    root = ''
  }
  try {
    model = await $.session.model()
  } catch {
    model = ''
  }

  return { project: cut(baseName(root), 32), branch: root === '' ? null : await branchOf($, root), model: cut(model, 32) }
}

async function diffOf($: EngineInterface): Promise<LooksDiff | null> {
  try {
    const cwd = await $.session.root()
    const { exitCode, stdout } = await $.process.run(['git', 'diff', 'HEAD', '--shortstat'], { cwd, timeoutMs: 2500 })

    if (exitCode === 0) {
      return parseShortstat(stdout)
    }
    // A repository with no commits yet has no HEAD to compare with: count the
    // files waiting for their first commit instead.
    const status = await $.process.run(['git', 'status', '--porcelain', '--untracked-files=all'], { cwd, timeoutMs: 2500 })

    return status.exitCode === 0 ? { files: status.stdout.split('\n').filter(l => l.trim() !== '').length, added: 0, removed: 0 } : null
  } catch {
    return null
  }
}

// The context window's fill and the seven-day window, as the status line has
// them. The plain call is free; a figure the engine lacks stays null.
async function usageOf($: EngineInterface): Promise<Pick<LooksEdge, 'context' | 'week'>> {
  try {
    const { context, rateLimits } = await $.session.usage()
    const week = rateLimits.find(r => r.kind === 'seven_day')
    const resetsAt = week?.resetsAt === undefined ? NaN : Date.parse(week.resetsAt)

    return {
      context: typeof context.percent === 'number' ? Math.max(0, Math.min(100, Math.round(context.percent))) : null,
      week: week !== undefined && Number.isFinite(resetsAt) ? { percentUsed: week.percentUsed, resetsAt } : null,
    }
  } catch {
    return { context: null, week: null }
  }
}

// Fills the feed in at the session's start: called from the module's one
// session.start hook.
export async function startFeed($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const [place, diff, usage] = await Promise.all([where($), diffOf($), usageOf($)])

  await change($, f => ({
    ...f,
    ...place,
    isWorking: false,
    activity: '',
    turnStartedAt: null,
    edge: { ...f.edge, ...usage, isWorking: false, detail: '', at: now, turnMs: null, diff },
  }))
  await snapshot($)
}

// Marks a main-loop turn as started: called from the module's turn.start hook.
// The backdrop takes the change too, so a live scene shows the session working.
export async function startTurn($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const [place, usage] = await Promise.all([where($), usageOf($)])

  await change($, f => ({
    ...f,
    ...place,
    isWorking: true,
    activity: 'Thinking',
    turnStartedAt: now,
    edge: { ...f.edge, ...usage, isWorking: true, detail: '', at: now, turnMs: null },
  }))
  await snapshot($)
}

// Marks a main-loop turn as done: called from the module's turn.complete hook.
export async function endTurn($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const [place, diff, usage] = await Promise.all([where($), diffOf($), usageOf($)])

  await change($, f => ({
    ...f,
    ...place,
    isWorking: false,
    activity: '',
    edge: {
      ...usage,
      isWorking: false,
      detail: f.activity === '' ? '' : shortActivity(f.activity),
      at: now,
      turnMs: f.turnStartedAt === null ? null : now - f.turnStartedAt,
      diff,
      compacting: false,
      compactedAt: f.edge.compactedAt,
    },
    lastTurnMs: f.turnStartedAt === null ? f.lastTurnMs : now - f.turnStartedAt,
    turnStartedAt: null,
    commands: f.commands.map(c => (c.ok === null ? { ...c, ok: false } : c)),
  }))
  await snapshot($)
}

// Marks a compaction of the main conversation as running or finished, and
// hands the backdrop the change at once: the one redraw outside a turn's
// edges. It never throws, so the compaction it wraps is never disturbed.
export async function markCompaction($: EngineInterface, running: boolean): Promise<void> {
  let now: number | null = null

  try {
    now = await $.clock.now()
  } catch {
    now = null
  }
  // A finished compaction has emptied the window: read its fill again.
  const usage = running ? {} : await usageOf($)

  await change($, f => ({ ...f, edge: { ...f.edge, ...usage, compacting: running, compactedAt: running ? f.edge.compactedAt : now } }))
  await snapshot($)
}

// Keeps the session's title, which the engine hands to the classic prompt and
// session-start hooks; it has no call that reads it.
async function noteTitle($: EngineInterface, title: unknown): Promise<void> {
  const name = typeof title === 'string' ? cut(title.trim(), 40) : ''

  if (name !== '') {
    await change($, f => (f.session === name ? f : { ...f, session: name }))
  }
}

// The feed's own hooks. Session start and the turn edges are hooked by the
// module's register (one hook per event), which calls the functions above.
export function registerFeed(on: On): void {
  on('classic.SessionStart', async ($, e, next) => {
    await noteTitle($, e.session_title)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.UserPromptSubmit', async ($, e, next) => {
    await noteTitle($, e.session_title)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    if (e.command === undefined && e.isMeta === undefined) {
      await change($, f => ({ ...f, prompts: f.prompts + 1 }))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const input = e as { command?: unknown; file_path?: unknown; notebook_path?: unknown }
    const isBash = e.tool === 'Bash' && typeof input.command === 'string'
    const text = isBash ? commandText(input.command as string) : ''
    const file = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : undefined

    await change($, f => ({
      ...f,
      activity: activityOf(e.tool, input),
      tools: pushTool(f.tools, e.tool),
      commands: isBash ? pushCommand(f.commands, { text, ok: null }) : f.commands,
      files: file !== undefined && FILE_TOOLS.has(e.tool) ? pushFile(f.files, file) : f.files,
    }))
    const ran = await next(e)

    if (isBash) {
      const ok = ran.deny === undefined && ran.isError !== true

      await change($, f => {
        const at = f.commands.findLastIndex(c => c.ok === null && c.text === text)

        return at < 0 ? f : { ...f, commands: f.commands.map((c, i) => (i === at ? { ...c, ok } : c)) }
      })
    }

    return ran
  }).catch(($, e, next) => next(e))
}
