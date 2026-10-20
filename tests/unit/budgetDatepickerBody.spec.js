// The budget lines sit in a horizontally scrolling table (overflow-x: auto),
// which cut off the calendar of the last lines (reported by the user on
// 2026-10-20 while testing issues/055): the pickers open on the body.
import { describe, it, expect } from 'vitest'
import source from '@/components/ProjectPhases.vue?raw'

describe('budget line datepickers', () => {
  it('open their calendar on the body', () => {
    const tags = source.match(/<lazy-datepicker[\s\S]*?>/g) || []
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) expect(tag).toMatch(/\bappend-to-body\b/)
  })
})
