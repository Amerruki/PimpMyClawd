// A scene with its motion removed, for a look that is shown as a picture.
// The app plays a scene only when its markup animates; one that costs too
// much to play is stopped after a few choppy seconds, so such a look is
// better handed over still from the start.
export function stillScene(svg: string): string {
  return svg
    .replace(/<(animate|animateTransform|animateMotion|set)\b[^>]*?(?:\/>|>[\s\S]*?<\/\1>)/g, '')
    .replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .replace(/(?:animation|transition)(?:-[a-z-]+)?\s*:[^;}]*;?/g, '')
}
