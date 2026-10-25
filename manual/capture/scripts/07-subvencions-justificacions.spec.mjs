// 07. Subvencions i justificacions — the grant data of a project, the «Subvencions» list and
// the «Justificacions» report (hours and invoices that justify each grant).
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only.
// The copy has no manual justification rows; project 459 (closed) has an amount to justify
// for 2024, so the report is shown for 2024, closed projects, real hours.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const GRANT_PROJECT = 459

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('07-subvencions-justificacions', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '07-subvencions-justificacions', { today: '2026-06-17' })
  await login(page)

  // the grant block of a project
  await page.goto(`#/projecte/${GRANT_PROJECT}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1500)
  await toTop(page.locator('h3.form-section-title', { hasText: 'Subvencions' }), 20)
  await settle(page, 300)
  await shot(page, 'projecte-subvencio')

  // the list of grant projects
  await page.goto('#/subvencions')
  await page.getByText('projectes subvencionables').waitFor()
  await settle(page, 1500)
  await shot(page, 'subvencions')
  await page.getByRole('button', { name: /^Tancat/ }).click()
  await settle(page, 800)
  await shot(page, 'subvencions-tancats')

  // the justifications report
  await page.goto('#/justificacions')
  await page.getByText('Import justificat').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  const filters = page.locator('form.filter-bar')
  await filters.getByRole('combobox', { name: 'Any' }).selectOption({ label: '2024' })
  await filters.getByRole('combobox', { name: 'Estat projecte' }).selectOption({ label: 'Tancat' })
  await filters.getByRole('button', { name: 'Reals', exact: true }).click()
  await settle(page, 3000)
  await shot(page, 'justificacions')

  const detail = page.locator('.card-header-title', { hasText: 'Detall de bestretes' })
  if (await detail.count()) {
    await page.locator('.k-pivot-table, #justification-pivot').first().waitFor({ timeout: 30_000 }).catch(() => {})
    // the end of the totals, «Bestretes manuals» and «Detall de bestretes» fit in one picture
    await toTop(detail, 520)
    await settle(page, 1500)
    await shot(page, 'justificacions-detall')
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await filters.getByRole('button', { name: 'Factures', exact: true }).click()
  await settle(page, 3000)
  await shot(page, 'justificacions-factures')
})
