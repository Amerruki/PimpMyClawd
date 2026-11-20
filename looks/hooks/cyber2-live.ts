import type { LooksFeed } from '../types'
import { BOARD, CLOCK, TAPE } from './cyber2-left'
import { BANNER, LOADP, SCREEN } from './cyber2-right'
import { KIOSK } from './cyber2-stall'
import { shape } from './cyber2-kit'
import { cut, escapeXml, seconds } from './feed-state'

// The session, told by the city's own fixtures. Every piece of text from the
// feed is cut to a fixed length and escaped.

const R = Math.round
const T = (attrs: string, text: string): string => `<text class="jp" ${attrs}>${text}</text>`
const safe = (text: string, max: number): string => escapeXml(cut(text, max))
const big = (v: number): string => (v >= 999500 ? `${(v / 1000000).toFixed(1)}M` : v >= 10000 ? `${Math.round(v / 1000)}k` : String(v))

// Police levels from the context window's fill.
export function policeLevel(context: number | null): 0 | 1 | 2 | 3 | 4 {
  if (context === null || context < 40) return 0

  return context < 60 ? 1 : context < 75 ? 2 : context < 90 ? 3 : 4
}

export const isAllClear = (f: LooksFeed): boolean =>
  !f.edge.compacting && f.edge.compactedAt !== null && (f.edge.at === null || f.edge.compactedAt > f.edge.at)

// The classes on the root: working, emergency, police level.
export function rootClass(f: LooksFeed): string {
  const list: string[] = []
  const level = policeLevel(f.edge.context)

  if (f.edge.compacting) list.push('em')
  else if (f.edge.isWorking) list.push('wk')
  if (level > 0) list.push(`p${level}`)

  return list.length ? ` class="${list.join(' ')}"` : ''
}

// The model as the hologram's ring says it: family and version, no maker's
// name ("claude-opus-5-5" is OPUS 5.5).
export function shortModel(model: string): string {
  const words = model
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .split(/[^a-z0-9.]+/)
    .filter(w => w !== '' && w !== 'claude' && w !== 'anthropic' && !/^\d{6,}$/.test(w))
  const family = words.find(w => /^[a-z]+$/.test(w) && !/^(v|latest|us|eu|global)$/.test(w))
  const version = words
    .filter(w => /^\d{1,2}(\.\d{1,2})?$/.test(w))
    .slice(0, 2)
    .join('.')
  const text = [family, version].filter(Boolean).join(' ').toUpperCase()

  return cut(text === '' ? 'ONLINE' : text, 14)
}

// The model written along the front of the hologram's ring.
export function modelRing(f: LooksFeed): string {
  const name = escapeXml(shortModel(f.model))

  return T(`font-size="17" letter-spacing="2" fill="#fff" stroke="var(--holo)" stroke-width="3" paint-order="stroke"`, `<textPath href="#rg" startOffset="50%" text-anchor="middle">◆ ${name} ◆</textPath>`)
}

// The session's name down the megabuilding's banner, read top to bottom,
// sized to the banner's length; the project and branch beside it, small.
export function sessionName(f: LooksFeed): string {
  const raw = f.session.trim() !== '' ? f.session : f.project.trim() !== '' ? f.project : 'NEON WARD'
  const name = cut(raw, 36).toUpperCase()
  const span = 296
  // Bold capitals run about 0.78 of their size wide; the length is pinned so
  // the name always ends inside the banner.
  const size = Math.max(12, Math.min(25, Math.floor(span / (name.length * 0.78))))
  const sub = [f.project.trim(), f.branch?.trim() ?? ''].filter(Boolean).join(' · ').toUpperCase()
  const subText = cut(sub, 44)
  const { x, y, w } = BANNER
  const mid = y + 40 + span / 2
  const col = (cx: number, s: number, len: number, attrs: string, text: string) =>
    T(`transform="translate(${R(cx - s * 0.36)} ${R(mid)}) rotate(90)" font-size="${s}" text-anchor="middle" textLength="${R(Math.min(span, len))}" lengthAdjust="spacingAndGlyphs" ${attrs}`, text)

  return (
    T(`x="${x + w / 2}" y="${y + 26}" font-size="15" text-anchor="middle" fill="var(--holo)"`, '会話') +
    `<path d="M${x + 8} ${y + 34}h${w - 16}" stroke="var(--holo)" stroke-opacity=".6"/>` +
    col(x + 20, size, name.length * size * 0.78, `fill="#fff" stroke="var(--holo)" stroke-width="1.2" paint-order="stroke"`, escapeXml(name)) +
    (subText === '' ? '' : col(x + w - 9, 8.5, subText.length * 6.4, `fill="var(--scr)"`, escapeXml(subText)))
  )
}

// The megabuilding's main screen.
export function statusScreen(f: LooksFeed): string {
  const { edge } = f
  const s = SCREEN
  const x = s.x + s.w / 2
  const head = (kanji: string, latin: string, col: string, size = 46) =>
    T(`x="${x}" y="194" font-size="${size}" text-anchor="middle" fill="#fff" stroke="${col}" stroke-width="1.2" paint-order="stroke"`, kanji) +
    T(`x="${x}" y="220" font-size="15" letter-spacing="7" text-anchor="middle" fill="${col}"`, latin) +
    `<path d="M${x - 94} 234h188" stroke="${col}" stroke-opacity=".6"/>`
  const line = (y: number, text: string, size = 12, o = 0.92) => T(`x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#fff" fill-opacity="${o}"`, text)
  const tint = (col: string) => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${col}" fill-opacity=".16"/>`

  if (edge.compacting) {
    const glyph = (gx: number) => `<path d="M${gx} 146l17 30h-34z" fill="none" stroke="#ffb02e" stroke-width="3"/><path d="M${gx} 156v10M${gx} 170v2" stroke="#fff" stroke-width="3"/>`

    return `<g>${tint('#ff5a2a')}${glyph(s.x + 28)}${glyph(s.x + s.w - 28)}${head('記憶圧縮中', 'COMPACTING', '#ffb02e', 30)}${line(254, 'MEMORY PURGE IN PROGRESS', 12)}${line(274, 'ALL UNITS · STAND BY', 10, 0.7)}</g>`
  }
  if (isAllClear(f)) {
    return tint('#3cf08a') + head('圧縮完了', 'ALL CLEAR', '#3cf08a', 40) + line(254, 'MEMORY COMPACTED', 12) + line(274, edge.context === null ? 'SECTOR NOMINAL' : `SECTOR LOAD ${R(edge.context)}%`, 10, 0.7)
  }
  if (edge.isWorking) {
    const what = f.activity === '' ? 'THINKING' : safe(f.activity, 30).toUpperCase()
    const chev = [0, 1, 2, 3, 4].map(i => `<path class="chv d${i}" d="M${x - 38 + i * 16} 266l7 6-7 6" fill="none" stroke="var(--scr)" stroke-width="2.5"/>`).join('')
    const bars = Array.from({ length: 12 }, (_, i) => `<rect class="eq d${(i * 7) % 10}" x="${s.x + 15 + i * 19}" y="128" width="13" height="14" fill="var(--scr)"/>`).join('')

    return tint('var(--scr)') + bars + head('稼働中', 'WORKING', '#fff') + line(252, what) + chev
  }
  const detail = edge.detail === '' ? 'STANDING BY' : safe(edge.detail, 30)

  return head('待機中', 'READY', 'var(--scr)') + line(254, detail) + line(274, edge.turnMs === null ? 'ALL QUIET' : `LAST TURN ${seconds(edge.turnMs)}`, 10, 0.7)
}

// The load board on the megabuilding: the context window's fill and the
// police alert it has called, one lamp per level.
export function loadSign(f: LooksFeed): string {
  const c = f.edge.context
  const level = policeLevel(c)
  const col = c === null ? 'var(--scr)' : c >= 90 ? '#ff4a3d' : c >= 60 ? '#ffb02e' : '#3cf08a'
  const { x, y, w } = LOADP
  const lamps = [40, 60, 75, 90]
    .map((v, i) => {
      const lx = x + 10 + i * 27
      const on = level > i
      const fill = on ? (i % 2 ? '#2a6aff' : '#ff2a3a') : '#fff'

      return `<rect x="${lx}" y="${y + 60}" width="23" height="9" fill="${fill}" fill-opacity="${on ? 1 : 0.12}"/>` + T(`x="${lx + 11.5}" y="${y + 78}" font-size="7" text-anchor="middle" fill="#fff" fill-opacity="${on ? 0.9 : 0.4}"`, String(v))
    })
    .join('')

  return (
    T(`x="${x + 10}" y="${y + 15}" font-size="8" letter-spacing="1" fill="#fff" fill-opacity=".85"`, 'SECTOR LOAD · 負荷') +
    T(`x="${x + 10}" y="${y + 45}" font-size="27" fill="${col}"`, c === null ? '--%' : `${R(c)}%`) +
    T(`x="${x + w - 8}" y="${y + 29}" font-size="7" letter-spacing="1" text-anchor="end" fill="#fff" fill-opacity=".7"`, '警戒') +
    T(`x="${x + w - 8}" y="${y + 45}" font-size="13" text-anchor="end" fill="${level >= 3 ? '#ff6a5a' : level > 0 ? '#ffb02e' : '#3cf08a'}"`, `LV ${level}`) +
    lamps
  )
}

// The exchange's board: the working tree's diff as the market.
export function exchange(f: LooksFeed): string {
  const d = f.edge.diff
  const { x, y, w } = BOARD
  const head = T(`x="${x + 8}" y="${y + 14}" font-size="10" letter-spacing="2" fill="#fff" fill-opacity=".8"`, '差分 · MARKET')

  if (d === null) return head + T(`x="${x + w / 2}" y="${y + 50}" font-size="26" text-anchor="middle" fill="var(--scr)"`, 'MARKET CLOSED · 休場')

  return (
    head +
    T(`x="${x + w - 8}" y="${y + 14}" font-size="10" letter-spacing="1" text-anchor="end" fill="#fff" fill-opacity=".8"`, `${big(d.files)} FILE${d.files === 1 ? '' : 'S'} CHANGED`) +
    T(`x="${x + w * 0.27}" y="${y + 56}" font-size="32" text-anchor="middle" fill="#3cf08a"`, `▲ +${big(d.added)}`) +
    T(`x="${x + w * 0.73}" y="${y + 56}" font-size="32" text-anchor="middle" fill="#ff4a3d"`, `▼ −${big(d.removed)}`)
  )
}

// The ticker along the exchange's frieze: the same diff, crawling.
export function tape(f: LooksFeed): string {
  const d = f.edge.diff
  const unit = d === null ? 'MARKET CLOSED · 休場 · ' : d.files === 0 ? 'FLAT · 変動なし · ' : `▲ +${big(d.added)}  ▼ −${big(d.removed)}  ◆ ${big(d.files)} FILES · `
  let text = unit
  while (text.length < 60) text += unit
  const L = TAPE.x1 - TAPE.x0
  const one = (x: number) => `<text x="${x}" y="${TAPE.y + 12}" font-size="10" font-family="ui-monospace,Menlo,monospace" fill="#ffc21a" textLength="${L}" lengthAdjust="spacing">${escapeXml(text)}</text>`

  return `<g clip-path="url(#tpc)"><g class="tk">${one(TAPE.x0)}${one(TAPE.x0 + L)}</g></g>`
}

// The ration clock: the week's use as the dial's arc, the time to reset.
export function ration(f: LooksFeed): string {
  const w = f.edge.week
  const { cx, cy } = CLOCK
  const head = T(`x="${cx}" y="${cy - 18}" font-size="9" letter-spacing="2" text-anchor="middle" fill="#fff" fill-opacity=".85"`, '配給電力')
  const track = `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="6"/>`

  if (w === null || f.edge.at === null) return track + head + T(`x="${cx}" y="${cy + 7}" font-size="15" text-anchor="middle" fill="#3cf08a"`, 'GRID OK') + T(`x="${cx}" y="${cy + 23}" font-size="9" text-anchor="middle" fill="#fff" fill-opacity=".8"`, '電力正常')
  const pct = Math.max(0, Math.min(100, w.percentUsed))
  const hours = Math.max(0, Math.floor((w.resetsAt - f.edge.at) / 3600000))
  const left = hours >= 24 ? `${Math.floor(hours / 24)}日${hours % 24}時間` : hours > 0 ? `${hours}時間` : '1時間以内'
  const col = pct >= 90 ? '#ff4a3d' : pct >= 70 ? '#ffb02e' : 'var(--scr)'
  const len = 2 * Math.PI * 42

  return (
    track +
    `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${R((len * pct) / 100)} ${R(len)}" transform="rotate(-90 ${cx} ${cy})"/>` +
    head +
    T(`x="${cx}" y="${cy + 9}" font-size="23" text-anchor="middle" fill="${col}"`, `${R(pct)}%`) +
    T(`x="${cx}" y="${cy + 25}" font-size="9" text-anchor="middle" fill="#fff" fill-opacity=".9"`, left)
  )
}

// The stall's kiosk: the order counter and the last command; closed in an
// emergency.
export function kiosk(f: LooksFeed): string {
  const { x, w } = KIOSK
  const last = f.commands.at(-1)
  const order = `ORDER ${String(Math.max(0, f.prompts) % 1000).padStart(3, '0')}`
  const strip = T(`x="${x + w / 2}" y="${KIOSK.order + 12}" font-size="11" letter-spacing="2" text-anchor="middle" fill="#ffb02e"`, order)
  const y = KIOSK.top

  if (f.edge.compacting) return strip + T(`x="${x + w / 2}" y="${y + 24}" font-size="16" text-anchor="middle" fill="#ff4a3d"`, '閉店') + T(`x="${x + w / 2}" y="${y + 38}" font-size="8" letter-spacing="2" text-anchor="middle" fill="#fff" fill-opacity=".8"`, 'CLOSED')
  if (last === undefined) return strip + T(`x="${x + w / 2}" y="${y + 22}" font-size="13" text-anchor="middle" fill="var(--scr)"`, 'いらっしゃい') + T(`x="${x + w / 2}" y="${y + 38}" font-size="8" letter-spacing="1" text-anchor="middle" fill="#fff" fill-opacity=".8"`, 'ORDER HERE')
  const text = cut(last.text, 40)
  const a = escapeXml(text.slice(0, 20))
  const b = escapeXml(text.slice(20))
  const fail = last.ok === false
  const col = fail ? '#fff' : last.ok === null ? '#ffb02e' : '#3cf08a'
  const mono = `font-family="ui-monospace,Menlo,monospace" font-size="8.5" fill="#fff" fill-opacity=".92" textLength`

  return (
    strip +
    (fail ? `<path class="kf" d="${shape([[x, y], [x + w, y], [x + w, KIOSK.bottom], [x, KIOSK.bottom]])}" fill="#ff2a2a"/>` : '') +
    T(`x="${x + 4}" y="${y + 13}" font-size="10" fill="${col}"`, fail ? '✗ FAILED' : last.ok === null ? '… RUNNING' : '✓ DONE') +
    `<text x="${x + 4}" y="${y + 27}" ${mono}="${R(a.length ? Math.min(w - 8, text.slice(0, 20).length * 5.1) : 1)}" lengthAdjust="spacingAndGlyphs">${a}</text>` +
    (b === '' ? '' : `<text x="${x + 4}" y="${y + 39}" ${mono}="${R(Math.min(w - 8, text.slice(20).length * 5.1))}" lengthAdjust="spacingAndGlyphs">${b}</text>`)
  )
}

export const LIVE_CSS =
  `.chv{animation:chv 2s steps(1) infinite}@keyframes chv{0%{opacity:1}50%{opacity:.25}}` +
  `.eq{animation:eq 1.3s ease-in-out infinite alternate}@keyframes eq{from{opacity:.15}to{opacity:1}}` +
  `.tk{animation:tk 16s linear infinite}@keyframes tk{to{transform:translateX(-${TAPE.x1 - TAPE.x0}px)}}` +
  `.kf{animation:kf 4.6s ease-in-out infinite}@keyframes kf{0%,100%{opacity:.5}50%{opacity:.15}}`
