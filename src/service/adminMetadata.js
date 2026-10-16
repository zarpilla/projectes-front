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
