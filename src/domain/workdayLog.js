// Daily workday log ("Registre de jornades"): durations of the time slots and the
// hours a person is expected to work on a day. The expected hours follow the rule
// of DedicationSaldo.vue: none on holidays or outside a work period; the period's
// weekly distribution (hoursperday, Monday first) when it has one, otherwise its
// daily hours from Monday to Friday.
import moment from 'moment'

// minutes between "HH:mm[:ss]" times; 0 when one is missing
export const slotMinutes = (hourIn, hourOut) => {
  if (!hourIn || !hourOut) {
    return 0
  }
  return moment(hourOut, 'HH:mm:ss').diff(moment(hourIn, 'HH:mm:ss'), 'minutes')
}

// 270 → "4 h 30", 480 → "8 h 00", negatives keep their sign
export const formatDuration = (minutes) => {
  const m = Math.round(Number(minutes) || 0)
  const abs = Math.abs(m)
  return (m < 0 ? '−' : '') + `${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, '0')}`
}

// hours, as "168 h" or "7,5 h"
export const formatExpected = (hours) => {
  const rounded = Math.round((Number(hours) || 0) * 100) / 100
  return String(rounded).replace('.', ',') + ' h'
}

export const periodOn = (date, periods) =>
  (periods || []).find(p => date >= p.from && (!p.to || date <= p.to)) || null

export const festiveOn = (date, festives) =>
  (festives || []).find(f => f.date === date) || null

export const expectedHours = (date, periods, festives) => {
  const period = periodOn(date, periods)
  if (!period || festiveOn(date, festives)) {
    return 0
  }
  const day = moment(date, 'YYYY-MM-DD').day()
  if (period.hoursperday) {
    const value = parseFloat(String(period.hoursperday).split(',')[day === 0 ? 6 : day - 1])
    return Number.isFinite(value) ? value : 0
  }
  return day === 0 || day === 6 ? 0 : Number(period.hours) || 0
}

// Only the festives of the dates a screen shows: all of them took 3+ s on
// tenants with years of festives (issues/096)
export const festivesBetween = (from, to) =>
  `festives?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`
