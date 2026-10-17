// The rows of the Estratègies and Intercooperació pivots: one per project and
// strategy / intercooperation. They carry every field their pivot config
// names (issues/075: `leader`, `total_real_hours` and `estimated_balance`
// were missing, so «Líder», «Hores reals» and the forecast balance were empty).
const projectFields = p => ({
  project_name: p.name,
  project_state: p.project_state ? p.project_state.name : '-',
  leader: p.leader ? p.leader.username : '-',
  project_leader: p.leader ? p.leader.username : '-',
  project_scope: p.project_scope ? p.project_scope.short_name : '-',
  project_client: p.client ? p.client.name : '-',
  total_estimated_hours: p.total_estimated_hours || 0,
  total_real_hours: p.total_real_hours || 0,
  incomes_expenses: p.incomes_expenses || 0,
  estimated_balance: p.estimated_balance || 0,
  count: 1
})

export const strategyRows = projects =>
  (projects || []).flatMap(p => (p.strategies || []).map(s => ({
    ...projectFields(p),
    hours: s.hours,
    strategy_name: s.name,
    strategy_code: s.code
  })))

export const intercoopRows = projects =>
  (projects || []).flatMap(p => (p.intercooperations || []).map(i => ({
    ...projectFields(p),
    hours: i.hours,
    intercooperation_name: i.name
  })))
