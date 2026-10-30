// 04. Crear i editar un projecte — the new-project wizard (4 steps), the project page with
// tabs, the Dades tab, the save bar, duplicating and deleting.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. The manual
// user (15, Quim Puig) is not among the people who can coordinate, so the demo project is
// coordinated by Clara Puig. The script creates the project «Taller de cuina de proximitat
// (demo)» through the wizard and deletes it at the end (and at the start, if a previous run
// stopped half-way). Project 459 (a client, strategies, territory, a grant) is shown
// read-only for a well-filled Dades tab.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const DEMO = 'Taller de cuina de proximitat (demo)'
const FULL_PROJECT = 459

// REST call as the logged-in user, through the page (its JWT, its API url)
const api = (page, method, route) => page.evaluate(async ({ method, route }) => {
  const res = await fetch(window.APP_CONFIG.VUE_APP_API_URL + '/api/' + route, {
    method, headers: { Authorization: 'Bearer ' + localStorage.getItem('jwt') }
  })
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}, { method, route })

async function removeDemo (page) {
  const found = await api(page, 'GET', `projects/basic?_limit=-1&_q=${encodeURIComponent('Taller de cuina de proximitat')}`)
  for (const p of (found.data || found)) await api(page, 'DELETE', `projects/${p.id}`).catch(() => {})
}

// the field of a horizontal form row, by its label
const field = (page, label) => page.locator('.field.is-horizontal', { has: page.locator('label.label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) })
const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur())
const top = page => page.evaluate(() => window.scrollTo(0, 0))

test('04-crear-editar-projecte', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '04-crear-editar-projecte', { today: '2026-06-17' })
  await login(page)
  await removeDemo(page)

  // --- step 1: basic data
  await page.goto('/projectes')
  await settle(page)
  await page.getByRole('button', { name: 'Nou projecte' }).click()
  await page.getByText('Projecte nou · pas 1 de 4').waitFor()
  await settle(page, 800)
  await shot(page, 'pas1-buit')

  await page.getByPlaceholder('Codi').fill(DEMO)
  await field(page, 'Estat').locator('select').selectOption({ label: 'Actiu' })
  await field(page, 'Àmbit').locator('select').selectOption({ label: 'Habitatge cooperatiu' })
  await field(page, 'Coordina').locator('select').selectOption({ label: 'Clara Puig' })
  await page.getByPlaceholder('Descripció').fill('Quatre tallers de cuina amb producte de proximitat per a les escoles del barri.')
  await page.getByRole('button', { name: 'Més dades (opcionals)' }).click()
  await settle(page, 400)
  await blur(page)
  await page.getByText('Relacions i classificació').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -380))
  await settle(page, 300)
  await shot(page, 'pas1-opcionals')

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByText('Projecte nou · pas 2 de 4').waitFor()
  await settle(page, 1000)

  // --- step 2: phases and the original budget
  await page.getByPlaceholder('Nom de la fase...').fill('Tallers')
  await page.locator('.field', { hasText: 'Nova Fase' }).locator('.icon.is-right').click()
  await settle(page, 500)
  await page.getByRole('button', { name: 'Afegeix una línia' }).first().click()
  await settle(page, 300)
  const incomes = page.locator('.subphases-list').first().locator('tbody tr')
  const fillLine = async (row, { type, concept, qty, price, invoice, payment }) => {
    await row.locator('select').first().selectOption({ label: type })
    await row.getByPlaceholder(/Nom de la (subfase|despesa)\.\.\./).fill(concept)
    await row.getByPlaceholder('Quantitat, hores, unitats...').fill(qty)
    await row.getByPlaceholder('Preu per unitat').fill(price)
    await row.getByPlaceholder('Data factura').fill(invoice)
    await row.getByPlaceholder('Data factura').press('Enter')
    await row.getByPlaceholder('Data pagament').fill(payment)
    await row.getByPlaceholder('Data pagament').press('Enter')
    await blur(page)
  }
  await fillLine(incomes.first(), { type: 'Factura serveis 21%', concept: 'Tallers a les escoles', qty: '4', price: '450', invoice: '30/09/2026', payment: '30/10/2026' })
  const expensesBlock = page.locator('.subphases-list').nth(1)
  await expensesBlock.getByRole('button', { name: 'Afegeix una línia' }).click()
  await settle(page, 300)
  const expenses = expensesBlock.locator('tbody tr')
  await fillLine(expenses.first(), { type: 'Alimentació', concept: 'Producte de proximitat', qty: '4', price: '80', invoice: '15/09/2026', payment: '15/10/2026' })
  await settle(page, 300)
  await page.locator('.card-header-title', { hasText: 'Fases i pressupost original' }).scrollIntoViewIfNeeded()
  await top(page)
  await settle(page, 300)
  await shot(page, 'pas2-fases')

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByText('Projecte nou · pas 3 de 4').waitFor()
  await settle(page, 1500)

  // --- step 3: planning (drag on the line's row to plan hours)
  const row = page.getByRole('gridcell', { name: 'Tallers a les escoles' })
  const rb = await row.boundingBox()
  const from = await page.getByText('Set', { exact: true }).first().boundingBox()
  const to = await page.getByText('Nov', { exact: true }).first().boundingBox()
  await page.mouse.move(from.x + 5, rb.y + rb.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + 20, rb.y + rb.height / 2, { steps: 10 })
  await page.mouse.up()
  const dialog = page.locator('.modal.is-active')
  await dialog.getByText('Planificació').first().waitFor()
  await dialog.locator('input').first().fill('24')
  await dialog.locator('select').first().selectOption({ label: 'Clara Puig' })
  await settle(page, 600)
  await dialog.getByPlaceholder('Descripció').fill('Preparar i fer els tallers')
  await blur(page)
  await shot(page, 'pas3-dedicacio')
  await dialog.getByRole('button', { name: "D'acord" }).click()
  await settle(page, 1000)
  await shot(page, 'pas3-planificacio')

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByText('Projecte nou · pas 4 de 4').waitFor()
  await settle(page, 2000)
  await shot(page, 'pas4-confirmacio')

  // --- closing the budget: the project opens with its tabs
  await page.getByRole('button', { name: 'Tancar pressupost' }).click()
  await page.getByRole('navigation', { name: 'Seccions del projecte' }).waitFor({ timeout: 30_000 })
  await settle(page, 2000)
  await shot(page, 'projecte-creat')
  const demoUrl = page.url()

  // --- a change not saved yet: the save bar says so
  await page.getByRole('link', { name: 'Dades', exact: true }).click()
  await settle(page, 800)
  await page.getByPlaceholder('Descripció').fill('Quatre tallers de cuina amb producte de proximitat per a les escoles del barri i una festa final.')
  await blur(page)
  await settle(page, 300)
  await shot(page, 'canvis-sense-desar')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Sense canvis pendents').waitFor()
  await settle(page, 300)

  // --- leaving with unsaved changes asks first
  await page.getByPlaceholder('Descripció').fill('Un altre canvi')
  await blur(page)
  await page.getByRole('navigation', { name: 'Menú principal' }).locator('a[href$="/projectes"]').click()
  await page.getByText('Hi ha canvis sense guardar').waitFor()
  await settle(page, 300)
  await shot(page, 'sortir-sense-desar')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Continua editant' }).click()
  await settle(page, 300)
  await page.getByPlaceholder('Descripció').fill('Quatre tallers de cuina amb producte de proximitat per a les escoles del barri i una festa final.')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Sense canvis pendents').waitFor()
  await settle(page, 300)

  // --- more actions: duplicate, delete
  await page.getByRole('button', { name: 'Més accions' }).click()
  await settle(page, 300)
  await shot(page, 'mes-accions')
  await page.getByRole('menuitem', { name: /Duplicar projecte/ }).click()
  await page.getByText('Dates de la còpia').waitFor()
  await settle(page, 300)
  await shot(page, 'duplicar')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 300)
  await page.getByRole('button', { name: 'Més accions' }).click()
  await page.getByRole('menuitem', { name: /Esborrar projecte/ }).click()
  await settle(page, 300)
  await shot(page, 'esborrar')
  await page.locator('.modal.is-active').getByRole('button', { name: /Cancel/ }).click()
  await settle(page, 300)

  // --- a complete Dades tab, read-only (project 642)
  await page.goto(`/projecte/${FULL_PROJECT}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1500)
  await shot(page, 'dades-identificacio')
  for (const [title, name] of [['Relacions i classificació', 'dades-relacions'], ['Gestió del projecte', 'dades-gestio'], ['Subvencions', 'dades-subvencions']]) {
    await page.locator('h3.form-section-title', { hasText: title }).evaluate(el => {
      el.scrollIntoView({ block: 'start' })
      window.scrollBy(0, -110)
    })
    await settle(page, 300)
    await shot(page, name)
  }

  await removeDemo(page)
  console.log('demo project was', demoUrl)
})
