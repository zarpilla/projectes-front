// issues/299 (review 9, 2026-10-20): the Pressupostos list's «Concepte» showed
// the first line's concept while Ingressos shows the document's concept (and
// the first line's only when it has none). The list and its export now do the
// same as Ingressos.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

const api = { get: vi.fn(), put: vi.fn(), post: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import QuotesTable from '@/components/QuotesTable.vue'

const quotes = [
  { id: 1, code: 'P-1', emitted: '2026-03-05', document_concept: 'Web de la cooperativa', lines: [{ concept: 'Disseny' }], total_base: 100 },
  { id: 2, code: 'P-2', emitted: '2026-04-01', document_concept: null, lines: [{ concept: 'Manteniment' }], total_base: 50 },
  { id: 3, code: 'P-3', emitted: '2026-05-01', lines: [], total_base: 0 }
]

describe('Pressupostos «Concepte» (issues/299)', () => {
  it('is the quote concept, else the first line\'s, in the list and the export', async () => {
    api.get.mockResolvedValue({ data: quotes })
    const w = mount(QuotesTable, {
      props: { year: '2026' },
      global: {
        plugins: [Buefy],
        stubs: { DownloadExcel: true, RouterLink: { template: '<a><slot/></a>' } },
        mocks: { $router: { push: vi.fn() } },
        config: { warnHandler: () => {} }
      }
    })
    await flushPromises()
    const shown = w.findAll('td.doc-concept').map(td => td.text())
    expect(shown).toEqual(['Web de la cooperativa', 'Manteniment', ''])
    expect(w.vm.emittedCSV.map(r => r.concepte)).toEqual(['Web de la cooperativa', 'Manteniment', ''])
  })
})
