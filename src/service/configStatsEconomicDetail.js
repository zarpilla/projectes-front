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
      name: 'project_mother',
      expand: false
    }, {
      name: 'project_client',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'row_type',
      expand: false
    },{
      name: 'year',
      expand: false
    },{
      name: 'month',
      expand: false
    },{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Resultat prev', 'Resultat exec', 'Ingressos prev', 'Ingressos exec', 'Despeses tot prev', 'Despeses tot exec', 'Despeses prev', 'Despeses exec', 'Hores prev', 'Hores exec'],
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
          project_year: {
            type: 'string'
          },
          row_type: {
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
          row_type: {
            caption: 'Tipus (TOTES)'
          },
          project_mother: {
            caption: 'Mare (TOTES)'
          },
          year: {
            caption: 'Any (TOTS)'
          },
          month: {
            caption: 'Mes (TOTS)'
          },
        },
        // measures: ['Sum']
        measures: {
          'Ingressos prev': {
            field: 'income_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses prev': {
            field: 'expense_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Ingressos exec': {
            field: 'income_real',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses exec': {
            field: 'expense_real',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses tot prev': {
            field: 'total_amount_real',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_esti = dataItem.income_esti || 0
              var expense_esti = dataItem.expense_esti || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              state.incomes = (state.incomes || 0) + income_esti
              state.expenses = (state.expenses || 0) + expense_esti + total_estimated_hours_price
            },
            result: function (state) {
              return state.expenses
            },
            format: '{0:n2} €'
          },
          'Despeses tot exec': {
            field: 'total_amount_real',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_real = dataItem.income_real || 0
              var expense_real = dataItem.expense_real || 0
              var total_real_hours_price = dataItem.total_real_hours_price || 0
              state.incomes_real = (state.incomes_real || 0) + income_real
              state.expenses_real = (state.expenses_real || 0) + expense_real + total_real_hours_price
            },
            result: function (state) {
              return state.expenses_real
            },
            format: '{0:n2} €'
          },
          'Resultat exec': {
            field: 'type',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_real = dataItem.income_real || 0
              var expense_real = dataItem.expense_real || 0
              var total_real_hours_price = dataItem.total_real_hours_price || 0
              state.incomes_real = (state.incomes_real || 0) + income_real
              state.expenses_real = (state.expenses_real || 0) + expense_real + total_real_hours_price
            },
            result: function (state) {
              return state.incomes_real + state.expenses_real
            },
            format: '{0:n2} €'
          },
          'Resultat prev': {
            field: 'type',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_esti = dataItem.income_esti || 0
              var expense_esti = dataItem.expense_esti || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              state.incomes = (state.incomes || 0) + income_esti
              state.expenses = (state.expenses || 0) + expense_esti + total_estimated_hours_price
            },
            result: function (state) {
              return state.incomes + state.expenses
            },
            format: '{0:n2} €'
          },
          'Hores prev': {
            field: 'total_estimated_hours_price',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Hores exec': {
            field: 'total_real_hours_price',
            aggregate: 'sum',
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
  height: '74vh'
}

export default config
