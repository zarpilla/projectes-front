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
