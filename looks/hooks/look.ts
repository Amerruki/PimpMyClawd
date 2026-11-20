import type { ThemeSetArgs } from 'claude-code'

import type { LooksArmed } from '../types'

import type { Hotspot } from './hotspot'

export type Look = {
  label: string
  args: ThemeSetArgs
  problems: readonly string[]
  scene?: string
  /** Clickable spots in the scene's side gutters. */
  hotspots?: readonly Hotspot[]
  /** How the scene is aligned in the window when cropped: xMidYMid (the default) or xMidYMin. */
  align?: 'mid' | 'min'
  /**
   * Actions this scene confirms itself: the first click arms the control and
   * the scene draws its confirm (feed.armed), a second click within a few
   * seconds acts with no dialog.
   */
  confirmInScene?: readonly LooksArmed[]
}
