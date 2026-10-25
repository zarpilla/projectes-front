// issues/343: the app's URLs are in Catalan. The old English and mixed ones come
// from printed order QR labels, e-mails (tasks, incidences, password reset),
// bookmarks and the pins saved on each user: they must land on the same page.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/stores/main.js', () => ({ useMainStore: () => ({}) }))
import router from '@/router/index.js'
import { currentPath, RENAMED_PAGES, ENTITY_SLUGS, entitySlug, slugEntity } from '@/router/paths'
import { parsePrefs } from '@/domain/home'
import { canOpenPath, routePermissions } from '@/domain/routeAccess'
import { redirectedTo } from './helpers/redirectedTo'

describe('currentPath', () => {
  it('renames old pages, keeping ids, query and hash', () => {
    expect(currentPath('/order/view/15397')).toBe('/comanda/veure/15397')
    expect(currentPath('/order/15?pickup_point=true')).toBe('/comanda/15?pickup_point=true')
    expect(currentPath('/orders')).toBe('/comandes')
    expect(currentPath('/orders-invoice')).toBe('/comandes-per-facturar')
    expect(currentPath('/tasks?task=12')).toBe('/tasques?task=12')
    expect(currentPath('/incidences?id=4')).toBe('/incidencies?id=4')
    expect(currentPath('/reset-password?code=abc')).toBe('/canviar-clau?code=abc')
    expect(currentPath('/project/7?tab=pressupost#x')).toBe('/projecte/7?tab=pressupost#x')
    expect(currentPath('/client/5')).toBe('/contacte/5')
    expect(currentPath('/contact-us')).toBe('/contacta')
    expect(currentPath('/contact-user/3')).toBe('/punt-entrega/3')
  })

  it('renames the administration screens and tables', () => {
    expect(currentPath('/administracio/me')).toBe('/administracio/configuracio')
    expect(currentPath('/administracio/users/new')).toBe('/administracio/usuaries/nou')
    expect(currentPath('/administracio/users/4')).toBe('/administracio/usuaries/4')
    expect(currentPath('/administracio/bank-account/new')).toBe('/administracio/comptes-bancaris/nou')
    expect(currentPath('/administracio/festive/12')).toBe('/administracio/festius/12')
    expect(currentPath('/administracio/bank-accounts')).toBe('/administracio/comptes-bancaris')
  })

  it('leaves today\'s URLs alone', () => {
    for (const url of ['/inici', '/projectes', '/dedicacio', '/tresoreria', '/comandes', '/contactes',
      '/administracio/regions', '/administracio/logos', '/administracio/verifactu', '/energia/socies']) {
      expect(currentPath(url)).toBe(url)
    }
  })

  it('gives every new page a route', () => {
    for (const now of new Set(Object.values(RENAMED_PAGES))) {
      const probe = ['/projecte', '/contacte', '/comanda', '/comanda/veure', '/punt-entrega'].includes(now) ? now + '/1' : now
      expect(router.resolve(probe).matched.length, now).toBeGreaterThan(0)
      expect(router.resolve(probe).matched[0].redirect, now).toBeFalsy()
    }
  })

  it('has one segment per table, both ways', () => {
    const slugs = Object.values(ENTITY_SLUGS)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const entity of Object.keys(ENTITY_SLUGS)) expect(slugEntity(entitySlug(entity))).toBe(entity)
    expect(slugEntity('some-new-entity')).toBe('some-new-entity')
  })
})

describe('router', () => {
  it('redirects the old URLs', () => {
    expect(redirectedTo(router, '/order/view/15397')).toBe('/comanda/veure/15397')
    expect(redirectedTo(router, '/tasks?task=12')).toBe('/tasques?task=12')
    expect(redirectedTo(router, '/emitted-invoices')).toBe('/factures-emeses')
    expect(redirectedTo(router, '/document/3/invoice')).toBe('/document/3/invoice')
    expect(redirectedTo(router, '/administracio/route-rate')).toBe('/administracio/tarifes-ruta')
    expect(redirectedTo(router, '/administracio/route-rate/new')).toBe('/administracio/tarifes-ruta/nou')
  })

  it('opens a table by its Catalan segment and hands the views the API name', () => {
    const route = router.resolve('/administracio/tarifes-ruta/3')
    expect(route.name).toBe('admin.entity.edit')
    expect(route.matched[0].props.default(route)).toEqual({ entityName: 'route-rate', id: '3' })
    const created = router.resolve('/administracio/comptes-bancaris/nou')
    expect(created.name).toBe('admin.entity.new')
    expect(created.matched[0].props.default(created)).toEqual({ entityName: 'bank-account' })
  })

  it('keeps the office tables open to the office', () => {
    const route = router.resolve('/administracio/poblacions')
    expect(routePermissions(route.matched[0], route.params)).toContain('orders_admin')
    expect(canOpenPath('/administracio/poblacions', ['orders_admin'])).toBe(true)
    expect(canOpenPath('/administracio/series', ['orders_admin'])).toBe(false)
  })
})

describe('Inici pins saved with the old URLs', () => {
  it('come back with today\'s', () => {
    expect(parsePrefs({ pins: ['/tasks', '/emitted-invoices', '/vat', '/iva'], landing: 'first' }))
      .toEqual({ pins: ['/tasques', '/factures-emeses', '/iva'], landing: 'first' })
  })
})

describe('order QR labels', () => {
  it('scan both the new and the old printed URLs', async () => {
    const { default: QRScannerModal } = await import('@/components/QRScannerModal.vue')
    const extract = QRScannerModal.methods.extractOrderId
    expect(extract('https://diligencia.esstrapis.org/comanda/veure/15397')).toBe(15397)
    expect(extract('https://diligencia.esstrapis.org/comanda/15')).toBe(15)
    expect(extract('https://diligencia.esstrapis.org/stats/order/view/15397')).toBe(15397)
    expect(extract('https://diligencia.esstrapis.org/stats/#/order/15397')).toBe(15397)
  })
})
