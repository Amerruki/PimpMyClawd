export type Kind = 'thinking' | 'typing' | 'research' | 'errand'
export type Ensemble = 'conduct' | 'scurry' | 'coffee' | 'standup' | 'inspect'
export type GitKind = 'commit' | 'push' | 'pull' | 'merge' | 'conflict' | 'pr' | 'testsPass' | 'testsFail'
export type GitAct = 'pull' | 'push' | 'commit' | 'mergeDocs' | 'mergeCrew' | 'conflict' | 'pr' | 'testsPass' | 'testsFail'
export type Wait = 'permission' | 'question'
export type Activity = 'idle' | 'happy' | 'compact' | Kind | Ensemble | `git-${GitAct}` | `wait-${Wait}`
export type CrewMode = 'work' | 'toys' | 'football' | 'sand' | 'split' | 'tower' | 'fight' | 'merge'
export type Daypart = 'dawn' | 'day' | 'dusk' | 'night'

export type Mini = {
  id: string
  seat: number
  tint: number
  arrivedAt: number
  leftAt: number | null
}

export type MainMotion = {
  activity: Activity
  since: number
  fromX: number
  fromSitting: boolean
}

export type Turn = {
  startedAt: number
  kind: Kind
  interlude: Ensemble | null
  interludeSince: number
}

export type Crew = {
  mode: CrewMode
  since: number
  prev: CrewMode
  prevSince: number
}

// Percentages, 0 to 100; null until the session has reported one.
export type Usage = {
  context: number | null
  fiveHour: number | null
  week: number | null
  fiveHourResetsAt: number | null
}

// The checkout the session runs in: the branch, the branch it would merge
// into, and how far apart they are.
export type Repo = {
  branch: string
  base: string
  ahead: number
  behind: number
}

export type Scene = {
  main: MainMotion
  turn: Turn | null
  doneAt: number | null
  minis: Mini[]
  git: { kind: GitKind; act: GitAct; at: number } | null
  wait: Wait | null
  crew: Crew
  daypart: Daypart
  usage: Usage
  compact: { since: number; endedAt: number | null } | null
  refill: { at: number; from: number } | null
  repo: Repo | null
  // Bumped every half hour so the wall clock gets a fresh run of minutes.
  clockEpoch: number
}

declare module 'claude-code' {
  interface PluginState {
    clawd: { scene: Scene; isHidden: boolean; isImage: boolean; width: number | null }
  }
}
