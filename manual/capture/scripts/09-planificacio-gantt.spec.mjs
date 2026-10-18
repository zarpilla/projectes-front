// 09. Planificació (Gantt) — a project's original and forecast planning, editing a
// dedication, and the «Previsió dedicació» report (planned hours against each workday).
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// the dedication dialog is opened and cancelled. Project 642 has a planning with several
// people. The wizard's first planning is shown in chapter 04.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const PROJECT = 642

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('09-planificacio-gantt', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '09-planificacio-gantt', { today: '2026-06-17' })
  await login(page)

  await page.goto(`#/project/${PROJECT}?tab=planificacio`)
  await page.locator('.gantt_task_line').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'prevista')

  // only the phases
  await page.locator('label.gantt-check', { hasText: 'Només fases' }).click()
  await settle(page, 800)
  await shot(page, 'nomes-fases')
  await page.locator('label.gantt-check', { hasText: 'Només fases' }).click()
  await settle(page, 800)

  // weeks
  await page.getByRole('button', { name: 'Setmanes', exact: true }).click()
  await settle(page, 1200)
  await shot(page, 'setmanes')
  await page.getByRole('button', { name: 'Mesos', exact: true }).click()
  await settle(page, 1200)

  // editing a dedication: click its bar
  const bar = page.locator('.gantt_task_line', { hasText: /^\s*[\d.,]+ h\s*$/ }).first()
  await bar.scrollIntoViewIfNeeded()
  await bar.click()
  const dialog = page.locator('.modal.is-active')
  await dialog.getByText('Planificació').first().waitFor()
  await settle(page, 500)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await shot(page, 'editar-dedicacio')
  await dialog.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 500)

  // the original planning
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Original', exact: true }).click()
  await page.getByText('Planificació original').first().waitFor()
  await page.locator('.gantt_task_line').first().waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await shot(page, 'original')

  // the report
  await page.goto('#/stats-previsio-gantt')
  await page.getByText('i ocupació per persona').first().waitFor({ timeout: 30_000 })
  await settle(page, 2000)
  await shot(page, 'informe')
  const cell = page.locator('td.period-cell', { has: page.locator('.cell-content:not(.is-none)') }).nth(5)
  await cell.click()
  await settle(page, 600)
  await shot(page, 'informe-detall', { keepToasts: true })
})
