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
      name: 'intercooperation_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Num'],
    schema: {
      model: {
        fields: {
          project_state: {
            type: 'string'
          },
          project_name: {
            type: 'string'
          },
          project_scope: {
            type: 'string'
          },
          intercooperation_name: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          project_state: {
            caption: 'Estats (TOTS)'
          },
          project_name: {
            caption: 'Projectes (TOTS)'
          },
          project_scope: {
            caption: 'Àmbits (TOTS)'
          },
          intercooperation_name: {
            caption: 'Intercooperació (TOTES)'
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
