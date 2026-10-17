// issues/127: datepickers wrote «5/2/2026» (browser format) next to «08/01/2026»
import { describe, it, expect } from 'vitest'
import { datepickerFormatter } from '@/helpers/datepickerFormat'

describe('datepickerFormatter (issues/127)', () => {
  it('writes dd/mm/aaaa', () => {
    expect(datepickerFormatter(new Date(2026, 1, 5), {})).toBe('05/02/2026')
  })
  it('joins a range with « - » and multiple dates with «, »', () => {
    const d = [new Date(2026, 0, 1), new Date(2026, 0, 31)]
    expect(datepickerFormatter(d, {})).toBe('01/01/2026 - 31/01/2026')
    expect(datepickerFormatter(d, { multiple: true })).toBe('01/01/2026, 31/01/2026')
  })
  it('leaves month pickers to their month format', () => {
    const vm = { isTypeMonth: true, dtfMonth: { format: () => 'febrer de 2026' } }
    expect(datepickerFormatter(new Date(2026, 1, 1), vm)).toBe('febrer de 2026')
  })
})
