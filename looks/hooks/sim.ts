import type { LooksFeed } from '../types'

// `/skin sim ...`: a made-up session for trying the live looks in states that
// are slow or awkward to reach for real (a failed command, a full context
// window, a compaction). The words build a feed that the live looks draw from
// in place of the real one until `/skin sim off`.

const HOUR = 3_600_000

export const SIM_HELP = [
  'Simulate session states on the live skins (terminal, retro, cyberpunk):',
  '  /skin sim <words>        e.g. /skin sim working context 85 week 92',
  '  /skin sim off            back to the real session',
  'States (later words win):',
  '  idle        a finished turn, all commands passed (the default)',
  '  fresh       a new session: no prompts, no commands, clean tree',
  '  working     a turn running a command',
  '  failed      the last command failed',
  '  compacting  the conversation is being compacted',
  '  compacted   a compaction just finished',
  'Numbers:',
  '  context <0-100>   context window fill',
  '  week <0-100>      weekly usage',
  '  reset <hours>     time left until the weekly reset (default 53)',
  'Other:',
  '  diff clean|small|big   working tree changes',
  '  nogit       outside a git repository',
  '  nousage     no context or weekly readings',
].join('\n')

const COMMANDS = ['git status --short', 'npx tsc -p . --noEmit', 'npm test']

export type SimResult = { feed: LooksFeed; summary: string } | { error: string }

const percent = (word: string | undefined): number | undefined => {
  const n = Number(word)

  return word !== undefined && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : undefined
}

export function simFeed(real: LooksFeed, words: readonly string[], now: number): SimResult {
  let f: LooksFeed = {
    ...real,
    session: real.session || 'Looks review',
    project: real.project || 'ClaudeMods',
    branch: real.branch ?? 'main',
    model: real.model || 'claude-opus-5-5',
    isWorking: false,
    activity: '',
    commands: COMMANDS.map(text => ({ text, ok: true })),
    tools: ['Read', 'Edit', 'Bash', 'Grep'],
    files: ['register.tsx', 'sim.ts', 'feed-state.ts'],
    prompts: 12,
    turnStartedAt: null,
    lastTurnMs: 72_000,
    edge: {
      isWorking: false,
      detail: 'Bash: npm test',
      at: now,
      turnMs: 72_000,
      diff: { files: 3, added: 128, removed: 41 },
      context: 35,
      week: { percentUsed: 40, resetsAt: now + 53 * HOUR },
      compacting: false,
      compactedAt: null,
    },
  }
  const edge = (patch: Partial<LooksFeed['edge']>) => {
    f = { ...f, edge: { ...f.edge, ...patch } }
  }
  const lastCommand = (ok: boolean | null) => {
    f = { ...f, commands: [...f.commands.slice(0, -1), { text: 'npm test', ok }] }
  }
  let week = f.edge.week?.percentUsed ?? 40
  let resetHours = 53
  let usage = true

  for (let i = 0; i < words.length; i++) {
    const word = words[i] as string
    const next = words[i + 1]

    switch (word) {
      case 'idle':
        break
      case 'fresh':
        f = { ...f, commands: [], tools: [], files: [], prompts: 0, lastTurnMs: null }
        edge({ detail: '', turnMs: null, diff: { files: 0, added: 0, removed: 0 }, context: 0 })
        break
      case 'working':
        f = { ...f, isWorking: true, activity: 'Running npm test', turnStartedAt: now - 25_000, prompts: f.prompts + 1 }
        lastCommand(null)
        edge({ isWorking: true, detail: '', turnMs: null })
        break
      case 'failed':
        lastCommand(false)
        edge({ detail: 'Bash: npm test' })
        break
      case 'compacting':
        edge({ compacting: true })
        break
      case 'compacted':
        // A compaction that finished after the last turn edge, with the window emptied.
        edge({ compacting: false, at: now - 2000, compactedAt: now, context: 8 })
        break
      case 'context':
      case 'week':
      case 'reset': {
        const n = word === 'reset' ? Number(next) : percent(next)

        if (n === undefined || !Number.isFinite(n) || n < 0) {
          return { error: `"${word}" needs a number after it${word === 'reset' ? ' (hours)' : ' from 0 to 100'}.` }
        }
        if (word === 'context') edge({ context: n })
        else if (word === 'week') week = n
        else resetHours = n
        i++
        break
      }
      case 'diff': {
        const diffs = { clean: { files: 0, added: 0, removed: 0 }, small: { files: 3, added: 128, removed: 41 }, big: { files: 47, added: 18_420, removed: 6_310 } }
        const d = diffs[next as keyof typeof diffs]

        if (d === undefined) {
          return { error: '"diff" takes clean, small or big.' }
        }
        edge({ diff: d })
        i++
        break
      }
      case 'nogit':
        f = { ...f, branch: null }
        edge({ diff: null })
        break
      case 'nousage':
        usage = false
        break
      default:
        return { error: `"${word}" isn't a sim word.` }
    }
  }
  edge(usage ? { week: { percentUsed: week, resetsAt: (f.edge.at ?? now) + resetHours * HOUR } } : { context: null, week: null })

  const e = f.edge
  const state = e.compacting ? 'compacting' : e.compactedAt !== null ? 'just compacted' : f.isWorking ? 'working' : f.prompts === 0 ? 'fresh' : 'idle'
  const last = f.commands.at(-1)
  const parts = [
    state,
    last === undefined ? 'no commands' : last.ok === false ? 'last command failed' : last.ok === null ? 'command running' : 'commands passed',
    e.context === null ? 'no context reading' : `context ${e.context}%`,
    e.week === null ? 'no weekly reading' : `week ${e.week.percentUsed}%, resets in ${resetHours}h`,
    e.diff === null ? 'no git' : e.diff.files === 0 ? 'clean tree' : `${e.diff.files} files changed`,
  ]

  return { feed: f, summary: parts.join(', ') }
}
