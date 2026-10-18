// The Ingressos list had no way to find the drafts but sorting by code: the
// «Estat» filter shows only the drafts («Esborranys») or only the issued
// invoices («Emeses»).
import { describe, it, expect } from 'vitest'
import { stateFilter, STATE_OPTIONS } from '@/domain/incomeListFilters'

describe('Ingressos «Estat» filter', () => {
  it('offers Tots, Esborranys and Emeses, not in capitals', () => {
    expect(STATE_OPTIONS.map(o => o.name)).toEqual(['Tots', 'Esborranys', 'Emeses'])
  })

  it('drafts: only draft invoices, no received incomes (they are never drafts)', () => {
    expect(stateFilter(1)).toEqual({ invoiceQuery: '&[state_eq]=draft', includeIncomes: false })
  })

  it('issued: issued invoices and the received incomes', () => {
    expect(stateFilter(2)).toEqual({ invoiceQuery: '&[state_eq]=real', includeIncomes: true })
  })

  it('all: no filter', () => {
    expect(stateFilter(0)).toEqual({ invoiceQuery: '', includeIncomes: true })
  })
})
