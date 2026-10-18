// issues/139: «Tarifes de ruta» in Taules auxiliars. The generic admin form left
// every to-many relation out, so a rate's routes (which decide where it applies)
// could not be set; the backend now marks them editable and the form shows them
// as checkboxes, loads them as ids and starts a new rate with none.
import { describe, it, expect, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn() }) }))
import AdminEntityForm from '@/components/AdminEntityForm.vue'
import { normalizeEntity } from '@/service/adminMetadata'

const metadata = normalizeEntity({
  name: 'route-rate',
  apiPath: 'route-rates',
  attributes: {
    name: { type: 'string', label: 'Nom' },
    routes: { type: 'relation', relation: 'manyToMany', target: 'api::route.route', label: 'Rutes', editable: true, help: 'Sense cap ruta, s\'aplica a totes.' },
    orders: { type: 'relation', relation: 'oneToMany', target: 'api::order.order' },
    less10: { type: 'decimal', label: 'Menys de 10 kg' }
  }
})

describe('route rate form (issues/139)', () => {
  it('edits the routes, not the other to-many relations', () => {
    const attrs = AdminEntityForm.computed.formAttributes.call({ metadata })
    expect(Object.keys(attrs)).toEqual(['name', 'routes', 'less10'])
  })

  it('loads the routes as ids', async () => {
    get.mockResolvedValueOnce({ data: { id: 37, name: 'Girona', routes: [{ id: 3, name: 'R3' }, { id: 5, name: 'R5' }], less10: 8 } })
    const c = { metadata, entityName: 'route-rate', id: 37, form: {}, $buefy: { toast: { open: vi.fn() } } }
    await AdminEntityForm.methods.loadData.call(c)
    expect(c.form.routes).toEqual([3, 5])
  })

  it('starts a new rate with no routes', () => {
    const c = { metadata, form: {} }
    AdminEntityForm.methods.initializeForm.call(c)
    expect(c.form.routes).toEqual([])
  })

  it('loads the route options from the routes API', async () => {
    get.mockResolvedValue({ data: [{ id: 3, name: 'R3' }] })
    const c = { metadata, entityToApiPath: { route: 'routes' }, relationOptions: {}, loadingRelations: {}, $buefy: { toast: { open: vi.fn() } } }
    await AdminEntityForm.methods.loadRelationOptions.call(c)
    expect(get.mock.calls.at(-1)[0]).toMatch(/^\/routes\?/)
    expect(c.relationOptions.routes).toEqual([{ id: 3, name: 'R3' }])
    expect(c.relationOptions.orders).toBeUndefined()
  })
})
