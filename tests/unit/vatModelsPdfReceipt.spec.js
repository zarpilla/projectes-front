// 2026-11-04 — IVA › Models 303 i 390 (Beta): the AEAT's PDF of a filed
// return kept with it (the receipt, what was really filed), and the quarter as
// a PDF in the app's style with the AEAT's box numbers (a draft says so).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { setActivePinia, createPinia } from 'pinia'

const get = vi.fn()
const post = vi.fn()
const put = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))
const saved = []
// the PDF builder (helpers/vatModelPdf.js, tested in vatModelPdfText.spec.js)
vi.mock('@/helpers/vatModelPdf', () => ({
  buildModel303Pdf: async (sheet) => ({ save: (filename) => { saved.push({ filename, sheet }) } })
}))

import VatModelsTable from '@/components/VatModelsTable.vue'
import VatReturnModal from '@/components/VatReturnModal.vue'
import { model303Sheet } from '@/domain/vatModels.js'
import { attachVatReceipt, isPdf, receiptUrl } from '@/service/vatReceipt.js'

const boxes = (extra) => ({ '07': 0, '09': 0, '27': 0, '28': 0, '29': 0, '45': 0, '46': 0, '71': 0, '65': 100, ...extra })
// a 1T of 2025, rounded down
const Q1 = boxes({ '07': 20808.25, '08': 21, '09': 4369.73, '12': 442.53, '13': 92.93, '27': 4462.66, '28': 531.1, '29': 111.53, '45': 111.53, '46': 4351.13, '64': 4351.13, '66': 4351.13, '69': 4351.13, '71': 4351.13, '120': 7060 })
const answer = (filed = null) => ({
  year: 2025,
  deductible_pct: 100,
  quarters: [1, 2, 3, 4].map(q => ({ quarter: q, deadline: '2025-04-20', boxes: q === 1 ? Q1 : boxes(), declaration_type: q === 1 ? 'I' : 'N', filed: q === 1 ? filed : null, changes: null })),
  annual: Q1,
  model390: { boxes: {}, unmapped: 0, unmapped_base: 0 },
  filed390: null,
  changes390: null,
  check390: null,
  final_deductible_pct: null,
  issues: [],
  notes: [],
  rows: []
})
const PDF = { id: 7, name: '2025-1T.pdf', url: '/uploads/2025_1_T_abc.pdf' }

beforeEach(() => {
  setActivePinia(createPinia())
  for (const f of [get, post, put]) f.mockReset()
  saved.length = 0
})

async function mountQuarter(data) {
  get.mockImplementation(async (url) => (url === 'me' ? { data: { name: 'Coop Prova', nif: 'F12345678' } } : { data }))
  const w = mount(VatModelsTable, {
    props: { initialYear: 2025 },
    global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
  })
  await flushPromises()
  w.vm.year = 2025
  await w.vm.load()
  await flushPromises()
  await w.findAll('.vat-periods button')[0].trigger('click')
  return w
}

describe('the model 303 sheet', () => {
  it('lays out the AEAT boxes of the quarter, with the entity and a draft notice', () => {
    const s = model303Sheet({ year: 2025, quarter: 1, boxes: Q1, entity: { name: 'Coop Prova', nif: 'F12345678' } })
    expect(s.title).toBe('Model 303 · 1T 2025')
    expect(s.entity).toBe('Coop Prova · NIF F12345678')
    expect(s.draft).toBe(true)
    expect(s.status).toContain('Esborrany')
    expect(s.filename).toBe('303_2025_1T_esborrany.pdf')
    expect(s.sections.map(x => x.title)).toEqual(['IVA meritat', 'IVA deduïble', 'Informació addicional', 'Resultat'])
    const at21 = s.sections[0].lines.find(l => l.base && l.base.box === '07')
    expect(at21).toMatchObject({ base: { value: 20808.25 }, rate: { box: '08', value: 21 }, vat: { box: '09', value: 4369.73 } })
    expect(s.sections[0].total).toEqual({ label: 'Total quota meritada', box: '27', value: 4462.66 })
    expect(s.sections[1].total).toMatchObject({ box: '45', value: 111.53 })
    // imports are not computed: not in the sheet
    expect(s.sections[1].lines.some(l => l.base && l.base.box === '32')).toBe(false)
    expect(s.sections[2].lines.find(l => l.vat.box === '120').vat.value).toBe(7060)
    expect(s.sections[3].lines.find(l => l.vat.box === '65').vat).toEqual({ box: '65', value: 100, pct: true })
    expect(s.settlement).toEqual({ type: 'I', label: 'I · Ingrés', box: '71', amount: 4351.13 })
  })

  it('says when and with which receipt it was filed, and how it was settled', () => {
    const filed = { declaration_type: 'C', filed_date: '2025-04-09', receipt: '3036978975204' }
    const s = model303Sheet({ year: 2025, quarter: 2, boxes: boxes({ '71': -10.71 }), filed, formatDate: d => d.split('-').reverse().join('/') })
    expect(s.draft).toBe(false)
    expect(s.status).toBe('Presentada el 09/04/2025 · justificant 3036978975204')
    expect(s.filename).toBe('303_2025_2T.pdf')
    expect(s.settlement).toEqual({ type: 'C', label: 'C · A compensar', box: '72', amount: 10.71 })
    expect(model303Sheet({ year: 2025, quarter: 4, boxes: boxes({ '71': -5 }), declarationType: 'D' }).settlement).toMatchObject({ box: '73', amount: 5 })
    expect(model303Sheet({ year: 2025, quarter: 3, boxes: boxes() }).settlement).toEqual({ type: 'N', label: 'N · Sense activitat o resultat zero', box: null, amount: 0 })
  })
})

describe('the receipt PDF service', () => {
  it('uploads the PDF and links it to the return', async () => {
    post.mockResolvedValue({ data: [{ id: 41 }] })
    put.mockResolvedValue({ data: { id: 5, receipt_file: { id: 41 } } })
    const file = new File(['%PDF-1.4'], '2025-1T.pdf', { type: 'application/pdf' })
    await expect(attachVatReceipt(5, file)).resolves.toEqual({ id: 5, receipt_file: { id: 41 } })
    expect(post.mock.calls[0][0]).toBe('upload')
    expect(post.mock.calls[0][1].get('files').name).toBe('2025-1T.pdf')
    expect(put).toHaveBeenCalledWith('treasuries/vat-models/returns/5/receipt', { file: 41 })
  })

  it('refuses what is not a PDF and builds the address of the file', async () => {
    expect(isPdf(new File(['x'], 'a.pdf', { type: '' }))).toBe(true)
    expect(isPdf(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(false)
    await expect(attachVatReceipt(5, new File(['x'], 'a.png', { type: 'image/png' }))).rejects.toThrow('El justificant ha de ser un PDF.')
    expect(post).not.toHaveBeenCalled()
    expect(receiptUrl({ url: 'https://cdn.example/a.pdf' })).toBe('https://cdn.example/a.pdf')
    expect(receiptUrl({ url: '/uploads/a.pdf' })).toMatch(/\/uploads\/a\.pdf$/)
    expect(receiptUrl(null)).toBe(null)
  })
})

describe('the quarter: receipt and PDF', () => {
  it('links the receipt of a filed quarter, or offers to attach one', async () => {
    const filed = { id: 5, declaration_type: 'I', filed_date: '2025-04-09', receipt: '3036978975204', boxes: Q1 }
    let w = await mountQuarter(answer({ ...filed, receipt_file: PDF }))
    const link = w.find('[data-test="receipt-link"]')
    expect(link.text()).toBe("Justificant de l'AEAT (PDF)")
    expect(link.attributes('href')).toMatch(/\/uploads\/2025_1_T_abc\.pdf$/)
    expect(w.find('[data-test="receipt-attach"]').exists()).toBe(false)

    w = await mountQuarter(answer({ ...filed, receipt_file: null }))
    expect(w.find('[data-test="receipt-link"]').exists()).toBe(false)
    post.mockResolvedValue({ data: [{ id: 41 }] })
    put.mockResolvedValue({ data: {} })
    const input = w.find('[data-test="receipt-attach"] input')
    Object.defineProperty(input.element, 'files', { value: [new File(['%PDF'], 'r.pdf', { type: 'application/pdf' })] })
    await input.trigger('change')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('treasuries/vat-models/returns/5/receipt', { file: 41 })
  })

  it('downloads the quarter as a PDF with its boxes and the entity', async () => {
    const w = await mountQuarter(answer())
    await w.find('[data-test="model-pdf"]').trigger('click')
    await flushPromises()
    expect(saved).toHaveLength(1)
    expect(saved[0].filename).toBe('303_2025_1T_esborrany.pdf')
    expect(saved[0].sheet.title).toBe('Model 303 · 1T 2025')
    expect(saved[0].sheet.entity).toBe('Coop Prova · NIF F12345678')
    expect(saved[0].sheet.sections[0].lines.find(l => l.base && l.base.box === '07').base.value).toBe(20808.25)
    expect(saved[0].sheet.settlement.label).toBe('I · Ingrés')
    // nothing is drawn on the page any more
    expect(w.find('#vat-pdf').exists()).toBe(false)
  })
})

describe('marking a quarter as filed with its receipt', () => {
  it('attaches the PDF chosen in the dialog after filing', async () => {
    post.mockImplementation(async (url) => (url === 'upload' ? { data: [{ id: 42 }] } : { data: { id: 9 } }))
    put.mockResolvedValue({ data: {} })
    const w = mount(VatReturnModal, {
      props: { isActive: false, mode: 'file', model: '303', year: 2025, quarter: 1, result: 4351.13, defaultType: 'I' },
      global: { plugins: [Buefy] }
    })
    await w.setProps({ isActive: true })
    const input = w.find('[data-test="receipt-file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['%PDF'], '2025-1T.pdf', { type: 'application/pdf' })] })
    await input.trigger('change')
    await w.vm.submit()
    await flushPromises()
    expect(post.mock.calls.map(c => c[0])).toEqual(['treasuries/vat-models/returns', 'upload'])
    expect(put).toHaveBeenCalledWith('treasuries/vat-models/returns/9/receipt', { file: 42 })
    expect(w.emitted('done')).toBeTruthy()
  })

  it('refuses a file that is not a PDF in the dialog', async () => {
    const w = mount(VatReturnModal, {
      props: { isActive: false, mode: 'file', model: '303', year: 2025, quarter: 1, result: 10, defaultType: 'I' },
      global: { plugins: [Buefy] }
    })
    await w.setProps({ isActive: true })
    const input = w.find('[data-test="receipt-file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })] })
    await input.trigger('change')
    expect(w.vm.receiptFile).toBe(null)
  })
})
