// Payrolls have no code of their own: Despeses shows them as
// «<year>-<month>-<username>». A payroll can point at a deleted user (its
// `users_permissions_user` comes back null) and reading `.username` crashed the
// row rendering (issues/279), so the user part falls back to a label.

export const DELETED_USER = "usuari esborrat";

export function payrollUserName(payroll) {
  const user = payroll && payroll.users_permissions_user;
  return (user && user.username) || DELETED_USER;
}

export function payrollCode(payroll) {
  const year = payroll && payroll.year ? payroll.year.year : "";
  const month = payroll && payroll.month ? String(payroll.month.month).padStart(2, "0") : "";
  return `${year}-${month}-${payrollUserName(payroll)}`;
}
