// issues/431 (Joel, la Diligència): every new incidence gets a cause from a
// list the admins keep («Categories d'incidència»); the text becomes optional.
// Picked in the incidence modal (from the order page, which the albarà's QR
// opens too). Incidències filters by it and exports it with the replies as
// «Usuària - data - missatge».
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const CATEGORIES = [{ id: 3, name: 'Paquet perdut', order: 2 }, { id: 1, name: 'Causa major', order: 1 }]
let categories = CATEGORIES
const get = vi.fn(async (url) => {
  if (url === 'incidence-categories') return { data: categories }
  if (url.startsWith('orders/')) return { data: { id: 25770, incidences: [{ id: 4, description: 'old', state: 'closed' }] } }
  return { data: [] }
})
const put = vi.fn(async (url, data) => ({ data }))
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))

import ModalBoxIncidence from '@/components/ModalBoxIncidence.vue'
import IncidencesTable from '@/components/IncidencesTable.vue'
import { incidenceFormError, repliesText, categoryName, loadIncidenceCategories } from '@/domain/incidenceCategories'
import { ADMIN_TABLE_GROUPS, OFFICE_TABLES, adminTableGroupsFor } from '@/service/adminTables'
import { entityPath } from '@/router/paths'

beforeEach(() => {
  categories = CATEGORIES
  get.mockClear()
  put.mockClear()
})

async function openModal () {
  const w = mount(ModalBoxIncidence, {
    props: { isActive: false, orderId: 25770 },
    global: { plugins: [createPinia(), Buefy] }
  })
  await w.setProps({ isActive: true })
  await flushPromises()
  const snackbar = vi.spyOn(w.vm.$buefy.snackbar, 'open').mockImplementation(() => {})
  return { w, snackbar }
}

describe('the incidence modal (issues/431)', () => {
  it('asks for the category above the text', async () => {
    const { w } = await openModal()
    expect(get).toHaveBeenCalledWith('incidence-categories', expect.objectContaining({ params: expect.objectContaining({ _sort: 'order:ASC,id:ASC' }) }))
    const html = w.html()
    expect(html).toContain('Categoria *')
    expect(html).toContain('Descripció (opcional)')
    expect(html.indexOf('Categoria *')).toBeLessThan(html.indexOf('Descripció (opcional)'))
    expect(w.vm.categories).toHaveLength(2)
    w.unmount()
  })

  it('refuses an incidence without category, even with text', async () => {
    const { w, snackbar } = await openModal()
    w.vm.description = 'La caixa va arribar oberta'
    await w.vm.confirm()
    expect(snackbar.mock.calls[0][0].message).toBe('Tria la categoria de la incidència')
    expect(put).not.toHaveBeenCalled()
    w.unmount()
  })

  it('saves the category with no text, and leaves the other incidences as they were', async () => {
    const { w } = await openModal()
    w.vm.category = 3
    await w.vm.confirm()
    expect(put).toHaveBeenCalledTimes(1)
    const [url, body] = put.mock.calls[0]
    expect(url).toBe('orders/25770')
    expect(body.incidences[0]).toEqual({ id: 4, description: 'old', state: 'closed' })
    expect(body.incidences[1]).toMatchObject({ description: '', state: 'open', category: 3 })
    w.unmount()
  })

  it('without categories, the text is required as before', async () => {
    categories = []
    const { w, snackbar } = await openModal()
    expect(w.html()).not.toContain('Categoria *')
    await w.vm.confirm()
    expect(snackbar.mock.calls[0][0].message).toBe('Si us plau, descriu la incidència')
    w.vm.description = 'Sense etiqueta'
    await w.vm.confirm()
    expect(put.mock.calls[0][1].incidences[1]).not.toHaveProperty('category')
    w.unmount()
  })
})

describe('incidence category helpers (issues/431)', () => {
  it('what a new incidence lacks', () => {
    expect(incidenceFormError({ categories: CATEGORIES, category: null, description: 'x' })).toMatch(/categoria/)
    expect(incidenceFormError({ categories: CATEGORIES, category: 1, description: '' })).toBeNull()
    expect(incidenceFormError({ categories: [], category: null, description: ' ' })).toMatch(/descriu/)
    expect(incidenceFormError({ categories: [], category: null, description: 'x' })).toBeNull()
  })

  it('the replies, one per line: «Usuària - data - missatge»', () => {
    const users = new Map([[7, { id: 7, fullname: 'Gestió Diligència' }], [9, { id: 9, username: 'formatges' }]])
    const text = repliesText([
      { text: 'Ho mirem', user: 7, response_date: '2026-11-03T10:15:00' },
      { text: "D'acord,\ngràcies", user: { id: 9, username: 'formatges' }, response_date: '2026-11-04T08:00:00' },
      { text: '', user: 7 },
      { text: 'Sense autora', user: 99 }
    ], users)
    expect(text.split('\n')).toEqual([
      'Gestió Diligència - 03/11/2026 10:15 - Ho mirem',
      "formatges - 04/11/2026 08:00 - D'acord, gràcies",
      'Desconegut -  - Sense autora'
    ])
    expect(repliesText(null, users)).toBe('')
  })

  it('the category name, and no list when it can not be read', async () => {
    expect(categoryName({ category: { id: 1, name: 'Falta albarà' } })).toBe('Falta albarà')
    expect(categoryName({ category: null })).toBe('')
    expect(await loadIncidenceCategories(() => ({ get: async () => { throw new Error('403') } }))).toEqual([])
  })
})

describe('Incidències (issues/431)', () => {
  const data = () => IncidencesTable.data.call({})

  it('exports the category and the replies', () => {
    const fields = data().excelFields
    expect(fields.Categoria).toBe('category_name')
    expect(fields.Respostes).toBe('replies')
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(['Comanda', 'Punt', 'Sòcia', 'Descripció', 'Creada', 'Creada per', 'Tancada']))
  })

  it('filters by category', () => {
    const vm = { ...data(), stateFilter: [], isAdmin: true, currentUserId: 1, search: '', categoryFilter: 3 }
    expect(IncidencesTable.methods.filterParams.call(vm)).toMatchObject({ category: 3 })
    vm.categoryFilter = null
    expect(IncidencesTable.methods.filterParams.call(vm)).not.toHaveProperty('category')
  })

  it('corrects the category of an incidence', async () => {
    const toast = vi.fn()
    const vm = {
      $buefy: { toast: { open: toast } },
      loadData: vi.fn(),
      refreshSelected: vi.fn()
    }
    await IncidencesTable.methods.changeCategory.call(vm, { id: 5, category: { id: 1 } }, 3)
    expect(put).toHaveBeenCalledWith('incidences/5', { category: 3 })
    await IncidencesTable.methods.changeCategory.call(vm, { id: 5, category: { id: 3 } }, 3)
    expect(put).toHaveBeenCalledTimes(1)
  })
})

describe('«Categories d\'incidència» in Taules auxiliars (issues/431)', () => {
  it('is a Logística table for admins, not for the office', () => {
    const logistics = ADMIN_TABLE_GROUPS.find(g => g.title === 'Logística')
    expect(logistics.items.map(i => i.entity)).toContain('incidence-category')
    expect(OFFICE_TABLES).not.toContain('incidence-category')
    const office = adminTableGroupsFor(['orders_admin']).flatMap(g => g.items.map(i => i.entity))
    expect(office).not.toContain('incidence-category')
    expect(entityPath('incidence-category')).toContain('categories-incidencia')
  })
})
