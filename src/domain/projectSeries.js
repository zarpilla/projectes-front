// «Sèries de projecte» (2026-11-06): a series numbers the projects that take it,
// like the invoice series: «[2026-001] Acompanyament en cultura popular». The
// text is the project's `title`; `name` (what every list shows) is the code
// followed by the text, and the backend writes it (services/project-series.js).
// A project without a series keeps typing its `name` as before.

/** «[2026-001]»: the code of number `number` of `serie`. */
export function serieCode (serie, number) {
  if (!serie || !serie.name || !number) return ''
  const places = Number(serie.leading_zeros) > 0 ? Number(serie.leading_zeros) : 1
  return `${serie.prefix || ''}${serie.name}-${String(number).padStart(places, '0')}${serie.suffix || ''}`
}

/** The id of the form's series, 0 for none. */
export const serieIdOf = form => Number(form && form.project_serie && form.project_serie.id) || 0

/**
 * The code the project shows next to its text: its own number while it stays
 * in its series, the next number of the series otherwise (a new project, a
 * copy, a project changing series). `stored` is the project as loaded.
 */
export function projectSerieCode (serie, form, stored) {
  if (!serie) return ''
  const keepsNumber = stored && stored.serie_number && serieIdOf(stored) === serie.id && form.id
  return serieCode(serie, keepsNumber ? stored.serie_number : (Number(serie.last_number) || 0) + 1)
}

/** The series offered to pick: the active ones, and the project's own. */
export const seriesOffered = (series, currentId) =>
  (series || []).filter(s => s.active !== false || s.id === currentId)

/**
 * The form after picking another series (0: none). A project entering a
 * series takes its name as the text; one leaving it keeps the text as its name.
 */
export function withSerie (form, serieId) {
  const next = { ...form, project_serie: { id: serieId || 0 } }
  if (serieId && !serieIdOf(form)) {
    next.title = form.title || form.name || ''
  } else if (!serieId && serieIdOf(form)) {
    next.name = form.title || form.name || ''
  }
  return next
}

/**
 * The name the form validates and sends (the backend writes the final one):
 * empty while a numbered project has no text, so it is asked for.
 */
export function formName (serie, form, stored) {
  if (!serie) return form.name
  const text = String(form.title || '').trim()
  return text ? `${projectSerieCode(serie, form, stored)} ${text}` : ''
}

/**
 * «Duplicar projecte»: the name fields of the copy. Into a series, the copy
 * keeps the text and takes the series' next number; without one, the name
 * gets «(còpia)» as before.
 */
export function copyNameFields (source, serieId) {
  const text = serieIdOf(source) ? (source.title || source.name || '') : (source.name || '')
  if (serieId) {
    return { project_serie: { id: serieId }, serie_number: null, title: text, name: text }
  }
  return { project_serie: { id: 0 }, serie_number: null, title: null, name: `${text} (còpia)` }
}
