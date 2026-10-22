// issues/320 (2026-10-22): «Poblacions i rutes» exports the route and town
// time slots as an .ods and imports it back: a summary first, then only the
// changed slots are saved. Only the office (orders_admin) has the buttons.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { buildOds, readOds } from '@/service/ods'

const get = vi.fn()
const put = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put, post: vi.fn(), delete: vi.fn() }) }))
const download = vi.fn()
vi.mock('downloadjs', () => ({ default: (...args) => download(...args) }))
import CityRoute from '@/views/CityRoute.vue'

const ROUTES = [
  { id: 16, name: 'DT - BCN CIUTAT', tuesday: true, active: true, order: 1, time_from: '09:00:00.000', time_to: '14:00:00.000' },
  { id: 11, name: 'DT - BAIX MONTSENY', tuesday: true, active: true, order: 2, time_from: null, time_to: null }
]
const CITIES = [{ id: 1, name: 'Badalona' }, { id: 2, name: 'Alella' }, { id: 3, name: 'Breda' }]
const LINKS = () => [
  { id: 159, city: { id: 1 }, route: ROUTES[0], time_from: '07:00:00.000', time_to: null },
  { id: 160, city: { id: 2 }, route: ROUTES[0], time_from: null, time_to: null },
  { id: 161, city: { id: 3 }, route: ROUTES[1], time_from: null, time_to: null }
]

const mountAs = async permissions => {
  get.mockImplementation(async url => {
    if (url === 'users/me') return { data: { permissions: permissions.map(permission => ({ permission })) } }
    if (url.startsWith('cities')) return { data: CITIES }
    if (url.startsWith('routes')) return { data: ROUTES.map(r => ({ ...r })) }
    if (url === 'city-routes/basic') return { data: LINKS() }
    return { data: [] }
  })
  const snackbar = { open: vi.fn() }
  const w = mount(CityRoute, {
    global: {
      plugins: [Buefy],
      mocks: { $buefy: { snackbar, dialog: { confirm: vi.fn() } } },
      stubs: { 'title-bar': true, 'routes-tabs': true, 'router-link': true, 'b-modal': { template: '<div><slot /></div>' } }
    }
  })
  await flushPromises()
  return { w, snackbar }
}

const button = (w, text) => w.findAll('button').find(b => b.text() === text)

// what the user picks in the file dialog
const pick = async (w, bytes) => {
  const file = new File([bytes], 'franges.ods')
  if (!file.arrayBuffer) file.arrayBuffer = async () => bytes.buffer
  await w.vm.onSlotsFile({ target: { files: [file], value: 'x' } })
  await flushPromises()
}

beforeEach(() => {
  get.mockReset()
  put.mockReset()
  download.mockReset()
  put.mockResolvedValue({ data: {} })
})

describe('«Poblacions i rutes» slots as .ods (issues/320)', () => {
  it('only the office has the export and import buttons', async () => {
    expect(button((await mountAs(['orders'])).w, 'Exporta franges (.ods)')).toBeUndefined()
    expect(button((await mountAs(['orders_delivery'])).w, 'Importa franges')).toBeUndefined()
    const { w } = await mountAs(['orders_admin'])
    expect(button(w, 'Exporta franges (.ods)')).toBeTruthy()
    expect(button(w, 'Importa franges')).toBeTruthy()
  })

  it('exports the routes and their towns as an .ods', async () => {
    const { w } = await mountAs(['orders_admin'])
    await button(w, 'Exporta franges (.ods)').trigger('click')
    expect(download).toHaveBeenCalledTimes(1)
    const [blob, name] = download.mock.calls[0]
    expect(name).toBe('franges-poblacions-rutes.ods')
    const rows = readOds(new Uint8Array(await blob.arrayBuffer()))
    expect(rows.map(r => [r[1], r[2] || '', r[3] || '', r[6]])).toEqual([
      ['Ruta', 'Població', 'Inici', 'ID'],
      ['DT - BCN CIUTAT', '', '09:00', 'r16'],
      ['DT - BCN CIUTAT', 'Alella', '', 'l160'],
      ['DT - BCN CIUTAT', 'Badalona', '07:00', 'l159'],
      ['DT - BAIX MONTSENY', '', '', 'r11'],
      ['DT - BAIX MONTSENY', 'Breda', '', 'l161']
    ])
  })

  it('imports: shows the changes and the errors, then saves only the changes', async () => {
    const { w, snackbar } = await mountAs(['orders_admin'])
    const rows = [
      ['Dia', 'Ruta', 'Població', 'Inici', 'Fi', "Franja que s'aplica", 'ID'],
      ['dimarts', 'DT - BCN CIUTAT', '', '09:00', '14:00', '', 'r16'],
      ['dimarts', 'DT - BAIX MONTSENY', '', '8', '12', '', 'r11'],
      ['dimarts', 'DT - BAIX MONTSENY', 'Breda', '7:30', '', '', 'l161'],
      ['dimarts', 'DT - BCN CIUTAT', 'Girona', '9', '', '', '']
    ]
    await pick(w, buildOds(rows))
    expect(w.vm.importOpen).toBe(true)
    const text = w.text()
    expect(text).toContain('2 franges canvien')
    expect(text).toContain('Fila 5: «Girona» no és a la ruta DT - BCN CIUTAT')
    expect(text).toContain('de 8 a 12 h')
    expect(put).not.toHaveBeenCalled()

    await button(w, 'Desa 2 canvis').trigger('click')
    await flushPromises()
    expect(put.mock.calls).toEqual([
      ['routes/11', { time_from: '08:00:00.000', time_to: '12:00:00.000' }],
      ['city-routes/161', { time_from: '07:30:00.000', time_to: null }]
    ])
    expect(snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ message: '2 franges desades' }))
    expect(w.vm.importOpen).toBe(false)
  })

  it('names the rows it could not save', async () => {
    const { w, snackbar } = await mountAs(['orders_admin'])
    put.mockImplementation(async url => { if (url === 'routes/11') throw new Error('403') })
    await pick(w, buildOds([['Ruta', 'Població', 'Inici', 'Fi'], ['DT - BAIX MONTSENY', '', '8', ''], ['DT - BAIX MONTSENY', 'Breda', '9', '']]))
    await w.vm.applySlots()
    expect(snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger', message: "1 desades. No s'han pogut desar: fila 2" }))
  })

  it('tells a file that is not an .ods', async () => {
    const { w, snackbar } = await mountAs(['orders_admin'])
    await pick(w, new TextEncoder().encode('Ruta;Inici'))
    expect(w.vm.importOpen).toBe(false)
    expect(snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger', message: 'El fitxer no és un full de càlcul .ods' }))
  })
})
