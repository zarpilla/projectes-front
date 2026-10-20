// The series a new rectificative invoice starts with: a rectificative series
// of its date's year (R2026 for a 2026 invoice), as an invoice takes its date's
// year's series (issues/155). With only R2025 flagged rectificative, a 2026
// rectificative was numbered R2025-11 without any hint (issues/257).
// A rectificative always goes in a series flagged rectificative, of its year or
// not (the user, 2026-10-20): without one of its year it takes the latest one
// and the form says so; without any, it can't be saved.
export function rectificativeSerial (series, date) {
  const year = String(new Date(date).getFullYear())
  const rectificatives = (series || []).filter(s => s.rectificative === true)
  const match = rectificatives.find(s => String(s.name || '').includes(year))
  const latest = [...rectificatives].sort((a, b) =>
    String(b.name || '').localeCompare(String(a.name || ''), undefined, { numeric: true }) || b.id - a.id
  )[0]
  const chosen = match || latest || null
  return {
    series: rectificatives,
    serial: chosen ? chosen.id : null,
    serialName: chosen ? chosen.name : null,
    year,
    // there are rectificative series, but none of this year
    missingYear: rectificatives.length > 0 && !match
  }
}

// whether the chosen series (an id or { id }) is flagged rectificative
export function isRectificativeSerial (series, serial) {
  const id = serial && typeof serial === 'object' ? serial.id : serial
  return !!id && (series || []).some(s => s.id === id && s.rectificative === true)
}
