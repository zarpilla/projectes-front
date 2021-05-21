const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    // data: pivotedProjects,
    columns: [{
      name: 'project_state',
      expand: false
    }, {
      name: 'project_leader',
      expand: false
    }, {
      name: 'project_scope',
      expand: false
    }, {
      name: 'invoice_type',
      expand: false
    }, {
      name: 'project_client',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'project_name',
      expand: false
    }, {
      name: 'expense_type',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Num', 'Despeses'],
    schema: {
      model: {
        fields: {
          project_state: {
            type: 'string'
          },
          project_leader: {
            type: 'string'
          },
          project_name: {
            type: 'string'
          },
          project_scope: {
            type: 'string'
          },
          invoice_type: {
            type: 'string'
          },
          project_client: {
            type: 'string'
          },
          expense_type: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          project_state: {
            caption: 'Estats (TOTS)'
          },
          project_leader: {
            caption: 'Líders (TOTS)'
          },
          project_name: {
            caption: 'Projectes (TOTS)'
          },
          project_scope: {
            caption: 'Àmbits (TOTS)'
          },
          invoice_type: {
            caption: 'Facturació (TOTS)'
          },
          project_client: {
            caption: 'Clients (TOTS)'
          },
          expense_type: {
            caption: 'Tipus despesa (TOTES)'
          }
        },
        // measures: ['Sum']
        measures: {
          Num: {
            field: 'count',
            aggregate: 'sum'
          },
          invoice_hours_price: {
            field: 'invoice_hours_price',
            aggregate: 'sum'
          },
          incomes: {
            field: 'incomes',
            aggregate: 'sum'
          },
          expenses: {
            field: 'expenses',
            aggregate: 'sum'
          },
          total_real_hours: {
            field: 'total_real_hours',
            aggregate: 'sum'
          },
          total_incomes: {
            field: 'total_incomes',
            aggregate: 'average'
          },
          Despeses: {
            field: 'expense',
            aggregate: 'sum',
            format: '{0:0.00} €'
          },
          Balanç: {
            field: 'incomes_expenses',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.incomes
              var expenses = dataItem.expenses
              state.incomes = (state.incomes || 0) + incomes
              state.expenses = (state.expenses || 0) + expenses
            },
            result: function (state) {
              return state.incomes - state.expenses
            },
            format: '{0:0.00} €'
          },
          'Balanç previst': {
            field: 'balance_estimate',
            aggregate: 'sum',
            format: '{0:0.00} €'
          },
          'Hores previstes': {
            field: 'total_estimated_hours',
            aggregate: 'sum'
          },
          'Hores reals': {
            field: 'hours',
            aggregate: 'sum'
          },
          'Preu/hora': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.incomes
              var expenses = dataItem.expenses
              var hours = dataItem.hours
              state.incomes = (state.incomes || 0) + incomes
              state.expenses = (state.expenses || 0) + expenses
              state.hours = (state.hours || 0) + hours
            },
            result: function (state) {
              return state.hours ? (state.incomes - state.expenses) / state.hours : 0
            },
            format: '{0:0.00} €'
          },
          'Preu/hora realW': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              if (!state.hoursList) {
                state.hoursList = []
              }
              if (context.dataItem.hours) {
                state.hoursList.push([context.dataItem.pricehour, context.dataItem.hours])
              }
              if (state.hoursList.length === 0) {
                return 0
              }
              const [valueSum, weightSum] = state.hoursList.reduce(([valueSum, weightSum], [value, weight]) => ([valueSum + value * weight, weightSum + weight]), [0, 0])
              return valueSum / weightSum
            },
            format: '{0:0.00} €'
          },
          'Preu/hora previstW': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              if (!state.hoursList2) {
                state.hoursList2 = []
              }
              if (context.dataItem.total_estimated_hours) {
                const pricehour = (context.dataItem.incomes - context.dataItem.expenses) / context.dataItem.total_estimated_hours
                state.hoursList2.push([pricehour, context.dataItem.total_estimated_hours])
              }
              if (state.hoursList2.length === 0) {
                return 0
              }
              const [valueSum, weightSum] = state.hoursList2.reduce(([valueSum, weightSum], [value, weight]) => ([valueSum + value * weight, weightSum + weight]), [0, 0])
              return valueSum / weightSum
            },
            format: '{0:0.00} €'
          },
          'Preu/hora previst': {
            field: 'total_estimated_hours',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var totalEstimatedHours = dataItem.total_estimated_hours
              var incomes = dataItem.invoice_hours_price ? dataItem.invoice_hours_price * totalEstimatedHours : dataItem.incomes
              var expenses = dataItem.expenses
              state.incomes = (state.incomes || 0) + incomes
              state.expenses = (state.expenses || 0) + expenses
              state.totalEstimatedHours = (state.totalEstimatedHours || 0) + totalEstimatedHours
            },
            result: function (state) {
              return state.totalEstimatedHours ? (state.incomes - state.expenses) / state.totalEstimatedHours : 0
            },
            format: '{0:0.00} €'
          }
        }
      }
    },
    pageSize: 10000
    // schema: {
    //     model: {
    //         fields: {
    //             commission: { type: 'number' }
    //         }
    //     }
    // },
  },
  height: '74vh'
}

export default config
