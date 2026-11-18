// issues/440 (Núria Social Coop): Configuració had «% IVA deduïble» 67 %, but
// every year in Taules auxiliars › Anys had its own 100 % (filled by
// issues/338), which rules: projects and reports added no non-deductible VAT.
// Configuració now names the current and later years that override it and
// puts its % into them on request.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { yearsOverridingConfig, overridingYearsText } from '@/domain/deductibleVatYears'

const years = [
  { id: 1, year: 2025, deductible_vat_pct: 100 },
  { id: 2, year: 2026, deductible_vat_pct: '100.00' },
  { id: 3, year: 2027, deductible_vat_pct: 100 },
  { id: 4, year: 2028, deductible_vat_pct: 67 },
  { id: 5, year: 2029, deductible_vat_pct: null }
]

describe('years overriding Configuració (issues/440)', () => {
  it('lists the current and later years with another %', () => {
    const list = yearsOverridingConfig(years, 67, 2026)
    expect(list.map(y => y.year)).toEqual([2026, 2027])
    expect(overridingYearsText(list)).toBe('2026 (100 %) i 2027 (100 %)')
    expect(yearsOverridingConfig(years, 100, 2026).map(y => y.year)).toEqual([2028])
    expect(yearsOverridingConfig(years, null, 2026)).toEqual([])
  })
})

const put = vi.fn().mockResolvedValue({ data: {} })
let stored = years.map(y => ({ ...y }))
const get = vi.fn(async url => {
  if (url === '/me') return { data: { name: 'Coop', options: { id: 1, deductible_vat_pct: 67 } } }
  if (url.startsWith('years')) return { data: stored }
  if (url === 'users/me') return { data: { permissions: [] } }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ put, get, post: vi.fn() }) }))
import MeForm from '@/components/MeForm.vue'

describe('Configuració warns and applies its % (issues/440)', () => {
  it('shows the overriding years and puts the % into them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-18T10:00:00'))
    const w = mount(MeForm, { global: { plugins: [Buefy], stubs: { 'router-link': true, CertificateCard: true, ReadCacheCard: true } } })
    await flushPromises()
    const notice = w.find('[data-test="vat-years"]')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('2026 (100 %) i 2027 (100 %)')
    expect(notice.text()).toContain('no el 67 %')

    stored = stored.map(y => (y.year >= 2026 ? { ...y, deductible_vat_pct: 67 } : y))
    await notice.find('button').trigger('click')
    await flushPromises()
    expect(put.mock.calls.map(c => c[0])).toEqual(['years/2', 'years/3'])
    expect(put.mock.calls[0][1]).toEqual({ deductible_vat_pct: 67 })
    expect(w.find('[data-test="vat-years"]').exists()).toBe(false)
    vi.useRealTimers()
  })
})
