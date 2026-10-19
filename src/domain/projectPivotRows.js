import sumBy from 'lodash/sumBy'
import { projectStartYearLabel } from '@/domain/years'

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

// The rows of the Panell de projectes pivot (configStatsProject), one per project
// of projects/with-activities.
// «Despeses previstes/reals» are both without the hours' cost (issues/204).
export const projectStatsRow = (p, startMonth) => {
  const incomes = sumBy(p.activities.map(a => { return { incomes: a.hours * a.invoice_hours_price } }), 'incomes')
  return {
    project_name: p.name,
    project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
    project_type: p.project_type && p.project_type.name ? p.project_type.name : '-',
    project_state: p.project_state && p.project_state.name ? p.project_state.name : '-',
    project_leader: p.leader && p.leader.username ? p.leader.username : '-',
    project_scope: p.project_scope && p.project_scope.short_name ? p.project_scope.short_name : '-',
    project_client: p.client && p.client? p.client.name : '-',
    project_year: projectStartYearLabel(p, startMonth),
    total_original_hours: p.total_original_hours ? p.total_original_hours : 0,
    total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
    hours: sumBy(p.activities, 'hours'),
    incomes: p.invoice_hours_price ? incomes : p.total_incomes,
    total_incomes: p.total_incomes,
    real_incomes: p.total_real_incomes,
    // without the hours' cost, like `expenses` (it's in «Hores reals €»; issues/204)
    real_expenses: p.total_real_expenses,
    invoice_hours_price: p.invoice_hours_price,
    invoice_type: p.invoice_hours_price ? 'Hores' : 'Projecte',
    pricehour: p.invoice_hours_price ? p.invoice_hours_price : (sumBy(p.activities, 'hours') && p.incomes_expenses ? parseFloat((p.incomes_expenses / sumBy(p.activities, 'hours')).toFixed(2)) : 0),
    pricehour_estimate: p.invoice_hours_price ? p.invoice_hours_price : p.total_estimated_hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / p.total_estimated_hours).toFixed(2)) : 0,
    balance_estimate: p.invoice_hours_price ? (p.invoice_hours_price * p.total_estimated_hours) - p.total_expenses : p.total_incomes - p.total_expenses,
    incomes_expenses: p.incomes_expenses,
    total_real_incomes_expenses: p.total_real_incomes_expenses,
    total_real_incomes: p.total_real_incomes,
    expenses: p.total_expenses, // + p.total_estimated_hours_price,
    total_original_hours_price: p.total_original_hours_price,
    total_estimated_hours_price: p.total_estimated_hours_price,
    total_real_hours_price: p.total_real_hours_price,
    count: 1
  }
}
