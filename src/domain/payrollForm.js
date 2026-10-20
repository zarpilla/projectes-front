// Payroll form figures (issues/280): «Despesa total» read «1289.6399999999999»
// (a float sum, where the other inputs show two decimals) and the heading code
// was «2026-9-859» while the list says «2026-09-Quim».

export function payrollTotal (totalBase, ssBase) {
  return ((parseFloat(totalBase) || 0) + (parseFloat(ssBase) || 0)).toFixed(2)
}

// year-month-username, the code the payrolls list shows and filters by
export function payrollCode (payroll) {
  const year = payroll.year && payroll.year.year
  const month = payroll.month && payroll.month.month
  const user = payroll.users_permissions_user && payroll.users_permissions_user.username
  if (!year || !month) return ''
  return `${year}-${String(month).padStart(2, '0')}${user ? '-' + user : ''}`
}
