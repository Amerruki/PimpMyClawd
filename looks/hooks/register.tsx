import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import type { LooksArmed, LooksFeed } from '../types'

import { noteTurn, runAction } from './actions'
import { hit, toScene } from './hotspot'
import type { HotspotAction } from './hotspot'

import { AERO, AERO_PROBLEMS, AERO_SCENE } from './aero'
import { AERO_AQUA } from './aero-aqua'
import { AERO_AURORA } from './aero-aurora'
import { AERO_CITY } from './aero-city'
import { AERO_DARK } from './aero-dark'
import { AERO_ECO } from './aero-eco'
import { AERO_ZEN } from './aero-zen'
import { CYBERPUNK2, cyberpunk2Scene } from './cyber2'
import { endTurn, markCompaction, registerFeed, startFeed, startTurn } from './feed-hooks'
import { readArmed, readEpoch, readFeed, readRealFeed, readSceneFeed, readSlot, setArmed, setSim, setSlot, startEpoch } from './feed-state'
import { hoistInlineStyles } from './hoist'
import { hasSvgFilter } from './kit'
import { MATRIX, MATRIX_CYAN, MATRIX_MAGENTA, MATRIX_ORANGE } from './matrix'
import { MOROCCO_CASABLANCA } from './morocco-casablanca'
import { MOROCCO_MARRAKECH } from './morocco-marrakech'
import { MOROCCO_RIAD } from './morocco-riad'
import { SPACE_BLACKHOLE } from './space-blackhole'
import { SPACE_DEEPFIELD } from './space-deepfield'
import { SPACE_EARTH } from './space-earth'
import { SPACE_GALAXY } from './space-galaxy'
import { SPACE_JUPITER } from './space-jupiter'
import { SPACE_MARS } from './space-mars'
import { SPACE_NEBULA } from './space-nebula'
import { SPACE_NEPTUNE } from './space-neptune'
import { SPACE_ORRERY } from './space-orrery'
import { SPACE_SATURN } from './space-saturn'
import { SPACE_URANUS } from './space-uranus'
import { SPACE_VENUS } from './space-venus'
import type { Look } from './look'
import { phaseShift } from './phase'
import { RETRO, retroScene } from './retro'
import { retroBand } from './retro-band'
import { SIM_HELP, simFeed } from './sim'
import { TERMINAL, terminalScene } from './terminal'
import { Y2K } from './y2k'

const LOOKS: Record<string, Look> = {
  aero: { label: 'Aero', args: AERO, problems: AERO_PROBLEMS, scene: AERO_SCENE },
  'aero-aqua': AERO_AQUA,
  'aero-eco': AERO_ECO,
  'aero-city': AERO_CITY,
  'aero-dark': AERO_DARK,
  'aero-aurora': AERO_AURORA,
  'aero-zen': AERO_ZEN,
  cyberpunk: { ...CYBERPUNK2, label: 'Cyberpunk' },
  y2k: Y2K,
  terminal: TERMINAL,
  matrix: MATRIX,
  'matrix-orange': MATRIX_ORANGE,
  'matrix-magenta': MATRIX_MAGENTA,
  'matrix-cyan': MATRIX_CYAN,
  retro: RETRO,
  'space-orrery': SPACE_ORRERY,
  'space-venus': SPACE_VENUS,
  'space-earth': SPACE_EARTH,
  'space-mars': SPACE_MARS,
  'space-jupiter': SPACE_JUPITER,
  'space-saturn': SPACE_SATURN,
  'space-uranus': SPACE_URANUS,
  'space-neptune': SPACE_NEPTUNE,
  'space-nebula': SPACE_NEBULA,
  'space-galaxy': SPACE_GALAXY,
  'space-deepfield': SPACE_DEEPFIELD,
  'space-blackhole': SPACE_BLACKHOLE,
  marrakech: MOROCCO_MARRAKECH,
  casablanca: MOROCCO_CASABLANCA,
  riad: MOROCCO_RIAD,
}

// Looks whose scene is drawn from the session feed (feed-hooks.ts) each time
// the backdrop is drawn, rather than from a fixed string.
const LIVE: Record<string, (f: LooksFeed) => string> = {
  terminal: terminalScene,
  retro: retroScene,
  // Draws only from the feed's turn-edge record, so its source changes, and
  // the app restarts its animations, at a turn's start and end alone.
  cyberpunk: cyberpunk2Scene,
}

// The backdrop hook reads the feed while drawing, so the engine draws the
// backdrop again when the feed changes. Should the app keep showing the scene
// it first drew under a name, turning this on also sets the theme again as
// each turn starts and ends, under a name fingerprinted from the scene then.
const RENAME_LIVE_SCENES = false

const DEFAULT_LOOK = 'aero'

// Old names that still work: Cyberpunk 2 took over `cyberpunk` when the first
// Cyberpunk look was retired.
const ALIASES: Record<string, string> = { 'cyberpunk-2': 'cyberpunk' }

const resolveName = (name: string): string => ALIASES[name] ?? name
const OFF = 'off'
const SVG_LIMIT = 131072

// The look in force, so the band can tell without reading the store on every draw.
let active = DEFAULT_LOOK

// Light and dark. 'auto' follows the app's own mode; 'dark' and 'light'
// force one version of the look whatever the app's mode, remembered per look.
type Mode = 'auto' | 'dark' | 'light'

const MODE_WORDS: Record<string, Mode> = {
  auto: 'auto',
  system: 'auto',
  dark: 'dark',
  night: 'dark',
  light: 'light',
  bright: 'light',
  day: 'light',
}

let mode: Mode = 'auto'

async function storedModes($: EngineInterface): Promise<Record<string, Mode>> {
  const v = await $.store.get('modes')
  const modes = v !== null && typeof v === 'object' ? { ...(v as Record<string, Mode>) } : {}

  // A version forced under an old name carries over to the new one.
  for (const [old, now] of Object.entries(ALIASES)) {
    if (modes[old] !== undefined && modes[now] === undefined) {
      modes[now] = modes[old]
    }
  }

  return modes
}

function hasMode(look: Look, m: 'dark' | 'light'): boolean {
  return look.args.colors?.inputs[m] !== undefined
}

// A scene pinned to one version: its dark-mode rules always or never apply.
function forceScene(svg: string, m: Mode): string {
  if (m === 'auto') {
    return svg
  }
  const on = '@media all'
  const off = '@media not all'

  return svg
    .replaceAll('@media (prefers-color-scheme: dark)', m === 'dark' ? on : off)
    .replaceAll('@media (prefers-color-scheme: light)', m === 'light' ? on : off)
}

// The theme pinned to one version. The scene is pinned by forceScene; the
// palette keeps both halves, because a palette made for one mode fails the
// app's contrast checks in the other's slot and the app then drops the whole
// theme. overrideColorScheme asks the surface to use the forced half: the
// mobile app does, the desktop app doesn't yet and follows its own mode.
function forceArgs(args: ThemeSetArgs, m: Mode): ThemeSetArgs {
  return m === 'auto' ? args : { ...args, overrideColorScheme: m }
}

// Each live scene's last drawn text and the source returned for it. A redraw
// whose text matches hands back the same source, so the app keeps the frame
// it has instead of loading it again.
const lastDrawn = new Map<string, { text: string; slot: number; source: string }>()

// The app stills a scene whose drawing gets too slow, as it can while the
// machine is busy, and plays it again only when the scene is drawn anew. Live
// scenes are drawn anew at least this often, so a still never lasts longer.
const REFRESH_MS = 5 * 60 * 1000
let refresh: Timer | undefined

async function liveSource($: EngineInterface, key: string, draw: (f: LooksFeed) => string): Promise<string> {
  const text = hoistInlineStyles(forceScene(draw({ ...(await readSceneFeed($)), armed: await readArmed($) }), mode))
  const slot = await readSlot($)
  const prior = lastDrawn.get(`${key}:${mode}`)

  if (prior?.text === text && prior.slot === slot) {
    return prior.source
  }
  const epoch = await readEpoch($)
  const now = await $.clock.now()
  // Shifted by the time since the session's epoch, the fresh scene picks up
  // its animations where the last one had them.
  const source = phaseShift(text, epoch > 0 ? (now - epoch) / 1000 : 0)

  lastDrawn.set(`${key}:${mode}`, { text, slot, source })

  return source
}

function listing(current: string): string {
  const names = [...Object.keys(LOOKS), OFF]

  return names
    .map(name => {
      const look = LOOKS[name]
      const modes = look === undefined ? '' : hasMode(look, 'light') && hasMode(look, 'dark') ? '' : hasMode(look, 'dark') ? ', dark only' : ', light only'

      return `${name === current ? '* ' : '  '}${name}${look ? ` (${look.label}${modes})` : ''}${name === current && mode !== 'auto' ? `  [${mode}]` : ''}`
    })
    .join('\n')
}

const HELP = [
  'Usage:',
  '  /skin                    list the skins (* marks the one in use)',
  '  /skin <name>             switch to a skin (two words work: /skin matrix orange)',
  '  /skin <name> dark|light  switch, forcing the dark or the light version',
  '  /skin <name> auto        switch, following the app\'s light or dark mode',
  '  /skin dark|light|auto    change the version of the skin in use',
  '  /skin off                back to the app\'s own theme',
  '  /skin sim <state>        try the live skins in a made-up session state (/skin sim for the list)',
  '  /skin help               this help',
  'Synonyms: bright or day for light, night for dark, system for auto.',
  'The version you force is remembered for each look.',
].join('\n')

// A short fingerprint of a scene's content. The app keeps drawing a scene it
// has seen under the same name, so the name carries the fingerprint and any
// change to the scene reaches the screen.
function fingerprint(text: string): string {
  let h = 5381

  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }

  return (h >>> 0).toString(36)
}

// A static scene as drawn: pinned to the mode in force, with its inline
// styles moved into the stylesheet. Built once per look and mode.
const drawnStatic = new Map<string, string>()

function staticSource(key: string, look: Look): string {
  const id = `${key}:${mode}`
  let source = drawnStatic.get(id)

  if (source === undefined) {
    source = hoistInlineStyles(forceScene(look.scene ?? '', mode))
    drawnStatic.set(id, source)
  }

  return source
}

function sceneName(key: string, look: Look): string {
  return look.scene === undefined ? key : `${key}--${fingerprint(forceScene(look.scene, mode))}`
}

function keyForScene(scene: string): string {
  return scene.replace(/--[a-z0-9]+$/, '')
}

// Sets the live look's theme again under a name taken from the scene the feed
// draws now (RENAME_LIVE_SCENES).
async function renameLive($: EngineInterface): Promise<void> {
  const draw = LIVE[active]
  const look = LOOKS[active]
  const backdrop = look?.args.backdrop

  if (draw === undefined || look === undefined || backdrop === undefined || !('scene' in backdrop) || typeof backdrop.scene !== 'string') {
    return
  }
  try {
    const scene = forceScene(draw(await readFeed($)), mode)

    await $.theme.set({ ...forceArgs(look.args, mode), backdrop: { ...backdrop, scene: `${active}--${fingerprint(scene)}` } })
  } catch {
    // The look stays as it was drawn last.
  }
}

async function apply($: EngineInterface, name: string): Promise<string> {
  if (name === OFF) {
    await $.theme.clear()

    return 'Skin turned off.'
  }
  const look = LOOKS[name]

  if (look === undefined) {
    return `No skin named "${name}".`
  }
  const unpainted = look.problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }
  if (look.scene !== undefined && look.scene.length > SVG_LIMIT) {
    $.ui.toast(`${look.label}: scene is ${look.scene.length} characters, over the app's ${SVG_LIMIT} limit, so the app's own background shows.`)
  }
  if (look.scene !== undefined && hasSvgFilter(look.scene)) {
    $.ui.toast(`${look.label} has an SVG filter, so the app shows it as a still picture.`)
  }
  const wanted = (await storedModes($))[name] ?? 'auto'
  // A skin with a palette for one mode only always draws in that mode: its
  // scene is pinned to it, and the palette asks the app for it too.
  const only: Mode | undefined = !hasMode(look, 'light') ? 'dark' : !hasMode(look, 'dark') ? 'light' : undefined
  mode = only ?? (wanted !== 'auto' && !hasMode(look, wanted) ? 'auto' : wanted)
  const forced = forceArgs(look.args, mode)
  const backdrop = forced.backdrop
  const args =
    backdrop !== undefined && 'scene' in backdrop && typeof backdrop.scene === 'string'
      ? { ...forced, backdrop: { ...backdrop, scene: sceneName(name, look) } }
      : forced
  if (name in LIVE) {
    await startEpoch($)
  }
  const set = await $.theme.set(args)

  const version = mode === 'auto' ? '' : ` (${mode})`
  const note =
    only !== undefined
      ? wanted !== 'auto' && wanted !== only
        ? ` It only comes in ${only}.`
        : ''
      : wanted !== mode
        ? ` It has no ${wanted} version yet, so it follows the app's mode.`
        : ''

  return set.isDrawn ? `Skin set to ${look.label}${version}.${note}` : `${look.label} is set, but nothing draws it here: ${set.reason}`
}

const ARM_MS = 6000
let armToken = 0

// A click on a control the scene confirms itself arms it on the first click
// and acts on a second within ARM_MS; anything else acts at once.
async function press($: EngineInterface, inScene: readonly LooksArmed[], action: HotspotAction): Promise<void> {
  const armable = inScene.find(a => a === action)

  if (armable === undefined) {
    void runAction($, action)
    return
  }
  if ((await readArmed($)) === armable) {
    armToken += 1
    await setArmed($, null)
    void runAction($, armable, true)
    return
  }
  const token = ++armToken

  await setArmed($, armable)
  $.clock.after(ARM_MS, () => {
    if (token === armToken) {
      void setArmed($, null)
    }
  })
}

async function simulate($: EngineInterface, words: string[], current: string): Promise<string> {
  if (words.length === 0) {
    return SIM_HELP
  }
  if (words.length === 1 && (words[0] === 'off' || words[0] === 'stop')) {
    await setSim($, null)

    return 'Sim off: the live looks show the real session again.'
  }
  const made = simFeed(await readRealFeed($), words, await $.clock.now())

  if ('error' in made) {
    return `${made.error}\n\n${SIM_HELP}`
  }
  await setSim($, made.feed)
  const shown = current in LIVE ? '' : ` ${LOOKS[current]?.label ?? 'This skin'} doesn't react to the session; try /skin terminal, retro or cyberpunk.`

  return `Sim on: ${made.summary}.${shown} /skin sim off to stop.`
}

export const register: Register = on => {
  registerFeed(on)

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      noteTurn(e.turnId)
      await startTurn($)

      if (RENAME_LIVE_SCENES) {
        await renameLive($)
      }
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      noteTurn(null)
      await endTurn($)

      if (RENAME_LIVE_SCENES) {
        await renameLive($)
      }
    }

    return next(e)
  })

  // Live scenes show a compaction of the main conversation while it runs.
  on('session.compact', async ($, e, next) => {
    const isShown = e.agentId === undefined && e.trigger !== 'precompute'

    if (isShown) {
      await markCompaction($, true)
    }
    try {
      return await next(e)
    } finally {
      if (isShown) {
        await markCompaction($, false)
      }
    }
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skin',
      description: 'Switch the app skin: /skin <name> [dark|light|auto], /skin help',
    })
    await startFeed($)
    const toSlot = async () => setSlot($, Math.floor((await $.clock.now()) / REFRESH_MS))
    await toSlot()
    refresh?.cancel()
    refresh = $.clock.every(REFRESH_MS, () => {
      void toSlot()
    })
    const stored = await $.store.get('look')
    const known = typeof stored === 'string' ? resolveName(stored) : ''
    const name = known === OFF || known in LOOKS ? known : DEFAULT_LOOK

    active = name

    if (name !== OFF) {
      await apply($, name)
    }

    return next(e)
  })

  on('command.run', { command: 'skin' }, async ($, e) => {
    const stored = await $.store.get('look')
    const current = typeof stored === 'string' ? resolveName(stored) : DEFAULT_LOOK
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(w => w !== '')

    if (words.length === 0) {
      return { text: `Skins:\n${listing(current)}\n\n/skin help for the options.` }
    }
    if (words[0] === 'help') {
      return { text: HELP }
    }
    if (words[0] === 'sim') {
      return { text: await simulate($, words.slice(1), current) }
    }
    // A look name may come in two words: `/skin matrix orange` is matrix-orange.
    if (words.length >= 2 && resolveName(`${words[0]}-${words[1]}`) in LOOKS) {
      words.splice(0, 2, resolveName(`${words[0]}-${words[1]}`))
    }
    words[0] = resolveName(words[0] as string)
    const first = words[0] as string
    const asMode = MODE_WORDS[first]
    // `/skin dark` changes the version of the look in use.
    const name = asMode !== undefined && words.length === 1 ? current : first
    const modeWord = asMode !== undefined && words.length === 1 ? first : words[1]

    if (name !== OFF && !(name in LOOKS)) {
      return { text: `No skin named "${name}".\n${listing(current)}\n\n/skin help for the options.` }
    }
    if (modeWord !== undefined) {
      const m = MODE_WORDS[modeWord]

      if (m === undefined) {
        return { text: `"${modeWord}" isn't a version: use dark, light or auto.\n\n${HELP}` }
      }
      if (name === OFF) {
        return { text: 'Turn a skin on first: /skin <name> dark|light|auto.' }
      }
      await $.store.set('modes', { ...(await storedModes($)), [name]: m })
    }
    await $.store.set('look', name)
    active = name

    return { text: await apply($, name) }
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => (active === 'retro' ? retroBand($, e, next) : next(e)))

  // Terminal marks the person's own prompts the way a shell does. The
  // terminal surface draws its own marker already.
  on('ui.render', { component: 'UserMessage' }, ($, e, next) =>
    active === 'terminal' && e.surface !== 'terminal' && e.props.origin.kind === 'composer' && !e.props.text.startsWith('> ')
      ? next({ ...e, props: { ...e.props, text: `> ${e.props.text}` } })
      : next(e),
  )

  // A click on the bare backdrop: the look's hotspot under it, if any.
  on('ui.pointer', async ($, e, next) => {
    const key = keyForScene(e.scene)
    const look = LOOKS[key]

    if (key === active && look?.hotspots !== undefined) {
      const at = toScene(e.x, e.y, look.align)
      const spot = hit(look.hotspots, at.x, at.y)

      if (spot !== undefined) {
        await press($, look.confirmInScene ?? [], spot.action)
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    const key = keyForScene(e.props.scene)
    const look = LOOKS[key]

    if (e.props.plugin !== 'looks' || look?.scene === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const draw = LIVE[key]
    // Reading the feed here subscribes this drawing to it: the backdrop's copy
    // changes at session start, each turn's start and end, and around a
    // compaction, and draws it again then.
    const source = draw === undefined ? staticSource(key, look) : await liveSource($, key, draw)

    // The app refuses an Svg source over this length; fall back to its own
    // backdrop rather than fail on every draw. No side effects here: anything
    // that changes the interface redraws this and restarts the scene.
    if (source.length > SVG_LIMIT) {
      return next(e)
    }

    // An interactive Svg gets its own frame, where CSS and SMIL animation run;
    // drawn as a plain image the scene may stay on its first frame.
    return <Svg source={source} alt={`${look.label} background`} isInteractive />
  })
}
