// Novetats del 2026-11-09 (issues/421): in a project billed «Per hores» the hours
// budget is under the Gantt («Planificació i preu/hora»), each planning line has its
// own price/hour, the Gantt pop-up shows «Preu/hora» and the summary «Preu/hora
// facturat previst». Retakes 05/08 and 05/09 and adds 09/08. Data: anonymized copy of
// resilience (projectes_v5_manual), seen on 17/06/2026.
//
// The 05 test SAVES project 634 «Per hores» at 45 €/h with the «Assessorament» line at
// 55 €/h (the summary only shows saved figures). Restore afterwards on the copy (values
// before 2026-11-09):
//   UPDATE projects SET billing_mode = NULL, invoice_hours_price = 0 WHERE id = 634;
//   UPDATE phase_incomes SET quantity = 1, amount = 0, total_amount = 0 WHERE id = 4009;
//   UPDATE phase_incomes SET quantity = 1, amount = 2088, total_amount = 2088 WHERE id = 4010;
//   UPDATE estimated_hours SET price = NULL WHERE id IN (3839, 3840);
// then refresh its totals (processDirty, see the skill).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const TODAY = '2026-06-17'
// Recerca en xarxes de suport Vilanova de l'Exemple: two hour lines of 60 h, not
// invoiced («Redacció d'informe» 2025, «Assessorament» 2026), and a collected
// «Desplaçaments» line
const HOURS_PROJECT = 634

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

const field = (page, label) => page.locator('.field.is-horizontal', { has: page.locator('label.label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) })
const tab = (page, id) => page.locator(`a[href*="tab=${id}"]`).first().click()
const hoursCard = page => page.locator('.card', { has: page.getByText('Pressupost per hores') }).first()

test.describe.configure({ mode: 'serial' })

test('05 · Pressupost per hores sota el Gantt i resum', async ({ page }) => {
  await start(page, '05-fases-pressupost', { today: TODAY, firstShot: 8 })
  await login(page)
  await page.goto(`/projecte/${HOURS_PROJECT}?tab=dades`)
  await page.locator('h3.form-section-title', { hasText: 'Gestió del projecte' }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await field(page, 'Facturació').locator('select').selectOption('hours')
  await field(page, 'Preu/hora').locator('input').first().fill('45')
  await settle(page, 300)

  await tab(page, 'planificacio')
  const card = hoursCard(page)
  await card.waitFor()
  // the second line («Assessorament», 2026) has its own price/hour
  await card.locator('input[aria-label^="Preu/hora de"]').nth(1).fill('55')
  await settle(page, 300)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Sense canvis pendents').waitFor({ timeout: 30_000 })

  await page.goto(`/projecte/${HOURS_PROJECT}?tab=planificacio`)
  await hoursCard(page).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await toTop(hoursCard(page), 20)
  await settle(page, 300)
  await shot(page, 'pressupost-per-hores', { clip: await hoursCard(page).boundingBox() })
})

// after the save the project is «dirty» and, with the cron off, the page keeps polling
// for its totals: run processDirty (see the skill) between the two tests:
//   npx playwright test scripts/421-novetats-2026-11-09.spec.mjs -g "05 ·"
//   (processDirty on projectes_v5_manual)
//   npx playwright test scripts/421-novetats-2026-11-09.spec.mjs -g "05b|09 ·"
test('05b · Resum per hores', async ({ page }) => {
  await start(page, '05-fases-pressupost', { today: TODAY, firstShot: 9 })
  await login(page)
  await page.goto(`/projecte/${HOURS_PROJECT}?tab=resum`)
  const kpis = page.locator('.project-summary-cards .kpis')
  await kpis.waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await toTop(kpis, 20)
  await shot(page, 'resum-per-hores', { clip: await kpis.boundingBox() })
})

test('09 · Preu/hora en clicar una línia del Gantt', async ({ page }) => {
  await start(page, '09-planificacio-gantt', { today: TODAY, firstShot: 8 })
  await login(page)
  await page.goto(`/projecte/${HOURS_PROJECT}?tab=planificacio`)
  await page.locator('.gantt_task_line').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await page.locator('.gantt_task_line', { hasText: '60' }).last().click()
  const modal = page.locator('.modal-card-dedication')
  await modal.getByText('Preu/hora').first().waitFor()
  await settle(page, 600)
  await shot(page, 'preu-hora-dedicacio', { clip: await modal.boundingBox() })
  await modal.getByRole('button', { name: 'Cancel·la' }).click()
})
