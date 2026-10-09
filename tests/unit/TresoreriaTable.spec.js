// issues/014: the "MOVIMENTS BANCARIS" table linked every movement to its project.
// A movement without a project built { name: 'project.edit', params: { id: undefined } };
// Vue Router 4 throws "Missing required param "id"" while rendering it (Vue Router 3
// didn't), which broke the component tree: the next menu click changed the URL but
// the new page never rendered.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'

const movement = (id, project) => ({
  id,
  datex: '05-03-2026',
  type: 'Factura',
  concept: `Moviment ${id}`,
  total_amount: 100,
  subtotal: 100,
  ...(project ? { project_id: project.id, project_name: project.name } : {})
})

async function mountTable () {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/project/:id', name: 'project.edit', component: { template: '<div/>' } }
    ]
  })
  await router.push('/')
  const errors = []
  const w = mount(TresoreriaTable, {
    global: {
      plugins: [createPinia(), Buefy, router],
      stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
      config: { errorHandler: err => errors.push(err), warnHandler: () => {} }
    }
  })
  await w.setData({
    selectedYear: 2026,
    treasuryData: [movement(1, { id: 7, name: 'Projecte amb enllaç' }), movement(2, null)]
  })
  await flushPromises()
  return { w, errors }
}

describe('TresoreriaTable bank movements', () => {
  it('links a movement to its project', async () => {
    const { w, errors } = await mountTable()
    expect(errors).toEqual([])
    const link = w.findAll('a').find(a => a.text() === 'Projecte amb enllaç')
    expect(link && link.attributes('href')).toBe('/project/7')
  })

  it('renders a movement without a project without a link or a render error', async () => {
    const { w, errors } = await mountTable()
    expect(errors).toEqual([])
    const row = w.findAll('tbody tr').find(tr => tr.text().includes('Moviment 2'))
    expect(row).toBeTruthy()
    expect(row.findAll('a[href^="/project"]')).toHaveLength(0)
  })
})
