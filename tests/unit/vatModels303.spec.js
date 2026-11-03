// 2026-11-03 — Informes › Models 303 i 390 (Beta): the boxes of the AEAT VAT
// return per quarter and for the year, with the documents behind each box.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { setActivePinia, createPinia } from 'pinia'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import VatModelsTable from '@/components/VatModelsTable.vue'
import AsideMenuItem from '@/components/AsideMenuItem.vue'
import { filterVatRows, periodBoxes, periodIssues, vatRowsTotals } from '@/domain/vatModels.js'
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

  it('has a «Beta» entry under Informes, with the access of IVA', () => {
    const groups = menu
    const informes = groups[groups.indexOf('Informes') + 1]
    expect(informes.find(e => e.to === '/models-iva')).toMatchObject({ label: 'Models 303/390', beta: true, permission: 'projects' })
    expect(canOpenPath('/models-iva', ['projects'])).toBe(canOpenPath('/iva', ['projects']))
    expect(canOpenPath('/models-iva', ['orders'])).toBe(canOpenPath('/iva', ['orders']))
    const w = mount(AsideMenuItem, {
      props: { item: { to: '/models-iva', icon: 'file-percent-outline', label: 'Models 303/390', beta: true } },
      global: { plugins: [Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })
    expect(w.find('.menu-beta').text()).toBe('Beta')
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
    expect(text).toContain('1.100,00 €')
    expect(text).toContain('[80]')
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
