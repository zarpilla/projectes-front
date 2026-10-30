// 00. Què és ESSTRAPIS — one screenshot per main area, read-only.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026 (the demo
// data ends in summer 2026). Project 642 is an active project with no warnings whose original,
// forecast and actual results are all positive; Clara Puig (8) has a full May 2026 of hours.
// Before the first run on a fresh copy, refresh the stored totals (cron is off there): the
// project page otherwise warns that the totals are being updated (see the manual skill).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const PROJECT_ID = 642

test('00-que-es-esstrapis', async ({ page }) => {
  await start(page, '00-que-es-esstrapis', { today: '2026-06-17' })
  await login(page)
  await page.goto('/projectes')
  await page.getByRole('heading', { name: 'Projectes' }).first().waitFor()
  await settle(page)
  await shot(page, 'llistat-projectes')

  await page.goto(`/projecte/${PROJECT_ID}?tab=resum`)
  await page.getByText('Resum financer').first().waitFor()
  await settle(page, 1500)
  await shot(page, 'projecte')

  // the phases as they are being executed, folded: one line per phase with its totals
  await page.goto(`/projecte/${PROJECT_ID}?tab=pressupost`)
  await settle(page, 1500)
  await page.locator('button', { hasText: 'Plega-ho tot', hasNotText: 'Desplega' }).click()
  await settle(page, 500)
  await shot(page, 'projecte-fases')

  await page.goto('/dedicacio')
  await settle(page, 1500)
  const person = page.getByRole('textbox', { name: 'Persona' })
  await person.fill('Clara')
  await page.locator('.dropdown-item', { hasText: 'Clara Puig' }).first().click()
  await settle(page, 800)
  await page.locator('.vc-arrow.vc-prev, button[aria-label*="nterior"]').filter({ visible: true }).first().click()
  await page.evaluate(() => document.activeElement.blur())
  await settle(page, 1500)
  await shot(page, 'hores-dedicades')

  await page.goto('/factures-emeses')
  await settle(page, 1500)
  await shot(page, 'ingressos')

  await page.goto('/panell-projectes')
  // the dashboard on top of the pivot table
  await page.getByText('Resultat previst i real per projecte').waitFor({ timeout: 30_000 })
  await settle(page, 2000)
  await shot(page, 'informe-projectes')

  await page.goto('/tresoreria')
  // the accounts card comes last, once the year's movements are in
  await page.getByText('Comptes', { exact: true }).last().waitFor({ timeout: 60_000 })
  await page.getByText('Gener', { exact: true }).first().waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  await shot(page, 'tresoreria')
})
