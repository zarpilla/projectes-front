// Orders list filters: the Sòcia dropdown next to the Sòcia column filter
// (issues/241) and the Prevista / Lliurada date column filters (issues/247).
import { describe, it, expect } from 'vitest'
import { dateFilterWhere, ownerWhere } from '@/domain/ordersListFilters'

describe('ownerWhere (issues/241)', () => {
  it('addresses the owner by id so it merges with owner.fullname_contains', () => {
    expect(ownerWhere(7)).toEqual(['_where[owner.id]=7'])
    expect(ownerWhere(null)).toEqual([])
  })
})

describe('dateFilterWhere (issues/247)', () => {
  const k = 'delivery_date'
  it('waits for a valid date on partial input', () => {
    for (const v of ['1', '10', '2', '202', '2026-13', '2026-0', '2026-02-30', '10-01', 'abc']) {
      expect(dateFilterWhere(k, v)).toEqual([])
    }
  })
  it('a year', () => {
    expect(dateFilterWhere(k, '2026')).toEqual(['_where[delivery_date_gte]=2026-01-01', '_where[delivery_date_lte]=2026-12-31'])
    expect(dateFilterWhere(k, '2026-')).toEqual(['_where[delivery_date_gte]=2026-01-01', '_where[delivery_date_lte]=2026-12-31'])
  })
  it('a month, padded, with the month end of that year', () => {
    expect(dateFilterWhere(k, '2026-1')).toEqual(['_where[delivery_date_gte]=2026-01-01', '_where[delivery_date_lte]=2026-01-31'])
    expect(dateFilterWhere(k, '2028-02')).toEqual(['_where[delivery_date_gte]=2028-02-01', '_where[delivery_date_lte]=2028-02-29'])
    expect(dateFilterWhere(k, '2027-02-')).toEqual(['_where[delivery_date_gte]=2027-02-01', '_where[delivery_date_lte]=2027-02-28'])
  })
  it('a day', () => {
    expect(dateFilterWhere(k, '2024-02-29')).toEqual(['_where[delivery_date_eq]=2024-02-29'])
    expect(dateFilterWhere(k, ' 2026-10-07 ')).toEqual(['_where[delivery_date_eq]=2026-10-07'])
  })
})
