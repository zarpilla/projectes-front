// A document's change history (issues/161): emitted and received invoices,
// received incomes and expenses, quotes, as GET
// /document-change-logs/history/:entity/:id returns it (the backend's change
// log). One row per create, save that changed something, delete, email sent,
// VeriFactu or FACe status, with each changed field's old and new value.
import moment from 'moment'
import { formatNumber, formatMoney } from '@/helpers/format-number'

const INCOME = new Set(['emitted-invoice', 'received-income', 'quote'])

export const isIncomeEntity = entity => INCOME.has(entity)

/** The field labels of one kind of document. */
export function fieldLabels (entity) {
  const income = isIncomeEntity(entity)
  return {
    number: 'Número',
    code: 'Codi',
    serial: 'Sèrie',
    state: 'Estat',
    emitted: 'Data',
    paybefore: 'Venciment',
    contact: income ? 'Client' : 'Proveïdor',
    contact_info: income ? 'Dades del client' : 'Dades del proveïdor',
    lines: 'Línies',
    total_base: 'Base imposable',
    total_vat: 'IVA',
    total_irpf: 'IRPF',
    total: 'Total',
    comments: 'Comentaris',
    comments_internal: 'Notes internes',
    paid: income ? 'Cobrada' : 'Pagada',
    paid_date: income ? 'Data de cobrament' : 'Data de pagament',
    estimated_payment: 'Previsió de cobrament',
    sent: 'Enviada',
    sent_date: "Data d'enviament",
    accepted: 'Acceptat',
    accepted_date: "Data d'acceptació",
    proforma: 'Proforma',
    updatable: 'Modificable',
    documents: 'Adjunts',
    payment_method: income ? 'Mètode de cobrament' : 'Mètode de pagament',
    bank_account: 'Compte bancari',
    contact_invoice_number: 'Núm. de factura del proveïdor',
    document_type: 'Tipus de document',
    document_concept: 'Concepte intern',
    concept: 'Concepte a la factura',
    project: 'Projecte',
    projects: 'Projectes',
    vat_paid_date: 'IVA liquidat',
    deductible_vat_pct: '% IVA deduïble',
    user_draft: 'Creada per',
    user_real: 'Emesa per',
    verifactu: 'VeriFactu',
    face: 'FACe',
    rectified_invoice: 'Rectifica la factura',
    rectification_reason_code: 'Codi de rectificació',
    rectification_reason: 'Motiu de la rectificació',
    rectification_method_code: 'Mètode de rectificació',
    status: 'Estat'
  }
}

export const LINE_LABELS = {
  concept: 'Concepte',
  base: 'Preu',
  quantity: 'Quantitat',
  discount: 'Descompte',
  vat: 'IVA',
  irpf: 'IRPF',
  comments: 'Comentaris',
  product: 'Producte',
  expense_type: 'Tipus de despesa',
  units: 'Unitats',
  kilograms: 'Quilos'
}

export const STATE_LABELS = { draft: 'Esborrany', real: 'Emesa' }

export const VERIFACTU_LABELS = {
  pending: 'Pendent',
  ok: 'Acceptada',
  okwitherrors: 'Acceptada amb errors',
  ko: 'Rebutjada'
}

export const FACE_LABELS = {
  pending: 'Pendent',
  registered: 'Registrada',
  delivered: 'Lliurada',
  rejected: 'Rebutjada',
  error: 'Error'
}

const MONEY = new Set(['total_base', 'total_vat', 'total_irpf', 'total', 'base'])
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

const isEmpty = value =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

const count = (n, one, many) => `${formatNumber(n, 0)} ${n === 1 ? one : many}`

/** A changed value as people read it. */
export function formatValue (field, value) {
  if (isEmpty(value)) return '—'
  if (field === 'state' && STATE_LABELS[value]) return STATE_LABELS[value]
  // an old row (before issues/161) kept the whole lists
  if (field === 'lines' && Array.isArray(value)) return count(value.length, 'línia', 'línies')
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(v => formatValue(field, v)).join(', ')
  if (typeof value === 'object') return value.label || `#${value.id}`
  if (MONEY.has(field)) return formatMoney(Number(value))
  if (typeof value === 'string' && DATE.test(value)) return moment(value).format('DD/MM/YYYY')
  if (typeof value === 'string' && DATETIME.test(value)) return moment(value).format('DD/MM/YYYY HH:mm')
  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(value))) {
    return formatNumber(Number(value), 2)
  }
  return String(value)
}

const lineName = row => (row && row.concept ? `«${row.concept}»` : '')

/**
 * A line-by-line change ({ from: count, to: count, lines: { added, removed,
 * changed, counts? } }) as a summary and one text per line.
 */
export function linesChange (change) {
  const { added = [], removed = [], changed = [], counts } = change.lines || {}
  const n = counts || { added: added.length, removed: removed.length, changed: changed.length }
  const parts = []
  if (n.changed) parts.push(count(n.changed, 'modificada', 'modificades'))
  if (n.added) parts.push(count(n.added, 'afegida', 'afegides'))
  if (n.removed) parts.push(count(n.removed, 'treta', 'tretes'))
  const total = change.from === change.to
    ? count(change.to, 'línia', 'línies')
    : `${formatNumber(change.from, 0)} → ${count(change.to, 'línia', 'línies')}`
  const details = [
    ...changed.map(c => `Línia ${c.index}: ` + (c.changes || [])
      .map(f => `${LINE_LABELS[f.field] || f.field} ${formatValue(f.field, f.from)} → ${formatValue(f.field, f.to)}`)
      .join(', ')),
    ...added.map(a => `Afegida la línia ${a.index} ${lineName(a.row)}`.trim()),
    ...removed.map(r => `Treta la línia ${r.index} ${lineName(r.row)}`.trim())
  ]
  const shown = changed.length + added.length + removed.length
  const hidden = n.changed + n.added + n.removed - shown
  return {
    summary: parts.length ? `${total} · ${parts.join(', ')}` : total,
    details,
    hidden: hidden > 0 ? hidden : 0
  }
}

/** One change of an entry, ready to show. */
export function changeView (entity, change) {
  const labels = fieldLabels(entity)
  const label = labels[change.field] || change.field
  if (change.lines) {
    const { summary, details, hidden } = linesChange(change)
    return { field: change.field, label, summary, details, hidden }
  }
  return {
    field: change.field,
    label,
    from: formatValue(change.field, change.from),
    to: formatValue(change.field, change.to)
  }
}

const when = row => (row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY HH:mm') : '')
const who = row => row.username || 'Sistema'

function eventTitle (row) {
  const change = (row.changes || [])[0] || {}
  if (row.action === 'email') return `Enviada per correu${row.details && row.details.to ? ` a ${row.details.to}` : ''}`
  if (row.action === 'verifactu') return `VeriFactu: ${VERIFACTU_LABELS[change.to] || change.to || '—'}`
  if (row.action === 'face') return `FACe: ${FACE_LABELS[change.to] || change.to || '—'}`
  return { create: 'Creació', update: 'Modificació', delete: 'Eliminació' }[row.action] || row.action
}

/** The history rows ready for the form, newest first as they come. */
export function historyEntries (entity, rows) {
  return (rows || []).map(row => {
    const event = ['email', 'verifactu', 'face'].includes(row.action)
    const extra = []
    if (row.action === 'verifactu' && row.details && row.details.mode) extra.push(`Mode ${row.details.mode}`)
    if (row.action === 'face' && row.details && row.details.registration_number) {
      extra.push(`Registre ${row.details.registration_number}`)
    }
    if (row.action === 'create' && row.snapshot) {
      if (row.snapshot.state) extra.push(`Estat: ${formatValue('state', row.snapshot.state)}`)
      if (row.snapshot.total !== undefined) extra.push(`Total: ${formatValue('total', row.snapshot.total)}`)
      if (typeof row.snapshot.lines === 'number') extra.push(count(row.snapshot.lines, 'línia', 'línies'))
    }
    return {
      id: row.id,
      action: row.action,
      title: eventTitle(row),
      when: when(row),
      who: who(row),
      detail: extra.join(' · '),
      // an event's own status change is already its title
      changes: (row.changes || [])
        .filter(c => !(event && (c.field === 'state' || c.field === 'status')))
        .map(c => changeView(entity, c))
    }
  })
}

const changeOf = (row, field) => (row.changes || []).find(c => c.field === field)
const turnedOn = c => c && !isEmpty(c.to) && c.to !== false
const turnedOff = c => c && (isEmpty(c.to) || c.to === false) && !isEmpty(c.from) && c.from !== false

/**
 * The statuses the document went through, oldest first (issues/161: all of
 * them): created, issued, sent, paid, VAT settled, accepted, rectified,
 * VeriFactu, FACe, deleted. `rectifiedBy`: the invoices that rectify it.
 */
export function timeline (entity, rows, rectifiedBy = []) {
  const income = isIncomeEntity(entity)
  const paidLabel = income ? 'Cobrada' : 'Pagada'
  const steps = []
  const push = (row, label, at = row.createdAt) => steps.push({ at, label, who: who(row) })

  // the rows come newest first
  for (const row of [...(rows || [])].reverse()) {
    if (row.action === 'create') {
      const state = row.snapshot && row.snapshot.state
      push(row, state ? `Creada · ${formatValue('state', state)}` : 'Creada')
      if (row.snapshot && row.snapshot.rectified_invoice) {
        push(row, `Rectifica ${formatValue('rectified_invoice', row.snapshot.rectified_invoice)}`)
      }
      continue
    }
    if (row.action === 'delete') { push(row, 'Eliminada'); continue }
    if (['email', 'verifactu', 'face'].includes(row.action)) { push(row, eventTitle(row)); continue }

    const state = changeOf(row, 'state')
    if (state && state.to) push(row, formatValue('state', state.to))
    const sent = changeOf(row, 'sent')
    if (turnedOn(sent)) push(row, 'Marcada com a enviada')
    else if (turnedOff(sent)) push(row, 'Desmarcada com a enviada')
    const paid = changeOf(row, 'paid')
    const paidDate = changeOf(row, 'paid_date')
    if (turnedOn(paid) || (!paid && paidDate && isEmpty(paidDate.from) && !isEmpty(paidDate.to))) {
      push(row, paidDate && !isEmpty(paidDate.to) ? `${paidLabel} el ${formatValue('paid_date', paidDate.to)}` : paidLabel)
    } else if (turnedOff(paid) || (!paid && paidDate && isEmpty(paidDate.to) && !isEmpty(paidDate.from))) {
      push(row, `Ja no consta com a ${paidLabel.toLowerCase()}`)
    }
    const vat = changeOf(row, 'vat_paid_date')
    if (turnedOn(vat)) push(row, 'IVA liquidat')
    else if (turnedOff(vat)) push(row, 'IVA desliquidat')
    const accepted = changeOf(row, 'accepted')
    if (turnedOn(accepted)) push(row, 'Acceptat')
    else if (turnedOff(accepted)) push(row, 'Ja no consta com a acceptat')
    const rectifies = changeOf(row, 'rectified_invoice')
    if (turnedOn(rectifies)) push(row, `Rectifica ${formatValue('rectified_invoice', rectifies.to)}`)
  }
  for (const r of rectifiedBy || []) {
    steps.push({ at: r.createdAt, label: `Rectificada per ${r.code || `#${r.id}`}`, who: '' })
  }

  return steps
    .map((s, i) => ({ ...s, i }))
    .sort((a, b) => (moment(a.at).valueOf() - moment(b.at).valueOf()) || (a.i - b.i))
    .map(({ at, label, who: author }) => ({ when: at ? moment(at).format('DD/MM/YYYY HH:mm') : '', label, who: author }))
}
