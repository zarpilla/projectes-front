// issues/140: the holidays for everyone (Festiu Estatal, Festiu Catalunya: festive
// types with personal = false) could not be entered from the app: the «Festiu»
// dialog only offered personal types, and a new holiday started with the first
// type of all (a type for everyone, not offered). Admins now get those types
// too, without a person; anyone else sees them read-only.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
vi.mock('@/domain/currentUser', () => ({ findCurrentUser: users => users[0] }))
import ModalBoxFestive from '@/components/ModalBoxFestive.vue'

const TYPES = [
  { id: 1, name: 'Festiu Estatal', personal: false },
  { id: 2, name: 'Festiu Catalunya', personal: false },
  { id: 3, name: 'Festiu Local', personal: true },
  { id: 4, name: 'Vacances', personal: true }
]
const USERS = [{ id: 15, username: 'Quim Puig' }]

const dialog = (props) => {
  const c = {
    ...props,
    festiveTypes: TYPES,
    users: USERS,
    form: { date: null, endDate: null, festive_type: null, users_permissions_user: null },
    festiveTypesObj: {},
    hasTypes: false,
    userNameSearch: ''
  }
  for (const [k, fn] of Object.entries(ModalBoxFestive.computed)) {
    if (typeof fn === 'function') Object.defineProperty(c, k, { get: () => fn.call(c) })
  }
  return c
}

describe('Festiu dialog (issues/140)', () => {
  it('offers only personal types to a worker, starting with one of them', () => {
    const c = dialog({ canEditCommon: false, festiveObject: null })
    ModalBoxFestive.methods.show.call(c)
    expect(Object.keys(c.festiveTypesObj).map(Number)).toEqual([3, 4])
    expect(c.form.festive_type).toBe(3)
    expect(c.form.users_permissions_user).toBe(15)
  })

  it('offers the types for everyone to an admin, labelled', () => {
    const c = dialog({ canEditCommon: true, festiveObject: null })
    ModalBoxFestive.methods.show.call(c)
    expect(Object.keys(c.festiveTypesObj).map(Number).sort()).toEqual([1, 2, 3, 4])
    expect(c.form.festive_type).toBe(3)
    expect(c.festiveTypesObj[1]).toBe('Festiu Estatal (totes)')
  })

  it('a holiday for everyone has no person', () => {
    const c = dialog({ canEditCommon: true, festiveObject: null })
    ModalBoxFestive.methods.show.call(c)
    c.form.festive_type = 1
    ModalBoxFestive.watch['form.festive_type'].call(c)
    expect(c.selectedPersonal).toBe(false)
    expect(c.form.users_permissions_user).toBe(null)
    expect(c.readOnlyCommon).toBe(false)
  })

  it('shows a holiday for everyone read-only to a worker', () => {
    const c = dialog({ canEditCommon: false, festiveObject: { id: 9, date: '2026-06-24', festive_type: { id: 2 }, users_permissions_user: null } })
    ModalBoxFestive.methods.show.call(c)
    expect(c.festiveTypesObj[2]).toBe('Festiu Catalunya (totes)')
    expect(c.form.users_permissions_user).toBe(null)
    expect(c.readOnlyCommon).toBe(true)
  })
})

describe('opening a holiday from the hours calendar (issues/140)', () => {
  // The calendar refused to open any holiday for everyone («No es poden editar els
  // festius globals»), so an admin could not change or delete one. It now opens the
  // dialog, which shows it read-only to anyone but an admin.
  const calendar = () => ({ isModalFestiveActive: false, festiveObject: null, $buefy: { snackbar: { open: vi.fn() } } })

  it('opens a holiday for everyone', async () => {
    const { default: DedicationInput } = await import('@/components/DedicationInput.vue')
    const c = calendar()
    const festive = { id: 9, festive_type: { id: 2, personal: false } }
    DedicationInput.methods.showModalFestive.call(c, festive)
    expect(c.isModalFestiveActive).toBe(true)
    expect(c.festiveObject).toBe(festive)
    expect(c.$buefy.snackbar.open).not.toHaveBeenCalled()
  })
})
