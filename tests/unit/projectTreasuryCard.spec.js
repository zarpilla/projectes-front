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
  treasury_annotations: [{ concept: 'Previsió', total: 80 }]
}

describe('Tresoreria del projecte', () => {
  it('collected and paid are the lines whose document is paid', () => {
    const sums = treasurySums(projectTreasury(form))
    expect(sums).toMatchObject({ collected: 1300, toCollect: 780, paid: 450, toPay: 250 })
  })

  it('an annotation or a line without a document is still expected', () => {
    expect(treasuryEntrySettled({ docType: 'treasury', document: { paid: true } })).toBe(false)
    expect(treasuryEntrySettled({ docType: 'income', document: { paid: true } })).toBe(false)
  })

  it('keeps the «Fact.» split of the old card', () => {
    const sums = treasurySums(projectTreasury(form))
    expect(sums).toMatchObject({ incomesDone: 1800, incomesPending: 280, expensesDone: 650, expensesPending: 50 })
  })
})
