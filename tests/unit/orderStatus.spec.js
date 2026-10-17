// issues/083: the order form had no button for an order in «lastmile»,
// «deposited» or «distributing» (its header showed the raw key), and picking
// «Última milla» with other statuses in the orders list narrowed the list
// (status AND last_mile) instead of adding the last-mile orders.
import { describe, it, expect } from 'vitest'
import { statusWhere, formStatuses, orderStatusLabel, FORM_STATUSES } from '@/domain/orderStatus'

describe('order statuses (issues/083)', () => {
  it('names every status of the schema', () => {
    for (const s of ['pending', 'deposited', 'processed', 'delivered', 'invoiced', 'cancelled', 'distributing', 'lastmile']) {
      expect(orderStatusLabel(s)).not.toBe(s)
    }
  })

  it('shows the order\'s own status in the form even when it is not a usual one', () => {
    expect(formStatuses('pending')).toEqual(FORM_STATUSES)
    expect(formStatuses('lastmile')).toEqual([...FORM_STATUSES, 'lastmile'])
    expect(formStatuses(undefined)).toEqual(FORM_STATUSES)
  })

  it('filters the list by status, by last mile, or by either', () => {
    expect(statusWhere([])).toEqual([])
    expect(statusWhere(['pending'])).toEqual(['_where[status]=pending'])
    expect(statusWhere(['pending', 'processed'])).toEqual(['_where[status]=pending', '_where[status]=processed'])
    expect(statusWhere(['lastmile'])).toEqual(['_where[last_mile]=true'])
    expect(statusWhere(['pending', 'lastmile', 'processed'])).toEqual([
      '_where[_or][0][status_in][0]=pending',
      '_where[_or][0][status_in][1]=processed',
      '_where[_or][1][last_mile]=true'
    ])
  })
})
