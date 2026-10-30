// 13. Imputar hores dedicades — the hours calendar, adding and editing an entry, the table and
// full views, moving hours between projects, the timer and holidays.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only:
// every dialog is cancelled, and the timer «Comptador» starts is deleted. Clara Puig (8) has a full May 2026 of hours; project 642
// («Jornades de consum responsable Riudemostra») is one of hers.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur())
const modal = page => page.locator('.modal.is-active')
const cancel = async page => {
  const m = modal(page)
  const btn = m.getByRole('button', { name: /Cancel·la/ })
  if (await btn.count()) await btn.first().click()
  else await page.keyboard.press('Escape')
  await settle(page, 400)
}

async function pickPerson (page, name) {
  const person = page.getByRole('textbox', { name: 'Persona' })
  await person.fill(name.split(' ')[0])
  await page.locator('.dropdown-item', { hasText: name }).first().click()
  await settle(page, 800)
}

test('13-imputar-hores', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '13-imputar-hores', { today: '2026-06-17' })
  await login(page)

  await page.goto('/dedicacio')
  await page.getByRole('button', { name: 'Afegeix hores' }).waitFor()
  await settle(page, 1500)
  await pickPerson(page, 'Clara Puig')
  await page.locator('.vc-arrow.vc-prev, button[aria-label*="nterior"]').filter({ visible: true }).first().click()
  await blur(page)
  await settle(page, 1500)
  await shot(page, 'calendari')

  // editing an entry: click it
  // the first entry of Monday 4 May (entries further down a day are hidden by its scroll)
  await page.locator('.vc-day.id-2026-05-04 .tag-hours > span').first().click({ position: { x: 10, y: 5 } })
  await modal(page).getByText('Entrada hores').waitFor()
  await settle(page, 600)
  await blur(page)
  await shot(page, 'editar')
  await cancel(page)

  // a new entry
  await page.getByRole('button', { name: 'Afegeix hores' }).click()
  await modal(page).getByText('Entrada hores').waitFor()
  await settle(page, 600)
  await blur(page)
  await shot(page, 'nova')
  await cancel(page)

  // table and full views
  await page.getByRole('button', { name: 'Taula', exact: true }).click()
  await settle(page, 1500)
  await shot(page, 'taula')
  await page.getByRole('button', { name: 'Tot', exact: true }).click()
  await settle(page, 1500)
  await shot(page, 'tot')
  await page.getByRole('button', { name: 'Calendari', exact: true }).click()
  await settle(page, 1000)

  // moving hours: needs a project in the filter
  await page.getByRole('textbox', { name: 'Projecte' }).fill('Jornades de consum')
  await page.locator('.dropdown-item', { hasText: 'Jornades de consum responsable Riudemostra' }).first().click()
  await settle(page, 1500)
  await page.getByRole('button', { name: 'Mou hores' }).click()
  await settle(page, 600)
  await shot(page, 'moure')
  await cancel(page)

  // «Comptador» starts a timer right away (a record): delete it after the picture
  await page.getByRole('button', { name: 'Comptador' }).click()
  await settle(page, 800)
  await blur(page)
  await shot(page, 'comptador')
  await modal(page).getByRole('button', { name: 'Elimina Comptador' }).click()
  await settle(page, 400)
  const confirm = page.locator('.modal.is-active').last().getByRole('button', { name: /Esborra|Elimina|D'acord|OK/ }).last()
  if (await confirm.count()) await confirm.click()
  await settle(page, 800)

  await page.getByRole('button', { name: 'Festiu' }).click()
  await settle(page, 800)
  await blur(page)
  await shot(page, 'festiu')
  await cancel(page)
})
