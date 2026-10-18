// Saving a project whose Codi (`name`, the only unique attribute) is taken
// failed with the backend's «Error: This attribute must be unique», in
// English and without naming the field (issues/130).
export function isDuplicateCodeError (err) {
  const error = err && err.response && err.response.data && err.response.data.error
  if (!error) return false
  const details = (error.details && error.details.errors) || []
  if (details.length) {
    return details.some(d => (d.path || []).includes('name') && /unique/i.test(d.message || ''))
  }
  return /must be unique/i.test(error.message || '')
}

export function projectSaveErrorMessage (err, code) {
  if (isDuplicateCodeError(err)) {
    return `Ja hi ha un projecte amb el codi «${code}». Tria'n un altre: els projectes tancats no surten al llistat per defecte.`
  }
  const backendMessage = err && err.response && err.response.data && err.response.data.error && err.response.data.error.message
  return backendMessage
    ? `S'ha produït un error al guardar el projecte: ${backendMessage}`
    : "S'ha produït un error al guardar el projecte"
}

export const DUPLICATE_CODE_FIELD_MESSAGE = 'Ja hi ha un projecte amb aquest codi'
