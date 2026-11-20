import { makeColors } from './make-colors.js'
import type { LooksFeed } from '../types'
import { JP, paintCss } from './cyber2-kit'
import { MARK, SKY_DEFS, centreVeil, skyBack } from './cyber2-sky'
import { AIR_CSS, AIR_DEFS, alarm, drones, hologram, lanes, police } from './cyber2-air'
import { LEFT_CSS, LEFT_DEFS, LEFT_NIGHT, boardDisplay, exchange, leftSigns, rationDial, rationTower } from './cyber2-left'
import { LIVE_CSS, exchange as board, kiosk, loadSign, modelRing, ration, rootClass, sessionName, statusScreen, tape } from './cyber2-live'
import { PEOPLE_CSS, PEOPLE_DEFS, peopleFar, peopleNear } from './cyber2-people'
import { MID_DEFS, farBlocks, midLeft, midRight } from './cyber2-mid'
import { RIGHT_CSS, RIGHT_DEFS, cart, megabuilding, purgeControl, rightDisplays, rightSigns } from './cyber2-right'
import { KIOSK_PANEL, STALL_CSS, STALL_DEFS, kioskDisplay, stall } from './cyber2-stall'
import { HOLO_CSS, HOLO_DEFS } from './cyber2-holo'
import { GUTTER_CSS } from './gutter'
import { STREET_CSS, STREET_DEFS, farSparkle, foreground, ground, vents, rain, reflections, traffic } from './cyber2-street'
import { EMPTY_FEED } from './feed-state'
import type { Look } from './look'

const { theme, problems } = makeColors({
  label: 'Cyberpunk',
  codeTheme: { light: 'catppuccin-latte', dark: 'synthwave-84' },
  roles: { accent: '#c8197e', danger: '#d0283a', success: '#1c8a4c', warning: '#8f6000', pro: '#0b7f9e' },
  light: {
    gray: {
      anchors: { 'surface-0': '#e4e1f3', 'surface-1': '#ecebf9', 'surface-2': '#f5f4fd', 'text-primary': '#171230', 'text-secondary': '#362d58', 'text-muted': '#554c7c' },
    },
    git: { added: '#17703a', removed: '#b8243a', modified: '#875800', merged: '#0a6680', closed: '#b8243a', conflicting: '#a04a08', draft: '#554c7c' },
  },
  dark: {
    roles: { accent: '#ff3fb4', danger: '#ff4a3d', success: '#3cf08a', warning: '#ffc21a', pro: '#22e6ff' },
    gray: {
      anchors: { 'surface-0': '#09081a', 'surface-1': '#0f0d22', 'surface-2': '#14112b', 'surface-3': '#191633', 'text-primary': '#efeaff', 'text-secondary': '#c8c0e6', 'text-muted': '#9f97c2' },
    },
    git: { added: '#3cf08a', removed: '#ff4a3d', modified: '#ffc21a', merged: '#22e6ff' },
  },
})

const PAINT_CSS = paintCss()
const DELAYS = [0, 1.7, 3.1, 4.9, 7.3, 11.2, 16.9, 21.7, 27.1, 33.4].map((d, i) => `.d${i}{animation-delay:-${d}s}`).join('')

const CSS =
  `:root,svg{${PAINT_CSS.day};--cl:#fffbe6;--hza:.9;--hzb:.5;--fo:1;--fwo:.5;--wc:.04;--wv:.14;--tv1:#b4ccd0;--tv2:#c8b0b8;--rn:#6f6a55;--rfo:.45;--sto:.25;--lao:.3;--pfo:.6;--dk:.06;--vgo:.22;--fgo:.25;--ew:.07;--ho:.3;--hk:#3d3932}` +
  `.nt,.ea,.tc,.wo,.q{display:none}` +
  `@media (prefers-color-scheme: dark){:root,svg{${PAINT_CSS.night};--cl:#7a2f86;--hza:.55;--hzb:.22;--fwo:1;--wc:.3;--wv:.45;--tv1:#6fd8ff;--tv2:#ff6ad0;--rn:#c8d0ff;--rfo:1;--sto:.7;--lao:.9;--pfo:.5;--dk:.2;--vgo:.42;--fgo:.6;--ew:.42;--ho:.12;--hk:#0a0716}.dy{display:none}.nt{display:inline}}` +
  `svg.em{--scr:#ff7a3a;--sto:0;--fo:.5}.em .op{display:none}` +
  PAINT_CSS.classes +
  `.em .ea,.p4 .tc,.wk .wo,.p1 .q1,.p2 .q1,.p2 .q2,.p3 .q1,.p3 .q2,.p3 .q3,.p4 .q,.em .q{display:inline}.em .tc,.em .ti,.p4 .ti,.wk .wi{display:none}.em .lv text{fill:#d97757}` +
  `.jp{font-family:${JP};font-weight:700}` +
  `.fo1{fill-opacity:calc(var(--fwo)*.5)}.fo2{fill-opacity:calc(var(--fwo)*.75)}.fo3{fill-opacity:calc(var(--fwo)*.7)}.fk{fill-opacity:.22}.sv{fill-opacity:.55}.vt{writing-mode:vertical-rl;text-orientation:upright}` +
  `.wl{fill:#ff3a2a;animation:wl 2.6s steps(1) infinite}@keyframes wl{0%{opacity:1}55%{opacity:.15}}` +
  `.fl{animation:fl 4s ease-in-out infinite alternate}@keyframes fl{from{opacity:1}to{opacity:var(--fo)}}` +
  `.tw{animation:bk 5.1s steps(1) infinite}` +
  `.bk{animation:bk 2.4s steps(1) infinite}@keyframes bk{0%{opacity:1}60%{opacity:.35}}` +
  `.pb{animation:pb 3s ease-in-out infinite alternate}@keyframes pb{from{opacity:.35}to{opacity:.9}}.em .pb{animation-duration:1s}` +
  `.cd{animation:cd 110s ease-in-out infinite alternate}@keyframes cd{from{transform:translateX(-70px)}to{transform:translateX(90px)}}` +
  `.sw{animation:sw 37s ease-in-out infinite alternate}@keyframes sw{from{transform:rotate(-16deg)}to{transform:rotate(14deg)}}` +
  `.dp{animation:dp 3.4s linear infinite}@keyframes dp{to{transform:translateY(-400px)}}.dq{animation:dq 2.9s linear infinite}@keyframes dq{0%{transform:translateY(0);opacity:1}80%{opacity:1}100%{transform:translateY(-270px);opacity:0}}` +
  LEFT_CSS +
  RIGHT_CSS +
  STALL_CSS +
  STREET_CSS +
  AIR_CSS +
  PEOPLE_CSS +
  LIVE_CSS +
  DELAYS +
  HOLO_CSS +
  GUTTER_CSS +
  `@media (prefers-color-scheme: dark){${LEFT_NIGHT}}`

// Far to near: sky and towers, the ration tower, the street, the
// megabuilding behind the right-hand blocks, the exchange, the street life;
// then everything that tells the session, as light, in the two gutter
// groups (Clawd on the exchange roof among them); the police and the weather
// over everything.
const BODY =
  skyBack() +
  rationTower() +
  lanes() +
  ground() +
  reflections() +
  farBlocks() +
  megabuilding() +
  midLeft() +
  midRight() +
  farSparkle() +
  traffic() +
  exchange() +
  leftSigns() +
  rightSigns() +
  vents() +
  peopleFar() +
  stall() +
  cart() +
  `<g class="g-l">${hologram()}<g class="hx">${rationDial()}${boardDisplay()}${kioskDisplay()}</g></g>` +
  rightDisplays() +
  peopleNear() +
  drones() +
  police() +
  alarm() +
  centreVeil() +
  foreground() +
  rain()

const TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"${MARK.root}><style>${CSS}</style><defs>${SKY_DEFS}${LEFT_DEFS}${MID_DEFS}${STALL_DEFS}${STREET_DEFS}${RIGHT_DEFS}${AIR_DEFS}${PEOPLE_DEFS}${HOLO_DEFS}</defs>${BODY}</svg>`

const lv = (content: string): string => `<g class="lv">${content}</g>`

// The scene for one moment of the session: the same drawing every time,
// with the root's state classes and the fixtures' text filled in.
export function cyberpunk2Scene(f: LooksFeed): string {
  // Function replacers: feed text must never be read as a replace pattern.
  return TEMPLATE.replace(MARK.root, () => rootClass(f))
    .replace(MARK.model, () => modelRing(f))
    .replace(MARK.name, () => sessionName(f))
    .replace(MARK.status, () => statusScreen(f))
    .replace(MARK.load, () => lv(loadSign(f)))
    .replace(MARK.board, () => lv(board(f)))
    .replace(MARK.tape, () => tape(f))
    .replace(MARK.ration, () => lv(ration(f)))
    .replace(MARK.kiosk, () => lv(kiosk(f)))
    .replace(MARK.purge, () => purgeControl(f.armed === 'compact', f.edge.compacting))
}

export const CYBERPUNK2: Look = {
  label: 'Cyberpunk',
  args: { colors: theme, backdrop: { scene: 'cyberpunk', glass: { blur: 26, opacity: 0.6 } } },
  problems,
  scene: cyberpunk2Scene(EMPTY_FEED),
  align: 'mid',
  // The purge asks for its second tap on the control itself.
  confirmInScene: ['compact'],
  // Each spot is a projected display in a side gutter: the ration dial, the
  // exchange's market and the kiosk on the left; the banner, the main
  // display, the purge control and the load board on the megabuilding.
  // Clawd's hologram is not a spot.
  hotspots: [
    { action: 'usage', x: 326, y: 126, w: 112, h: 112 },
    { action: 'diff', x: 34, y: 424, w: 346, h: 88 },
    { action: 'last-command', x: KIOSK_PANEL.x, y: KIOSK_PANEL.y, w: KIOSK_PANEL.w, h: KIOSK_PANEL.h },
    { action: 'session', x: 1162, y: 114, w: 52, h: 374 },
    { action: 'menu', x: 1220, y: 104, w: 260, h: 190 },
    { action: 'compact', x: 1220, y: 320, w: 122, h: 102 },
    { action: 'context', x: 1350, y: 320, w: 130, h: 102 },
  ],
}
