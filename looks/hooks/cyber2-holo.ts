import type { Rect } from './cyber2-kit'

// Projected panels: every session display in the ward is light, not a box.
// A thin tinted field the building shows through, scan lines, a bright top
// and bottom edge, corner brackets, a band of light sweeping down, and the
// fan of the emitter that throws it. The field is tinted just deep enough for
// the text over it to read on lit windows by day and night; outlined text
// would read too, but it costs the app more to draw than anything else here.

export type HoloOpts = {
  // Where the emitter sits: a fan of light from below or above, or none.
  emit?: 'below' | 'above' | 'none'
  // Scan lines and a slow sweep down the panel (big panels only).
  sweep?: boolean
  // Extra class on the whole panel.
  cls?: string
  // A tap cue: a small chevron in the bottom-right corner.
  cue?: boolean
}

const FAN: Record<string, string> = { 'var(--scr)': 'hfc', 'var(--holo)': 'hfm', '#ffb02e': 'hfa' }

export function holoPanel(r: Rect, col: string, o: HoloOpts = {}): string {
  const { x, y, w, h } = r
  const c = Math.min(12, Math.round(Math.min(w, h) / 5))
  const brackets =
    `M${x} ${y + c}V${y}H${x + c}M${x + w - c} ${y}H${x + w}V${y + c}` +
    `M${x + w} ${y + h - c}V${y + h}H${x + w - c}M${x + c} ${y + h}H${x}V${y + h - c}`
  const fan = FAN[col]
  let emit = ''
  if (o.emit !== 'none' && fan) {
    const ex = x + w / 2
    if (o.emit === 'above') emit = `<path d="M${ex - 6} ${y - 14}L${x + 4} ${y}H${x + w - 4}L${ex + 6} ${y - 14}z" fill="url(#${fan}u)"/><path class="x0" d="M${ex - 8} ${y - 18}h16v5h-16z"/>`
    else emit = `<path d="M${ex - 6} ${y + h + 14}L${x + 4} ${y + h}H${x + w - 4}L${ex + 6} ${y + h + 14}z" fill="url(#${fan})"/><path class="x0" d="M${ex - 8} ${y + h + 13}h16v5h-16z"/>`
  }
  const cue = o.cue === false ? '' : `M${x + w - 12} ${y + h - 13}l5 5-5 5`

  return (
    `<g class="hp${o.cls ? ` ${o.cls}` : ''}">` +
    emit +
    `<rect class="hd" x="${x}" y="${y}" width="${w}" height="${h}"/>` +
    `<rect class="hf" x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"/>` +
    (o.sweep
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hsc)"/>` +
        `<rect class="hsw" style="--sw:${Math.round(h * 0.84)}px" x="${x}" y="${y}" width="${w}" height="${Math.round(h * 0.16)}" fill="${col}" fill-opacity=".16"/>`
      : '') +
    `<path d="M${x} ${y}h${w}M${x} ${y + h}h${w}" stroke="${col}" stroke-width="1.5"/>` +
    `<path d="${brackets}${cue}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="2"/>` +
    `</g>`
  )
}

const fanDef = (id: string, col: string, up: boolean) =>
  `<linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${col}" stop-opacity="${up ? 0.45 : 0}"/><stop offset="1" stop-color="${col}" stop-opacity="${up ? 0 : 0.45}"/></linearGradient>`

export const HOLO_DEFS =
  `<pattern id="hsc" width="4" height="3" patternUnits="userSpaceOnUse"><path d="M0 0h4v1h-4z" fill="#fff" fill-opacity=".13"/></pattern>` +
  fanDef('hfc', 'var(--scr)', false) +
  fanDef('hfm', 'var(--holo)', false) +
  fanDef('hfa', '#ffb02e', false) +
  fanDef('hfcu', 'var(--scr)', true) +
  fanDef('hfmu', 'var(--holo)', true) +
  fanDef('hfau', '#ffb02e', true)

// Day: a deeper tint so light lettering holds on bright stone and glass.
// Night: a lighter tint, still deep enough for text over lit windows.
export const HOLO_CSS =
  `:root,svg{--hdo:.52;--hfo:.2}` +
  `@media (prefers-color-scheme: dark){:root,svg{--hdo:.32;--hfo:.13}}` +
  `.hd{fill:#0a2630;fill-opacity:var(--hdo)}.hf{fill-opacity:var(--hfo)}` +
  `.hsw{animation:hsw 5.3s linear infinite}@keyframes hsw{from{transform:translateY(0)}to{transform:translateY(var(--sw,120px))}}`
