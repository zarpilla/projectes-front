// issues/444: the «Total» column of the dedication Gantts shows, on hover, the
// whole year like a month: hours per project (regroupable by type, àmbit…)
// and the working-day hours, all periods added up.
//
// `row` is the cells map of one person ({ [periodKey]: cell }) as sent by
// projects/real-dedications or projects/dedications; `periods` the columns.
export function annualCell (row, periods) {
  const byProject = new Map()
  let hours = 0
  let expected = 0
  let festive = null

  for (const p of periods || []) {
    const c = row ? row[p.key] : null
    if (!c) continue
    hours += Number(c.hours) || 0
    expected += Number(c.expected) || 0
    if (typeof c.festive === 'number') festive = (festive || 0) + c.festive
    for (const item of Array.isArray(c.breakdown) ? c.breakdown : []) {
      const prev = byProject.get(item.project)
      if (prev) prev.hours += Number(item.hours) || 0
      else byProject.set(item.project, { ...item, hours: Number(item.hours) || 0 })
    }
  }

  const breakdown = [...byProject.values()].sort((a, b) => b.hours - a.hours)
  const cell = {
    hours: hours.toFixed(2),
    percentage: expected > 0 ? ((hours / expected) * 100).toFixed(0) : '0',
    breakdown,
    expected,
    noSchedule: hours > 0 && !(expected > 0),
    tooltip: 'Sense dedicació'
  }
  if (festive !== null) cell.festive = festive
  if (expected > 0) cell.diff = expected - hours
  return cell
}
