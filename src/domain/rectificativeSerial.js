// The series a new rectificative invoice starts with: a rectificative series
// of its date's year (R2026 for a 2026 invoice), as an invoice takes its date's
// year's series (issues/155). With only R2025 flagged rectificative, a 2026
// rectificative was numbered R2025-11 without any hint (issues/257).
export function rectificativeSerial (series, date) {
  const year = String(new Date(date).getFullYear())
  const rectificatives = (series || []).filter(s => s.rectificative === true)
  const match = rectificatives.find(s => String(s.name || '').includes(year))
  return {
    series: rectificatives,
    serial: match ? match.id : null,
    year,
    // there are rectificative series, but none of this year
    missingYear: rectificatives.length > 0 && !match
  }
}
