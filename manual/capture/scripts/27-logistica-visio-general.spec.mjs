// 27. Visió general de la logística — the logistics part of the side menu for each of the three
// profiles: provider (orders), office (orders_admin) and driver (orders_delivery).
// Data: anonymized logistics copy (projectes_v5_manual_logistica, MANUAL_DATA=logistica),
// seen on 06/10/2026. Writes nothing.
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

// the provider's welcome modal about pending invoices names the real cooperative: close it
async function closeHello (page) {
  const ok = page.getByRole('button', { name: "D'acord" })
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

// from the «Logística» header to the end of the logistics blocks of the menu
async function menuShot (page, name) {
  await page.goto('/comandes')
  await page.getByText('Comandes actives').waitFor()
  await settle(page, 800)
  await closeHello(page)
  const aside = page.locator('aside')
  const box = await aside.boundingBox()
  const top = await aside.locator('.menu-label', { hasText: /^\s*Logística\s*$/i }).boundingBox()
  const labels = aside.locator('.menu-label')
  let bottom = 0
  for (const t of ['Estadístiques', 'Rutes i punts']) {
    const l = labels.filter({ hasText: new RegExp(`^\\s*${t}\\s*$`, 'i') })
    if (await l.count()) {
      const list = l.locator('xpath=following-sibling::ul[1]')
      const b = await list.boundingBox()
      bottom = Math.max(bottom, b.y + b.height)
    }
  }
  await shot(page, name, { clip: { x: box.x, y: top.y - 12, width: box.width, height: bottom - top.y + 24 } })
}

async function switchUser (page, profile) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto('/')
  await page.reload()
  await login(page, ...logUser(profile))
  await closeHello(page)
}

test('27-logistica-visio-general', async ({ page }) => {
  test.setTimeout(180_000)
  await start(page, '27-logistica-visio-general', { today: '2026-10-06' })
  await page.setViewportSize({ width: 1440, height: 1500 })
  await login(page, ...logUser('orders'))
  await closeHello(page)
  await menuShot(page, 'menu-socia')
  await switchUser(page, 'admin')
  await menuShot(page, 'menu-oficina')
  await switchUser(page, 'delivery')
  await menuShot(page, 'menu-repartidora')
})
