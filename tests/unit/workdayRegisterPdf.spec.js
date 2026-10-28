// The «Registre de jornada» PDF was redrawn like the invoice PDFs (2026-10-28):
// its rows came in screen order (newest day first, month total after the
// month), one line per slot with the date repeated, and an open slot printed
// «09:00 - undefined:undefined».
import { describe, it, expect } from 'vitest'
import 'moment/dist/locale/ca'
import { workdayRegisterMonths } from '@/domain/workdayLog.js'

const slot = (date, hour_in, hour_out) => ({ id: 1, date, hour_in, hour_out })

describe('workday register PDF rows', () => {
  const activities = [
    { _type: 'total', date: '2026-10-01', month: '10' },
    slot('2026-10-02', '15:00:00.000', '18:00:00.000'),
    slot('2026-10-02', '09:00:00.000', '13:30:00.000'),
    { id: 0, date: '2026-10-03', hour_in: null, hour_out: null },
    slot('2026-10-05', '08:00:00.000', null),
    slot('2026-09-30', '09:00:00.000', '17:00:00.000')
  ]
  const months = workdayRegisterMonths(activities)

  it('groups the logged days by month in date order', () => {
    expect(months.map(m => m.label)).toEqual(['setembre 2026', 'octubre 2026'])
    expect(months[1].days.map(d => d.label)).toEqual(['02/10/2026', '05/10/2026'])
    expect(months[1].days[0].weekday).toBe('divendres')
  })

  it('lists the slots of a day by entry time, with their minutes', () => {
    expect(months[1].days[0].slots).toEqual([
      { hourIn: '09:00', hourOut: '13:30', minutes: 270 },
      { hourIn: '15:00', hourOut: '18:00', minutes: 180 }
    ])
    expect(months[1].days[0].minutes).toBe(450)
  })

  it('prints an open slot with an empty exit and no time', () => {
    expect(months[1].days[1].slots).toEqual([{ hourIn: '08:00', hourOut: '', minutes: 0 }])
  })

  it('adds up each month', () => {
    expect(months.map(m => m.minutes)).toEqual([480, 450])
  })
})
