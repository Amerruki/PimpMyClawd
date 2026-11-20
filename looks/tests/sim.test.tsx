import { expect, test } from 'claude-code/testing'

const backdrop = (scene: string) =>
  ({
    plugin: 'looks',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene, plugin: 'looks', glass: false },
  }) as const

const look = (args: string) => ({ command: 'skin', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } }) as const

const sourceOf = async (mounted: { find: (q: { type: string }) => Promise<unknown>; unmount: () => Promise<void> }) => {
  const svg = await mounted.find({ type: 'Svg' })

  await mounted.unmount()

  return String((svg as { props?: { source?: string } } | undefined)?.props?.source ?? JSON.stringify(svg))
}

test('/skin sim draws a made-up session and /skin sim off brings the real one back', async ($, on) => {
  let now = 1_700_000_000_000
  on('clock.now', () => ({ value: (now += 3000) }))
  on('command.register', () => ({ value: { command: 'skin' } }))
  on('session.root', () => ({ value: '/Users/me/Developer/ClaudeMods' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'main\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('store.get', () => ({ value: 'terminal' }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/Users/me/Developer/ClaudeMods', surface: 'desktop', isInteractive: true })

  const real = await sourceOf(await $.ui.mount(backdrop('terminal--a')))
  expect(real).not.toContain('npm test')

  const on1 = await $.command.run(look('sim failed context 92'))
  expect(on1.text).toContain('last command failed')
  expect(on1.text).toContain('context 92%')
  const failed = await sourceOf(await $.ui.mount(backdrop('terminal--b')))
  expect(failed).toContain('npm test')
  expect(failed).toContain('✗')

  const bad = await $.command.run(look('sim context'))
  expect(bad.text).toContain('needs a number')

  const off = await $.command.run(look('sim off'))
  expect(off.text).toContain('Sim off')
  const back = await sourceOf(await $.ui.mount(backdrop('terminal--c')))
  expect(back).not.toContain('npm test')
})
