// Relabel rendered field names (header buttons + setting chips) to Catalan;
// classic Kendo ignores schema.cube.dimensions.caption for local data.
import { relabelFields } from '@/service/pivotFieldCaptions'

const fieldCaptions = {
  project_state: 'Estat',
  leader: 'Líder',
  project_scope: 'Àmbit',
  project_name: 'Projecte',
  strategy_name: 'Estratègia',
  strategy_code: 'Codi'
}

const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    columns: [{
      name: 'project_name',
      expand: false,
      caption: 'Nom'
    }], // Specify a dimension on columns.
    rows: [{
      name: 'strategy_name',
      expand: false
    }, {
      name: 'strategy_code',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Num'],
    schema: {
      model: {
        fields: {
          project_state: {
            type: 'string'
          },
          leader: {
            type: 'string'
          },
          project_name: {
            type: 'string'
          },
          project_scope: {
            type: 'string'
          },
          strategy_name: {
            type: 'string'
          },
          strategy_code: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          project_state: {
            caption: 'Estats (TOTS)'
          },
          leader: {
            caption: 'Líders (TOTS)'
          },
          project_name: {
            caption: 'Projectes (TOTS)'
          },
          project_scope: {
            caption: 'Àmbits (TOTS)'
          },
          strategy_name: {
            caption: 'Estratègies (TOTES)'
          },
          strategy_code: {
            caption: 'Codis (TOTS)'
          }
        },
        measures: {
          Num: {
            field: 'count',
            aggregate: 'sum'
          },
          'Balanç (€)': {
            field: 'incomes_expenses',
            aggregate: 'sum'
          },
          estimated_balance: {
            field: 'estimated_balance',
            aggregate: 'sum'
          },
          'Hores previstes': {
            field: 'total_estimated_hours',
            aggregate: 'sum'
          },
          'Hores reals': {
            field: 'total_real_hours',
            aggregate: 'sum'
          }
        }
      }
    },
    pageSize: 10000
  },
  dataBound: relabelFields(fieldCaptions),
  height: '74vh'
}

export default config
