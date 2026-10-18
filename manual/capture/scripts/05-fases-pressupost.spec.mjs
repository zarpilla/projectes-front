// 05. Fases i pressupost del projecte — the original and execution budgets, phases and
// lines, splitting a line, linking a line to its invoice, and the periodification.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// dialogs are opened and cancelled, nothing is saved. Project 642 has no warnings, five
// phases with invoiced lines and a periodification; 687 has no periodification.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const PROJECT = 642
const NO_PERIODIFICATION = 687

const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur())
// scrolls an element to the top of the page, under the page head
const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)
const card = (page, title) => page.locator('.card', { has: page.locator('.card-header-title', { hasText: title }) })

test('05-fases-pressupost', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '05-fases-pressupost', { today: '2026-06-17' })
  await login(page)

  await page.goto(`#/project/${PROJECT}?tab=pressupost`)
  await page.getByText('Execució del pressupost').waitFor()
  await settle(page, 1500)
  const execution = card(page, 'Execució del pressupost')
  await execution.locator('button', { hasText: 'Plega-ho tot', hasNotText: 'Desplega' }).click()
  await settle(page, 400)
  await shot(page, 'pestanya')

  // one phase open: its income lines (invoiced ones carry the invoice code)
  await execution.getByRole('button', { name: 'Desplega la fase Disseny gràfic' }).click()
  await settle(page, 500)
  await toTop(execution.getByRole('textbox', { name: 'Nom de la fase' }).nth(1), 110)
  await settle(page, 300)
  await shot(page, 'fase-ingressos')

  // splitting a line
  const split = execution.getByRole('button', { name: 'Divideix la línia' }).filter({ visible: true }).first()
  await toTop(split, 300)
  await split.click()
  await page.locator('.modal.is-active').getByText('Edició de pressupost').waitFor()
  await settle(page, 400)
  await blur(page)
  await shot(page, 'dividir-linia')
  // its Cancel·la is pushed out of the dialog by the other buttons
  await page.keyboard.press('Escape')
  await settle(page, 400)

  // the document of an invoiced line
  const tag = execution.locator('.invoice-tag').filter({ visible: true }).first()
  await toTop(tag, 300)
  await tag.click()
  await page.locator('.modal.is-active').getByText('Assignació de documents').waitFor()
  await settle(page, 400)
  await blur(page)
  await shot(page, 'assignar-document')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 400)

  // the original budget, unfolded
  await execution.getByRole('button', { name: 'Plega la fase Disseny gràfic' }).click()
  const original = card(page, 'Fases i pressupost original')
  await original.locator('.card-header-icon').last().click()
  await settle(page, 600)
  await toTop(original.locator('.card-header-title'), 20)
  await settle(page, 300)
  await shot(page, 'original')

  // periodification
  await page.getByRole('link', { name: 'Periodificació', exact: true }).click()
  await page.getByText('Ajust d\'ingressos').first().waitFor()
  await settle(page, 800)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, 'periodificacio')

  // a fresh load: going from one project to another keeps the first one's periodification switch
  await page.goto(`#/project/${NO_PERIODIFICATION}?tab=periodificacio`)
  await page.reload()
  await page.getByText('no periodifica manualment').waitFor()
  await settle(page, 800)
  await shot(page, 'periodificacio-buida')
})
