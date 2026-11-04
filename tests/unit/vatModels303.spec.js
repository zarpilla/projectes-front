// 2026-11-03 — Informes › Models 303 i 390 (Beta): the boxes of the AEAT VAT
// return per quarter and for the year, with the documents behind each box.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { setActivePinia, createPinia } from 'pinia'

const get = vi.fn()
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post }) }))

import VatModelsTable from '@/components/VatModelsTable.vue'
import Vat from '@/views/Vat.vue'
import { DEDUCTIBLE, classificationLabel, classifyItems, declarationTypesFor, filterVatRows, periodBoxes, periodIssues, vatRowsTotals, VAT_SPECIAL_LABELS, REVERSE_CHARGE_LABELS, check390Lines } from '@/domain/vatModels.js'
import { canOpenPath } from '@/domain/routeAccess'
import menu from '@/service/menu'

const rows = [
  { key: 'emitted-invoices:1:21', kind: 'emitted-invoices', id: 1, code: 'F1', contact: 'Client', area: 'ES', date: '2026-01-15', quarter: 1, side: 'issued', rate: 21, base: 1000, vat: 210, base_box: '07', vat_box: '09', to: '/document/1/emitted-invoices' },
  { key: 'emitted-invoices:2:0', kind: 'emitted-invoices', id: 2, code: 'F2', contact: 'Client UE', area: 'EU', date: '2026-02-10', quarter: 1, side: 'issued', rate: 0, base: 500, vat: 0, issue: 'issued-zero', to: '/document/2/emitted-invoices' },
  { key: 'received-invoices:3:21', kind: 'received-invoices', id: 3, code: 'R3', contact: 'Proveïdora', area: 'ES', date: '2026-02-20', quarter: 1, side: 'received', rate: 21, base: 400, vat: 84, deductible_pct: 80, deductible_vat: 67.2, base_box: '28', vat_box: '29', to: '/document/3/received-invoices' },
  { key: 'emitted-invoices:4:21', kind: 'emitted-invoices', id: 4, code: 'F4', contact: 'Client', area: 'ES', date: '2026-05-02', quarter: 2, side: 'issued', rate: 21, base: 100, vat: 21, base_box: '07', vat_box: '09', to: '/document/4/emitted-invoices' }
]
const boxes = (extra) => ({ '07': 0, '09': 0, '27': 0, '28': 0, '29': 0, '45': 0, '46': 0, '71': 0, '65': 100, ...extra })
const answer = {
  year: 2026,
  deductible_pct: 80,
  quarters: [
    { quarter: 1, deadline: '2026-04-20', boxes: boxes({ '07': 1000, '09': 210, '27': 210, '28': 400, '29': 67.2, '45': 67.2, '46': 142.8, '71': 142.8 }) },
    { quarter: 2, deadline: '2026-07-20', boxes: boxes({ '07': 100, '09': 21, '27': 21, '46': 21, '71': 21 }) },
    { quarter: 3, deadline: '2026-10-20', boxes: boxes() },
    { quarter: 4, deadline: '2027-01-30', boxes: boxes() }
  ],
  annual: boxes({ '07': 1100, '09': 231, '27': 231, '28': 400, '29': 67.2, '45': 67.2, '46': 163.8, '71': 163.8, '80': 1100, unclassified_base: 500 }),
  model390: { boxes: { '05': 1100, '06': 231, '33': 1100, '34': 231, '605': 400, '606': 67.2, '48': 400, '49': 67.2, '64': 67.2, '65': 163.8, '84': 163.8, '86': 163.8, '99': 1100, '108': 1100 }, unmapped: 0, unmapped_base: 0 },
  filed390: null,
  changes390: null,
  final_deductible_pct: null,
  issues: [{ code: 'issued-zero', text: 'Línies emeses al 0 % sense classificar', count: 1, base: 500 }],
  notes: [{ code: 'expenses-excluded', text: 'Les despeses no compten.', count: 2, vat: 12 }],
  rows
}

beforeEach(() => {
  setActivePinia(createPinia())
  get.mockReset()
  get.mockResolvedValue({ data: answer })
})

describe('VAT models rows', () => {
  it('filters by period, box and issue', () => {
    expect(filterVatRows(rows, { quarter: 1 }).map(r => r.id)).toEqual([1, 2, 3])
    expect(filterVatRows(rows, { box: '09' }).map(r => r.id)).toEqual([1, 4])
    expect(filterVatRows(rows, { box: '28' }).map(r => r.id)).toEqual([3])
    expect(filterVatRows(rows, { issue: 'issued-zero' }).map(r => r.id)).toEqual([2])
  })

  it('takes a quarter’s boxes or the year’s, and counts received VAT after the prorrata', () => {
    expect(periodBoxes(answer, 2)['09']).toBe(21)
    expect(periodBoxes(answer, null)['09']).toBe(231)
    expect(vatRowsTotals([rows[0], rows[2]])).toEqual({ count: 2, base: 1400, vat: 277.2 })
    expect(periodIssues(answer, rows, 2)).toEqual([])
    expect(periodIssues(answer, rows, 1)[0]).toMatchObject({ count: 1, base: 500, areas: [{ area: 'EU', count: 1 }] })
  })
})

describe('VAT models tab of IVA', () => {
  const mountVat = async (query = {}) => {
    const replace = vi.fn()
    const w = mount(Vat, {
      global: {
        plugins: [Buefy],
        mocks: { $route: { query }, $router: { replace } },
        stubs: { 'title-bar': { props: ['titleStack', 'subtitle'], template: '<h1>{{ titleStack.join(" / ") }}</h1>' }, 'vat-table': { template: '<div class="vat-table-stub" />' }, 'b-loading': true, 'router-link': true }
      }
    })
    await flushPromises()
    return { w, replace }
  }

  it('opens «Saldo i documents» by default and the models with ?pestanya=models, tagged Beta', async () => {
    const plain = await mountVat()
    expect(plain.w.find('.vat-table-stub').exists()).toBe(true)
    expect(plain.w.find('.vat-models-page').exists()).toBe(false)
    expect(plain.w.find('.tab-beta').text()).toBe('Beta')
    await plain.w.findAll('.vat-tabs button')[1].trigger('click')
    expect(plain.replace).toHaveBeenCalledWith({ query: { pestanya: 'models' } })

    const models = await mountVat({ pestanya: 'models' })
    expect(models.w.find('.vat-models-page').exists()).toBe(true)
    expect(models.w.find('h1').text()).toContain('Models 303 i 390 (Beta)')
  })

  it('is a tab of IVA, with its access, and not a menu entry of its own', () => {
    const entries = menu.flat(2).filter(e => e && e.to)
    expect(entries.some(e => /models/.test(e.to))).toBe(false)
    expect(canOpenPath('/iva', ['projects'])).toBe(true)
    expect(canOpenPath('/iva', ['orders'])).toBe(false)
  })
})

describe('VAT models page', () => {
  const mountPage = async () => {
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    return w
  }

  it('says it is in tests and shows the year’s boxes', async () => {
    const w = await mountPage()
    expect(get.mock.calls[0][0]).toMatch(/^treasuries\/vat-models\?year=\d{4}$/)
    expect(w.find('.beta-notice').text()).toContain('Beta')
    await w.findAll('.vat-periods button')[4].trigger('click')
    const text = w.text()
    // the year: the 390, in its own numbering
    expect(text).toContain('1.100,00 €')
    expect(text).toContain('[99]')
    expect(text).toContain('[86]')
    expect(text).not.toContain('[80]')
    expect(text).toContain('Les despeses no compten.')
  })

  it('shows a quarter and the documents of a box when it is clicked', async () => {
    const w = await mountPage()
    await w.findAll('.vat-periods button')[0].trigger('click')
    expect(w.findAll('.vat-documents tbody tr')).toHaveLength(3)
    expect(w.text()).toContain('Emeses al 0 % sense classificar')
    const link = w.findAll('.box-link').find(b => b.attributes('title') === 'Documents de la casella 29')
    await link.trigger('click')
    expect(w.findAll('.vat-documents tbody tr')).toHaveLength(1)
    expect(w.find('.vat-totals').text()).toContain('67,20 €')
    await w.find('.vat-issue').trigger('click')
    expect(w.findAll('.vat-documents tbody tr')).toHaveLength(1)
    expect(w.find('.vat-documents').text()).toContain('Per revisar')
  })
})

describe('phase 2: classifying the 0 % lines', () => {
  const zero = [
    { key: 'emitted-invoices:2:0', kind: 'emitted-invoices', id: 2, code: 'F2', contact: 'Client UE', area: 'EU', date: '2026-02-10', quarter: 1, side: 'issued', rate: 0, base: 500, vat: 0, issue: 'issued-zero', proposal: 'N2', classify: { field: 'vat_operation', value: null }, to: '/document/2/emitted-invoices' },
    { key: 'emitted-invoices:5:0', kind: 'emitted-invoices', id: 5, code: 'F5', contact: 'Local', area: 'ES', date: '2026-02-11', quarter: 1, side: 'issued', rate: 0, base: 80, vat: 0, issue: 'issued-zero', proposal: null, classify: { field: 'vat_operation', value: null }, to: '/document/5/emitted-invoices' },
    { key: 'emitted-invoices:6:0', kind: 'emitted-invoices', id: 6, code: 'F6', contact: 'Client UE', area: 'EU', date: '2026-02-12', quarter: 1, side: 'issued', rate: 0, base: 90, vat: 0, info_box: '120', annual_box: '84', classify: { field: 'vat_operation', value: 'N2' }, to: '/document/6/emitted-invoices' },
    { key: 'received-invoices:7:0:c', kind: 'received-invoices', id: 7, code: 'R7', contact: 'Google', area: 'EU', date: '2026-02-13', quarter: 1, side: 'received', rate: 0, base: 100, vat: 0, self_vat: 21, deductible_vat: 21, deductible_pct: 100, accrued_boxes: ['10', '11'], base_box: '36', vat_box: '37', classify: { field: 'reverse_charge', value: 'intracom' }, to: '/document/7/received-invoices' },
    { key: 'received-invoices:8:0:c', kind: 'received-invoices', id: 8, code: 'R8', contact: 'Zoom', area: 'NONEU', date: '2026-02-14', quarter: 1, side: 'received', rate: 0, base: 40, vat: 0, issue: 'received-foreign-zero', proposal: 'isp', classify: { field: 'reverse_charge', value: null }, to: '/document/8/received-invoices' }
  ]

  it('builds one item per document, with the chosen value, the proposal or none', () => {
    expect(classifyItems(zero, 'vat_operation', 'E1').map(i => [i.id, i.value])).toEqual([[2, 'E1'], [5, 'E1'], [6, 'E1']])
    expect(classifyItems(zero, 'vat_operation')).toEqual([{ kind: 'emitted-invoices', id: 2, value: 'N2' }])
    expect(classifyItems(zero, 'vat_operation', 'clear').map(i => [i.id, i.value])).toEqual([[2, null], [5, null], [6, null]])
    expect(classifyItems(zero, 'reverse_charge', 'isp', 10)).toEqual([
      { kind: 'received-invoices', id: 7, value: 'isp', rate: 10 },
      { kind: 'received-invoices', id: 8, value: 'isp', rate: 10 }
    ])
    expect(classifyItems(zero, 'reverse_charge', 'none')).toEqual([
      { kind: 'received-invoices', id: 7, value: 'none' },
      { kind: 'received-invoices', id: 8, value: 'none' }
    ])
  })

  it('finds a row by its information, self-assessment and 390 boxes', () => {
    expect(filterVatRows(zero, { box: '120' }).map(r => r.id)).toEqual([6])
    expect(filterVatRows(zero, { box: '84' }).map(r => r.id)).toEqual([6])
    expect(filterVatRows(zero, { box: '11' }).map(r => r.id)).toEqual([7])
    expect(filterVatRows(zero, { box: '37' }).map(r => r.id)).toEqual([7])
    expect(classificationLabel('reverse_charge', 'intracom')).toMatch(/intracomunitària/)
    expect(classificationLabel('vat_operation', 'E1')).toMatch(/^Exempta/)
  })

  it('classifies the checked documents from the detail and reloads', async () => {
    post.mockReset()
    post.mockResolvedValue({ data: { updated: 2 } })
    const withZero = { ...answer, rows: [rows[0], rows[2], rows[3], ...zero] }
    get.mockResolvedValue({ data: withZero })
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    await w.findAll('.vat-periods button')[0].trigger('click')
    // only the rows that can be classified have a checkbox
    const checkable = w.vm.tableRows.filter(r => r.classify)
    expect(checkable.map(r => r.id)).toEqual([2, 5, 6, 7, 8])
    w.vm.checkedRows = w.vm.tableRows.filter(r => [2, 8].includes(r.id))
    await flushPromises()
    expect(w.find('.vat-classify').text()).toContain('Aplica la proposta (2)')
    expect(w.text()).toContain('Proposta: No subjecta per localització')
    await w.findAll('.vat-classify button').find(b => b.text().startsWith('Aplica la proposta')).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('treasuries/vat-models/classify', { items: [
      { kind: 'emitted-invoices', id: 2, value: 'N2' },
      { kind: 'received-invoices', id: 8, value: 'isp' }
    ] })
    expect(get).toHaveBeenCalledTimes(2)
    expect(w.vm.checkedRows).toEqual([])
  })
})

describe('phase 3: filed returns, final prorrata and the AEAT file', () => {
  const mountWith = async (data) => {
    get.mockReset()
    get.mockResolvedValue({ data })
    post.mockReset()
    post.mockResolvedValue({ data: {} })
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    await w.findAll('.vat-periods button')[0].trigger('click')
    return w
  }

  it('says a quarter is filed and what changed since', async () => {
    const quarters = answer.quarters.map(q => q.quarter === 1
      ? { ...q, declaration_type: 'I', filed: { id: 5, declaration_type: 'I', filed_date: '2026-04-18', receipt: '3031234567890', boxes: q.boxes },
          changes: { boxes: [{ box: '09', filed: 189, now: 210 }], documents: [{ key: 'emitted-invoices:1:21', kind: 'emitted-invoices', id: 1, code: 'F1', contact: 'Client', vat: 21, change: 'added' }] } }
      : q)
    const w = await mountWith({ ...answer, quarters })
    const bar = w.find('[data-test="return-bar"]').text()
    expect(bar).toContain('Presentada')
    expect(bar).toContain('18/04/2026')
    expect(bar).toContain('justificant 3031234567890')
    const changes = w.find('[data-test="changes"]').text()
    expect(changes).toContain('Casella 09: 189,00 € → 210,00 €')
    expect(changes).toContain('Afegit: F1')
    expect(w.find('[data-test="unfile"]').exists()).toBe(true)
  })

  it('marks a quarter as filed with its declaration type, date and receipt', async () => {
    const w = await mountWith({ ...answer, quarters: answer.quarters.map(q => ({ ...q, declaration_type: 'I', filed: null, changes: null })) })
    expect(w.find('[data-test="return-bar"]').text()).toContain('Sense presentar')
    await w.find('[data-test="mark-filed"]').trigger('click')
    await flushPromises()
    const modal = w.findComponent({ name: 'VatReturnModal' })
    expect(modal.props()).toMatchObject({ mode: 'file', model: '303', quarter: 1, result: 142.8, defaultType: 'I' })
    // a positive result: to pay, or by direct debit
    expect(modal.vm.types).toEqual(['I', 'U'])
    modal.vm.form.receipt = '3030000000001'
    await modal.vm.submit()
    expect(post).toHaveBeenCalledWith('treasuries/vat-models/returns', expect.objectContaining({ model: '303', year: 2026, period: '1T', declaration_type: 'I', receipt: '3030000000001' }))
  })

  it('offers the final prorrata in the last quarter when there is a prorrata', async () => {
    const w = await mountWith({ ...answer, prorrata: { provisional: 80, definitive: 77, regularisation: -5, with_right: 770, total: 1000 } })
    expect(w.find('[data-test="final-prorrata"]').exists()).toBe(false)
    await w.findAll('.vat-periods button')[3].trigger('click')
    expect(w.find('[data-test="final-prorrata"]').text()).toContain('estimada 77 %')
    await w.vm.saveFinalProrrata(77)
    expect(post).toHaveBeenCalledWith('treasuries/vat-models/final-prorrata', { year: 2026, pct: 77 })
  })

  it('lists the declaration types a result allows', () => {
    expect(declarationTypesFor(10, 1)).toEqual(['I', 'U'])
    expect(declarationTypesFor(-10, 2)).toEqual(['C'])
    expect(declarationTypesFor(-10, 4)).toEqual(['C', 'D'])
    expect(declarationTypesFor(0, 3)).toEqual(['N'])
  })
})

describe('agrarian compensation and foreign VAT', () => {
  const special = [
    { key: 'received-invoices:1:12:c', kind: 'received-invoices', id: 1, code: 'R1', contact: "L'hort del Puig", area: 'ES', date: '2026-01-10', quarter: 1, side: 'received', rate: 12, base: 100, vat: 12, deductible_pct: 100, deductible_vat: 12, issue: 'received-reagp', proposal: 'reagp', classify: { field: 'vat_special', value: null }, to: '/document/1/received-invoices' },
    { key: 'received-invoices:2:12:c', kind: 'received-invoices', id: 2, code: 'R2', contact: "L'hort del Puig", area: 'ES', date: '2026-01-11', quarter: 1, side: 'received', rate: 12, base: 200, vat: 24, deductible_pct: 100, deductible_vat: 24, vat_box: '42', reagp: true, classify: { field: 'vat_special', value: 'reagp' }, to: '/document/2/received-invoices' }
  ]

  it('sends the vat_special field and labels it', () => {
    expect(classifyItems(special, 'vat_special')).toEqual([{ kind: 'received-invoices', id: 1, value: 'reagp', field: 'vat_special' }])
    expect(classifyItems(special, 'vat_special', 'foreign_vat').map(i => i.value)).toEqual(['foreign_vat', 'foreign_vat'])
    expect(classificationLabel('vat_special', 'reagp')).toBe('Compensació agrària (REAGP)')
    // 2026-11-04: Spanish VAT charged by a provider from abroad, self-assessed by the reverse charge
    expect(classificationLabel('vat_special', 'wrong_vat')).toBe('IVA espanyol mal repercutit des de fora (autoliquidar la base, no deduir-lo)')
    expect(Object.keys(VAT_SPECIAL_LABELS)).toEqual(['none', 'reagp', 'foreign_vat', 'wrong_vat'])
    // box 42 has a quota only
    expect(filterVatRows(special, { box: '42' }).map(r => r.id)).toEqual([2])
    expect(vatRowsTotals(special.filter(r => r.vat_box))).toEqual({ count: 1, base: 0, vat: 24 })
  })

  it('offers the VAT classification for checked received lines with VAT', async () => {
    get.mockReset()
    get.mockResolvedValue({ data: { ...answer, rows: [...rows, ...special] } })
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    await w.findAll('.vat-periods button')[0].trigger('click')
    w.vm.checkedRows = w.vm.tableRows.filter(r => r.id === 1 && r.side === 'received')
    await flushPromises()
    expect(w.find('.vat-classify').text()).toContain("Classifica l'IVA (1)")
    expect(w.text()).toContain('Proposta: Compensació agrària (REAGP)')
  })
})

// 2026-11-04, validation of branch model-303: «Adquisició intracomunitària de
// béns» (intracom_goods, phase 3) had no «% IVA» field and its rate was not
// sent, so the backend wrote 21 % over it (books at 4 %, food at 10 %…).
// And box 44 said «no calculat» though the 4T computes it.
describe('self-assessed intra-EU goods at their rate', () => {
  const goods = [
    { key: 'received-invoices:9:0:c', kind: 'received-invoices', id: 9, code: 'R9', contact: 'Buchhandlung', area: 'EU', date: '2026-02-20', quarter: 1, side: 'received', rate: 0, base: 300, vat: 0, issue: 'received-foreign-zero', proposal: 'intracom', classify: { field: 'reverse_charge', value: null }, to: '/document/9/received-invoices' }
  ]

  it('sends the rate with intracom_goods', () => {
    expect(classifyItems(goods, 'reverse_charge', 'intracom_goods', 4)).toEqual([
      { kind: 'received-invoices', id: 9, value: 'intracom_goods', rate: 4 }
    ])
  })

  it('asks for the rate when intracom_goods is chosen, and posts it', async () => {
    post.mockReset()
    post.mockResolvedValue({ data: { updated: 1 } })
    get.mockReset()
    get.mockResolvedValue({ data: { ...answer, rows: [...rows, ...goods] } })
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    await w.findAll('.vat-periods button')[0].trigger('click')
    w.vm.checkedRows = w.vm.tableRows.filter(r => r.id === 9)
    w.vm.reverseCharge = 'intracom_goods'
    await flushPromises()
    const rate = w.find('.vat-classify-rate input')
    expect(rate.exists()).toBe(true)
    await rate.setValue('4')
    await w.findAll('.vat-classify button').find(b => b.text().startsWith('Classifica les rebudes')).trigger('click')
    await flushPromises()
    expect(post).toHaveBeenCalledWith('treasuries/vat-models/classify', { items: [
      { kind: 'received-invoices', id: 9, value: 'intracom_goods', rate: 4 }
    ] })
  })

  it('does not say box 44 is not computed', () => {
    expect(DEDUCTIBLE.find(r => r.vat === '44').missing).toBeFalsy()
  })
})

// 2026-11-04: invoices entered after a quarter was filed left the 390 not
// adding up the 303s filed, silently; and the self-employed quota (a 0 %
// received invoice) went to the 390's 230 as an exempt purchase.
describe('the 390 against the 303s filed, and lines outside VAT', () => {
  const money = v => `${v} €`
  const check = {
    ok: false,
    changed: [{ quarter: 3, period: '3T', boxes: [{ box: '07', filed: 21935, now: 21935.5 }, { box: '09', filed: 4606.35, now: 4606.46 }] }],
    unfiled: ['2T'],
    filed_result: 12011.99,
    result: 12012.1
  }

  it('lists the quarters changed, the ones not filed and the results', () => {
    expect(check390Lines(check, money)).toEqual([
      { quarter: 3, text: '3T: casella 07 21935 € → 21935.5 €, casella 09 4606.35 € → 4606.46 €' },
      { quarter: null, text: 'Sense marcar com a presentats: 2T.' },
      { quarter: null, text: 'Resultat: els 303 presentats sumen 12011.99 € (casella 46); el 390, 12012.1 € (casella 84).' }
    ])
    expect(check390Lines({ ok: true, changed: [], unfiled: [] }, money)).toBe(null)
    expect(check390Lines(null, money)).toBe(null)
  })

  it('warns on the year and opens the quarter that changed', async () => {
    get.mockResolvedValue({ data: { ...answer, check390: check } })
    const w = mount(VatModelsTable, {
      global: { plugins: [Buefy], stubs: { 'b-loading': true, 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    await flushPromises()
    await w.findAll('.vat-periods button')[4].trigger('click')
    const box = w.find('[data-test="check390"]')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('El 390 no quadra amb els 303 presentats.')
    expect(box.text()).toContain('3T: casella 07 21.935,00 € → 21.935,50 €')
    await box.findAll('button').find(b => b.text() === 'Veure el T3').trigger('click')
    expect(w.find('.vat-periods button.is-on').text()).toBe('T3')
    expect(w.find('[data-test="check390"]').exists()).toBe(false)
  })

  it('offers «Fora de l\'IVA» for received 0 % lines and lists the 230 of the 390', () => {
    expect(REVERSE_CHARGE_LABELS.not_vat).toBe("Fora de l'IVA (no és una compra: quota d'autònoms, impostos, taxes…)")
    const rows = [
      { kind: 'received-invoices', id: 1, side: 'received', rate: 0, base: 624, not_in_return: true, annual_box: '230' },
      { kind: 'received-invoices', id: 2, side: 'received', rate: 0, base: 624, not_in_return: true, not_vat: true }
    ]
    expect(filterVatRows(rows, { box: '230' }).map(r => r.id)).toEqual([1])
  })
})
