// Figures of the charts of Informes › Projectes, from the rows of its pivot (one per
// project, built in ProjectesPivot from projects/with-activities). The amounts are the
// pivot's measures: «Resultat previst» = incomes_expenses, «Resultat real» =
// total_real_incomes_expenses, «Ingressos previstos/reals», «Hores previstes/reals».

const num = v => Number(v) || 0
const round = v => Math.round(v * 100) / 100

export function projectFigures (row) {
  return {
    label: row.project_name || '-',
    incomePlanned: num(row.incomes),
    incomeReal: num(row.total_real_incomes),
    resultPlanned: num(row.incomes_expenses),
    resultReal: num(row.total_real_incomes_expenses),
    hoursPlanned: num(row.total_estimated_hours),
    hoursReal: num(row.hours)
  }
}

const KEYS = ['incomePlanned', 'incomeReal', 'resultPlanned', 'resultReal', 'hoursPlanned', 'hoursReal']
const sum = (rows) => {
  const t = Object.fromEntries(KEYS.map(k => [k, 0]))
  for (const r of rows) {
    const f = projectFigures(r)
    KEYS.forEach(k => { t[k] += f[k] })
  }
  KEYS.forEach(k => { t[k] = round(t[k]) })
  return t
}

export function totals (rows) {
  return { projects: rows.length, ...sum(rows) }
}

// the projects whose forecast or real result weighs most, best real result first
export function byResult (rows, limit = 12) {
  return rows
    .map(projectFigures)
    .filter(p => p.resultPlanned || p.resultReal)
    .sort((a, b) => Math.max(Math.abs(b.resultPlanned), Math.abs(b.resultReal)) - Math.max(Math.abs(a.resultPlanned), Math.abs(a.resultReal)))
    .slice(0, limit)
    .sort((a, b) => b.resultReal - a.resultReal)
}

// the projects with most hours, worked or planned; `over` when the worked ones pass the plan
export function byHours (rows, limit = 10) {
  return rows
    .map(projectFigures)
    .filter(p => p.hoursPlanned || p.hoursReal)
    .sort((a, b) => Math.max(b.hoursPlanned, b.hoursReal) - Math.max(a.hoursPlanned, a.hoursReal))
    .slice(0, limit)
    .map(p => ({ ...p, over: p.hoursPlanned > 0 && p.hoursReal > p.hoursPlanned }))
}

// grouped by a field of the rows (project_scope, project_leader…), largest first
export function byGroup (rows, field) {
  const groups = new Map()
  for (const r of rows) {
    const key = r[field] && r[field] !== '-' ? r[field] : 'Sense'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  return [...groups.entries()]
    .map(([label, list]) => ({ label, projects: list.length, ...sum(list) }))
    .sort((a, b) => Math.max(Math.abs(b.resultPlanned), Math.abs(b.resultReal)) - Math.max(Math.abs(a.resultPlanned), Math.abs(a.resultReal)))
}
