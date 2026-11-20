import type { Activity, CrewMode, Daypart, Ensemble, GitAct, GitKind, Kind, MainMotion, Mini, Repo, Scene, Usage, Wait } from '../types'

export const SEATS = 6
export const HAPPY_MS = 5000
export const GIT_MS = 8000
export const WALK_SPEED = 150
export const MINI_SPEED = 120
export const STAND_UP_S = 0.35
export const MINI_HOP = 0.25
export const DOOR_S = 0.5
export const SWEEP_TAIL_MS = 2500
export const REFILL_MS = 14_000
export const REFILL_DROP = 15
export const CLOCK_EPOCH_MS = 30 * 60_000

export const DOOR_X = 14
export const SHELF_X = 64
export const TOY_X = 114
export const PODIUM_X = 260
export const CENTER_X = 256
export const WINDOW_X = 236
export const BOARD_X = 386
export const DESK_X = 418
// The IN tray sits on Clawd's desk.
export const INBOX_X = DESK_X
export const COMMIT_X = 460
export const IDLE_X = 545
export const SWEEP_X = 442

export function seatX(seat: number): number {
  return 144 + 44 * seat
}

// Seconds a mini spends between the door and its stool, either way: the walk
// across the floor plus the hop on or off the stool.
export function miniWalk(seat: number): number {
  return (seatX(seat) - DOOR_X) / MINI_SPEED + MINI_HOP
}

export const LEAVE_MS = Math.ceil(((660 - DOOR_X) / MINI_SPEED + DOOR_S * 2 + 0.6) * 1000)

// [seconds, x] keyframes, looped every `loop` seconds; linear between keys so
// the SVG and pathX agree exactly.
export type Path = { keys: [number, number][]; loop: number }

function still(x: number): Path {
  return { keys: [[0, x]], loop: 1 }
}

// Walk a list of stops, pausing at each: the shape coffee and inspect share.
function rounds(stops: [number, number][]): Path {
  const keys: [number, number][] = []
  let t = 0
  let at = stops[0]![0]
  for (const [x, pause] of stops) {
    t += Math.abs(x - at) / WALK_SPEED
    keys.push([t, x])
    t += pause
    keys.push([t, x])
    at = x
  }
  keys[0] = [0, stops[0]![0]]
  return { keys, loop: t + Math.abs(stops[0]![0] - at) / WALK_SPEED }
}

const SEAT_STOPS = Array.from({ length: SEATS }, (_, i) => seatX(i) - 6)

type Pathed = Exclude<Activity, 'happy' | 'wait-permission' | 'wait-question'>

export const PATHS: Record<Pathed, Path> = {
  idle: still(IDLE_X),
  thinking: { keys: [[0, 330], [3, 400], [6, 330]], loop: 6 },
  typing: still(DESK_X),
  research: still(SHELF_X),
  errand: { keys: [[0, SHELF_X], [2.4, DESK_X], [4.8, SHELF_X]], loop: 4.8 },
  conduct: still(PODIUM_X),
  scurry: { keys: [[0, 190], [1.6, 430], [3.2, 190]], loop: 3.2 },
  coffee: rounds([[DESK_X, 1.2], ...SEAT_STOPS.map((x): [number, number] => [x, 0.8])]),
  standup: still(BOARD_X),
  inspect: rounds([[SEAT_STOPS[0]! - 30, 0.6], ...SEAT_STOPS.map((x): [number, number] => [x, 1.4])]),
  compact: { keys: [[0, SWEEP_X], [1.2, SWEEP_X + 24], [2.4, SWEEP_X]], loop: 2.4 },
  'git-pull': still(DESK_X),
  'git-push': still(INBOX_X),
  'git-commit': still(COMMIT_X),
  'git-mergeDocs': still(DESK_X),
  'git-mergeCrew': still(380),
  'git-conflict': still(390),
  'git-pr': still(WINDOW_X),
  'git-testsPass': still(DESK_X),
  'git-testsFail': still(DESK_X),
}

function hasPath(a: Activity): a is Pathed {
  return a in PATHS
}

// The moment in each loop the main crab reaches a seat: when a mug lands or a
// tick appears there.
export function seatVisits(activity: 'coffee' | 'inspect'): number[] {
  const { keys } = PATHS[activity]
  return SEAT_STOPS.map(x => keys.find(([, kx]) => kx === x)![0])
}

export function pathX(path: Path, t: number): number {
  const { keys, loop } = path
  if (keys.length === 1) return keys[0]![1]
  const at = ((t % loop) + loop) % loop
  const looped: [number, number][] = [...keys, [loop, keys[0]![1]]]
  for (let i = 1; i < looped.length; i++) {
    const [t0, x0] = looped[i - 1]!
    const [t1, x1] = looped[i]!
    if (at <= t1) return t1 === t0 ? x1 : x0 + ((x1 - x0) * (at - t0)) / (t1 - t0)
  }
  return keys[0]![1]
}

export function startX(main: MainMotion): number {
  return hasPath(main.activity) ? PATHS[main.activity].keys[0]![1] : main.fromX
}

function standUpS(main: MainMotion): number {
  return main.fromSitting && main.activity !== 'idle' ? STAND_UP_S : 0
}

export function transitSeconds(main: MainMotion): number {
  if (!hasPath(main.activity)) return standUpS(main)
  const distance = Math.abs(startX(main) - main.fromX)
  return standUpS(main) + (distance < 1 ? 0 : distance / WALK_SPEED)
}

export function mainX(main: MainMotion, now: number): number {
  const t = (now - main.since) / 1000
  const d = transitSeconds(main)
  if (t < d) {
    const up = standUpS(main)
    const walk = Math.max(0, t - up) / Math.max(d - up, 0.001)
    return main.fromX + (startX(main) - main.fromX) * Math.min(1, walk)
  }
  return hasPath(main.activity) ? pathX(PATHS[main.activity], t - d) : main.fromX
}

export function isSitting(main: MainMotion, now: number): boolean {
  if (main.activity !== 'idle') return main.fromSitting && (now - main.since) / 1000 < STAND_UP_S
  return (now - main.since) / 1000 >= transitSeconds(main)
}

export function running(scene: Scene): Mini[] {
  return scene.minis.filter(m => m.leftAt === null)
}

function desired(scene: Scene, now: number): Activity {
  if (scene.wait) return `wait-${scene.wait}`
  if (scene.compact) return 'compact'
  if (scene.git) return `git-${scene.git.act}`
  if (scene.turn) {
    const { interlude, kind } = scene.turn
    return interlude && running(scene).length > 0 && scene.crew.mode === 'work' ? interlude : kind
  }
  if (scene.doneAt !== null && now - scene.doneAt < HAPPY_MS) return 'happy'
  return 'idle'
}

export const ENSEMBLES: Ensemble[] = ['conduct', 'scurry', 'coffee', 'standup', 'inspect']
export const PLAYS: CrewMode[] = ['toys', 'football', 'sand', 'split', 'tower']

export function kindOf(tool: string): Kind {
  if (/^(Edit|Write|MultiEdit|NotebookEdit|Bash)$/.test(tool)) return 'typing'
  if (/^(Read|Grep|Glob|WebFetch|WebSearch|ToolSearch|LS)$/.test(tool)) return 'research'
  return 'errand'
}

const TEST_RUN =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bpytest\b|\bcargo\s+test\b|\bgo\s+test\b|\bswift\s+test\b|\bxcodebuild\b[^|;&]*\btest\b|\bvitest\b|\bjest\b|\bplugin\s+test\b/

// A git command that succeeded, or a test run, by what it did; null for
// anything else.
export function gitKindOf(command: string, output: string, isError: boolean): GitKind | null {
  if (TEST_RUN.test(command)) {
    return isError || /\b[1-9]\d* (failed|failing)\b|^FAIL\b|\(fail\)/m.test(output) ? 'testsFail' : 'testsPass'
  }
  const failed = isError || /\bCONFLICT\b|fatal:|error:|rejected/.test(output)
  if (/\bgit\s+(merge|rebase|pull)\b/.test(command) && /\bCONFLICT\b/.test(output)) return 'conflict'
  if (failed) return null
  if (/\bgh\s+pr\s+create\b/.test(command)) return 'pr'
  if (/\bgh\s+pr\s+merge\b|\bgit\s+merge\b/.test(command)) return 'merge'
  if (/\bgit\s+push\b/.test(command)) return 'push'
  if (/\bgit\s+(pull|fetch)\b/.test(command)) return 'pull'
  if (/\bgit\s+commit\b/.test(command)) return 'commit'
  return null
}

// A merge has two stagings: two helpers fusing into one needs two helpers.
export function gitActOf(kind: GitKind, helpers: number, coin: number): GitAct {
  if (kind === 'merge') return helpers >= 2 && coin < 0.5 ? 'mergeCrew' : 'mergeDocs'
  return kind
}

export function daypartOf(hour: number): Daypart {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export type Action =
  | { type: 'reset'; daypart: Daypart }
  | { type: 'turnStart' }
  | { type: 'tool'; kind: Kind }
  | { type: 'turnEnd' }
  | { type: 'agentStart'; id: string }
  | { type: 'agentEnd'; id: string }
  | { type: 'git'; kind: GitKind; act: GitAct }
  | { type: 'wait'; wait: Wait | null }
  | { type: 'crew'; mode: CrewMode }
  | { type: 'interlude'; ensemble: Ensemble | null }
  | { type: 'daypart'; daypart: Daypart }
  | { type: 'quiet' }
  | { type: 'usage'; usage: Partial<Usage> }
  | { type: 'compactStart' }
  | { type: 'compactEnd' }
  | { type: 'refill' }
  | { type: 'repo'; repo: Repo | null }
  | { type: 'clock' }
  | { type: 'tick' }

export function initialScene(now: number, daypart: Daypart = 'day'): Scene {
  return {
    main: { activity: 'idle', since: now - 60_000, fromX: IDLE_X, fromSitting: true },
    turn: null,
    doneAt: null,
    minis: [],
    git: null,
    wait: null,
    crew: { mode: 'work', since: now - 60_000, prev: 'work', prevSince: now - 60_000 },
    daypart,
    usage: { context: null, fiveHour: null, week: null, fiveHourResetsAt: null },
    compact: null,
    refill: null,
    repo: null,
    clockEpoch: Math.floor(now / CLOCK_EPOCH_MS),
  }
}

function crewTo(s: Scene, mode: CrewMode, now: number): Scene {
  return s.crew.mode === mode ? s : { ...s, crew: { mode, since: now, prev: s.crew.mode, prevSince: s.crew.since } }
}

function sameRepo(a: Repo | null, b: Repo | null): boolean {
  return a === b || (a !== null && b !== null && a.branch === b.branch && a.base === b.base && a.ahead === b.ahead && a.behind === b.behind)
}

function apply(s: Scene, a: Action, now: number): Scene {
  switch (a.type) {
    case 'reset':
      return { ...initialScene(now, a.daypart), usage: s.usage, repo: s.repo }
    case 'turnStart':
      return { ...s, turn: { startedAt: now, kind: 'thinking', interlude: null, interludeSince: now }, doneAt: null }
    case 'tool':
      return s.turn && s.turn.kind !== a.kind ? { ...s, turn: { ...s.turn, kind: a.kind } } : s
    case 'turnEnd':
      return { ...s, turn: null, wait: null, doneAt: now }
    case 'agentStart': {
      if (s.minis.some(m => m.id === a.id)) return s
      const taken = new Set(s.minis.map(m => m.seat))
      const seat = Array.from({ length: SEATS }, (_, i) => i).find(i => !taken.has(i)) ?? -1
      let tint = 0
      for (const ch of a.id) tint = (tint * 31 + ch.charCodeAt(0)) % 9973
      return { ...s, minis: [...s.minis, { id: a.id, seat, tint, arrivedAt: now, leftAt: null }] }
    }
    case 'agentEnd':
      return {
        ...s,
        minis: s.minis.map(m => (m.id === a.id && m.leftAt === null ? { ...m, leftAt: now } : m)),
      }
    case 'git': {
      const next = { ...s, git: { kind: a.kind, act: a.act, at: now } }
      if (a.act === 'conflict' && running(s).length > 0) return crewTo(next, 'fight', now)
      if (a.act === 'mergeCrew') return crewTo(next, 'merge', now)
      return next
    }
    case 'wait':
      return s.wait === a.wait ? s : { ...s, wait: a.wait }
    case 'crew':
      return running(s).length > 0 ? crewTo(s, a.mode, now) : s
    case 'interlude':
      return s.turn && s.turn.interlude !== a.ensemble
        ? { ...s, turn: { ...s.turn, interlude: a.ensemble, interludeSince: now } }
        : s
    case 'daypart':
      return s.daypart === a.daypart ? s : { ...s, daypart: a.daypart }
    case 'quiet':
      return { ...s, turn: null, doneAt: null, wait: null }
    case 'usage': {
      const usage = { ...s.usage, ...a.usage }
      const keys = ['context', 'fiveHour', 'week', 'fiveHourResetsAt'] as const
      if (keys.every(k => usage[k] === s.usage[k])) return s
      // The weekly window resetting shows as a fresh carafe being delivered.
      const reset = s.usage.week !== null && usage.week !== null && usage.week <= s.usage.week - REFILL_DROP
      return { ...s, usage, refill: reset ? { at: now, from: s.usage.week! } : s.refill }
    }
    case 'compactStart':
      return s.compact && s.compact.endedAt === null ? s : { ...s, compact: { since: now, endedAt: null } }
    case 'compactEnd':
      return s.compact && s.compact.endedAt === null ? { ...s, compact: { ...s.compact, endedAt: now } } : s
    case 'refill':
      return { ...s, refill: { at: now, from: s.usage.week ?? 100 } }
    case 'repo':
      return sameRepo(s.repo, a.repo) ? s : { ...s, repo: a.repo }
    case 'clock': {
      const epoch = Math.floor(now / CLOCK_EPOCH_MS)
      return epoch === s.clockEpoch ? s : { ...s, clockEpoch: epoch }
    }
    case 'tick':
      return s
  }
}

function prune(s: Scene, now: number): Scene {
  let next = s
  const minis = s.minis.filter(m => m.leftAt === null || now - m.leftAt < LEAVE_MS)
  if (minis.length !== s.minis.length) next = { ...next, minis }
  if (s.git && now - s.git.at >= GIT_MS) {
    next = { ...next, git: null }
    if (next.crew.mode === 'fight' || next.crew.mode === 'merge') next = crewTo(next, 'work', now)
  }
  if (s.doneAt !== null && now - s.doneAt >= HAPPY_MS) next = { ...next, doneAt: null }
  if (s.compact?.endedAt != null && now - s.compact.endedAt >= SWEEP_TAIL_MS) next = { ...next, compact: null }
  if (s.refill && now - s.refill.at >= REFILL_MS) next = { ...next, refill: null }
  if (running(next).length === 0 && next.crew.mode !== 'work') {
    next = { ...next, crew: { mode: 'work', since: now, prev: 'work', prevSince: now } }
  }
  return next
}

// Every change goes through here, so a new activity always starts from where
// the crab stands at that moment and walks to its new spot.
export function reduce(s: Scene, a: Action, now: number): Scene {
  const next = prune(apply(s, a, now), now)
  const activity = desired(next, now)
  if (activity === next.main.activity) return next
  return {
    ...next,
    main: {
      activity,
      since: now,
      fromX: mainX(next.main, now),
      fromSitting: isSitting(next.main, now),
    },
  }
}
