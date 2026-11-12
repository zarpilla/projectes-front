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
