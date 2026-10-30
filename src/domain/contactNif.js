// The contact form warns when its NIF is already on another contact. Delivery
// points (contacts with an owner) are left out: in Diligència one organisation
// has several points under one NIF, and that is how it should be. The backend
// (GET /contacts/nif-matches) leaves them out of the answer too.

export const nifKey = nif => String(nif || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// a NIF this short is a typo or a placeholder, not worth a warning
export const MIN_NIF_KEY_LENGTH = 5

export function shouldCheckNif(form) {
  return !!form && !form.owner && nifKey(form.nif).length >= MIN_NIF_KEY_LENGTH
}

export function nifWarningText(matches) {
  if (!matches || !matches.length) return ''
  return matches.length === 1
    ? 'Ja hi ha un altre contacte amb aquest NIF:'
    : `Ja hi ha ${matches.length} contactes més amb aquest NIF:`
}

/**
 * Asks the backend for the other contacts with the form's NIF. Only the answer
 * to the latest call counts: a slower earlier answer (a NIF still being typed)
 * is dropped. A failed call warns of nothing: the warning never blocks saving.
 */
export function makeNifCheck(get) {
  let latest = 0
  return async function check(form) {
    const call = ++latest
    if (!shouldCheckNif(form)) return []
    let matches = []
    try {
      const params = new URLSearchParams({ nif: form.nif })
      if (form.id) params.set('exclude', form.id)
      const r = await get(`contacts/nif-matches?${params}`)
      matches = Array.isArray(r && r.data) ? r.data : []
    } catch (e) {
      matches = []
    }
    return call === latest ? matches : null
  }
}
