// issues/347: Bestretes needed a person to show anything. With a month and no
// person it lists the payrolls of everyone for that month, and Tresoreria's
// grouped payroll lines link there (?any=2026&mes=3) and validate all their
// payrolls at once.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const get = vi.fn()
const post = vi.fn()
const put = vi.fn(async () => ({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put }) }))

import DedicationSalaryMonth from '@/components/DedicationSalaryMonth.vue'
import DedicacioSalary from '@/views/DedicacioSalary.vue'
import { monthPayrollRows, monthPayrollTotals, monthFromQuery, yearFromQuery } from '@/domain/monthPayrolls.js'
import { setValidationKeys, parseValidationKey } from '@/domain/treasuryValidation.js'

const payroll = (id, username, extra = {}) => ({
  id,
  year: { id: 1, year: 2026 },
  month: { id: 3, month: 3 },
  users_permissions_user: username ? { id: id + 100, username } : null,
  net_base: 1000.1,
  irpf_base: 150,
  ss_base: 300,
  other_base: 0,
  total: 1450.1,
  net_date: '2026-03-31',
  emitted: '2026-03-31',
  paid: false,
  bank_account: { id: 2, name: 'Triodos' },
  ...extra
})

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockClear()
})

describe('month payrolls (issues/347)', () => {
  it('keeps the payrolls of the month, by person, with their totals', () => {
    const rows = monthPayrollRows([
      payroll(1, 'bernat'),
      payroll(2, 'anna', { paid: true }),
      payroll(3, 'carla', { month: { id: 4, month: 4 } }),
      payroll(4, null)
    ], 2026, 3)
    expect(rows.map(r => r.person)).toEqual(['anna', 'bernat', 'usuari esborrat'])
    expect(rows[0]).toMatchObject({ net: 1000.1, bankAccount: 'Triodos', paid: true })
    expect(monthPayrollTotals(rows)).toEqual({ net: 3000.3, irpf: 450, ss: 900, other: 0, total: 4350.3 })
  })

  it('reads the month and year of the link', () => {
    expect(monthFromQuery({ any: '2026', mes: '3' })).toBe(3)
    expect(yearFromQuery({ any: '2026', mes: '3' })).toBe(2026)
    expect(monthFromQuery({ mes: '13' })).toBe(null)
    expect(monthFromQuery({})).toBe(null)
  })
})

describe('Bestretes month table (issues/347)', () => {
  it('lists everyone of the month and pays one', async () => {
    get.mockResolvedValue({ data: [payroll(1, 'anna'), payroll(2, 'bernat', { paid: true })] })
    const w = mount(DedicationSalaryMonth, {
      props: { year: 2026, month: 3 },
      global: { stubs: { 'b-loading': true, 'b-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' } } }
    })
    await flushPromises()
    expect(get.mock.calls[0][0]).toContain('_where[month.month]=3')
    const rows = w.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('anna')
    expect(rows[0].text()).toContain('Per pagar')
    expect(rows[1].text()).toContain('Pagada')
    expect(w.find('tfoot').text()).toContain('Total (2)')
    await rows[0].find('button').trigger('click')
    await flushPromises()
    expect(put).toHaveBeenCalledWith('payrolls/1', { paid: true, paid_date: '2026-03-31' })
  })
})

describe('Bestretes view with a month and no person (issues/347)', () => {
  it('opens the month for everyone from a Tresoreria link', async () => {
    get.mockImplementation(async (url) => {
      if (url.startsWith('years')) return { data: [{ id: 2, year: 2026 }, { id: 1, year: 2025 }] }
      if (url.startsWith('users')) return { data: [{ id: 5, username: 'anna' }] }
      return { data: [] }
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(DedicacioSalary, {
      global: {
        plugins: [pinia],
        mocks: { $route: { query: { any: '2025', mes: '3' } } },
        stubs: {
          'title-bar': true,
          'b-autocomplete': true,
          'b-select': true,
          'dedication-salary': true,
          'dedication-salary-month': { props: ['year', 'month'], template: '<div class="month-stub">{{ year }}-{{ month }}</div>' }
        }
      }
    })
    await flushPromises()
    expect(w.vm.filters.user).toBe(null)
    expect(w.find('.month-stub').text()).toBe('2025-3')
    expect(w.find('.empty-choice').exists()).toBe(false)
  })
})

describe('validating a grouped Tresoreria line (issues/347)', () => {
  it('sets every payroll of the line to the same state', async () => {
    post.mockImplementation(async (url, body) => ({ data: { validated: body.validated } }))
    expect(parseValidationKey('payrolls:12:ss')).toEqual({ entity_type: 'payrolls', entity_id: 12, sub_type: 'ss' })
    expect(await setValidationKeys(['payrolls:1', 'payrolls:2:ss'], true)).toBe(true)
    expect(post.mock.calls.map(c => c[1])).toEqual([
      { entity_type: 'payrolls', entity_id: 1, sub_type: null, validated: true },
      { entity_type: 'payrolls', entity_id: 2, sub_type: 'ss', validated: true }
    ])
  })
})
