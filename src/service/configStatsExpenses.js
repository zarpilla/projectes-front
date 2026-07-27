// Relabel rendered field names (header buttons + setting chips) to Catalan;
// classic Kendo ignores schema.cube.dimensions.caption for local data.
import { relabelFields } from '@/service/pivotFieldCaptions'

const fieldCaptions = {
  project_state: 'Estat',
  project_leader: 'Líder',
  project_scope: 'Àmbit',
  project_mother: 'Mare',
  project_client: 'Client',
  type: 'Tipus',
  project_year: 'Any Inici',
  project_name: 'Projecte'
}

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
      name: 'type',
      expand: false
    },{
      name: 'project_year',
      expand: false
    },{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Ingressos previstos', 'Ingressos reals', 'Despeses previstes', 'Despeses reals'],
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
          type: {
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
          type: {
            caption: 'Tipus (TOTES)'
          },
          project_mother: {
            caption: 'Mare (TOTES)'
          },
          project_year: {
            caption: 'Any Inici (TOTS)'
          },
        },
        // measures: ['Sum']
        measures: {
          'Ingressos previstos': {
            field: 'incomes',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses previstes': {
            field: 'expenses',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Ingressos reals': {
            field: 'real_incomes',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses reals': {
            field: 'real_expenses',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          // Balanç: {
          //   field: 'incomes_expenses',
          //   // aggregate: 'sum',
          //   aggregate: function (value, state, context) {
          //     var dataItem = context.dataItem
          //     var incomes = dataItem.incomes
          //     var expenses = dataItem.expenses
          //     state.incomes = (state.incomes || 0) + incomes
          //     state.expenses = (state.expenses || 0) + expenses
          //   },
          //   result: function (state) {
          //     return state.incomes - state.expenses
          //   },
          //   format: '{0:n2} €'
          // },          
        }
      }
    },
    pageSize: 10000,
  },
  dataBound: relabelFields(fieldCaptions),
  height: '74vh'
}

export default config
