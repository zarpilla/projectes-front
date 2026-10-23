// issues/182: small bugs of the third redesign review: Intercooperació blank
// when the base path is «/», the delivery point form (a person's name and phone
// in the help, another member's point editable by URL and «Error» on save, no
// CP from the town), «Exporta» with no rows doing nothing, and the new project
// wizard's copies keeping the originals' documentId.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))

import { underBase } from '@/helpers/addScript'
import { memberMayEdit, townKey } from '@/domain/contactAccess'
import ContactsUserForm from '@/components/ContactsUserForm.vue'
import DownloadExcel from '@/components/DownloadExcel.vue'
import ProjectForm from '@/views/ProjectForm.vue'

describe('files under the base path (issues/182)', () => {
  it('one slash between them, whatever the base', () => {
    expect(underBase('/', 'vendor/kendo/kendo.all.min.js')).toBe('/vendor/kendo/kendo.all.min.js')
    expect(underBase('/stats/', '/vendor/kendo/custom.css')).toBe('/stats/vendor/kendo/custom.css')
    expect(underBase('', 'vendor/x.js')).toBe('/vendor/x.js')
  })
})

describe('delivery point form (issues/182)', () => {
  beforeEach(() => get.mockReset())

  it('no person in the town help', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/ContactsUserForm.vue'), 'utf8')
    expect(source).not.toMatch(/722 84 49 98|la Carla/)
  })

  it('a member edits her points, shared ones and the ones she sends orders to', () => {
    expect(memberMayEdit({ owner: 5 }, 5)).toBe(true)
    expect(memberMayEdit({ owner: { id: 7 }, users_permissions_user: 5 }, 5)).toBe(true)
    expect(memberMayEdit({ owner: 7, multiowner: true }, 5)).toBe(true)
    expect(memberMayEdit({ owner: 7 }, 5, 2)).toBe(true)
    expect(memberMayEdit({ owner: 7 }, 5)).toBe(false)
  })

  it('another member\'s point opens read-only', async () => {
    get.mockResolvedValue({ data: 0 })
    const vm = { permissions: ['orders'], me: { id: 5 }, readOnly: false }
    await ContactsUserForm.methods.checkReadOnly.call(vm, { id: 9, owner: 7 })
    expect(get).toHaveBeenCalledWith('orders/table/count?_where[owner]=5&_where[contact]=9')
    expect(vm.readOnly).toBe(true)

    const office = { permissions: ['orders_admin'], me: { id: 1 }, readOnly: false }
    await ContactsUserForm.methods.checkReadOnly.call(office, { id: 9, owner: 7 })
    expect(office.readOnly).toBe(false)
  })

  it('a read-only point is not sent', async () => {
    const vm = { readOnly: true, isLoading: false }
    await ContactsUserForm.methods.submit.call(vm)
    expect(vm.isLoading).toBe(false)
  })

  it('picking the town fills the CP, unless one is typed', async () => {
    const vm = { form: { city: null, postcode: '' }, townPostcodes: { [townKey('Sant Cugat del Vallès')]: '08172' } }
    await ContactsUserForm.methods.citySelected.call(vm, { name: 'Sant Cugat del Vallès' })
    expect(vm.form).toEqual({ city: 'Sant Cugat del Vallès', postcode: '08172' })
    vm.form.postcode = '08173'
    await ContactsUserForm.methods.citySelected.call(vm, { name: 'Sant Cugat del Vallès' })
    expect(vm.form.postcode).toBe('08173')
  })
})

describe('export with no rows (issues/182)', () => {
  it('says there is nothing to export', async () => {
    const open = vi.fn()
    await DownloadExcel.methods.generate.call({ data: [], $buefy: { toast: { open } } })
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ message: 'No hi ha dades per exportar' }))
  })
})

describe('new project wizard copies (issues/182)', () => {
  it('the copied phases, lines and hours have neither id nor documentId', () => {
    vi.useFakeTimers()
    const vm = {
      form: {
        date_end: '2026-12-31',
        project_original_phases: [{
          id: 1, documentId: 'p1',
          incomes: [{ id: 2, documentId: 'i2', date: '2026-01-01', estimated_hours: [{ id: 3, documentId: 'h3', from: '2026-01-01' }] }],
          expenses: [{ id: 4, documentId: 'e4', date: null }]
        }]
      }
    }
    ProjectForm.methods.closeQuoteFromOriginal.call(vm)
    const [phase] = vm.form.project_phases
    const rows = [phase, phase.incomes[0], phase.incomes[0].estimated_hours[0], phase.expenses[0]]
    for (const row of rows) {
      expect(row).not.toHaveProperty('id')
      expect(row).not.toHaveProperty('documentId')
    }
    expect(vm.form.project_original_phases[0].documentId).toBe('p1')
    vi.useRealTimers()
  })
})
