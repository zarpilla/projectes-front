// Partial collections and payments (issues/412): an invoice collected in several
// goes and a received invoice paid in instalments, from the document form to the
// Ingressos / Despeses lists and Tresoreria.
//
// The invoice is issued ("Emetre factura") so that the list shows its state and
// not «Esborrany»: fine on the throwaway e2e copy (VeriFactu "no", FACe off).

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, NAME, visit, settle, field, button, modal,
  expectSnackbar, typeDate, today, isoToday,
  createProject, contactWithNif, createEmittedInvoice, createReceivedInvoice, treasuryRows
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} parcials`

const partialRows = () => page.locator('.partial-payment-row')
const amountOf = row => row.locator('input[type=number]')

// the list row of a document, found by a text only it has
async function listRow (route, text) {
  await visit(route)
  await settle(1000)
  return page.locator('tbody tr', { hasText: text }).first()
}

test('setup: a project and a contact', async () => {
  state.projectId = await createProject(PROJECT, {
    incomes: [{ concept: 'Ingrés parcial', quantity: 1, price: 1000 }],
    expenses: [{ concept: 'Despesa parcial', quantity: 1, price: 500 }]
  })
  state.contact = await contactWithNif('parcials')
})

test('an issued invoice collected in part: «Parcial», what is pending, two movements in Tresoreria', async () => {
  test.skip(!state.projectId, 'needs the project')
  const id = await createEmittedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: 'Ingrés parcial',
    line: { concept: `${NAME} cobrament parcial`, quantity: 1, price: 1000, vat: 21 }
  })
  await button('Emetre factura (convertir a EMESA)').click()
  await button("D'acord", modal('Esborranys de factures')).click()
  await expectSnackbar('Factura emesa correctament')
  await settle()
  const issued = await api('GET', `emitted-invoices/${id}`)
  expect([issued.state, issued.total]).toEqual(['real', 1210])
  state.invoice = issued

  // a new entry proposes today and everything still pending
  await button('Afegeix un cobrament parcial').click()
  await expect(partialRows()).toHaveCount(1)
  await expect(amountOf(partialRows().first())).toHaveValue('1210')
  await amountOf(partialRows().first()).fill('600')
  const box = field('Cobraments parcials')
  await expect(box).toContainText('pendent 610')
  // «Cobrada» follows from the entries
  await expect(field('Cobrada').locator('input[type=checkbox]')).toBeDisabled()
  await button('Guardar').click()
  await expectSnackbar('Guardat')

  const saved = await api('GET', `emitted-invoices/${id}`)
  expect(saved.partial_payments.map(p => [p.date, p.amount])).toEqual([[isoToday(), 600]])
  expect([saved.paid, saved.paid_date ?? null]).toEqual([false, null])

  const to = `/document/${id}/emitted-invoices`
  expect((await treasuryRows(to)).map(r => [r.type, r.total_amount, r.paid])).toEqual([
    ['Factura cobrada (parcial)', 600, true],
    ['Factura emesa (pendent)', 610, false]
  ])

  const row = await listRow('/factures-emeses', issued.code)
  await expect(row).toContainText('Parcial')
  await expect(row).toContainText('pendent 610')
})

test('entries over the total are refused, in the form and by the API', async () => {
  test.skip(!state.invoice, 'needs the invoice')
  const id = state.invoice.id
  await visit(`/document/${id}/emitted-invoices`)
  await button('Afegeix un cobrament parcial').click()
  await expect(partialRows()).toHaveCount(2)
  await amountOf(partialRows().nth(1)).fill('700')
  await expect(field('Cobraments parcials')).toContainText('superen el total')
  await button('Guardar').click()
  await expectSnackbar('superen el total del document')

  const refused = await api('PUT', `emitted-invoices/${id}`, {
    data: { partial_payments: [{ date: isoToday(), amount: 1300 }] }
  }, { raw: true })
  expect(refused.status).toBe(400)
  const after = await api('GET', `emitted-invoices/${id}`)
  expect(after.partial_payments.map(p => p.amount)).toEqual([600])
})

test('once the entries reach the total the invoice is collected, on the last date', async () => {
  test.skip(!state.invoice, 'needs the invoice')
  const id = state.invoice.id
  await visit(`/document/${id}/emitted-invoices`)
  await button('Afegeix un cobrament parcial').click()
  // proposes what is pending: 610
  await expect(amountOf(partialRows().nth(1))).toHaveValue('610')
  await typeDate(partialRows().nth(1).locator('.datepicker input').first(), today())
  await button('Guardar').click()
  await expectSnackbar('Guardat')

  const paid = await api('GET', `emitted-invoices/${id}`)
  expect([paid.paid, paid.paid_date]).toEqual([true, isoToday()])
  expect((await treasuryRows(`/document/${id}/emitted-invoices`)).map(r => [r.type, r.total_amount])).toEqual([
    ['Factura cobrada (parcial)', 600],
    ['Factura cobrada (parcial)', 610]
  ])
  const row = await listRow('/factures-emeses', state.invoice.code)
  await expect(row).toContainText('Cobrada')
})

test('a received invoice paid in part: each payment validated on its own, the rest pending', async () => {
  test.skip(!state.projectId, 'needs the project')
  const number = `${NAME}-P1`
  const id = await createReceivedInvoice({
    contact: state.contact,
    projectName: PROJECT,
    budgetConcept: 'Despesa parcial',
    number,
    line: { concept: `${NAME} pagament parcial`, quantity: 1, price: 500, vat: 21 }
  })
  expect((await api('GET', `received-invoices/${id}`)).total).toBe(605)

  await button('Afegeix un pagament parcial').click()
  await amountOf(partialRows().first()).fill('300')
  await expect(field('Pagaments parcials')).toContainText('pendent 305')
  await button('Guardar').click()
  await expectSnackbar('Guardat')

  const saved = await api('GET', `received-invoices/${id}`)
  const [payment] = saved.partial_payments
  expect([payment.amount, saved.paid]).toEqual([300, false])

  // Tresoreria validates the payment, not the document
  await api('POST', 'treasury-validations/toggle', {
    entity_type: 'received-invoices', entity_id: id, sub_type: `payment-${payment.id}`
  })
  const to = `/document/${id}/received-invoices`
  expect((await treasuryRows(to)).map(r => [r.type, r.total_amount, r.validation_key ?? null, r.is_validated])).toEqual([
    ['Factura pagada (parcial)', -300, `received-invoices:${id}:payment-${payment.id}`, true],
    ['Factura rebuda (pendent)', -305, null, false]
  ])

  const row = await listRow('/factures-rebudes', number)
  await expect(row).toContainText('Parcial')
  await expect(row).toContainText('pendent 305')
})
