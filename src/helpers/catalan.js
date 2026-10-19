import moment from 'moment'

// «de» before a word, as Catalan writes it: «de gener», «d'octubre», «d'Arran»
// (issues/181: «Resta de octubre», «a final de octubre»). For dates moment's
// Catalan locale already does it with "D MMMM" (not "D [de] MMMM").
export const ofWord = word => {
  const w = String(word || '')
  return (/^h?[aeiouàèéíòóú]/i.test(w) ? "d'" : 'de ') + w
}

// «fa 4 dies», «ahir», «avui», «d'aquí 13 dies»: counted in calendar days.
// moment's fromNow() counted from now, so an entry of 4 days ago at midnight
// said «fa 5 dies» in the afternoon (issues/181).
export const daysFromToday = (date, today = moment()) => {
  const days = moment(date).startOf('day').diff(moment(today).startOf('day'), 'days')
  if (days === 0) return 'avui'
  if (days === -1) return 'ahir'
  if (days === 1) return 'demà'
  return days < 0 ? `fa ${-days} dies` : `d'aquí ${days} dies`
}

// «1 comanda», «2 comandes» (issues/208: «1 comandes», «1 caixes»). Without
// `many`: -a gives -es (caixa, caixes), anything else adds -s.
export const plural = (n, one, many) =>
  `${n} ${Number(n) === 1 ? one : (many || (one.endsWith('a') ? one.slice(0, -1) + 'es' : one + 's'))}`
