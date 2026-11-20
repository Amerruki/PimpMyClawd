import type { EngineInterface, Frozen, RenderElement, RenderInput } from 'claude-code'

import { runAction } from './actions'
import { clockText, cut, readFeed } from './feed-state'
import { modelName } from './retro-kit'

// A taskbar row for the Retro look: a Start button that opens the session
// menu, what the session is doing (from the session feed, so it follows each
// tool call), the project and branch, and a tray with the model and a clock. The band redraws as the feed or its props
// change, and the clock reads the time on each redraw.
export async function retroBand(
  $: EngineInterface,
  e: Frozen<RenderInput<'AbovePrompt'>>,
  next: (e: Frozen<RenderInput<'AbovePrompt'>>) => Promise<RenderElement>,
): Promise<RenderElement> {
  if (e.props.hasSurvey || e.props.isCollapsed) {
    return next(e)
  }
  let now: number | undefined

  try {
    now = await $.clock.now()
  } catch {
    now = undefined
  }
  const { Box, Button, Text } = $.ui.resolve(e)
  const columns = Math.max(0, Math.floor(e.props.bodyColumns))
  const isFramed = e.props.maxRows >= 3
  const border = isFramed ? 'single' : undefined
  const f = await readFeed($)
  const isWorking = e.props.isWorking
  const status = isWorking ? cut(f.activity === '' ? 'Working...' : `${f.activity}...`, 48) : 'Ready'
  const model = modelName(f.model)
  const isWide = columns >= 44 && model !== ''
  const isWider = columns >= 72 && f.project !== ''

  return (
    <Box flexDirection="row" width={columns} alignItems="center" gap={1}>
      <Button
        key="retro-start"
        label="Start"
        variant="primary"
        onPress={() => void runAction($, 'menu')}
      />
      <Box borderStyle={border} paddingX={1} flexShrink={1} overflow="hidden">
        <Text dimColor={!isWorking} wrap="truncate">
          {status}
        </Text>
      </Box>
      {isWider ? (
        <Box borderStyle={border} paddingX={1} flexShrink={1} overflow="hidden">
          <Text wrap="truncate">{f.branch === null ? f.project : `${f.project} (${f.branch})`}</Text>
        </Box>
      ) : null}
      <Box flexGrow={1} />
      <Box borderStyle={border} paddingX={1} flexShrink={0} flexDirection="row" gap={2}>
        {isWide ? <Text dimColor>{model}</Text> : null}
        <Text mono tabular>{clockText(now)}</Text>
      </Box>
    </Box>
  )
}
