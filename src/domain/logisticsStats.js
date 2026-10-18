// Figures of the charts of Informes › Comandes and Informes › Incidències, from the
// rows of orders/infoall and incidences/infoall (the same rows as their pivots).

const MONTHS = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des']
const num = v => Number(v) || 0
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d
const pad = v => String(v).padStart(2, '0')

// what an order adds up: one order, its amount (the pivot's discounted price), kilos, packages
export const ORDER_MEASURES = {
  count: { label: 'Comandes', value: () => 1 },
  amount: { label: 'Import', value: r => num(r.price) },
  kilograms: { label: 'Quilos', value: r => num(r.kilograms) }
}

export const isRefrigerated = r => r.delivery_type === 'Refrigerada'

export function orderTotals (rows) {
  const t = { count: 0, amount: 0, kilograms: 0, units: 0, refrigerated: 0, lastmile: 0 }
  const owners = new Set()
  for (const r of rows) {
    t.count++
    t.amount += num(r.price)
    t.kilograms += num(r.kilograms)
    t.units += num(r.units)
    if (isRefrigerated(r)) t.refrigerated++
    if (r.lastmile === 'Sí') t.lastmile++
    owners.add(r.owner)
  }
  return {
    ...t,
    amount: round(t.amount),
    kilograms: round(t.kilograms, 1),
    owners: owners.size,
    averageAmount: t.count ? round(t.amount / t.count) : 0
  }
}

// How the rows split in time, from the filters: one month of a year → its days, one
// year → its twelve months, one month of every year → the years, everything → year-months
export function periodMode (year, month) {
  const allYears = !year || year === 'Tots'
  const allMonths = !month || month === 'Tots'
  if (!allYears && !allMonths) return 'day'
  if (!allYears) return 'month'
  if (!allMonths) return 'year'
  return 'yearmonth'
}

// the period key of a row's date (YYYY-MM-DD)
const keyOf = (date, mode) => {
  const d = String(date || '').slice(0, 10)
  if (mode === 'day') return d.slice(8, 10)
  if (mode === 'month') return d.slice(5, 7)
  if (mode === 'year') return d.slice(0, 4)
  return d.slice(0, 7)
}

const labelOf = (key, mode) => {
  if (mode === 'day') return String(Number(key))
  if (mode === 'month') return MONTHS[Number(key) - 1] || key
  if (mode === 'year') return key
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1] || m} ${y.slice(2)}`
}

// the empty periods the axis keeps: every day of the month, every month of the year,
// every month between the first and the last year-month with rows
const skeleton = (mode, { year, month, keys }) => {
  if (mode === 'day' && year && month) {
    const days = new Date(Number(year), Number(month), 0).getDate()
    return Array.from({ length: days }, (_, i) => pad(i + 1))
  }
  if (mode === 'month') return MONTHS.map((_, i) => pad(i + 1))
  if (mode === 'yearmonth' && keys.length) {
    const sorted = [...keys].sort()
    const out = []
    let [y, m] = sorted[0].split('-').map(Number)
    const [ly, lm] = sorted[sorted.length - 1].split('-').map(Number)
    while (y < ly || (y === ly && m <= lm)) {
      out.push(`${y}-${pad(m)}`)
      if (++m > 12) { m = 1; y++ }
    }
    return out
  }
  return []
}

// rows into periods; `split` puts each row in one of the named series, `value` is
// what it adds (1 per row by default)
export function byPeriod (rows, { mode, year, month, dateOf, split, series, value = () => 1 }) {
  const keys = rows.map(r => keyOf(dateOf(r), mode)).filter(Boolean)
  const groups = new Map()
  const blank = key => ({ key, label: labelOf(key, mode), total: 0, ...Object.fromEntries(series.map(s => [s, 0])) })
  skeleton(mode, { year, month, keys }).forEach(k => groups.set(k, blank(k)))
  rows.forEach(r => {
    const key = keyOf(dateOf(r), mode)
    if (!key) return
    if (!groups.has(key)) groups.set(key, blank(key))
    const g = groups.get(key)
    const v = value(r)
    g[split(r)] += v
    g.total += v
  })
  return [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(g => ({ ...g, total: round(g.total), ...Object.fromEntries(series.map(s => [s, round(g[s])])) }))
}

export const orderPeriods = (rows, { mode, year, month, measure = 'count' }) =>
  byPeriod(rows, {
    mode,
    year,
    month,
    dateOf: r => r.date,
    split: r => (isRefrigerated(r) ? 'refrigerated' : 'normal'),
    series: ['normal', 'refrigerated'],
    value: ORDER_MEASURES[measure].value
  })

// the largest groups of a field, the rest folded into «Altres» (kept last)
export function topGroups (rows, field, { limit = 10, value = () => 1, missing = '-' } = {}) {
  const groups = new Map()
  for (const r of rows) {
    // infoall writes «-» for an order without route, rate, pickup…
    const label = [undefined, null, '', '-'].includes(r[field]) ? missing : String(r[field])
    groups.set(label, (groups.get(label) || 0) + value(r))
  }
  const sorted = [...groups.entries()].map(([label, v]) => ({ label, value: round(v) })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
  if (sorted.length <= limit) return sorted
  const top = sorted.slice(0, limit - 1)
  const rest = sorted.slice(limit - 1)
  return [...top, { label: `Altres (${rest.length})`, value: round(rest.reduce((s, g) => s + g.value, 0)), other: true }]
}

// --- incidences

export const isOpen = r => r.state_raw === 'open'

const days = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5)

// days from opening to closing of the closed incidences
export const resolutionDays = rows => rows
  .filter(r => !isOpen(r) && r.created_at && r.closed_date)
  .map(r => Math.max(0, days(r.created_at, r.closed_date)))

const median = list => {
  if (!list.length) return null
  const s = [...list].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// `routeOrders`: the orders of the same period per route, [{ route, count }] from
// orders/infoall?_group=route, for the rate (null while not loaded)
export const orderCount = routeOrders => routeOrders.reduce((s, r) => s + num(r.count), 0)

export function incidenceTotals (rows, routeOrders = null) {
  const open = rows.filter(isOpen).length
  const solved = resolutionDays(rows)
  const affected = new Set(rows.map(r => r.order_id).filter(Boolean)).size
  const orders = routeOrders ? orderCount(routeOrders) : null
  return {
    count: rows.length,
    open,
    closed: rows.length - open,
    medianDays: median(solved),
    sameDayOrNext: solved.filter(d => d <= 1).length,
    solved: solved.length,
    affected,
    orders,
    // incidences per 100 orders
    rate: orders ? round(rows.length / orders * 100) : null
  }
}

export const incidencePeriods = (rows, { mode, year, month }) =>
  byPeriod(rows, {
    mode,
    year,
    month,
    dateOf: r => r.created_at,
    split: r => (isOpen(r) ? 'open' : 'closed'),
    series: ['open', 'closed']
  })

export const RESOLUTION_BUCKETS = [
  { label: 'El mateix dia', max: 0 },
  { label: "L'endemà", max: 1 },
  { label: '2-3 dies', max: 3 },
  { label: '4-7 dies', max: 7 },
  { label: 'Més d\'una setmana', max: Infinity }
]

export function resolutionBuckets (rows) {
  const out = RESOLUTION_BUCKETS.map(b => ({ label: b.label, value: 0 }))
  for (const d of resolutionDays(rows)) out[RESOLUTION_BUCKETS.findIndex(b => d <= b.max)].value++
  return out
}

// the routes with the most incidences per 100 orders (routes with no orders in the
// period are left out: no rate to give)
export function routeRates (incidences, routeOrders, limit = 10) {
  const ordersBy = new Map(routeOrders.map(r => [r.route, num(r.count)]))
  const incBy = new Map()
  for (const i of incidences) incBy.set(i.route_name, (incBy.get(i.route_name) || 0) + 1)
  return [...incBy.entries()]
    .filter(([route]) => ordersBy.get(route))
    .map(([route, count]) => ({ label: route, count, orders: ordersBy.get(route), value: round(count / ordersBy.get(route) * 100) }))
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, limit)
}
