import type { EngineInterface } from 'claude-code'

import { readRealFeed } from './feed-state'
import type { HotspotAction } from './hotspot'

// What a click on a look's hotspot, or its Start button, does. Info shows at
// once; anything that changes the session asks first. The real session is
// read here even while `/skin sim` is on: the sim only changes the picture.

const MODELS = [
  ['Opus', 'opus'],
  ['Sonnet', 'sonnet'],
  ['Haiku', 'haiku'],
] as const

// The running main-loop turn, as turn.start handed it; null between turns.
let turnId: string | null = null

export function noteTurn(id: string | null): void {
  turnId = id
}

// Resolves to the label chosen, or undefined when the person closes the dialog.
async function ask($: EngineInterface, question: string, options: readonly string[], header?: string): Promise<string | undefined> {
  try {
    return await $.ui.ask(question, header === undefined ? options : { options, header })
  } catch {
    return undefined
  }
}

async function runCommand($: EngineInterface, names: readonly string[], args = ''): Promise<boolean> {
  try {
    const known = new Set((await $.command.list()).map(c => c.name))
    const name = names.find(n => known.has(n))

    if (name === undefined) {
      return false
    }
    await $.command.run({ command: name, args })

    return true
  } catch {
    return false
  }
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

async function info($: EngineInterface, action: HotspotAction): Promise<void> {
  const f = await readRealFeed($)
  const e = f.edge

  switch (action) {
    case 'context':
      if (!(await runCommand($, ['context']))) {
        $.ui.toast(e.context === null ? 'No context reading yet.' : `Context window ${e.context}% full.`)
      }
      return
    case 'usage':
      if (!(await runCommand($, ['usage', 'cost']))) {
        $.ui.toast(e.week === null ? 'No usage reading yet.' : `${Math.round(e.week.percentUsed)}% of this week's usage.`)
      }
      return
    case 'diff': {
      if (e.diff === null) {
        $.ui.toast('Not in a git repository.')
        return
      }
      if (e.diff.files === 0) {
        $.ui.toast('Working tree clean.')
        return
      }
      $.ui.toast(`${plural(e.diff.files, 'file')} changed: +${e.diff.added} −${e.diff.removed}.`)
      const draft = await $.prompt.read()

      if (draft.text.trim() === '') {
        await $.prompt.fill({ text: 'Review my uncommitted changes.' })
      }
      return
    }
    case 'last-command': {
      const last = f.commands.at(-1)

      $.ui.toast(last === undefined ? 'No commands run yet.' : `${last.text}: ${last.ok === null ? 'running' : last.ok ? 'passed' : 'failed'}.`)
      return
    }
    case 'session': {
      const where = f.branch === null ? f.project : `${f.project} (${f.branch})`
      const parts = [f.session, where, f.model, plural(f.prompts, 'prompt')].filter(p => p !== '')

      $.ui.toast(parts.join(' · '))
      return
    }
    default:
  }
}

async function switchModel($: EngineInterface): Promise<void> {
  let current = ''

  try {
    current = await $.session.model()
  } catch {
    current = ''
  }
  const others = MODELS.filter(([, alias]) => !current.toLowerCase().includes(alias))
  const choice = await ask($, `Switch model?${current === '' ? '' : ` Now on ${current}.`}`, [...others.map(([label]) => label), 'Keep it'], 'Model')
  const alias = MODELS.find(([label]) => label === choice)?.[1]

  if (alias !== undefined && !(await runCommand($, ['model'], alias))) {
    $.ui.toast(`Couldn't switch: try /model ${alias}.`)
  }
}

async function compact($: EngineInterface, confirmed: boolean): Promise<void> {
  if ((await readRealFeed($)).isWorking) {
    $.ui.toast("Claude is working. Compact once it's done.")
    return
  }
  if (!confirmed && (await ask($, 'Compact the conversation now?', ['Compact', 'Cancel'], 'Compact')) !== 'Compact') {
    return
  }
  try {
    await $.session.compact()
  } catch {
    $.ui.toast("Couldn't compact right now. Try /compact.")
  }
}

async function stop($: EngineInterface, confirmed: boolean): Promise<void> {
  const id = turnId

  if (id === null) {
    $.ui.toast('Nothing is running.')
    return
  }
  if (!confirmed && (await ask($, "Stop Claude's current turn?", ['Stop', 'Keep going'], 'Stop')) !== 'Stop') {
    return
  }
  try {
    await $.turn.abort({ turnId: id })
  } catch {
    $.ui.toast('That turn already ended.')
  }
}

async function menu($: EngineInterface): Promise<void> {
  const working = (await readRealFeed($)).isWorking
  const items = working ? ['Session info', 'Context', 'Switch model', 'Stop Claude'] : ['Session info', 'Context', 'Switch model', 'Compact']
  const choice = await ask($, 'What do you want to do?', items, 'Start')
  const action: HotspotAction | undefined =
    choice === 'Session info' ? 'session' : choice === 'Context' ? 'context' : choice === 'Switch model' ? 'model' : choice === 'Compact' ? 'compact' : choice === 'Stop Claude' ? 'stop' : undefined

  if (action !== undefined) {
    await runAction($, action)
  }
}

// `confirmed`: the person already confirmed in the scene, so ask nothing.
export async function runAction($: EngineInterface, action: HotspotAction, confirmed = false): Promise<void> {
  switch (action) {
    case 'menu':
      return menu($)
    case 'model':
      return switchModel($)
    case 'compact':
      return compact($, confirmed)
    case 'stop':
      return stop($, confirmed)
    default:
      return info($, action)
  }
}
