// issues/313: the deposit conditions depend on the destination route and the
// origin warehouse («Avisos de dipòsit»); the warehouse's own text was the only
// one, whatever the route.
import { describe, it, expect } from 'vitest'
import { depositNotice } from '@/domain/depositNotice'
import ordersFormSource from '@/components/OrdersForm.vue?raw'

const pickups = [
  { id: 1, name: 'Magatzem BCN', message: 'Text genèric BCN' },
  { id: 2, name: 'Magatzem Vic', message: null }
]
const notices = [
  { id: 10, routes: [{ id: 5 }], pickup: { id: 1 }, message: 'Ruta 5 des de BCN: abans de dimarts 12 h' },
  { id: 11, routes: [{ id: 5 }, { id: 6 }], pickup: null, message: 'Rutes 5 i 6: abans de dilluns' },
  { id: 12, routes: [], pickup: { id: 2 }, message: 'Des de Vic: el dia abans' },
  { id: 13, routes: [{ id: 7 }], pickup: { id: 1 }, message: '   ' }
]
const notice = (route, pickup) => depositNotice({ route, pickup, notices, pickups })

describe('deposit notice per route and warehouse (issues/313)', () => {
  it('takes the notice of the route and the warehouse', () => {
    expect(notice(5, 1)).toBe('Ruta 5 des de BCN: abans de dimarts 12 h')
  })

  it('then the route\'s, for any warehouse', () => {
    expect(notice(6, 1)).toBe('Rutes 5 i 6: abans de dilluns')
    expect(notice(5, 2)).toBe('Rutes 5 i 6: abans de dilluns')
  })

  it('then the warehouse\'s, for any route', () => {
    expect(notice(9, 2)).toBe('Des de Vic: el dia abans')
    expect(notice(null, 2)).toBe('Des de Vic: el dia abans')
  })

  it('falls back to the warehouse\'s own text; an empty notice does not count', () => {
    expect(notice(7, 1)).toBe('Text genèric BCN')
    expect(notice(null, 1)).toBe('Text genèric BCN')
    expect(depositNotice({ route: 9, pickup: 1, notices: [], pickups })).toBe('Text genèric BCN')
  })

  it('shows nothing without a warehouse or any text', () => {
    expect(notice(5, null)).toBe('')
    expect(depositNotice({ route: 9, pickup: 2, notices: [], pickups })).toBe('')
  })

  it('accepts ids as well as populated relations', () => {
    expect(depositNotice({ route: 5, pickup: 1, notices: [{ id: 1, routes: [5], pickup: 1, message: 'x' }], pickups })).toBe('x')
  })

  it('is shown in the order form as a highlighted box, not a grey note', () => {
    expect(ordersFormSource).toContain('depositNotice({')
    expect(ordersFormSource).toMatch(/<div v-if="selectedPickupMessage" class="notification is-warning deposit-notice"/)
    expect(ordersFormSource).toContain('"route-pickup-notices?_limit=-1"')
  })
})
