// issues/447: in dark mode the list of a native select (the «Any» filter of
// Ingressos i despeses) showed white with light-grey options. The filter-bar
// select has a transparent background, so the browser drew the list on its light
// default while the options took the theme's light text. Every option gets the
// theme's surface and text colours in dark mode, whatever select it belongs to.
import { describe, it, expect, beforeAll } from 'vitest'
import { join } from 'node:path'
import * as sass from 'sass'

const root = process.cwd()

describe('select options follow the dark theme (issues/447)', () => {
  beforeAll(() => {
    const { css } = sass.compile(join(root, 'src/scss/main.scss'), {
      quietDeps: true,
      loadPaths: [join(root, 'node_modules')],
      logger: sass.Logger.silent
    })
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    document.body.innerHTML = `
      <form class="filter-bar"><label class="filter-select"><span>Any</span>
        <div class="control"><span class="select"><select id="filter"><option>2026</option><optgroup label="g"><option id="grouped">2025</option></optgroup></select></span></div>
      </label></form>
      <div class="field"><div class="select"><select id="form"><option id="plain">Tots</option></select></div></div>`
  })

  const colours = sel => {
    const s = getComputedStyle(document.querySelector(sel))
    return { bg: s.backgroundColor, fg: s.color }
  }

  it('dark: surface background and light text on every option', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    for (const sel of ['#filter option', '#grouped', '#plain']) {
      const c = colours(sel)
      expect(c.bg).toBe('var(--a-surface)')
      expect(c.fg).toBe('var(--a-fg)')
    }
  })

  it('light: options keep the browser defaults', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(colours('#plain').bg).not.toBe('var(--a-surface)')
  })
})
