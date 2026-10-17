import { describe, it, expect } from 'vitest'
import { slotMinutes, formatDuration, formatExpected, formatHoursMinutes, expectedHours } from '@/domain/workdayLog.js'

describe('workday log', () => {
  it('measures a slot in minutes', () => {
    expect(slotMinutes('09:00:00.000', '13:30:00.000')).toBe(270)
    expect(slotMinutes('07:52', '13:27')).toBe(335)
    expect(slotMinutes('09:00:00.000', null)).toBe(0)
    expect(slotMinutes(null, '13:00')).toBe(0)
  })

  // issues/069: whole minutes dropped the seconds of every slot, so slots of
  // 30 s added up to nothing
  it('keeps the seconds until the total is shown', () => {
    expect(slotMinutes('09:00:00', '09:00:59')).toBeCloseTo(59 / 60)
    const day = slotMinutes('09:00:00', '09:00:30') + slotMinutes('10:00:00', '10:00:30')
    expect(formatDuration(day)).toBe('0 h 01')
    expect(formatHoursMinutes(slotMinutes('08:00:20', '12:30:50') + slotMinutes('13:00:00', '15:00:00'))).toBe('6h 31m')
  })

  it('formats durations as "h mm"', () => {
    expect(formatDuration(270)).toBe('4 h 30')
    expect(formatDuration(480)).toBe('8 h 00')
    expect(formatDuration(0)).toBe('0 h 00')
    expect(formatDuration(-65)).toBe('−1 h 05')
    expect(formatExpected(168)).toBe('168 h')
    expect(formatExpected(7.5)).toBe('7,5 h')
  })

  const periods = [
    { from: '2026-06-01', to: '2026-06-30', hours: 8 },
    { from: '2026-07-01', to: '2026-07-31', hours: 6, hoursperday: '8,8,0,8,8,0,0' }
  ]
  const festives = [{ date: '2026-06-24' }]

  it('expects the daily hours from Monday to Friday', () => {
    expect(expectedHours('2026-06-01', periods, festives)).toBe(8) // Monday
    expect(expectedHours('2026-06-06', periods, festives)).toBe(0) // Saturday
    expect(expectedHours('2026-06-24', periods, festives)).toBe(0) // holiday
    expect(expectedHours('2026-05-29', periods, festives)).toBe(0) // no period
  })

  it('follows the weekly distribution when the period has one', () => {
    expect(expectedHours('2026-07-01', periods, festives)).toBe(0) // Wednesday
    expect(expectedHours('2026-07-02', periods, festives)).toBe(8) // Thursday
  })
})
