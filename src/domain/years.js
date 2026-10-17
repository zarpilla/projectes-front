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
