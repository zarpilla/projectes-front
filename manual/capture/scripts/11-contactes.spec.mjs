// 11. Contactes — the contacts list (clients, providers, intercooperation), a contact's form
// and a new contact. Data: anonymized copy of resilience (projectes_v5_manual), seen on
// 17/06/2026. Read-only: the new contact form is left without saving.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('11-contactes', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '11-contactes', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/contacts')
  await page.getByPlaceholder('Cerca per nom, NIF, correu o població').waitFor()
  await settle(page, 1500)
  await shot(page, 'llistat')

  await page.getByRole('group', { name: 'Tipus de contacte' }).getByRole('button', { name: /Clienta/ }).click()
  await settle(page, 500)
  await page.getByPlaceholder('Cerca per nom, NIF, correu o població').fill('Ajuntament')
  await settle(page, 800)
  await shot(page, 'filtrat')

  // a public body: identification, address and the rest of the form
  await page.locator('a[href^="#/contact/"]').first().click()
  await page.getByText('Identificació').waitFor()
  await settle(page, 1500)
  await shot(page, 'fitxa')
  await toTop(page.locator('h3.form-section-title', { hasText: 'Persona de contacte' }), 20)
  await settle(page, 300)
  await shot(page, 'fitxa-entitat')
  // (no «Facturació electrònica» block: FACe is off in the copy)

  await page.goto('#/contacts')
  await settle(page, 800)
  await page.getByRole('button', { name: 'Nou contacte' }).click()
  await page.getByText('Identificació').waitFor()
  await settle(page, 1000)
  await shot(page, 'nou')
})
