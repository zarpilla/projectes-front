// The app permissions of a user (component permissions.application-permission)
// and their names, shared by the users list, its export and the profile.
export const PERMISSION_LABELS = {
  projects: 'Projectes',
  hours: 'Hores',
  admin: 'Administració',
  orders: 'Logística',
  orders_admin: 'Logística (oficina)',
  orders_delivery: 'Repartiment',
  admin_energy: 'Comunitat energètica'
}

export const permissionLabel = code => PERMISSION_LABELS[code] || code

// Some users have permission rows without a value («projects, , hours»,
// issues/087): they are dropped when read and never saved back.
export const permissionCodes = permissions =>
  (permissions || []).map(p => (p && typeof p === 'object' ? p.permission : p)).filter(Boolean)
