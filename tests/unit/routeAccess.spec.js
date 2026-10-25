// issues/121: the menu hid the pages a user can't use, but the router only
// checked /administracio/*: a member (orders), a driver or an hours-only user opened
// Tresoreria, Bestretes, Persones or Facturar by URL or through links.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { routePermissions, canOpen, landingPath, canPickPerson, ROUTE_PERMISSIONS, OPEN_ROUTES } from '@/domain/routeAccess'
import menuList from '@/service/menu'

const rec = path => [{ path, meta: {} }]

describe('route access (issues/121)', () => {
  it('keeps a member, a driver and an hours-only user out of the staff pages', () => {
    for (const path of ['/tresoreria', '/bestretes', '/jornada', '/factures-emeses', '/panell-projectes', '/contactes', '/tasques', '/previsio-facturacio', '/projecte/:id']) {
      expect(canOpen(rec(path), ['orders'])).toBe(false)
      expect(canOpen(rec(path), ['orders_delivery', 'hours'])).toBe(false)
      expect(canOpen(rec(path), ['hours'])).toBe(false)
      expect(canOpen(rec(path), ['projects', 'hours'])).toBe(true)
    }
    expect(canOpen(rec('/comandes-per-facturar'), ['orders'])).toBe(false)
    expect(canOpen(rec('/comandes-per-facturar'), ['orders_admin'])).toBe(true)
    expect(canOpen(rec('/usuaries'), ['orders_delivery'])).toBe(false)
    expect(canOpen(rec('/operacions'), ['orders_delivery'])).toBe(true)
    expect(canOpen(rec('/dedicacio'), ['hours'])).toBe(true)
    expect(canOpen(rec('/panell-dedicacio'), ['hours'])).toBe(true)
    expect(canOpen(rec('/contacte/:id'), ['orders'])).toBe(true)
  })

  it('opens the profile and the changelog to everybody, and admin pages to admins only', () => {
    expect(canOpen(rec('/el-meu-compte'), [])).toBe(true)
    expect(canOpen(rec('/novetats'), ['orders'])).toBe(true)
    expect(canOpen([{ path: '/administracio/usuaries', meta: { requiresPermission: 'admin' } }], ['projects'])).toBe(false)
    expect(routePermissions({ path: '/administracio/:entityName', meta: {} })).toEqual(['admin'])
  })

  it('agrees with the side menu', () => {
    const items = menuList.flatMap(group => (Array.isArray(group) ? group : []))
    for (const item of items) {
      // the changelog is in the projects menu but open to all (the profile links it)
      if (!item || !item.to || !item.permission || OPEN_ROUTES.includes(item.to)) continue
      const needed = routePermissions({ path: item.to, meta: {} })
      const menu = Array.isArray(item.permission) ? item.permission : [item.permission]
      expect({ to: item.to, needed: [...(needed || [])].sort() }).toEqual({ to: item.to, needed: [...menu].sort() })
    }
  })

  it('classifies every page of the router', () => {
    const src = fs.readFileSync('src/router/index.js', 'utf8')
    const paths = [...new Set([...src.matchAll(/path: "([^"]+)"/g)].map(m => m[1]))]
      .filter(p => !['/', '/recuperar-clau'].includes(p) && !p.startsWith('/administracio'))
    const unclassified = paths.filter(p => !ROUTE_PERMISSIONS[p] && !OPEN_ROUTES.includes(p))
    expect(unclassified).toEqual([])
  })

  it('lands each user on a page she can open', () => {
    expect(landingPath(['projects', 'hours'])).toBe('/projectes')
    expect(landingPath(['orders'])).toBe('/comandes')
    expect(landingPath(['orders_delivery', 'hours'])).toBe('/dedicacio')
    expect(landingPath(['orders_admin'])).toBe('/comandes')
    expect(landingPath([])).toBe('/el-meu-compte')
    for (const perms of [['orders'], ['hours'], ['orders_delivery', 'hours'], ['orders_admin'], []]) {
      expect(canOpen(rec(landingPath(perms)), perms)).toBe(true)
    }
  })
})

describe('router guard (issues/121)', () => {
  const login = permissions => {
    localStorage.setItem('jwt', 'x')
    localStorage.setItem('user', JSON.stringify({ id: 1, permissions: permissions.map(permission => ({ permission })) }))
  }
  it('sends a user to her landing page when the page is not hers', async () => {
    const { default: router } = await import('@/router/index.js')
    login(['orders'])
    await router.push('/tresoreria')
    expect(router.currentRoute.value.path).toBe('/comandes')
    login(['hours'])
    await router.push('/bestretes')
    expect(router.currentRoute.value.path).toBe('/dedicacio')
    login(['projects', 'hours'])
    await router.push('/tresoreria')
    expect(router.currentRoute.value.path).toBe('/tresoreria')
  // each push loads the real (large) views: past 5 s when the whole suite runs at once
  }, 30000)
})

describe('changelog links (issues/121)', () => {
  it('open only for the permissions of their page', async () => {
    const { canOpenPath } = await import('@/domain/routeAccess')
    expect(canOpenPath('/previsio-facturacio', ['orders'])).toBe(false)
    expect(canOpenPath('/previsio-facturacio', ['projects'])).toBe(true)
    expect(canOpenPath('/projecte/555?tab=resum', ['hours'])).toBe(false)
    expect(canOpenPath('/comandes', ['orders'])).toBe(true)
    expect(canOpenPath('/el-meu-compte', ['orders'])).toBe(true)
    expect(canOpenPath('/administracio/usuaries', ['projects'])).toBe(false)
    expect(canOpenPath('/tresoreria', null)).toBe(true)
  })

  it('shows the «Persona» picker of the hours screens to projects and admin only (issues/099)', () => {
    expect(canPickPerson(['hours'])).toBe(false)
    expect(canPickPerson(['hours', 'orders_admin'])).toBe(false)
    expect(canPickPerson(['hours', 'projects'])).toBe(true)
    expect(canPickPerson(['admin'])).toBe(true)
    expect(canPickPerson(null)).toBe(true)
  })
})

describe('comunitat energètica (admin_energy, 2026-10-25)', () => {
  const rec = path => [{ path, meta: {} }]
  it('opens the energy pages to admin_energy only, and lands there', () => {
    for (const path of ['/energia/socies', '/energia/socia/:id', '/energia/installacions']) {
      expect(canOpen(rec(path), ['admin_energy'])).toBe(true)
      expect(canOpen(rec(path), ['projects'])).toBe(false)
      expect(canOpen(rec(path), ['orders_admin'])).toBe(false)
    }
    expect(canOpen(rec('/contactes'), ['admin_energy'])).toBe(false)
    expect(landingPath(['admin_energy'])).toBe('/energia/socies')
    expect(landingPath(['projects', 'admin_energy'])).toBe('/projectes')
  })
})
