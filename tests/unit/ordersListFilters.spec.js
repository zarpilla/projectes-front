// Orders list filters: the Sòcia dropdown next to the Sòcia column filter
// (issues/241).
import { describe, it, expect } from 'vitest'
import { ownerWhere } from '@/domain/ordersListFilters'

describe('ownerWhere (issues/241)', () => {
  it('addresses the owner by id so it merges with owner.fullname_contains', () => {
    expect(ownerWhere(7)).toEqual(['_where[owner.id]=7'])
    expect(ownerWhere(null)).toEqual([])
  })
})
