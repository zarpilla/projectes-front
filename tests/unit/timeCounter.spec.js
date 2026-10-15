// The running time counter of #/dedicacio (issues/047): Strapi 5 answers
// `createdAt`, the counter read `created_at`, so the elapsed time was always 0
// and stopping a counter saved an activity of 0 hours.
import { describe, it, expect } from 'vitest'
import moment from 'moment'
import { counterElapsed, counterStartTime } from '@/service/timeCounter'

const now = moment('2026-10-15T12:30:45.000Z')

describe('counterElapsed', () => {
  it('counts from createdAt (Strapi 5)', () => {
    const e = counterElapsed({ id: 4, createdAt: '2026-10-15T10:15:30.000Z', start: '2026-10-15T08:15:30.000Z' }, now)
    expect([e.hours, e.minutes, e.seconds]).toEqual([2, 15, 15])
    expect(e.inHours.toFixed(3)).toBe('2.254')
    expect(e.display).toBe('2h 15m 15s (2.254h)')
  })

  it('still reads created_at (v3)', () => {
    expect(counterElapsed({ created_at: '2026-10-15T12:00:00.000Z' }, now).inHours).toBeCloseTo(30.75 / 60, 6)
  })

  it('has nothing to count without a counter or its creation time', () => {
    expect(counterElapsed(null, now)).toBe(null)
    expect(counterStartTime({ id: 4 })).toBe(null)
  })
})
