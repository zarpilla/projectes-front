// A mother project's figures are its children's, added up: what it has on itself
// (legacy hours and costs from before it had children) doesn't count (issues/172).
// A list that sums its rows leaves the mothers out, since their children are rows
// of their own; the Panell de projectes gets each project with its own figures,
// so a mother's are set to zero there.

const isFigure = key => key.startsWith('total_') || ['incomes_expenses', 'estimated_balance', 'balance'].includes(key)

export const withoutMothers = projects => (projects || []).filter(p => !p.is_mother)

export const ownFiguresIgnored = p => {
  if (!p || !p.is_mother) return p
  const zeroed = Object.fromEntries(Object.keys(p).filter(isFigure).map(k => [k, 0]))
  return { ...p, ...zeroed, activities: [] }
}

// A child shows in its mother's Planificació when its state is the open one
// (id 1). /projects/:id/children sends project_state populated, an object; a
// bare id is accepted too (issues/282).
export const OPEN_STATE_ID = 1
export const isOpenChild = child => {
  const state = child && child.project_state
  const id = state && typeof state === 'object' ? state.id : state
  return Number(id) === OPEN_STATE_ID
}

// The list of a mother's children: active ones first, then by name.
export const sortChildren = children =>
  [...(children || [])].sort((a, b) =>
    (isOpenChild(b) - isOpenChild(a)) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'ca', { numeric: true }))
