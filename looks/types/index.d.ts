// The session feed the Terminal and Retro looks draw from: a short rolling
// record of what the session is doing, kept in `$.state` under `looks`.

/** One shell command the Bash tool ran: its text cut short and masked. */
export type LooksCommand = {
  text: string
  /** true when it exited cleanly, false when the tool reported an error, null while it runs. */
  ok: boolean | null
}

/** Lines changed in the working tree against HEAD, as `git diff HEAD --shortstat` counts them. */
export type LooksDiff = { files: number; added: number; removed: number }

/**
 * What the session looked like at its last edge: session start, a turn's
 * start or end, and the start or end of a compaction. Written only there, so
 * a scene drawn from it alone stays the same string between edges.
 */
export type LooksEdge = {
  isWorking: boolean
  /** At a turn's end, the last thing it did in short English ("Bash: npm test"); "" otherwise. */
  detail: string
  /** When the edge was taken, in $.clock.now() milliseconds; null before the first. */
  at: number | null
  /** How long the turn that just ended took, in milliseconds; null otherwise. */
  turnMs: number | null
  /** null outside a git repository or when git did not answer. */
  diff: LooksDiff | null
  /** The context window's fill, 0 to 100; null when the engine has no reading yet. */
  context: number | null
  /** The seven-day rate-limit window; null off a subscription or before any reading. */
  week: { percentUsed: number; resetsAt: number } | null
  /** true while the main conversation is being compacted. */
  compacting: boolean
  /** When its last compaction finished, in $.clock.now() milliseconds; null before any. */
  compactedAt: number | null
}

export type LooksFeed = {
  /** The session's title as the app names it, cut short; "" when the engine has none. */
  session: string
  /** The project folder's name. */
  project: string
  /** The checked-out branch, or null outside a git repository. */
  branch: string | null
  /** The main loop's model, as /model shows it. */
  model: string
  isWorking: boolean
  /** What the session is doing now ("Running npm test", "Editing kit.ts"), "" when idle. */
  activity: string
  /** The last commands, oldest first. */
  commands: LooksCommand[]
  /** The last tool names, oldest first. */
  tools: string[]
  /** The last file names touched by Read, Edit and Write, most recent first, names only. */
  files: string[]
  /** Prompts the person has sent this session. */
  prompts: number
  /** When the running turn began, in $.clock.now() milliseconds; null when idle. */
  turnStartedAt: number | null
  /** How long the last finished turn took, in milliseconds. */
  lastTurnMs: number | null
  /** The session at its last turn edge, for scenes that redraw only there. */
  edge: LooksEdge
  /**
   * A control that was clicked once and waits for a second click to act
   * (`compact` or `stop`), so the scene can show its own confirm; set only
   * on the copy a scene is drawn from.
   */
  armed?: LooksArmed | null
}

/** The actions a scene may confirm in place rather than with a dialog. */
export type LooksArmed = 'compact' | 'stop'

declare module 'claude-code' {
  interface PluginState {
    looks: {
      /** Every change, as it happens: what the band reads. */
      feed: Shaped<LooksFeed>
      /** The feed as the backdrop last took it: at session start, each turn's start and end, and around a compaction. */
      scene: Shaped<LooksFeed>
      /** When this session first drew a live look, in $.clock.now() milliseconds; 0 before. */
      epoch: number
      /** A made-up session from `/skin sim`, drawn in place of the real one; null when off. */
      sim: Shaped<LooksFeed | null>
      /** A control waiting for its confirming second click; null when none. */
      armed: LooksArmed | null
      /** Which five-minute slot of the clock the live scene was last drawn in. */
      slot: number
    }
  }
}
