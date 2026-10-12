// OrdersTable row selection (issues/038): Buefy matches checked rows by object
// identity, so the rows given to the table must stay the same objects.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }) }))
import OrdersTable from '@/components/OrdersTable.vue'

const order = (over = {}) => ({
  id: 1,
  comments: 'Truqueu abans',
  refrigerated: true,
  fragile: true,
  contact: { notes: 'Porta blava', notes_delivery: 'Segon pis' },
  ...over
})

describe('OrdersTable rows', () => {
  it('theOrders keeps the same row objects between evaluations', () => {
    const vm = { orders: [order(), order({ id: 2 })] }
    const first = OrdersTable.computed.theOrders.call(vm)
    const checked = [first[0]]
    const second = OrdersTable.computed.theOrders.call(vm)
    expect(second).toHaveLength(2)
    expect(second.indexOf(checked[0])).toBe(0)
    expect(second[1]).toBe(first[1])
  })

  it('withNotes builds the comments and delivery notes columns', () => {
    const { withNotes } = OrdersTable.methods
    expect(withNotes(order())).toMatchObject({
      id: 1,
      commentsNotes: 'Porta blava - Truqueu abans - REFRIGERAT - FRÀGIL - Segon pis',
      notes_delivery: 'Segon pis'
    })
    expect(withNotes(order({ comments: null, refrigerated: false, fragile: false, contact: null }))).toMatchObject({
      commentsNotes: '',
      notes_delivery: ''
    })
  })
})
