// Bestretes of a month for everyone (issues/347): with a month and no person,
// Bestretes lists the payrolls of every person for that year and month, with
// their totals. A payroll may point at a deleted user (issues/279).

import { payrollUserName } from "./payrollLabel.js";

const num = (value) => Number(value) || 0;
const round2 = (value) => Math.round(value * 100) / 100;

// the payrolls of that year and month, by person name
export function monthPayrollRows(payrolls, year, month) {
  return (payrolls || [])
    .filter(
      (p) =>
        p.year && Number(p.year.year) === Number(year) &&
        p.month && Number(p.month.month) === Number(month)
    )
    .map((p) => ({
      id: p.id,
      person: payrollUserName(p),
      net: num(p.net_base),
      irpf: num(p.irpf_base),
      ss: num(p.ss_base),
      other: num(p.other_base),
      total: num(p.total),
      bankAccount: p.bank_account && p.bank_account.name ? p.bank_account.name : null,
      netDate: p.net_date || null,
      paid: !!p.paid,
      emitted: p.emitted || null
    }))
    .sort((a, b) => a.person.localeCompare(b.person, "ca"));
}

export function monthPayrollTotals(rows) {
  const totals = { net: 0, irpf: 0, ss: 0, other: 0, total: 0 };
  for (const row of rows) {
    for (const key of Object.keys(totals)) totals[key] += row[key];
  }
  for (const key of Object.keys(totals)) totals[key] = round2(totals[key]);
  return totals;
}

// «?any=2026&mes=3» from Tresoreria's grouped lines; the month is 1–12 or null
export function monthFromQuery(query) {
  const month = Number(query && query.mes);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

export function yearFromQuery(query) {
  const year = Number(query && query.any);
  return Number.isInteger(year) && year > 1900 ? year : null;
}
