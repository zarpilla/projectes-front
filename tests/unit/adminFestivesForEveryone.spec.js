// issues/310: the holidays for everyone (Festiu Estatal, Festiu Catalunya…)
// could only be changed from the Hores dedicades calendar, one day at a time.
// They are now a table in Taules auxiliars › Calendari, «Festius de totes»:
// it lists the holidays with no person, newest first; its form offers only the
// types for everyone and saves the date picked, not the day before.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const post = vi.fn()
const put = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post, put, delete: vi.fn() }) }))
import AdminEntityList from '@/components/AdminEntityList.vue'
import AdminEntityForm from '@/components/AdminEntityForm.vue'
import { normalizeEntity, listQueryOf, optionsMatching, dateFromApi, dateToApi } from '@/service/adminMetadata'
import { ADMIN_TABLE_GROUPS, adminTableGroupsFor, isAdminTablePath } from '@/service/adminTables'

// what the backend's entity-metadata says (projectes-v5 issues/310)
const metadata = normalizeEntity({
  name: 'festive',
  apiPath: 'festives',
  displayName: 'Festius de totes',
  displayNameSingular: 'Festiu de totes',
  listQuery: '_where[users_permissions_user_null]=true',
  listSort: ['date', 'desc'],
  attributes: {
    date: { type: 'date', required: true, label: 'Data' },
    festive_type: {
      type: 'relation', relation: 'oneToOne', target: 'api::festive-type.festive-type',
      required: true, label: 'Tipus de festiu', optionsWhere: { personal: false }
    }
  }
})

const TYPES = [
  { id: 1, name: 'Festiu Estatal', personal: false },
  { id: 2, name: 'Festiu Catalunya', personal: false },
  { id: 4, name: 'Vacances', personal: true },
  { id: 5, name: 'Lliure Elecció', personal: null }
]

const buefy = () => ({ toast: { open: vi.fn() }, snackbar: { open: vi.fn() } })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockReset()
})

describe('«Festius de totes» in Taules auxiliars (issues/310)', () => {
  it('is in the Calendari group, for admins only', () => {
    const calendari = ADMIN_TABLE_GROUPS.find(g => g.title === 'Calendari')
    expect(calendari.items).toContainEqual({ entity: 'festive', label: 'Festius de totes' })
    expect(isAdminTablePath('/admin/festive')).toBe(true)
    expect(isAdminTablePath('/admin/festive/12')).toBe(true)
    const office = adminTableGroupsFor(['orders_admin']).flatMap(g => g.items)
    expect(office.map(t => t.entity)).not.toContain('festive')
  })

  it('lists only the holidays with no person', async () => {
    get.mockResolvedValue({ data: [{ id: 1, date: '2027-01-01', festive_type: { id: 1, name: 'Festiu Estatal' } }] })
    const c = { metadata, entityName: 'festive', $buefy: buefy() }
    await AdminEntityList.methods.loadData.call(c)
    expect(get.mock.calls[0][0]).toBe('/festives?_limit=-1&_sort=id&_where[users_permissions_user_null]=true')
    expect(c.items).toHaveLength(1)
  })

  it('lists the other tables as before', () => {
    expect(listQueryOf({ name: 'year', attributes: {} })).toBe('')
    expect(listQueryOf(null)).toBe('')
  })

  it('shows the newest first', () => {
    const sort = AdminEntityList.computed.defaultSort.call({ metadata, firstAttr: 'date' })
    expect(sort).toEqual(['date', 'desc'])
    expect(AdminEntityList.computed.defaultSort.call({ metadata: { attributes: {} }, firstAttr: 'name' })).toBe('name')
  })

  it('names a holiday by its date when deleting it', () => {
    const c = { trashObject: { id: 9, date: '2027-03-29' }, formatDate: AdminEntityList.methods.formatDate }
    expect(AdminEntityList.computed.trashObjectName.call(c)).toBe('29/03/2027')
  })

  it('offers only the types for everyone', async () => {
    get.mockResolvedValue({ data: TYPES })
    const c = { metadata, entityToApiPath: { 'festive-type': 'festive-types' }, relationOptions: {}, loadingRelations: {}, $buefy: buefy() }
    await AdminEntityForm.methods.loadRelationOptions.call(c)
    expect(get.mock.calls[0][0]).toMatch(/^\/festive-types\?/)
    expect(c.relationOptions.festive_type.map(t => t.name)).toEqual(['Festiu Estatal', 'Festiu Catalunya'])
    // no filter: every option
    expect(optionsMatching(TYPES, undefined)).toBe(TYPES)
  })

  it('opens a holiday with its date in the datepicker and its type', async () => {
    get.mockResolvedValue({ data: { id: 9, date: '2027-03-29', festive_type: { id: 2, name: 'Festiu Catalunya' } } })
    const c = { metadata, entityName: 'festive', id: 9, form: {}, $buefy: buefy() }
    await AdminEntityForm.methods.loadData.call(c)
    expect(c.form.date).toBeInstanceOf(Date)
    expect([c.form.date.getFullYear(), c.form.date.getMonth(), c.form.date.getDate()]).toEqual([2027, 2, 29])
    expect(c.form.festive_type).toBe(2)
  })

  it('saves a new holiday with the day picked and no person', async () => {
    post.mockResolvedValue({ data: { id: 10 } })
    const c = {
      metadata,
      entityName: 'festive',
      id: null,
      isEdit: false,
      form: { date: new Date(2027, 0, 6), festive_type: 1 },
      errors: {},
      $buefy: buefy(),
      $router: { push: vi.fn() }
    }
    await AdminEntityForm.methods.submit.call(c)
    expect(post).toHaveBeenCalledWith('/festives', { date: '2027-01-06', festive_type: 1 })
  })

  it('reads and writes dates as the same calendar day', () => {
    expect(dateToApi(dateFromApi('2027-12-25'))).toBe('2027-12-25')
    expect(dateFromApi(null)).toBe(null)
    expect(dateToApi('2027-12-25')).toBe('2027-12-25')
    expect(dateToApi(null)).toBe(null)
  })
})
