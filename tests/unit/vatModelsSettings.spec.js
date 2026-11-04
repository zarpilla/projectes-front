// 2026-11-04, validation of branch model-303 (Models 303 i 390 Beta):
// Configuració › «Models d'IVA (AEAT)» had no test: the activity, IAE, CNAE
// and the 390 exemption go to the AEAT files, so they must load and be sent
// back. The classification fields have their names in a document's history.
import { describe, it, expect, vi } from 'vitest'

const put = vi.fn().mockResolvedValue({ data: {} })
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ put, get }) }))
import MeForm from '@/components/MeForm.vue'
import { fieldLabels } from '@/domain/documentHistory'

const load = async (me) => {
  get.mockImplementation(async url => (url === 'users/me' ? { data: { permissions: [] } } : { data: me }))
  const c = { form: { ...MeForm.data.call({}).form }, $buefy: { toast: { open: vi.fn() }, snackbar: { open: vi.fn() } } }
  await MeForm.methods.loadData.call(c)
  return c
}

describe("Configuració › Models d'IVA (AEAT)", () => {
  it('is a section of the form, empty by default', () => {
    const data = MeForm.data.call({})
    expect(data.sections.map(s => s.id)).toContain('cfg-aeat')
    expect(data.form).toMatchObject({ aeat_activity: '', aeat_activity_code: '', aeat_iae: '', aeat_cnae: '', aeat_vat_390_exempt: false })
  })

  it('loads the AEAT fields and sends them back', async () => {
    const c = await load({ name: 'Coop', aeat_activity: 'Serveis de consultoria', aeat_activity_code: 'A03', aeat_iae: '8429', aeat_cnae: '7022', aeat_vat_390_exempt: true })
    expect(c.form).toMatchObject({ aeat_activity_code: 'A03', aeat_iae: '8429', aeat_cnae: '7022', aeat_vat_390_exempt: true })
    c.form.aeat_cnae = '6201'
    c.form.aeat_vat_390_exempt = false
    await MeForm.methods.submit.call(c)
    const body = put.mock.calls.at(-1)[1]
    expect(body).toMatchObject({ aeat_activity: 'Serveis de consultoria', aeat_activity_code: 'A03', aeat_iae: '8429', aeat_cnae: '6201', aeat_vat_390_exempt: false })
  })
})

describe('document history labels', () => {
  it('names the VAT classification fields', () => {
    const labels = fieldLabels('received-invoice')
    expect(labels.vat_operation).toMatch(/Tipus d'operació/)
    expect(labels.reverse_charge).toBe('Autoliquidació')
    expect(labels.vat_special).toBe('IVA de les línies (REAGP, estranger)')
  })
})
