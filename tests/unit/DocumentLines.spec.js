// The lines editor of DocumentForm (invoices, expenses, quotes...)
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import DocumentLines from '@/components/DocumentLines.vue'

const line = (over = {}) => ({ concept: 'A', base: 10, quantity: 1, discount: 0, vat: 21, irpf: 0, comments: '', show: false, ...over })
const newLine = vi.fn(() => line({ concept: '' }))

function mountLines (props = {}) {
  const wrapper = mount(DocumentLines, {
    props: {
      lines: [line()],
      newLine,
      // behave like v-model:lines in the parent
      'onUpdate:lines': lines => wrapper.setProps({ lines }),
      ...props
    },
    global: { plugins: [Buefy] }
  })
  return wrapper
}

const rows = w => w.findAll('li.subphase')
const inputs = (w, i) => rows(w)[i].findAll('input')

afterEach(() => { newLine.mockClear(); vi.useRealTimers() })

describe('DocumentLines', () => {
  it('renders one row per line with concept, quantity, price, discount, VAT and IRPF', () => {
    const w = mountLines({ lines: [line({ concept: 'Hores', quantity: 3, base: 12.5, discount: 10, vat: 21, irpf: 15 })] })
    expect(rows(w)).toHaveLength(1)
    expect(inputs(w, 0).map(i => i.element.value)).toEqual(['Hores', '3', '12.5', '10', '21', '15'])
  })

  it('adds a line from the parent factory with the last row\'s + button', async () => {
    const w = mountLines()
    await rows(w)[0].find('button.is-primary .mdi-plus-circle').element.closest('button').click()
    await flushPromises()
    expect(newLine).toHaveBeenCalledTimes(1)
    expect(w.emitted('update:lines')[0][0]).toHaveLength(2)
    expect(rows(w)).toHaveLength(2)
  })

  it('adds every line a diet factory returns (two preset lines)', async () => {
    const dietLines = vi.fn(() => [line({ concept: 'Dieta sense IRPF' }), line({ concept: 'Dieta amb IRPF', irpf: 15 })])
    const w = mountLines({ newLine: dietLines })
    w.vm.addLine()
    await w.vm.$nextTick()
    expect(w.emitted('update:lines')[0][0].map(l => l.concept)).toEqual(['A', 'Dieta sense IRPF', 'Dieta amb IRPF'])
  })

  it('removes a line in place, and offers no remove button for a single line', async () => {
    const lines = [line({ concept: 'A' }), line({ concept: 'B' }), line({ concept: 'C' })]
    const w = mountLines({ lines })
    await rows(w)[1].find('button.is-danger').trigger('click')
    expect(lines.map(l => l.concept)).toEqual(['A', 'C'])

    const single = mountLines()
    expect(single.find('button.is-danger').exists()).toBe(false)
  })

  it('turns a decimal comma into a dot 300ms after typing', async () => {
    vi.useFakeTimers()
    const lines = [line()]
    const w = mountLines({ lines })
    await inputs(w, 0)[2].setValue('12,5')
    expect(lines[0].base).toBe('12,5')
    vi.advanceTimersByTime(300)
    expect(lines[0].base).toBe('12.5')
  })

  it('disables editing (but not the internal notes toggle) when the document is locked', () => {
    const w = mountLines({ disabled: true, lines: [line(), line()] })
    expect(inputs(w, 0).slice(0, 6).every(i => i.element.disabled)).toBe(true)
    expect(rows(w)[0].find('button.is-danger').element.disabled).toBe(true)
  })

  it('shows the date column only for diets', () => {
    expect(mountLines({ isDiet: true }).find('.datepicker').exists()).toBe(true)
    expect(mountLines({ isDiet: false }).find('.datepicker').exists()).toBe(false)
  })

  it('paginates documents with more than 50 lines and removes on the right page', async () => {
    const lines = Array.from({ length: 60 }, (_, i) => line({ concept: `L${i}` }))
    const w = mountLines({ lines })
    expect(rows(w)).toHaveLength(50)
    w.vm.currentPage = 2
    await w.vm.$nextTick()
    expect(rows(w)).toHaveLength(10)
    expect(inputs(w, 0)[0].element.value).toBe('L50')
    await rows(w)[0].find('button.is-danger').trigger('click')
    expect(lines.map(l => l.concept)).not.toContain('L50')
    expect(lines).toHaveLength(59)
  })

  it('jumps to the last page after adding to a paginated document', async () => {
    const lines = Array.from({ length: 50 }, (_, i) => line({ concept: `L${i}` }))
    const w = mountLines({ lines })
    w.vm.addLine()
    await w.vm.$nextTick()
    expect(w.vm.currentPage).toBe(2)
  })
})
