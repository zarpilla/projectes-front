// Informes › Estratègies: the projects of the pivot below, added up per strategic
// line ("2" of "2.1"), per strategy and per strategy × àmbit. A project can have
// several strategies, so the strategy rows don't add up: the line subtotals and
// the totals count each project once.

const OTHER_LINE = 'Altres'

const byCode = (a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'ca', { numeric: true })

// "2.1" → "2"; codes without a dot (ARTTERRA, Hubs…) go to «Altres»
export const lineOf = code => {
  const match = /^\s*(\d+)\s*\./.exec(String(code || ''))
  return match ? match[1] : OTHER_LINE
}

export const strategyName = s => {
  if (s.name && String(s.name).trim()) return String(s.name).trim()
  return String(s.code || '').trim() || '–'
}

const projectHours = p => Number(p.total_estimated_hours) || 0
const projectBalance = p => Number(p.incomes_expenses) || 0

const sumProjects = projects => ({
  projects: projects.length,
  hours: projects.reduce((t, p) => t + projectHours(p), 0),
  balance: projects.reduce((t, p) => t + projectBalance(p), 0)
})

const withStrategies = projects => (projects || []).filter(p => (p.strategies || []).length)

export const strategyStats = (projects, allStrategies = []) => {
  const list = projects || []
  const tagged = withStrategies(list)

  // strategy id → { strategy, projects }
  const byStrategy = new Map()
  for (const p of tagged) {
    for (const s of p.strategies) {
      if (!byStrategy.has(s.id)) byStrategy.set(s.id, { strategy: s, projects: [] })
      const entry = byStrategy.get(s.id)
      if (!entry.projects.includes(p)) entry.projects.push(p)
    }
  }
  const used = [...byStrategy.values()].sort((a, b) => byCode(a.strategy, b.strategy))
  const max = Math.max(0, ...used.map(e => e.projects.length))

  const lines = []
  for (const entry of used) {
    const key = lineOf(entry.strategy.code)
    let line = lines.find(l => l.key === key)
    if (!line) {
      line = { key, label: key === OTHER_LINE ? OTHER_LINE : `Línia ${key}`, strategies: [], projectSet: new Set() }
      lines.push(line)
    }
    entry.projects.forEach(p => line.projectSet.add(p))
    line.strategies.push({
      id: entry.strategy.id,
      code: entry.strategy.code || '',
      name: strategyName(entry.strategy),
      ...sumProjects(entry.projects),
      share: max ? entry.projects.length / max : 0
    })
  }
  // «Altres» last
  lines.sort((a, b) => (a.key === OTHER_LINE) - (b.key === OTHER_LINE) || a.key.localeCompare(b.key, 'ca', { numeric: true }))

  const usedIds = new Set(byStrategy.keys())
  const known = (allStrategies || []).length ? allStrategies : used.map(e => e.strategy)
  return {
    total: list.length,
    ...sumProjects(tagged),
    used: usedIds.size,
    available: Math.max(known.length, usedIds.size),
    unused: known.filter(s => !usedIds.has(s.id)).sort(byCode),
    lines: lines.map(({ projectSet, ...line }) => ({ ...line, ...sumProjects([...projectSet]) }))
  }
}

// one row per project with strategies, most planned hours first
export const strategyProjects = projects =>
  withStrategies(projects)
    .map(p => ({
      id: p.id,
      name: p.name || '–',
      state: p.project_state ? p.project_state.name : '',
      scope: p.project_scope ? p.project_scope.name : '',
      strategies: [...p.strategies].sort(byCode).map(s => ({ id: s.id, code: s.code || '', name: strategyName(s) })),
      hours: projectHours(p),
      balance: projectBalance(p)
    }))
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'ca'))

// projects per strategy × àmbit; only the àmbits some project uses
export const strategyMatrix = projects => {
  const tagged = withStrategies(projects)
  const scopes = []
  const scopeKey = p => (p.project_scope ? p.project_scope.id : null)
  for (const p of tagged) {
    const key = scopeKey(p)
    if (!scopes.some(s => s.key === key)) {
      scopes.push(p.project_scope
        ? { key, name: p.project_scope.name || p.project_scope.short_name || '–', short: p.project_scope.short_name || '' }
        : { key, name: 'Sense àmbit', short: '' })
    }
  }
  scopes.sort((a, b) => (a.key === null) - (b.key === null) || a.name.localeCompare(b.name, 'ca'))

  const rows = new Map()
  for (const p of tagged) {
    const column = scopes.findIndex(s => s.key === scopeKey(p))
    for (const s of p.strategies) {
      if (!rows.has(s.id)) rows.set(s.id, { id: s.id, code: s.code || '', name: strategyName(s), cells: scopes.map(() => 0), total: 0 })
      const row = rows.get(s.id)
      row.cells[column]++
      row.total++
    }
  }
  return { scopes, rows: [...rows.values()].sort(byCode) }
}

// the 4 steps of the heat map: 1 · 2–3 · 4–6 · 7 or more
export const heatLevel = n => (n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0)
