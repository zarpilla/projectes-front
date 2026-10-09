// Money: issuing an invoice (numbering, locks), payments and IRPF in Tresoreria,
// manual treasury movements, quotes, and creating a contact from a document.
//
// Issuing ("Emetre factura") is irreversible: it uses a number of the series and the
// invoice can't be deleted. That is fine on the throwaway e2e copy, whose VeriFactu
// mode is "no" and FACe is off (nothing is sent anywhere).

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, NAME, visit, settle, field, button, card, modal,
  expectSnackbar, confirmDialog, pickAutocomplete, typeDate, today, isoToday,
  createProject, contactWithNif, createEmittedInvoice, createReceivedInvoice, fillLine,
  treasuryRows, parseNumber
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} diners`
const idOf = relation => relation?.id ?? relation

// IRPF of received invoices is paid on the 20th after the end of their quarter
function irpfDate (iso) {
  const [y, m] = iso.split('-').map(Number)
  const quarterEnd = new Date(Date.UTC(y, Math.ceil(m / 3) * 3, 0))
  quarterEnd.setUTCDate(quarterEnd.getUTCDate() + 20)
  return quarterEnd.toISOString().slice(0, 10)
}

// the "MOVIMENTS BANCARIS" rows of the e2e project
async function movementsOfProject () {
  await visit('/tresoreria')
  const filter = page.getByPlaceholder('Filtrar per projecte...')
  await filter.click()
  await filter.pressSequentially(PROJECT, { delay: 20 })
  await page.locator('.autocomplete .dropdown-item', { hasText: PROJECT }).filter({ visible: true }).first().click()
  await settle(1000)
  return card('MOVIMENTS BANCARIS').locator('tbody tr')
}

test('setup: a project and a contact', async () => {
  state.projectId = await createProject(PROJECT, {
    incomes: [{ concept: 'Ingrés factura', quantity: 1, price: 200 }],
    expenses: [{ concept: 'Despesa factura', quantity: 1, price: 100 }]
  })
  state.contact = await contactWithNif()
})

test('issuing an invoice numbers it in its series and locks it', async () => {
  test.skip(!state.projectId, 'needs the project')
  const id = await createEmittedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: 'Ingrés factura',
    line: { concept: `${NAME} servei`, quantity: 2, price: 100, vat: 21, irpf: 15 }
  })
  const draft = await api('GET', `emitted-invoices/${id}`)
  const serie = await api('GET', `series/${idOf(draft.serial)}`)
  const before = Number(serie.emitted_invoice_number) || 0

  await button('Emetre factura (convertir a EMESA)').click()
  const summary = modal('Esborranys de factures')
  await expect(summary).toContainText('212')
  await button("D'acord", summary).click()
  await expectSnackbar('Factura emesa correctament')
  await settle()
  await expect(page.locator('.tag', { hasText: /^\s*EMESA\s*$/ }).first()).toBeVisible()
  await expect(button('Eliminar esborrany')).toHaveCount(0)
  await expect(button('Anul·lar i crear factura rectificativa')).toBeVisible()

  const invoice = await api('GET', `emitted-invoices/${id}`)
  const number = before + 1
  expect([invoice.state, Number(invoice.number)]).toEqual(['real', number])
  expect(invoice.code).toBe(`${serie.name}-${String(number).padStart(Number(serie.leadingZeros) || 1, '0')}`)
  expect([invoice.total_base, invoice.total_vat, invoice.total_irpf, invoice.total]).toEqual([200, 42, 30, 212])
  expect(Number((await api('GET', `series/${serie.id}`)).emitted_invoice_number)).toBe(number)
  // the number shows in the form
  await expect(field('Número').locator('input')).toHaveValue(invoice.code)
  // VeriFactu is off in the e2e copy: nothing is queued for the tax agency
  expect(invoice.verifactu_chain ?? null).toBeNull()

  // an issued invoice can't be deleted
  const deletion = await api('DELETE', `emitted-invoices/${id}`, undefined, { raw: true })
  expect(deletion.status).toBeGreaterThanOrEqual(400)
  expect((await api('GET', `emitted-invoices/${id}`)).lines.map(l => l.concept)).toEqual([`${NAME} servei`])
  state.invoice = invoice
})

test('a collected invoice is a "Factura cobrada" movement in Tresoreria', async () => {
  test.skip(!state.invoice, 'needs the issued invoice')
  const to = `/document/${state.invoice.id}/emitted-invoices`
  expect((await treasuryRows(to)).map(r => [r.type, r.total_amount])).toEqual([['Factura emesa', 212]])

  await visit(to)
  const collected = field('Cobrada')
  await collected.locator('.checkbox').first().click()
  await typeDate(collected.locator('input[type=text], input:not([type])').first(), today())
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  const invoice = await api('GET', `emitted-invoices/${state.invoice.id}`)
  expect([invoice.paid, invoice.paid_date]).toEqual([true, isoToday()])
  // saving an issued invoice keeps what it invoiced
  expect([invoice.code, invoice.total]).toEqual([state.invoice.code, 212])
  expect(invoice.lines.map(l => [l.concept, Number(l.quantity), Number(l.base)])).toEqual([[`${NAME} servei`, 2, 100]])

  const [row] = await treasuryRows(to)
  expect([row.type, row.total_amount, row.concept, row.paid]).toEqual(['Factura cobrada', 212, state.invoice.code, true])
  // and on the screen, filtered by the project
  const rows = await movementsOfProject()
  const shown = rows.filter({ hasText: state.invoice.code })
  await expect(shown).toHaveCount(1)
  await expect(shown).toContainText('Factura cobrada')
  await expect(shown).toContainText('212,00')
})

// issues/023: an update can't change or delete the lines of an issued invoice
test('the lines of an issued invoice can\'t be changed', async () => {
  test.skip(!state.invoice, 'needs the issued invoice')
  const id = state.invoice.id
  await api('PUT', `emitted-invoices/${id}`, { data: { comments: 'canviat per API', lines: [{ concept: 'x', quantity: 1, base: 1, vat: 0, irpf: 0 }] } }, { raw: true })
  const after = await api('GET', `emitted-invoices/${id}`)
  expect([after.code, after.total, after.comments ?? null]).toEqual([state.invoice.code, 212, state.invoice.comments ?? null])
  expect(after.lines.map(l => l.concept)).toEqual([`${NAME} servei`])
})

test('a received invoice with IRPF adds the IRPF payment to Tresoreria', async () => {
  test.skip(!state.projectId, 'needs the project')
  const id = await createReceivedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: 'Despesa factura',
    number: `${NAME}-R1`,
    line: { concept: `${NAME} material`, quantity: 1, price: 100, vat: 21, irpf: 15 }
  })
  state.receivedId = id
  const invoice = await api('GET', `received-invoices/${id}`)
  expect([invoice.total_base, invoice.total_vat, invoice.total_irpf, invoice.total]).toEqual([100, 21, 15, 106])

  const due = irpfDate(isoToday())
  const rows = await treasuryRows(`/document/${id}/received-invoices`, [...new Set([new Date().getFullYear(), Number(due.slice(0, 4))])])
  const byType = Object.fromEntries(rows.map(r => [r.type, r]))
  expect(byType['Factura rebuda']?.total_amount).toBe(-106)
  expect(byType['IRPF Factura']?.total_amount).toBe(-15)
  expect(byType['IRPF Factura']?.datef).toBe(due.replace(/-/g, ''))
})

test('a manual treasury movement can be validated and deleted', async () => {
  test.skip(!state.projectId, 'needs the project')
  const concept = `${NAME} moviment`
  await visit('/tresoreria')
  const form = card('OPERACIONS DE TRESORERIA')
  await field('Data', form).locator('input').first().click()
  await page.locator('.datepicker .datepicker-cell.is-today').filter({ visible: true }).first().click()
  await field('Import', form).locator('input').first().fill('-123.45')
  await field('Concepte', form).locator('input').fill(concept)
  await pickAutocomplete('Projecte', PROJECT, PROJECT, form)
  const account = field('Compte bancari', form).locator('select').first()
  await account.selectOption(await account.locator('option:not([disabled])').first().getAttribute('value'))
  await button('Enviar', form).click()
  await expectSnackbar('Guardat')

  const [entry] = await api('GET', `treasuries?_where[comment]=${encodeURIComponent(concept)}&_limit=1`)
  expect(Number(entry.total)).toBe(-123.45)
  expect(idOf(entry.project)).toBe(state.projectId)

  const rows = await movementsOfProject()
  const row = rows.filter({ hasText: concept })
  await expect(row).toContainText('Operació de tresoreria')
  await expect(row).toContainText('-123,45')
  await row.locator('[title="Marcar com validat"] .check, [title="Marcar com validat"]').first().click()
  await settle()
  const validated = (await api('GET', `treasuries/forecast?_limit=-1&project_states=${(await api('GET', 'project-states?_limit=-1')).map(s => s.id).join(',')}&year=${new Date().getFullYear()}&periodification=null`))
    .treasury.find(r => r.treasury_id === entry.id)
  expect(validated?.is_validated).toBe(true)

  await row.locator('button[title="Eliminar"]').click()
  await confirmDialog('eliminar')
  await expectSnackbar('Eliminada')
  expect(await api('GET', `treasuries?_where[comment]=${encodeURIComponent(concept)}&_limit=1`)).toEqual([])
})

test('a quote is saved', async () => {
  test.skip(!state.projectId, 'needs the project')
  await visit('/document/0/quotes')
  await typeDate(field('Emissió').locator('input'), today())
  await pickAutocomplete('Clienta', state.contact.name)
  await pickAutocomplete('Projecte', PROJECT)
  await fillLine({ concept: `${NAME} pressupost`, quantity: 2, price: 100, discount: 10, vat: 21, irpf: 15 })
  // the form's own totals: 2 × 100 − 10 % = 180, VAT 37.80
  await expect(page.getByText(/^\s*Total\s+(217,80|234,80|190,80)\s*€\s*$/)).toBeVisible()
  await button('Guardar').click()
  await expect(page).toHaveURL(/#\/document\/[1-9]\d*\/quotes/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.quoteId = Number(page.url().match(/#\/document\/(\d+)\//)[1])

  const quote = await api('GET', `quotes/${state.quoteId}`)
  expect(quote.code).toMatch(/\S+-\d+/)
  expect(idOf(quote.contact)).toBe(state.contact.id)
  expect(quote.lines.map(l => [l.concept, Number(l.quantity), Number(l.base), Number(l.discount)])).toEqual([[`${NAME} pressupost`, 2, 100, 10]])
})

// issues/022: quotes are saved with their totals
test('a quote stores its totals (IRPF does not apply)', async () => {
  test.skip(!state.quoteId, 'needs the quote')
  const quote = await api('GET', `quotes/${state.quoteId}`)
  expect([quote.total_base, quote.total_vat, quote.total_irpf, quote.total].map(Number)).toEqual([180, 37.8, 0, 217.8])
})

// issues/024: "Nou Contacte" always opens an empty contact form
test('"Nou Contacte" next to the contact opens an empty contact form', async () => {
  test.skip(!state.receivedId, 'needs a saved document')
  // a new document, and an existing one (the button must not open the contact
  // whose id happens to be the document's)
  for (const route of ['/document/0/received-invoices', `/document/${state.receivedId}/received-invoices`]) {
    await visit(route)
    const popup = page.context().waitForEvent('page')
    await page.locator('button[title="Nou Contacte"]').filter({ visible: true }).first().click()
    const tab = await popup
    await tab.waitForLoadState()
    expect(tab.url(), `from ${route}`).toMatch(/#\/contact\/0$/)
    await tab.close()
  }
})
