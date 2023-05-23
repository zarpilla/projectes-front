const config = {
  filterable: true,
  sortable: false,
  dataSource: {
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
    }, {      
      name: 'dedication_type',
      expand: false
    }, {
      name: 'year',
      expand: false
    }, {
      name: 'month',
      expand: false
    }, {
      name: 'username',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Hores reals', 'Hores previstes', 'Cost real'],
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
          username: {
            type: 'string'
          },
          year: {
            type: 'number'
          },
          month: {
            type: 'number'
          },
          day: {
            type: 'number'
          },
          date: {
            type: 'straing'
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
          },
          project_year: {
            caption: 'Any Inici (TOTS)'
          },
          month: {
            caption: 'Mesos (TOTS)'
          },
          year: {
            caption: 'Anys (TOTS)'
          },
          day: {
            caption: 'Dies (TOTS)'
          },
          date: {
            caption: 'Data (TOTES)'
          },
          username: {
            caption: 'Persones (TOTES)'
          },
          dedication_type: {
            caption: 'Tipus Dedicació (TOTES)'
          }
        },
        measures: {
          Num: {
            field: 'count',
            aggregate: 'sum'
          },
          'Hores reals': {
            field: 'hours',
            aggregate: 'sum',
            format: "{0:n2}" 
          },
          'Hores previstes': {
            field: 'estimated_hours',
            aggregate: 'sum',
            format: "{0:n2}" 
          },
          'Cost real': {
            field: 'real_cost',
            aggregate: 'sum',
            format: "{0:n2}" 
          },

          
        }
      }
    },
    pageSize: 10000
  },
  height: '74vh'
}

export default config
