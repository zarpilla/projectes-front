const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    // data: will be set dynamically
    columns: [], // Specify a dimension on columns.
    rows: [{
      name: 'year',
      expand: true
    }, {
      name: 'month',
      expand: false
    }, {
      name: 'username',
      expand: false
    }, {
      name: 'project',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Import justificat', 'Hores', 'Bestreta', '% Bestreta'],
    schema: {
      model: {
        fields: {
          year: {
            type: 'string'
          },
          month: {
            type: 'string'
          },
          username: {
            type: 'string'
          },
          project: {
            type: 'string'
          },
          cost: {
            type: 'number'
          },
          hours: {
            type: 'number'
          },
          payroll: {
            type: 'number'
          },
          grantable_amount: {
            type: 'number'
          },
          count: {
            type: 'number'
          }
        }
      },
      cube: {
        dimensions: {
          year: {
            caption: 'Any'
          },
          month: {
            caption: 'Mes'
          },
          username: {
            caption: 'Persona'
          },
          project: {
            caption: 'Projecte'
          }
        },
        measures: {
          'Import justificat': {
            field: 'cost',
            format: '{0:n2} €',
            aggregate: 'sum'
          },
          'Hores': {
            field: 'hours',
            format: '{0:n2} h',
            aggregate: 'sum'
          },
          'Bestreta': {
            field: 'payroll',
            format: '{0:n2} €',
            aggregate: 'average'
          },
          grantable_amount: {
            field: 'grantable_amount',
            format: '{0:n2} €',
            aggregate: 'sum'
          },
          count: {
            field: 'count',
            format: '{0}',
            aggregate: 'sum'
          },
          '% Bestreta': {
            field: 'cost',
            format: '{0:p2}',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var cost = parseFloat(dataItem.cost) || 0
              var payroll = parseFloat(dataItem.payroll) || 0
              
              // Accumulate cost and payroll for all cases
              state.totalCost = (state.totalCost || 0) + cost
              state.totalPayroll = (state.totalPayroll || 0) + payroll
              state.count = (state.count || 0) + 1
            },
            result: function (state) {
              // Return cost/payroll ratio (this works for both individual cells and totals)
              return state.totalPayroll > 0 ? state.totalCost / state.totalPayroll * state.count : 0
            }
          }
        }
      }
    }
  },
  excel: {
    fileName: 'justification-pivot.xlsx'
  },
  pdf: {
    fileName: 'justification-pivot.pdf'
  },
  messages: {
    measures: 'Mètriques',
    columns: 'Columnes',
    rows: 'Files',
    measuresLabel: 'Arrossega les mètriques aquí',
    columnsLabel: 'Arrossega les dimensions de columna aquí',
    rowsLabel: 'Arrossega les dimensions de fila aquí'
  }
}

export default config
