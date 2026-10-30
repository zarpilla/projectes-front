// 38. Guia per a sòcies (logística) — what only this chapter needs: the member's Inici (with
// «Tot el menú»), the Exporta menu and the selection bar as a member sees them. The rest of the
// chapter reuses the member screenshots of chapters 27–33.
// Data: anonymized logistics copy (projectes_v5_manual_logistica, MANUAL_DATA=logistica),
// seen on 06/10/2026, as the member «Mel Can Demo» (MANUAL_LOG_USER_ORDERS).
// Writes nothing: no star is clicked on Inici, the selection is undone without applying a state.
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

// the member's welcome modal about pending invoices names the real cooperative: close it
async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  await ok.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {})
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

test('38-guia-socies-logistica', async ({ page }) => {
  test.setTimeout(240_000)
  await start(page, '38-guia-socies-logistica', { today: '2026-10-06' })
  await login(page, ...logUser('orders'))
  await page.reload()
  await closeHello(page)

  // Inici, as it is (no star clicked)
  await page.goto('/inici')
  await page.getByText('Els meus accessos').waitFor()
  await settle(page, 1000)
  await closeHello(page)
  if (await page.getByText('La Diligència').count()) throw new Error('real cooperative name on screen')
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, 'inici-socia')

  // Comandes on Wednesday 07/10/2026, every status
  await page.goto('/comandes')
  await page.getByText('Comandes actives').waitFor()
  await settle(page, 600)
  await page.getByRole('button', { name: 'Dia anterior' }).click() // empty date: picks today
  await settle(page, 300)
  await page.getByRole('button', { name: 'Dia següent' }).click()
  await settle(page, 300)
  await page.locator('.status-tabs button', { hasText: 'Totes' }).click()
  await settle(page, 800)

  // the Exporta menu of a member
  await page.getByRole('button', { name: 'Exporta' }).first().click()
  await settle(page, 300)
  const menu = page.locator('.export-menu .dropdown-menu')
  const mb = await menu.boundingBox()
  await shot(page, 'exporta-socia', { clip: { x: mb.x - 160, y: mb.y - 56, width: mb.width + 168, height: mb.height + 64 } })
  await page.keyboard.press('Escape')
  await page.mouse.click(700, 60)
  await settle(page, 300)

  // two orders ticked: the selection bar with «Imprimeix albarans»
  for (const id of ['24876', '24886']) {
    await page.locator('tr.order-row', { hasText: id }).locator('.col-check label').click()
  }
  await settle(page, 300)
  const bar = page.locator('.selection-bar')
  await bar.scrollIntoViewIfNeeded()
  await settle(page, 200)
  const bb = await bar.boundingBox()
  await shot(page, 'seleccio-socia', { clip: { x: bb.x - 8, y: bb.y - 8, width: bb.width + 16, height: bb.height + 16 } })
  await bar.getByRole('button', { name: 'Desmarca' }).click()
})
