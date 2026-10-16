// The lines of an issued invoice (or a locked draft): a read-only table instead
// of the disabled inputs of DocumentLines (mockup A-Factura-emesa)
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentLinesReadOnly from '@/components/DocumentLinesReadOnly.vue'

const cells = w => w.findAll('tbody tr').map(tr => tr.findAll('td').map(td => td.text()))

describe('DocumentLinesReadOnly', () => {
  it('shows each line with its amount before taxes, as text', () => {
    const w = mount(DocumentLinesReadOnly, {
      props: {
        lines: [
          { concept: 'Desplaçaments', quantity: 1, base: 1044, discount: 0, vat: 0, irpf: 0 },
          { concept: 'Hores', quantity: 2.25, base: 40, discount: 10, vat: 21, irpf: 15 }
        ]
      }
    })
    expect(w.find('input').exists()).toBe(false)
    expect(cells(w)).toEqual([
      ['Desplaçaments', '1', '1.044,00 €', '—', '0 %', '—', '1.044,00 €'],
      // 2,25 × 40 − 10 % = 81
      ['Hores', '2,25', '40,00 €', '10 %', '21 %', '15 %', '81,00 €']
    ])
    expect(w.find('.lines-summary').text()).toBe('2 línies · IVA 0 % i 21 %')
  })

  it('adds the date column for diets and says when there are no lines', () => {
    const diet = mount(DocumentLinesReadOnly, {
      props: { isDiet: true, lines: [{ date: '2026-03-02', concept: 'Dinar', quantity: 1, base: 12, vat: 10 }] }
    })
    expect(cells(diet)[0].slice(0, 2)).toEqual(['02/03/2026', 'Dinar'])
    expect(diet.find('.lines-summary').text()).toBe('1 línia · IVA 10 %')

    const empty = mount(DocumentLinesReadOnly, { props: { lines: [] } })
    expect(cells(empty)).toEqual([['Sense línies']])
    expect(empty.find('.lines-summary').text()).toBe('0 línies')
  })
})
