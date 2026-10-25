// 18. Facturació electrònica: Verifactu i FACe — the configuration page (mode, software
// information), the Verifactu register, the FACe queue, the responsible declaration and the
// status card on an issued invoice. Data: anonymized copy of resilience (projectes_v5_manual),
// seen on 17/06/2026. Verifactu and FACe are off in the copy (no certificates). Read-only.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('18-verifactu-face', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '18-verifactu-face', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/administracio/verifactu')
  await page.getByText("Enviament a l'AEAT").waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'configuracio')

  await page.goto('#/administracio/cadena-verifactu')
  await settle(page, 1500)
  await shot(page, 'registre')

  await page.goto('#/administracio/cua-face')
  await settle(page, 1500)
  await shot(page, 'cua-face')

  await page.goto('#/verifactu')
  await settle(page, 1500)
  await shot(page, 'declaracio')

  // the status card on an issued invoice (835 = 2025-102)
  await page.goto('#/document/835/emitted-invoices')
  await page.getByText('Factura emesa:').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await page.locator('.card-header-title', { hasText: 'Verifactu i FACe' }).first().evaluate(el => {
    el.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -20)
  })
  await settle(page, 400)
  await shot(page, 'factura-estat')
})
