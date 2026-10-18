// Spanish postcodes (issues/179). A spreadsheet reads 08225 as the number 8225,
// and that is how 214 contacts of Diligència were loaded in 2024. The forms ask
// for 5 digits and the imports put the zero back.

const SPANISH = new Set(['es', 'esp', 'espanya', 'espana', 'spain', 'catalunya', 'paisos catalans'])

const plain = s =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

// no country, or a Spanish one (the field is free text)
export const isSpanish = country => !plain(country) || SPANISH.has(plain(country))

// a postcode a form can't save: a Spanish one without its 5 digits (other
// countries have 4-digit codes, so those are left alone)
export const postcodeInvalid = (postcode, country) =>
  isSpanish(country) && !/^\d{5}$/.test(String(postcode || '').trim())

export const POSTCODE_MESSAGE = "Un codi postal d'Espanya té 5 xifres (p. ex. 08225). Si és d'un altre país, indica'l a País."

// the postcode of an imported row, with the zero the spreadsheet dropped. A
// blank country counts as Spain only where every row is Spanish (the delivery
// points of Comandes); the general contacts import has foreign ones too.
export function importedPostcode (postcode, country, { blankIsSpanish = true } = {}) {
  if (postcode === null || postcode === undefined) return postcode
  const code = String(postcode).trim()
  const spanish = plain(country) ? isSpanish(country) : blankIsSpanish
  return spanish && /^\d{4}$/.test(code) ? `0${code}` : code
}
