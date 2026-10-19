// issues/173: «Tresoreria del projecte» called «Realitzat» the lines ticked
// «Fact.» and subtracted the pending from it («Pagaments 3.450,00 € · 2.508,78 €
// · −941,22 €»). Collected and paid now follow the documents' payment, like
// Tresoreria: a line counts once its document is paid.
import { describe, it, expect } from 'vitest'
import { projectTreasury, treasurySums, treasuryEntrySettled } from '@/domain/projectTreasury'

const form = {
  project_phases: [{
    incomes: [
      { total_amount: 1000, paid: true, invoice: { id: 1, paid: true } }, // invoiced and collected
      { total_amount: 500, paid: true, invoice: { id: 2, paid: false } }, // invoiced, not collected yet
      { total_amount: 200, paid: false }, // not invoiced
      { total_amount: 300, paid: true, grant: { id: 3, paid: true } }
    ],
    expenses: [
      { total_amount: 400, paid: true, ticket: { id: 4, paid: true } },
      { total_amount: 250, paid: true, invoice: { id: 5, paid: false } },
      { total_amount: 50, paid: false, expense: { id: 6, paid: true } } // paid document, «Fact.» not ticked
    ]
  }],
  treasury_annotations: [{ concept: 'Previsió', total: 80, date: '2099-01-01' }]
}

describe('Tresoreria del projecte', () => {
  it('collected and paid are the lines whose document is paid', () => {
    const sums = treasurySums(projectTreasury(form))
    expect(sums).toMatchObject({ collected: 1300, toCollect: 780, paid: 450, toPay: 250 })
  })

  it('an annotation or a line without a document is still expected', () => {
    expect(treasuryEntrySettled({ docType: 'treasury', document: { paid: true, date: '2099-01-01' } })).toBe(false)
    expect(treasuryEntrySettled({ docType: 'income', document: { paid: true } })).toBe(false)
  })

  it('keeps the «Fact.» split of the old card', () => {
    const sums = treasurySums(projectTreasury(form))
    expect(sums).toMatchObject({ incomesDone: 1800, incomesPending: 280, expensesDone: 650, expensesPending: 50 })
  })
})

// issues/196: every annotation went under Cobraments and stayed pending, so the
// −157.130,22 € of payments to partners of project 388 made «pendent» negative.
describe('Tresoreria del projecte: treasury annotations (issues/196)', () => {
  const today = '2026-10-19'
  const withAnnotations = treasury_annotations => treasurySums(projectTreasury({ project_phases: [], treasury_annotations }), today)

  it('a negative annotation is a payment, a positive one a collection', () => {
    expect(withAnnotations([
      { total: -157130.22, date: '2026-12-01' },
      { total: 635.25, date: '2026-12-01' }
    ])).toMatchObject({ collected: 0, toCollect: 635.25, paid: 0, toPay: 157130.22 })
  })

  it('an annotation is done once its date has come, as in Tresoreria', () => {
    expect(withAnnotations([
      { total: -100, date: '2023-05-02' },
      { total: 50, date: today },
      { total: 20, date: '2026-10-20' },
      { total: 5, date: null }
    ])).toMatchObject({ collected: 50, toCollect: 25, paid: 100, toPay: 0 })
  })

  it('leaves out «saldo real» annotations, which set a balance', () => {
    expect(withAnnotations([{ total: 9000, date: '2026-01-01', is_real_balance: true }]))
      .toMatchObject({ collected: 0, toCollect: 0, paid: 0, toPay: 0 })
  })

  it('keeps the annotation\'s own sign in the movements list', () => {
    const [entry] = projectTreasury({ project_phases: [], treasury_annotations: [{ total: -40, date: today }] })
    expect(entry.document.total_amount * entry.multiplier).toBe(-40)
  })
})
