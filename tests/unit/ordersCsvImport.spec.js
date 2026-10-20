// Orders CSV import (issues/231): the provider order number of the file is
// kept, and a route or delivery point without a name doesn't stop the import.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn().mockResolvedValue({ data: [] }), put: vi.fn(), post: vi.fn() })
}))
import OrdersTable from '@/components/OrdersTable.vue'

const { importCSV, removeAccents, withNotes, checkTransferNeeded } = OrdersTable.methods

const contact = (over = {}) => ({
  id: 10,
  name: 'Ateneu',
  trade_name: 'Ateneu La Torna',
  nif: 'B1',
  phone: '600',
  address: 'C/ Major 1',
  postcode: '08001',
  city: 'Barcelona',
  time_slot_1_ini: 9,
  time_slot_1_end: 13,
  sector: { id: 1 },
  ...over
})

function ctx ({ contacts = [contact()], routes = [{ id: 3, name: 'DJ - BCN' }] } = {}) {
  const me = { id: 114 }
  return {
    permissions: ['orders_admin'],
    users: [me],
    me,
    routes,
    pickups: [{ id: 1, name: 'Magatzem' }],
    deliveryTypes: [{ id: 1, refrigerated: false }, { id: 2, refrigerated: true }],
    routeRates: [],
    orders: [],
    csvErrors: [],
    nextDayLimitHour: 13,
    getContactsForImport: vi.fn().mockResolvedValue(contacts),
    removeAccents,
    withNotes,
    checkTransferNeeded,
    createUUID: () => 'uuid',
    $buefy: { toast: { open: vi.fn() } }
  }
}

const record = (over = {}) => ({
  owner_id: '114',
  route_name: 'DJ - BCN',
  contact_trade_name: 'Ateneu La Torna',
  kilograms: '12',
  units: '2',
  refrigerated: '0',
  estimated_delivery_date: '20261022',
  notes: 'Truqueu abans',
  provider_order_number: '2024/0605',
  ...over
})

describe('orders CSV import (issues/231)', () => {
  it('keeps the provider order number of each row', async () => {
    const c = ctx()
    await importCSV.call(c, [record(), record({ provider_order_number: '' })])
    expect(c.csvErrors).toEqual([])
    expect(c.orders).toHaveLength(2)
    expect(c.orders[1].provider_order_number).toBe('2024/0605')
    expect(c.orders[0].provider_order_number).toBe(null)
  })

  it('removeAccents takes a missing name as empty', () => {
    expect(removeAccents(null)).toBe('')
    expect(removeAccents(undefined)).toBe('')
    expect(removeAccents(' Àvila ')).toBe('avila')
  })

  it('ignores routes and points without a name', async () => {
    const c = ctx({
      contacts: [contact({ id: 9, trade_name: null }), contact()],
      routes: [{ id: 28, name: null }, { id: 3, name: 'DJ - BCN' }]
    })
    await importCSV.call(c, [record()])
    expect(c.csvErrors).toEqual([])
    expect(c.orders).toHaveLength(1)
    expect(c.orders[0].route.id).toBe(3)
    expect(c.orders[0].contact.id).toBe(10)
  })
})

// issues/269: the import read the kilos with parseInt: 12.5 became 12 kg (and
// its price) and 0.5 was refused as «Kilograms incorrectes».
describe('orders CSV import kilos (issues/269)', () => {
  it.each([['12.5', 12.5], ['12,5', 12.5], ['0.5', 0.5], ['0,25', 0.25], ['12', 12], [' 3,75 ', 3.75]])(
    'keeps %s as %s kg',
    async (kilograms, expected) => {
      const c = ctx()
      await importCSV.call(c, [record({ kilograms })])
      expect(c.csvErrors).toEqual([])
      expect(c.orders[0].kilograms).toBe(expected)
    }
  )

  it.each([['0'], ['-2'], ['abc'], [''], ['1.2.3']])('refuses %s', async (kilograms) => {
    const c = ctx()
    await importCSV.call(c, [record({ kilograms })])
    expect(c.csvErrors).toEqual([expect.objectContaining({ error: 'Kilograms incorrectes (kilograms)' })])
    expect(c.orders).toHaveLength(0)
  })
})

// issues/285: a semicolon file was only detected by a «;» in its first 10
// characters, so a header starting with «route_name» (10 characters) was read
// as comma-separated and failed with «Invalid Record Length»; a later comma
// file kept the «;» of the previous one
describe('orders CSV delimiter (issues/285)', () => {
  const { readCSV } = OrdersTable.methods
  const read = (self, text) => readCSV.call(self, text)
  const self = () => ({ csvOptions: { delimiter: ',', columns: true } })

  it('reads a semicolon file whose first column name is 10 characters long', async () => {
    const records = await read(self(), 'route_name;kilograms\nDJ - BCN;12,5\n')
    expect(records).toEqual([{ route_name: 'DJ - BCN', kilograms: '12,5' }])
  })

  it('picks the delimiter of each file', async () => {
    const s = self()
    await read(s, 'owner_id;kilograms\n1;2\n')
    const records = await read(s, 'owner_id,kilograms\n1,2.5\n')
    expect(records).toEqual([{ owner_id: '1', kilograms: '2.5' }])
  })
})
