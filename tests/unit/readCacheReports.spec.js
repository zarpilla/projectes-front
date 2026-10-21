// issues/307: the per-report figures of the read cache in the Memòria cau card,
// to decide with data whether warming the cache is worth it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { readCacheReportRows, duration, OTHERS } from '@/domain/readCacheReports'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, post: vi.fn() }) }))
import ReadCacheCard from '@/components/ReadCacheCard.vue'

const REPORTS = {
  'project.economic-detail': { hits: 40, shared: 2, firstLoads: 1, loadsAgain: 5, loadMsTotal: 40800, loadMsMax: 7100 },
  'treasury.forecast': { hits: 90, shared: 0, firstLoads: 10, loadsAgain: 20, loadMsTotal: 30000, loadMsMax: 4900 },
  'GET /cities': { hits: 12, shared: 0, firstLoads: 1, loadsAgain: 0, loadMsTotal: 30, loadMsMax: 30 },
  'GET /regions': { hits: 5, shared: 0, firstLoads: 1, loadsAgain: 1, loadMsTotal: 40, loadMsMax: 25 },
  'authenticated-user': { hits: 500, shared: 0, firstLoads: 3, loadsAgain: 0, loadMsTotal: 30, loadMsMax: 12 },
  'app-permissions': { hits: 500, shared: 0, firstLoads: 3, loadsAgain: 1, loadMsTotal: 40, loadMsMax: 14 },
  'GET /projects/dedications': { hits: 0, shared: 0, firstLoads: 0, loadsAgain: 0, loadMsTotal: 0, loadMsMax: 0 }
}

describe('read cache figures per report (issues/307)', () => {
  it('names the reports, joins the rest, sorts by the time people waited', () => {
    const rows = readCacheReportRows(REPORTS)
    expect(rows.map(r => r.label)).toEqual([
      'Ingressos/Despeses i Preu hora',
      // loaded in pieces, each one counted
      'Tresoreria (per parts)',
      // the same time waited (70 ms): the one answered more often first
      'Usuari i permisos',
      'Altres (taules auxiliars)'
    ])
    expect(rows[0]).toMatchObject({ hits: 42, loads: 6, firstLoads: 1, loadsAgain: 5, avgMs: 6800, loadMsMax: 7100 })
    expect(rows.find(r => r.label === OTHERS)).toMatchObject({ hits: 17, loads: 3, loadMsTotal: 70, loadMsMax: 30 })
    expect(rows.find(r => r.label === 'Usuari i permisos')).toMatchObject({ hits: 1000, loads: 7 })
    // nothing asked yet: not listed
    expect(rows.some(r => r.label === 'Previsió dedicació')).toBe(false)
    expect(readCacheReportRows(undefined)).toEqual([])
    expect(readCacheReportRows(REPORTS, 2)).toHaveLength(2)
  })

  it('writes durations for people', () => {
    expect(duration(850)).toBe('850 ms')
    expect(duration(6800)).toBe('6,8 s')
    expect(duration(null)).toBe('—')
  })

  beforeEach(() => get.mockReset())

  it('the card lists them', async () => {
    get.mockResolvedValue({
      data: { on: true, entries: 3, bytes: 0, maxBytes: 64 * 1048576, hits: 1, misses: 1, since: '2026-10-21T11:05:00.000Z', reports: REPORTS }
    })
    const w = mount(ReadCacheCard, { global: { plugins: [Buefy] } })
    await flushPromises()
    const text = w.text()
    expect(text).toContain('Per informe, des del 21/10/2026')
    expect(text).toContain('Ingressos/Despeses i Preu hora')
    expect(text).toContain('6 (1 en arrencar)')
    expect(text).toContain('6,8 s')
    expect(text).toContain('7,1 s')
  })

  it('a server without the figures shows no table', async () => {
    get.mockResolvedValue({ data: { on: true, entries: 0, bytes: 0, maxBytes: 1, hits: 0, misses: 0 } })
    const w = mount(ReadCacheCard, { global: { plugins: [Buefy] } })
    await flushPromises()
    expect(w.text()).not.toContain('Per informe')
  })
})
