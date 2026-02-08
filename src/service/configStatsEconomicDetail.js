import { months } from "moment"

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
      name: 'grantable',
      expand: false
    }, {
      name: 'phase',
      expand: false
    }, {
      name: 'subphase',
      expand: false
    }, {
      name: 'row_type',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'year',
      expand: false
    },{
      name: 'month',
      expand: false
    },{
      name: 'mother',
      expand: false
    },{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Resultat orig', 'Resultat prev', 'Resultat exec', 'Ingressos orig', 'Ingressos prev', 'Ingressos exec', 'Despeses tot orig', 'Despeses tot prev', 'Despeses tot exec', 'Despeses orig', 'Despeses prev', 'Despeses exec', 'Hores orig', 'Hores prev', 'Hores exec'],
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
          year: {
            type: 'string'
          },
          month: {
            type: 'string'
          },
          row_type: {
            type: 'string'
          },
          phase: {
            type: 'string'
          },
          subphase: {
            type: 'string'
          },
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
          mother: {
            caption: 'Mare (TOTES)'
          },
          grantable: {
            caption: 'Subvencionable (TOTS)'
          },
          year: {
            caption: 'Any (TOTS)'
          },
          month: {
            caption: 'Mes (TOTS)'
          },
          phase: {
            caption: 'Fase (TOTS)'
          },
          subphase: {
            caption: 'Subfase (TOTS)'
          },
        },
        // measures: ['Sum']
        measures: {
          'Ingressos orig': {
            field: 'income_orig',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Ingressos prev': {
            field: 'income_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses orig': {
            field: 'expense_orig',
            format: '{0:n2} €',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var expense_orig = dataItem.expense_orig || 0
              var total_original_hours_price = dataItem.total_original_hours_price || 0
              var expense_orig_vat = dataItem.expense_orig_vat || 0
              state.expenses_orig = (state.expenses_orig || 0) + expense_orig + total_original_hours_price + expense_orig_vat
            },
            result: function (state) {
              return state.expenses_orig
            },
          },
          'Despeses prev': {
            field: 'expense_esti',
            zaggregate: 'sum',
            format: '{0:n2} €',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var expense_esti = dataItem.expense_esti || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              var expense_esti_vat = dataItem.expense_esti_vat || 0
              state.expenses = (state.expenses || 0) + expense_esti + total_estimated_hours_price + expense_esti_vat
            },
            result: function (state) {
              return state.expenses
            },
          },
          'Ingressos exec': {
            field: 'income_real',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses exec': {
            field: 'expense_real',
            zaggregate: 'sum',
            format: '{0:n2} €',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var expense_real = dataItem.expense_real || 0
              var total_real_hours_price = dataItem.total_real_hours_price || 0
              var expense_real_vat = dataItem.expense_real_vat || 0
              state.expense_real = (state.expense_real || 0) + expense_real + total_real_hours_price + expense_real_vat
            },
            result: function (state) {
              return state.expense_real
            },
          },
          'Despeses tot orig': {
            field: 'type',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var expense_orig = dataItem.expense_orig || 0
              var total_original_hours_price = dataItem.total_original_hours_price || 0
              var expense_orig_vat = dataItem.expense_orig_vat || 0
              state.expenses_tot_orig = (state.expenses_tot_orig || 0) + expense_orig + total_original_hours_price + expense_orig_vat
            },
            result: function (state) {
              return state.expenses_tot_orig
            },
            format: '{0:n2} €'
          },
          'Despeses tot prev': {
            field: 'type',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_esti = dataItem.income_esti || 0
              var expense_esti = dataItem.expense_esti || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              var expense_esti_vat = dataItem.expense_esti_vat || 0
              state.incomes = (state.incomes || 0) + income_esti
              state.expenses = (state.expenses || 0) + expense_esti + total_estimated_hours_price + expense_esti_vat
            },
            result: function (state) {
              return state.expenses
            },
            format: '{0:n2} €'
          },
          'Despeses tot exec': {
            field: 'type',
            // aggregate: 'sum',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_real = dataItem.income_real || 0
              var expense_real = dataItem.expense_real || 0
              var total_real_hours_price = dataItem.total_real_hours_price || 0
              var expense_real_vat = dataItem.expense_real_vat || 0
              state.incomes_real = (state.incomes_real || 0) + income_real
              state.expenses_real = (state.expenses_real || 0) + expense_real + total_real_hours_price + expense_real_vat
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
              var expense_real_vat = dataItem.expense_real_vat || 0
              state.incomes_real = (state.incomes_real || 0) + income_real
              state.expenses_real = (state.expenses_real || 0) + expense_real + total_real_hours_price + expense_real_vat
            },
            result: function (state) {
              return state.incomes_real + state.expenses_real
            },
            format: '{0:n2} €'
          },
          'Resultat orig': {
            field: 'type',
            aggregate: function (value, state, context) {
              var dataItem = context.dataItem
              var income_orig = dataItem.income_orig || 0
              var expense_orig = dataItem.expense_orig || 0
              var expense_orig_vat = dataItem.expense_orig_vat || 0
              var total_original_hours_price = dataItem.total_original_hours_price || 0
              state.incomes_orig = (state.incomes_orig || 0) + income_orig
              state.expenses_orig = (state.expenses_orig || 0) + expense_orig + total_original_hours_price + expense_orig_vat
            },
            result: function (state) {
              return state.incomes_orig + state.expenses_orig
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
              var expense_esti_vat = dataItem.expense_esti_vat || 0
              var total_estimated_hours_price = dataItem.total_estimated_hours_price || 0
              state.incomes = (state.incomes || 0) + income_esti
              state.expenses = (state.expenses || 0) + expense_esti + total_estimated_hours_price + expense_esti_vat
            },
            result: function (state) {
              return state.incomes + state.expenses
            },
            format: '{0:n2} €'
          },
          'Hores orig': {
            field: 'total_original_hours_price',
            aggregate: 'sum',
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
