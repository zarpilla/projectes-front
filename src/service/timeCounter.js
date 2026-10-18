import moment from 'moment'
import { formatNumber } from '@/helpers/format-number'

// When a running time counter started. Strapi 5 answers `createdAt`; v3 answered
// `created_at`. Reading only `created_at` gave `moment(undefined)`, i.e. now, so a
// stopped counter always saved 0 hours (issues/047). `start` is not used: the
// front sends it as local time without a zone.
export function counterStartTime (counter) {
  const created = counter && (counter.createdAt || counter.created_at)
  return created ? moment(created) : null
}

// Time elapsed since the counter started: { hours, minutes, seconds, inHours, display }
export function counterElapsed (counter, now = moment()) {
  const start = counterStartTime(counter)
  if (!start) return null
  const totalSeconds = Math.max(0, now.diff(start, 'seconds'))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  const inHours = hours + minutes / 60 + seconds / 3600
  return {
    start,
    hours,
    minutes,
    seconds,
    inHours,
    // «2 h 15 min 15 s (2,254 h)» (it said «(0.010h)», issues/181)
    display: `${hours} h ${minutes} min ${seconds} s (${formatNumber(inHours, 3, 3)} h)`
  }
}

// The id of a relation that may come populated ({ id, ... }) or as a bare id.
export function relationId (value) {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' ? (value.id ?? null) : value
}
