// The logistics menu has one entry per screen; an entry shows when the person
// has any of its permissions (a member, the office, the drivers, or several).
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))

import menu, { hasMenuPermission } from '@/service/menu'

const visible = perms => {
  const out = []
  menu.forEach((element, i) => {
    if (typeof element === 'string') return
    const items = element.filter(item => hasMenuPermission(item, perms))
    if (items.length) out.push([menu[i - 1], items.map(item => item.label)])
  })
  return out
}
const section = (perms, name) => (visible(perms).find(([title]) => title === name) || [null, []])[1]

describe('menu permissions', () => {
  it('takes one permission or a list', () => {
    expect(hasMenuPermission({ label: 'x' }, [])).toBe(true)
    expect(hasMenuPermission({ permission: 'admin' }, ['projects'])).toBe(false)
    expect(hasMenuPermission({ permission: ['orders', 'orders_admin'] }, ['orders_admin'])).toBe(true)
    expect(hasMenuPermission({ permission: ['orders', 'orders_admin'] }, ['hours'])).toBe(false)
  })

  it('shows each logistics screen once to someone with several roles', () => {
    const labels = visible(['orders', 'orders_admin', 'orders_delivery']).flatMap(([, items]) => items)
    expect(labels.filter(l => l === 'Comandes')).toHaveLength(1)
    expect(labels.filter(l => l === 'Dipòsits')).toHaveLength(1)
  })

  it('gives each role its screens', () => {
    expect(section(['orders'], 'Logística')).toEqual(['Comandes', 'Dipòsits', 'Incidències', 'Factures', 'Contacta'])
    expect(section(['orders_delivery'], 'Logística')).toEqual(['Comandes', 'Dipòsits', 'Incidències', 'Transferències', 'Operacions'])
    expect(section(['orders_delivery'], 'Rutes i punts')).toEqual(["Punts d'entrega"])
    expect(section(['orders_admin'], 'Logística')).toEqual(['Comandes', 'Dipòsits', 'Incidències', 'Transferències', 'Operacions', 'Facturar'])
    expect(section(['orders_admin'], 'Estadístiques')).toEqual(['Taula Comandes', 'Taula Incidències'])
    expect(section(['projects'], 'Logística')).toEqual([])
  })
})
