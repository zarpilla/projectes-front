// The price a row of the CSV import shows before it is created (issues/298).
// The preview took the route rate's price as the price «amb descompte», and
// the save then applied the multidelivery discount (20,15 € shown, 16,12 €
// saved): two rows to the same point and day are a multidelivery once both
// are saved, and enough rows of a member on a route earn the volume discount.
// The backend's check-multidelivery applies those rules (the order form asks it
// too); the preview tells it how many other rows are still to be saved, and
// prices the row with invoicedPrice, the formula of the invoice line.
import moment from 'moment'
import { invoicedPrice } from '@/domain/logisticsInvoicing'

const relId = value => (value && typeof value === 'object' ? value.id : value)
const day = value => (value ? moment(value).format('YYYY-MM-DD') : null)
const unsaved = row => Boolean(row) && !row.id && row.status === 'CSV'

/** What check-multidelivery is asked for an unsaved row among `rows`. */
export function csvDiscountQuery (row, rows) {
  const others = (rows || []).filter(o => o !== row && unsaved(o) && day(o.estimated_delivery_date) === day(row.estimated_delivery_date))
  return {
    date: day(row.estimated_delivery_date),
    contactId: relId(row.contact),
    ownerId: relId(row.owner),
    routeId: relId(row.route),
    status: 'pending',
    pendingSameContact: others.filter(o => relId(o.contact) === relId(row.contact)).length,
    pendingSameRoute: others.filter(o => relId(o.route) === relId(row.route) && relId(o.owner) === relId(row.owner)).length
  }
}

/** The row with the discounts the save will store, and its final price. */
export function withCsvDiscounts (row, answer) {
  const data = answer || {}
  const priced = {
    ...row,
    multidelivery_discount: Number(data.multidelivery_discount) || 0,
    volume_discount: 'volume_discount' in data ? Number(data.volume_discount) || 0 : 0
  }
  if (Number.isFinite(Number(priced.price)) && priced.price !== null && priced.price !== undefined) {
    priced.finalPrice = invoicedPrice(priced)
  }
  return priced
}

/** What is posted to orders/csv: the server works the discounts out itself. */
export function csvOrderPayload (row) {
  const { multidelivery_discount: _m, volume_discount: _v, finalPrice: _f, ...payload } = row
  return payload
}
