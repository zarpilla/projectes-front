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
      name: 'project_mother',
      expand: false    
    }, {
      name: 'project_scope',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Num', 'Hores previstes', 'Hores reals', 'Resultat previst', 'Resultat real', 'Ingressos previstos', 'Ingressos reals', 'Despeses previstes', 'Despeses reals', 'Hores previstes €', 'Hores reals €', 'Preu/hora previst', 'Preu/hora real', 'Despeses/hora previst', 'Despeses/hora real'],
    schema: {
      model: {
        fields: {
          project_state: {
            type: 'string'
          },
          project_mother: {
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
          // invoice_type: {
          //   type: 'string'
          // },
          project_client: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          project_state: {
            caption: 'Estats (TOTS)'
          },
          project_mother: {
            caption: 'Mare (TOTES)'
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
          // invoice_type: {
          //   caption: 'Facturació (TOTS)'
          // }
          // project_client: {
          //   caption: 'Clients (TOTS)'
          // }
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
          'Ingressos previstos': {
            field: 'incomes',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Ingressos reals': {
            field: 'total_real_incomes',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses previstes': {
            field: 'expenses',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses reals': {
            field: 'real_expenses',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          total_real_hours: {
            field: 'total_real_hours',
            aggregate: 'sum'
          },
          total_incomes: {
            field: 'total_incomes',
            aggregate: 'sum'
          },
          'Resultat previst': {
            field: 'incomes_expenses',
            aggregate: 'sum',
            // aggregate: function (value, state, context) {
            //   var dataItem = context.dataItem
            //   var incomes = dataItem.incomes
            //   var expenses = dataItem.expenses
            //   state.incomes = (state.incomes || 0) + incomes
            //   state.expenses = (state.expenses || 0) + expenses
            // },
            // result: function (state) {
            //   return state.incomes - state.expenses
            // },
            format: '{0:n2} €'
          },
          'Resultat real': {
            field: 'total_real_incomes_expenses',
            aggregate: 'sum',
            // aggregate: function (value, state, context) {
            //   var dataItem = context.dataItem
            //   var incomes = dataItem.real_incomes
            //   var expenses = dataItem.real_expenses
            //   state.real_incomes = (state.real_incomes || 0) + incomes
            //   state.real_expenses = (state.real_expenses || 0) + expenses
            // },
            // result: function (state) {
            //   return state.real_incomes - state.real_expenses
            // },
            format: '{0:n2} €'
          },
          'Balanç previst': {
            field: 'balance_estimate',
            aggregate: 'average',
            format: '{0:n2} €'
          },
          'Hores previstes': {
            field: 'total_estimated_hours',
            aggregate: 'sum',
            format: '{0:n2} h'
          },
          'Hores reals': {
            field: 'hours',
            aggregate: 'sum',
            format: '{0:n2} h'
          },
          'Hores previstes €': {
            field: 'total_estimated_hours_price',
            aggregate: 'sum',
            format: '{0:0.00} €'
          },
          'Hores reals €': {
            field: 'total_real_hours_price',
            aggregate: 'sum',
            format: '{0:0.0} €'
          },
          'Preu/hora previst': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.incomes
              var expenses = dataItem.expenses
              var hours = dataItem.total_estimated_hours
              state.incomes = (state.incomes || 0) + incomes
              state.expenses = (state.expenses || 0) + expenses
              state.total_estimated_hours = (state.total_estimated_hours || 0) + hours
            },
            result: function (state) {
              return state.total_estimated_hours ? (state.incomes - state.expenses) / state.total_estimated_hours : 0
            },
            format: '{0:n2} €'
          },
          'Preu/hora real': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.real_incomes
              var expenses = dataItem.real_expenses
              var hours = dataItem.hours
              state.real_incomes = (state.real_incomes || 0) + incomes
              state.real_expenses = (state.real_expenses || 0) + expenses
              state.hours = (state.hours || 0) + hours
            },
            result: function (state) {
              return state.hours ? (state.real_incomes - state.real_expenses) / state.hours : 0
            },
            format: '{0:n2} €'
          },
          'Despeses/hora previst': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.incomes
              var expenses = dataItem.expenses || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              var hours = dataItem.total_estimated_hours
              // state.incomes = (state.incomes || 0) + incomes
              state.expenses = (state.expenses || 0) + expenses + total_estimated_hours_price
              state.total_estimated_hours = (state.total_estimated_hours || 0) + hours
            },
            result: function (state) {
              return state.total_estimated_hours ? (state.expenses) / state.total_estimated_hours : 0
            },
            format: '{0:n2} €'
          },
          'Despeses/hora real': {
            field: 'pricehour',
            // aggregate: 'average',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var incomes = dataItem.real_incomes
              var expenses = dataItem.real_expenses
              var total_real_hours_price = dataItem.total_real_hours_price || 0
              var hours = dataItem.hours
              // state.real_incomes = (state.real_incomes || 0) + incomes
              state.real_expenses = (state.real_expenses || 0) + expenses + total_real_hours_price
              state.hours = (state.hours || 0) + hours
            },
            result: function (state) {
              return state.hours ? (state.real_expenses) / state.hours : 0
            },
            format: '{0:n2} €'
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
            format: '{0:n2} €'
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
            format: '{0:n2} €'
          },
          'Preu/hora previstZZZ': {
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
            format: '{0:n2} €'
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
  height: '90vh'
}

export default config
