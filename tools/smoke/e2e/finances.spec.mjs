// Finances: what a project's budget and its documents do to the reports. «Previsió»
// (#/previsio) and «Previsió de facturació» (#/previsio-facturacio) read the plan;
// «IVA» (#/iva) the planned lines and the documents; then an issued invoice's PDF,
// its rectificative ("Anul·la i rectifica…"), a diet ("Nova Dieta") saved for real,
// a payroll advance ("Bestreta") marked paid, and settling the VAT in «IVA» («Salda»):
// the settle box follows Configuració's «% IVA deduïble», a year's % deducts that part
// of the supported VAT, and the settled documents leave «Documents pendents» with an
// «IVA Saldat» treasury movement (deleted, and the % restored, at the end).
//
// Issuing is irreversible (see money.spec.mjs): fine on the throwaway e2e database.
// The rectificative needs a series flagged rectificative: it is created when there
// is none (and kept, an issued invoice uses it).

import { test, expect } from '@playwright/test'
import {
  useE2E, onCleanup, page, API_URL, state, api, NAME, STAMP, visit, settle, field, button, card, modal,
  expectSnackbar, pickAutocomplete, typeDate, today, isoToday, parseNumber,
  createProject, addPhase, addLine, contactWithNif, createEmittedInvoice, createReceivedInvoice, assignBudgetLine, treasuryRows
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} finances`
const INCOME = `${NAME} ingrés previst`
const RECTIFIED = `${NAME} ingrés a rectificar`
const EXPENSE = `${NAME} despesa prevista`
const DIET = `${NAME} despesa dieta`
const YEAR = new Date().getFullYear()
const idOf = relation => relation?.id ?? relation

// «Previsió»: the "Ingressos" and "Despeses" of each year in «Resum de la previsió»
async function forecastFigures () {
  await visit('/previsio')
  const table = page.locator('table.forecast-table')
  await expect(table).toBeVisible()
  const years = (await table.locator('thead th').allInnerTexts()).slice(1).map(t => t.trim())
  const row = async label => (await table.locator('tbody tr').filter({
    has: page.locator('th', { hasText: new RegExp(`^\\s*${label}\\s*$`) })
  }).first().locator('td').allInnerTexts()).map(t => parseNumber(t.replace('−', '-')))
  const [incomes, expenses] = [await row('Ingressos'), await row('Despeses')]
  return Object.fromEntries(years.filter(y => /^\d{4}$/.test(y)).map((y, i) => [y, { incomes: incomes[i], expenses: expenses[i] }]))
}

// «Previsió de facturació»: 12 months, the project's rows after a search, every group open
async function invoicingForecastProject () {
  await visit('/previsio-facturacio')
  await page.getByRole('group', { name: 'Horitzó' }).getByRole('button', { name: '12 mesos' }).click()
  await page.getByRole('searchbox', { name: 'Cerca' }).fill(PROJECT)
  await settle(300)
  const closed = page.locator('table.if-table tr.if-group button.if-toggle[aria-expanded="false"]')
  while (await closed.count()) await closed.first().click()
  return page.locator('table.if-table tbody tr').filter({ has: page.getByRole('link', { name: PROJECT, exact: true }) })
}

// «IVA»: one of the views ("Documents pendents", "Documents previstos"...) and its rows
async function vatView (name) {
  await visit('/iva')
  await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click()
  const box = page.locator('section.list-box').filter({ visible: true }).first()
  await expect(box).toBeVisible()
  return box.locator('tbody tr')
}

// the row of a document in «Documents pendents» (codes repeat across types)
const documentRow = (rows, id, type) => rows.filter({ has: page.locator(`a[href$="/document/${id}/${type}"]`) })

// the budget line `concept` of the project (execution budget)
async function phaseLine (kind, concept) {
  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  return phases.flatMap(p => p[kind]).find(l => l.concept === concept)
}

test('a new project\'s budget adds to «Previsió»', async () => {
  const before = await forecastFigures()
  state.projectId = await createProject(PROJECT, {
    incomes: [{ concept: INCOME, quantity: 2, price: 500 }],
    expenses: [{ concept: EXPENSE, quantity: 1, price: 400 }]
  })
  // a second phase in the execution budget, for the rectificative and the diet
  await visit(`/projecte/${state.projectId}?tab=pressupost`)
  const phase = await addPhase(card('Execució del pressupost'), `${NAME} fase 2`)
  await addLine(phase, 'income', { concept: RECTIFIED, quantity: 1, price: 200 })
  await addLine(phase, 'expense', { concept: DIET, quantity: 1, price: 50 })
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  await settle()
  state.contact = await contactWithNif()
  const line = await phaseLine('incomes', INCOME)
  state.lineYear = (line.date_estimate_document || line.date).slice(0, 4)

  const after = await forecastFigures()
  const was = before[state.lineYear] || { incomes: 0, expenses: 0 }
  expect(after[state.lineYear], `a ${state.lineYear} column`).toBeTruthy()
  expect(after[state.lineYear].incomes - was.incomes).toBeCloseTo(1200, 2)
  // 100 % of the VAT is deductible (the seeded year): only the bases count
  expect(after[state.lineYear].expenses - was.expenses).toBeCloseTo(-450, 2)
})

test('«Previsió de facturació» lists the planned incomes not invoiced yet', async () => {
  test.skip(!state.projectId, 'needs the project')
  const rows = await invoicingForecastProject()
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('td').nth(3)).toContainText('1.200,00')
  await rows.first().getByRole('button', { name: `Línies de ${PROJECT}` }).click()
  const lines = page.locator('table.if-table tr.if-line')
  await expect(lines.filter({ hasText: INCOME })).toContainText('1.000,00')
  await expect(lines.filter({ hasText: RECTIFIED })).toContainText('200,00')

  const data = await api('GET', 'treasuries/invoicing-forecast')
  const mine = data.rows.filter(r => r.project_id === state.projectId)
  expect(mine.map(r => [r.concept, r.base]).sort()).toEqual([[RECTIFIED, 200], [INCOME, 1000]].sort())
})

test('«IVA» forecasts the VAT of the planned lines («Documents previstos»)', async () => {
  test.skip(!state.projectId, 'needs the project')
  const rows = await vatView('Documents previstos')
  const income = rows.filter({ hasText: INCOME })
  await expect(income).toHaveCount(1)
  await expect(income).toContainText('Ingrés previst')
  await expect(income).toContainText('1.000,00 €')
  await expect(income).toContainText('210,00 €')
  const expense = rows.filter({ hasText: EXPENSE })
  await expect(expense).toContainText('Despesa prevista')
  await expect(expense).toContainText('84,00 €')
})

test('an issued invoice leaves the forecasts and its VAT is pending in «IVA»', async () => {
  test.skip(!state.projectId, 'needs the project')
  const id = await createEmittedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: INCOME,
    line: { concept: `${NAME} factura`, quantity: 2, price: 500, vat: 21 }
  })
  await button('Emetre factura (convertir a EMESA)').click()
  await button("D'acord", modal('Esborranys de factures')).click()
  await expectSnackbar('Factura emesa correctament')
  await settle()
  const invoice = await api('GET', `emitted-invoices/${id}`)
  expect([invoice.state, invoice.total_base, invoice.total_vat, invoice.total]).toEqual(['real', 1000, 210, 1210])
  state.invoice = invoice

  // the planned income is invoiced: it is neither pending invoicing nor expected VAT
  const rows = await invoicingForecastProject()
  await rows.first().getByRole('button', { name: `Línies de ${PROJECT}` }).click()
  const lines = page.locator('table.if-table tr.if-line')
  await expect(lines.filter({ hasText: RECTIFIED })).toHaveCount(1)
  await expect(lines.filter({ hasText: INCOME })).toHaveCount(0)
  expect((await api('GET', 'treasuries/invoicing-forecast')).rows.filter(r => r.project_id === state.projectId).map(r => r.concept)).toEqual([RECTIFIED])
  await expect((await vatView('Documents previstos')).filter({ hasText: INCOME })).toHaveCount(0)

  // the invoice's VAT is due («Documents pendents»), with its base
  const pending = documentRow(await vatView('Documents pendents'), id, 'emitted-invoices')
  await expect(pending).toHaveCount(1)
  await expect(pending).toContainText(invoice.code)
  await expect(pending).toContainText('Factura emesa')
  await expect(pending).toContainText(`T${Math.ceil((new Date().getMonth() + 1) / 3)}`)
  await expect(pending).toContainText('1.000,00 €')
  await expect(pending).toContainText('210,00 €')
})

test('a received invoice\'s VAT is pending in «IVA» as supported VAT', async () => {
  test.skip(!state.projectId, 'needs the project')
  const id = await createReceivedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: EXPENSE,
    number: `${NAME}-F1`,
    line: { concept: `${NAME} compra`, quantity: 1, price: 400, vat: 21 }
  })
  const invoice = await api('GET', `received-invoices/${id}`)
  expect([invoice.total_base, invoice.total_vat, invoice.total]).toEqual([400, 84, 484])
  state.received = invoice
  const pending = documentRow(await vatView('Documents pendents'), id, 'received-invoices')
  await expect(pending).toHaveCount(1)
  await expect(pending).toContainText(invoice.code)
  await expect(pending).toContainText('Factura rebuda')
  await expect(pending).toContainText('400,00 €')
  await expect(pending).toContainText('84,00 €')
  // supported VAT is deductible, 100 % in the seeded year
  await expect(pending).toContainText(/\b100(,00)? %/)
  await expect((await vatView('Documents previstos')).filter({ hasText: EXPENSE })).toHaveCount(0)
})

test('the PDF of an issued invoice', async () => {
  test.skip(!state.invoice, 'needs the issued invoice')
  await visit(`/document/${state.invoice.id}/emitted-invoices`)
  const generated = page.waitForResponse(r => r.url().includes(`/emitted-invoices/pdf/emitted-invoice/${state.invoice.id}`))
  const popup = page.context().waitForEvent('page')
  await button('PDF').click()
  const response = await generated
  expect(response.status()).toBe(200)
  const { url } = await response.json()
  ;(await popup).close().catch(() => {})
  const file = await fetch(`${API_URL}${url}`)
  expect(file.status).toBe(200)
  expect(file.headers.get('content-type')).toMatch(/application\/pdf/)
  const bytes = Buffer.from(await file.arrayBuffer())
  expect(bytes.length).toBeGreaterThan(1000)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
})

test('«Anul·la i rectifica…» issues a rectificative with the amounts negated', async () => {
  test.skip(!state.invoice, 'needs the issued invoice')
  const series = await api('GET', 'series?_limit=-1')
  if (!series.some(s => s.rectificative && String(s.name).includes(String(YEAR)))) {
    await api('POST', 'series', { data: { name: `R${YEAR}`, rectificative: true, leadingZeros: 3, emitted_invoice_number: 0 } })
  }
  await visit(`/document/${state.invoice.id}/emitted-invoices`)
  await button('Anul·la i rectifica…').click()
  await settle()
  // a new draft: the same lines with negative quantities
  await expect(card('Línies').locator('input[name="Unitats"]').first()).toHaveValue(/^[-−]2$/)
  await assignBudgetLine(RECTIFIED)
  await button('Guardar').click()
  await button("D'acord", modal('Esborranys de factures')).click()
  await expect(page).toHaveURL(new RegExp(`/document/(?!${state.invoice.id}/)[1-9]\\d*/emitted-invoices`), { timeout: 20_000 })
  await expectSnackbar('Guardat')
  await settle()
  const id = Number(page.url().match(/\/document\/(\d+)\//)[1])
  await button('Emetre factura (convertir a EMESA)').click()
  await button("D'acord", modal('Esborranys de factures')).click()
  await expectSnackbar('Factura emesa correctament')
  await settle()

  const rectificative = await api('GET', `emitted-invoices/${id}`)
  const serie = await api('GET', `series/${idOf(rectificative.serial)}`)
  expect(serie.rectificative).toBe(true)
  expect(rectificative.state).toBe('real')
  expect(idOf(rectificative.rectified_invoice)).toBe(state.invoice.id)
  expect([rectificative.total_base, rectificative.total_vat, rectificative.total]).toEqual([-1000, -210, -1210])
  expect(rectificative.code.startsWith(`${serie.name}-`)).toBe(true)
  state.rectificative = rectificative
  expect(rectificative.lines.map(l => [l.concept, Number(l.quantity), Number(l.base)])).toEqual([[`${NAME} factura`, -2, 500]])
  expect(idOf((await phaseLine('incomes', RECTIFIED)).invoice)).toBe(id)
  // the rectified invoice is left as it was
  const original = await api('GET', `emitted-invoices/${state.invoice.id}`)
  expect([original.state, original.code, original.total]).toEqual(['real', state.invoice.code, 1210])
  expect(idOf((await phaseLine('incomes', INCOME)).invoice)).toBe(state.invoice.id)
  // its VAT subtracts in «IVA»
  const pending = documentRow(await vatView('Documents pendents'), id, 'emitted-invoices')
  await expect(pending).toContainText('-210,00 €')
})

test('a diet ("Nova Dieta") is saved with its kilometres and goes to Tresoreria', async () => {
  test.skip(!state.projectId, 'needs the project')
  // the person of a diet is a contact linked to a user, with a NIF
  ;[state.member] = await api('GET', `contacts?_where[users_permissions_user]=${state.me.id}&_sort=id:ASC&_limit=1`)
  state.member ??= await api('POST', 'contacts', { data: { name: `${NAME} sòcia`, nif: `E2ES${STAMP}`, users_permissions_user: state.me.id } })
  if (!state.member.nif) await api('PUT', `contacts/${state.member.id}`, { data: { nif: `E2ES${STAMP}` } })

  await visit('/document/0/received-expenses?document_type=4')
  const diet = modal('Nova Dieta')
  await expect(diet).toBeVisible()
  await expect(field('Persona', diet).locator('input')).not.toHaveValue('')
  await pickAutocomplete('Projecte', PROJECT, PROJECT, diet)
  await field('Concepte', diet).locator('input').fill(`${NAME} dieta`)
  await field('Quilòmetres', diet).locator('input').fill('100')
  // 0,26 €/km without IRPF + 0,06 €/km with it (the seeded rates)
  await expect(diet).toContainText('Total: 32.00 €')
  await button('Crear Dieta', diet).click()
  await expect(diet).toBeHidden()
  await settle()
  await assignBudgetLine(DIET)
  await button('Guardar').click()
  await expect(page).toHaveURL(/\/document\/[1-9]\d*\/received-expenses/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  const id = Number(page.url().match(/\/document\/(\d+)\//)[1])

  const expense = await api('GET', `received-expenses/${id}`)
  expect(idOf(expense.document_type)).toBe(4)
  expect(idOf(expense.contact)).toBe(state.member.id)
  expect(expense.emitted).toBe(isoToday())
  expect(expense.lines.map(l => [l.concept, Number(l.quantity), Number(l.base)])).toEqual([
    [`${NAME} dieta - sense IRPF`, 100, 0.26],
    [`${NAME} dieta - amb IRPF`, 100, 0.06]
  ])
  expect([expense.total_base, expense.total_vat, expense.total].map(Number)).toEqual([32, 0, 32])
  expect(expense.projects.map(p => p.id)).toEqual([state.projectId])
  const line = await phaseLine('expenses', DIET)
  expect(idOf(line.expense)).toBe(id)

  const rows = await treasuryRows(`/document/${id}/received-expenses`)
  expect(rows.map(r => [r.type, r.total_amount])).toEqual([['Despesa rebuda (Dieta)', -32]])
})

test('a payroll advance marked paid ("Pagada") is paid in Tresoreria', async () => {
  const [year] = await api('GET', `years?_where[year]=${YEAR}&_limit=1`)
  const [month] = await api('GET', `months?_where[month]=${new Date().getMonth() + 1}&_limit=1`)
  const day = isoToday()
  const payroll = await api('POST', 'payrolls', {
    data: {
      users_permissions_user: state.me.id,
      year: year.id,
      month: month?.id,
      emitted: day,
      paid: false,
      total_base: 1000,
      net_base: 850,
      net_date: day,
      irpf_base: 150,
      irpf_date: day,
      ss_base: 300,
      ss_date: day,
      other_base: 0,
      total: 1300
    }
  })
  onCleanup(() => api('DELETE', `payrolls/${payroll.id}`))
  const to = `/document/${payroll.id}/payrolls`
  const types = async () => Object.fromEntries((await treasuryRows(to)).map(r => [r.type, [r.total_amount, r.paid]]))
  expect(await types()).toMatchObject({ 'Nòmina esperada': [-850, false], 'IRPF Nòmina': [-150, false] })

  await visit(to)
  const paid = field('Pagada')
  await paid.locator('.checkbox').first().click()
  await typeDate(paid.locator('input[type=text], input:not([type])').first(), today())
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  const saved = await api('GET', `payrolls/${payroll.id}`)
  expect([saved.paid, saved.paid_date, Number(saved.net_base)]).toEqual([true, day, 850])
  expect(await types()).toMatchObject({ 'Nòmina pagada': [-850, true], 'IRPF Nòmina': [-150, true] })
})

// --- settling the VAT («Salda», #/iva) -----------------------------------------------
// «Salda N documents» marks the checked «Documents pendents» as settled (vat_paid_date,
// and the % deducted) and books the balance as one «IVA Saldat» treasury movement:
// −(repercutit − suportat × the year's deductible %). The year's % (Taules auxiliars ›
// Anys) is the one deducted; Configuració's «% IVA deduïble» only shows the settle box.

// the VAT part of the forecast #/vat reads
async function vatFigures () {
  const states = (await api('GET', 'project-states?_limit=-1')).map(s => s.id).join(',')
  return (await api('GET', `treasuries/forecast?_limit=-1&project_states=${states}&year=${YEAR}&periodification=null`)).vat
}
const vatKpi = label => page.locator('.doc-kpi').filter({ has: page.locator('span', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) }).locator('b')
const kpiValue = async label => parseNumber((await vatKpi(label).innerText()).replace('−', '-'))
// vat_paid_date is a datetime: the day it falls on in Madrid
const madridDay = value => value && new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
const settledMovements = async () => api('GET', `treasuries?_where[comment]=${encodeURIComponent('IVA Saldat')}&_sort=id:ASC&_limit=-1`)

// checks the rows in «Documents pendents» and settles them with «Salda N documents»
async function settleVat (docs) {
  const rows = await vatView('Documents pendents')
  for (const [id, type] of docs) await documentRow(rows, id, type).locator('td.checkbox-cell .checkbox').click()
  const before = (await settledMovements()).map(m => m.id)
  // the screen reloads itself once the API answers; a missed reload shouldn't hang the run
  const answered = page.waitForResponse(r => r.url().includes('emitted-invoices/pay-vat-ids') && r.request().method() === 'POST')
  const reloaded = page.waitForEvent('load', { timeout: 20_000 }).catch(() => null)
  await button(`Salda ${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`).click()
  expect((await answered).ok(), 'pay-vat-ids answered').toBe(true)
  if (!(await reloaded)) await visit('/iva')
  await settle(1500)
  const created = (await settledMovements()).filter(m => !before.includes(m.id))
  for (const m of created) onCleanup(() => api('DELETE', `treasuries/${m.id}`))
  return created
}

test('«IVA» offers settling only with a deductible % in Configuració', async () => {
  const me = await api('GET', 'me?populate=options')
  const pct = me.options?.deductible_vat_pct
  onCleanup(() => api('PUT', 'me', { data: { options: { ...me.options, id: undefined } } }))
  const setPct = async value => {
    await visit('/administracio/configuracio')
    await field('% IVA deduïble').locator('input').fill(String(value))
    await button('Guardar').click()
    await expectSnackbar('Guardat correctament')
    expect(Number((await api('GET', 'me?populate=options')).options.deductible_vat_pct)).toBe(value)
  }
  await setPct(0)
  await visit('/iva')
  await expect(page.getByRole('tab', { name: /^Documents pendents/ })).toBeVisible()
  await expect(card('IVA pendent de saldar')).toHaveCount(0)
  await expect(vatKpi('Saldo executat')).toHaveCount(0)

  await setPct(Number(pct) > 0 ? Number(pct) : 100)
  await visit('/iva')
  const box = card('IVA pendent de saldar')
  await expect(box).toBeVisible()
  // the «Executat» row and the figures are the forecast's
  const vat = await vatFigures()
  const executed = box.locator('tbody tr').filter({ has: page.locator('th', { hasText: 'Executat' }) }).locator('td')
  expect((await executed.allInnerTexts()).map(t => parseNumber(t.replace('−', '-')))).toEqual([
    expect.closeTo(vat.paid, 2), expect.closeTo(vat.received, 2), expect.closeTo(vat.deductible_vat_pct, 2), expect.closeTo(vat.deductible_vat, 2)
  ])
  expect(await kpiValue('Saldo executat')).toBeCloseTo(vat.deductible_vat, 2)
  // nothing checked, nothing to settle
  await expect(button('Salda')).toBeDisabled()
})

test('a year\'s deductible % deducts that part of the supported VAT, and «Salda» books it', async () => {
  test.skip(!state.received, 'needs the received invoice')
  const received = state.received
  const [year] = await api('GET', `years?_where[year]=${YEAR}&_limit=1`)
  onCleanup(() => api('PUT', `years/${year.id}`, { data: { deductible_vat_pct: year.deductible_vat_pct } }))
  await api('PUT', `years/${year.id}`, { data: { deductible_vat_pct: 50 } })

  // half of the supported VAT pending this year is deducted
  const vat = await vatFigures()
  const supported = vat.documents.filter(d => ['received-invoices', 'received-expenses'].includes(d.type))
  const repercussed = vat.documents.filter(d => !supported.includes(d))
  const sum = (docs, f = () => 1) => docs.reduce((acc, d) => acc + d.total_vat * f(d), 0)
  expect(supported.filter(d => d.date.startsWith(String(YEAR))).map(d => d.theoretical_deductible_vat_pct)).toEqual(expect.arrayContaining([50]))
  expect(supported.filter(d => d.date.startsWith(String(YEAR)) && d.theoretical_deductible_vat_pct !== 50)).toEqual([])
  expect(vat.deductible_vat).toBeCloseTo(sum(supported, d => d.theoretical_deductible_vat_pct / 100) - sum(repercussed), 2)
  const row = documentRow(await vatView('Documents pendents'), received.id, 'received-invoices')
  await expect(row).toContainText(/\b50(,00)? %/)
  expect(await kpiValue('Saldo executat')).toBeCloseTo(vat.deductible_vat, 2)
  const paidBefore = await kpiValue('IVA suportat')

  // settled: 42 € of the 84 € come back (a positive movement), the invoice keeps its 50 %
  const created = await settleVat([[received.id, 'received-invoices']])
  expect(created.map(m => [Number(m.total), m.date])).toEqual([[42, isoToday()]])
  const saved = await api('GET', `received-invoices/${received.id}`)
  expect([madridDay(saved.vat_paid_date), Number(saved.deductible_vat_pct)]).toEqual([isoToday(), 50])
  await expect(documentRow(await vatView('Documents pendents'), received.id, 'received-invoices')).toHaveCount(0)
  expect(await kpiValue('IVA suportat')).toBeCloseTo(paidBefore - 84, 2)
  expect((await vatFigures()).deductible_vat).toBeCloseTo(vat.deductible_vat - 42, 2)

  // settled once: asking again books nothing
  await api('POST', 'emitted-invoices/pay-vat-ids', { emittedInvoices: [], receivedIncomes: [], receivedInvoices: [received.id], receivedExpenses: [], vat_paid_date: isoToday() })
  expect((await settledMovements()).filter(m => m.id > created[0].id)).toEqual([])
})

test('«Salda» an issued invoice books its VAT to pay, its rectificative gives it back', async () => {
  test.skip(!state.rectificative, 'needs the issued invoice and its rectificative')
  const rectificative = state.rectificative
  const balance = (await vatFigures()).deductible_vat

  // issued VAT is never deducted: −210 € to pay
  const toPay = await settleVat([[state.invoice.id, 'emitted-invoices']])
  expect(toPay.map(m => [Number(m.total), m.date])).toEqual([[-210, isoToday()]])
  const saved = await api('GET', `emitted-invoices/${state.invoice.id}`)
  expect([madridDay(saved.vat_paid_date), Number(saved.deductible_vat_pct)]).toEqual([isoToday(), 100])
  const rows = await vatView('Documents pendents')
  await expect(documentRow(rows, state.invoice.id, 'emitted-invoices')).toHaveCount(0)
  await expect(documentRow(rows, rectificative.id, 'emitted-invoices')).toHaveCount(1)
  expect(await kpiValue('Saldo executat')).toBeCloseTo(balance + 210, 2)

  const back = await settleVat([[rectificative.id, 'emitted-invoices']])
  expect(back.map(m => Number(m.total))).toEqual([210])
  expect((await vatFigures()).deductible_vat).toBeCloseTo(balance, 2)
  await expect(documentRow(await vatView('Documents pendents'), rectificative.id, 'emitted-invoices')).toHaveCount(0)
})
