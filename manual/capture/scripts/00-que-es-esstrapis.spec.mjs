// 00. Què és ESSTRAPIS — one screenshot per main area, read-only.
// Data: anonymized copy of resilience (projectes_v5_manual). Project 504 is a small
// training project whose original, forecast and actual results are all positive.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const PROJECT_ID = 504

test('00-que-es-esstrapis', async ({ page }) => {
  await start(page, '00-que-es-esstrapis')
  await login(page)
  await settle(page)
  await shot(page, 'llistat-projectes')

  await page.goto(`#/project/${PROJECT_ID}`)
  await settle(page, 2000)
  await shot(page, 'projecte')

  // the phases as they are being executed (the original-budget card starts collapsed)
  await page.locator('.card-header-title', { hasText: 'Execució pressupost' })
    .evaluate(el => el.scrollIntoView({ block: 'start' }))
  await settle(page)
  await shot(page, 'projecte-fases')

  await page.goto('#/dedicacio')
  await settle(page)
  // the demo data ends in summer 2026: go back to a month with hours
  const prevMonth = page.locator('.vc-arrow.vc-prev').filter({ visible: true }).first()
  for (let i = 0; i < 3; i++) {
    await prevMonth.click()
    await settle(page, 300)
  }
  await shot(page, 'hores-dedicades')

  await page.goto('#/emitted-invoices')
  await settle(page, 1500)
  await shot(page, 'ingressos')

  await page.goto('#/stats-projectes')
  // the view swaps in only after the pivot library (kendo) has loaded
  await page.getByText('Taula dinàmica', { exact: true }).waitFor({ timeout: 30_000 })
  await page.getByText('Per defecte', { exact: true }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await page.locator('.k-pivot-table').first().evaluate(el => el.scrollIntoView({ block: 'center' }))
  await settle(page)
  await shot(page, 'informe-projectes')

  // Tresoreria goes last: leaving it breaks navigation when a bank movement has no project
  // (RouterLink without id, vue-3 branch).
  await page.goto('#/tresoreria')
  await settle(page, 2500)
  await shot(page, 'tresoreria')
})
