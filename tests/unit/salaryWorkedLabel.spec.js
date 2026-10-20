// issues/273 (review 8): Bestretes adds the vacation and personal festives to
// «hores treballades» (what the payroll pays), Saldo d'hores and Hores anuals
// don't: prova.hores 2026 with vacation 21–28/12 showed «Total hores
// treballades 25,02 h» in Bestretes, 0,02 h in the others. The payroll figure
// stays, under a label that says it includes the vacation.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const get = vi.fn(async url => {
  if (url.startsWith('activities/total-by-day')) return { data: [{ date: '2026-03-02', hours: 0.02 }] }
  if (url.startsWith('festives')) return { data: [{ date: '2026-12-21', users_permissions_user: { id: 15 }, festive_type: { name: 'Vacances' } }] }
  if (url.startsWith('daily-dedications')) return { data: [{ from: '2026-01-01', to: '2026-12-31', hours: 5, costByHour: 10, monthly_salary: 1000 }] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DedicationSalary from '@/components/DedicationSalary.vue'

describe('Bestretes «hores treballades» label (issues/273)', () => {
  it('says the total includes the vacation, and keeps the payroll figure', async () => {
    const w = mount(DedicationSalary, {
      props: { user: 15, year: 2026 },
      global: { stubs: { 'b-loading': true, 'b-button': true, 'router-link': true } }
    })
    await flushPromises()
    await flushPromises()
    expect(w.vm.summary['Total hores treballades + vacances']).toBe('5.02')
    expect(w.vm.summary['Total hores treballades']).toBeUndefined()
    expect(w.find('.salary-table thead').text()).toContain('Treballades + vacances')
  })
})
