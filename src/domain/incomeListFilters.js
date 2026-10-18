// Filters of the Ingressos list (/emitted-invoices), as query strings for the
// /basic endpoints.

export const STATE_OPTIONS = [
  { name: 'Tots', value: 0 },
  { name: 'Esborranys', value: 1 },
  { name: 'Emeses', value: 2 }
]

/**
 * The «Estat» filter: drafts or issued invoices. Received incomes have no
 * draft state, so they are left out of «Esborranys» and kept in «Emeses».
 * @returns {{ invoiceQuery: string, includeIncomes: boolean }}
 */
export function stateFilter (state) {
  if (state === 1) return { invoiceQuery: '&[state_eq]=draft', includeIncomes: false }
  if (state === 2) return { invoiceQuery: '&[state_eq]=real', includeIncomes: true }
  return { invoiceQuery: '', includeIncomes: true }
}
