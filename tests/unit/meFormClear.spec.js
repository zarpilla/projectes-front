// issues/080: Configuració general only sent the non-empty fields, so a text
// field or a bank account set back to «Selecciona…» could not be emptied.
import { describe, it, expect, vi } from 'vitest'

const put = vi.fn().mockResolvedValue({ data: {} })
vi.mock('@/service/index', () => ({ default: () => ({ put, get: vi.fn() }) }))
import MeForm from '@/components/MeForm.vue'

const vm = form => ({
  form: { ...MeForm.data.call({}).form, name: 'Coop', ...form },
  $buefy: { snackbar: { open: vi.fn() }, toast: { open: vi.fn() } }
})

describe('MeForm save (issues/080)', () => {
  it('sends cleared fields as null', async () => {
    await MeForm.methods.submit.call(vm({ phone: '', invoice_footer: '', bank_account_vat: null, nif: 'F1' }))
    const body = put.mock.calls.at(-1)[1]
    expect(body).toMatchObject({ name: 'Coop', nif: 'F1', phone: null, invoice_footer: null, bank_account_vat: null })
  })

  it('does not save without a name', async () => {
    put.mockClear()
    const c = vm({ name: '  ' })
    await MeForm.methods.submit.call(c)
    expect(put).not.toHaveBeenCalled()
    expect(c.$buefy.toast.open).toHaveBeenCalled()
  })

  it('sends the task notices switch off as false (null would read as on)', async () => {
    await MeForm.methods.submit.call(vm({ task_emails: false }))
    expect(put.mock.calls.at(-1)[1].task_emails).toBe(false)
  })
})

describe('MeForm load', () => {
  it('shows the task notices on when the setting is still empty', async () => {
    const c = {
      form: { ...MeForm.data.call({}).form },
      $buefy: { toast: { open: vi.fn() } }
    }
    const get = vi.fn().mockResolvedValue({ data: { name: 'Coop', task_emails: null } })
    const service = await import('@/service/index')
    vi.spyOn(service, 'default').mockReturnValue({ get, put })
    await MeForm.methods.loadData.call(c)
    expect(get).toHaveBeenCalledWith('/me')
    expect(c.$buefy.toast.open).not.toHaveBeenCalled()
    expect(c.form.task_emails).toBe(true)
    get.mockResolvedValue({ data: { name: 'Coop', task_emails: false } })
    await MeForm.methods.loadData.call(c)
    expect(c.form.task_emails).toBe(false)
  })
})
