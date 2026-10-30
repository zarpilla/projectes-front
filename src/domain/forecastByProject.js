// Previsió econòmica › «Resum per projectes» (issues/368).
//
// Per project (or summed per project type or scope), for the chosen years:
// planned incomes, invoices and expenses, non-deductible VAT, and the payroll
// it can cover: incomes minus the other expenses, never below 0 (a project
// that loses money covers nothing). It is worked out project by project and
// then added up, also when grouping. What the projects can't cover of the
// planned payroll is «Nòmines que falten per cobrir».
//
// `projects` is the forecast's `forecast_by_project`:
//   [{ id, name, project_type, project_scope, years: { "2026": {
//      forecast_incomes, forecast_expenses, forecast_expenses_vat } } }]
// with the expenses as positive amounts; here they are negative, as in the
// global summary.

export const GROUPINGS = [
  { id: "project", label: "Projecte" },
  { id: "type", label: "Tipus de projecte" },
  { id: "scope", label: "Àmbit" }
];

const NONE = { type: "Sense tipus", scope: "Sense àmbit" };

function projectFigures(p, years) {
  let incomes = 0;
  let invoices = 0;
  let vat = 0;
  for (const y of years) {
    const f = (p.years || {})[y];
    if (!f) continue;
    incomes += Number(f.forecast_incomes) || 0;
    invoices -= Number(f.forecast_expenses) || 0;
    vat -= Number(f.forecast_expenses_vat) || 0;
  }
  return { incomes, invoices, vat, payrollCover: Math.max(0, incomes + invoices + vat) };
}

function groupOf(p, grouping) {
  if (grouping === "project") return { key: `p${p.id}`, label: p.name || `#${p.id}`, projectId: p.id };
  const ref = grouping === "type" ? p.project_type : p.project_scope;
  return ref && ref.id ? { key: `${grouping}${ref.id}`, label: ref.name } : { key: `${grouping}-none`, label: NONE[grouping], none: true };
}

const isEmpty = (r) => !r.incomes && !r.invoices && !r.vat;

/**
 * @returns rows { key, label, projectId?, projects, incomes, invoices, vat,
 *   payrollCover }, the biggest incomes first, «Sense …» last; projects with
 *   nothing in those years are left out
 */
export function forecastRows(projects, years, grouping = "project") {
  const groups = new Map();
  for (const p of projects || []) {
    const fig = projectFigures(p, years);
    if (isEmpty(fig)) continue;
    const g = groupOf(p, grouping);
    let row = groups.get(g.key);
    if (!row) {
      row = { ...g, projects: 0, incomes: 0, invoices: 0, vat: 0, payrollCover: 0 };
      groups.set(g.key, row);
    }
    row.projects++;
    row.incomes += fig.incomes;
    row.invoices += fig.invoices;
    row.vat += fig.vat;
    row.payrollCover += fig.payrollCover;
  }
  return [...groups.values()].sort(
    (a, b) => (a.none ? 1 : 0) - (b.none ? 1 : 0) || b.incomes - a.incomes || String(a.label).localeCompare(String(b.label), "ca")
  );
}

/**
 * Totals of the rows and the payroll left uncovered.
 * @param payroll planned payroll of those years, negative (as in the summary)
 */
export function forecastTotals(rows, payroll) {
  const sum = (k) => rows.reduce((acc, r) => acc + r[k], 0);
  const t = { incomes: sum("incomes"), invoices: sum("invoices"), vat: sum("vat"), payrollCover: sum("payrollCover") };
  const payrollCost = -(Number(payroll) || 0);
  return {
    ...t,
    payroll: -payrollCost,
    payrollUncovered: Math.max(0, payrollCost - t.payrollCover),
    result: t.incomes + t.invoices + t.vat - payrollCost
  };
}
