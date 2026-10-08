// The printable invoice and quote views (issues/007): each line's amount, VAT,
// IRPF and total must include the line discount, like the stored totals do.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const docs = {}
vi.mock('@/service/index', () => ({
  default: () => ({
    get: url => Promise.resolve({ data: url === 'me' ? { name: 'Coop', logo: { url: '/logo.png' } } : docs.current })
  })
}))
vi.mock('html2pdf.js', () => ({ default: vi.fn() }))
import Invoice from '@/views/Invoice.vue'
import Quote from '@/views/Quote.vue'

Invoice.methods.toDataUrl = vi.fn()
Quote.methods.toDataUrl = vi.fn()

// 300 x 0.23 = 69.00, -10% = 62.10; VAT 21% = 13.04; IRPF 15% = 9.315 (9.3149… in floating point)
const discounted = { id: 2, concept: 'Lloguer', quantity: 300, base: 0.23, discount: 10, vat: 21, irpf: 15 }
const plain = { id: 1, concept: 'Desplaçaments', quantity: 1, base: 30.45, discount: 0, vat: 21, irpf: 0 }

async function render (view, type, lines) {
  docs.current = {
    id: 1, code: '2025-039', emitted: '2025-04-30', contact: {}, lines,
    total_base: 92.55, total_vat: 19.44, total_irpf: 9.32, total: 102.67
  }
  const w = mount(view, {
    props: { id: 1, type },
    global: {
      stubs: { TitleBar: true, HeroBar: true },
      mocks: { $route: { params: { id: 1, type }, query: {} } }
    }
  })
  await flushPromises()
  return w
}

const cells = (w, i) => w.findAll('tr.item')[i].findAll('td').map(td => td.text().replace(/\s+/g, ' '))

describe('Invoice view', () => {
  it('applies the line discount to the line amount, IRPF, VAT and total', async () => {
    const w = await render(Invoice, 'emitted-invoices', [plain, discounted])
    // Concepte, Q., Base, Descompte, Base imposable, IRPF, IVA, Total
    expect(cells(w, 1).slice(3)).toEqual(['-6,90 (10%)', '62,10€', '-9,31 (15%)', '13,04 (21%)', '65,83€'])
    expect(w.find('tr.total').text()).toContain('Base sense descompte: 99,45€')
    expect(w.find('tr.total').text()).toContain('Descompte: -6,90€')
  })

  it('renders lines without discount as before, with no discount column', async () => {
    const w = await render(Invoice, 'emitted-invoices', [plain])
    expect(w.find('tr.t-heading').text()).not.toContain('Descompte')
    expect(cells(w, 0).slice(1)).toEqual(['30,45€', '30,45€', '6,39 (21%)', '36,84€'])
    expect(w.find('tr.total').text()).not.toContain('Base sense descompte')
  })
})

describe('Quote view', () => {
  it('applies the line discount to the line VAT and total', async () => {
    const w = await render(Quote, undefined, [plain, discounted])
    // Concepte, Q., Preu, Descompte, IVA, Total
    expect(cells(w, 1).slice(3)).toEqual(['-6,90€ (10%)', '13,04€ (21%)', '75,14€'])
  })
})
