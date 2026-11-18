// A person's working hours of one year against the collective agreement
// («Màxim del conveni»): the rule of Persones › «Resum hores» (DedicationSummary),
// taken out so Informes › Dedicació gives the same figures for everyone at once
// (issues/446). The comments of the steps come from there (issues/238, 246, 291).
import { periodHours } from './workdayLog'

const pad = n => String(n).padStart(2, '0')

// every date of the year, 'YYYY-MM-DD', with its weekday (0 = Sunday)
const yearDatesCache = new Map()
export const yearDates = year => {
  const y = Number(year)
  if (!yearDatesCache.has(y)) {
    const dates = []
    const d = new Date(Date.UTC(y, 0, 1))
    while (d.getUTCFullYear() === y) {
      dates.push({ date: `${y}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, day: d.getUTCDay() })
      d.setUTCDate(d.getUTCDate() + 1)
    }
    yearDatesCache.set(y, dates)
  }
  return yearDatesCache.get(y)
}

export const personOf = item => {
  const u = item && item.users_permissions_user
  return u ? (u.id !== undefined ? u.id : u) : null
}

const yearOf = item => {
  const y = item && item.year
  return y ? Number(y.year !== undefined ? y.year : y) : null
}

// the festive that counts on each date: the one for everyone first, whatever
// the order (countedFestiveOn, issues/246)
const festivesByDate = festives => {
  const byDate = new Map()
  for (const f of festives || []) {
    const current = byDate.get(f.date)
    if (!current || (personOf(current) && !personOf(f))) byDate.set(f.date, f)
  }
  return byDate
}

/**
 * One person, one year.
 * - periods: her daily-dedications (jornada periods: from, to, hours, hoursperday)
 * - festives: the year's festives for everyone and hers (others' are left out here)
 * - festiveTypes: [{ name, max }]
 * - maxes: user-festives that change a type's maximum, applied in order (the last
 *   wins): the year's for everyone, hers for any year, hers for this year
 * - workingHours: the year's hours of the agreement (years.working_hours)
 * - today: 'YYYY-MM-DD', for the days spent up to today
 */
export function agreementYear ({ year, periods = [], festives = [], festiveTypes = [], maxes = [], workingHours = 0, today = '' }) {
  const summary = {}
  festiveTypes.forEach(ft => {
    summary[ft.name] = { hours: 0, days: 0, max: ft.max, daysCurrent: 0, maxIsDefault: true }
  })
  for (const f of maxes) {
    const name = f.festive_type && f.festive_type.name
    if (summary[name]) {
      summary[name].max = f.max
      summary[name].maxIsDefault = false
    }
  }

  const byDate = festivesByDate(festives)
  // the vacation and free-choice days the figures count, so the table and the
  // KPI agree (issues/246)
  const personalDaysList = []
  let totalWorkedDays = 0
  let totalWorkedHours = 0
  let fullTimeDays = 0
  let warn = false
  for (const { date, day } of yearDates(year)) {
    const festive = byDate.get(date) || null
    const dailyDedication = periods.find(dd => date >= dd.from && date <= dd.to)
    if (!dailyDedication) warn = true

    // the period's weekly distribution, as Saldo d'hores (issues/238)
    const dayHours = periodHours(dailyDedication, date, day)
    const theoricHours = !festive ? dayHours : 0

    if (festive && dailyDedication) {
      const name = festive.festive_type && festive.festive_type.name
      const row = summary[name]
      // the hours of that day: none for a holiday on a Saturday (issues/246)
      if (row) {
        row.hours += dayHours
        row.days++
        if (date <= today) row.daysCurrent++
      }
      if (['Vacances', 'Lliure Elecció'].includes(name)) personalDaysList.push({ date, type: name })
    }
    // the days with jornada are those the period gives hours, the weekends of a
    // weekly distribution included, as in Saldo d'hores (issues/238)
    if (!festive && theoricHours > 0) {
      totalWorkedDays++
      totalWorkedHours += theoricHours
    }
    // the share of a full jornada (8 h from Monday to Friday) still counts every
    // weekday, those with 0 h too: "0,9,10,9,0,0,0" is 70 %, not 117 % (f61a83a)
    if (!festive && dailyDedication && day !== 0 && day !== 6) fullTimeDays++
  }

  // One scale for everything (issues/291):
  // - jornadaHours: hours of a day with jornada (what turns hours into days);
  // - share: of a full jornada, 8 h × the weekdays (f61a83a), what scales the conveni;
  // - a pending vacation or free day is a weekday (the maximums count weekdays), so
  //   it takes off the hours of an average weekday, share × 8 = hours / weekdays.
  const jornadaHours = totalWorkedDays ? totalWorkedHours / totalWorkedDays : 0
  const ratio = fullTimeDays ? totalWorkedHours / fullTimeDays / 8 : 0
  const weekdayHours = fullTimeDays ? totalWorkedHours / fullTimeDays : 0
  const weekdayDays = fullTimeDays ? totalWorkedDays / fullTimeDays : 0

  let laborableHours = totalWorkedHours
  let laborableDays = totalWorkedDays
  const pending = []
  festiveTypes.forEach(ft => {
    const row = summary[ft.name]
    if (row.days < row.max) {
      const daysToAdd = row.max - row.days
      const pendingDays = daysToAdd * weekdayDays
      const pendingHours = daysToAdd * weekdayHours
      pending.push({ name: ft.name, days: pendingDays, hours: pendingHours, used: row.days, max: row.max })
      laborableHours -= pendingHours
      laborableDays -= pendingDays
    }
  })

  const agreementHours = (Number(workingHours) || 0) * ratio
  const agreementDays = jornadaHours ? agreementHours / jornadaHours : 0

  return {
    summary,
    personalDaysList,
    warn,
    calc: {
      baseDays: totalWorkedDays,
      baseHours: totalWorkedHours,
      pending,
      ratio,
      dayHours: jornadaHours,
      weekdays: fullTimeDays,
      weekdayHours,
      weekdayDays
    },
    laborable: { hours: laborableHours, days: laborableDays },
    agreement: { hours: agreementHours, days: agreementDays },
    balance: { hours: laborableHours - agreementHours, days: laborableDays - agreementDays }
  }
}

/**
 * Everyone at once, from the year's lists as the API gives them (relations
 * populated): one pass to split them by person, then agreementYear for each
 * person with a jornada in the year. Map of user id → figures.
 */
export function agreementYearByPerson ({ year, periods = [], festives = [], festiveTypes = [], userFestives = [], workingHours = 0, today = '' }) {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const periodsOf = new Map()
  for (const p of periods) {
    const id = personOf(p)
    if (!id) continue
    if (!periodsOf.has(id)) periodsOf.set(id, [])
    periodsOf.get(id).push(p)
  }
  const common = []
  const festivesOf = new Map()
  for (const f of festives) {
    const id = personOf(f)
    if (!id) common.push(f)
    else {
      if (!festivesOf.has(id)) festivesOf.set(id, [])
      festivesOf.get(id).push(f)
    }
  }
  const typed = userFestives.filter(f => f.festive_type)
  const yearMaxes = typed.filter(f => !personOf(f) && yearOf(f) === Number(year))

  const result = new Map()
  for (const [id, own] of periodsOf) {
    // only who has a jornada in the year
    if (!own.some(p => p.from <= to && p.to >= from)) continue
    const maxes = [
      ...yearMaxes,
      ...typed.filter(f => personOf(f) === id && yearOf(f) === null),
      ...typed.filter(f => personOf(f) === id && yearOf(f) === Number(year))
    ]
    result.set(id, agreementYear({
      year,
      periods: own,
      festives: [...common, ...(festivesOf.get(id) || [])],
      festiveTypes,
      maxes,
      workingHours,
      today
    }))
  }
  return result
}
