import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { LooksArmed, LooksCommand, LooksDiff, LooksFeed } from '../types'

export const COMMANDS_KEPT = 8
export const TOOLS_KEPT = 8
export const FILES_KEPT = 6
const COMMAND_CHARS = 60

export const EMPTY_FEED: LooksFeed = {
  session: '',
  project: '',
  branch: null,
  model: '',
  isWorking: false,
  activity: '',
  commands: [],
  tools: [],
  files: [],
  prompts: 0,
  turnStartedAt: null,
  lastTurnMs: null,
  edge: { isWorking: false, detail: '', at: null, turnMs: null, diff: null, context: null, week: null, compacting: false, compactedAt: null },
}

// Change the tag when LooksFeed's fields change: a value stored by older code
// outlives a reload, and the tag is how this code declines it.
const feed = atom({ plugin: 'looks', key: 'feed' } as const, EMPTY_FEED, { shape: 'feed-4' })

// Live scenes draw from this copy, taken only at session start, at each
// turn's start and end, and around a compaction: every change to a scene's
// source makes the app load it afresh, so the backdrop changes at those edges
// alone, while the band reads every change.
const sceneFeed = atom({ plugin: 'looks', key: 'scene' } as const, EMPTY_FEED, { shape: 'feed-4' })

// When this session first drew a live look, in $.clock.now() milliseconds; 0
// until then. Scenes are phase-shifted by the time since, so a redrawn scene
// picks up where the last one was.
const epoch = atom({ plugin: 'looks', key: 'epoch' } as const, 0)

// A made-up session from `/skin sim`, drawn in place of the real one while
// set; null when off. The real feed keeps updating underneath.
const sim = atom({ plugin: 'looks', key: 'sim' } as const, null, { shape: 'feed-4' })

// Every change as it happens. Read while drawing, it subscribes the drawing.
export async function readFeed($: EngineInterface): Promise<LooksFeed> {
  return (await read($, sim)) ?? read($, feed)
}

// The copy the backdrop draws from. Read while drawing, it subscribes the drawing.
export async function readSceneFeed($: EngineInterface): Promise<LooksFeed> {
  return (await read($, sim)) ?? read($, sceneFeed)
}

// The real feed, whatever the sim says: the base a sim is built on.
export function readRealFeed($: EngineInterface): Promise<LooksFeed> {
  return read($, feed)
}

const armed = atom({ plugin: 'looks', key: 'armed' } as const, null as LooksArmed | null)

// Read while drawing, it subscribes the drawing, so arming redraws the scene.
export async function readArmed($: EngineInterface): Promise<LooksArmed | null> {
  try {
    return await read($, armed)
  } catch {
    return null
  }
}

export async function setArmed($: EngineInterface, value: LooksArmed | null): Promise<void> {
  try {
    await update($, armed, () => value)
  } catch {
    // The scene simply shows no confirm.
  }
}

export async function setSim($: EngineInterface, value: LooksFeed | null): Promise<void> {
  await update($, sim, () => value)
}

export async function changeFeed($: EngineInterface, fn: (f: LooksFeed) => LooksFeed): Promise<void> {
  try {
    await update($, feed, fn)
  } catch {
    // The feed is decoration: a failed write must never touch the session.
  }
}

// Copies the feed to the backdrop's copy.
export async function snapshotFeed($: EngineInterface): Promise<void> {
  try {
    const current = await read($, feed)

    await update($, sceneFeed, () => current)
  } catch {
    // As above.
  }
}

export async function readEpoch($: EngineInterface): Promise<number> {
  try {
    return await read($, epoch)
  } catch {
    return 0
  }
}

// Sets the epoch the first time a live look is drawn this session.
export async function startEpoch($: EngineInterface): Promise<void> {
  try {
    const now = await $.clock.now()

    await update($, epoch, e => (e > 0 ? e : now))
  } catch {
    // As above.
  }
}

// Hides what looks like a credential before a command is kept anywhere:
// key=value pairs whose key names a secret, bearer and basic auth, URL
// userinfo, well-known token prefixes and any long unbroken run of key-ish
// characters.
const SECRET_WORD = '[A-Za-z0-9_-]*(?:token|secret|passw(?:or)?d|passwd|pwd|api[_-]?key|apikey|access[_-]?key|private[_-]?key|auth|credential|cookie)[A-Za-z0-9_-]*'
const SECRET_PAIR = new RegExp(`\\b(${SECRET_WORD})(\\s*[=:]\\s*)("[^"]*"|'[^']*'|\\S+)`, 'gi')
const SECRET_FLAG = new RegExp(`(\\s-{1,2}${SECRET_WORD})(\\s+)("[^"]*"|'[^']*'|\\S+)`, 'gi')
const BEARER = /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi
const URL_USER = /(:\/\/)[^\s/@:]+:[^\s/@]+@/g
const PREFIXED = /\b(?:(?:sk|pk|rk)[-_]|gh[opusr]_|github_pat_|glpat-|xox[abposr]-|AKIA|ASIA|AIza|ya29\.|shpat_|shpss_|npm_|SG\.)[A-Za-z0-9._-]{8,}/g
const LONG_RUN = /[A-Za-z0-9+/_=-]{24,}/g

// A long run is kept when it reads as a path or a word chain, masked when it
// mixes letters and digits the way keys and tokens do.
const isKeyish = (run: string): boolean => /\d/.test(run) && /[A-Za-z]/.test(run) && !run.includes('/')

export function mask(command: string): string {
  return command
    .replace(URL_USER, '$1***@')
    .replace(BEARER, '$1 ***')
    .replace(SECRET_PAIR, (_, k: string, sep: string) => `${k}${sep}***`)
    .replace(SECRET_FLAG, (_, k: string, sep: string) => `${k}${sep}***`)
    .replace(PREFIXED, '***')
    .replace(LONG_RUN, run => (isKeyish(run) ? '***' : run))
}

export function cut(text: string, max: number): string {
  const one = text.replace(/\s+/g, ' ').trim()

  return one.length <= max ? one : `${one.slice(0, max - 1)}…`
}

export function commandText(command: string): string {
  return cut(mask(command), COMMAND_CHARS)
}

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(p => p !== '')

  return parts.at(-1) ?? path
}

// `mcp__server__tool` reads as `tool`; built-in names stay as they are.
export function toolName(tool: string): string {
  return tool.startsWith('mcp__') ? (tool.split('__').at(-1) ?? tool) : tool
}

export function activityOf(tool: string, input: { command?: unknown; file_path?: unknown; notebook_path?: unknown; pattern?: unknown }): string {
  const file = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : undefined

  switch (tool) {
    case 'Bash':
      return typeof input.command === 'string' ? `Running ${cut(mask(input.command), 34)}` : 'Running a command'
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return file === undefined ? 'Editing' : `Editing ${cut(baseName(file), 30)}`
    case 'Read':
      return file === undefined ? 'Reading' : `Reading ${cut(baseName(file), 30)}`
    case 'Grep':
    case 'Glob':
      return 'Searching the project'
    case 'WebFetch':
    case 'WebSearch':
      return 'Reading the web'
    case 'Agent':
    case 'Task':
      return 'Delegating to an agent'
    case 'TodoWrite':
      return 'Planning'
    default:
      return `Using ${cut(toolName(tool), 28)}`
  }
}

export function pushCommand(list: readonly LooksCommand[], one: LooksCommand): LooksCommand[] {
  return [...list, one].slice(-COMMANDS_KEPT)
}

export function pushTool(list: readonly string[], tool: string): string[] {
  return [...list, toolName(tool)].slice(-TOOLS_KEPT)
}

export function pushFile(list: readonly string[], file: string): string[] {
  const name = baseName(file)

  return [name, ...list.filter(f => f !== name)].slice(0, FILES_KEPT)
}

export function seconds(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))

  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`
}

// Named references only: the app refuses a scene holding any other, &#39; included.
export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// A time of day in 12-hour form, from $.clock.now() milliseconds.
export function clockText(ms: number | undefined): string {
  if (ms === undefined) {
    return '--:--'
  }
  const d = new Date(ms)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')

  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

// The activity in the short form a sign has room for: "Bash: npm test".
export function shortActivity(activity: string): string {
  const [verb, ...rest] = activity.split(' ')
  const tail = rest.join(' ')
  const tag = verb === 'Running' ? 'Bash' : verb === 'Editing' ? 'Edit' : verb === 'Reading' ? 'Read' : ''

  return cut(tag !== '' && tail !== '' && tail !== 'a command' ? `${tag}: ${tail}` : activity, 28)
}

// `git diff --shortstat` output: " 3 files changed, 12 insertions(+), 4 deletions(-)".
export function parseShortstat(text: string): LooksDiff {
  const num = (re: RegExp) => Number(re.exec(text)?.[1] ?? 0)

  return { files: num(/(\d+) files? changed/), added: num(/(\d+) insertions?\(\+\)/), removed: num(/(\d+) deletions?\(-\)/) }
}
