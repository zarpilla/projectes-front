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
  'user-festive', 'year', 'festive-type', 'route-rate', 'route-pickup-notice',
  // issues/159
  'pickup', 'delivery-type', 'city', 'product', 'document-type', 'vat-type', 'activity-type',
  // issues/310: the holidays for everyone
  'festive'
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

  // issues/139, issues/140
  it('lists «Tarifes de ruta» only to people with logistics', async () => {
    const { adminTableGroupsFor } = await import('@/service/adminTables')
    const entities = perms => adminTableGroupsFor(perms).flatMap(g => g.items.map(t => t.entity))
    expect(entities(['admin', 'projects'])).not.toContain('route-rate')
    expect(entities(['admin', 'orders_admin'])).toContain('route-rate')
    expect(entities(['admin'])).toContain('festive-type')
  })

  // issues/159: the tables that needed the Strapi admin
  it('lists the logistics tables only to people with logistics', async () => {
    const { adminTableGroupsFor } = await import('@/service/adminTables')
    const entities = perms => adminTableGroupsFor(perms).flatMap(g => g.items.map(t => t.entity))
    for (const name of ['pickup', 'delivery-type', 'city']) {
      expect(entities(['admin'])).not.toContain(name)
      expect(entities(['admin', 'orders_admin'])).toContain(name)
    }
    for (const name of ['product', 'document-type', 'vat-type', 'activity-type']) {
      expect(entities(['admin'])).toContain(name)
    }
  })

  it('redirect the old plural paths (bookmarks)', () => {
    for (const [old, now] of [['/admin/bank-accounts', '/admin/bank-account'], ['/admin/regions', '/admin/region']]) {
      const record = router.getRoutes().find(r => r.path === old)
      expect(record?.redirect, old).toBe(now)
    }
  })
})
