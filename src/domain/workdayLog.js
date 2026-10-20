// Daily workday log ("Registre de jornades"): durations of the time slots and the
// hours a person is expected to work on a day. The expected hours follow the rule
// of DedicationSaldo.vue: none on holidays or outside a work period; the period's
// weekly distribution (hoursperday, Monday first) when it has one, otherwise its
// daily hours from Monday to Friday.
import moment from 'moment'

// minutes between "HH:mm[:ss]" times, with the seconds as a fraction (whole
// minutes dropped them on every slot, issues/069); 0 when one is missing.
// Round once, when showing a total (formatDuration).
export const slotMinutes = (hourIn, hourOut) => {
  if (!hourIn || !hourOut) {
    return 0
  }
  return moment(hourOut, 'HH:mm:ss').diff(moment(hourIn, 'HH:mm:ss'), 'seconds') / 60
}

// the exit is before the entry (08:00–02:00): the slot counts negative, so it's
// shown as a mistake to fix (issues/128)
export const slotIsInverted = (hourIn, hourOut) => slotMinutes(hourIn, hourOut) < 0

// the hours a slot gives its project's activity: 0 while it's open (an entry
// without exit, «en curs»; it was null), null for an inverted slot, which must
// not reach the project as negative hours (issues/244)
export const slotActivityHours = (hourIn, hourOut) => {
  if (!hourIn || !hourOut) {
    return 0
  }
  const minutes = slotMinutes(hourIn, hourOut)
  return minutes < 0 ? null : minutes / 60
}

// a typed hh / mm pair is a time of day: 0–23 and 0–59, digits only
// (25:00 went to the backend and came back as a 400, issues/180)
export const isValidTime = (h, m) =>
  /^\d{1,2}$/.test(String(h)) && /^\d{1,2}$/.test(String(m)) && Number(h) <= 23 && Number(m) <= 59

// 270 → "4 h 30", 480 → "8 h 00", negatives keep their sign
export const formatDuration = (minutes) => {
  const m = Math.round(Number(minutes) || 0)
  const abs = Math.abs(m)
  return (m < 0 ? '−' : '') + `${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, '0')}`
}

// the printed summary: the screen's format, without sign (it printed "4h 30m"
// and "0h 0m" next to the screen's "4 h 30", issues/181)
export const formatHoursMinutes = (minutes) => formatDuration(Math.abs(Number(minutes) || 0))

// hours, as "168 h" or "7,5 h"
export const formatExpected = (hours) => {
  const rounded = Math.round((Number(hours) || 0) * 100) / 100
  return String(rounded).replace('.', ',') + ' h'
}

export const periodOn = (date, periods) =>
  (periods || []).find(p => date >= p.from && (!p.to || date <= p.to)) || null

export const festiveOn = (date, festives) =>
  (festives || []).find(f => f.date === date) || null

// the festive that counts on a date: the holiday for everyone before a
// personal day (Vacances on 1/1 is the 1/1 holiday, not a vacation day spent),
// whatever order they come in (issues/246)
export const countedFestiveOn = (date, festives) => {
  const onDate = (festives || []).filter(f => f.date === date)
  return onDate.find(f => !f.users_permissions_user) || onDate[0] || null
}

// a festive of the same person (or for everyone, both without person) already
// on that date, other than `ownId`: saving it again made a duplicate (issues/246)
export const festiveTaken = (date, personId, festives, ownId = null) => {
  const person = f => (f.users_permissions_user && (f.users_permissions_user.id || f.users_permissions_user)) || null
  return (festives || []).some(f => f.date === date && f.id !== ownId && person(f) === (personId || null))
}

// the hours of a work period on one date, festives aside: its weekly
// distribution when it has one, otherwise its daily hours from Monday to
// Friday. Saldo d'hores' rule, shared by Registre jornades, Bestretes and
// Hores anuals so they all expect the same hours (issues/238).
export const periodHours = (period, date) => {
  if (!period) {
    return 0
  }
  const day = moment(date, 'YYYY-MM-DD').day()
  if (period.hoursperday) {
    const value = parseFloat(String(period.hoursperday).split(',')[day === 0 ? 6 : day - 1])
    return Number.isFinite(value) ? value : 0
  }
  return day === 0 || day === 6 ? 0 : Number(period.hours) || 0
}

export const expectedHours = (date, periods, festives) => {
  const period = periodOn(date, periods)
  if (!period || festiveOn(date, festives)) {
    return 0
  }
  return periodHours(period, date)
}

// Only the festives of the dates a screen shows: all of them took 3+ s on
// tenants with years of festives (issues/096)
export const festivesBetween = (from, to) =>
  `festives?_where[date_gte]=${from}&[date_lte]=${to}&_limit=-1`

// the days a festive range saves: its weekdays, from `from` to `to` both
// included. The confirmation counts these same days (it said «8 festius» for
// a range that saved 6, issues/274).
export const festiveRangeDates = (from, to) => {
  const dates = []
  const start = moment(from)
  const days = to ? moment(to).diff(start, 'days') + 1 : 1
  for (let i = 0; i < days; i++) {
    const d = start.clone().add(i, 'days')
    if (d.day() !== 6 && d.day() !== 0) {
      dates.push(d.format('YYYY-MM-DD'))
    }
  }
  return dates
}
