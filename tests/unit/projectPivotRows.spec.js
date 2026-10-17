// issues/075: the Estratègies / Intercooperació pivot configs name `leader`,
// `total_real_hours` and `estimated_balance`, which the rows didn't carry, so
// «Líder», «Hores reals» and the forecast balance were always empty.
import { describe, it, expect } from 'vitest'
import { strategyRows, intercoopRows } from '@/domain/projectPivotRows'
import strategyConfig from '@/service/configStatsStrategy'
import intercoopConfig from '@/service/configStatsIntercoop'

const project = {
  name: 'Web', project_state: { name: 'Actiu' }, leader: { username: 'anna' },
  project_scope: { short_name: 'CAT' }, total_estimated_hours: 100, total_real_hours: 80,
  incomes_expenses: 500, estimated_balance: 700,
  strategies: [{ name: 'Habitatge', code: 'H1', hours: 3 }],
  intercooperations: [{ name: 'Xarxa', hours: 2 }]
}

describe.each([
  ['Estratègies', strategyRows, strategyConfig],
  ['Intercooperació', intercoopRows, intercoopConfig]
])('%s pivot rows (issues/075)', (_, rows, config) => {
  it('carry every field the config reads', () => {
    const [row] = rows([project])
    const { fields } = config.dataSource.schema.model
    const measures = config.dataSource.schema.cube.measures
    for (const key of Object.keys(fields)) expect(row, key).toHaveProperty(key)
    for (const m of Object.values(measures)) expect(row, m.field).toHaveProperty(m.field)
    expect(row).toMatchObject({ leader: 'anna', total_real_hours: 80, estimated_balance: 700 })
  })

  it('names the forecast balance in Catalan', () => {
    expect(Object.keys(config.dataSource.schema.cube.measures)).not.toContain('estimated_balance')
    expect(config.dataSource.schema.cube.measures['Balanç previst (€)'].field).toBe('estimated_balance')
  })
})
