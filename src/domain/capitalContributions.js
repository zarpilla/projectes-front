// A contact's contributions to the cooperative's capital (date, amount,
// comment): the repeatable component `capital_contributions` of a contact
// (projectes-v5 services/capital-contributions.js). The contact's old
// «Import / Data aportació sòcia» are now their total and last date, kept by
// the API.

const blank = v => v === undefined || v === null || String(v).trim() === ''

/** An amount typed with a comma or a dot, or NaN; blank is null. */
export const parseAmount = v => (blank(v) ? null : Number(String(v).trim().replace(',', '.')))

/** The error of a row, or null. */
export function contributionError (row) {
  const amount = parseAmount(row && row.amount)
  if (amount !== null && !Number.isFinite(amount)) return "L'import ha de ser un número"
  return null
}

/**
 * The rows as the API saves them: fully empty rows dropped, amounts as numbers,
 * blanks as null, ids kept. Throws on an amount that is not a number.
 */
export function cleanContributions (rows) {
  return (rows || []).flatMap(row => {
    if (!row) return []
    const date = blank(row.date) ? null : String(row.date).slice(0, 10)
    const amount = parseAmount(row.amount)
    const comment = blank(row.comment) ? null : String(row.comment).trim()
    if (date === null && amount === null && comment === null) return []
    if (amount !== null && !Number.isFinite(amount)) throw new Error("L'import d'una aportació ha de ser un número")
    const clean = { date, amount, comment }
    if (row.id) clean.id = row.id
    return [clean]
  })
}

/** The total of the rows with an amount. */
export function contributionsTotal (rows) {
  const total = (rows || []).reduce((s, r) => {
    const n = parseAmount(r && r.amount)
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)
  return Math.round(total * 100) / 100
}

/** Oldest first, undated last (as they are listed). */
export const sortContributions = rows =>
  [...(rows || [])].sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')))

/**
 * A contact form as sent: the contributions cleaned; the old amount and date
 * left out (they are their total and last date, kept by the API).
 */
export function contactPayload (form) {
  const { partner_amount, partner_amount_date, ...data } = form // eslint-disable-line no-unused-vars
  return { ...data, capital_contributions: cleanContributions(form.capital_contributions) }
}
