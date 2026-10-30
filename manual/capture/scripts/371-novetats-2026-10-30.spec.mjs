// Novetats del 2026-10-30 (issues/371 and the contacts' «Resum» tab and NIF warning):
// adds pictures to chapters 04, 05, 11 and 34 (and retakes 04/15 and 34/04, which now
// show the new fields) without rerunning their whole scripts. Data: anonymized copy of
// resilience (projectes_v5_manual), seen on 17/06/2026. Read-only: the project is switched
// to «Per hores» and the new contact gets a NIF, but nothing is saved.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const TODAY = '2026-06-17'
// Recerca en xarxes de suport Vilanova de l'Exemple: active, two hour lines not invoiced and
// a collected «Desplaçaments» line. The 05 test SAVES it «Per hores» at 45 €/h (the summary
// only shows saved figures). Restore afterwards on the copy (values before 2026-10-30):
//   UPDATE projects SET billing_mode = NULL, invoice_hours_price = 0 WHERE id = 634;
//   UPDATE phase_incomes SET quantity = 1, amount = 0, total_amount = 0 WHERE id = 4009;
//   UPDATE phase_incomes SET quantity = 1, amount = 2088, total_amount = 2088 WHERE id = 4010;
// then refresh its totals (processDirty, see the skill).
const HOURS_PROJECT = 634
const FULL_PROJECT = 459 // the project of chapter 04's Dades pictures
const CONTACT = 365 // Ateneu Alba: client of 5 projects, invoices in 2025 and 2026
const EXISTING_NIF = 'G00000365'

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

const field = (page, label) => page.locator('.field.is-horizontal', { has: page.locator('label.label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) })

async function perHores (page, id, price) {
  await page.goto(`/projecte/${id}?tab=dades`)
  await page.locator('h3.form-section-title', { hasText: 'Gestió del projecte' }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await field(page, 'Facturació').locator('select').selectOption('hours')
  await field(page, 'Preu/hora').locator('input').first().fill(String(price))
  await settle(page, 300)
}

const tab = (page, id) => page.locator(`a[href*="tab=${id}"]`).first().click()

test('04 · Gestió del projecte amb Facturació', async ({ page }) => {
  await start(page, '04-crear-editar-projecte', { today: TODAY, firstShot: 15 })
  await login(page)
  await perHores(page, FULL_PROJECT, 55)
  await toTop(page.locator('h3.form-section-title', { hasText: 'Gestió del projecte' }), 110)
  await settle(page, 300)
  await shot(page, 'dades-gestio')
})

test('05 · Pressupost per hores i resum', async ({ page }) => {
  await start(page, '05-fases-pressupost', { today: TODAY, firstShot: 8 })
  await login(page)
  await perHores(page, HOURS_PROJECT, 45)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Sense canvis pendents').waitFor({ timeout: 30_000 })
  await page.goto(`/projecte/${HOURS_PROJECT}?tab=resum`)
  await page.locator('.project-summary-cards .kpis').waitFor({ timeout: 30_000 })
  await settle(page, 1500)

  await tab(page, 'pressupost')
  const card = page.locator('.card', { has: page.getByText('Pressupost per hores') }).first()
  await card.waitFor()
  await settle(page, 800)
  await toTop(card, 20)
  await shot(page, 'pressupost-per-hores', { clip: await card.boundingBox() })

  await tab(page, 'resum')
  const kpis = page.locator('.project-summary-cards .kpis')
  await kpis.waitFor()
  await settle(page, 800)
  await toTop(kpis, 20)
  await shot(page, 'resum-per-hores', { clip: await kpis.boundingBox() })
})

test('11 · Resum del contacte i NIF repetit', async ({ page }) => {
  await start(page, '11-contactes', { today: TODAY, firstShot: 6 })
  await login(page)
  await page.goto(`/contacte/${CONTACT}`)
  await page.getByText('Pendent de cobrar').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await page.getByRole('combobox', { name: 'Període' }).selectOption('2025')
  await settle(page, 500)
  await shot(page, 'resum')
  await toTop(page.locator('h3', { hasText: 'Documents' }), 20)
  await settle(page, 300)
  await shot(page, 'resum-documents')

  await page.goto('/contacte/nou?vista=dades')
  await page.getByText('Identificació').waitFor({ timeout: 30_000 })
  await settle(page, 1000)
  await field(page, 'NIF').locator('input').fill(EXISTING_NIF)
  await page.getByText('Ja hi ha un altre contacte amb aquest NIF').waitFor()
  await settle(page, 300)
  const box = await page.locator('.card', { has: page.getByText('Identificació') }).first().boundingBox()
  await shot(page, 'nif-repetit', { clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 330) } })
})

test('34 · Bloc Projectes amb la facturació per defecte', async ({ page }) => {
  await start(page, '34-configuracio-general', { today: TODAY, firstShot: 4 })
  await login(page)
  await page.goto('/administracio/configuracio')
  await page.locator('h2', { hasText: 'Entitat' }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await toTop(page.locator('h2', { hasText: 'Projectes' }).first(), 40)
  await settle(page, 400)
  await shot(page, 'projectes')
})
