// issues/420 (2026-11-09): with «Despesa indirecta als projectes» on (Configuració
// general › Projectes, off by default), a project has «Despeses indirectes (%)»
// under «Tipus de dedicació». The «Resum» adds the row «Despeses indirectes
// (X %)» below Preu/hora (that % of the expenses total, original / previst /
// executat) and adds it to the «Despeses» card. The result doesn't change.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import ProjectSummaryCards from '@/components/ProjectSummaryCards.vue'
import ProjectForm from '@/views/ProjectForm.vue'

const totals = {
  total_original_expenses: 1000, total_original_hours_price: 0, total_original_expenses_vat: 0,
  total_estimated_expenses: 2000, total_estimated_hours_price: 0, total_estimated_expenses_vat: 0,
  total_real_expenses: 500, total_real_hours_price: 500, total_real_expenses_vat: 0,
  original_incomes_expenses: 100, estimated_incomes_expenses: 200, total_real_incomes_expenses: 300
}
const mountCards = props => mount(ProjectSummaryCards, { props: { totals, ...props }, global: { plugins: [Buefy] } })
const rowTexts = w => w.findAll('tbody tr').map(tr => tr.findAll('th, td').map(c => c.text()))

describe('indirect expenses in the project summary (issues/420)', () => {
  it('adds the row below Preu/hora and the amount to the Despeses card', () => {
    const w = mountCards({ indirectPct: 12.5 })
    const rows = rowTexts(w)
    expect(rows.at(-2)[0]).toBe('Preu/hora')
    expect(rows.at(-1)).toEqual(['Despeses indirectes (12,5 %)', '125,00 €', '250,00 €', '125,00 €'])
    expect(w.find('.expenses-real').text()).toBe('1.125,00 €')
    expect(w.find('.expenses-estimated').text()).toBe('2.250,00 €')
    expect(w.find('.expenses-original').text()).toBe('1.125,00 €')
    // «Despeses totals» of the table and the result stay as they were
    expect(rows.find(r => r[0] === 'Despeses totals')).toEqual(['Despeses totals', '1.000,00 €', '2.000,00 €', '1.000,00 €'])
    expect(rows.find(r => r[0] === 'Resultat')).toEqual(['Resultat', '100,00 €', '200,00 €', '300,00 €'])
  })

  it('without a % there is no row and nothing is added', () => {
    const w = mountCards({})
    expect(w.text()).not.toContain('Despeses indirectes')
    expect(w.find('.expenses-real').text()).toBe('1.000,00 €')
  })

  it('the form uses the % only when the option is on', () => {
    const on = ProjectForm.computed.indirectExpensesOn
    const pct = ProjectForm.computed.summaryIndirectPct
    expect(on.call({ me: { options: { structuralExpenses: true } } })).toBe(true)
    expect(on.call({ me: { options: { structuralExpenses: false } } })).toBe(false)
    expect(on.call({ me: {} })).toBe(false)
    expect(pct.call({ indirectExpensesOn: true, form: { structural_expenses_pct: '15' } })).toBe(15)
    expect(pct.call({ indirectExpensesOn: false, form: { structural_expenses_pct: '15' } })).toBe(0)
  })
})
