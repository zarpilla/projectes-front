// issues/440: a year's own «% IVA deduïble» (Taules auxiliars › Anys) rules
// over Configuració's. Núria Social Coop set 67 % in Configuració, but its
// years had 100 % (filled by issues/338), so the projects and reports added no
// non-deductible VAT. Configuració shows the years that override it and
// offers to put its % in the current and later years.

const pctOf = (value) => (value === null || value === undefined || value === "" ? null : Number(value));

// the current and later years with a % of their own different from Configuració's
export function yearsOverridingConfig(years, configPct, currentYear) {
  const pct = pctOf(configPct);
  if (pct === null) return [];
  return (years || [])
    .filter((y) => Number(y.year) >= Number(currentYear))
    .filter((y) => pctOf(y.deductible_vat_pct) !== null && pctOf(y.deductible_vat_pct) !== pct)
    .sort((a, b) => Number(a.year) - Number(b.year));
}

const joinAnd = (parts) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;

// «2026 (100 %) i 2027 (100 %)»
export function overridingYearsText(years) {
  return joinAnd(years.map((y) => `${y.year} (${pctOf(y.deductible_vat_pct)} %)`));
}
