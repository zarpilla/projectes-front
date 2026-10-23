import { describe, it, expect } from 'vitest'
import moment from 'moment'
import { signalWhere } from '@/domain/orderSignals'

describe('signalWhere: the «Senyals» filter as query clauses', () => {
  it('asks the orders with an incidence', () => {
    expect(signalWhere('incidence')).toEqual(['_where[incidences.id_null]=false'])
  })
  it('asks last mile as a signal', () => {
    expect(signalWhere('last-mile')).toEqual(['_where[last_mile]=true'])
  })
  it('next week starts on next Monday', () => {
    expect(signalWhere('next-week', moment('2026-10-23'))).toEqual(['_where[estimated_delivery_date_gte]=2026-10-26'])
    expect(signalWhere('next-week', moment('2026-10-26'))).toEqual(['_where[estimated_delivery_date_gte]=2026-11-02'])
  })
  it('an unknown signal filters nothing', () => {
    expect(signalWhere('nope')).toEqual([])
  })
})
