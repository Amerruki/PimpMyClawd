import { expect, test } from 'claude-code/testing'

const backdrop = (scene: string) =>
  ({
    plugin: 'looks',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene, plugin: 'looks', glass: false },
  }) as const

test('the terminal and retro scenes follow the session', async ($, on) => {
  let now = 1_700_000_000_000
  on('clock.now', () => ({ value: (now += 3000) }))
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('session.root', () => ({ value: '/Users/me/Developer/ClaudeMods' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('store.get', () => ({ value: 'terminal' }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', (_, e) =>
    e.tool === 'Bash' && e.command.startsWith('false') ? { result: { stdout: '', stderr: 'x' }, isError: true } : { result: {} },
  )

  await $.session.start({ cwd: '/Users/me/Developer/ClaudeMods', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'git status --short' })
  await $.tool.call({ tool: 'Bash', command: "echo 'it works'" })
  await $.tool.call({ tool: 'Bash', command: 'false && curl -H "Authorization: Bearer abcdef1234567890abcdef"' })
  await $.tool.call({ tool: 'Read', file_path: '/Users/me/Developer/ClaudeMods/skins/hooks/kit.ts' })
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1000, isAborted: false })

  const term = await $.ui.mount(backdrop('terminal--abc'))
  const svg = await term.find({ type: 'Svg' })
  const source = String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? JSON.stringify(svg))
  expect(source).toContain('git status --short')
  expect(source).toContain('✓')
  expect(source).toContain('✗')
  expect(source).toContain('ClaudeMods')
  expect(source).toContain('main')
  expect(source).not.toContain('abcdef1234567890')
  // The app refuses numeric character references in a scene.
  expect(source).toContain('&apos;it works&apos;')
  expect(source).not.toMatch(/&#/)
  await term.unmount()

  const retro = await $.ui.mount(backdrop('retro'))
  const rsvg = await retro.find({ type: 'Svg' })
  const rsource = String((rsvg as { props?: { source?: string } } | undefined)?.props?.source ?? JSON.stringify(rsvg))
  expect(rsource).toContain('kit.ts')
  expect(rsource).toContain('Ready')
  await retro.unmount()
})

test('a mounted backdrop draws again at a turn\'s start and end, not in between', async ($, on) => {
  let now = 1_700_000_000_000
  on('clock.now', () => ({ value: (now += 3000) }))
  on('session.root', () => ({ value: '/x/Proj' }))
  on('session.model', () => ({ value: 'm' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {} }))

  const ui = await $.ui.mount(backdrop('retro'))
  const source = async () => String(((await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined)?.props?.source)
  const idle = await source()

  await $.turn.start({ text: 'go', turnId: 't1' })
  const before = await source()
  expect(before).not.toBe(idle)
  await $.tool.call({ tool: 'Edit', file_path: '/x/Proj/src/app.ts', old_string: 'a', new_string: 'b' })
  expect(await source()).toBe(before)

  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1000, isAborted: false })
  expect(await source()).toContain('app.ts')
  await ui.unmount()
})

test('the cyberpunk scene shows the diff, context, weekly use and reset, and last activity', async ($, on) => {
  let now = Date.parse('2026-11-15T09:00:00Z')
  on('clock.now', () => ({ value: (now += 1000) }))
  on('session.root', () => ({ value: '/x/Proj' }))
  on('session.model', () => ({ value: 'm' }))
  on('session.usage', () => ({
    value: {
      startedAt: now,
      context: { tokens: 120000, window: 200000, percent: 60 },
      rateLimits: [{ kind: 'seven_day', percentUsed: 37, resetsAt: '2026-11-17T18:00:00Z' }],
    },
  }))
  on('process.run', (_, e) => ({
    value: {
      exitCode: 0,
      stdout: e.argv.includes('diff') ? ' 3 files changed, 120 insertions(+), 4 deletions(-)\n' : 'main\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {} }))

  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'npm test & echo "<x>"' })
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1000, isAborted: false })

  const ui = await $.ui.mount(backdrop('cyberpunk--abc'))
  const source = String(((await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined)?.props?.source)
  expect(source).toContain('待機中')
  expect(source).toContain('Bash: npm test &amp; echo &quot;&lt;x&gt;&quot;')
  expect(source).toContain('+120')
  expect(source).toContain('−4')
  expect(source).toContain('60%')
  // The ration dial counts down to the weekly reset in days and hours.
  expect(source).toMatch(/\d日\d+時間/)
  expect(source).toContain('37%')
  expect(source).not.toContain('<!--cp:')
  expect(source.length).toBeLessThan(120000)
  await ui.unmount()
})

test('the cyberpunk scene shows working, an emergency while compacting, then all clear', async ($, on) => {
  let now = Date.parse('2026-11-15T09:00:00Z')
  let percent = 93
  on('clock.now', () => ({ value: (now += 1000) }))
  on('session.root', () => ({ value: '/x/Proj' }))
  on('session.model', () => ({ value: 'm' }))
  on('session.usage', () => ({ value: { startedAt: now, context: { tokens: 1, window: 2, percent }, rateLimits: [] } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  // What the backdrop shows while the compaction itself runs.
  let during = ''
  let read: () => Promise<string> = async () => ''
  on('session.compact', async () => {
    during = await read()
    percent = 12

    return { skip: 'test' }
  })

  const ui = await $.ui.mount(backdrop('cyberpunk--abc'))
  const source = async () => String(((await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined)?.props?.source)
  read = source
  // The state is a set of classes on the scene's root element.
  const state = (svg: string) => (/^<svg[^>]*\sclass="([^"]*)"/.exec(svg)?.[1] ?? '').split(' ').filter(c => c !== '')

  expect(state(await source())).toEqual([])

  await $.turn.start({ text: 'go', turnId: 't1' })
  expect(state(await source())).toContain('wk')
  expect(state(await source())).toContain('p4')

  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'hi', toolUses: [] }] })
  expect(state(during)).toContain('em')
  expect(during.length).toBeLessThan(120000)

  const after = await source()
  expect(state(after)).not.toContain('em')
  expect(state(after)).not.toContain('p4')
  expect(after).toContain('ALL CLEAR')

  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1000, isAborted: false })
  const idle = await source()
  expect(state(idle)).toEqual([])
  expect(idle).not.toContain('ALL CLEAR')
  await ui.unmount()
})

test('a live scene is drawn anew every five minutes, so a still never outlasts that', async ($, on) => {
  let now = Date.parse('2026-11-20T09:01:00Z')
  on('clock.now', () => ({ value: now }))
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('session.root', () => ({ value: '/x/Proj' }))
  on('session.model', () => ({ value: 'm' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('store.get', () => ({ value: 'cyberpunk' }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Each period resolves when the test says so.
  const periods: number[] = []
  let tick = () => {}
  on('clock.every', (_, e) => {
    periods.push(e.ms)

    return new Promise<{ value: undefined }>(resolve => {
      tick = () => resolve({ value: undefined })
    })
  })

  await $.session.start({ cwd: '/x/Proj', surface: 'desktop', isInteractive: true })
  expect(periods).toEqual([5 * 60 * 1000])

  const ui = await $.ui.mount(backdrop('cyberpunk--abc'))
  const source = async () => String(((await ui.find({ type: 'Svg' })) as { props?: { source?: string } } | undefined)?.props?.source)
  const first = await source()
  const settle = async (from: string) => {
    for (let i = 0; i < 50; i++) {
      const s = await source()
      if (s !== from) return s
    }

    return source()
  }

  // Still in the same slot: nothing to draw.
  now += 60 * 1000
  tick()
  expect(await settle(first)).toBe(first)

  // The next slot draws the same scene afresh.
  now += 5 * 60 * 1000
  tick()
  const fresh = await settle(first)
  expect(fresh).not.toBe(first)
  expect(first).toContain('待機中')
  expect(fresh).toContain('待機中')
  await ui.unmount()
})
