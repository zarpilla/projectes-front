// «IRPF» (#/irpf) «Salda» (issues/419): a received invoice with IRPF dated in an
// earlier quarter and not settled is pending and goes into the next model 111
// declaration; ticked and settled on a date, it is paid on that date, in the page
// and in Tresoreria. Several quarters can be picked at once (issues/418).
//
// Writes on the throwaway e2e database (a project, a contact, a received invoice).
import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, NAME, visit, settle, button, isoToday,
  createProject, contactWithNif, createReceivedInvoice, treasuryRows
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} irpf`
const EXPENSE = `${NAME} despesa amb IRPF`
const YEAR = new Date().getFullYear()
const QUARTER = Math.ceil((new Date().getMonth() + 1) / 3)

const irpfRow = async id => (await api('GET', `treasuries/irpf?year=${YEAR}`)).rows.find(r => r.key === `received-invoices:${id}`)
// the document's row on the page, with the given quarters picked
async function pageRow (id, quarters) {
  await visit('/irpf')
  for (const q of quarters) await page.locator('.quarter-toggle button', { hasText: `T${q}` }).click()
  const row = page.locator('.irpf-documents tbody tr').filter({ has: page.locator(`a[href$="/document/${id}/received-invoices"]`) })
  await expect(row).toHaveCount(1)
  return row
}

test('a received invoice with IRPF of an earlier quarter is pending, into the next declaration', async () => {
  test.skip(QUARTER === 1, 'needs a quarter before the current one')
  state.projectId = await createProject(PROJECT, { expenses: [{ concept: EXPENSE, quantity: 1, price: 1000 }] })
  const contact = await contactWithNif('irpf')
  const id = await createReceivedInvoice({
    contact,
    projectName: PROJECT,
    budgetConcept: EXPENSE,
    number: `${NAME}-IRPF`,
    date: `10/1/${YEAR}`,
    line: { concept: `${NAME} assessoria`, quantity: 1, price: 1000, vat: 21, irpf: 15 }
  })
  const invoice = await api('GET', `received-invoices/${id}`)
  expect([Number(invoice.total_irpf), invoice.irpf_paid_date]).toEqual([150, null])
  state.invoiceId = id

  const row = await irpfRow(id)
  expect(row).toMatchObject({ quarter: 1, irpf: 150, paid: false, late: true, deadline: `${YEAR}-04-20` })
  expect(row.payment_date >= isoToday()).toBe(true)
  // Tresoreria: pending, on the next declaration date
  const [irpf] = (await treasuryRows(`/document/${id}/received-invoices`, [YEAR, YEAR + 1])).filter(r => r.type === 'IRPF Factura')
  expect([irpf.paid, irpf.datef]).toEqual([false, row.payment_date.replace(/-/g, '')])
})

test('«Salda» settles the invoices ticked, from several quarters, on the date chosen', async () => {
  test.skip(!state.invoiceId, 'needs the invoice')
  const id = state.invoiceId
  const row = await pageRow(id, [1, QUARTER])
  await expect(row).toContainText('Pendent, fora de termini')
  await expect(page.locator('.irpf-page h2', { hasText: `Detall del T1 i T${QUARTER}` })).toBeVisible()
  await row.locator('td.checkbox-cell .checkbox').click()
  const bar = page.locator('.settle-bar')
  await expect(bar).toContainText('1 document')
  await expect(bar).toContainText('150,00 €')

  const answered = page.waitForResponse(r => r.url().includes('treasuries/irpf/settle') && r.request().method() === 'POST')
  await button('Salda 1 document').click()
  const answer = await (await answered).json()
  expect(answer).toMatchObject({ count: 1, total: 150, date: isoToday() })
  await settle(800)

  expect((await api('GET', `received-invoices/${id}`)).irpf_paid_date).toBe(isoToday())
  expect(await irpfRow(id)).toMatchObject({ paid: true, settled_date: isoToday(), payment_date: isoToday() })
  const [irpf] = (await treasuryRows(`/document/${id}/received-invoices`)).filter(r => r.type === 'IRPF Factura')
  expect([irpf.paid, irpf.datef]).toEqual([true, isoToday().replace(/-/g, '')])
  // settled: no checkbox to tick any more
  const again = await pageRow(id, [1])
  await expect(again).toContainText('Saldat')
  await expect(again.locator('td.checkbox-cell input')).toBeDisabled()
  // settling it again changes nothing
  expect(await api('POST', 'treasuries/irpf/settle', { receivedInvoices: [id], irpf_paid_date: `${YEAR}-01-01` })).toMatchObject({ count: 0 })
})
