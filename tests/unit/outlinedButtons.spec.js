// issues/030: a `.button.is-outlined` without a colour class (the unselected
// options of the order form's Ruta, Tipus d'entrega... button groups) must keep
// a readable label. Bulma 1 colours its text with the button's own lightness,
// which is white when no colour class sets it.
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import * as sass from 'sass'

// vitest runs from the project root
const root = process.cwd()

describe('uncoloured outlined buttons (issues/030)', () => {
  const { css } = sass.compile(join(root, 'src/scss/main.scss'), {
    quietDeps: true,
    loadPaths: [join(root, 'node_modules')],
    logger: sass.Logger.silent
  })

  // the rule body of the first selector that starts with `selector`
  const ruleFor = selector => {
    const start = css.indexOf(selector)
    if (start === -1) return null
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('have their own text, border and background colours', () => {
    const rule = ruleFor('.button.is-outlined:not(')
    expect(rule).not.toBeNull()
    expect(rule).toMatch(/[^-]color:\s*var\(--bulma-text-strong\)/)
    expect(rule).toMatch(/border-color:\s*var\(--bulma-border\)/)
    expect(rule).toMatch(/background-color:\s*var\(--bulma-scheme-main\)/)
  })

  it('leave coloured outlined buttons to Bulma', () => {
    const selector = css.slice(css.indexOf('.button.is-outlined:not('), css.indexOf('{', css.indexOf('.button.is-outlined:not(')))
    for (const colour of ['is-primary', 'is-link', 'is-info', 'is-success', 'is-warning', 'is-danger', 'is-dark', 'is-light']) {
      expect(selector).toContain(`.${colour}`)
    }
  })
})
