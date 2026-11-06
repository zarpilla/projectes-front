// 39. Conciliació bancària — upload a Norma 43 statement, what is reconciled on its own, the
// proposals, picking lines by hand, a paid expense from a movement, undoing, the rules and the
// statements; plus the Tresoreria check that marks a document paid (chapter 22, picture 07).
//
// Data: a copy of the anonymized resilience copy with the bank-reconciliation tables
// (projectes_v5_413), seen on 17/06/2026. Its Cajamar and Triodos accounts have made-up IBANs
// (ES12 3058 0001 1100 0000 0001, ES34 1491 0001 2100 0000 0002), the ones of the statement in
// fixtures/extracte-demo-juny-2026.n43 (also made up: 12 Cajamar + 2 Triodos movements, 1–16 June
// 2026, built on the lines of Tresoreria of that copy).
//
// It WRITES: a rule «Comissions bancàries», the statement, its reconciliations (the invoices it
// matches are marked collected/paid), and one paid expense «COMPRA TARGETA PAPERERIA CENTRE».
// Before rerunning, undo every reconciled movement and empty the bank_* tables (and the
// «Saldo segons l'extracte bancari» balances), or the upload finds the movements already there.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const statement = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/extracte-demo-juny-2026.n43')

const row = (page, text) => page.locator('.recon-table tbody tr', { hasText: text }).first()
const modal = page => page.locator('.modal.is-active .recon-detail')
const field = (scope, label) => scope.locator('.field', { has: scope.page().locator('label', { hasText: label }) }).first()

async function openMovement (page, text) {
  await row(page, text).locator('.recon-concept').click()
  await modal(page).waitFor()
  await settle(page, 800)
}

test('39-conciliacio-bancaria', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '39-conciliacio-bancaria', { today: '2026-06-17' })
  await login(page)

  await page.goto('/conciliacio')
  await page.getByText('Moviments del banc').waitFor({ timeout: 60_000 })
  await settle(page, 800)

  // a rule for the bank fees, before the upload so it applies
  await page.getByRole('tab', { name: 'Regles' }).click()
  await page.getByRole('button', { name: 'Afegeix una regla' }).click()
  const form = page.locator('.recon-rule-form')
  await field(form, 'Nom').locator('input').fill('Comissions bancàries')
  await field(form, 'Si el concepte conté').locator('input').fill('comissió')
  await field(form, 'Moviments').locator('select').selectOption({ label: 'Només sortides' })
  await settle(page, 400)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await shot(page, 'nova-regla')
  await form.getByRole('button', { name: 'Desa' }).click()
  await settle(page, 600)

  // the upload
  await page.getByRole('tab', { name: 'Moviments' }).click()
  await settle(page, 400)
  await shot(page, 'pantalla-buida')
  await page.locator('input[type=file]').setInputFiles(statement)
  await page.getByText('Extracte pujat').waitFor({ timeout: 60_000 })
  await settle(page, 600)
  await shot(page, 'extracte-pujat')
  await page.getByRole('button', { name: "D'acord" }).click()
  await settle(page, 800)
  await shot(page, 'pendents')

  await page.getByRole('tab', { name: 'Tots' }).click()
  await settle(page, 800)
  await shot(page, 'tots', { fullPage: true })

  // what was reconciled on its own, and what undoing does
  await openMovement(page, 'FRA 2026-021')
  await shot(page, 'conciliat')
  await page.keyboard.press('Escape')
  await settle(page, 400)

  await page.getByRole('tab', { name: 'Pendents' }).click()
  await settle(page, 800)

  // a proposal (same amount, dates a few days apart)
  await openMovement(page, 'INGRES PER TRANSFERENCIA')
  await shot(page, 'proposta')
  await modal(page).getByRole('button', { name: 'Accepta' }).first().click()
  await settle(page, 800)

  // a partial payment
  await openMovement(page, 'SANTA MOSTRA')
  await shot(page, 'parcial')
  await modal(page).getByRole('button', { name: 'Accepta' }).first().click()
  await settle(page, 800)

  // two lines picked by hand
  await openMovement(page, 'LA SINIA DIETES')
  for (const code of ['2026-150', '2026-152']) {
    await modal(page).getByPlaceholder('Cerca per document, contacte o import').fill(code)
    await page.waitForTimeout(600)
    await settle(page, 600)
    await modal(page).locator('.recon-candidates tbody tr', { hasText: code }).filter({ hasText: 'Despesa' }).first()
      .locator('.b-checkbox').click()
  }
  await settle(page, 400)
  await modal(page).locator('.recon-sum').scrollIntoViewIfNeeded()
  await shot(page, 'tria-linies')
  await modal(page).getByRole('button', { name: 'Concilia amb les línies triades' }).click()
  await settle(page, 800)

  // a paid expense from a movement without document
  await openMovement(page, 'PAPERERIA')
  const detail = modal(page)
  await field(detail, 'Crea').locator('select').selectOption('expense')
  await field(detail, 'Concepte').locator('input').fill('Material d\'oficina')
  await field(detail, 'Projecte').locator('select').selectOption({ index: 1 })
  await field(detail, 'Proveïdora').locator('select').selectOption({ index: 1 })
  await field(detail, 'Tipus de despesa').locator('select').selectOption({ index: 1 })
  await detail.getByRole('button', { name: /Crea la despesa/ }).scrollIntoViewIfNeeded()
  await settle(page, 400)
  await shot(page, 'sense-document')
  await detail.getByRole('button', { name: /Crea la despesa/ }).click()
  await settle(page, 800)

  await page.getByRole('tab', { name: 'Regles' }).click()
  await settle(page, 600)
  await shot(page, 'regles')

  await page.getByRole('tab', { name: 'Extractes' }).click()
  await settle(page, 600)
  await shot(page, 'extractes')
})

// chapter 22: the check on a pending document still to come asks for the day (cancelled)
test('22-tresoreria check', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '22-tresoreria', { today: '2026-06-17', firstShot: 7 })
  await login(page)
  await page.goto('/tresoreria')
  await page.getByText('Gener', { exact: true }).first().waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  const movements = page.locator('h2', { hasText: 'Moviments bancaris' }).first()
  await movements.scrollIntoViewIfNeeded()
  await page.getByPlaceholder('Cerca concepte, projecte o contacte').fill('Fundació El Rebost')
  await settle(page, 800)
  await page.locator('tr', { hasText: '2026-040' }).first().locator('.b-checkbox').click()
  await page.getByText("Data en què s'ha cobrat").waitFor()
  await settle(page, 500)
  await shot(page, 'marcar-cobrat')
  await page.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 400)
})
