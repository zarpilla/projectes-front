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
// these tests draw given data: the page's own first load (asked at mount since
// issues/307, tresoreriaInitialLoad309.spec.js) stays out of them
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const movement = (id, project, datef = '20260305') => ({
  id,
  datef,
  datex: `${datef.slice(6, 8)}-${datef.slice(4, 6)}-${datef.slice(0, 4)}`,
  type: 'Factura',
  concept: `Moviment ${id}`,
  total_amount: 100,
  subtotal: 100,
  ...(project ? { project_id: project.id, project_name: project.name } : {})
})

async function mountTable (rows) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }
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
    treasuryData: rows || [movement(1, { id: 7, name: 'Projecte amb enllaç' }), movement(2, null)]
  })
  await flushPromises()
  return { w, errors }
}

describe('TresoreriaTable bank movements', () => {
  it('links a movement to its project', async () => {
    const { w, errors } = await mountTable()
    expect(errors).toEqual([])
    const link = w.findAll('a').find(a => a.text() === 'Projecte amb enllaç')
    expect(link && link.attributes('href')).toBe('/projecte/7')
  })

  it('renders a movement without a project without a link or a render error', async () => {
    const { w, errors } = await mountTable()
    expect(errors).toEqual([])
    const row = w.findAll('tbody tr').find(tr => tr.text().includes('Moviment 2'))
    expect(row).toBeTruthy()
    expect(row.findAll('a[href^="/projecte"]')).toHaveLength(0)
  })
})

// issues/136: the Data column showed «05-03-2026» (dashes, as the API sends `datex`)
// while the rest of the app uses dd/mm/aaaa; the year and date filters parsed the
// display string back.
describe('TresoreriaTable movement dates (issues/136)', () => {
  const rows = () => [
    movement(1, null, '20260305'),
    movement(2, null, '20261020'),
    movement(3, null, '20251231')
  ]
  const dateCells = w => w.findAll('tbody tr').map(tr => tr.find('td').text())

  it('shows the dates as dd/mm/aaaa', async () => {
    const { w } = await mountTable(rows())
    const cells = dateCells(w)
    expect(cells.some(t => t.includes('20/10/2026'))).toBe(true)
    expect(cells.some(t => t.includes('05/03/2026'))).toBe(true)
    expect(cells.some(t => t.includes('-2026'))).toBe(false)
  })

  it('keeps the year and date filters working', async () => {
    const { w } = await mountTable(rows())
    expect(w.vm.treasuryDataDesc.map(r => r.id)).toEqual([2, 1])
    await w.setData({ filterDateStart: new Date(2026, 5, 1) })
    expect(w.vm.treasuryDataDesc.map(r => r.id)).toEqual([2])
    await w.setData({ filterDateStart: null, filterDateEnd: new Date(2026, 5, 1) })
    expect(w.vm.treasuryDataDesc.map(r => r.id)).toEqual([1])
  })
})

// issues/366: with the per-column filters the list stayed on the page it was on
// (6 of 6), so the matches on other pages looked filtered out; and there was no
// way to see every movement of the year at once.
describe('TresoreriaTable movement pages (issues/366)', () => {
  const many = () => Array.from({ length: 120 }, (_, i) => movement(i + 1, null, '20260305'))
  const shownRows = w => w.findAll('tbody tr').filter(tr => tr.text().includes('Moviment'))

  it('goes back to the first page when a column filter changes', async () => {
    localStorage.removeItem('TresoreriaTable.movementsAll')
    const rows = Array.from({ length: 200 }, (_, i) => movement(i + 1, null, '20260305'))
    const { w } = await mountTable(rows)
    await w.setData({ movementsPage: 3 })
    await flushPromises()
    w.vm.$refs.movementsTable.filters.concept = 'Moviment 1'
    await flushPromises()
    expect(w.vm.movementsPage).toBe(1)
    // Moviment 1, 10–19, 100–199: 111 matches; the first page shows 50 of
    // them (page 3 showed only the last 11)
    expect(shownRows(w)).toHaveLength(50)
    expect(shownRows(w)[0].text()).toContain('Moviment 1')
  })

  it('«Mostra-ho tot» lists every movement without pages, and is remembered', async () => {
    localStorage.removeItem('TresoreriaTable.movementsAll')
    const { w } = await mountTable(many())
    expect(shownRows(w)).toHaveLength(50)
    const button = w.findAll('button').find(b => b.text() === 'Mostra-ho tot')
    await button.trigger('click')
    await flushPromises()
    expect(shownRows(w)).toHaveLength(120)
    expect(localStorage.getItem('TresoreriaTable.movementsAll')).toBe('1')
    const again = await mountTable(many())
    expect(shownRows(again.w)).toHaveLength(120)
    localStorage.removeItem('TresoreriaTable.movementsAll')
  })
})
