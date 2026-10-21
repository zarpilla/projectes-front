// Inline edit of the projects table: the calendar of a date opened inside the
// table showed the selected day green on green. The rule that makes table
// links bold and green also caught the calendar days (they are <a> cells) and
// beat Buefy's white text of the selected day. jsdom applies no SCSS, so this
// checks the rule leaves the datepicker cells out.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const scss = fs.readFileSync(path.resolve(process.cwd(), 'src/scss/_redesign.scss'), 'utf8')

describe('table link style', () => {
  it('does not paint the days of a datepicker opened in a table', () => {
    const selectors = scss.match(/^\.table t[dh] a:not\(\.button\)[^,{]*/gm)
    expect(selectors).toHaveLength(4)
    for (const s of selectors) expect(s).toContain(':not(.datepicker-cell)')
  })
})
