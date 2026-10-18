// issues/137: unfolding «Projectes (TOTS)» in a pivot report, the row headers
// (project names) stopped well before the values. The redesign hid the field
// chips (`.k-pivot-setting`) with display:none while the pivot is not being
// configured. Kendo stacks the rows' chip bar (`.k-settings-rows`) above the row
// headers and sizes it to the column headers, so the row headers line up with
// the values; without it they started at the top, beside the column headers, and
// ended that much earlier. The rows' bar keeps its box (only its chips hide).
import { describe, it, expect, beforeAll } from 'vitest'
import { join } from 'node:path'
import * as sass from 'sass'

const root = process.cwd()

// the layout Kendo's PivotGrid builds (_createLayout), chips bars marked as setting targets
const pivotHtml = `
  <div class="k-pivot k-widget">
    <table class="k-pivot-layout"><tbody><tr>
      <td class="k-pivot-rowheaders">
        <div class="k-pivot-toolbar k-header k-settings-measures k-pivot-setting" id="measures"></div>
        <div class="k-pivot-toolbar k-header k-settings-rows k-pivot-setting" id="rows"><a class="k-button">project_name</a></div>
        <div class="k-grid k-widget k-alt" id="rowsHeader"></div>
      </td>
      <td class="k-pivot-table">
        <div class="k-pivot-toolbar k-header k-settings-columns k-pivot-setting" id="columns"></div>
        <div class="k-grid k-widget"><div class="k-grid-header"><div class="k-grid-header-wrap"></div></div><div class="k-grid-content"></div></div>
      </td>
    </tr></tbody></table>
  </div>`

describe('pivot row headers line up with the values (issues/137)', () => {
  beforeAll(() => {
    const { css } = sass.compile(join(root, 'src/scss/main.scss'), {
      quietDeps: true,
      loadPaths: [join(root, 'node_modules')],
      logger: sass.Logger.silent
    })
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    document.body.innerHTML = pivotHtml
  })

  const display = id => getComputedStyle(document.getElementById(id)).display
  const visibility = id => getComputedStyle(document.getElementById(id)).visibility

  it('keeps the rows bar in the layout while the pivot is not being configured', () => {
    document.documentElement.classList.remove('pivot-config-open')
    expect(display('rows')).not.toBe('none')
    expect(visibility('rows')).toBe('hidden')
    // the other chip bars still go away
    expect(display('measures')).toBe('none')
    expect(display('columns')).toBe('none')
  })

  it('shows every chip bar while configuring', () => {
    document.documentElement.classList.add('pivot-config-open')
    for (const id of ['rows', 'measures', 'columns']) {
      expect(display(id)).not.toBe('none')
      expect(visibility(id)).not.toBe('hidden')
    }
    document.documentElement.classList.remove('pivot-config-open')
  })
})
