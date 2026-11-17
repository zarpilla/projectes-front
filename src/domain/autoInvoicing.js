// The automatic monthly invoicing (issues/430), what its panel and report show.
import moment from 'moment'

const LABELS = { running: 'En curs', done: 'Fet', partial: 'Amb incidències', failed: 'No fet' }
const TAGS = { running: 'is-info is-light', done: 'is-success is-light', partial: 'is-warning is-light', failed: 'is-danger is-light' }

export const autoRunLabel = status => LABELS[status] || status
export const autoRunTag = status => TAGS[status] || ''

/** The months to preview or run: this one and the three before it. */
export function monthOptions (now) {
  return [0, 1, 2, 3].map(i => {
    const m = moment(now).subtract(i, 'months')
    return { value: m.format('YYYY-MM'), label: m.locale('ca').format('MMMM YYYY') }
  })
}

const MEMBER_STATUS = {
  created: ['Esborrany creat', 'is-success is-light'],
  ready: ['Es crearà', 'is-info is-light'],
  blocked: ['Sense esborrany', 'is-danger is-light'],
  skipped: ['No creat', 'is-warning is-light']
}
export const memberStatusLabel = status => (MEMBER_STATUS[status] || [status])[0]
export const memberStatusTag = status => (MEMBER_STATUS[status] || [null, ''])[1]

/** «de setembre 2026», «d'octubre 2026» */
export const ofMonth = name => (/^[aeiouàèéíòóú]/i.test(String(name || '')) ? `d'${name}` : `de ${name}`)

/** «0012, 0013» */
export const orderList = ids => (ids || []).map(id => String(id).padStart(4, '0')).join(', ')

/** The members first that need a look: blocked, then with notes, then by name. */
export function sortedMembers (members) {
  const rank = m => (m.blockers && m.blockers.length ? 0 : m.warnings && m.warnings.length ? 1 : 2)
  return [...(members || [])].sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)))
}

const day = value => (value ? moment(value, 'YYYY-MM-DD').format('DD/MM/YYYY') : '')

/**
 * The logistics project of a quarter (issues/430), one rule for Facturar and
 * the automatic invoicing, in the API (auto-invoicing/quarter-project): the
 * project named after the quarter, «4T 2026 - Logística»; its dates don't count.
 * What the confirmation of a new one says: `found` is that answer
 * ({ quarter, latest, newName }).
 */
export function newQuarterProjectText (found) {
  const q = found.quarter
  const model = found.latest
    ? ` Copiarà de «${found.latest.name}» el client, el tipus, l'àmbit, la persona responsable i la facturació${found.latest.auto_invoicing ? ", i tindrà «Habilitar facturació automàtica»" : ""}.`
    : ''
  return `Es crearà el projecte «${found.newName}», actiu, del ${day(q.date_start)} al ${day(q.date_end)} i amb una sola fase «Logística».${model}`
}

/** Creates the quarter's project of `month`: the API's answer ({ project }). */
export async function createQuarterProject (api, month) {
  return (await api.post('auto-invoicing/quarter-project', { month })).data
}
