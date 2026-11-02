// issues/314: the delivery time slot of a route and of a town in a route.
// Only a start is a fixed time («a les 7 h»); start and end is a range.
import { describe, it, expect } from 'vitest'
import { formatSlot, formatSlots, slotOf, timeInput, timeValue, slotError, slotsError, slotData } from '@/domain/cityRoutes.js'

describe('formatSlot', () => {
  it.each([
    [null, null, ''],
    ['07:00:00', null, 'a les 7 h'],
    ['07:00:00.000', '', 'a les 7 h'],
    ['12:00:00', '15:00:00', 'de 12 a 15 h'],
    ['09:30:00', '14:00:00', 'de 9:30 a 14 h'],
    ['13:00', '13:45', 'de 13 a 13:45 h'],
    ['01:00:00', null, 'a la 1 h']
  ])('%s – %s → «%s»', (from, to, text) => {
    expect(formatSlot(from, to)).toBe(text)
  })
})

describe('slotOf', () => {
  const route = { id: 1, time_from: '09:00:00', time_to: '14:00:00' }

  it('a town without its own slot takes the route one', () => {
    expect(slotOf({ time_from: null, time_to: null }, route)).toEqual({ from: '09:00:00', to: '14:00:00', from2: null, to2: null, own: false, text: 'de 9 a 14 h' })
  })

  it('a town with its own slot keeps it, even a fixed time inside a ranged route', () => {
    expect(slotOf({ time_from: '07:00:00', time_to: null }, route)).toEqual({ from: '07:00:00', to: null, from2: null, to2: null, own: true, text: 'a les 7 h' })
  })

  it('no slot anywhere → empty text', () => {
    expect(slotOf(null, { id: 2 })).toEqual({ from: null, to: null, from2: null, to2: null, own: false, text: '' })
  })
})

// 2026-11-02: a second, optional slot («de 9 a 13 h i de 16 a 19 h»)
describe('second slot', () => {
  const route = { time_from: '09:00:00', time_to: '13:00:00', time_from_2: '16:00:00', time_to_2: '19:00:00' }

  it('is shown after the first one', () => {
    expect(formatSlots(route)).toBe('de 9 a 13 h i de 16 a 19 h')
    expect(formatSlots({ time_from: '07:00', time_from_2: '12:00' })).toBe('a les 7 h i a les 12 h')
    expect(formatSlots({ time_from_2: '16:00' })).toBe('')
  })

  it('a town takes both route slots, or only its own ones', () => {
    expect(slotOf(null, route).text).toBe('de 9 a 13 h i de 16 a 19 h')
    expect(slotOf({ time_from: '07:00:00' }, route)).toMatchObject({ own: true, from2: null, text: 'a les 7 h' })
    expect(slotOf({ time_from: '07:00:00', time_from_2: '17:00:00' }, route).text).toBe('a les 7 h i a les 17 h')
  })

  it('must come after the first one, and needs it', () => {
    expect(slotsError({ from: '09:00', to: '13:00', from2: '16:00', to2: '19:00' })).toBe('')
    expect(slotsError({ from: '09:00', to: '13:00', from2: '', to2: '' })).toBe('')
    expect(slotsError({ from: '', to: '', from2: '16:00', to2: '' })).toMatch(/necessita la primera/)
    expect(slotsError({ from: '09:00', to: '13:00', from2: '12:00', to2: '' })).toMatch(/després de la primera/)
    expect(slotsError({ from: '09:00', to: '', from2: '09:00', to2: '' })).toMatch(/després de la primera/)
    expect(slotsError({ from: '09:00', to: '13:00', from2: '19:00', to2: '16:00' })).toMatch(/posterior/)
  })

  it('no first slot clears them all', () => {
    expect(slotData({ from: '', to: '', from2: '16:00', to2: '19:00' }))
      .toEqual({ time_from: null, time_to: null, time_from_2: null, time_to_2: null })
    expect(slotData({ from: '9:00', to: '', from2: '', to2: '19:00' }))
      .toEqual({ time_from: '09:00:00.000', time_to: null, time_from_2: null, time_to_2: null })
  })
})

describe('time inputs', () => {
  it('shows HH:mm and sends what Strapi takes', () => {
    expect(timeInput('07:00:00.000')).toBe('07:00')
    expect(timeInput(null)).toBe('')
    expect(timeValue('7:05')).toBe('07:05:00.000')
    expect(timeValue('')).toBeNull()
    expect(timeValue('nonsense')).toBeNull()
  })

  it('refuses an end without start or not after the start', () => {
    expect(slotError('09:00', '14:00')).toBe('')
    expect(slotError('07:00', '')).toBe('')
    expect(slotError('', '')).toBe('')
    expect(slotError('', '14:00')).toMatch(/inici/)
    expect(slotError('15:00', '12:00')).toMatch(/posterior/)
  })
})

describe('route form («Rutes»)', async () => {
  const { routeToForm, validateRoute, routePayload } = await import('@/domain/routeForm.js')
  const route = { id: 1, name: 'DT - MARESME', tuesday: true, active: true, time_from: '09:00:00', time_to: '14:00:00' }

  it('loads, validates and saves the usual slot', () => {
    const form = routeToForm(route)
    expect(form).toMatchObject({ time_from: '09:00', time_to: '14:00' })
    expect(routePayload(form)).toMatchObject({ time_from: '09:00:00.000', time_to: '14:00:00.000' })
    expect(routePayload({ ...form, time_from: '', time_to: '' })).toMatchObject({ time_from: null, time_to: null })
    expect(validateRoute({ ...form, time_from: '15:00' }, [route]).time_slot).toMatch(/posterior/)
    expect(validateRoute(form, [route]).time_slot).toBeUndefined()
  })

  it('loads, validates and saves the second slot', () => {
    const form = routeToForm({ ...route, time_to: '13:00:00', time_from_2: '16:00:00', time_to_2: '19:00:00' })
    expect(form).toMatchObject({ time_from_2: '16:00', time_to_2: '19:00' })
    expect(routePayload(form)).toMatchObject({ time_from_2: '16:00:00.000', time_to_2: '19:00:00.000' })
    expect(routePayload({ ...form, time_from: '' })).toMatchObject({ time_from: null, time_from_2: null, time_to_2: null })
    expect(validateRoute({ ...form, time_from_2: '12:00' }, [route]).time_slot).toMatch(/després de la primera/)
  })
})
