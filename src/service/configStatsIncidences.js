const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    columns: [      
      {
        name: 'state',
        expand: false
      },
      {
        name: 'route_name',
        expand: false
      }
    ], // Specify a dimension on columns.
    rows: [      
      {
        name: 'year',
        expand: false,
      },
      {
        name: 'month',
        expand: false
      },
      {
        name: 'owner_name',
        expand: false
      },
      {
        name: 'created_user',
        expand: false
      }
    ], // Specify a dimension on rows.
    measures: ['Incidències'],
    schema: {
      model: {
        fields: {
          owner: {
            type: 'string'
          },
          owner_name: {
            type: 'string'
          },
          created_user: {
            type: 'string'
          },
          created_user_id: {
            type: 'number'
          },
          route: {
            type: 'string'
          },
          route_name: {
            type: 'string'
          },
          state: {
            type: 'string'
          },
          state_raw: {
            type: 'string'
          },
          year: {
            type: 'string'
          },
          month: {
            type: 'string'
          },
          count: {
            type: 'number'
          },
          order_id: {
            type: 'number'
          },
          closed_user: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          owner: {
            caption: 'Sòcia (T)'
          },
          owner_name: {
            caption: 'Nom Sòcia (T)'
          },
          created_user: {
            caption: 'Usuari (T)'
          },
          route: {
            caption: 'Ruta (T)'
          },
          route_name: {
            caption: 'Nom Ruta (T)'
          },
          state: {
            caption: 'Estat (T)'
          },
          month: {
            caption: 'Mesos (T)'
          },
          year: {
            caption: 'Anys (T)'
          },
          closed_user: {
            caption: 'Usuari Tancament (T)'
          }
        },
        measures: {
          'Incidències': {
            field: 'count',
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
