// issues/416 (Miceli): Tresoreria filtered by one project only. Now it filters
// by several projects, project types or scopes (one kind at a time), in the
// browser, over the treasury already loaded; the view is the one of a chosen
// project (issues/284): the picked projects' movements, saldo from 0.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import { projectTreasuryRows, projectFilterOptions, projectIdsOfFilter, NONE_OPTION_ID } from '@/domain/projectTreasury'

const api = { get: vi.fn(async () => ({ data: [] })), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
vi.mock('@/service/treasury', () => ({ default: vi.fn(async () => []) }))
import TresoreriaTable from '@/components/TresoreriaTable.vue'
vi.spyOn(TresoreriaTable.methods, 'getInitialData').mockResolvedValue(undefined)

const FORMACIO = { id: 3, name: 'Formació' }
const SERVEIS = { id: 4, name: 'Serveis' }
const AGRO = { id: 5, name: 'Agroecologia' }
const projects = [
  { id: 7, name: 'Projecte', project_type: FORMACIO, project_scope: AGRO },
  { id: 8, name: 'Altre', project_type: SERVEIS, project_scope: null },
  { id: 9, name: 'Tercer', project_type: null, project_scope: AGRO }
]
const rows = () => [
  { type: 'Inici Any', datef: '20260101', total_amount: 0, subtotal: 50000, account_subtotal: 50000, bank_account: 'A' },
  { type: 'Saldo bancari', datef: '20260115', is_balance_annotation: true, account_balance: 60000, total_amount: 0, subtotal: 60000, bank_account: 'A' },
  { type: 'Factura', concept: 'p7', datef: '20260201', total_amount: 1000, project_id: 7, project_name: 'Projecte', bank_account: 'A' },
  { type: 'Factura', concept: 'p8', datef: '20260210', total_amount: 5000, project_id: 8, project_name: 'Altre', bank_account: 'A' },
  { type: 'Avui', datef: '20260301', total_amount: 0, subtotal: 66000, account_subtotal: 66000, bank_account: 'A' },
  { type: 'Despesa esperada', concept: 'p9', datef: '20260601', total_amount: -300, project_id: 9, project_name: 'Tercer', bank_account: 'A' },
  { type: 'Nòmina', concept: 'sense projecte', datef: '20260630', total_amount: -2000, project_id: null, project_name: '-', bank_account: 'A' }
]

describe('multi filter helpers (issues/416)', () => {
  it('keeps the rows of several projects', () => {
    expect(projectTreasuryRows(rows(), new Set([7, 9])).map(r => r.concept || r.type)).toEqual(['Inici Any', 'p7', 'Avui', 'p9'])
    expect(projectTreasuryRows(rows(), [8]).map(r => r.concept || r.type)).toEqual(['Inici Any', 'p8', 'Avui'])
    // one id, as before
    expect(projectTreasuryRows(rows(), 7).map(r => r.concept || r.type)).toEqual(['Inici Any', 'p7', 'Avui'])
  })

  it('lists the options of each kind, «Sense …» last', () => {
    expect(projectFilterOptions(projects, 'project').map(o => o.name)).toEqual(['Altre', 'Projecte', 'Tercer'])
    expect(projectFilterOptions(projects, 'type')).toEqual([FORMACIO, SERVEIS, { id: NONE_OPTION_ID, name: 'Sense tipus' }])
    expect(projectFilterOptions(projects, 'scope')).toEqual([AGRO, { id: NONE_OPTION_ID, name: 'Sense àmbit' }])
  })

  it('turns the picked options into project ids', () => {
    expect(projectIdsOfFilter(projects, 'type', [])).toBeNull()
    expect([...projectIdsOfFilter(projects, 'project', [7, 8])]).toEqual([7, 8])
    expect([...projectIdsOfFilter(projects, 'type', [FORMACIO.id, SERVEIS.id])]).toEqual([7, 8])
    expect([...projectIdsOfFilter(projects, 'type', [NONE_OPTION_ID])]).toEqual([9])
    expect([...projectIdsOfFilter(projects, 'scope', [AGRO.id])]).toEqual([7, 9])
    expect([...projectIdsOfFilter(projects, 'scope', [NONE_OPTION_ID])]).toEqual([8])
  })
})

describe('Tresoreria filtered by several projects, types or scopes (issues/416)', () => {
  async function mountTreasury () {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }, { path: '/projecte/:id', name: 'project.edit', component: { template: '<div/>' } }] })
    await router.push('/')
    const w = mount(TresoreriaTable, {
      global: {
        plugins: [createPinia(), Buefy, router],
        stubs: { TreasuryAnnotationInput: true, PivotViews: true, ModalBoxInvoicing: true },
        config: { warnHandler: () => {} }
      }
    })
    await w.setData({ selectedYear: 2026, treasuryData: rows(), projects })
    await flushPromises()
    return w
  }

  it('nothing is filtered when the page opens', async () => {
    const w = await mountTreasury()
    expect(w.vm.filterProjectIds).toBeNull()
    expect(w.vm.todaySubTotal).toBe(50000)
    expect(w.vm.movementsShown.filter(r => w.vm.isMovement(r)).map(r => r.concept)).toEqual(['sense projecte', 'p9', 'p8', 'p7'])
  })

  it('two projects: their movements, saldo from 0', async () => {
    const w = await mountTreasury()
    w.vm.setProjectFilter('project', [7, 8])
    await flushPromises()
    expect(w.vm.todaySubTotal).toBe(0)
    expect(w.vm.yearEnd.subtotal).toBeCloseTo(6000)
    expect(w.vm.accountRows).toEqual([])
    expect(w.vm.todayBalanceScope).toBe("només els projectes triats, des de 0 a l'1 de gener")
    expect(w.vm.movementsShown.map(r => [r.concept || r.type, r.subtotal])).toEqual([['Avui', 6000], ['p8', 6000], ['p7', 1000], ['Inici Any', 0]])
  })

  it('by project type, «Sense tipus» included', async () => {
    const w = await mountTreasury()
    w.vm.setProjectFilter('type', [SERVEIS.id, NONE_OPTION_ID])
    await flushPromises()
    expect(w.vm.yearEnd.subtotal).toBeCloseTo(4700)
    expect(w.vm.movementsShown.filter(r => r.project_id).map(r => r.concept)).toEqual(['p9', 'p8'])
  })

  it('by scope; another kind starts empty; «Netejar filtres» shows everything', async () => {
    const w = await mountTreasury()
    w.vm.setProjectFilter('scope', [AGRO.id])
    await flushPromises()
    expect(w.vm.yearEnd.subtotal).toBeCloseTo(700)
    expect(w.vm.todayBalanceScope).toBe("només els projectes triats, des de 0 a l'1 de gener")
    w.vm.setProjectFilterMode('type')
    await flushPromises()
    expect(w.vm.projectFilterValues).toEqual([])
    expect(w.vm.filterProjectIds).toBeNull()
    w.vm.setProjectFilter('project', [7])
    await flushPromises()
    expect(w.vm.todayBalanceScope).toBe("només el projecte, des de 0 a l'1 de gener")
    w.vm.clearFilters()
    await flushPromises()
    expect(w.vm.filterProjectIds).toBeNull()
    expect(w.vm.todaySubTotal).toBe(50000)
    expect(w.vm.movementsShown.filter(r => w.vm.isMovement(r))).toHaveLength(4)
  })

  it('the options offered leave out the picked ones and follow the typing', async () => {
    const w = await mountTreasury()
    w.vm.setProjectFilter('project', [7])
    await w.setData({ projectSearch: 'ter' })
    expect(w.vm.filteredProjectOptions.map(o => o.name)).toEqual(['Tercer'])
    await w.setData({ projectSearch: '' })
    expect(w.vm.filteredProjectOptions.map(o => o.name)).toEqual(['Altre', 'Tercer'])
  })

  it('shows the kind switch and the multi-select', async () => {
    const w = await mountTreasury()
    const labels = w.findAll('.treasury-row .segmented button').map(b => b.text())
    expect(labels).toEqual(expect.arrayContaining(['Projectes', 'Tipus', 'Àmbits']))
    expect(w.find('.treasury-project.taginput').exists()).toBe(true)
  })
})
