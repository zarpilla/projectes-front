// IVA and IRPF pages (issues/418, issues/419): one layout for both. A year,
// one or several quarters, the documents settled («Salda») or pending, and
// the sum of the documents ticked to settle, whatever the filter shows.

const round2 = v => Math.round((Number(v) || 0) * 100) / 100

export const QUARTERS = [1, 2, 3, 4]

export const STATUS_FILTERS = [
  { id: null, label: 'Tots' },
  { id: 'pending', label: 'Pendents de saldar' },
  { id: 'settled', label: 'Saldats' }
]

// «?trimestre=3» or «?trimestre=3,4» → [3] / [3, 4]; anything else → []
export function quartersFromQuery (value) {
  const list = String(value == null ? '' : value).split(',').map(Number)
  return [...new Set(list.filter(q => QUARTERS.includes(q)))].sort()
}

export const quartersToQuery = quarters => (quarters && quarters.length ? [...quarters].sort().join(',') : undefined)

// clicking a quarter adds it or takes it out
export function toggleQuarter (quarters, quarter) {
  const list = quarters || []
  return list.includes(quarter) ? list.filter(q => q !== quarter) : [...list, quarter].sort()
}

// «T3», «T1 i T2», «T1, T2 i T4»
export function quartersLabel (quarters) {
  const names = (quarters || []).map(q => `T${q}`)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`
}

// rows of the selected quarters (none = all) and settled state
export function filterByQuartersAndStatus (rows, { quarters = [], status = null } = {}) {
  return (rows || []).filter(r =>
    (!quarters.length || quarters.includes(r.quarter)) &&
    (!status || (status === 'settled' ? isSettled(r) : !isSettled(r)))
  )
}

// IRPF rows say `paid`, VAT rows `settled`
export const isSettled = row => !!(row.settled || row.paid)

// only pending documents can be ticked
export const isCheckable = row => !isSettled(row)

export const sameRow = (a, b) => !!a && !!b && a.key === b.key

// the documents ticked, each kind to its list, for POST treasuries/irpf/settle
// or emitted-invoices/pay-vat-ids
const KIND_KEYS = {
  'emitted-invoices': 'emittedInvoices',
  'received-incomes': 'receivedIncomes',
  'received-invoices': 'receivedInvoices',
  'received-expenses': 'receivedExpenses',
  payrolls: 'payrolls'
}

export function settlePayload (rows, kinds) {
  const payload = {}
  for (const kind of kinds) payload[KIND_KEYS[kind]] = []
  for (const row of rows || []) {
    if (isSettled(row)) continue
    const key = KIND_KEYS[row.kind]
    if (payload[key]) payload[key].push(row.id)
  }
  return payload
}

export const IRPF_KINDS = ['received-invoices', 'received-expenses', 'payrolls']
export const VAT_KINDS = ['emitted-invoices', 'received-incomes', 'received-invoices', 'received-expenses']

// IRPF: how many and how much
export function irpfTotals (rows) {
  return {
    count: (rows || []).length,
    base: round2((rows || []).reduce((s, r) => s + (r.base || 0), 0)),
    irpf: round2((rows || []).reduce((s, r) => s + (r.irpf || 0), 0))
  }
}

// VAT: charged, supported, the deductible part and the balance (negative = to pay)
export function vatTotals (rows) {
  const list = rows || []
  const sum = (filter, field) => round2(list.filter(filter).reduce((s, r) => s + (r[field] || 0), 0))
  return {
    count: list.length,
    received: sum(r => !r.supported, 'vat'),
    paid: sum(r => r.supported, 'vat'),
    deductible_paid: sum(r => r.supported, 'deductible'),
    balance: sum(() => true, 'balance')
  }
}

// IVA: who it comes from
export const VAT_SIDE_FILTERS = [
  { id: null, label: 'Tot' },
  { id: 'charged', label: 'Repercutit' },
  { id: 'supported', label: 'Suportat' }
]

export const filterVatSide = (rows, side) =>
  (rows || []).filter(r => !side || (side === 'supported' ? r.supported : !r.supported))

export const VAT_KIND_LABELS = {
  'emitted-invoices': 'Factura emesa',
  'received-incomes': 'Ingrés rebut',
  'received-invoices': 'Factura rebuda',
  'received-expenses': 'Despesa rebuda'
}

export function vatKindLabel (row) {
  const label = VAT_KIND_LABELS[row.kind] || row.kind
  return row.document_type ? `${label} (${row.document_type})` : label
}

export const QUARTER_STATUS = {
  settled: { label: 'Saldat', tag: 'is-success' },
  partial: { label: 'Parcial', tag: 'is-info' },
  pending: { label: 'Pendent', tag: 'is-warning' }
}
