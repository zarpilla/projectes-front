// issues/215, the user's decision (2026-10-19): «Nom comercial» is required on
// delivery points (contacts with an owner): the point forms and the points CSV
// import refuse a point without it, as the API does. Other contacts don't need
// it, and the old points without one still read as their name.
import { describe, it, expect, vi } from 'vitest'

const post = vi.fn(async () => ({ data: { id: 1 } }))
const put = vi.fn(async () => ({ data: {} }))
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })), put, post }) }))
import ContactsForm from '@/components/ContactsForm.vue'
import ContactsUserForm from '@/components/ContactsUserForm.vue'
import ImportExport from '@/views/ImportExport.vue'
import { missingTradeName, isDeliveryPoint, importRowMissingTradeName, TRADE_NAME_REQUIRED } from '@/domain/orderContacts'

const buefy = () => ({ snackbar: { open: vi.fn() }, toast: { open: vi.fn() }, dialog: { confirm: vi.fn() } })

function contactsFormVm (form) {
  const vm = {
    form: { name: 'Cal Inventat', address: 'C/ Prova 1', city: 'Poble Prova', postcode: '08000', phone: '600000000', nif: '', ...form },
    postcodeError: false,
    submitted: false,
    isLoading: false,
    permissions: ['orders_admin'],
    me: { id: 2 },
    $route: { query: {} },
    $router: { push: vi.fn() },
    $buefy: buefy(),
    getData: vi.fn()
  }
  Object.defineProperty(vm, 'tradeNameMissing', { get: () => ContactsForm.computed.tradeNameMissing.call(vm) })
  return vm
}

describe('the trade name of a delivery point (issues/215)', () => {
  it('is required on a point, not on other contacts', () => {
    expect(missingTradeName({ owner: 3, trade_name: null })).toBe(true)
    expect(missingTradeName({ owner: { id: 3 }, trade_name: '  ' })).toBe(true)
    expect(missingTradeName({ owner: 3, trade_name: 'Fleca Prova' })).toBe(false)
    expect(missingTradeName({ owner: 0, trade_name: null })).toBe(false)
    expect(missingTradeName({ owner: null })).toBe(false)
    expect(isDeliveryPoint({ owner: { id: 3 } })).toBe(true)
  })

  it('is asked by the contact form before saving a point', async () => {
    post.mockClear()
    put.mockClear()
    const vm = contactsFormVm({ owner: 3, trade_name: '' })
    await ContactsForm.methods.submit.call(vm)
    expect(post).not.toHaveBeenCalled()
    expect(vm.$buefy.snackbar.open.mock.calls[0][0].message).toBe(TRADE_NAME_REQUIRED)
    expect(vm.submitted).toBe(true)

    const edit = contactsFormVm({ id: 9, owner: 3, trade_name: null })
    await ContactsForm.methods.submit.call(edit)
    expect(put).not.toHaveBeenCalled()
  })

  it('is not asked for a contact without owner', async () => {
    post.mockClear()
    const vm = contactsFormVm({ owner: 0, trade_name: '', nif: 'B00000000' })
    await ContactsForm.methods.submit.call(vm)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("is an error of the members' point form when blank", () => {
    const errors = ContactsUserForm.computed.errors.call({ form: { trade_name: '   ' }, cities: [], slotErrors: [] })
    expect(errors.trade_name).toBe(true)
  })

  it('stops the points CSV import', () => {
    expect(importRowMissingTradeName({ trade_name: '' }, true)).toBe(true)
    expect(importRowMissingTradeName({ owner_id: '5' })).toBe(true)
    expect(importRowMissingTradeName({ name: 'Client' })).toBe(false)
    const vm = { importType: 'user-contacts', existingContacts: [] }
    const rows = ImportExport.methods.processRecords.call(vm, [{ name: 'Cal Inventat' }, { name: 'Fleca', trade_name: 'Fleca Prova' }])
    expect(rows.map(r => r.error || null)).toEqual([TRADE_NAME_REQUIRED, null])
    expect(ImportExport.computed.rowsWithErrors.call({ previewData: rows })).toEqual([1])
  })
})
