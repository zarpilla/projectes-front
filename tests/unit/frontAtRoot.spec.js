// issues/342: the app moved from /stats/ to the root of the site. The site's nginx sends
// Strapi's paths to the API and everything else to the app, so no route of the
// app may start with one of them (the app's own administration moved from
// /admin to /administracio for that), and the app's nginx redirects the old
// /stats/… addresses.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
vi.mock('@/stores/main.js', () => ({ useMainStore: () => ({}) }))
import router from '@/router/index.js'
import { legacyHashTarget } from '@/router/legacyHash'

// Keep in step with the site nginx (projectes-v5 deploy/docker/create-tenant.sh)
const STRAPI_PATHS = ['admin', 'api', 'uploads', 'content-manager', 'content-type-builder',
  'upload', 'i18n', 'users-permissions', 'email', '_health']

describe('app served at the root of the site', () => {
  it('has no route under a path the site sends to Strapi', () => {
    for (const route of router.getRoutes()) {
      const first = route.path.split('/')[1]
      expect(STRAPI_PATHS, route.path).not.toContain(first)
    }
  })

  it('serves its administration screens under /administracio', () => {
    const paths = router.getRoutes().map(r => r.path)
    expect(paths).toContain('/administracio/configuracio')
    expect(paths).toContain('/administracio/:entityName')
  })

  it('turns old hash links into paths under the root', () => {
    expect(legacyHashTarget({ hash: '#/order/view/15397' }, '/')).toBe('/comanda/veure/15397')
    expect(legacyHashTarget({ hash: '#/tasks?task=12' }, '/')).toBe('/tasques?task=12')
  })

  it('redirects the old /stats/ addresses without swallowing /stats-… routes', () => {
    const conf = fs.readFileSync(path.resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    expect(conf).toContain('location ^~ /stats/ {')
    expect(conf).toMatch(/rewrite \^\/stats\/admin\(\/\.\*\)\?\$ \/administracio\$1 permanent;/)
    expect(conf).toMatch(/rewrite \^\/stats\/\(\.\*\)\$ \/\$1 permanent;/)
    // a prefix "/stats" without the slash would also catch /stats-projectes
    expect(conf).not.toMatch(/location (\^~ )?\/stats \{/)
    // the old service worker must get the kill switch, not a redirect
    expect(conf).toContain('location = /stats/service-worker.js {')
  })
})
