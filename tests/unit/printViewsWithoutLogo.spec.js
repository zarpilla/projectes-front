// issues/044: the invoice view (#/invoice/:id/:type, #/pdf/:id/:type) and the quote
// view built the logo URL from me.logo.url without checking that the entity has a
// logo. A new tenant has none, so the views threw "Cannot read properties of null
// (reading 'url')". Without a logo they must load and simply not show one.
import { describe, it, expect, vi } from 'vitest'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import Invoice from '@/views/Invoice.vue'
import Quote from '@/views/Quote.vue'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe.each([['Invoice', Invoice, 'emitted-invoices'], ['Quote', Quote, 'quotes']])('%s without a logo', (_, view, type) => {
  function vm (me) {
    api.get.mockImplementation(url => Promise.resolve({ data: url === 'me' ? me : { id: 1, code: '2026-001' } }))
    return { ...view.data.call({ $route: { params: { id: 1, type } } }), $route: { params: { id: 1, type } }, baseUrl: 'http://api', toDataUrl: vi.fn() }
  }

  it('loads the document and the settings without one', async () => {
    const c = vm({ id: 1, logo: null })
    view.methods.getData.call(c)
    await flush()
    expect(c.me).toEqual({ id: 1, logo: null })
    expect(c.quote).toMatchObject({ code: '2026-001' })
    expect(c.toDataUrl).not.toHaveBeenCalled()
  })

  it('loads the logo when there is one', async () => {
    const c = vm({ id: 1, logo: { url: '/uploads/logo.png' } })
    view.methods.getData.call(c)
    await flush()
    expect(c.toDataUrl.mock.calls[0][0]).toBe('http://api/uploads/logo.png')
  })
})
