// 12. Pressupostos — the quotes list, a quote (lines, acceptance), its PDF and a new
// quote. Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026.
// Read-only: the new quote is left without saving. Quote 19 (2026-003) is a pending one; its
// PDF shows the client data saved with the quote, which the anonymization made different from
// the contact's name (not an app problem).
import { test } from '@playwright/test'
import { start, login, settle, shot, pdfShot } from '../helpers.mjs'

const QUOTE = 19

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('12-pressupostos', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '12-pressupostos', { today: '2026-06-17' })
  await login(page)

  await page.goto('/pressupostos')
  await page.getByText('Pressupostat').waitFor()
  await settle(page, 1500)
  await shot(page, 'llistat')

  await page.goto(`/document/${QUOTE}/quotes`)
  await page.getByText('Enviament i acceptació').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'pressupost')
  await toTop(page.locator('.card-header-title', { hasText: 'Enviament i acceptació' }), 20)
  await settle(page, 400)
  await shot(page, 'acceptacio')
  await toTop(page.locator('.card-header-title', { hasText: /^\s*Línies\s*$/ }).last(), 20)
  await settle(page, 400)
  await shot(page, 'linies')

  // the PDF the API makes (the copy has no logo upload: the PDF is drawn without one)
  await pdfShot(page, page.locator('button', { hasText: /^\s*PDF\s*$/ }).first(), 'pdf')

  await page.goto('/pressupostos')
  await settle(page, 1000)
  await page.getByRole('button', { name: 'Nou pressupost' }).click()
  await settle(page, 2000)
  await shot(page, 'nou')
})
