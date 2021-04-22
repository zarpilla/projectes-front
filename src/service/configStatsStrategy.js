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
  height: '74vh'
}

export default config
