// issues/104: values still printed with a decimal point or without unit/space:
// «Setmana: 0.00h», the gantt tooltip «114.99h», kilos «22.5», «97.96 %»,
// Projectes mare «-2.677,97€» and hours without «h».
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import DedicationTooltip from '@/components/DedicationTooltip.vue'
import DedicationInput from '@/components/DedicationInput.vue'
import VatTable from '@/components/VatTable.vue'

describe('Catalan numbers (issues/104)', () => {
  it('dedication tooltip hours', () => {
    expect(DedicationTooltip.methods.formatHours(114.99)).toBe('114,99')
    expect(DedicationTooltip.computed.totalHoursFormatted.call({ hasBreakdown: false, cell: { hours: '34.66' }, formatHours: DedicationTooltip.methods.formatHours })).toBe('34,66')
  })

  it('Hores dedicades week and day sums', () => {
    const ctx = { attributes: [{ dates: '2026-10-07', customData: { hours: 7.5 } }, { dates: '2026-10-08', customData: { hours: 0.25 } }] }
    expect(DedicationInput.methods.weekSum.call(ctx, 41)).toBe('7,75')
    expect(DedicationInput.methods.daySum.call({}, [{ customData: { hours: 7.5 } }])).toBe('7,50')
  })

  it('IVA percentages', () => {
    expect(VatTable.methods.pct(97.96)).toBe('97,96 %')
    expect(VatTable.methods.pct(0)).toBe('0 %')
  })
  // Projectes mare: tests/unit/motherProjectsHours.spec.js
})

// issues/105: the IVA documents table showed «2024-05-31»
describe('IVA dates (issues/105)', () => {
  it('formats the documents\' dates', async () => {
    const VatTable = (await import('@/components/VatTable.vue')).default
    const src = (await import('node:fs')).readFileSync(require('node:path').resolve(process.cwd(), 'src/components/VatTable.vue'), 'utf8')
    expect(src).not.toMatch(/\{\{\s*props\.row\.date\s*\}\}/)
    expect(VatTable.methods.formatDate('2024-05-31')).toBe('31/05/2024')
  })
})
