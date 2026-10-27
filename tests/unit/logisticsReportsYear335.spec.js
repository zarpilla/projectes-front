// issues/335: «Informe d'incidències» and «Informe de comandes» opened on the
// newest year of the list (2027, created by addOfficialFestives2027) instead
// of this one, so in October 2026 they showed «2027 · Octubre» and 0.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const responses = {
  'years?_sort=year:DESC': [{ id: 3, year: 2027 }, { id: 2, year: 2026 }, { id: 1, year: 2025 }],
  months: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, month: i + 1 }))
}
vi.mock('@/service/index', () => ({
  default: () => ({ get: url => Promise.resolve({ data: JSON.parse(JSON.stringify(responses[url.split('&')[0]] || [])) }) })
}))
vi.mock('@/helpers/addScript', () => ({ loadKendo: vi.fn(), waitForJQuery: vi.fn() }))

import StatsIncidences from '@/views/StatsIncidences.vue'
import StatsOrders from '@/views/StatsOrders.vue'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe.each([
  ['StatsIncidences', StatsIncidences],
  ['StatsOrders', StatsOrders]
])('%s opens on this year (issues/335)', (_, view) => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-24T10:00:00')) })
  afterEach(() => vi.useRealTimers())

  it('picks 2026 · Octubre, not 2027', async () => {
    const ctx = { ...view.data(), filters: { ...view.data().filters } }
    await view.methods.getData.call(ctx)
    for (let i = 0; i < 5; i++) await flush()
    expect(ctx.filters.year).toEqual({ id: 2, year: 2026 })
    expect(ctx.years).toContain(ctx.filters.year)
    expect(ctx.filters.month.month).toBe(10)
  })
})
