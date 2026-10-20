// Dates of a dedication drawn on the project Gantt (issues/282).
// On the «Mesos» scale dhtmlx rounds both ends of a drag to the nearest month
// start, so a drag inside one month cell came back with end <= start and was
// saved inverted (2026-05-01 → 2026-04-30), its hours counted nowhere.
import moment from "moment"

// The range of a drag: the rounded ends, or, when they collapse or cross, the
// scale cell where the drag started. `round`, `floor` and `next` are the
// Gantt's own date helpers for the current scale unit.
export const draggedRange = (startDate, endDate, { round, floor, next }) => {
  const start = round(startDate)
  const end = round(endDate)
  if (+end > +start) return { start, end }
  const from = floor(startDate)
  return { start: from, end: next(from) }
}

// from/to (inclusive, YYYY-MM-DD) of a Gantt task, whose end_date is exclusive.
// Never end before the start: a missing, collapsed or inverted end keeps the
// month that starts on the start date.
export const dedicationDates = (startDate, endDate) => {
  const from = moment(startDate)
  const oneMonth = moment(from).add(1, "month").add(-1, "day")
  let to = endDate ? moment(endDate).add(-1, "day") : oneMonth
  if (to.isBefore(from, "day")) to = oneMonth
  return { from: from.format("YYYY-MM-DD"), to: to.format("YYYY-MM-DD") }
}
