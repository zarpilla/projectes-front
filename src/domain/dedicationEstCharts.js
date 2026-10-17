// Figures of the charts of Informes › Dedicació (it merged «Dedicació (gràfic)»,
// «Dedicació (taula)» and «Prev./Real dedicació»), from the rows of its pivot
// (DedicationEstPivot): rows of logged hours (`hours`, `real_cost`) and rows of
// planned hours (`estimated_hours`, `estimated_hours_today`, `original_estimated_hours`),
// by project, person, year and month — the pivot's «Hores reals», «Cost real»,
// «Hores previstes», «Hores previstes avui» and «Hores originals».

const MONTHS = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des']
const num = v => Number(v) || 0
const round = v => Math.round(v * 100) / 100

const KEYS = ['planned', 'plannedToday', 'original', 'worked', 'cost']
export function rowFigures (row) {
  return {
    planned: num(row.estimated_hours),
    plannedToday: num(row.estimated_hours_today),
    original: num(row.original_estimated_hours),
    worked: num(row.hours),
    cost: num(row.real_cost)
  }
}
const empty = () => Object.fromEntries(KEYS.map(k => [k, 0]))
const add = (acc, row) => {
  const f = rowFigures(row)
  KEYS.forEach(k => { acc[k] += f[k] })
  return acc
}
const rounded = t => ({ ...t, ...Object.fromEntries(KEYS.map(k => [k, round(t[k])])) })

export function totals (rows) {
  const t = rounded(rows.reduce(add, empty()))
  // worked against what was planned up to today
  return { ...t, deviation: round(t.worked - t.plannedToday) }
}

// per month of one year (all twelve) or per year, with both accumulated
export function byPeriod (rows, { byYear = false } = {}) {
  const groups = new Map()
  if (!byYear) MONTHS.forEach((label, i) => groups.set(String(i + 1).padStart(2, '0'), { key: String(i + 1).padStart(2, '0'), label, ...empty() }))
  for (const r of rows) {
    const key = byYear ? String(r.year) : String(r.month).padStart(2, '0')
    if (!key || key === '0' || key === '00') continue
    if (!groups.has(key)) groups.set(key, { key, label: key, ...empty() })
    add(groups.get(key), r)
  }
  let planned = 0
  let worked = 0
  return [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(g => {
      planned += g.planned
      worked += g.worked
      return { ...rounded(g), plannedAccumulated: round(planned), workedAccumulated: round(worked) }
    })
}

// grouped by a field (username, project_name), most hours first; `over` past the plan
export function byGroup (rows, field, limit = 10) {
  const groups = new Map()
  for (const r of rows) {
    const key = r[field] && r[field] !== '-' ? r[field] : 'Sense assignar'
    if (!groups.has(key)) groups.set(key, { label: key, ...empty() })
    add(groups.get(key), r)
  }
  return [...groups.values()]
    .map(rounded)
    .filter(g => g.planned || g.worked)
    .sort((a, b) => Math.max(b.planned, b.worked) - Math.max(a.planned, a.worked))
    .slice(0, limit)
    .map(g => ({ ...g, over: g.planned > 0 && g.worked > g.planned }))
}

// the worked hours split by a field (dedication_type, activity_type) with each one's
// share; past `limit`, «Altres». Rows without a value are «Sense assignar».
export function workedShare (rows, field, limit = 6) {
  const groups = new Map()
  let total = 0
  for (const r of rows) {
    const h = num(r.hours)
    if (!h) continue
    const key = r[field] && r[field] !== '-' ? r[field] : 'Sense assignar'
    groups.set(key, (groups.get(key) || 0) + h)
    total += h
  }
  const sorted = [...groups.entries()].map(([label, worked]) => ({ label, worked })).sort((a, b) => b.worked - a.worked)
  const list = sorted.length <= limit
    ? sorted
    : [...sorted.slice(0, limit - 1), { label: 'Altres', worked: sorted.slice(limit - 1).reduce((s, g) => s + g.worked, 0) }]
  return list.map(g => ({ label: g.label, worked: round(g.worked), share: total ? g.worked / total : 0 }))
}
