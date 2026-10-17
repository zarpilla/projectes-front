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

async function render (view, type, lines, extra = {}, query = {}) {
  docs.current = {
    id: 1, code: '2025-039', emitted: '2025-04-30', contact: {}, lines, ...extra,
    total_base: 92.55, total_vat: 19.44, total_irpf: 9.32, total: 102.67
  }
  const w = mount(view, {
    props: { id: 1, type },
    global: {
      stubs: { TitleBar: true, HeroBar: true },
      mocks: { $route: { params: { id: 1, type }, query } }
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
    // 62,10 × 15 % = 9,315 rounds to 9,32 once lines are rounded to cents (issues/073)
    expect(cells(w, 1).slice(3)).toEqual(['-6,90 (10%)', '62,10€', '-9,32 (15%)', '13,04 (21%)', '65,82€'])
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

// issues/100: without a saved contact_info, the preview showed the client's NIF
// and address (from the contact) but not its name
describe('Invoice counterparty', () => {
  it('falls back to the contact for every field, the name too', async () => {
    const w = await render(Invoice, 'emitted-invoices', [plain], {
      contact_info: null,
      contact: { name: 'Fundació Món-3', nif: 'G60669579', address: 'Avda Diagonal 690', postcode: '08034', city: 'Barcelona' }
    })
    const client = w.find('.client-td').text()
    expect(client).toContain('Fundació Món-3')
    expect(client).toContain('G60669579')
  })

  it('prefers what the document saved', async () => {
    const w = await render(Invoice, 'emitted-invoices', [plain], {
      contact_info: { name: 'Nom a la factura', nif: 'B1' },
      contact: { name: 'Nom actual', nif: 'B2', city: 'Vic' }
    })
    const client = w.find('.client-td').text()
    expect(client).toContain('Nom a la factura')
    expect(client).not.toContain('Nom actual')
    expect(client).toContain('B1')
  })
})

describe('Quote counterparty (issues/100)', () => {
  it('shows the contact\'s name when the quote saved none', async () => {
    const w = await render(Quote, undefined, [plain], { contact_info: null, contact: { id: 9, name: 'Generalitat de Catalunya', nif: 'S0811001G' } })
    expect(w.find('.client-td').text()).toContain('Generalitat de Catalunya')
  })
})

describe('Quote view', () => {
  // issues/071: the date came from updated_at (quotes have no `date`) and the
  // unit price was printed raw (0.23€, 1234.5€)
  it('dates the quote by its issue date and formats the unit price', async () => {
    const w = await render(Quote, undefined, [plain, { ...discounted, base: 1234.5, quantity: 2 }])
    expect(w.text()).toContain('Data: 30/04/2025')
    expect(cells(w, 1)[2]).toBe('1.234,50€')
  })

  it('applies the line discount to the line IRPF, VAT and total', async () => {
    const w = await render(Quote, undefined, [plain, discounted])
    // Concepte, Q., Preu, Descompte, IRPF, IVA, Total
    expect(cells(w, 1).slice(3)).toEqual(['-6,90€ (10%)', '-9,32€ (15%)', '13,04€ (21%)', '65,82€'])
  })

  // issues/011: quotes left IRPF out of the PDF; the column and row only show
  // when some line withholds it
  it('shows the IRPF column and total only when a line has IRPF', async () => {
    const withIrpf = await render(Quote, undefined, [plain, discounted])
    expect(withIrpf.find('tr.t-heading').text()).toContain('IRPF')
    expect(withIrpf.find('tr.total').text()).toContain('IRPF: -9,32€')

    const without = await render(Quote, undefined, [plain, { ...discounted, irpf: 0 }], { total_irpf: 0 })
    expect(without.find('tr.t-heading').text()).not.toContain('IRPF')
    expect(without.find('tr.total').text()).not.toContain('IRPF')
    // Concepte, Q., Preu, Descompte, IVA, Total
    expect(cells(without, 1).slice(3)).toEqual(['-6,90€ (10%)', '13,04€ (21%)', '75,14€'])
  })
})

// issues/071: the language comes from ?locale= (contacts have no language yet);
// a regional or unknown value used to leave texts[locale] undefined and break the view
describe('Document language', () => {
  it('follows ?locale= and reads a regional value by its language', async () => {
    expect((await render(Quote, undefined, [plain], {}, { locale: 'es' })).text()).toContain('Fecha: 30/04/2025')
    expect((await render(Quote, undefined, [plain], {}, { locale: 'en-GB' })).text()).toContain('Date: 30/04/2025')
    expect((await render(Invoice, 'emitted-invoices', [plain], {}, { locale: 'ES' })).text()).toContain('Fecha')
  })

  it('falls back to Catalan for a language it has no texts for', async () => {
    expect((await render(Quote, undefined, [plain], {}, { locale: 'fr' })).text()).toContain('Data: 30/04/2025')
    expect((await render(Invoice, 'emitted-invoices', [plain], {}, { locale: 'fr' })).find('tr.item').exists()).toBe(true)
  })
})
