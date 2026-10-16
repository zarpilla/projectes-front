// Amount to justify of a grant project for a year (project.grantable_years), or
// the project's own field when it has no per-year amounts.
//
// 2026-10-16: a grantable year without its year (year relation empty) made
// Justificacions throw "Cannot read properties of undefined (reading 'toString')"
// while drawing, which left the page half updated (figures of another hours
// type, NaN in the totals). Such entries are now skipped.

const yearOf = gy => {
  if (!gy || gy.year === null || gy.year === undefined) return null
  const y = typeof gy.year === 'object' ? gy.year.year : gy.year
  return y === null || y === undefined ? null : String(y)
}

export const grantableAmountForYear = (project, year, field = 'grantable_amount') => {
  if (!project) return 0
  if (!project.grantable_years || !project.grantable_years.length) return project[field] || 0
  const wanted = year === null || year === undefined ? null : String(year)
  const gy = project.grantable_years.find(g => wanted !== null && yearOf(g) === wanted)
  return gy ? gy[field] || 0 : 0
}
