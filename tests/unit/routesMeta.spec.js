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

// issues/084: the admin template's demo pages were still reachable
describe('template leftovers (issues/084)', () => {
  it('has no demo routes, and old client links open the contact', () => {
    const paths = router.getRoutes().map(r => r.path)
    expect(paths).not.toContain('/tables')
    expect(paths).not.toContain('/forms')
    expect(paths).not.toContain('/client/new')
    expect(router.resolve('/client/5').fullPath).toBe('/client/5')
    const client = router.getRoutes().find(r => r.path === '/client/:id')
    expect(client.redirect({ params: { id: '5' } })).toBe('/contact/5')
    expect(router.getRoutes().find(r => r.name === 'profile').meta.title).toBe('El meu compte')
  })
})

describe('Pressupostos «Estat» sort (issues/085)', () => {
  it('sorts a quote with only an acceptance date as accepted', () => {
    const sort = QuotesTable.methods.sortByAcceptance
    const rows = [{ id: 1, accepted: false }, { id: 2, accepted: false, accepted_date: '2026-01-01' }, { id: 3, accepted: true }]
    expect([...rows].sort((a, b) => sort(a, b, false)).map(r => r.id)).toEqual([2, 3, 1])
  })
})

// issues/114: «Panell Despeses» read the phase lines from the project list, which
// Strapi 5 no longer includes, so it was always empty. Ingressos i despeses shows
// the same figures.
describe('old Panell Despeses (issues/114)', () => {
  it('opens Ingressos i despeses', () => {
    const old = router.getRoutes().find(r => r.path === '/stats-despeses')
    expect(old.redirect).toBe('/stats-economic-detail')
    expect(router.resolve('/stats-economic-detail').name).toBeTruthy()
  })
})
