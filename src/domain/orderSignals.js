import moment from 'moment'

// The filter of the «Senyals» column as query clauses: one clause per signal,
// the same rules as the icons (issues/315). Next week = from next Monday on.
export function signalWhere (key, today = moment()) {
  const nextMonday = moment(today).startOf('isoWeek').add(1, 'week').format('YYYY-MM-DD')
  const clauses = {
    incidence: '_where[incidences.id_null]=false',
    express: '_where[late_order]=true',
    'late-pickup': '_where[late_pickup]=true',
    'next-week': `_where[estimated_delivery_date_gte]=${nextMonday}`,
    cold: '_where[delivery_type.name_contains]=Refr',
    collection: '_where[is_collection_order]=true',
    transfer: '_where[transfer]=true',
    'last-mile': '_where[last_mile]=true',
    fragile: '_where[fragile]=true'
  }
  return clauses[key] ? [clauses[key]] : []
}
