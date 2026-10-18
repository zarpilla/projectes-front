// 02. Usuaris, rols i permisos — the users list and a user's form (permissions, access),
// and the menu an hours-only person sees. Data: anonymized copy of resilience
// (projectes_v5_manual), seen on 17/06/2026. Read-only: nothing is saved. User 26 (Laia
// Serra) has several permissions; the hours-only menu is shown by hiding the other
// permissions in the browser (the app reads them from /users/me).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('02-usuaris-rols-permisos', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '02-usuaris-rols-permisos', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/admin/users')
  await settle(page, 1500)
  await shot(page, 'usuaries')

  await page.goto('#/admin/users/26')
  await page.getByText('Permisos').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'usuaria')
  await page.locator('h2', { hasText: 'Accés' }).evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -60) })
  await settle(page, 400)
  await shot(page, 'usuaria-acces')

  // what an hours-only person sees: the same session, answered as if it only had «hours»
  await page.route(/\/api\/users\/me(\?|$)/, async route => {
    const res = await route.fetch()
    const body = await res.json()
    body.permissions = (body.permissions || []).filter(p => p.permission === 'hours')
    await route.fulfill({ response: res, json: body })
  })
  await page.goto('#/dedicacio')
  await page.reload()
  await settle(page, 2000)
  await shot(page, 'menu-hores')
})
