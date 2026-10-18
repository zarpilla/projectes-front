// An order's change history (issues/119), as GET /orders/:id/history returns
// it (the backend's change log): one row per create, save that changed
// something, invoicing or delete, with each changed field's old and new value.
import moment from 'moment'
import { orderStatusLabel } from '@/domain/orderStatus'
import { formatNumber, formatMoney } from '@/helpers/format-number'
import { linesChange } from '@/domain/documentHistory'

export const FIELD_LABELS = {
  status: 'Estat',
  owner: 'Sòcia',
  product: 'Producte',
  route: 'Ruta',
  route_date: 'Data de ruta',
  route_rate: 'Tarifa',
  delivery_type: 'Tipus de lliurament',
  pickup: 'Punt de recollida',
  contact: "Punt d'entrega",
  contact_name: 'Nom del contacte',
  contact_trade_name: 'Nom comercial',
  contact_nif: 'NIF del contacte',
  contact_legal_form: 'Forma jurídica',
  contact_address: 'Adreça',
  contact_postcode: 'Codi postal',
  contact_city: 'Població',
  contact_phone: 'Telèfon',
  contact_notes: 'Notes del contacte',
  contact_time_slot_1_ini: 'Franja 1, inici',
  contact_time_slot_1_end: 'Franja 1, fi',
  contact_time_slot_2_ini: 'Franja 2, inici',
  contact_time_slot_2_end: 'Franja 2, fi',
  contact_pickup_discount: 'Descompte de recollida',
  units: 'Unitats',
  kilograms: 'Quilos',
  lines: 'Línies',
  comments: 'Comentaris',
  refrigerated: 'Refrigerat',
  fragile: 'Fràgil',
  last_mile: 'Última milla',
  pickup_point: 'Punt de consum',
  picked_up: 'Recollida',
  price: 'Preu',
  multidelivery_discount: 'Descompte multientrega',
  volume_discount: 'Descompte per volum',
  provider_order_number: 'Núm. de comanda de la sòcia',
  estimated_delivery_date: 'Data prevista de lliurament',
  delivery_date: 'Data de lliurament',
  emitted_invoice: 'Factura',
  emitted_invoice_datetime: 'Data de facturació',
  deposit_date: 'Dipòsit',
  deposit_user: 'Dipositada per',
  pickup_date: 'Recollida (càrrega)',
  pickup_user: 'Recollida per',
  collection_point: 'Punt de recollida agrupada',
  collection_order: 'Comanda de recollida',
  collection_orders: 'Comandes a recollir',
  is_collection_order: 'Comanda de recollida',
  collection_pickup_route: 'Ruta de recollida',
  collection_pickup_date: 'Data de recollida',
  transfer: 'Transferència',
  transfer_route: 'Ruta de transferència',
  transfer_route_date: 'Data de transferència',
  transfer_start_date: 'Inici de transferència',
  transfer_start_user: 'Transferència iniciada per',
  transfer_end_date: 'Fi de transferència',
  transfer_end_user: 'Transferència finalitzada per',
  transfer_pickup_origin: 'Origen de la transferència',
  transfer_pickup_destination: 'Destí de la transferència'
}

const MONEY = new Set(['price', 'multidelivery_discount', 'volume_discount', 'contact_pickup_discount'])
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

const ACTIONS = { create: 'Creada', update: 'Modificada', delete: 'Esborrada' }

export const fieldLabel = field => FIELD_LABELS[field] || field

const isEmpty = value =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

function linesText (lines) {
  const units = lines.reduce((sum, l) => sum + (Number(l && l.units) || 0), 0)
  const kilograms = lines.reduce((sum, l) => sum + (Number(l && l.kilograms) || 0), 0)
  const count = `${lines.length} ${lines.length === 1 ? 'línia' : 'línies'}`
  return `${count} · ${formatNumber(units, 0)} u. · ${formatNumber(kilograms, 2)} kg`
}

/** A changed value as the office reads it. */
export function formatValue (field, value) {
  if (isEmpty(value)) return '—'
  if (field === 'status') return orderStatusLabel(value)
  if (field === 'lines' && Array.isArray(value)) return linesText(value)
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

/** The history rows ready for the order form, newest first as they come. */
export function historyEntries (rows) {
  return (rows || []).map(row => ({
    id: row.id,
    action: row.action,
    title: ACTIONS[row.action] || row.action,
    when: row.createdAt ? moment(row.createdAt).format('DD/MM/YYYY HH:mm') : '',
    who: row.username || 'Sistema',
    detail: row.action === 'create' && row.snapshot && row.snapshot.status
      ? `Estat: ${orderStatusLabel(row.snapshot.status)}`
      : '',
    changes: (row.changes || []).map(c => c.lines
      // line by line since issues/161
      ? { field: c.field, label: fieldLabel(c.field), ...linesChange(c) }
      : {
          field: c.field,
          label: fieldLabel(c.field),
          from: formatValue(c.field, c.from),
          to: formatValue(c.field, c.to)
        })
  }))
}
