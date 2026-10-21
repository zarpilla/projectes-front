// issues/314: the delivery time slot of a route and of a town in a route.
// Only a start is a fixed time («a les 7 h»); start and end is a range.
import { describe, it, expect } from 'vitest'
import { formatSlot, slotOf, timeInput, timeValue, slotError } from '@/domain/cityRoutes.js'

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
    expect(slotOf({ time_from: null, time_to: null }, route)).toEqual({ from: '09:00:00', to: '14:00:00', own: false, text: 'de 9 a 14 h' })
  })

  it('a town with its own slot keeps it, even a fixed time inside a ranged route', () => {
    expect(slotOf({ time_from: '07:00:00', time_to: null }, route)).toEqual({ from: '07:00:00', to: null, own: true, text: 'a les 7 h' })
  })

  it('no slot anywhere → empty text', () => {
    expect(slotOf(null, { id: 2 })).toEqual({ from: null, to: null, own: false, text: '' })
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
})
