import { seeded } from './kit'
import { Bucket, LX, P, RX, shape, wall, type Wall } from './cyber2-kit'

// The facades that recede down both sides of the street. Each building gets
// its own floor heights, window habit, share of lit rooms, roof clutter and
// shopfronts, and sinks into the smog with depth.

export type Building = {
  z0: number
  z1: number
  h: number
  // Wall, shade and trim paints.
  face: string
  shade: string
  trim: string
  // Window habit: 'pair' two per bay, 'band' ribbon glazing, 'deck' a
  // balcony run on every other floor.
  kind: 'pair' | 'band' | 'deck'
  bay: number
  floor: number
  lit: number
  seed: number
  // 0 near to 1 far: how much smog lies over it.
  haze: number
  ground?: number
}

const LIT = ['l1', 'l1', 'l2', 'l5', 'l5', 'l3', 'l4']

export function facade(w: Wall, B: Building): string {
  const b = new Bucket()
  const rand = seeded(B.seed)
  const sg = w.X < 0 ? 1 : -1
  const g = wall(w.X - sg * 0.25)
  const k = (w.X - sg * 0.25) / w.X
  const gh = B.ground ?? 3.6
  const near = B.z0 < 60
  const face = w.q(B.z0, B.z1, 0, B.h)

  // Everything behind the face goes in its own bucket, painted first.
  const back = new Bucket()
  // And everything that lies over the glass in one painted last.
  const top = new Bucket()
  const work = new Bucket()
  // The end wall above the lower neighbour in front, facing the camera.
  back.add(B.shade, shape([w.pt(B.z0, B.h), P(w.X - sg * 14, B.h, B.z0), P(w.X - sg * 14, 0, B.z0), w.pt(B.z0, 0)]))
  if (near && sg > 0) for (const dy of [1.6, 3.4]) back.add(B.trim, shape([w.pt(B.z0, B.h - dy), P(w.X - 14, B.h - dy, B.z0), P(w.X - 14, B.h - dy - 0.12, B.z0), w.pt(B.z0, B.h - dy - 0.12)]))
  const endWall = near && sg > 0 ? `<path d="${shape([w.pt(B.z0, B.h), P(w.X - sg * 14, B.h, B.z0), P(w.X - sg * 14, B.h - 5, B.z0), w.pt(B.z0, B.h - 5)])}" fill="url(#ewm)"/>` : ''
  // Roof clutter behind the parapet.
  const roof = wall(w.X - sg * 0.5)
  for (let z = B.z0 + 1; z < B.z1 - 2 && !(sg < 0 && B.z0 < 60); z += (3 + rand() * 6) * (B.z0 >= 140 ? 9 : B.z0 >= 60 ? 2 : 1)) {
    const len = 1 + rand() * 2.5
    const ht = 0.6 + rand() * 1.8
    back.add(B.shade, roof.q(z, Math.min(B.z1, z + len), B.h, B.h + ht))
    if (rand() < 0.5) back.add(B.shade, roof.q(z + 0.2, z + 0.32, B.h, B.h + ht + 1 + rand() * 2.5))
  }
  b.add(B.face, face)
  const floors = Math.max(1, Math.floor((B.h - gh - 0.4) / B.floor))
  const bays = Math.max(1, Math.round((B.z1 - B.z0) / B.bay))
  const bw = (B.z1 - B.z0) / bays
  if (!near) {
    // At distance: a glass band per floor, lit stretches over it, no reveals.
    b.add(B.trim, w.q(B.z0, B.z1, B.h - 0.4, B.h))
    for (let f = 0; f < floors; f++) {
      const y0 = gh + f * B.floor
      b.add('g1 st', w.q(B.z0 + 0.5, B.z1 - 0.5, y0 + 0.9, y0 + B.floor - 0.5))
      for (let i = 0; i < bays; i++) {
        if (rand() < B.lit) {
          const z = B.z0 + i * bw
          const part = 0.3 + rand() * 0.6
          b.add(LIT[Math.floor(rand() * LIT.length)]!, w.q(z + 0.5, z + bw * part, y0 + 0.9, y0 + B.floor - 0.5))
        }
      }
    }
    if (B.z0 < 140) {
      b.add('l1', w.q(B.z0 + 0.5, B.z1 - 0.5, 0.4, gh - 1))
      for (let i = 0; i <= bays; i++) b.add(B.shade, w.q(B.z0 + i * bw - 0.4, B.z0 + i * bw + 0.4, 0, B.h - 0.4))
    } else b.add('l1 st', w.q(B.z0 + 0.5, B.z1 - 0.5, 0.4, gh - 1))

    return (
      back.toString() +
      b.toString() +
      `<path class="sm" fill-opacity="${B.haze}" d="${face}"/>` +
      `<path class="${sg > 0 ? 'rc2' : 'rm'}" d="${shape([w.pt(B.z0, B.h), w.pt(B.z1, B.h)], false)}"/>`
    )
  }
  // Floor bands and the parapet.
  for (let f = 0; f <= floors; f++) {
    const y = gh + f * B.floor
    b.add(B.trim, w.q(B.z0, B.z1, y - 0.12, y + 0.1))
    b.add(B.shade, w.q(B.z0, B.z1, y - 0.36, y - 0.12))
  }
  b.add(B.trim, w.q(B.z0, B.z1, B.h - 0.3, B.h))
  // Bays and their windows.
  for (let i = 0; i <= bays; i++) {
    const z = B.z0 + i * bw
    b.add(B.trim, w.q(z - 0.14, z + 0.14, gh, B.h))
  }
  for (let f = 0; f < floors; f++) {
    const y0 = gh + f * B.floor
    const deck = B.kind === 'deck' && f % 2 === 0
    if (deck) {
      // A balcony run: slab edge, shadow under it, a rail.
      const o = wall(w.X + sg * 0.9)
      b.add(B.trim, o.q(B.z0 + 0.2, B.z1 - 0.2, y0 - 0.1, y0 + 0.08))
      b.add('x0 st', w.q(B.z0, B.z1, y0 - 0.7, y0 - 0.1))
      b.add(B.shade + ' st', o.q(B.z0 + 0.2, B.z1 - 0.2, y0 + 0.08, y0 + 0.95))
    }
    for (let i = 0; i < bays; i++) {
      const z = B.z0 + i * bw
      const sill = y0 + (deck ? 0.15 : 0.8)
      const head = y0 + B.floor - 0.5
      const spans: [number, number][] =
        B.kind === 'band' ? [[z + 0.3, z + bw - 0.3]] : [[z + 0.45, z + bw / 2 - 0.2], [z + bw / 2 + 0.2, z + bw - 0.45]]
      for (const [a, c] of spans) {
        const on = rand() < B.lit
        const cls = on ? LIT[Math.floor(rand() * LIT.length)]! : rand() < 0.5 ? 'g0' : 'g1'
        const a2 = a * k
        b.add(cls, g.q(a2, c, sill, head))
        // Rooms that light up only while the session works.
        if (!on && rand() < 0.55) work.add(LIT[Math.floor(rand() * 5)]!, g.q(a2, c, sill, head))
        b.add(on ? cls + ' st' : B.trim, shape([w.pt(c, head), g.pt(c, head), g.pt(c, sill), w.pt(c, sill)]))
        // What the room shows: a blind, a curtain, a shelf.
        const what = rand()
        if (on && what < 0.3) top.add(B.shade, g.q(a2, c, head - (head - sill) * (0.3 + rand() * 0.4), head))
        else if (on && what < 0.55) top.add(B.shade + ' st', g.q(a2, a2 + (c - a2) * (0.3 + rand() * 0.3), sill, head))
        else if (on && what < 0.7) top.add('x0', g.q(a2 + (c - a2) * 0.55, a2 + (c - a2) * 0.75, sill, sill + 0.9))
        if (B.kind === 'band') top.add(B.shade, w.q((a + c) / 2 - 0.05, (a + c) / 2 + 0.05, sill, head))
      }
    }
  }
  // Shopfronts: lit glass under a fascia, split by doors and posts. Each
  // has a roller shutter that comes down in an emergency.
  let shut = ''
  let ribs = ''
  for (let i = 0; i < bays; i++) {
    const z = B.z0 + i * bw
    shut += w.q(z + 0.15, z + bw - 0.15, 0, gh - 0.3)
    for (let y = 0.3; y < gh - 0.8; y += 0.35) ribs += shape([w.pt(z + 0.15, y), w.pt(z + bw - 0.15, y)], false)
    const open = rand() < 0.75
    const cls = open ? (rand() < 0.6 ? 'l1' : rand() < 0.5 ? 'l2' : 'l3') : 'g0'
    b.add(cls, w.q(z + 0.3, z + bw - 0.3, 0.3, gh - 0.9))
    top.add(B.shade, w.q(z + bw * 0.45, z + bw * 0.52, 0.3, gh - 0.9))
    if (open) {
      // Transom, mullions, goods in the window, a lit name strip above.
      top.add(B.shade, w.q(z + 0.3, z + bw - 0.3, gh - 1.5, gh - 0.9))
      top.add(B.shade, w.q(z + bw * 0.22, z + bw * 0.25, 0.3, gh - 1.5)).add(B.shade, w.q(z + bw * 0.76, z + bw * 0.79, 0.3, gh - 1.5))
      top.add('x0 st', w.q(z + 0.5, z + bw * 0.2, 0.3, 0.9 + rand() * 0.7)).add('x0 st', w.q(z + bw * 0.56, z + bw * 0.74, 0.3, 1 + rand() * 0.9))
      top.add(['l4', 'l3', 'l2', 'l1'][Math.floor(rand() * 4)]!, w.q(z + 0.6, z + bw * (0.4 + rand() * 0.4), gh - 0.75, gh - 0.42))
    }
    // An awning over some.
    if (rand() < 0.6) {
      const [f, e, c] = w.box(z + 0.2, z + bw - 0.2, gh - 0.8, gh - 0.55, 1.3)
      top.add(rand() < 0.5 ? 't1' : 't2', c).add(B.trim, f).add(B.shade, e)
    }
  }

  return (
    back.toString() +
    endWall +
    b.toString() +
    `<g class="wo">${work.toString()}</g>` +
    top.toString() +
    `<g class="ea"><path class="${B.trim}" d="${shut}"/><path d="${ribs}" stroke="var(--${B.shade})" stroke-opacity=".7" fill="none"/></g>` +
    `<path d="${face}" fill="url(#${sg > 0 ? 'lwc' : 'rwm'})"/>` +
    (sg < 0 ? `<path class="dy" d="${face}" fill="#2c2414" fill-opacity=".2"/>` : '') +
    (B.haze > 0 ? `<path class="sm" fill-opacity="${B.haze}" d="${face}"/>` : '') +
    `<path class="${sg > 0 ? 'rc2' : 'rm'}" d="${shape([w.pt(B.z0, B.h), w.pt(B.z1, B.h)], false)}"/>`
  )
}

export const MID_DEFS =
  `<linearGradient id="ewm" x2="0" y2="1"><stop stop-color="var(--holo)" stop-opacity="var(--ew)"/><stop offset="1" stop-color="var(--holo)" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="rwm" x1="1" y1="0" x2="0" y2="0"><stop stop-color="var(--holo)" stop-opacity="0"/><stop offset="1" stop-color="var(--holo)" stop-opacity="var(--wc)"/></linearGradient>`

const LWALL = wall(LX)
const RWALL = wall(RX)

// The street's far end, nearly smog.
export function farBlocks(): string {
  return (
    facade(LWALL, { z0: 150, z1: 420, h: 10, face: 'c1', shade: 'c1', trim: 'c0', kind: 'pair', bay: 34, floor: 3.2, lit: 0.6, seed: 11, haze: 0.8 }) +
    facade(RWALL, { z0: 150, z1: 420, h: 11.5, face: 'c1', shade: 'c1', trim: 'c0', kind: 'pair', bay: 34, floor: 3.6, lit: 0.6, seed: 12, haze: 0.8 })
  )
}

// The receding blocks, far to near: low street walls, each a different
// height, so the towers stand over them.
export function midLeft(): string {
  return (
    facade(LWALL, { z0: 105, z1: 150, h: 9.2, face: 'c0', shade: 'c1', trim: 'c0', kind: 'band', bay: 5, floor: 2.9, lit: 0.4, seed: 21, haze: 0.62 }) +
    facade(LWALL, { z0: 72, z1: 105, h: 11.2, face: 'c0', shade: 'c1', trim: 'b2', kind: 'pair', bay: 5.5, floor: 3.1, lit: 0.45, seed: 22, haze: 0.42 }) +
    facade(LWALL, { z0: 52, z1: 72, h: 8.4, face: 'b0', shade: 'b1', trim: 'b2', kind: 'band', bay: 4.4, floor: 2.3, lit: 0.45, seed: 23, haze: 0.2 })
  )
}

export function midRight(): string {
  return (
    facade(RWALL, { z0: 105, z1: 150, h: 11, face: 'c0', shade: 'c1', trim: 'c0', kind: 'pair', bay: 5, floor: 3.4, lit: 0.4, seed: 31, haze: 0.62 }) +
    facade(RWALL, { z0: 72, z1: 105, h: 8.8, face: 'c0', shade: 'c1', trim: 'b2', kind: 'band', bay: 5.5, floor: 2.5, lit: 0.45, seed: 32, haze: 0.42 }) +
    facade(RWALL, { z0: 48, z1: 72, h: 7.2, face: 'b0', shade: 'b1', trim: 'b2', kind: 'deck', bay: 4.8, floor: 3.3, lit: 0.45, seed: 33, haze: 0.2 }) +
    facade(RWALL, { z0: 30, z1: 48, h: 5.4, face: 'a0', shade: 'a1', trim: 'a3', kind: 'pair', bay: 3.6, floor: 4.4, lit: 0.5, seed: 34, haze: 0.06 }) +
    facade(RWALL, { z0: 20, z1: 30, h: 5.6, face: 'a0', shade: 'a1', trim: 'a3', kind: 'pair', bay: 3.3, floor: 3.1, lit: 0.55, seed: 35, haze: 0 })
  )
}
