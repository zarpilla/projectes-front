// «Sèries de projecte» (2026-11-06): pictures added to two chapters.
//  - 04. Crear i editar un projecte: 12-esborrar retaken (the dialog now says only
//    projects without documents or hours can be deleted), then 17+ the series in the
//    wizard, the numbered project, the copy into a series and the refused delete.
//  - 35. Taules auxiliars: 07+ the «Sèries de projecte» list and a series.
// Data: anonymized copy of resilience, seen on 17/06/2026, with the series of this
// script: «2026» ([2026-013] next) and «OBR» (OBR-05 next), made at the start (and the
// ones of a previous run removed). The demo project «Taller de cuina de proximitat (demo)»
// is created in the series and deleted at the end. Project 642 has invoices and hours:
// its delete is refused.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const DEMO = 'Taller de cuina de proximitat (demo)'
const WITH_DOCUMENTS = 642
const FULL_PROJECT = 459

const api = (page, method, route, data) => page.evaluate(async ({ method, route, data }) => {
  const res = await fetch(window.APP_CONFIG.VUE_APP_API_URL + '/api/' + route, {
    method,
    headers: { Authorization: 'Bearer ' + localStorage.getItem('jwt'), 'Content-Type': 'application/json' },
    body: data ? JSON.stringify({ data }) : undefined
  })
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`)
  if (res.status === 204) return null
  const json = await res.json()
  return json && json.data !== undefined ? json.data : json
}, { method, route, data })

async function removeDemo (page) {
  const found = await api(page, 'GET', `projects/basic?_limit=-1&_q=${encodeURIComponent('Taller de cuina de proximitat')}`)
  for (const p of found) await api(page, 'DELETE', `projects/${p.id}`).catch(() => {})
}

async function makeSeries (page) {
  for (const s of await api(page, 'GET', 'project-series?_limit=-1')) {
    if (['2026', 'OBR'].includes(s.name)) await api(page, 'DELETE', `project-series/${s.id}`)
  }
  await api(page, 'POST', 'project-series', { name: '2026', prefix: '[', suffix: ']', leading_zeros: 3, last_number: 12, active: true })
  await api(page, 'POST', 'project-series', { name: 'OBR', prefix: '', suffix: '', leading_zeros: 2, last_number: 4, active: true })
}

const field = (page, label) => page.locator('.field.is-horizontal', { has: page.locator('label.label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) })
const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur())

test('04-crear-editar-projecte: delete dialog (12)', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '04-crear-editar-projecte', { today: '2026-06-17', firstShot: 12 })
  await login(page)

  // 12: the delete dialog, retaken
  await page.goto(`/projecte/${FULL_PROJECT}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1000)
  await page.getByRole('button', { name: 'Més accions' }).click()
  await page.getByRole('menuitem', { name: /Esborrar projecte/ }).click()
  await settle(page, 300)
  await shot(page, 'esborrar')
  await page.locator('.modal.is-active').getByRole('button', { name: /Cancel/ }).click()
  await settle(page, 300)

})

test('04-crear-editar-projecte: series (17+)', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '04-crear-editar-projecte', { today: '2026-06-17', firstShot: 17 })
  await login(page)
  await removeDemo(page)
  await makeSeries(page)

  // 17+: a numbered project through the wizard
  await page.goto('/projectes')
  await settle(page)
  await page.getByRole('button', { name: 'Nou projecte' }).click()
  await page.getByText('Projecte nou · pas 1 de 4').waitFor()
  await field(page, 'Sèrie').locator('select').selectOption({ label: '2026' })
  await page.getByPlaceholder('Nom del projecte', { exact: true }).fill(DEMO)
  await field(page, 'Estat').locator('select').selectOption({ label: 'Actiu' })
  await field(page, 'Àmbit').locator('select').selectOption({ label: 'Habitatge cooperatiu' })
  await field(page, 'Coordina').locator('select').selectOption({ label: 'Clara Puig' })
  await blur(page)
  await settle(page, 400)
  await shot(page, 'serie-nou', { clip: { x: 0, y: 0, width: 1440, height: 560 } })

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.waitForURL(/\/projecte\/[1-9]\d*/, { timeout: 30_000 })
  await settle(page, 1000)
  // the numbered project in the list
  await page.goto('/projectes')
  await settle(page)
  await page.getByPlaceholder('Cerca per nom').fill('Taller de cuina')
  await settle(page, 800)
  await shot(page, 'serie-llistat', { clip: { x: 0, y: 0, width: 1440, height: 420 } })

  // the copy asks for the series (here a project without one, copied into 2026)
  await page.goto(`/projecte/${FULL_PROJECT}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1000)
  await page.getByRole('button', { name: 'Més accions' }).click()
  await page.getByRole('menuitem', { name: /Duplicar projecte/ }).click()
  await page.getByText('Dates de la còpia').waitFor()
  await page.locator('.modal.is-active .duplicate-serie select').selectOption({ label: '2026' })
  await settle(page, 300)
  await shot(page, 'duplicar-serie')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 300)

  // a project with invoices and hours can't be deleted
  await page.goto(`/projecte/${WITH_DOCUMENTS}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1200)
  await page.getByRole('button', { name: 'Més accions' }).click()
  await page.getByRole('menuitem', { name: /Esborrar projecte/ }).click()
  await settle(page, 300)
  await page.locator('.modal.is-active').getByRole('button', { name: /Esborra|Confirm|D'acord|Envia/ }).first().click()
  await page.locator('.toast').waitFor()
  await settle(page, 300)
  await shot(page, 'esborrar-no', { keepToasts: true })

  await removeDemo(page)
})

test('35-taules-auxiliars: project series', async ({ page }) => {
  test.setTimeout(120_000)
  await start(page, '35-taules-auxiliars', { today: '2026-06-17', firstShot: 7 })
  await login(page)
  await page.goto('/administracio/series-projecte')
  await page.getByText('2026').first().waitFor()
  await settle(page, 600)
  await shot(page, 'series-projecte')
  await page.getByText('2026', { exact: true }).first().click()
  await settle(page, 800)
  await shot(page, 'serie-projecte-fitxa')
})
