// issues/160: the old invoice and quote previews (Invoice.vue, Quote.vue) drew the
// documents with an obsolete template in the browser. Nothing linked to them; the
// PDF button (PDF made by the API) is the only way to see a document.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/stores/main.js', () => ({ useMainStore: () => ({}) }))
import router from '@/router/index.js'
import { ROUTE_PERMISSIONS } from '@/domain/routeAccess.js'

const OLD = ['/invoice/:id/:type', '/pdf/:id/:type', '/quote/:id']

describe('no old document previews (issues/160)', () => {
  it('has no route to them', () => {
    const paths = router.getRoutes().map(r => r.path)
    for (const path of OLD) expect(paths).not.toContain(path)
  })

  it('has no access rule for them', () => {
    for (const path of OLD) expect(ROUTE_PERMISSIONS).not.toHaveProperty(path)
  })
})
