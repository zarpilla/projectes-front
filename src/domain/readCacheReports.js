// The per-report figures of the server's read cache (issues/307), as the
// Memòria cau card lists them: what each report's users got from memory and
// the loads they waited for. Reports are named for people; the rest (the
// auxiliary tables, mostly) go together.
const LABELS = {
  // loaded in pieces: each piece counts
  'treasury.forecast': 'Tresoreria (per parts)',
  'project.economic-detail': 'Ingressos/Despeses i Preu hora',
  'project.phases-both': 'Informes › Dedicació (per parts)',
  'GET /projects/dedications': 'Previsió dedicació',
  'GET /projects/real-dedications': '% Dedicació real',
  'GET /projects/estimated-totals': 'Justificacions (hores previstes)',
  calendars: 'Jornades i festius',
  'GET /projects/basic': 'Llista de projectes',
  'GET /contacts/basic': 'Llista de contactes',
  'GET /contacts/for-orders': 'Contactes de les comandes',
  'GET /phase-incomes/assigned': 'Documents assignats',
  'GET /phase-expenses/assigned': 'Documents assignats',
  'authenticated-user': 'Usuari i permisos',
  'app-permissions': 'Usuari i permisos'
}
export const OTHERS = 'Altres (taules auxiliars)'

const ZERO = () => ({ hits: 0, shared: 0, firstLoads: 0, loadsAgain: 0, loadMsTotal: 0, loadMsMax: 0 })

export function readCacheReportRows (reports, limit = 8) {
  const byLabel = new Map()
  for (const [family, f] of Object.entries(reports || {})) {
    const label = LABELS[family] || OTHERS
    if (!byLabel.has(label)) byLabel.set(label, { label, ...ZERO() })
    const row = byLabel.get(label)
    row.hits += (f.hits || 0) + (f.shared || 0)
    row.firstLoads += f.firstLoads || 0
    row.loadsAgain += f.loadsAgain || 0
    row.loadMsTotal += f.loadMsTotal || 0
    row.loadMsMax = Math.max(row.loadMsMax, f.loadMsMax || 0)
  }
  return [...byLabel.values()]
    .map(row => {
      const loads = row.firstLoads + row.loadsAgain
      return { ...row, loads, avgMs: loads ? Math.round(row.loadMsTotal / loads) : null }
    })
    .filter(row => row.loads || row.hits)
    .sort((a, b) => b.loadMsTotal - a.loadMsTotal || b.hits - a.hits)
    .slice(0, limit)
}

/** 850 ms, 6,8 s */
export function duration (ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toLocaleString('ca-ES', { maximumFractionDigits: 1 })} s`
}
