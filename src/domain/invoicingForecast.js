// Informes › Previsió facturació: the planned incomes of the projects that still
// have no invoice (rows of GET /treasuries/invoicing-forecast), grouped by month.
// Dates are "YYYY-MM-DD" strings; a row's date is its "Previsió fac.", else its
// payment date (the backend picks it), and rows without either go to «Sense data».

const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']

const cents = v => Math.round(v * 100) / 100

export const sumOf = (rows, key = 'base') => cents(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0))

export const ymOf = date => (date ? date.slice(0, 7) : null)

export const addMonths = (ym, n) => {
  const [y, m] = ym.split('-').map(Number)
  const k = y * 12 + (m - 1) + n
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`
}

export const monthName = ym => {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export const monthShort = ym => MONTHS_SHORT[Number(ym.slice(5, 7)) - 1]

export const formatDate = date => (date ? date.split('-').reverse().join('/') : '')

// grants are registered as received incomes, not invoiced: the report leaves them out
export const isGrant = row => /subvenci/i.test(row.income_type_name || '')

export const filterRows = (rows, { states = null, leaderId = null } = {}) =>
  (rows || []).filter(r =>
    !isGrant(r) &&
    (states === null || states.includes(r.state_id)) &&
    (leaderId === null || r.leader_id === leaderId)
  )

// horizon: how many months from the current one on (1 = only the current month)
export function sections (rows, today, horizon) {
  const now = ymOf(today)
  const last = addMonths(now, horizon - 1)
  const out = { overdue: [], months: [], later: [], noDate: [] }
  const byMonth = {}
  for (let i = 0; i < horizon; i++) {
    const ym = addMonths(now, i)
    byMonth[ym] = { ym, rows: [] }
    out.months.push(byMonth[ym])
  }
  for (const r of rows) {
    if (!r.date) out.noDate.push(r)
    else if (r.date < today) out.overdue.push(r)
    else if (ymOf(r.date) > last) out.later.push(r)
    else byMonth[ymOf(r.date)].rows.push(r)
  }
  return out
}

// one line per project: what a single invoice would gather
export function byProject (rows) {
  const groups = new Map()
  for (const r of rows) {
    let g = groups.get(r.project_id)
    if (!g) {
      g = { project_id: r.project_id, project_name: r.project_name, leader_name: r.leader_name, clients: [], lines: 0, base: 0, total: 0, first: null, last: null, fromPayment: 0 }
      groups.set(r.project_id, g)
    }
    g.lines++
    g.base += Number(r.base) || 0
    g.total += Number(r.total) || 0
    if (r.client_name && !g.clients.includes(r.client_name)) g.clients.push(r.client_name)
    if (r.date && (!g.first || r.date < g.first)) g.first = r.date
    if (r.date && (!g.last || r.date > g.last)) g.last = r.date
    if (r.date_source === 'payment') g.fromPayment++
  }
  return [...groups.values()]
    .map(g => ({ ...g, base: cents(g.base), total: cents(g.total) }))
    .sort((a, b) => (a.first || '9999').localeCompare(b.first || '9999') || a.project_name.localeCompare(b.project_name))
}

export function byLeader (rows) {
  const groups = new Map()
  for (const r of rows) {
    const key = r.leader_name || '—'
    const g = groups.get(key) || { name: key, projects: new Set(), base: 0 }
    g.projects.add(r.project_id)
    g.base += Number(r.base) || 0
    groups.set(key, g)
  }
  return [...groups.values()]
    .map(g => ({ name: g.name, projects: g.projects.size, base: cents(g.base) }))
    .sort((a, b) => b.base - a.base)
}

// per month, from `back` months ago to the end of the horizon: what was invoiced,
// what was planned for a past date and has no invoice yet, and what is planned
export function monthlyChart (rows, invoicedByMonth, today, horizon, back = 5) {
  const now = ymOf(today)
  const first = addMonths(now, -back)
  const last = addMonths(now, horizon - 1)
  const months = []
  for (let ym = first; ym <= last; ym = addMonths(ym, 1)) {
    months.push({ ym, invoiced: cents((invoicedByMonth || {})[ym] || 0), late: 0, planned: 0 })
  }
  const at = Object.fromEntries(months.map(m => [m.ym, m]))
  let before = 0
  for (const r of rows) {
    if (!r.date) continue
    const ym = ymOf(r.date)
    const base = Number(r.base) || 0
    if (ym < first) {
      if (r.date < today) before += base
    } else if (at[ym]) {
      if (r.date < today) at[ym].late += base
      else at[ym].planned += base
    }
  }
  months.forEach(m => { m.late = cents(m.late); m.planned = cents(m.planned) })
  return { before: cents(before), months }
}

// how long ago a planned invoice date passed, and how much it matters
export function lateness (date, today) {
  const days = Math.round((Date.parse(today) - Date.parse(date)) / 86400000)
  let text
  if (days >= 365) text = `fa ${Math.floor(days / 365)} ${days >= 730 ? 'anys' : 'any'}`
  else if (days >= 60) text = `fa ${Math.floor(days / 30)} mesos`
  else text = `fa ${days} ${days === 1 ? 'dia' : 'dies'}`
  return { days, text, level: days > 90 ? 'bad' : 'warn' }
}

// closed projects whose planned incomes never got a document: data to clean up
export function closedPending (rows, closedStateIds) {
  const pending = (rows || []).filter(r => !isGrant(r) && closedStateIds.includes(r.state_id))
  return { projects: new Set(pending.map(r => r.project_id)).size, lines: pending.length, base: sumOf(pending) }
}
