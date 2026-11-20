// Seamless redraws for live scenes. When a scene's SVG changes, the app
// loads it afresh and every animation starts again from its first frame:
// clouds snap back, rain resets. phaseShift() moves every CSS and SMIL
// animation in a scene forward by `elapsed` seconds, so a scene drawn at
// time T picks up where the one drawn at time 0 would be by now.
//
// Use one clock for a session (the moment the look was first drawn) and
// pass the seconds since then on every redraw.

const shift = (delay: number, elapsed: number): string => {
  const d = Math.round((delay - elapsed) * 1000) / 1000

  return `${d}s`
}

const seconds = (value: string, unit: string): number => (unit === 'ms' ? Number(value) / 1000 : Number(value))

// Inside a CSS declaration block: shift an explicit animation-delay, or add
// one where an `animation` shorthand sets none.
function shiftDeclarations(block: string, elapsed: number): string {
  if (!/animation/.test(block)) {
    return block
  }
  if (/animation-delay\s*:/.test(block)) {
    return block.replace(/animation-delay\s*:\s*(-?[\d.]+)(m?s)/g, (_m, v: string, u: string) => `animation-delay:${shift(seconds(v, u), elapsed)}`)
  }
  if (/animation\s*:/.test(block)) {
    return `${block.replace(/;?\s*$/, '')};animation-delay:${shift(0, elapsed)}`
  }

  return block
}

export function phaseShift(svg: string, elapsed: number): string {
  if (!(elapsed > 0)) {
    return svg
  }

  return (
    svg
      // Stylesheet rules: shift each rule's body, but not @keyframes steps.
      .replace(/<style>([\s\S]*?)<\/style>/g, (_m, css: string) => {
        let out = ''
        let depth = 0
        let inKeyframes = false
        let i = 0

        while (i < css.length) {
          const open = css.indexOf('{', i)
          const close = css.indexOf('}', i)

          if (open !== -1 && (close === -1 || open < close)) {
            const head = css.slice(i, open)
            if (depth === 0) {
              inKeyframes = /@keyframes/.test(head)
            }
            depth += 1
            out += `${head}{`
            i = open + 1
            // A leaf rule: shift its declarations unless inside @keyframes.
            const end = css.indexOf('}', i)
            const nextOpen = css.indexOf('{', i)
            if (end !== -1 && (nextOpen === -1 || end < nextOpen) && !inKeyframes) {
              out += shiftDeclarations(css.slice(i, end), elapsed)
              i = end
            }
          } else if (close !== -1) {
            out += `${css.slice(i, close)}}`
            depth = Math.max(0, depth - 1)
            if (depth === 0) {
              inKeyframes = false
            }
            i = close + 1
          } else {
            out += css.slice(i)
            break
          }
        }

        return `<style>${out}</style>`
      })
      // Inline style attributes.
      .replace(/style="([^"]*)"/g, (_m, body: string) => `style="${shiftDeclarations(body, elapsed)}"`)
      // SMIL: shift a numeric begin, or add one.
      .replace(/<(animate|animateTransform|animateMotion|set)\b([^>]*?)(\/?)>/g, (_m, tag: string, attrs: string, slash: string) => {
        if (/\bbegin="/.test(attrs)) {
          return `<${tag}${attrs.replace(/\bbegin="(-?[\d.]+)(m?s)?"/, (_b, v: string, u: string = 's') => `begin="${shift(seconds(v, u), elapsed)}"`)}${slash}>`
        }

        return `<${tag}${attrs} begin="${shift(0, elapsed)}"${slash}>`
      })
  )
}
