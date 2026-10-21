// The generic admin screens (AdminEntityList / AdminEntityForm) were written for
// Strapi 3 metadata, where a relation said `model: 'year'` (one) or
// `collection: 'project'` (many). Strapi 5's entity-metadata says
// `type: 'relation', relation: 'oneToOne', target: 'api::year.year'`, so every
// relation fell through to a text input showing "[object Object]".
// normalizeAttributes adds the Strapi 3 keys back.

const TO_MANY = ['oneToMany', 'manyToMany']

// 'api::festive-type.festive-type' -> { model: 'festive-type' }
// 'plugin::users-permissions.user' -> { model: 'user', plugin: 'users-permissions' }
const fromTarget = target => {
  const m = /^(api|plugin)::([^.]+)\.(.+)$/.exec(String(target || ''))
  if (!m) return null
  return m[1] === 'plugin' ? { model: m[3], plugin: m[2] } : { model: m[3] }
}

export const normalizeAttributes = attributes => {
  const out = {}
  for (const [name, config] of Object.entries(attributes || {})) {
    if (config && config.type === 'relation' && !config.model && !config.collection) {
      const ref = fromTarget(config.target)
      if (ref && TO_MANY.includes(config.relation)) {
        out[name] = { ...config, collection: ref.model, plugin: ref.plugin }
      } else if (ref) {
        out[name] = { ...config, ...ref }
      } else {
        out[name] = config
      }
    } else {
      out[name] = config
    }
  }
  return out
}

export const normalizeEntity = entity =>
  entity ? { ...entity, attributes: normalizeAttributes(entity.attributes) } : entity

// The rows a table lists, as the backend says (holidays: those with no
// person, issues/310): "_where[users_permissions_user_null]=true"
export const listQueryOf = metadata => (metadata && metadata.listQuery ? `&${metadata.listQuery}` : '')

// The options a relation offers, as the backend says (a holiday for everyone
// takes a type for everyone, issues/310): { personal: false }
export const optionsMatching = (options, where) =>
  where ? (options || []).filter(o => Object.entries(where).every(([key, value]) => o[key] === value)) : options

// A date field: the API's "2027-01-06" for the datepicker (a local Date),
// and back as the same day, whatever the browser's timezone (issues/310)
export const dateFromApi = value => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : value || null
}

export const dateToApi = value => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value
  const pad = n => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}
