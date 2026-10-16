// The relations of the auxiliary tables (Festius d'usuari: Tipus de festiu, Any,
// Usuària; Mètodes de pagament: Bank account) showed "[object Object]" in a text
// input: the form read Strapi 3 metadata (`model`), the backend sends Strapi 5's
// (`type: 'relation'`, `target`).
import { describe, it, expect } from 'vitest'
import { normalizeAttributes } from '@/service/adminMetadata.js'

describe('admin metadata', () => {
  it('turns Strapi 5 relations into the model / collection the forms read', () => {
    const attrs = normalizeAttributes({
      festive_type: { type: 'relation', relation: 'oneToOne', target: 'api::festive-type.festive-type', label: 'Tipus de festiu' },
      users_permissions_user: { type: 'relation', relation: 'manyToOne', target: 'plugin::users-permissions.user' },
      projects: { type: 'relation', relation: 'manyToMany', target: 'api::project.project' },
      max: { type: 'integer' }
    })
    expect(attrs.festive_type).toMatchObject({ model: 'festive-type', label: 'Tipus de festiu' })
    expect(attrs.users_permissions_user).toMatchObject({ model: 'user', plugin: 'users-permissions' })
    expect(attrs.projects).toMatchObject({ collection: 'project' })
    expect(attrs.projects.model).toBeUndefined()
    expect(attrs.max).toEqual({ type: 'integer' })
  })

  it('leaves Strapi 3 style metadata as it is', () => {
    const year = { model: 'year' }
    expect(normalizeAttributes({ year }).year).toBe(year)
  })
})
