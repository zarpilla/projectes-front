// Found while writing the manual (2026-10): «Projectes mare» (and «Projectes»
// with Estat «Tots») show the «Estat» and «Modificat» columns, and at 1440px
// the table was ~130px wider than the card: «Estat» was cut off on the right.
// A long scope tag («Entitats, cooperatives i empreses») and the name and hours
// columns took the room. jsdom has no layout, so this checks the scoped styles
// that make it fit (measured in the browser: 1126px of table in a 1126px card).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ProjectsTable.vue'), 'utf8')
const css = source.match(/<style scoped>([\s\S]*?)<\/style>/)[1]
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`))
  return m ? m[1] : ''
}
const rem = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([\\d.]+)rem`))
  return m ? Number(m[1]) : Infinity
}

describe('projects table width', () => {
  it('lets a long scope tag wrap', () => {
    expect(source).toMatch(/project_scope" class="tag scope-tag"/)
    expect(rule('.scope-tag')).toMatch(/white-space:\s*normal/)
    expect(rem(rule('.scope-tag'), 'max-width')).toBeLessThanOrEqual(9)
  })

  it('keeps the name and hours columns narrow enough for «Estat» and «Modificat»', () => {
    expect(rem(rule('.project-name'), 'max-width')).toBeLessThanOrEqual(18)
    expect(rem(rule(':deep(.hours-cell)'), 'min-width')).toBeLessThanOrEqual(10)
  })
})
