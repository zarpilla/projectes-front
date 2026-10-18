// issues/161: the invoices' change log was recorded (issues/001) but nobody
// could see it. The invoice, income, expense and quote forms now have a
// «Historial»: the statuses the document went through (issued, sent, paid,
// VAT, VeriFactu, FACe, rectified…) and who changed what, and when. Line
// changes come line by line (La Dotzena's monthly invoice has ~1000 lines).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import { historyEntries, timeline, linesChange, changeView } from '@/domain/documentHistory'
import { historyEntries as orderEntries } from '@/domain/orderHistory'

// newest first, as the API sends them
const ROWS = [
  {
    id: 6,
    action: 'face',
    username: null,
    createdAt: '2026-10-21T08:00:00.000Z',
    changes: [{ field: 'status', from: 'pending', to: 'registered' }],
    details: { mode: 'real', registration_number: 'REG-1' }
  },
  {
    id: 5,
    action: 'update',
    username: 'anna',
    createdAt: '2026-10-20T10:00:00.000Z',
    changes: [
      { field: 'paid', from: false, to: true },
      { field: 'paid_date', from: null, to: '2026-10-20' }
    ]
  },
  {
    id: 4,
    action: 'email',
    username: 'anna',
    createdAt: '2026-10-19T12:00:00.000Z',
    changes: [{ field: 'sent', from: false, to: true }, { field: 'sent_date', from: null, to: '2026-10-19' }],
    details: { to: 'client@example.org' }
  },
  {
    id: 3,
    action: 'verifactu',
    username: null,
    createdAt: '2026-10-19T11:00:05.000Z',
    changes: [{ field: 'state', from: 'pending', to: 'ok' }],
    details: { mode: 'real' }
  },
  {
    id: 2,
    action: 'update',
    username: 'pere',
    createdAt: '2026-10-19T11:00:00.000Z',
    changes: [
      { field: 'state', from: 'draft', to: 'real' },
      { field: 'code', from: 'ESBORRANY', to: 'F-2026-0007' },
      {
        field: 'lines',
        from: 1000,
        to: 1000,
        lines: {
          added: [],
          removed: [],
          changed: [{ index: 500, changes: [{ field: 'base', from: 10, to: 12 }] }],
          counts: { added: 0, removed: 0, changed: 1 }
        }
      }
    ]
  },
  {
    id: 1,
    action: 'create',
    username: 'pere',
    createdAt: '2026-10-18T09:00:00.000Z',
    snapshot: { state: 'draft', total: '12100.00', lines: 1000 }
  }
]

describe('document history entries (issues/161)', () => {
  it('names each entry, its author («Sistema» for the workers) and the changes', () => {
    const [face, paid, email, verifactu, issued, created] = historyEntries('emitted-invoice', ROWS)
    expect(face).toMatchObject({ title: 'FACe: Registrada', who: 'Sistema', detail: 'Registre REG-1', changes: [] })
    expect(paid.changes).toEqual([
      { field: 'paid', label: 'Cobrada', from: 'No', to: 'Sí' },
      { field: 'paid_date', label: 'Data de cobrament', from: '—', to: '20/10/2026' }
    ])
    expect(email).toMatchObject({ title: 'Enviada per correu a client@example.org', who: 'anna' })
    expect(verifactu).toMatchObject({ title: 'VeriFactu: Acceptada', detail: 'Mode real', who: 'Sistema' })
    expect(issued.changes[0]).toEqual({ field: 'state', label: 'Estat', from: 'Esborrany', to: 'Emesa' })
    expect(issued.changes[2]).toMatchObject({
      label: 'Línies',
      summary: '1.000 línies · 1 modificada',
      details: ['Línia 500: Preu 10,00 € → 12,00 €']
    })
    expect(created).toMatchObject({ title: 'Creació', detail: 'Estat: Esborrany · Total: 12.100,00 € · 1.000 línies' })
  })

  it('says “Pagada” on what we pay', () => {
    const [, paid] = historyEntries('received-invoice', ROWS)
    expect(paid.changes[0].label).toBe('Pagada')
  })

  it('lists the statuses oldest first', () => {
    const steps = timeline('emitted-invoice', ROWS, [{ id: 8, code: 'R-2026-0001', createdAt: '2026-10-22T09:00:00.000Z' }])
    expect(steps.map(s => s.label)).toEqual([
      'Creada · Esborrany',
      'Emesa',
      'VeriFactu: Acceptada',
      'Enviada per correu a client@example.org',
      'Cobrada el 20/10/2026',
      'FACe: Registrada',
      'Rectificada per R-2026-0001'
    ])
    expect(steps[1]).toMatchObject({ who: 'pere' })
  })

  it('shows VAT settled, quotes accepted, unpaid and rectifying invoices', () => {
    const rows = [
      { id: 4, action: 'update', createdAt: '2026-10-04T00:00:00Z', changes: [{ field: 'paid_date', from: '2026-10-01', to: null }] },
      { id: 3, action: 'update', createdAt: '2026-10-03T00:00:00Z', changes: [{ field: 'vat_paid_date', from: null, to: '2026-10-03T00:00:00Z' }] },
      { id: 2, action: 'update', createdAt: '2026-10-02T00:00:00Z', changes: [{ field: 'accepted', from: false, to: true }] },
      { id: 1, action: 'create', createdAt: '2026-10-01T00:00:00Z', snapshot: { rectified_invoice: { id: 7, label: 'F-0007' } } }
    ]
    expect(timeline('emitted-invoice', rows).map(s => s.label)).toEqual([
      'Creada',
      'Rectifica F-0007',
      'Acceptat',
      'IVA liquidat',
      'Ja no consta com a cobrada'
    ])
  })

  it('summarizes big line changes and says how many are not listed', () => {
    const change = {
      field: 'lines',
      from: 998,
      to: 1000,
      lines: {
        added: [{ index: 999, row: { concept: 'Comanda 999' } }],
        removed: [],
        changed: [],
        counts: { added: 120, removed: 0, changed: 0 }
      }
    }
    expect(linesChange(change)).toEqual({
      summary: '998 → 1.000 línies · 120 afegides',
      details: ['Afegida la línia 999 «Comanda 999»'],
      hidden: 119
    })
  })

  it('still reads the rows written before issues/161 (both whole lists)', () => {
    expect(changeView('emitted-invoice', { field: 'lines', from: [{}, {}], to: [{}, {}, {}] })).toEqual({
      field: 'lines',
      label: 'Línies',
      from: '2 línies',
      to: '3 línies'
    })
  })

  it('the order history reads the new line changes too', () => {
    const [entry] = orderEntries([
      {
        id: 1,
        action: 'update',
        changes: [{ field: 'lines', from: 1, to: 1, lines: { added: [], removed: [], changed: [{ index: 1, changes: [{ field: 'units', from: 2, to: 3 }] }] } }]
      }
    ])
    expect(entry.changes[0]).toMatchObject({ label: 'Línies', summary: '1 línia · 1 modificada', details: ['Línia 1: Unitats 2 → 3'] })
  })
})

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentHistory from '@/components/DocumentHistory.vue'

describe('DocumentHistory (issues/161)', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const mountIt = (props = {}) =>
    mount(DocumentHistory, {
      props: { entity: 'emitted-invoice', documentId: 7, ...props },
      global: { plugins: [Buefy] }
    })

  it('reads nothing until it is opened, then one page', async () => {
    api.get.mockResolvedValue({ data: { total: 6, entries: ROWS, rectifiedBy: [] } })
    const wrapper = mountIt()
    await flushPromises()
    expect(api.get).not.toHaveBeenCalled()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('document-change-logs/history/emitted-invoice/7?start=0&limit=200')
    expect(wrapper.text()).toContain('Emesa')
    expect(wrapper.text()).toContain('Enviada per correu a client@example.org')
    expect(wrapper.text()).toContain('1.000 línies · 1 modificada')
    expect(wrapper.text()).not.toContain("Carrega'n més")
  })

  it('loads the next page on demand', async () => {
    api.get
      .mockResolvedValueOnce({ data: { total: 7, entries: ROWS.slice(0, 6) } })
      .mockResolvedValueOnce({ data: { total: 7, entries: [{ id: 0, action: 'update', changes: [] }] } })
    const wrapper = mountIt()
    await wrapper.find('button').trigger('click')
    await flushPromises()

    const more = wrapper.findAll('button').find(b => b.text().startsWith("Carrega'n més"))
    expect(more.text()).toContain('(1)')
    await more.trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('document-change-logs/history/emitted-invoice/7?start=6&limit=200')
    expect(wrapper.text()).not.toContain("Carrega'n més")
  })

  it('reads again after a save once opened', async () => {
    api.get.mockResolvedValue({ data: { total: 0, entries: [] } })
    const wrapper = mountIt()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await wrapper.setProps({ refreshKey: 1 })
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Encara no hi ha cap canvi registrat.')
  })
})
