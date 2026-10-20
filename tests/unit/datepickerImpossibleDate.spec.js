// issues/297 (review 9): typing 31/02/2026 in a budget line date («Previsió
// pag.») became 03/03/2026 and was saved. An impossible typed date is now
// refused (the field stays as it was); clearing the field still gives null.
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import moment from 'moment'
import { buefyConfig } from '@/helpers/buefyConfig'
import { parseTypedDate } from '@/helpers/datepickerFormat'
import LazyDatepicker from '@/components/LazyDatepicker.vue'
import DateField from '@/components/DateField.vue'

const day = d => (d ? moment(d).format('YYYY-MM-DD') : d)

describe('parseTypedDate', () => {
  it('reads day first, strictly', () => {
    expect(day(parseTypedDate('6/11/2026'))).toBe('2026-11-06')
    expect(day(parseTypedDate('06-11-26'))).toBe('2026-11-06')
    expect(day(parseTypedDate('29/02/2028'))).toBe('2028-02-29')
    expect(parseTypedDate('31/02/2026')).toBeUndefined()
    expect(parseTypedDate('29/02/2026')).toBeUndefined()
    expect(parseTypedDate('13/13/2026')).toBeUndefined()
    expect(parseTypedDate('')).toBeNull()
    expect(parseTypedDate('  ')).toBeNull()
  })
})

const typeIn = async (w, text) => {
  const input = w.find('input')
  await input.setValue(text)
  await input.trigger('change')
  await flushPromises()
}

describe('budget line datepicker (LazyDatepicker)', () => {
  const mountPicker = () => mount(LazyDatepicker, {
    props: { modelValue: new Date(2026, 1, 10), editable: '', locale: 'ca-ES' },
    global: { plugins: [[Buefy, buefyConfig]] },
    attachTo: document.body
  })

  const activate = async w => {
    await w.find('.lazy-datepicker').trigger('mouseenter')
    await flushPromises()
  }

  it('refuses an impossible date', async () => {
    const w = mountPicker()
    await activate(w)
    await typeIn(w, '31/02/2026')
    const emitted = (w.findComponent({ name: 'BDatepicker' }).emitted('update:modelValue') || []).map(e => day(e[0]))
    expect(emitted).not.toContain('2026-03-03')
    expect(emitted.every(d => d === '2026-02-10')).toBe(true)
    expect(w.find('input').element.value).toBe('10/02/2026')
    w.unmount()
  })

  it('takes a valid date and a cleared field', async () => {
    const w = mountPicker()
    await activate(w)
    const picker = w.findComponent({ name: 'BDatepicker' })
    await typeIn(w, '28/02/2026')
    expect(day(picker.emitted('update:modelValue').at(-1)[0])).toBe('2026-02-28')
    await typeIn(w, '')
    expect(picker.emitted('update:modelValue').at(-1)[0]).toBeNull()
    w.unmount()
  })
})

describe('DateField', () => {
  it('keeps its date on an impossible one and clears to null', async () => {
    const w = mount(DateField, {
      props: { modelValue: '2026-02-10' },
      global: { plugins: [[Buefy, buefyConfig]] },
      attachTo: document.body
    })
    await typeIn(w, '31/02/2026')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.find('input').element.value).toBe('10/02/2026')
    await typeIn(w, '')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([null])
    w.unmount()
  })
})
