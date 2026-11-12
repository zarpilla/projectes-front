// «Consulta i autorització nou punt d'entrega» (issues/357).

const OFFICE = ['orders_admin', 'admin', 'projects']

/** The office (and full access) reads every request and marks them answered. */
export const isOfficeUser = permissions => (permissions || []).some(p => OFFICE.includes(p))

export const emptyPointRequest = () => ({
  trade_name: '',
  city: '',
  address: '',
  schedule: '',
  estimated_weight: '',
  notes: ''
})

const REQUIRED = [['city', 'la població'], ['address', "l'adreça"], ['schedule', "l'horari"]]

/** What the request lacks («Falta l'adreça i l'horari.»), or null. Same text as the API. */
export function pointRequestError (form) {
  const names = REQUIRED.filter(([key]) => !(form[key] && String(form[key]).trim())).map(([, name]) => name)
  if (!names.length) return null
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}` : names[0]
  return `Falta ${list}.`
}
