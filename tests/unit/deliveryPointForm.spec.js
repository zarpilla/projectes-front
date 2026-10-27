// The delivery point form: Particular hours, NIF help, days of the town (issues/360)
import { describe, it, expect } from 'vitest'
import { isParticularSector, PARTICULAR_HOURS, NIF_HELP, townDeliveryText } from '@/domain/deliveryPointForm.js'

const sectors = [{ id: 2, name: 'Restauració' }, { id: 5, name: 'Particular' }]

describe('delivery point form', () => {
  it('knows the Particular sector by its name', () => {
    expect(isParticularSector(5, sectors)).toBe(true)
    expect(isParticularSector(2, sectors)).toBe(false)
    expect(isParticularSector(null, sectors)).toBe(false)
    expect(isParticularSector(1, [{ id: 1, name: ' particular ' }])).toBe(true)
  })

  it('a private customer is reachable 8–19 h, one slot', () => {
    expect(PARTICULAR_HOURS).toEqual({ time_slot_1_ini: 8, time_slot_1_end: 19, time_slot_2_ini: null, time_slot_2_end: null })
  })

  it('the NIF help is the Diligència text', () => {
    expect(NIF_HELP).toBe("Indicar el NIF correcte ens assegura que no registrem dues vegades el mateix punt d'entrega. Genera'l automàticament si és un particular")
  })

  it('lists the days and slots of the town, in week order', () => {
    const routes = [
      { id: 2, thursday: true, time_from: '13:00:00.000', time_to: '15:00:00.000' },
      { id: 1, tuesday: true, time_from: '07:00:00.000' }
    ]
    // the town has its own slot in route 1
    const links = { 1: { time_from: '09:00:00.000', time_to: '11:00:00.000' } }
    expect(townDeliveryText(routes, id => links[id] || null))
      .toBe('Dimarts de 9 a 11 h i dijous de 13 a 15 h')
  })

  it('merges two routes on the same day and leaves out a missing slot', () => {
    const routes = [
      { id: 1, monday: true, wednesday: true },
      { id: 2, monday: true, time_from: '07:00:00.000' },
      { id: 3, friday: true }
    ]
    expect(townDeliveryText(routes, () => null)).toBe('Dilluns a les 7 h, dimecres i divendres')
  })

  it('is empty when no route goes to the town', () => {
    expect(townDeliveryText([], () => null)).toBe('')
    expect(townDeliveryText([{ id: 9 }], () => null)).toBe('')
  })
})
