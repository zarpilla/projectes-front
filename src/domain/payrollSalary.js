// The salary of a month in Bestretes, and of the payrolls «Crea» saves. The
// backend's Persones › «Crear bestretes» (payrolls/create-all) follows the same
// rule in projectes-v5 src/services/payroll-salary.js, with the same tests
// (tests/unit/payrollSalary.spec.js here, tests/payroll-salary.test.js there):
// keep both in step (issues/290).
//
// - A period pays the share of a full week (40 h) of its monthly salary: its
//   weekly hours / 40 × monthly salary. Without a weekly distribution that is
//   hours/dia × 5 / 40 = hours/8 × salary, master's rule; with one, the sum of
//   the distribution (9,9,9,9,0,0,0 = 36 h = 90 %).
// - A month where the period changes is split by its working days, each at its
//   own period's figure (issues/264). A working day: inside a period, not a
//   holiday for everyone (a personal festive, e.g. vacation, is paid), and a
//   day of the distribution with hours (Monday to Friday without one).
import moment from 'moment'
import { countedFestiveOn, periodHours } from '@/domain/workdayLog.js'

export const weeklyHours = period => {
  if (!period) {
    return 0
  }
  if (period.hoursperday) {
    return String(period.hoursperday)
      .split(',')
      .slice(0, 7)
      .reduce((sum, value) => {
        const number = parseFloat(value)
        return sum + (Number.isFinite(number) ? number : 0)
      }, 0)
  }
  return (Number(period.hours) || 0) * 5
}

export const periodMonthlySalary = period =>
  period ? (Number(period.monthly_salary) || 0) * weeklyHours(period) / 40 : 0

const personalFestive = festive =>
  !!(festive && festive.users_permissions_user &&
    (festive.users_permissions_user.id || typeof festive.users_permissions_user !== 'object'))

export const isSalaryDay = (period, date, festive) => {
  if (!period || (festive && !personalFestive(festive))) {
    return false
  }
  if (period.hoursperday) {
    return periodHours(period, date) > 0
  }
  const day = moment(date, 'YYYY-MM-DD').day()
  return day !== 0 && day !== 6
}

export const salaryPeriodOn = (date, periods) =>
  (periods || []).find(p => date >= p.from && date <= p.to) || null

// `festives`: the holidays for everyone and the person's own ones
export const monthSalary = (year, month, periods, festives) => {
  const day = moment(`${year}-${month}-01`, 'YYYY-M-DD')
  const end = day.clone().endOf('month')
  let sum = 0
  let days = 0
  for (; day.isSameOrBefore(end, 'day'); day.add(1, 'day')) {
    const date = day.format('YYYY-MM-DD')
    const period = salaryPeriodOn(date, periods)
    if (isSalaryDay(period, date, countedFestiveOn(date, festives))) {
      sum += periodMonthlySalary(period)
      days++
    }
  }
  return days ? sum / days : 0
}
