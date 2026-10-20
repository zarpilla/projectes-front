// issues/280 (redesign review 8, 2026-10-20): document-form slips.
// - Payroll «Despesa total» read «1289.6399999999999», and the heading code
//   was «2026-9-859» while the list says «2026-09-Quim».
// - «Nova dieta» with a project: «DETALL DEL PROJECTE» had no phases until the
//   diet was saved, so it couldn't be assigned to a budget line first.
// - Quote «Acceptat» ticked alone saved accepted=1, accepted_date=NULL.
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import DocumentForm from '@/components/DocumentForm.vue'
import { payrollCode, payrollTotal } from '@/domain/payrollForm'
import { setAccepted, setAcceptedDate } from '@/domain/documentDates'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/DocumentForm.vue'), 'utf8')

describe('payroll form (issues/280)', () => {
  it('«Despesa total» has two decimals', () => {
    expect(payrollTotal(1012.37, 277.27)).toBe('1289.64')
    expect(payrollTotal('1000', null)).toBe('1000.00')
  })
  it('the code is the list one', () => {
    const p = { id: 859, year: { year: 2026 }, month: { month: 9 }, users_permissions_user: { username: 'Quim' } }
    expect(payrollCode(p)).toBe('2026-09-Quim')
    expect(payrollCode({ year: { year: 2026 }, month: { month: 11 } })).toBe('2026-11')
  })
  it('the form uses them', () => {
    expect(source).toMatch(/this\.form\.code = this\.form\.code \|\| payrollCode\(this\.form\)/)
    expect(source).toMatch(/this\.form\.total = payrollTotal\(this\.form\.total_base, this\.form\.ss_base\);/)
    expect(source).not.toMatch(/this\.form\.total = this\.form\.total_base \+ this\.form\.ss_base/)
  })
})

describe('«Nova dieta» with a project (issues/280)', () => {
  it('loads the project with its phases', async () => {
    const withPhases = { id: 4, name: 'Celler Artés', project_phases: [{ id: 1, incomes: [], expenses: [] }] }
    get.mockResolvedValueOnce({ data: withPhases })
    const vm = {
      type: 'received-expenses',
      form: { projects: [] },
      clients: [],
      quotes: {},
      calculateIRPF: vi.fn(),
      projectSelected: DocumentForm.methods.projectSelected
    }
    await DocumentForm.methods.handleDietSubmit.call(vm, {
      user: 1, project: { id: 4, name: 'Celler Artés' }, concept: 'Dieta', kilometers: 10, date: new Date(2026, 9, 20)
    })
    expect(get).toHaveBeenCalledWith('projects/4/phases')
    expect(vm.form.projects).toEqual([withPhases])
  })
})

describe('quote «Acceptat» and its date (issues/280)', () => {
  const today = new Date(2026, 9, 20)
  it('ticking without a date fills in today', () => {
    expect(setAccepted({ accepted: false, accepted_date: null }, true, today)).toEqual({ accepted: true, accepted_date: today })
  })
  it('ticking keeps a chosen date, unticking clears it', () => {
    const d = new Date(2026, 9, 1)
    expect(setAccepted({ accepted: false, accepted_date: d }, true, today).accepted_date).toBe(d)
    expect(setAccepted({ accepted: true, accepted_date: d }, false)).toEqual({ accepted: false, accepted_date: null })
  })
  it('choosing a date ticks the box', () => {
    expect(setAcceptedDate({ accepted: false, accepted_date: null }, today)).toEqual({ accepted: true, accepted_date: today })
  })
  it('the form uses them', () => {
    expect(source).toMatch(/@update:model-value="v => setAccepted\(form, v\)"/)
    expect(source).toMatch(/@update:model-value="v => setAcceptedDate\(form, v\)"/)
  })
})
