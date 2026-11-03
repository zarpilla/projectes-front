// Orders CSV import (issues/409): a member's file to another member's point
// («Soms Vianda», «VEREDA BAR») said «no trobat». The import read
// `contacts/basic`, which gives a member only her own and the shared points;
// it now reads every delivery point, like the order form.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({
  default: () => ({ get, put: vi.fn(), post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'

const { importCSV, getContactsForImport, removeAccents, withNotes, checkTransferNeeded } = OrdersTable.methods

// another member's point, named in capitals in ESSTRAPIS
const vereda = {
  id: 574,
  name: 'Vereda',
  trade_name: 'VEREDA  BAR',
  nif: 'B1',
  phone: '600',
  address: 'C/ Major 1',
  postcode: '17001',
  city: 'Girona',
  time_slot_1_ini: 9,
  time_slot_1_end: 13,
  sector: { id: 1 }
}

function ctx () {
  const me = { id: 65 }
  return {
    permissions: ['orders'],
    users: [me],
    me,
    routes: [{ id: 3, name: 'DC - GIRONA CIUTAT' }],
    pickups: [{ id: 1, name: 'Magatzem' }],
    deliveryTypes: [{ id: 1, refrigerated: false }, { id: 2, refrigerated: true }],
    routeRates: [],
    orders: [],
    csvErrors: [],
    nextDayLimitHour: 13,
    getContactsForImport,
    removeAccents,
    withNotes,
    checkTransferNeeded,
    createUUID: () => 'uuid',
    previewCSVDiscounts: vi.fn(),
    $buefy: { toast: { open: vi.fn() } }
  }
}

describe('orders CSV import, other members\' points (issues/409)', () => {
  it('loads every delivery point, not only the member\'s own', async () => {
    get.mockReset()
    get.mockResolvedValue({ data: [vereda] })
    const contacts = await getContactsForImport.call(ctx(), 65)
    expect(get).toHaveBeenCalledWith('contacts/for-orders?owned=1')
    expect(contacts).toEqual([vereda])
  })

  it('matches the point whatever the case and spaces of the name', async () => {
    get.mockReset()
    get.mockImplementation(url =>
      Promise.resolve({ data: url.startsWith('contacts/for-orders') ? [vereda] : [] })
    )
    const c = ctx()
    await importCSV.call(c, [{
      owner_id: '65',
      route_name: 'DC - GIRONA CIUTAT',
      contact_trade_name: ' Vereda Bar ',
      kilograms: '12',
      units: '1',
      pickup: '3',
      estimated_delivery_date: '20261104'
    }])
    expect(c.csvErrors).toEqual([])
    expect(c.orders).toHaveLength(1)
    expect(c.orders[0].contact.id).toBe(574)
  })
})
