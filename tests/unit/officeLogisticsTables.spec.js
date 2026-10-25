// issues/159: the logistics office (orders_admin without admin) keeps the
// pickup points, delivery types, towns and route rates itself: it opens those
// four tables of Taules auxiliars, and only those, from «Rutes i punts».
import { describe, it, expect } from 'vitest'
import { canOpen, canOpenPath } from '@/domain/routeAccess'
import { adminTableGroupsFor } from '@/service/adminTables'
import menu, { hasMenuPermission } from '@/service/menu'

const record = path => [{ path, meta: { requiresPermission: 'admin' } }]
const OFFICE = ['orders_admin']

describe('Taules de logística for the office (issues/159)', () => {
  it('opens the logistics tables, not the others', () => {
    for (const entityName of ['pickup', 'delivery-type', 'city', 'route-rate', 'route-pickup-notice']) {
      expect(canOpen(record('/administracio/:entityName'), OFFICE, { entityName })).toBe(true)
      expect(canOpen(record('/administracio/:entityName/:id'), OFFICE, { entityName, id: '3' })).toBe(true)
      expect(canOpenPath(`/administracio/${entityName}`, OFFICE)).toBe(true)
    }
    expect(canOpen(record('/administracio/:entityName'), OFFICE, { entityName: 'product' })).toBe(false)
    expect(canOpen(record('/administracio/:entityName'), ['orders'], { entityName: 'pickup' })).toBe(false)
    expect(canOpen(record('/administracio/usuaries'), OFFICE)).toBe(false)
    expect(canOpenPath('/administracio/series', OFFICE)).toBe(false)
    expect(canOpen(record('/administracio/:entityName'), ['admin'], { entityName: 'product' })).toBe(true)
  })

  it('shows her only the Logística group', () => {
    const groups = adminTableGroupsFor(OFFICE)
    expect(groups.map(g => g.title)).toEqual(['Logística'])
    expect(groups[0].items.map(t => t.entity)).toEqual(['pickup', 'delivery-type', 'city', 'route-rate', 'route-pickup-notice'])
    expect(adminTableGroupsFor(['orders'])).toEqual([])
    expect(adminTableGroupsFor(['admin']).map(g => g.title)).not.toContain('Logística')
  })

  it('puts «Taules de logística» in her menu, not in an admin\'s', () => {
    const entry = menu.flat().find(i => i && i.label === 'Taules de logística')
    expect(entry.to).toBe('/administracio/punts-recollida')
    expect(hasMenuPermission(entry, OFFICE)).toBe(true)
    expect(hasMenuPermission(entry, ['orders_admin', 'admin'])).toBe(false)
  })
})
