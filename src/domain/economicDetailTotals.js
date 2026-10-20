// The per-project figures of Ingressos/Despeses «Exporta totals» (and «per
// any»), added up from the pivot rows the way the pivot's measures do it
// (configStatsEconomicDetail.js): the expenses carry the hours and the
// non-deductible VAT. The export left the VAT out, so its Resultat disagreed
// with the screen and the fitxa (issues/254).
import sumBy from "lodash/sumBy";

const sum = (rows, field) => sumBy(rows, field) || 0;

export function economicDetailTotals(rows) {
  const out = {};
  for (const [kind, hours] of [["orig", "original"], ["esti", "estimated"], ["real", "real"]]) {
    const incomes = sum(rows, `income_${kind}`);
    const expenses = sum(rows, `expense_${kind}`);
    const vat = sum(rows, `expense_${kind}_vat`);
    const hoursPrice = sum(rows, `total_${hours}_hours_price`);
    out[kind] = incomes + expenses + vat + hoursPrice;
    out[`income_${kind}`] = incomes;
    out[`total_expense_${kind}`] = expenses + vat + hoursPrice;
    out[`expense_${kind}`] = expenses;
    out[`expense_${kind}_vat`] = vat;
    out[`total_${hours}_hours_price`] = hoursPrice;
    out[`total_${hours}_hours`] = sum(rows, `total_${hours}_hours`);
  }
  return out;
}
