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
      name: 'project_client',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Num', 'Balanç', 'Hores previstes', 'Hores reals', 'Preu/hora real', 'Preu/hora previst'],
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
          project_leader: {
            caption: 'Líders (TOTS)'
          },
          project_name: {
            caption: 'Projectes (TOTS)'
          },
          project_scope: {
            caption: 'Àmbits (TOTS)'
          },
          project_client: {
            caption: 'Clients (TOTS)'
          }
        },
        // measures: ['Sum']
        measures: {
          Num: {
            field: 'count',
            aggregate: 'sum'
          },
          Balanç: {
            field: 'incomes_expenses',
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
          'Preu/hora real': {
            field: 'pricehour',
            aggregate: 'average',
            format: '{0:0.00} €'
          },
          'Preu/hora previst': {
            field: 'pricehour_estimate',
            aggregate: 'average',
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
