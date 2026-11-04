// IVA › «Models 303 i 390» (Beta, #/iva?pestanya=models): the quarter's boxes add
// up the invoices of the period (a received invoice at 21 % in 28/29, after the
// year's «% IVA deduïble»), the 0 % lines wait in «Per revisar» until they are
// classified from the detail (an intra-EU purchase of goods self-assessed at the
// chosen rate: 10/11 and 36/37; an issued service to an EU client with the
// proposal, not subject by place of supply: 120), marking the quarter as filed
// keeps its boxes and warns when a document changes afterwards, and «Fitxer per
// a l'AEAT» downloads the 303 in the AEAT's register design. Added 2026-11-04:
// the AEAT's PDF is attached to the filed quarter (and goes with it when it is
// unmarked), and «PDF del model» downloads the quarter as a PDF.
//
// Added 2026-11-04 with the validation of branch model-303. Works on the
// current quarter, whatever else the database has in it: the boxes are compared
// with what they were before this run (deltas), and the quarter is unmarked at
// the end. Issuing the 0 % invoice uses a number of its series (throwaway DB).

import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { useE2E, onCleanup, page, api, API_URL, NAME, STAMP, visit, settle, button, modal, isoToday, parseNumber, contactWithNif } from './helpers.mjs'

useE2E()

const YEAR = new Date().getFullYear()
const QUARTER = Math.floor(new Date().getMonth() / 3) + 1
const PERIOD = `${QUARTER}T`
const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100

const models = () => api('GET', `treasuries/vat-models?year=${YEAR}`)
const quarterOf = data => data.quarters[QUARTER - 1]
const rowOf = (data, kind, id) => data.rows.find(r => r.kind === kind && r.id === id)
const state = {}
let before

// the amount a box shows on the screen
async function shownBox (box) {
  const value = page.locator('.vat-form .box-value').filter({ has: page.locator('.box-number', { hasText: `[${box}]` }) }).first()
  await expect(value).toBeVisible()
  return parseNumber((await value.locator('button, span').first().innerText()).replace('−', '-'))
}

// the detail row of a document, and ticking it
const detailRow = (id, kind) => page.locator('table tbody tr').filter({ has: page.locator(`a[href$="/document/${id}/${kind}"]`) }).first()
const tick = async (id, kind) => {
  await detailRow(id, kind).locator('td.checkbox-cell label, td.checkbox-cell .b-checkbox').first().click()
}
const classifySelect = placeholder => page.locator('.vat-classify select').filter({ has: page.locator('option', { hasText: placeholder }) })

async function openModels () {
  await visit('/iva?pestanya=models')
  await expect(page.getByRole('tab', { name: /Models 303 i 390/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.vat-periods button.is-on')).toHaveText(`T${QUARTER}`)
}

test('the quarter adds up its invoices, box by box', async () => {
  before = await models()
  onCleanup(async () => {
    // never leave the quarter marked as filed
    const filed = quarterOf(await models()).filed
    if (filed) await api('DELETE', `treasuries/vat-models/returns/${filed.id}`)
  })
  expect(quarterOf(before).filed, `the ${PERIOD} of ${YEAR} is already marked as filed on this database`).toBe(null)

  const local = await contactWithNif('iva')
  const eu = await api('POST', 'contacts', { data: { name: `${NAME} Fournisseur`, nif: `FR${STAMP}`, country: 'França' } })
  // (the contact stays: the issued invoice keeps it)
  // a series, as the form sends one: the invoices get a code of it
  const [serie] = await api('GET', 'series?_limit=1&_sort=id:DESC')
  const received = data => api('POST', 'received-invoices', { data: { emitted: isoToday(), serial: serie.id, contact_invoice_number: `${NAME} ${data.contact}`, ...data } })
  const domestic = await received({ contact: local.id, lines: [{ concept: `${NAME} compra`, quantity: 1, base: 200, vat: 21 }] })
  const fromEu = await received({ contact: eu.id, lines: [{ concept: `${NAME} llibres`, quantity: 1, base: 100, vat: 0 }] })
  for (const r of [domestic, fromEu]) onCleanup(() => api('DELETE', `received-invoices/${r.id}`))
  // an issued 0 % invoice to the EU client (issued: drafts don't count)
  const data = { contact: eu.id, serial: serie.id, emitted: isoToday(), lines: [{ concept: `${NAME} servei a fora`, quantity: 1, base: 300, vat: 0 }] }
  const draft = await api('POST', 'emitted-invoices', { data })
  const issued = await api('PUT', `emitted-invoices/${draft.id}`, { data: { ...data, state: 'real' } })
  expect(issued.state).toBe('real')
  Object.assign(state, { domestic: domestic.id, fromEu: fromEu.id, issued: issued.id, serie: serie.id })

  const after = await models()
  const b = quarterOf(after).boxes
  const b0 = quarterOf(before).boxes
  const pct = after.deductible_pct
  expect(round2(b['28'] - b0['28'])).toBe(200)
  expect(round2(b['29'] - b0['29'])).toBe(round2(42 * pct / 100))
  expect(rowOf(after, 'received-invoices', domestic.id)).toMatchObject({ base_box: '28', vat_box: '29', base: 200, vat: 42 })
  // the 0 % lines are in no box until they are classified
  expect(rowOf(after, 'received-invoices', fromEu.id)).toMatchObject({ issue: 'received-foreign-zero', proposal: 'intracom', area: 'EU' })
  expect(rowOf(after, 'emitted-invoices', issued.id)).toMatchObject({ issue: 'issued-zero', proposal: 'N2' })

  // the screen shows the same boxes, and a box's documents
  await openModels()
  expect(await shownBox('28')).toBe(b['28'])
  expect(await shownBox('29')).toBe(b['29'])
  expect(await shownBox('71')).toBe(b['71'])
  await page.locator('.vat-form .box-value').filter({ has: page.locator('.box-number', { hasText: '[28]' }) }).first().locator('button').click()
  await expect(page.locator('h2', { hasText: 'casella 28' })).toBeVisible()
  await expect(detailRow(domestic.id, 'received-invoices')).toBeVisible()
  await expect(detailRow(fromEu.id, 'received-invoices')).toHaveCount(0)
})

test('the 0 % lines are classified from «Per revisar»', async () => {
  await openModels()
  // a purchase of goods from the EU, self-assessed at 10 %
  await page.locator('button.vat-issue', { hasText: 'Rebudes de fora al 0 %' }).click()
  await tick(state.fromEu, 'received-invoices')
  await classifySelect('Autoliquidació…').selectOption({ label: 'Adquisició intracomunitària de béns (autoliquidar)' })
  const rate = page.getByRole('spinbutton', { name: '% IVA autoliquidat' })
  await expect(rate).toBeVisible()
  await rate.fill('10')
  await button('Classifica les rebudes (1)').click()
  await expect(page.locator('.toast', { hasText: '1 document classificat' })).toBeVisible()
  await settle()

  let data = await models()
  expect(await api('GET', `received-invoices/${state.fromEu}`)).toMatchObject({ reverse_charge: 'intracom_goods', reverse_charge_rate: 10 })
  expect(rowOf(data, 'received-invoices', state.fromEu)).toMatchObject({
    accrued_boxes: ['10', '11'], base_box: '36', vat_box: '37', self_rate: 10, self_vat: 10
  })
  expect(round2(quarterOf(data).boxes['11'] - quarterOf(before).boxes['11'])).toBe(10)

  // the issued service abroad, with the proposal
  await page.locator('button.vat-issue', { hasText: 'Emeses al 0 % sense classificar' }).click()
  await tick(state.issued, 'emitted-invoices')
  await expect(detailRow(state.issued, 'emitted-invoices')).toContainText('Proposta: No subjecta per localització')
  await button('Aplica la proposta (1)').click()
  await expect(page.locator('.toast', { hasText: '1 document classificat' })).toBeVisible()
  await settle()

  data = await models()
  expect(rowOf(data, 'emitted-invoices', state.issued)).toMatchObject({ info_box: '120', annual_box: '84', classify: { field: 'vat_operation', value: 'N2' } })
  expect(round2(quarterOf(data).boxes['120'] - quarterOf(before).boxes['120'])).toBe(300)
  expect(await shownBox('120')).toBe(quarterOf(data).boxes['120'])
  // the classification is in the document's history
  const history = await api('GET', `document-change-logs/history/emitted-invoice/${state.issued}?start=0&limit=50`)
  expect(JSON.stringify(history)).toMatch(/"field":"vat_operation"[^}]*"to":"N2"|"to":"N2"[^}]*"field":"vat_operation"/)
})

test('a quarter marked as filed keeps its boxes and warns when a document changes', async () => {
  await openModels()
  const result = quarterOf(await models()).boxes['71']
  await button('Marca com a presentada').click()
  const box = modal('Marca')
  await expect(box).toBeVisible()
  await box.locator('[data-test="receipt"] input, input[data-test="receipt"]').first().fill('3030000000001')
  await box.locator('button[data-test="vat-return-submit"], [data-test="vat-return-submit"]').first().click()
  await expect(page.locator('.toast', { hasText: 'Declaració marcada com a presentada' })).toBeVisible()
  await settle()
  await expect(page.locator('[data-test="return-bar"] .tag', { hasText: 'Presentada' })).toBeVisible()
  await expect(page.locator('[data-test="return-bar"]')).toContainText('justificant 3030000000001')

  const filed = quarterOf(await models()).filed
  expect(filed).toMatchObject({ model: '303', year: YEAR, period: PERIOD, receipt: '3030000000001', result })
  expect(filed.boxes['71']).toBe(result)
  expect(['I', 'U', 'C', 'D', 'N']).toContain(filed.declaration_type)

  // a document of the quarter changes after filing: the screen says so
  await api('PUT', `received-invoices/${state.domestic}`, { data: { serial: state.serie, lines: [{ concept: `${NAME} compra`, quantity: 1, base: 300, vat: 21 }] } })
  await openModels()
  const changes = page.locator('[data-test="changes"]')
  await expect(changes).toContainText("Han canviat dades d'aquest període des que es va presentar.")
  await expect(changes).toContainText('Casella 28')
  await expect(changes.locator(`a[href$="/document/${state.domestic}/received-invoices"]`)).toBeVisible()
  // the next quarter would compensate from the filed return, not from the documents
  expect(quarterOf(await models()).filed.boxes['71']).toBe(result)

  // the AEAT's PDF, attached from the bar: linked and served
  await page.locator('[data-test="receipt-attach"] input').setInputFiles({
    name: `303_${YEAR}_${PERIOD}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n')
  })
  await expect(page.locator('.toast', { hasText: 'Justificant adjuntat' })).toBeVisible()
  await settle()
  await expect(page.locator('[data-test="receipt-link"]')).toHaveText("Justificant de l'AEAT (PDF)")
  const receipt = quarterOf(await models()).filed.receipt_file
  expect(receipt.name).toBe(`303_${YEAR}_${PERIOD}.pdf`)
  expect((await fetch(`${API_URL}${receipt.url}`)).status).toBe(200)

  // and unmarking it: the receipt goes with it
  page.once('dialog', d => d.accept())
  await button('Desmarca').click()
  await settle()
  await expect(page.locator('[data-test="return-bar"] .tag', { hasText: 'Sense presentar' })).toBeVisible()
  expect(quarterOf(await models()).filed).toBe(null)
  expect((await fetch(`${API_URL}${receipt.url}`)).status).toBe(404)
})

test('«PDF del model» downloads the quarter as a PDF, a draft until it is filed', async () => {
  await openModels()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-test="model-pdf"]').click()
  ])
  expect(download.suggestedFilename()).toBe(`303_${YEAR}_${PERIOD}_esborrany.pdf`)
  const bytes = await readFile(await download.path())
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(5000)
})

test('«Fitxer per a l\'AEAT» downloads the 303 of the quarter', async () => {
  const me = await api('GET', 'me')
  test.skip(!me.nif, 'the entity has no NIF on this database: the file needs it')
  await openModels()
  await button("Fitxer per a l'AEAT").click()
  const box = modal("AEAT")
  await expect(box).toBeVisible()
  const type = await box.locator('select').first().inputValue()
  test.skip(type === 'U' || type === 'D', 'the default type needs an IBAN')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    box.locator('[data-test="vat-return-submit"]').first().click()
  ])
  expect(download.suggestedFilename()).toBe(`303_${YEAR}_${PERIOD}.txt`)
  const content = (await readFile(await download.path())).toString('latin1')
  expect(content.startsWith(`<T3030${YEAR}${PERIOD}0000>`)).toBe(true)
  expect(content.endsWith(`</T3030${YEAR}${PERIOD}0000>`)).toBe(true)
  // page 01: declaration type and the entity's NIF
  const page1 = content.slice(content.indexOf('<T30301000>'))
  expect(page1.slice(12, 13)).toBe(type)
  expect(page1.slice(13, 22)).toBe(String(me.nif).replace(/[^0-9A-Za-z]/g, '').toUpperCase().padEnd(9, ' ').slice(0, 9))
})
