// issues/281 (review 8): consumption-point orders showed kilos with a point
// («11.5 kg» in the form total, «7.5» in the view lines, «7.5 kg» in Punts de
// consum) and Punts de consum named the point by its contact name, while the
// form, the view and the list use its trade name.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import fs from 'node:fs'
import path from 'node:path'

const order = {
  id: 24897,
  status: 'pending',
  pickup_point: true,
  estimated_delivery_date: '2026-10-22',
  contact: { id: 5, name: 'PUNT DE RECOLLIDA - Mas', trade_name: 'PUNT DE CONSUM - Mas' },
  route: { id: 1, name: 'Girona' },
  lines: [{ name: 'Anna', units: 1, kilograms: 4 }, { name: 'Pau', units: 2, kilograms: 7.5 }]
}
const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: [{ permission: 'orders_admin' }] } }
  if (url.startsWith('orders')) return { data: [order] }
  return { data: [] }
})
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post: vi.fn(), delete: vi.fn() }) }))
import PickupPointsOrders from '@/components/PickupPointsOrders.vue'

const source = file => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')

describe('Punts de consum (issues/281)', () => {
  it('shows the trade name and kilos with a decimal comma', async () => {
    const wrapper = mount(PickupPointsOrders, {
      global: { plugins: [Buefy, createPinia()], stubs: { 'router-link': true, 'download-excel': true } }
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('PUNT DE CONSUM - Mas')
    expect(text).not.toContain('PUNT DE RECOLLIDA')
    expect(text).toContain('7,5 kg')
    expect(text).not.toContain('7.5')
    expect(wrapper.vm.excelRows[0].point).toBe('PUNT DE CONSUM - Mas')
  })

  it('falls back to the name, then to the order snapshot', () => {
    const { pointName } = PickupPointsOrders.methods
    expect(pointName({ contact: { name: 'Nom' } })).toBe('Nom')
    expect(pointName({ contact: null, contact_trade_name: 'Còpia' })).toBe('Còpia')
  })
})

describe('order form and view kilos (issues/281)', () => {
  it('format the kilos of the lines and the form total', () => {
    const form = source('src/components/OrdersForm.vue')
    expect(form).toContain('{{ formatNumber(form.kilograms || 0, 2) }} kg, calculat des de les línies.')
    const view = source('src/views/OrderView.vue')
    expect(view).not.toMatch(/\{\{\s*(line|row)\.kilograms/)
  })
})
