// issues/208 (redesign review 4): «amb 1 comandes», «1 caixes», route rates
// shown «11,3» with the last columns cut off, and the timer buttons of the
// dedication modal cut off at 375 px.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import fs from 'node:fs'
import path from 'node:path'

const get = vi.fn(async url => {
  if (url.startsWith('orders/for-invoicing')) {
    return { data: [{ id: 1, owner: { id: 7, fullname: 'Mas Alba' }, estimated_delivery_date: '2026-10-02', price: 12.32, units: 1, kilograms: 1 }] }
  }
  if (url.startsWith('projects/basic')) return { data: [{ id: 30, name: '4T 2026 - Logística' }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))
import { plural } from '@/helpers/catalan'
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'
import OrderOperationsTable from '@/components/OrderOperationsTable.vue'
import AdminEntityList from '@/components/AdminEntityList.vue'

const source = file => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')

describe('singular forms (issues/208)', () => {
  it('«1 comanda», «2 comandes»', () => {
    expect(plural(1, 'comanda')).toBe('1 comanda')
    expect(plural(2, 'comanda')).toBe('2 comandes')
    expect(plural(0, 'caixa')).toBe('0 caixes')
  })

  it('the invoicing confirmation says «amb 1 comanda»', async () => {
    const wrapper = mount(OrdersInvoiceTable, {
      global: { plugins: [Buefy], stubs: { TitleBar: true, 'download-excel': true, 'router-link': true } }
    })
    await flushPromises()
    const vm = wrapper.vm
    vm.projectId = 30
    const confirm = vi.spyOn(vm.$buefy.dialog, 'confirm').mockImplementation(() => {})
    await vm.invoiceGroup(vm.groups[0])
    expect(confirm.mock.calls[0][0].message).toContain('amb 1 comanda per')
  })

  it('the operations cards say «1 caixa»', () => {
    const template = source('src/components/OrderOperationsTable.vue')
    expect(template).not.toMatch(/\}\} caixes/)
    expect(OrderOperationsTable.methods.plural(1, 'caixa')).toBe('1 caixa')
  })
})

describe('route rates list (issues/208)', () => {
  it('shows the prices with two decimals', () => {
    const vm = { entityName: 'route-rate', formatNumber: AdminEntityList.methods.formatNumber }
    expect(AdminEntityList.methods.cellText.call(vm, { less10: '11.3' }, 'less10', { type: 'decimal' })).toBe('11,30')
    expect(AdminEntityList.methods.cellText.call(vm, { less10: 0 }, 'less10', { type: 'decimal' })).toBe('0,00')
    // other tables keep their numbers as they were
    const other = { entityName: 'product', formatNumber: AdminEntityList.methods.formatNumber }
    expect(AdminEntityList.methods.cellText.call(other, { base: '11.3' }, 'base', { type: 'decimal' })).toBe('11,3')
  })

  it('scrolls instead of cutting off the last columns', () => {
    expect(source('src/components/AdminEntityList.vue')).toMatch(/<b-table\s[^]*?:scrollable="true"[^]*?<b-table-column/)
  })
})

describe('dedication modal at 375 px (issues/208)', () => {
  // jsdom has no layout: this checks the rule that lets the buttons wrap
  it('lets the footer buttons wrap', () => {
    const css = source('src/components/ModalBoxDedication.vue').match(/<style>([\s\S]*?)<\/style>/)[1]
    const rule = css.match(/\.modal-card-dedication \.modal-card-foot\s*\{([^}]*)\}/)[1]
    expect(rule).toMatch(/flex-wrap:\s*wrap/)
  })
})
