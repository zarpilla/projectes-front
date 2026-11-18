// Bestretes for the whole staff, «Plantilla sencera» (issues/449): the year's
// payrolls of everyone summed per month. Built from the payrolls only (one
// request for the year), never from each person's day-by-day hours, so the
// page stays as fast with every person as with one.

const num = (value) => Number(value) || 0;
const round2 = (value) => Math.round(value * 100) / 100;
const AMOUNTS = ["net", "irpf", "ss", "other", "total"];

// the twelve months of the year with the sum of everyone's payrolls; a month
// without payrolls stays with zeros, so the table always reads Gener–Desembre
export function teamPayrollMonths(payrolls, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
    paid: 0,
    net: 0,
    irpf: 0,
    ss: 0,
    other: 0,
    total: 0
  }));
  for (const p of payrolls || []) {
    if (!p.year || Number(p.year.year) !== Number(year)) continue;
    const row = p.month && months[Number(p.month.month) - 1];
    if (!row) continue;
    row.count += 1;
    if (p.paid) row.paid += 1;
    row.net += num(p.net_base);
    row.irpf += num(p.irpf_base);
    row.ss += num(p.ss_base);
    row.other += num(p.other_base);
    row.total += num(p.total);
  }
  for (const row of months) for (const key of AMOUNTS) row[key] = round2(row[key]);
  return months;
}

export function teamPayrollTotals(months) {
  const totals = { count: 0, paid: 0, net: 0, irpf: 0, ss: 0, other: 0, total: 0 };
  for (const row of months || []) {
    for (const key of Object.keys(totals)) totals[key] += row[key];
  }
  for (const key of AMOUNTS) totals[key] = round2(totals[key]);
  return totals;
}

// the people of Bestretes: only those with a working day (jornada) defined
// in that year; without it there is no payroll to work out (issues/449)
export function usersWithWorkingDay(users, dedications, year) {
  if (!year) return [];
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const ids = new Set(
    (dedications || [])
      .filter((d) => d.users_permissions_user && (!d.from || d.from <= to) && (!d.to || d.to >= from))
      .map((d) => d.users_permissions_user.id ?? d.users_permissions_user)
  );
  return (users || []).filter((u) => !u.hidden && ids.has(u.id));
}
