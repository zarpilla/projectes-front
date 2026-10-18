// issues/026 — "Comptes bancaris" and "Regions" in ADMINISTRACIÓ failed with
// "Error carregant dades: Cannot read properties of undefined (reading 'apiPath')":
// the menu kept the Strapi 3 names (bank-accounts, regions) and the v5 backend's
// entity-metadata only knows the singular ones. Every generic admin link must
// name an entity the backend serves; the old plural paths redirect.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))

import menu from '@/service/menu'
import router from '@/router'
import { ADMIN_TABLES } from '@/service/adminTables'

// projectes-v5 src/api/entity-metadata/controllers/entity-metadata.js ADMIN_ENTITIES
const BACKEND_ENTITIES = [
  'bank-account', 'contact-type', 'dedication-type', 'expense-type', 'income-type',
  'legal-form', 'payment-method', 'project-likelihood', 'project-state', 'project-type',
  'region', 'project-scope', 'sector', 'serie', 'social-entity', 'strategy', 'task-state',
  'user-festive', 'year', 'festive-type'
]

// the menu's admin links plus the auxiliary tables listed on "Taules auxiliars"
const links = [
  ...menu.flat().filter(item => item && typeof item === 'object' && item.to && item.to.startsWith('/admin/')),
  ...ADMIN_TABLES.map(t => ({ to: `/admin/${t.entity}` }))
]

describe('admin menu links', () => {
  it('only name entities the backend serves', () => {
    const generic = links
      .map(item => router.resolve(item.to))
      .filter(route => route.params.entityName)
      .map(route => route.params.entityName)
    expect(generic.length).toBeGreaterThan(10)
    expect(generic.filter(name => !BACKEND_ENTITIES.includes(name))).toEqual([])
  })

  it('"Taules auxiliars" lists every entity the backend serves', () => {
    expect(ADMIN_TABLES.map(t => t.entity).sort()).toEqual([...BACKEND_ENTITIES].sort())
  })

  it('redirect the old plural paths (bookmarks)', () => {
    for (const [old, now] of [['/admin/bank-accounts', '/admin/bank-account'], ['/admin/regions', '/admin/region']]) {
      const record = router.getRoutes().find(r => r.path === old)
      expect(record?.redirect, old).toBe(now)
    }
  })
})
