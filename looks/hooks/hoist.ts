// Moves every inline style="..." in a scene into a class rule in the scene's
// stylesheet. The app has been seen to drop inline style attributes from a
// drawn SVG; rules in the <style> block always survive. Identical styles share
// one class. Rules are !important so they keep the precedence an inline style
// had over the scene's own class rules.

export function hoistInlineStyles(svg: string): string {
  const classes = new Map<string, string>()

  const body = svg.replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (tag, name: string, attrs: string | undefined, slash: string) => {
    if (attrs === undefined || !/\sstyle="/.test(attrs)) {
      return tag
    }
    const m = /\sstyle="([^"]*)"/.exec(attrs)
    const css = (m?.[1] ?? '').trim()

    if (css === '') {
      return `<${name}${attrs.replace(/\sstyle="[^"]*"/, '')}${slash}>`
    }
    let cls = classes.get(css)

    if (cls === undefined) {
      cls = `hs${classes.size.toString(36)}`
      classes.set(css, cls)
    }
    let rest = attrs.replace(/\sstyle="[^"]*"/, '')

    rest = /\sclass="/.test(rest) ? rest.replace(/\sclass="([^"]*)"/, (_c, v: string) => ` class="${v} ${cls}"`) : `${rest} class="${cls}"`

    return `<${name}${rest}${slash}>`
  })

  if (classes.size === 0) {
    return svg
  }
  const important = (css: string) =>
    css
      .split(';')
      .map(d => d.trim())
      .filter(d => d !== '')
      .map(d => (/!important$/.test(d) ? d : `${d} !important`))
      .join(';')
  const rules = [...classes].map(([css, cls]) => `.${cls}{${important(css)}}`).join('')
  const at = body.indexOf('</style>')

  // A scene with no stylesheet gets one right after its opening tag.
  return at === -1 ? body.replace(/<svg\b[^>]*>/, open => `${open}<style>${rules}</style>`) : `${body.slice(0, at)}${rules}${body.slice(at)}`
}
