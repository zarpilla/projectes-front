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
//   [{ id, name, project_type, project_scope, project_state, periodified,
//      years: { "2026": {
//      forecast_incomes, forecast_expenses, forecast_expenses_vat } } }]
// with the expenses as positive amounts; here they are negative, as in the
// global summary.
//
// By «Estat» (Raiels, 2026-11-18) the periodified projects make a group of
// their own, «Periodificats», whatever their state: so each project is counted
// once and the groups still add up to the total. It goes after the states.

export const GROUPINGS = [
  { id: "project", label: "Projecte" },
  { id: "state", label: "Estat" },
  { id: "type", label: "Tipus de projecte" },
  { id: "scope", label: "Àmbit" }
];

const NONE = { type: "Sense tipus", scope: "Sense àmbit", state: "Sense estat" };
const RELATION = { type: "project_type", scope: "project_scope", state: "project_state" };
const PERIODIFIED = { key: "state-periodified", label: "Periodificats", tail: true };

// the order of a group that always goes last: the states, «Periodificats»,
// «Sense …»
const rank = (r) => (r.none ? 2 : r.tail ? 1 : 0);

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
  if (grouping === "state" && p.periodified) return { ...PERIODIFIED };
  const ref = p[RELATION[grouping]];
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
    (a, b) => rank(a) - rank(b) || b.incomes - a.incomes || String(a.label).localeCompare(String(b.label), "ca")
  );
}

/**
 * issues/434: what a grouped row opens into. A project type or a state opens
 * into its projects; a scope into its project types (not the projects). Same
 * figures, so the children add up to their group.
 * @param groupKey the `key` of a forecastRows row of that grouping
 */
export function forecastChildRows(projects, years, grouping, groupKey) {
  if (!RELATION[grouping]) return [];
  const members = (projects || []).filter(p => groupOf(p, grouping).key === groupKey);
  return forecastRows(members, years, grouping === "scope" ? "type" : "project");
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

// issues/424: the columns of the table can be sorted. Names go A→Z first,
// amounts the biggest first (expenses by their size, not their sign); a
// second click turns the order round. «Periodificats» and «Sense tipus» /
// «Sense àmbit» / «Sense estat» stay last either way.
export const SORT_COLUMNS = [
  { key: "label", text: true },
  { key: "projects" },
  { key: "incomes" },
  { key: "invoices", expense: true },
  { key: "vat", expense: true },
  { key: "payrollCover" }
];

/** The direction of a first click on a column. */
export function defaultSortDir(key) {
  const col = SORT_COLUMNS.find(c => c.key === key);
  return col && col.text ? "asc" : "desc";
}

/**
 * The rows of forecastRows in the order of a column.
 * @param key a SORT_COLUMNS key; anything else keeps the order as it is
 * @param dir "asc" or "desc"
 */
export function sortForecastRows(rows, key, dir = defaultSortDir(key)) {
  const col = SORT_COLUMNS.find(c => c.key === key);
  if (!col) return rows;
  const sign = dir === "desc" ? -1 : 1;
  const value = (r) => (col.expense ? -(Number(r[key]) || 0) : Number(r[key]) || 0);
  const byLabel = (a, b) => String(a.label).localeCompare(String(b.label), "ca", { sensitivity: "base", numeric: true });
  return [...rows].sort((a, b) => {
    const last = rank(a) - rank(b);
    if (last) return last;
    const c = col.text ? byLabel(a, b) : value(a) - value(b);
    return sign * c || byLabel(a, b);
  });
}
