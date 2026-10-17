import sumBy from 'lodash/sumBy'

// Totals of a document's lines (emitted/received invoices, expenses, incomes,
// quotes). Each line: { quantity, base (unit price), discount %, vat %, irpf % }.
// Quantities and prices may arrive as strings from the form inputs.
//
// Each line's base, VAT and IRPF are rounded to cents before adding them up,
// as the views show them and as the backend and Facturae compute them; adding
// unrounded lines gave a base a cent away from its lines (issues/073).

const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100

/** Line amount after its discount, in cents. */
export const lineBase = l => round2(l.quantity * l.base * (1 - (l.discount || 0) / 100))

/** Amount the line's discount takes off. */
export const lineDiscount = l => (l.quantity * l.base * (l.discount || 0)) / 100

/** Line VAT and IRPF (withheld, positive) on the discounted amount. */
export const lineVat = l => round2((lineBase(l) * (l.vat || 0)) / 100)

export const lineIrpf = l => round2((lineBase(l) * (l.irpf || 0)) / 100)

/** Line total as the invoice views show it: base - IRPF + VAT. */
export const lineTotal = l => lineBase(l) - lineIrpf(l) + lineVat(l)

export const totalBase = lines => round2(sumBy(lines, lineBase))

export const totalVat = lines => round2(sumBy(lines, lineVat))

/** IRPF is withheld, so it is returned as a negative amount. */
export const totalIrpf = lines => -1 * round2(sumBy(lines, lineIrpf))

export const hasDiscount = lines => lines.some(l => l.discount && l.discount > 0)

export const totalBaseWithoutDiscount = lines => sumBy(lines, l => l.quantity * l.base)

/**
 * VAT (or IRPF) per rate, for the totals block: [{ rate, base, amount }] sorted
 * by rate, only rates with some base. `field` is 'vat' or 'irpf'.
 */
export const byRate = (lines, field = 'vat') => {
  const groups = new Map()
  ;(lines || []).forEach(l => {
    const rate = Number(l[field]) || 0
    const g = groups.get(rate) || { rate, base: 0, amount: 0 }
    g.base = round2(g.base + lineBase(l))
    g.amount = round2(g.amount + (field === 'irpf' ? lineIrpf(l) : lineVat(l)))
    groups.set(rate, g)
  })
  return [...groups.values()].filter(g => g.base).sort((a, b) => a.rate - b.rate)
}
