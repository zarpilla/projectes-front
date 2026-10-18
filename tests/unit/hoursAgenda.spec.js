// The hours calendar on a phone: the month listed by week and day under the grid,
// so project names can be read (the grid leaves ~50 px per day).
import { describe, it, expect } from 'vitest'
import { hoursAgenda } from '@/domain/hoursAgenda'

const activity = (key, date, project, hours) => ({
  key, dates: date, customData: { type: 'activity', project, username: 'Laia Serra', hours, bg_project: '#0b7a6c', a: { id: key } }
})

describe('hoursAgenda', () => {
  it('lists the days in order, grouped by ISO week, with day and week totals', () => {
    const weeks = hoursAgenda([
      { key: 'today', highlight: 'red', dates: new Date(2026, 5, 17) },
      activity(3, '2026-06-08', 'Projecte pilot de sobirania alimentària', 4),
      activity(1, '2026-06-02', 'Acompanyament en cultura popular Bellmodel', 2.5),
      activity(2, '2026-06-02', 'Jornades d\'habitatge cooperatiu', 1.5),
      activity(4, '2026-06-07', 'Recerca en consum responsable', 1)
    ])
    expect(weeks.map(w => [w.week, w.hours, w.days.map(d => [d.date, d.hours])])).toEqual([
      [23, 5, [['2026-06-02', 4], ['2026-06-07', 1]]],
      [24, 4, [['2026-06-08', 4]]]
    ])
    // the whole name is kept, the list shows it at full width
    expect(weeks[0].days[0].entries.map(e => e.project)).toEqual([
      'Acompanyament en cultura popular Bellmodel', 'Jornades d\'habitatge cooperatiu'
    ])
  })

  it('leaves pending iCal events out of the totals, and lists holidays', () => {
    const [week] = hoursAgenda([
      activity(1, '2026-06-03', 'Web', 2),
      { key: 'uid-1', dates: new Date(2026, 5, 3, 9), customData: { type: 'ical', project: 'Reunió', hours: 1, pending: true } },
      { key: 9, dates: '2026-06-24', customData: { type: 'festive', project: 'Festiu Catalunya', username: 'TOTES', hours: 0 } }
    ])
    const june3 = week.days[0]
    expect([june3.hours, june3.pending, june3.entries.map(e => e.pending)]).toEqual([2, 1, [false, true]])
    expect(week.days).toHaveLength(1)
    expect(hoursAgenda([{ key: 9, dates: '2026-06-24', customData: { type: 'festive', project: 'Festiu Catalunya', hours: 0 } }])[0].days[0].entries[0].type).toBe('festive')
  })

  it('is empty without entries', () => {
    expect(hoursAgenda([])).toEqual([])
    expect(hoursAgenda(undefined)).toEqual([])
  })
})
