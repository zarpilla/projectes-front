import sumBy from 'lodash/sumBy'

// Totals of a document's lines (emitted/received invoices, expenses, incomes,
// quotes). Each line: { quantity, base (unit price), discount %, vat %, irpf % }.
// Quantities and prices may arrive as strings from the form inputs.
//
// The arithmetic order matches what DocumentForm always did, so results are
// bit-for-bit the same (tests/unit/documentTotals.spec.js).

/** Line amount after its discount. */
export const lineBase = l => l.quantity * l.base * (1 - (l.discount || 0) / 100)

export const totalBase = lines => sumBy(lines, lineBase)

export const totalVat = lines => sumBy(lines, l => (lineBase(l) * l.vat) / 100)

/** IRPF is withheld, so it is returned as a negative amount. */
export const totalIrpf = lines => -1 * sumBy(lines, l => (lineBase(l) * l.irpf) / 100)

export const hasDiscount = lines => lines.some(l => l.discount && l.discount > 0)

export const totalBaseWithoutDiscount = lines => sumBy(lines, l => l.quantity * l.base)
