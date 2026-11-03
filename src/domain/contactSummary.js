import moment from 'moment'
import { fiscalYearOf } from '@/domain/years'
import { isPartiallyPaid, pendingAmount } from '@/domain/partialPayments'

// «Resum» tab of a contact (decided 2026-10-30): its projects and documents
// from GET /contacts/:id/summary, with the figures of a (fiscal) year or of
// every year («Històric»). Sales are emitted invoices and other incomes,
// purchases received invoices and expenses. Figures are without VAT (base);
// what is still to collect or to pay is the document total. Hours are the ones
// worked on the projects, per month (see hoursProjectIds for which ones count).

export const ALL_YEARS = 'all'

export const KIND_LABELS = {
  'quotes': 'Pressupost',
  'emitted-invoices': 'Factura emesa',
  'received-incomes': 'Ingrés',
  'received-invoices': 'Factura rebuda',
  'received-expenses': 'Despesa'
}

const SALES = ['emitted-invoices', 'received-incomes']
const PURCHASES = ['received-invoices', 'received-expenses']

export const isSale = d => SALES.includes(d.kind)
export const isPurchase = d => PURCHASES.includes(d.kind)
export const isDraft = d => d.state === 'draft'
const isPaid = d => !!(d.paid_date || d.paid)
// «Ingrés» is masculine, the other documents with a state feminine (factura, despesa).
const isMasculine = d => d.kind === 'received-incomes'

const cents = v => Math.round((Number(v) || 0) * 100)
const sum = (docs, field) => docs.reduce((acc, d) => acc + cents(d[field]), 0) / 100
// what is still pending: the total less its partial payments (issues/412)
const sumPending = docs => docs.reduce((acc, d) => acc + cents(pendingAmount(d)), 0) / 100

/** Still to collect (a sale) or to pay (a purchase): not a draft, not paid, not a credit note. */
export function isPending(d) {
  return (isSale(d) || isPurchase(d)) && !isDraft(d) && !isPaid(d) && Number(d.total) > 0
}

export function isOverdue(d, today = moment()) {
  return isPending(d) && !!d.paybefore && moment(d.paybefore, 'YYYY-MM-DD').isBefore(today, 'day')
}

/** { label, tone } of a document's state, as the document lists show it. */
export function docStatus(d, today = moment()) {
  if (d.kind === 'quotes') return d.accepted ? { label: 'Acceptat', tone: 'success' } : { label: 'Obert', tone: 'neutral' }
  if (isDraft(d)) return { label: 'Esborrany', tone: 'info' }
  if (isPaid(d)) return { label: isSale(d) ? (isMasculine(d) ? 'Cobrat' : 'Cobrada') : 'Pagada', tone: 'success' }
  // collected or paid in part (issues/412)
  if (isPartiallyPaid(d)) return { label: 'Parcial', tone: 'info' }
  if (Number(d.total) < 0) return { label: 'Abonament', tone: 'neutral' }
  if (isOverdue(d, today)) return { label: isMasculine(d) ? 'Vençut' : 'Vençuda', tone: 'danger' }
  return { label: isSale(d) ? (isMasculine(d) ? 'No cobrat' : 'No cobrada') : 'Pendent de pagar', tone: 'warning' }
}

/** Does a document fall in the period (a fiscal year, or ALL_YEARS)? */
export function inPeriod(d, period, startMonth = 1) {
  return period === ALL_YEARS || fiscalYearOf(d.emitted, startMonth) === Number(period)
}

/** The years with documents or hours, and the current one, newest first. */
export function periodYears(documents, startMonth = 1, today = moment(), hours = []) {
  const years = new Set([fiscalYearOf(today, startMonth)])
  for (const date of [...(documents || []).map(d => d.emitted), ...hours.map(h => h.date)]) {
    const y = fiscalYearOf(date, startMonth)
    if (y !== null) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}

/** The figures of the period, and of every year for the small print. */
export function summaryFigures(documents, period, startMonth = 1, today = moment()) {
  const docs = (documents || []).filter(d => !isDraft(d))
  const sales = docs.filter(isSale)
  const purchases = docs.filter(isPurchase)
  const inP = list => list.filter(d => inPeriod(d, period, startMonth))
  const toCollect = sales.filter(isPending)
  const toPay = purchases.filter(isPending)
  return {
    sales: sum(inP(sales), 'total_base'),
    salesAll: sum(sales, 'total_base'),
    purchases: sum(inP(purchases), 'total_base'),
    purchasesAll: sum(purchases, 'total_base'),
    toCollect: sumPending(toCollect),
    toCollectCount: toCollect.length,
    overdueCount: toCollect.filter(d => isOverdue(d, today)).length,
    toPay: sumPending(toPay),
    toPayCount: toPay.length
  }
}

const projectIds = d => (d.projects || []).map(p => p.id)

/**
 * The projects whose hours are the contact's: as client, as intercooperation
 * or with sales to it. A provider's invoice on a project doesn't make the
 * hours worked there hours for that provider.
 */
export function hoursProjectIds(projects, documents) {
  const sold = new Set((documents || []).filter(d => !isDraft(d) && isSale(d)).flatMap(projectIds))
  return new Set((projects || []).filter(p => (p.roles || []).some(r => r !== 'documents') || sold.has(p.id)).map(p => p.id))
}

const sumHours = rows => rows.reduce((acc, h) => acc + cents(h.hours), 0) / 100
const hoursInPeriod = (h, period, startMonth) => inPeriod({ emitted: h.date }, period, startMonth)

/** Hours of the period and of every year: each row once, also when it counts on a child and its mother. */
export function hoursFigures(hours, projects, documents, period, startMonth = 1) {
  const ids = hoursProjectIds(projects, documents)
  const rows = (hours || []).filter(h => h.projects.some(id => ids.has(id)))
  return {
    hours: sumHours(rows.filter(h => hoursInPeriod(h, period, startMonth))),
    hoursAll: sumHours(rows)
  }
}

/**
 * Each project with the sales and purchases of this contact on it in the
 * period, and its hours. A document shared between several projects counts
 * whole on each: its lines don't say what part goes to which, so `shared`
 * marks the rows that include one. `childHours` marks a mother with hours of
 * its children.
 */
export function projectFigures(projects, documents, period, startMonth = 1, hours = []) {
  const docs = (documents || []).filter(d => !isDraft(d) && (isSale(d) || isPurchase(d)) && inPeriod(d, period, startMonth))
  const ids = hoursProjectIds(projects, documents)
  const periodHours = hours.filter(h => hoursInPeriod(h, period, startMonth))
  return (projects || []).map(p => {
    const mine = docs.filter(d => projectIds(d).includes(p.id))
    const myHours = ids.has(p.id) ? periodHours.filter(h => h.projects.includes(p.id)) : []
    return {
      ...p,
      sales: sum(mine.filter(isSale), 'total_base'),
      purchases: sum(mine.filter(isPurchase), 'total_base'),
      shared: mine.some(d => projectIds(d).length > 1),
      hours: sumHours(myHours),
      childHours: myHours.some(h => h.hours && h.project !== p.id)
    }
  })
}

export const DOC_FILTERS = [
  { id: 'all', label: 'Tots' },
  { id: 'quotes', label: 'Pressupostos' },
  { id: 'sales', label: 'Vendes' },
  { id: 'purchases', label: 'Compres' },
  { id: 'pending', label: 'Pendents' }
]

/** The documents of a filter chip. «Pendents» shows every year: a pending invoice of last year still is. */
export function filterDocuments(documents, filter, period, startMonth = 1) {
  const docs = documents || []
  if (filter === 'pending') return docs.filter(isPending)
  const byPeriod = docs.filter(d => inPeriod(d, period, startMonth))
  if (filter === 'quotes') return byPeriod.filter(d => d.kind === 'quotes')
  if (filter === 'sales') return byPeriod.filter(isSale)
  if (filter === 'purchases') return byPeriod.filter(isPurchase)
  return byPeriod
}

// «documents»: a project where the contact is neither client nor intercooperation but has documents
export const ROLE_LABELS = { client: 'Clienta', intercooperation: 'Intercooperació', documents: 'Documents' }

export const CONTACT_TABS = [
  { id: 'resum', label: 'Resum' },
  { id: 'dades', label: 'Dades' }
]

/** The tab of `?vista=`: «Resum» unless it asks for another one. */
export function contactTab(vista) {
  return CONTACT_TABS.some(t => t.id === vista) ? vista : 'resum'
}

/**
 * The «Resum» tab is for a saved contact that is not a delivery point (those
 * keep their own orders tab), and only for the office: it shows the projects'
 * finances, which only the projects and admin permissions reach.
 */
export function showContactSummary(form, permissions) {
  const perms = permissions || []
  return !!(form && form.id && !form.owner) && (perms.includes('projects') || perms.includes('admin'))
}
