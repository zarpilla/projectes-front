// issues/421 (2026-11-09): in a project billed «Per hores» each planning line
// (estimated hours) can carry its own price/hour; empty follows the project's
// price/hour from Dades. The Gantt pop-up shows «Preu/hora» (editable) instead
// of «Cost/hora», the hours budget lives under the Gantt in «Planificació i
// preu/hora», and the summary shows «Preu/hora facturat previst».
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Buefy from 'buefy'
import { buefyConfig } from '@/helpers/buefyConfig'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn().mockResolvedValue({ data: [{ id: 7, username: 'anna' }] }), put: vi.fn() }) }))

import { rowPrice, hasOwnPrice, rowAmount, priceHoursLines, plannedPricePerHour, pendingToInvoice } from '@/domain/hoursBudget.js'
import ProjectHoursBudget from '@/components/ProjectHoursBudget.vue'
import ProjectSummaryCards from '@/components/ProjectSummaryCards.vue'
import ModalBoxEstimatedHours from '@/components/ModalBoxEstimatedHours.vue'
import ProjectForm from '@/views/ProjectForm.vue'

const plan = (rows, line = {}) => [{ id: 1, incomes: [{ id: 3, quantity: 0, amount: 0, estimated_hours: rows, ...line }], expenses: [] }]

describe('hoursBudget: price per planning row (issues/421)', () => {
  it('an empty row price follows the project, a typed one wins (0 too)', () => {
    expect(rowPrice({ price: null }, 40)).toBe(40)
    expect(rowPrice({ price: '' }, 40)).toBe(40)
    expect(rowPrice({}, 40)).toBe(40)
    expect(rowPrice({ price: 55 }, 40)).toBe(55)
    expect(rowPrice({ price: 0 }, 40)).toBe(0)
    expect(hasOwnPrice({ price: 0 })).toBe(true)
    expect(hasOwnPrice({ price: null })).toBe(false)
    expect(rowAmount({ quantity: 10, price: 55 }, 40)).toBe(550)
  })

  it('prices the line with the weighted price of its rows', () => {
    const phases = plan([{ quantity: 10, price: 60 }, { quantity: 10 }])
    expect(priceHoursLines(phases, 40)).toBe(true)
    expect(phases[0].incomes[0]).toMatchObject({ quantity: 20, amount: 50, total_amount: 1000, dirty: true })
  })

  it('a project price change moves only the rows that follow it', () => {
    const phases = plan([{ quantity: 10, price: 60 }, { quantity: 10 }])
    priceHoursLines(phases, 50)
    expect(phases[0].incomes[0]).toMatchObject({ amount: 55, total_amount: 1100 })
  })

  it('the planned billing price is Σ hours × row price / Σ hours, the project price without hours', () => {
    expect(plannedPricePerHour(plan([{ quantity: 30, price: 60 }, { quantity: 10 }]), 40)).toBe(55)
    expect(plannedPricePerHour([], 40)).toBe(40)
  })
})

describe('ProjectHoursBudget price per row (issues/421)', () => {
  const users = [{ id: 7, username: 'anna' }]
  const mountBudget = (phases, price = 40) =>
    mount(ProjectHoursBudget, {
      props: { phases, price, usersList: users },
      global: { plugins: [[Buefy, buefyConfig]] }
    })

  it('edits a row price, shows its amount, and clearing it follows the project again', async () => {
    const phases = plan([{ id: 9, quantity: 10, users_permissions_user: { id: 7 } }, { id: 10, quantity: 10, users_permissions_user: { id: 7 } }])
    const w = mountBudget(phases)
    const inputs = w.findAll('input[aria-label^="Preu/hora de"]')
    expect(inputs.length).toBe(2)
    expect(inputs[0].attributes('placeholder')).toBe('40,00')
    await inputs[0].setValue('60')
    const row = phases[0].incomes[0].estimated_hours[0]
    expect(row).toMatchObject({ price: 60, dirty: true })
    expect(phases[0].incomes[0]).toMatchObject({ quantity: 20, amount: 50, total_amount: 1000 })
    expect(w.findAll('.row-amount').map(c => c.text())).toEqual(['600,00 €', '400,00 €'])
    expect(w.text()).toContain('Ingrés previst: 1.000,00 €')
    await inputs[0].setValue('')
    expect(row.price).toBe(null)
    expect(phases[0].incomes[0]).toMatchObject({ amount: 40, total_amount: 800 })
  })
})

describe('ProjectHoursBudget invoiced line (issues/421)', () => {
  it('locks the row price and shows «Facturada» instead of hours × price', () => {
    const phases = plan([{ id: 9, quantity: 10, users_permissions_user: { id: 7 } }], { paid: true, quantity: 1, amount: 900 })
    const w = mount(ProjectHoursBudget, { props: { phases, price: 40, usersList: [{ id: 7, username: 'anna' }] }, global: { plugins: [[Buefy, buefyConfig]] } })
    expect(w.find('input[aria-label^="Preu/hora de"]').attributes('disabled')).toBeDefined()
    expect(w.find('.row-amount').text()).toBe('Facturada')
  })
})

describe('Gantt pop-up in a project billed by the hour (issues/421)', () => {
  const mountModal = (props) => {
    setActivePinia(createPinia())
    return mount(ModalBoxEstimatedHours, {
      props: { isActive: false, dedications: [], ...props },
      global: { plugins: [[Buefy, buefyConfig]], stubs: { ModalBox: true } }
    })
  }
  const hoursTask = (hours) => ({ id: 100, _uuid: null, _hours: { quantity: 8, quantity_type: 'total', amount: 21.55, users_permissions_user: { id: 7, username: 'anna' }, ...hours }, _phase: { id: 1 }, _subphase: {} })

  it('shows «Preu/hora» with the project price instead of «Cost/hora», and keeps following it if untouched', async () => {
    const task = hoursTask({})
    const w = mountModal({ dedicationObject: task, hoursMode: true, projectPrice: 45 })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.text()).toContain('Preu/hora')
    expect(w.text()).not.toContain('Cost/hora')
    const input = w.find('input[aria-label="Preu/hora"]')
    expect(input.element.value).toBe('45')
    await w.find('form').trigger('submit')
    expect(task._hours.price).toBe(null)
    expect(task._hours.amount).toBe(21.55) // the cost stays the person's
  })

  it('a changed price is stored on the line', async () => {
    const task = hoursTask({ price: 50 })
    const w = mountModal({ dedicationObject: task, hoursMode: true, projectPrice: 45 })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.find('input[aria-label="Preu/hora"]').element.value).toBe('50')
    await w.find('input[aria-label="Preu/hora"]').setValue('62,5')
    await w.find('form').trigger('submit')
    expect(task._hours.price).toBe(62.5)
  })

  it('locks the price of an invoiced line', async () => {
    const task = { ...hoursTask({}), _subphase: { paid: true } }
    const w = mountModal({ dedicationObject: task, hoursMode: true, projectPrice: 45 })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.find('input[aria-label="Preu/hora"]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('ja està facturada')
  })

  it('«Per projecte» keeps the read-only «Cost/hora» and no price', async () => {
    const task = hoursTask({})
    const w = mountModal({ dedicationObject: task, hoursMode: false, projectPrice: 45 })
    await w.setProps({ isActive: true })
    await flushPromises()
    expect(w.find('input[aria-label="Preu/hora"]').exists()).toBe(false)
    await w.find('form').trigger('submit')
    expect(task._hours.price).toBe(undefined)
  })
})

describe('summary and tab (issues/421)', () => {
  const totals = { total_real_hours: 10, total_estimated_hours: 40, total_estimated_incomes: 2000 }
  const mountCards = props => mount(ProjectSummaryCards, { props: { totals, ...props }, global: { plugins: [Buefy] } })

  it('«Per hores» shows «Preu/hora facturat previst»; «Cost/hora» is still the people’s cost', () => {
    const w = mountCards({ billingMode: 'hours', pricePerHour: 45, plannedBillingPrice: 52.5 })
    expect(w.find('.planned-billing-price').text()).toBe('52,50 €')
    expect(w.text()).toContain('Preu/hora facturat previst')
    expect(mountCards({ billingMode: 'project', plannedBillingPrice: null }).find('.planned-billing-price').exists()).toBe(false)
  })

  it('«Per facturar» uses the hours worked priced per planning line when the API gives them', () => {
    expect(pendingToInvoice(10, 45, 100, 620)).toBe(520)
    expect(pendingToInvoice(10, 45, 100)).toBe(350)
    expect(pendingToInvoice(10, 45, 900, 620)).toBe(0)
    const w = mountCards({ billingMode: 'hours', pricePerHour: 45, totals: { ...totals, total_real_incomes: 100, total_real_hours_billed: 620 } })
    expect(w.find('.pending-invoice').text()).toBe('520,00 €')
  })

  it('the planning tab is «Planificació i preu/hora» only «Per hores»', () => {
    const label = ProjectForm.computed.planningLabel
    expect(label.call({ hoursMode: true })).toBe('Planificació i preu/hora')
    expect(label.call({ hoursMode: false })).toBe('Planificació')
    const tabs = ProjectForm.computed.projectTabs.call({ isDuplicating: false, planningLabel: 'Planificació i preu/hora' })
    expect(tabs.find(t => t.id === 'planificacio').label).toBe('Planificació i preu/hora')
  })
})
