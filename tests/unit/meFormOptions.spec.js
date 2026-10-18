// issues/139: Configuració general now edits the entity settings that only the
// server could set: the project options, the Seguretat Social defaults and the
// diet rates (`quotes`) and the logistics options. Each block goes back whole,
// with its id (so what isn't on the screen is kept), and a cleared number is
// sent as null.
import { describe, it, expect, vi } from 'vitest'

const put = vi.fn().mockResolvedValue({ data: {} })
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ put, get }) }))
import MeForm from '@/components/MeForm.vue'

const load = async (me, permissions = []) => {
  get.mockImplementation(async url => (url === 'users/me'
    ? { data: { permissions: permissions.map(permission => ({ permission })) } }
    : { data: me }))
  const c = { form: { ...MeForm.data.call({}).form }, $buefy: { toast: { open: vi.fn() }, snackbar: { open: vi.fn() } } }
  await MeForm.methods.loadData.call(c)
  return c
}

describe('Configuració general: entity settings (issues/139)', () => {
  it('sends the Seguretat Social, diet and logistics blocks back whole, with their id', async () => {
    const c = await load({
      name: 'Coop',
      options: { id: 1, treasury: true, orders: true },
      quotes: { id: 2, general_pct_quota: 32.12, diet_amount_total: 0.26, diet_amount_without_irpf: 0.19 },
      orders_options: { id: 3, multidelivery_discount: 10, next_day_limit_hour: 14 }
    })
    c.form.quotes.diet_amount_total = 0.3
    c.form.options.structuralExpenses = true
    c.form.orders_options.next_day_limit_hour = ''
    await MeForm.methods.submit.call(c)
    const body = put.mock.calls.at(-1)[1]
    expect(body.quotes).toEqual({ id: 2, general_pct_quota: 32.12, diet_amount_total: 0.3, diet_amount_without_irpf: 0.19 })
    expect(body.options).toEqual({ id: 1, treasury: true, orders: true, structuralExpenses: true })
    expect(body.orders_options).toEqual({ id: 3, multidelivery_discount: 10, next_day_limit_hour: null })
  })

  it('starts empty blocks when the entity has none yet', async () => {
    const c = await load({ name: 'Coop', options: null, quotes: null })
    expect(c.form.quotes).toEqual({})
    expect(c.form.orders_options).toEqual({})
  })

  it('shows the Logística block only to people with logistics', async () => {
    const office = await load({ name: 'Coop' }, ['admin', 'projects'])
    expect(office.logistics).toBe(false)
    const logistics = await load({ name: 'Coop' }, ['admin', 'orders_admin'])
    expect(logistics.logistics).toBe(true)
    const sections = MeForm.data.call({}).sections
    const index = flag => MeForm.computed.indexSections.call({ sections, logistics: flag }).map(s => s.id)
    expect(index(false)).not.toContain('cfg-logistica')
    expect(index(true)).toContain('cfg-logistica')
  })
})
