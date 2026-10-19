// issues/215 (redesign review 5, 2026-10-19): one delivery point without
// «Nom comercial» (Contactes requires only name and phone) blanked every order
// form: `filteredContacts` called `trade_name.toString()` on null, and the new
// order's point search offered «null (…)». The point reads as its name now.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import OrdersForm from '@/components/OrdersForm.vue'
import { contactName, contactLabel, matchesContact } from '@/domain/orderContacts'

const NAMED = { id: 7, name: 'Fleca Prova SL', trade_name: 'Fleca Prova', display: 'Fleca Prova (7)' }
const NO_TRADE_NAME = { id: 9, name: 'Cal Inventat', trade_name: null, display: 'Cal Inventat (9)' }
const NOTHING = { id: 11, name: null, trade_name: null, display: null }

describe('a delivery point without trade name (issues/215)', () => {
  it('does not break the point search of the order form', () => {
    const filtered = contactSearch =>
      OrdersForm.computed.filteredContacts.call({ contacts: [NAMED, NO_TRADE_NAME, NOTHING], contactSearch })
    expect(filtered('').map(c => c.id)).toEqual([7, 9, 11])
    expect(filtered('inventat').map(c => c.id)).toEqual([9])
    expect(filtered('11').map(c => c.id)).toEqual([11])
  })

  it('reads as its name', () => {
    expect(contactName(NAMED)).toBe('Fleca Prova')
    expect(contactName(NO_TRADE_NAME)).toBe('Cal Inventat')
    expect(contactName({ trade_name: '', name: 'Cal Inventat' })).toBe('Cal Inventat')
    expect(contactName(NOTHING)).toBe('')
    expect(contactName(null)).toBe('')
    expect(contactLabel(NO_TRADE_NAME)).toBe('Cal Inventat (9)')
    expect(contactLabel(NAMED)).toBe('Fleca Prova (7)')
  })

  it('is found by name, trade name or id', () => {
    expect(matchesContact(NO_TRADE_NAME, 'cal')).toBe(true)
    expect(matchesContact(NAMED, 'fleca prova sl')).toBe(true)
    expect(matchesContact(NAMED, 'xyz')).toBe(false)
    expect(matchesContact(NOTHING, null)).toBe(true)
  })

  it('labels the loaded points with their name in the point search', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 9, name: 'Cal Inventat', trade_name: null }] })
    const vm = { form: {}, isPickupPoint: false, contacts: [], clientsLoadedFor: null }
    await OrdersForm.methods.refreshClients.call(vm, 3)
    expect(vm.contacts.map(c => c.display)).toEqual(['Cal Inventat (9)'])
  })
})
