// issues/257 (review 7): small slips in the projects and finance screens.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn() }) }))

import Home from '@/views/Home.vue'
import { sortProjectsByName } from '@/domain/projectList'
import { withoutHoursNote } from '@/domain/pricePerHour'
import { projectDocuments, projectDocumentAmounts } from '@/domain/projectDocuments'
import { rectificativeSerial, isRectificativeSerial } from '@/domain/rectificativeSerial'
import ModalBoxWorkingDay from '@/components/ModalBoxWorkingDay.vue'

const names = ['ACTGI', 'Adrinoc', 'AKIS', 'APACAT', 'àrea', 'Bosc']

describe('projects list order', () => {
  it('is by name whatever the case and accents', () => {
    const sorted = sortProjectsByName(['APACAT', 'Bosc', 'AKIS', 'àrea', 'Adrinoc', 'ACTGI'].map((name, id) => ({ id, name })))
    expect(sorted.map(p => p.name)).toEqual(names)
  })

  it('stays so after a filter change, which came back in id order', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 1, name: 'Bosc' }, { id: 2, name: 'ACTGI' }, { id: 3, name: 'Adrinoc' }] })
    const vm = { filters: { project_state: 1, q: '', user: '0', scopeId: 0 }, applyProjects: vi.fn() }
    Home.methods.doFilteredQuery.call(vm, '')
    await vi.waitFor(() => expect(vm.applyProjects).toHaveBeenCalled())
    expect(vm.projects.map(p => p.name)).toEqual(['ACTGI', 'Adrinoc', 'Bosc'])
  })
})

describe('Preu hora note', () => {
  it('is singular for one project', () => {
    expect(withoutHoursNote(1, true)).toBe('1 projecte té despeses però cap hora prevista i no té preu hora.')
    expect(withoutHoursNote(3, false)).toBe('3 projectes tenen despeses però cap hora feta i no tenen preu hora.')
  })
})

describe('Moviments d\'ingressos i despeses amount', () => {
  // received income 2025-005: 16.000 €, 4.000 of it on APACAT's lines
  const form = {
    received_incomes: [{ id: 5, code: '2025-005', total_base: 16000, emitted: '2025-03-01' }],
    emitted_invoices: [{ id: 8, code: '2025-043', total_base: 2600, emitted: '2025-05-01' }],
    project_phases: [{
      incomes: [
        { total_amount: 2500, income: { id: 5 } },
        { total_amount: 1500, income: { id: 5 } },
        { total_amount: 300, invoice: null }
      ],
      expenses: []
    }]
  }

  it('is what the project\'s lines have of the document', () => {
    const amounts = projectDocumentAmounts(form)
    const [income, invoice] = projectDocuments(form, [])
    expect(amounts.get(`${income.docType}_${income.document.id}`)).toBe(4000)
    expect(amounts.has(`${invoice.docType}_${invoice.document.id}`)).toBe(false)
  })
})

describe('Persones period modal', () => {
  it('shows decimal commas and keeps dots in the form', async () => {
    const dedication = {
      id: 7, from: '2026-11-01', to: '2026-12-31', hours: 3.6, hoursperday: '', monthly_salary: 2146.39,
      scheme: 'general', quota: 0, pct_quota: 33.52, pct_irpf: 2, pct_other: 0, users_permissions_user: null
    }
    const w = mount(ModalBoxWorkingDay, {
      props: { isActive: false, dedicationObject: { _dedication: dedication }, users: [], years: [] },
      global: { plugins: [createPinia(), Buefy] },
      attachTo: document.body
    })
    await w.setProps({ isActive: true })
    const value = name => document.querySelector(`input[name="${name}"]`).value
    expect(value('hours')).toBe('3,6')
    expect(value('monthly_salary')).toBe('2146,39')
    expect(value('pct_quota')).toBe('33,52')
    const hours = document.querySelector('input[name="hours"]')
    hours.value = '7,5'
    hours.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    expect(w.vm.form.hours).toBe('7.5')
    expect(value('hours')).toBe('7,5')
    w.unmount()
  })
})

describe('rectificative series', () => {
  const series = [
    { id: 13, name: '2026' }, { id: 12, name: 'R2025', rectificative: true }, { id: 18, name: 'R2026', rectificative: true }
  ]

  it('starts with the rectificative series of the invoice date\'s year', () => {
    const r = rectificativeSerial(series, new Date(2026, 9, 20))
    expect(r.serial).toBe(18)
    expect(r.series.map(s => s.name)).toEqual(['R2025', 'R2026'])
    expect(r.missingYear).toBe(false)
  })

  // the user (2026-10-20): a rectificative always goes in a series flagged
  // rectificative, of its year or not
  it('falls back to the latest rectificative series when that year has none, and says so', () => {
    const r = rectificativeSerial([...series.slice(0, 2), { id: 9, name: 'R2024', rectificative: true }], new Date(2026, 9, 20))
    expect(r.serial).toBe(12)
    expect(r.serialName).toBe('R2025')
    expect(r.missingYear).toBe(true)
    expect(r.year).toBe('2026')
  })

  it('has no series when none is flagged rectificative', () => {
    const r = rectificativeSerial(series.slice(0, 1), new Date(2026, 9, 20))
    expect(r.serial).toBe(null)
    expect(r.missingYear).toBe(false)
  })

  it('only accepts a series flagged rectificative for a rectificative', () => {
    expect(isRectificativeSerial(series, 18)).toBe(true)
    expect(isRectificativeSerial(series, { id: 12 })).toBe(true)
    expect(isRectificativeSerial(series, 13)).toBe(false)
    expect(isRectificativeSerial(series, null)).toBe(false)
  })
})
