import type { ClientModule } from 'claude-code'

type Props = { activity: string; helpers: number; label: string }
type State = { tick: number }

const SPRITE_COLUMNS = 9
const BODY = [' ▐▛███▜▌ ', '▝▜█████▛▘']
const CHEER = ['▗▐▛███▜▌▖', ' ▜█████▛ ']
const BLINK = [' ▐█████▌ ', '▝▜█████▛▘']
const LEGS = ['  ▘▘ ▝▝  ', '  ▝▘ ▘▝  ']
const HELPER = ['▟▙', '▙▟']
const TICK_MS = 120
const ROAMING = new Set(['thinking', 'errand', 'scurry', 'coffee', 'inspect'])

// 0 → span → 0, one column per step.
function pingPong(step: number, span: number): number {
  if (span <= 0) return 0
  const phase = step % (span * 2)
  return phase <= span ? phase : span * 2 - phase
}

const TerminalCrab: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  if (surface.state === undefined) {
    surface.every(TICK_MS, () => surface.setState({ tick: (surface.state?.tick ?? 0) + 1 }))
  }
  const tick = surface.state?.tick ?? 0
  const span = Math.max(0, surface.columns - SPRITE_COLUMNS)

  let left = 1
  let rows = BODY
  let legs = LEGS[0]
  let lift = 0
  if (ROAMING.has(props.activity)) {
    const pace = props.activity === 'thinking' || props.activity === 'inspect' ? 3 : 1
    left = pingPong(Math.floor(tick / pace), props.activity === 'thinking' ? Math.min(span, 8) : span)
    legs = LEGS[Math.floor(tick / pace) % 2]
  } else if (props.activity === 'happy') {
    rows = CHEER
    lift = Math.floor(tick / 3) % 2
  } else if (props.activity === 'idle') {
    rows = tick % 30 === 0 ? BLINK : BODY
  } else {
    lift = tick % 4 < 2 ? 0 : 1
  }

  const helpers = Array.from({ length: Math.min(props.helpers, 8) }, (_, i) => HELPER[(tick + i) % 2]).join(' ')

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginLeft={left} marginTop={1 - lift} marginBottom={lift}>
        <Text color="claude">{rows[0]}</Text>
        <Text color="claude">{rows[1]}</Text>
        <Text color="claude">{legs}</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        {props.label !== '' && <Text color="claude">{props.label}</Text>}
        {helpers !== '' && <Text color="claude">{helpers}</Text>}
      </Box>
    </Box>
  )
}

export default TerminalCrab
