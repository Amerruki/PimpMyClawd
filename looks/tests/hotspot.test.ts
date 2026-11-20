import { expect, test } from 'claude-code/testing'

import { hit, toScene } from '../hooks/hotspot'

test('a click maps to the scene point under it in a 16:9 window', () => {
  // 16:9 shows the full width and 900 of the 1000 units, centred.
  expect(toScene(0, 0)).toEqual({ x: 0, y: 50 })
  expect(toScene(1, 1)).toEqual({ x: 1600, y: 950 })
  expect(toScene(0.5, 0.5)).toEqual({ x: 800, y: 500 })
  // Top-aligned scenes start at 0.
  expect(toScene(0, 0, 'min')).toEqual({ x: 0, y: 0 })
  // A window narrower than the scene shows its full height and crops the sides.
  const narrow = toScene(0, 0.5, 'mid', 1.2)
  expect(Math.round(narrow.x)).toBe(200)
  expect(narrow.y).toBe(500)
})

test('a click finds the spot under it, with a little slack', () => {
  const spots = [{ action: 'context' as const, x: 100, y: 400, w: 200, h: 120 }]
  expect(hit(spots, 150, 450)?.action).toBe('context')
  expect(hit(spots, 90, 395)?.action).toBe('context')
  expect(hit(spots, 700, 450)).toBeUndefined()
})
