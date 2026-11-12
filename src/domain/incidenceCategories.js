// The cause of an incidence (issues/431): picked from «Categories d'incidència»
// (Taules auxiliars › Logística, edited by admins). Required on a new incidence
// as soon as the entity has categories; an entity without any goes on as before.
import moment from 'moment'

/** The categories in their order, or [] when none (or they can't be read). */
export async function loadIncidenceCategories (service) {
  try {
    const { data } = await service({ requiresAuth: true }).get('incidence-categories', {
      params: { _limit: -1, _sort: 'order:ASC,id:ASC' }
    })
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

/** The name of an incidence's category, or '' when it has none. */
export const categoryName = incidence =>
  (incidence && incidence.category && typeof incidence.category === 'object' && incidence.category.name) || ''

/**
 * What a new incidence lacks, or null: a category when the entity has some;
 * else the text, as before.
 */
export function incidenceFormError ({ categories, category, description }) {
  if (categories && categories.length) return category ? null : 'Tria la categoria de la incidència'
  return description && description.trim() ? null : 'Si us plau, descriu la incidència'
}

const userName = (user, users) => {
  const found = user && typeof user === 'object' ? user : users && users.get(user)
  return found ? found.fullname || found.username : 'Desconegut'
}

/**
 * The replies of an incidence for the export, one per line:
 * «Usuària de la interacció - data de la interacció - missatge de la interacció».
 * `users` maps the user ids the list gives to the users.
 */
export function repliesText (replies, users) {
  return (replies || [])
    .filter(r => r && r.text)
    .map(r => [
      userName(r.user, users),
      r.response_date ? moment(r.response_date).format('DD/MM/YYYY HH:mm') : '',
      String(r.text).replace(/\s*\n\s*/g, ' ').trim()
    ].join(' - '))
    .join('\n')
}
