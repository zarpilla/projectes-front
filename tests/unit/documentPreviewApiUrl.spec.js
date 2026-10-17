// issues/122: the invoice and quote previews took the API address (for the
// logo) from the build, which in the production image is localhost:1337 for
// every site, instead of each site's runtime config.
import { describe, it, expect, vi } from 'vitest'
vi.mock('html2pdf.js', () => ({ default: vi.fn() }))
import Invoice from '@/views/Invoice.vue'
import Quote from '@/views/Quote.vue'

describe('document previews use the runtime API address (issues/122)', () => {
  it('Invoice', () => {
    expect(Invoice.data.call({ $route: { params: {} } }).baseUrl).toBe('http://api.test')
  })
  it('Quote', () => {
    expect(Quote.data.call({ $route: { params: {} } }).baseUrl).toBe('http://api.test')
  })
})
