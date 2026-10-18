import moment from 'moment'

/**
 * The year a year-filtered screen opens on (issues/064): this year when the
 * list has it, otherwise the latest one before it, otherwise the first. The
 * lists come sorted descending, so taking the first opened on next year
 * (2027), usually still empty. Entries like { year: 'Tots' } are skipped.
 */
export function defaultYear (years, now = moment().year()) {
  const numeric = (years || []).filter(y => /^\d{4}$/.test(String(y && y.year)))
  return numeric.find(y => Number(y.year) === now) ||
    [...numeric].sort((a, b) => b.year - a.year).find(y => Number(y.year) < now) ||
    numeric[0] ||
    null
}

// Fiscal year (Configuració general › Projectes, me.options.fiscal_year_start_month).
// Most entities close on 31/12 (start month 1: everything below is then the
// calendar year); a training centre may run September–August. A fiscal year
// is named by the year it starts in: with start month 9, 2026 is
// September 2026 – August 2027, shown as «2026/27». The backend groups the
// project economics the same way (projectes-v5 services/fiscal-year.js).
// VAT, invoice series, payrolls and working hours stay on the calendar year.

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des']

/** The configured start month (1–12) of a `me` record; 1 when unset. */
export function fiscalStartMonth (me) {
  const value = Number(me && me.options && me.options.fiscal_year_start_month)
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 1
}

/** Fiscal year (number) of a date (string, Date or moment); null if invalid. */
export function fiscalYearOf (date, startMonth = 1) {
  if (date === null || date === undefined || date === '') return null
  const m = moment(date)
  if (!m.isValid()) return null
  return startMonth > 1 && m.month() + 1 < startMonth ? m.year() - 1 : m.year()
}

/** «2026» for a calendar year, «2026/27» for one that starts after January. Other values as they are. */
export function fiscalYearLabel (year, startMonth = 1) {
  if (startMonth <= 1 || !/^\d{4}$/.test(String(year))) return String(year ?? '')
  return `${year}/${String(Number(year) + 1).slice(-2)}`
}

/** First and last day ('YYYY-MM-DD') of a fiscal year. */
export function fiscalYearRange (year, startMonth = 1) {
  const from = moment({ year: Number(year), month: startMonth - 1, day: 1 })
  return {
    from: from.format('YYYY-MM-DD'),
    to: from.clone().add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD')
  }
}

/** Month numbers (1–12) in fiscal order: [9, 10, 11, 12, 1, …, 8] for start month 9. */
export function fiscalMonthOrder (startMonth = 1) {
  return Array.from({ length: 12 }, (_, i) => ((startMonth - 1 + i) % 12) + 1)
}

/** Short Catalan month names in fiscal order. */
export function fiscalMonthNames (startMonth = 1) {
  return fiscalMonthOrder(startMonth).map(m => MONTH_NAMES[m - 1])
}

/**
 * Rows for a Kendo pivot with a fiscal year: `year` (the fiscal year, from the
 * backend) reads «2026/27» and `month` «01 Set» … «12 Ago», so the pivot,
 * which sorts the members by name, lists the months in fiscal order. The
 * same rows with a calendar year.
 */
export function fiscalPivotRows (rows, startMonth = 1) {
  if (startMonth <= 1) return rows
  const order = fiscalMonthOrder(startMonth)
  return (rows || []).map(r => {
    const month = Number(r.month)
    const pos = order.indexOf(month)
    return {
      ...r,
      year: /^\d{4}$/.test(String(r.year)) && String(r.year) !== '9999' ? fiscalYearLabel(r.year, startMonth) : r.year,
      month: pos < 0 ? r.month : `${String(pos + 1).padStart(2, '0')} ${MONTH_NAMES[month - 1]}`
    }
  })
}

/** «Any inici» of a project in the pivots: the (fiscal) year of its start, else of its creation. */
export function projectStartYearLabel (project, startMonth = 1) {
  const date = (project && (project.date_start || project.created_at || project.createdAt)) || null
  const year = fiscalYearOf(date, startMonth)
  return year === null ? '' : fiscalYearLabel(year, startMonth)
}
