// issues/159: the tables that needed the Strapi admin are in Taules auxiliars.
// The generic screens now name the enumeration values in Catalan (a document
// type is «Ingrés» / «Despesa», not income / expense), pick a pickup point's
// town and users and an activity type's project from their APIs, and say why a
// delete was refused (a town in use).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const get = vi.fn()
const del = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: del }) }))
import AdminEntityForm from '@/components/AdminEntityForm.vue'
import AdminEntityList from '@/components/AdminEntityList.vue'
import AdminFormSubmissions from '@/views/AdminFormSubmissions.vue'
import { normalizeEntity } from '@/service/adminMetadata'

const pickup = normalizeEntity({
  name: 'pickup',
  apiPath: 'pickups',
  attributes: {
    name: { type: 'string', label: 'Nom' },
    city: { type: 'relation', relation: 'oneToOne', target: 'api::city.city', label: 'Població' },
    allowed_users: { type: 'relation', relation: 'oneToMany', target: 'plugin::users-permissions.user', label: 'Usuàries', editable: true }
  }
})

const ENTITY_TO_API_PATH = { city: 'cities', user: 'users', project: 'projects/basic' }

describe('Taules auxiliars: the tables that needed the Strapi admin (issues/159)', () => {
  it('loads the town and the users of a pickup point from their APIs', async () => {
    get.mockReset()
    get.mockResolvedValue({ data: [] })
    const c = { metadata: pickup, entityToApiPath: ENTITY_TO_API_PATH, relationOptions: {}, loadingRelations: {}, $buefy: { toast: { open: vi.fn() } } }
    await AdminEntityForm.methods.loadRelationOptions.call(c)
    const urls = get.mock.calls.map(call => call[0])
    expect(urls).toContain('/cities?_limit=-1&_sort=name:ASC')
    expect(urls).toContain('/users?_limit=-1&_sort=username:ASC')
    expect(Object.keys(AdminEntityForm.computed.formAttributes.call({ metadata: pickup }))).toEqual(['name', 'city', 'allowed_users'])
  })

  it('picks the project of an activity type from the slim list', async () => {
    get.mockReset()
    get.mockResolvedValue({ data: [] })
    const metadata = normalizeEntity({
      name: 'activity-type',
      attributes: { project: { type: 'relation', relation: 'manyToOne', target: 'api::project.project' } }
    })
    const c = { metadata, entityToApiPath: ENTITY_TO_API_PATH, relationOptions: {}, loadingRelations: {}, $buefy: { toast: { open: vi.fn() } } }
    await AdminEntityForm.methods.loadRelationOptions.call(c)
    expect(get.mock.calls[0][0]).toBe('/projects/basic?_limit=-1&_sort=name:ASC')
  })

  it('shows an enumeration value by its Catalan name', () => {
    const config = { type: 'enumeration', enum: ['income', 'expense'], enumLabels: { income: 'Ingrés', expense: 'Despesa' } }
    const cellText = AdminEntityList.methods.cellText.bind({ formatNumber: v => v, formatDate: v => v })
    expect(cellText({ type: 'expense' }, 'type', config)).toBe('Despesa')
    expect(cellText({ type: 'other' }, 'type', config)).toBe('other')
  })

  it('says why a delete was refused', async () => {
    del.mockRejectedValueOnce({
      message: 'Request failed with status code 400',
      response: { data: { message: 'No es pot esborrar la població «Vic»: la fan servir 2 rutes.' } }
    })
    const open = vi.fn()
    const c = {
      metadata: { apiPath: 'cities' },
      entityName: 'city',
      trashObject: { id: 7 },
      loadData: vi.fn(),
      $buefy: { toast: { open }, snackbar: { open: vi.fn() } }
    }
    await AdminEntityList.methods.trashConfirm.call(c)
    expect(del).toHaveBeenCalledWith('/cities/7')
    expect(open.mock.calls[0][0].message).toBe('Error eliminant: No es pot esborrar la població «Vic»: la fan servir 2 rutes.')
  })

  it('lists the «Contacta» messages for admins, read only', async () => {
    get.mockReset()
    get.mockResolvedValue({ data: [
      { id: 2, name: 'Anna', email: 'anna@example.org', message: 'Hola', createdAt: '2026-10-01T10:00:00Z', user: { username: 'anna' } },
      { id: 1, name: 'Pere', email: null, message: 'Bon dia', createdAt: '2026-09-01T10:00:00Z' }
    ] })
    const w = mount(AdminFormSubmissions, { global: { plugins: [Buefy], stubs: { 'title-bar': true } } })
    await flushPromises()
    expect(get).toHaveBeenCalledWith('form-submissions?_limit=-1&_sort=id:DESC')
    expect(w.text()).toContain('anna@example.org')
    expect(w.text()).toContain('Bon dia')
    expect(w.find('button.is-danger').exists()).toBe(false)
  })
})
