import { makeColors } from './make-colors.js'
import type { LooksFeed } from '../types'
import { EMPTY_FEED } from './feed-state'
import { GUTTER_CSS } from './gutter'
import { svg } from './kit'
import type { Look } from './look'
import { keyCaps, logPane, statusPane, TERMINAL_SPOTS } from './terminal-panes'

// A calm terminal workspace in two profiles: night is warm near-black with
// off-white text, day is warm paper with dark ink; both keep the coral accent
// and ANSI-style roles. The middle, behind the conversation, is plain ground
// with one soft glow. The session lives in the side gutters: a command log
// with a blinking cursor and two key caps on the left, a status pane on the
// right. Each section the person can click carries a coral hint ("switch ›")
// at rest, since the app sends no hover. ^C confirms in the scene: the first
// click arms it and the key asks to be pressed again.
const { theme, problems } = makeColors({
  label: 'Terminal',
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  roles: { accent: '#d97757', danger: '#c8433a', success: '#3f8a43', warning: '#9a6a12', pro: '#7a5cc4' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f3efe7',
        'surface-1': '#f7f4ee',
        'surface-2': '#fbf9f5',
        'text-primary': '#24201c',
        'text-secondary': '#46403a',
        'text-muted': '#645d54',
      },
    },
    git: {
      added: '#2f7d35',
      removed: '#b8382f',
      modified: '#8a5d0c',
      merged: '#6a4cb8',
      closed: '#b8382f',
      conflicting: '#a5521a',
      draft: '#6a645b',
    },
  },
  dark: {
    roles: { accent: '#d97757', danger: '#e5534b', success: '#6cc070', warning: '#e0a83a', pro: '#a98ee0' },
    gray: {
      anchors: {
        'surface-0': '#0e0d0c',
        'surface-1': '#141311',
        'surface-2': '#1a1816',
        'surface-3': '#201e1b',
        'text-primary': '#ece8e1',
        'text-secondary': '#c6c0b6',
        'text-muted': '#9d968b',
      },
    },
    git: {
      added: '#6cc070',
      removed: '#e5534b',
      modified: '#e0a83a',
      merged: '#a98ee0',
      closed: '#e5534b',
      conflicting: '#e58a3a',
      draft: '#8c867d',
    },
  },
})

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const CSS = `
:root, svg {
  --bg: #f3efe7; --bg-edge: #ebe5da; --ink: #2a2420; --muted: #7a7064; --coral: #c15f3c; --ok: #2f7d35; --bad: #b8382f; --warn: #94650f;
  --pane: #faf7f1; --pane-a: .92; --strip: #f1ebe1; --line: #ddd3c4; --hair: #e6ddd0;
  --hl: #c15f3c; --hl-a: .07; --glow: .03; --off: #2a2420; --off-a: .1;
  --cap: #e9e2d6; --cap-top: #fbf8f2; --cap-line: #d4c9b8;
}
@media (prefers-color-scheme: dark) { :root, svg {
  --bg: #100e0d; --bg-edge: #0b0a09; --ink: #e9e3d9; --muted: #8e867b; --coral: #e0805f; --ok: #79c47c; --bad: #ec6a61; --warn: #e3ad48;
  --pane: #181614; --pane-a: .94; --strip: #1d1b18; --line: #2c2824; --hair: #26231f;
  --hl: #e0805f; --hl-a: .09; --glow: .07; --off: #e9e3d9; --off-a: .1;
  --cap: #0c0b0a; --cap-top: #1f1c19; --cap-line: #34302b;
} }
.ground { fill: var(--bg); }
.edge-a { stop-color: var(--bg-edge); stop-opacity: 0; } .edge-b { stop-color: var(--bg-edge); stop-opacity: 1; }
.glow-a { stop-color: var(--coral); stop-opacity: var(--glow); } .glow-b { stop-color: var(--coral); stop-opacity: 0; }
.breathe { animation: breathe 14s ease-in-out infinite; }
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: .65; } }
.ui { font-family: ${MONO}; font-size: 14px; white-space: pre; font-variant-numeric: tabular-nums; fill: var(--ink); }
.pane { fill: var(--pane); fill-opacity: var(--pane-a); stroke: var(--line); stroke-width: 1; }
.strip { fill: var(--strip); }
.hair { fill: none; stroke: var(--hair); stroke-width: 1; }
.title { font-size: 12px; fill: var(--muted); letter-spacing: .04em; }
.label { font-size: 11px; fill: var(--muted); letter-spacing: .14em; }
.hint { font-size: 11px; fill: var(--muted); fill-opacity: .7; letter-spacing: .04em; }
.val { fill: var(--ink); } .val.big { font-size: 17px; letter-spacing: .02em; }
.val.hot { fill: var(--coral); } .val.bad { fill: var(--bad); } .val.warn { fill: var(--warn); } .val.ok { fill: var(--ok); }
.sub { fill: var(--muted); } .dim { fill: var(--muted); fill-opacity: .8; }
.add { fill: var(--ok); } .del { fill: var(--bad); }
.pct { font-size: 13px; fill: var(--ink); } .pct.mid { fill: var(--warn); } .pct.hi { fill: var(--bad); }
.m-on { fill: var(--coral); } .m-on.mid { fill: var(--warn); } .m-on.hi { fill: var(--bad); }
.m-off { fill: var(--off); fill-opacity: var(--off-a); }
.chip { font-size: 12px; fill: var(--muted); } .chip.working { fill: var(--coral); } .chip.compacting { fill: var(--warn); }
.dot { fill: var(--muted); fill-opacity: .6; } .dot.working { fill: var(--coral); fill-opacity: 1; animation: pulse 2.4s ease-in-out infinite; } .dot.compacting { fill: var(--warn); fill-opacity: 1; animation: pulse 2.4s ease-in-out infinite; }
.foot { fill: var(--muted); font-size: 13px; }
.rows .cmd { fill: var(--ink); } .rows .cmd.failed { fill: var(--bad); }
.rows .pr { fill: var(--coral); }
.rows .note { fill: var(--muted); font-style: italic; } .rows .note.warn { fill: var(--warn); }
.mark .ok { fill: var(--ok); } .mark .bad { fill: var(--bad); } .mark .run { fill: var(--warn); }
.cur { fill: var(--ink); fill-opacity: .72; animation: blink 2.4s step-end infinite; }
.cur.busy { fill: none; stroke: var(--coral); stroke-width: 1.2; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.spot { cursor: pointer; }
.spot .hit { fill: var(--hl); fill-opacity: 0; transition: fill-opacity .2s ease; }
.spot .bar { fill: var(--coral); fill-opacity: 0; transition: fill-opacity .2s ease; }
.spot .hint { fill: var(--coral); fill-opacity: .85; }
.spot:hover .hit { fill-opacity: var(--hl-a); }
.spot:hover .bar { fill-opacity: .9; }
.spot:hover .hint { fill: var(--coral); fill-opacity: 1; }
.log .pane { transition: stroke .2s ease; } .log:hover .pane { stroke: var(--coral); stroke-opacity: .6; }
.log .hit { fill-opacity: 0; } .log:hover .hit { fill-opacity: .04; }
.cap-base { fill: var(--cap); stroke: var(--cap-line); stroke-width: 1; transition: stroke .2s ease; }
.cap-top { fill: var(--cap-top); }
.cap-big { font-size: 18px; font-weight: 600; fill: var(--ink); }
.cap-small { font-size: 11px; fill: var(--muted); letter-spacing: .1em; }
.key.stop.live .cap-big { fill: var(--coral); } .key.stop.live .cap-base { stroke: var(--coral); stroke-opacity: .7; }
.key.stop.idle { opacity: .5; }
.key:hover .cap-base { stroke: var(--coral); stroke-opacity: 1; } .key:hover .cap-small { fill: var(--coral); }
.key.stop.idle:hover { opacity: .7; }
.key.armed .cap-base { stroke: var(--coral); stroke-width: 2; } .key.armed .cap-top { fill: var(--coral); fill-opacity: .16; }
.key.armed .cap-big { fill: var(--coral); } .key.armed .cap-small { fill: var(--coral); letter-spacing: .04em; animation: arm 2.4s ease-in-out infinite; }
@keyframes arm { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
${GUTTER_CSS}
`

const DEFS =
  '<radialGradient id="t-edge" cx=".5" cy=".5" r=".72"><stop offset=".6" class="edge-a"/><stop offset="1" class="edge-b"/></radialGradient>' +
  '<radialGradient id="t-glow" cx=".5" cy=".5" r=".5"><stop offset="0" class="glow-a"/><stop offset="1" class="glow-b"/></radialGradient>'

// The scene for one moment of the session. It is redrawn only at the feed's
// edges, so it shows when a turn began rather than a running time.
export function terminalScene(f: LooksFeed): string {
  return svg(
    CSS,
    DEFS,
    `<rect class="ground" width="1600" height="1000"/>
<rect width="1600" height="1000" fill="url(#t-edge)"/>
<g class="breathe"><ellipse cx="800" cy="430" rx="620" ry="420" fill="url(#t-glow)"/></g>
<g class="ui"><g class="g-l">${logPane(f)}${keyCaps(f)}</g><g class="g-r">${statusPane(f)}</g></g>`,
  )
}

export const TERMINAL: Look = {
  label: 'Terminal',
  // No tint: each panel keeps the app's own panel colour, which follows the
  // app's mode, so the transcript's text always sits on its own palette even
  // when the scene is forced to the other version.
  args: { colors: theme, backdrop: { scene: 'terminal', glass: { blur: 18, opacity: 0.8 } } },
  problems,
  scene: terminalScene(EMPTY_FEED),
  hotspots: TERMINAL_SPOTS,
  align: 'mid',
  confirmInScene: ['stop'],
}
