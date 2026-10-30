// issues/371 (2026-10-30): a project can be billed «Per projecte» (as until
// now) or «Per hores». Per hores, the income lines with estimated hours are
// priced as hours × the project's price/hour, the budget is edited with a
// light editor instead of the phases, and the summary shows what is left to
// invoice. Every project shows its effective price/hour.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn().mockResolvedValue({ data: [] }), put: vi.fn() }) }))

import {
  billingModeOf,
  defaultBillingMode,
  weekdaysBetween,
  hoursOfLine,
  priceHoursLines,
  ensureHoursLine,
  otherLinesCount,
  pendingToInvoice
} from '@/domain/hoursBudget.js'
import ProjectHoursBudget from '@/components/ProjectHoursBudget.vue'
import ProjectSummaryCards from '@/components/ProjectSummaryCards.vue'
import MeForm from '@/components/MeForm.vue'

describe('hoursBudget domain (issues/371)', () => {
  it('a project without mode is billed per project; new ones follow Configuració', () => {
    expect(billingModeOf({})).toBe('project')
    expect(billingModeOf({ billing_mode: 'hours' })).toBe('hours')
    expect(defaultBillingMode(null)).toBe('project')
    expect(defaultBillingMode({ options: { default_billing_mode: 'hours' } })).toBe('hours')
  })

  it('counts the hours of total, weekly and monthly rows as the API does', () => {
    expect(weekdaysBetween('2026-11-02', '2026-11-15')).toBe(10)
    expect(hoursOfLine({
      estimated_hours: [
        { quantity: 20, quantity_type: 'total' },
        { quantity: 10, quantity_type: 'week', from: '2026-11-02', to: '2026-11-15' },
        { quantity: 43, quantity_type: 'month', from: '2026-11-02', to: '2026-11-06' }
      ]
    })).toBe(50)
  })

  it('prices the hour lines and leaves the others as typed', () => {
    const phases = [{
      incomes: [
        { id: 1, quantity: 1, amount: 900, estimated_hours: [{ quantity: 12.5 }] },
        { id: 2, concept: 'Material', quantity: 1, amount: 300, estimated_hours: [] }
      ],
      expenses: [{ quantity: 1, amount: 50 }]
    }]
    expect(priceHoursLines(phases, '45')).toBe(true)
    expect(phases[0].incomes[0]).toMatchObject({ quantity: 12.5, amount: 45, total_amount: 562.5, dirty: true })
    expect(phases[0].incomes[1]).toEqual({ id: 2, concept: 'Material', quantity: 1, amount: 300, estimated_hours: [] })
    expect(priceHoursLines(phases, 45)).toBe(false)
    expect(otherLinesCount(phases)).toBe(2)
  })

  it('an invoiced or collected hour line keeps the amount of its document', () => {
    const phases = [{ incomes: [
      { id: 1, quantity: 1, amount: 34800, paid: true, invoice: { id: 4 }, estimated_hours: [{ quantity: 645 }] },
      { id: 2, quantity: 1, amount: 100, invoice: 5, estimated_hours: [{ quantity: 10 }] },
      { id: 3, quantity: 0, amount: 0, invoice: null, estimated_hours: [{ quantity: 10 }] }
    ] }]
    priceHoursLines(phases, 50)
    expect(phases[0].incomes[0]).toMatchObject({ quantity: 1, amount: 34800 })
    expect(phases[0].incomes[1]).toMatchObject({ quantity: 1, amount: 100 })
    expect(phases[0].incomes[2]).toMatchObject({ quantity: 10, amount: 50 })
  })

  it('creates the phase and the «Hores» line of an empty budget', () => {
    const phases = []
    const line = ensureHoursLine(phases, 40)
    expect(phases).toHaveLength(1)
    expect(phases[0].name).toBe('Pressupost')
    expect(line).toMatchObject({ concept: 'Hores', amount: 40, estimated_hours: [] })
    expect(ensureHoursLine(phases, 40)).toBe(line)
  })

  it('pending to invoice is hours worked × price minus invoiced, never negative', () => {
    expect(pendingToInvoice(30, 45, 900)).toBe(450)
    expect(pendingToInvoice(10, 45, 900)).toBe(0)
  })
})

describe('ProjectHoursBudget (issues/371)', () => {
  const users = [{ id: 7, username: 'anna' }, { id: 8, username: 'pol', hidden: true }, { id: 9, username: 'rita', hidden: true }]
  const mountBudget = (phases, price = 40) =>
    mount(ProjectHoursBudget, {
      props: { phases, price, usersList: users, dateStart: '2026-11-01', dateEnd: '2026-12-31' },
      global: { plugins: [Buefy] }
    })

  it('adds hours to a new «Hores» line, priced at the project price', async () => {
    const phases = []
    const w = mountBudget(phases)
    await w.findAll('button').find(b => b.text().includes('Afegeix hores')).trigger('click')
    const line = phases[0].incomes[0]
    expect(line.estimated_hours[0]).toMatchObject({ quantity_type: 'total', from: '2026-11-01', to: '2026-12-31', dirty: true })
    await w.find('input[aria-label^="Hores de"]').setValue('12')
    expect(line).toMatchObject({ quantity: 12, amount: 40, total_amount: 480 })
    expect(w.emitted('phases-updated').length).toBeGreaterThan(1)
    expect(w.text()).toContain('Ingrés previst: 480,00 €')
  })

  it('offers the visible people and a hidden one who already has hours', () => {
    const phases = [{ incomes: [{ quantity: 1, amount: 40, estimated_hours: [{ id: 1, quantity: 5, users_permissions_user: { id: 8 } }] }] }]
    const w = mountBudget(phases)
    expect(w.findAll('option').map(o => o.text())).toEqual(['anna', 'pol'])
    expect(w.find('select').element.value).toBe('8')
  })

  it('reprices when the price changes and reports deleted saved hours', async () => {
    const phases = [{ id: 1, incomes: [{ id: 3, quantity: 10, amount: 40, estimated_hours: [{ id: 9, quantity: 10, users_permissions_user: { id: 7 } }] }], expenses: [] }]
    const w = mountBudget(phases)
    await w.setProps({ price: 50 })
    expect(phases[0].incomes[0]).toMatchObject({ quantity: 10, amount: 50, total_amount: 500 })
    await w.find('button[aria-label^="Treu les hores"]').trigger('click')
    expect(w.emitted('hour-deleted')[0]).toEqual([9])
    expect(phases[0].incomes[0].estimated_hours).toEqual([])
  })
})

describe('ProjectSummaryCards price/hour and pending (issues/371)', () => {
  const totals = {
    total_real_incomes: 900,
    total_real_expenses: 100,
    total_real_hours: 30,
    total_estimated_incomes: 1800,
    total_estimated_expenses: 200,
    total_estimated_hours: 40
  }
  const mountCards = props => mount(ProjectSummaryCards, { props: { totals, ...props }, global: { plugins: [Buefy] } })

  it('shows the effective price/hour of every project', () => {
    const w = mountCards()
    expect(w.find('.effective-price').text()).toBe('26,67 €')
    expect(w.find('.effective-price-estimated').text()).toBe('40,00 €')
    expect(w.find('.pending-invoice').exists()).toBe(false)
  })

  it('«Per hores» shows what is left to invoice', () => {
    const w = mountCards({ billingMode: 'hours', pricePerHour: 45 })
    expect(w.find('.pending-invoice').text()).toBe('450,00 €')
  })
})

describe('Configuració: default billing mode (issues/371)', () => {
  it('is «Per projecte» when empty and is stored in the options', () => {
    const c = { form: { options: { id: 1 } } }
    const prop = MeForm.computed.defaultBillingMode
    expect(prop.get.call(c)).toBe('project')
    prop.set.call(c, 'hours')
    expect(c.form.options).toEqual({ id: 1, default_billing_mode: 'hours' })
    expect(prop.get.call(c)).toBe('hours')
  })
})
