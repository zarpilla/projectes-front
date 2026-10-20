// issues/299 (review 9, 2026-10-20): payroll 773 showed «IRPF a càrrec de la
// treballadora (null%)» when the person's dedication had no IRPF percentage.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn() }) }))
import { payrollLabel } from '@/domain/payrollForm'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/DocumentForm.vue'), 'utf8')

describe('payroll amount labels (issues/299)', () => {
  it('leave out a missing percentage', () => {
    expect(payrollLabel('IRPF a càrrec de la treballadora', null)).toBe('IRPF a càrrec de la treballadora')
    expect(payrollLabel('IRPF a càrrec de la treballadora', undefined)).toBe('IRPF a càrrec de la treballadora')
  })
  it('show a percentage with a decimal comma', () => {
    expect(payrollLabel('IRPF a càrrec de la treballadora', 15)).toBe('IRPF a càrrec de la treballadora (15%)')
    expect(payrollLabel('SS a càrrec de la cooperativa', '31.5')).toBe('SS a càrrec de la cooperativa (31,5%)')
  })
  it('the payroll form uses it for IRPF, other and SS', () => {
    expect(source).not.toMatch(/\$\{dedication\.pct_/)
    expect(source).toMatch(/payrollLabel\('IRPF a càrrec de la treballadora', dedication\.pct_irpf\)/)
    expect(source).toMatch(/payrollLabel\('Altres a càrrec de la treballadora', dedication\.pct_other\)/)
    expect(source).toMatch(/payrollLabel\('SS a càrrec de la cooperativa', dedication\.pct_quota\)/)
  })
})
