// issues/449: Bestretes «Individual» / «Plantilla sencera». The whole staff
// view sums everyone's payrolls per month from ONE payrolls request (no
// per-person hours, so it stays fast with every person), a month opens the
// per-person list, «Mes» also filters a person's table, and only people with
// a working day in the year are listed (with «Totes» first).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn(), put: vi.fn() }) }))

import DedicacioSalary from '@/views/DedicacioSalary.vue'
import DedicationSalaryTeam from '@/components/DedicationSalaryTeam.vue'
import { teamPayrollMonths, teamPayrollTotals, usersWithWorkingDay } from '@/domain/teamPayrolls.js'

const payroll = (id, month, extra = {}) => ({
  id,
  year: { id: 1, year: 2026 },
  month: { id: month, month },
  users_permissions_user: { id: 100 + id },
  net_base: 1000.1,
  irpf_base: 150,
  ss_base: 300,
  other_base: 10,
  total: 1460.1,
  paid: false,
  ...extra
})

beforeEach(() => { get.mockReset() })

describe('team payrolls per month (issues/449)', () => {
  it('sums everyone per month, twelve months, paid count, other years out', () => {
    const months = teamPayrollMonths([
      payroll(1, 1, { paid: true }),
      payroll(2, 1),
      payroll(3, 3, { paid: true }),
      payroll(4, 1, { year: { id: 2, year: 2025 } })
    ], 2026)
    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ month: 1, count: 2, paid: 1, net: 2000.2, irpf: 300, ss: 600, other: 20, total: 2920.2 })
    expect(months[1]).toMatchObject({ count: 0, total: 0 })
    expect(months[2]).toMatchObject({ count: 1, paid: 1 })
    expect(teamPayrollTotals(months)).toEqual({ count: 3, paid: 2, net: 3000.3, irpf: 450, ss: 900, other: 30, total: 4380.3 })
  })

  it('lists only people with a working day in the year', () => {
    const users = [{ id: 1, username: 'anna' }, { id: 2, username: 'bernat' }, { id: 3, username: 'carla' }, { id: 4, username: 'dani', hidden: true }]
    const dedications = [
      { users_permissions_user: { id: 1 }, from: '2025-01-01', to: '2026-03-31' },
      { users_permissions_user: { id: 2 }, from: '2024-01-01', to: '2025-12-31' },
      { users_permissions_user: { id: 4 }, from: '2026-01-01', to: '2026-12-31' },
      { users_permissions_user: null, from: '2026-01-01', to: '2026-12-31' }
    ]
    expect(usersWithWorkingDay(users, dedications, 2026).map(u => u.username)).toEqual(['anna'])
    expect(usersWithWorkingDay(users, dedications, 2025).map(u => u.username)).toEqual(['anna', 'bernat'])
  })
})

describe('Plantilla sencera table (issues/449)', () => {
  it('loads the year with a single request and opens a month', async () => {
    get.mockResolvedValue({ data: [payroll(1, 2), payroll(2, 2, { paid: true })] })
    const w = mount(DedicationSalaryTeam, { props: { year: 2026 }, global: { stubs: { 'b-loading': true } } })
    await flushPromises()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toBe('payrolls?_limit=-1&_where[year.year]=2026')
    const rows = w.findAll('tbody tr')
    expect(rows).toHaveLength(12)
    expect(rows[1].text()).toContain('Febrer')
    expect(rows[1].text()).toContain('1 per pagar')
    expect(rows[0].text()).toContain('Sense nòmines')
    await rows[1].trigger('click')
    expect(w.emitted('month')).toEqual([[2]])
  })
})

const mountView = async (query = {}) => {
  get.mockImplementation(async (url) => {
    if (url.startsWith('years')) return { data: [{ id: 2, year: 2026 }] }
    if (url.startsWith('users')) return { data: [{ id: 5, username: 'anna' }, { id: 6, username: 'bernat' }] }
    if (url.startsWith('daily-dedications')) return { data: [{ users_permissions_user: { id: 5 }, from: '2026-01-01', to: '2026-12-31' }] }
    return { data: [] }
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(DedicacioSalary, {
    global: {
      plugins: [pinia],
      mocks: { $route: { query } },
      stubs: {
        'title-bar': true,
        'b-autocomplete': true,
        'b-select': true,
        'dedication-salary': { props: ['user', 'year', 'month'], template: '<div class="person-stub">{{ user }}-{{ year }}-{{ month }}</div>' },
        'dedication-salary-month': { props: ['year', 'month'], template: '<div class="month-stub">{{ year }}-{{ month }}</div>' },
        'dedication-salary-team': { props: ['year'], emits: ['month'], template: '<div class="team-stub" @click="$emit(\'month\', 4)">{{ year }}</div>' }
      }
    }
  })
  await flushPromises()
  return w
}

describe('Bestretes view (issues/449)', () => {
  it('switches to Plantilla sencera, and a month opens everyone of that month', async () => {
    const w = await mountView()
    const button = name => w.findAll('.segmented button').find(b => b.text() === name)
    await button('Plantilla sencera').trigger('click')
    expect(w.find('.team-stub').text()).toBe('2026')
    expect(w.find('.person-stub').exists()).toBe(false)
    await w.find('.team-stub').trigger('click')
    expect(w.find('.month-stub').text()).toBe('2026-4')
    await button('Individual').trigger('click')
    expect(w.find('.empty-choice').exists()).toBe(true)
  })

  it('«Mes» also filters a person, and «Totes» is the whole staff', async () => {
    const w = await mountView()
    w.vm.selectUser({ id: 5, username: 'anna' })
    w.vm.filters.month = 3
    await flushPromises()
    expect(w.find('.person-stub').text()).toBe('5-2026-3')

    expect(w.vm.filteredUsers.map(u => u.username)).toEqual(['Totes', 'anna'])
    w.vm.selectUser({ id: 0, username: 'Totes' })
    await flushPromises()
    expect(w.vm.team).toBe(true)
    expect(w.find('.month-stub').text()).toBe('2026-3')
  })

  it('a Tresoreria link opens the month in Plantilla sencera', async () => {
    const w = await mountView({ any: '2026', mes: '3' })
    expect(w.vm.team).toBe(true)
    expect(w.find('.month-stub').text()).toBe('2026-3')
  })
})
