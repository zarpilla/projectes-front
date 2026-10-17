// issues/085: most routes declared `meta` twice ({ title } and then
// { requiresAuth }); the second key won, so pages outside the menu (a quote,
// an invoice…) lost their tab title.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/stores/main.js', () => ({ useMainStore: () => ({}) }))
import router from '@/router/index.js'
import QuotesTable from '@/components/QuotesTable.vue'

describe('route meta (issues/085)', () => {
  it('keeps both the title and the auth requirement', () => {
    const quote = router.getRoutes().find(r => r.name === 'quote.view')
    expect(quote.meta).toMatchObject({ title: 'Pressupost', requiresAuth: true })
  })

  it('declares meta once per route', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/router/index.js'), 'utf8')
    const routes = source.split(/\n {2}\{\n/).slice(1)
    for (const route of routes) {
      expect((('\n' + route).match(/\n {4}meta: \{/g) || []).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('Pressupostos «Estat» sort (issues/085)', () => {
  it('sorts a quote with only an acceptance date as accepted', () => {
    const sort = QuotesTable.methods.sortByAcceptance
    const rows = [{ id: 1, accepted: false }, { id: 2, accepted: false, accepted_date: '2026-01-01' }, { id: 3, accepted: true }]
    expect([...rows].sort((a, b) => sort(a, b, false)).map(r => r.id)).toEqual([2, 3, 1])
  })
})
