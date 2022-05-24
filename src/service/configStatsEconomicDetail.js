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
    measures: ['Ingressos previstos', 'Ingressos reals', 'Despeses previstes', 'Despeses reals', 'Resultat previst', 'Resultat real'],
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
          'Ingressos previstos': {
            field: 'income_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses previstes': {
            field: 'expense_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Ingressos reals': {
            field: 'income_real',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Despeses reals': {
            field: 'expense_real',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Resultat previst': {
            field: 'total_amount_esti',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          'Resultat real': {
            field: 'total_amount_real',
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
