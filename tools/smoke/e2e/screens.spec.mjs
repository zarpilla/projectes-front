// Every screen loads: each route of src/router/index.js is opened by a logged-in user
// with every app permission, and must show without uncaught errors (checked after each
// test by useE2E), without the backend answering 5xx, and without an error toast.
//
// Routes with :params are opened on a "new" record (id 0) and on records this spec
// creates through the API. Read-only otherwise: nothing is saved from the screens.
// The flows that save are in the other specs.

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { useE2E, onCleanup, page, state, api, NAME, STAMP, visit, contactWithNif } from './helpers.mjs'

useE2E({ serial: false })

const here = path.dirname(fileURLToPath(import.meta.url))
const routerSource = fs.readFileSync(path.join(here, '../../../src/router/index.js'), 'utf8')
const declared = [...new Set([...routerSource.matchAll(/^\s*path:\s*["'`]([^"'`]+)["'`]/gm)].map(m => m[1]))]

// guest-only screens; and the admin entity screens, which admin.spec.mjs opens one by one
const SKIP = new Set(['/', '/forgotten-password', '/reset-password', '/admin/:entityName'])

// routes with params, as concrete paths; `s` is `state` once the setup test has run
const WITH_PARAMS = {
  '/project/:id': s => ['/project/0', `/project/${s.projectId}`],
  '/document/:id/:type': () => ['emitted-invoices', 'received-invoices', 'received-expenses', 'received-incomes', 'quotes'].map(t => `/document/0/${t}`),
  '/client/:id': s => [`/client/${s.contact.id}`],
  '/contact/:id': s => ['/contact/0', `/contact/${s.contact.id}`],
  '/contact-user/:id': () => ['/contact-user/0'],
  '/order/:id': () => ['/order/0'],
  // records the other specs leave behind (orders.spec.mjs, money.spec.mjs): skipped when there are none
  '/order/view/:id': s => s.orderId ? [`/order/view/${s.orderId}`] : [],
  '/invoice/:id/:type': s => s.invoiceId ? [`/invoice/${s.invoiceId}/emitted-invoices`] : [],
  '/pdf/:id/:type': s => s.invoiceId ? [`/pdf/${s.invoiceId}/emitted-invoices`] : [],
  // not linked from the menus, but still routed
  '/quote/:id': s => s.quoteId ? [`/quote/${s.quoteId}`] : [],
  '/admin/users/:id': s => [`/admin/users/${s.me.id}`],
  '/admin/:entityName/new': () => ['/admin/contact-type/new'],
  '/admin/:entityName/:id': s => [`/admin/contact-type/${s.contactTypeId}`]
}
// need a VeriFactu or FACe submission, which the e2e database never makes
const NOT_HERE = new Set(['/admin/face-queue/:id', '/admin/verifactu-chain/:id'])

const routes = declared.filter(r => !SKIP.has(r) && !NOT_HERE.has(r))
for (const r of routes) if (r.includes(':') && !WITH_PARAMS[r]) throw new Error(`screens.spec.mjs: no concrete path for ${r}`)

const failures = []
function watchResponses () {
  page.on('response', res => {
    if (res.status() >= 500 && /\/api\//.test(res.url())) failures.push(`${res.request().method()} ${res.url().replace(/^https?:\/\/[^/]+/, '')} → ${res.status()}`)
  })
}

// once per session (a failed test starts a new one)
test.beforeAll(async () => {
  watchResponses()
  // the LOGÍSTICA screens need the "orders" permission
  const permissions = new Set((state.me.permissions || []).map(p => p.permission))
  if (!permissions.has('orders')) {
    await api('PUT', `users/${state.me.id}`, { permissions: [...permissions, 'orders'].map(permission => ({ permission })) })
  }
  if (!state.projectId) {
    const project = await api('POST', 'projects', { data: { name: `${NAME} pantalles` } })
    state.projectId = project.id
    onCleanup(() => api('DELETE', `projects/${state.projectId}`))
  }
  state.contact = await contactWithNif('pantalles')
  // "Factures" of the LOGÍSTICA menu lists the invoices of the user's member contact
  const [member] = await api('GET', `contacts?_where[users_permissions_user]=${state.me.id}&_limit=1`)
  if (!member) await api('POST', 'contacts', { data: { name: `${NAME} sòcia`, nif: `E2ES${STAMP}`, users_permissions_user: state.me.id } })
  state.orderId = (await api('GET', 'orders?_sort=id:DESC&_limit=1'))[0]?.id
  state.invoiceId = (await api('GET', 'emitted-invoices?_sort=id:DESC&_limit=1'))[0]?.id
  state.quoteId = (await api('GET', 'quotes?_sort=id:DESC&_limit=1'))[0]?.id
  const [contactType] = await api('GET', 'contact-types?_limit=1')
  state.contactTypeId = contactType?.id
})

for (const route of routes) {
  test(`screen ${route}`, async () => {
    const paths = route.includes(':') ? WITH_PARAMS[route](state) : [route]
    test.skip(!paths.length, 'no such record in this database')
    for (const to of paths) {
      failures.length = 0
      await visit(to)
      await expect(page, `${to} sends a logged-in user back to the login`).not.toHaveURL(/\/(#\/?)?$/)
      const toast = page.locator('.toast.is-danger, .snackbar, .notification.is-danger').filter({ hasText: /error/i })
      const shown = await toast.count() ? (await toast.first().innerText()).trim() : null
      expect.soft(shown, `${to} shows an error`).toBeNull()
      expect.soft(failures, `${to}: backend errors`).toEqual([])
      await page.locator('.toast, .snackbar').evaluateAll(ts => ts.forEach(t => t.remove()))
    }
  })
}
