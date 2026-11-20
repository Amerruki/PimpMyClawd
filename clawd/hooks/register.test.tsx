import { describe, expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput } from 'claude-code'

import { GIT_MS, IDLE_X, LEAVE_MS, daypartOf, gitActOf, gitKindOf, initialScene, mainX, reduce, seatX } from './model'
import { FOCUS_VIEW, labelOf, sceneSvg } from './scene'
import { frameFor } from './register'

const BAND = {
  plugin: 'clawd',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 5, bodyColumns: 60, scroll: { offset: 0, bodyRows: 5 }, view: {} },
} as const

function withHelpers(n: number, at = 1000) {
  let s = reduce(initialScene(0), { type: 'turnStart' }, at)
  for (let i = 0; i < n; i++) s = reduce(s, { type: 'agentStart', id: `h${i}` }, at)
  return s
}

describe('the scene model', () => {
  test('a new state starts from where Clawd stands and walks from there', () => {
    let s = reduce(initialScene(0), { type: 'turnStart' }, 100_000)
    expect(s.main.activity).toBe('thinking')
    expect(s.main.fromX).toBe(IDLE_X)
    expect(s.main.fromSitting).toBe(true)

    const midWalk = mainX(s.main, 100_800)
    expect(midWalk).toBeLessThan(IDLE_X)
    s = reduce(s, { type: 'tool', kind: 'research' }, 100_800)
    expect(s.main.activity).toBe('research')
    expect(s.main.fromX).toBe(midWalk)
    expect(s.main.fromSitting).toBe(false)
  })

  test('Clawd keeps his solo work beside helpers; routines are interludes', () => {
    let s = reduce(withHelpers(2), { type: 'tool', kind: 'typing' }, 1500)
    expect(s.minis.map(m => m.seat)).toEqual([0, 1])
    expect(s.main.activity).toBe('typing')
    s = reduce(s, { type: 'interlude', ensemble: 'scurry' }, 3000)
    expect(s.main.activity).toBe('scurry')
    s = reduce(s, { type: 'crew', mode: 'football' }, 4000)
    expect(s.main.activity).toBe('typing')
    s = reduce(s, { type: 'crew', mode: 'work' }, 5000)
    expect(s.crew).toEqual({ mode: 'work', since: 5000, prev: 'football', prevSince: 4000 })

    s = reduce(s, { type: 'agentEnd', id: 'h0' }, 7000)
    s = reduce(s, { type: 'tick' }, 7000 + LEAVE_MS + 1)
    expect(s.minis.map(m => m.id)).toEqual(['h1'])
    s = reduce(s, { type: 'turnEnd' }, 21_000)
    expect(s.main.activity).toBe('happy')
  })

  test('waiting outranks compaction, which outranks git, which outranks the turn', () => {
    let s = reduce(initialScene(0), { type: 'turnStart' }, 1000)
    s = reduce(s, { type: 'git', kind: 'push', act: 'push' }, 2000)
    expect(s.main.activity).toBe('git-push')
    s = reduce(s, { type: 'compactStart' }, 2500)
    expect(s.main.activity).toBe('compact')
    s = reduce(s, { type: 'wait', wait: 'permission' }, 3000)
    expect(s.main.activity).toBe('wait-permission')
    s = reduce(s, { type: 'wait', wait: null }, 4000)
    s = reduce(s, { type: 'compactEnd' }, 4000)
    s = reduce(s, { type: 'tick' }, 7000)
    expect(s.main.activity).toBe('git-push')
    s = reduce(s, { type: 'tick' }, 2000 + GIT_MS)
    expect(s.main.activity).toBe('thinking')
  })

  test('a conflict sends the helpers to fight; a crew merge graduates two', () => {
    let s = reduce(withHelpers(3), { type: 'git', kind: 'conflict', act: 'conflict' }, 2000)
    expect(s.crew.mode).toBe('fight')
    s = reduce(s, { type: 'tick' }, 2000 + GIT_MS)
    expect(s.crew.mode).toBe('work')
    s = reduce(s, { type: 'git', kind: 'merge', act: 'mergeCrew' }, 20_000)
    expect(s.crew.mode).toBe('merge')
    const during = sceneSvg(s, 23_000)
    expect(during).toContain('M') // drawn without throwing
    expect(during).toContain('scale(0.8)')
  })

  test('commands and test runs are recognised only when they say so', () => {
    expect(gitActOf('merge', 1, 0.1)).toBe('mergeDocs')
    expect(gitActOf('merge', 3, 0.1)).toBe('mergeCrew')
    expect(gitKindOf('git push origin main', 'To github.com:x/y.git', false)).toBe('push')
    expect(gitKindOf('git push', '! [rejected] main -> main', false)).toBe(null)
    expect(gitKindOf('git merge feature', 'CONFLICT (content): Merge conflict in a.ts', true)).toBe('conflict')
    expect(gitKindOf('gh pr create --fill', 'https://github.com/x/y/pull/3', false)).toBe('pr')
    expect(gitKindOf('git add . && git commit -m "x"', '[main 1a2b3c] x', false)).toBe('commit')
    expect(gitKindOf('npm test', 'Tests: 12 passed, 0 failed', false)).toBe('testsPass')
    expect(gitKindOf('pytest -q', '3 failed, 9 passed', false)).toBe('testsFail')
    expect(gitKindOf('cargo test', 'error', true)).toBe('testsFail')
    expect(gitKindOf('git status', '', false)).toBe(null)
  })

  test('compaction outranks git, and a weekly reset brings a refill', () => {
    let s = reduce(initialScene(0), { type: 'usage', usage: { week: 88 } }, 20_000)
    expect(s.refill).toBe(null)
    s = reduce(s, { type: 'usage', usage: { week: 3 } }, 21_000)
    expect(s.refill).toEqual({ at: 21_000, from: 88 })
  })

  test('the hour picks the time of day', () => {
    expect([5, 8, 18, 23, 2].map(daypartOf)).toEqual(['dawn', 'day', 'dusk', 'night', 'night'])
  })

  test('a finished walk holds its end value, which Chrome would otherwise drop', () => {
    const s = reduce(initialScene(0), { type: 'agentStart', id: 'a' }, 1000)
    const svg = sceneSvg(s, 60_000)
    expect(svg).not.toMatch(/dur="[\d.]+s" begin="[^"]*" fill="freeze"/)
    expect(svg).toContain(`${seatX(0)} 87;${seatX(0)} 75;${seatX(0)} 75"`)
  })
})

describe('the room', () => {
  test('the lamp follows dark mode, and the night', () => {
    expect(sceneSvg(initialScene(0, 'day'), 1000)).toContain('.lamp-light{opacity:0}@media (prefers-color-scheme: dark){.lamp-light{opacity:1}}')
    expect(sceneSvg(initialScene(0, 'night'), 1000)).toContain('.lamp-light{opacity:1}')
  })

  test('usage shows as the gauge, the flush, the weather and the clock', () => {
    let s = reduce(initialScene(0, 'night'), { type: 'usage', usage: { context: 95, week: 100, fiveHour: 50, fiveHourResetsAt: 2000 + 101 * 60_000 } }, 1000)
    s = reduce(s, { type: 'turnStart' }, 1500)
    const svg = sceneSvg(s, 2000)
    expect(svg).toContain('>95%</text>')
    expect(svg).toContain('fill="#ca4733"')
    expect(svg).toContain('wx-night-4')
    expect(svg).toContain('>1:41</text>')
    expect(svg).toContain('>1:40</text>')
    expect(labelOf(s)).toBe('Context 95%')
  })

  test('the git board shows main in green, or our branch forking off it', () => {
    const onMain = reduce(initialScene(0), { type: 'repo', repo: { branch: 'main', base: 'main', ahead: 0, behind: 0 } }, 1000)
    expect(sceneSvg(onMain, 2000)).toContain('stroke="#5FCB6B"')
    const onBranch = reduce(initialScene(0), { type: 'repo', repo: { branch: 'feature/<x>', base: 'main', ahead: 2, behind: 1 } }, 1000)
    const svg = sceneSvg(onBranch, 2000)
    expect(svg).toContain('feature/&lt;x&gt;')
    expect(svg).toContain('stroke-dasharray="2 2"')
    expect(sceneSvg(initialScene(0), 2000)).toContain('>no repository</text>')
  })

  test('football gets a referee at five and goalies at six; extra helpers bring laptops', () => {
    let s = reduce(withHelpers(6), { type: 'crew', mode: 'football' }, 2000)
    const svg = sceneSvg(s, 6000)
    expect(svg).toContain('stroke="#2B2F36" stroke-width="0.8"')
    expect(svg).toContain(`x="142" y="84"`)
    s = withHelpers(8)
    expect(s.minis.filter(m => m.seat < 0)).toHaveLength(2)
    expect(sceneSvg(s, 10_000)).toContain('fill="#C9CBCF"/><circle cx="27" cy="17"')
  })

  test('the band shows the whole room when wide and narrows towards Clawd\'s desk', () => {
    expect(frameFor('desktop', 85, 12, null)).toEqual({ px: { width: 884, height: 216 }, view: { x: 0, span: 656 } })
    expect(frameFor('desktop', 85, 4, 600)).toEqual({ px: { width: 600, height: 130 }, view: { x: 85, span: 540 } })
    expect(frameFor('desktop', 40, 16, null)).toEqual({ px: { width: 416, height: 142 }, view: FOCUS_VIEW })
    expect(frameFor('mobile', 40, 8, null)).toEqual({ px: null, view: FOCUS_VIEW })
    const fluid = sceneSvg(initialScene(0), 1000)
    // The app drops inline style attributes, so every rule sits in a <style> block.
    expect(fluid).not.toContain(' style="')
    expect(fluid).toMatch(/^<svg [^>]*width="100%" height="100%" shape-rendering="crispEdges" class="fill">/)
    expect(fluid).toContain('viewBox="0 0 656 128" preserveAspectRatio="xMidYMin meet" overflow="visible"><rect x="-4000"')
    expect(fluid).toContain('.low{transform:translateY(max(0px,calc(25vh - 4.878vw)))}')
    expect(fluid).toContain('@media (min-aspect-ratio: 421/100){.ceil{display:none}}@media (min-aspect-ratio: 373/100){.pend{display:none}}')
    expect(fluid.split('<g class="low">').length).toBe(3)
    expect(fluid).toContain('fill="url(#planks)"')
    const narrow = sceneSvg(initialScene(0), 1000, false, FOCUS_VIEW)
    expect(narrow.split('viewBox="138 0 468 128"').length).toBe(4)
    const phone = sceneSvg(initialScene(0), 1000, false, FOCUS_VIEW, true)
    expect(phone).toMatch(/^<svg [^>]*viewBox="0 0 468 128"/)
    expect(phone).not.toContain('class="low"')
    expect(phone).not.toContain('class="fill"')
  })

  test('the pill only says what the status line does not', () => {
    const s = reduce(withHelpers(3), { type: 'crew', mode: 'sand' }, 2000)
    expect(labelOf(s)).toBe('Sandcastles under the lamp')
    expect(labelOf(reduce(initialScene(0), { type: 'turnStart' }, 1000))).toBe('')
  })
})

test('the band draws the scene on remote surfaces and a Client on the terminal', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('agent.list', () => ({ value: [{ id: 'helper-1', description: 'task', type: 'general-purpose', status: 'running' }] }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000, percent: 30 }, rateLimits: [{ kind: 'seven_day', percentUsed: 60 }] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {}, text: '[main 1a2b3c] add scene' }))
  on('command.run', () => ({ text: '' }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const svg = async (ui: { find: (q: { type: string }) => Promise<{ props: Record<string, unknown> } | undefined> }) =>
    (await ui.find({ type: 'Svg' }))?.props as { source: string; alt: string; isInteractive?: boolean; width?: number }

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const props = await svg(ui)
    expect(props.isInteractive).toBe(true)
    expect(props.width).toBe(surface === 'mobile' ? undefined : 624)
    expect(props.source).toContain('>Reading</text>')
    expect(props.source).toContain('clip-path="url(#win-clip)"')
    await ui.unmount()
  }

  await $.turn.start({ text: 'hi', turnId: 't1' } as any)
  await $.turn.start({ text: 'task', turnId: 't2', agentId: 'helper-1' } as any)
  await clock.advance(1000)
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "add scene"' } as any)

  const desk = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await svg(desk)).alt).toBe('Clawd the crab: Committed')
  await desk.unmount()

  await clock.advance(GIT_MS + 200)
  const later = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await svg(later)).alt).toBe('Clawd the crab: 1 helper')
  await later.unmount()

  const term = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const client = await term.find({ type: 'Client' })
  expect(client?.props.module).toBe('hooks/crab-terminal.tsx')
  expect((client?.props.props as { helpers: number }).helpers).toBe(1)
  await term.unmount()

  await $.turn.complete({ answer: 'ok', durationMs: 3000, isAborted: false, turnId: 't2', agentId: 'helper-1' } as any)
  await $.turn.complete({ answer: 'ok', durationMs: 4000, isAborted: false, turnId: 't1' } as any)

  await $.command.run({ command: 'clawd', args: 'render image' } as CommandRunInput)
  const image = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await svg(image)).isInteractive).toBeUndefined()
  await image.unmount()

  expect((await $.command.run({ command: 'clawd', args: '' } as CommandRunInput)).text).toBe('Clawd is napping.')
  const hidden = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await hidden.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await hidden.unmount()
  await clock.advance(60_000)
})

test('the demo commands drive states, helpers, crew, waits, time, repo, usage and git', async ($, on) => {
  const clock = mock.clock(on, { now: 2_000_000 })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('agent.list', () => ({ value: [] }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const run = async (args: string) => (await $.command.run({ command: 'clawd', args } as CommandRunInput)).text
  const drawn = async () => {
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const props = (await ui.find({ type: 'Svg' }))?.props as { alt: string; source: string }
    await ui.unmount()
    return props
  }

  expect(await run('conduct')).toBe('Clawd: conduct.')
  expect((await drawn()).alt).toBe('Clawd the crab: 3 helpers')
  expect((await drawn()).source).toContain('type="rotate" values="-35;25;-35"')

  expect(await run('crew football')).toBe('Helpers: football.')
  expect((await drawn()).alt).toBe('Clawd the crab: Football match!')
  expect(await run('crew tower')).toBe('Helpers: tower.')

  expect(await run('wait question')).toBe('Clawd is waiting on a question.')
  expect((await drawn()).alt).toBe('Clawd the crab: Waiting on your answer')
  expect(await run('wait off')).toBe('Clawd stops waiting.')

  expect(await run('tests fail')).toBe('Tests fail: red light.')
  expect((await drawn()).alt).toBe('Clawd the crab: Tests failed')
  await clock.advance(GIT_MS + 600)

  expect(await run('git push merge crew')).toBe('Playing push, then merge (crew).')
  expect((await drawn()).alt).toBe('Clawd the crab: Pushed to origin')
  await clock.advance(GIT_MS + 600)
  expect((await drawn()).source).toContain('scale(0.8)')
  await clock.advance(GIT_MS + 600)

  expect(await run('repo feature/room 4 2')).toBe('Pretending we are on feature/room, 4 ahead and 2 behind main.')
  expect((await drawn()).source).toContain('>feature/room</text>')

  expect(await run('time 23')).toBe('Pretending it is 23:00: night.')
  expect((await drawn()).source).toContain('city-sky-night')

  expect(await run('context 92')).toBe('Pretending the context is 92% used. /clawd stop returns to the real numbers.')
  expect((await drawn()).alt).toMatch(/Context 92%$/)
  expect(await run('clock 90 40')).toBe('Pretending the 5-hour window resets in 90 minutes, 40% used.')
  expect((await drawn()).source).toContain('>1:30</text>')
  expect(await run('compact')).toBe('Clawd sweeps up the context for six seconds.')
  expect((await drawn()).alt).toBe('Clawd the crab: Tidying up the context')
  await clock.advance(9000)
  expect(await run('week 95')).toMatch(/^Pretending the weekly limit is 95%/)
  expect(await run('week 1')).toMatch(/^Pretending the weekly limit is 1%/)
  expect((await drawn()).alt).toBe('Clawd the crab: Fresh coffee: the weekly limit reset')

  expect(await run('helpers 9')).toBe('9 pretend helpers on duty.')
  expect(await run('helpers')).toMatch(/^Usage:/)
  expect(await run('git nonsense')).toMatch(/^Usage:/)
  expect(await run('stop')).toBe('Demo stopped; pretend helpers are heading out and the real clock, usage and branch are back.')

  expect(await run('tour')).toMatch(/^Clawd tour started/)
  for (let s = 0; s < 280; s += 5) await clock.advance(5000)
  expect((await drawn()).source).toContain('>Reading</text>')
})
