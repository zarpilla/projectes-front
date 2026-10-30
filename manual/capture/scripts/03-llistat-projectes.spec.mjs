// 03. Llistat de projectes — the list, its filters, sorting, totals and the quick edit.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// the quick-edit row is opened but never saved (the script leaves the page).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('03-llistat-projectes', async ({ page }) => {
  await start(page, '03-llistat-projectes', { today: '2026-06-17' })
  await login(page)
  await page.goto('/projectes')
  await page.getByText('projectes · actiu').waitFor()
  await settle(page)
  await shot(page, 'llistat')

  // the filter bar
  const filters = page.locator('form.filter-bar')
  await shot(page, 'filtres', { clip: await filters.boundingBox().then(b => ({ x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 })) })

  // all states, one scope, a word: the Estat column appears
  await filters.locator('label', { hasText: 'Estat' }).locator('select').selectOption({ label: 'Tots' })
  await settle(page)
  await filters.getByRole('button', { name: 'Transició ecològica' }).click()
  await settle(page)
  // the search runs on keyup
  await page.getByPlaceholder('Cerca per nom').fill('Formació')
  await page.getByPlaceholder('Cerca per nom').press('End')
  await page.waitForTimeout(800)
  await settle(page)
  await shot(page, 'filtrat')

  // sorted by actual result, highest first (two clicks)
  await page.getByPlaceholder('Cerca per nom').fill('')
  await page.getByPlaceholder('Cerca per nom').press('Backspace')
  await filters.locator('label', { hasText: 'Estat' }).locator('select').selectOption({ label: 'Actiu' })
  await filters.getByRole('button', { name: 'Tots', exact: true }).click()
  await settle(page)
  const header = page.locator('th', { hasText: 'Resultat executat' })
  await header.click()
  await settle(page, 300)
  await header.click()
  await settle(page)
  await shot(page, 'ordenat')

  // the totals row at the bottom of the page
  const foot = page.locator('tfoot')
  await foot.scrollIntoViewIfNeeded()
  await settle(page, 300)
  const fb = await foot.boundingBox()
  await shot(page, 'totals', { clip: { x: fb.x - 8, y: fb.y - 220, width: fb.width + 16, height: 300 } })

  // quick edit, one row open
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Edició ràpida' }).click()
  await settle(page)
  await page.locator('td.is-actions-cell button.is-primary').nth(1).click()
  await settle(page, 500)
  await page.evaluate(() => {
    document.activeElement && document.activeElement.blur()
    // focusing the row's first input scrolls the wide table sideways
    document.querySelectorAll('*').forEach(w => { if (w.scrollLeft) w.scrollLeft = 0 })
  })
  await settle(page, 300)
  await shot(page, 'edicio-rapida')
})
