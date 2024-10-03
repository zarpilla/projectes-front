const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    columns: [      
      {
        name: 'status',
        expand: false
      }, {
        name: 'pickup',
        expand: false
      }, {
        name: 'delivery_type',
        expand: false
      }
      ], // Specify a dimension on columns.
    rows: [
      
      {
        name: 'year',
        expand: false
      },
      {
        name: 'month',
        expand: false
      },
      {
        name: 'owner',
        expand: false
      }, {
        name: 'route',
        expand: false
      }, {
        name: 'contact',
        expand: false
      }, {
        name: 'route_rate',
        expand: false
      }
    ], // Specify a dimension on rows.
    measures: ['Comandes', 'Preu', 'Caixes','Kg'],
    schema: {
      model: {
        fields: {
          owner: {
            type: 'string'
          },
          contact: {
            type: 'string'
          },
          route: {
            type: 'string'
          },
          route_rate: {
            type: 'string'
          },
          status: {
            type: 'string'
          },
          pickup: {
            type: 'string'
          },
          delivery_type: {
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
          }
        }
      },
      cube: {
        dimensions: {
          owner: {
            caption: 'Sòcia (TOTES)'
          },
          contact: {
            caption: 'Punt (TOTS)'
          },
          route	: {
            caption: 'Ruta (TOTES)'
          },
          route_rate: {
            caption: 'Tarifa (TOTES)'
          },
          status: {
            caption: 'Estat (TOTS)'
          },
          pickup: {
            caption: 'Recollida (TOTES)'
          },
          delivery_type	: {
            caption: 'Entrega (TOTES)'
          },
          month: {
            caption: 'Mesos (TOTS)'
          },
          year: {
            caption: 'Anys (TOTS)'
          },
        },
        measures: {
          Comandes: {
            field: 'count',
            aggregate: 'sum'
          },
          'Preu': {
            field: 'price',
            aggregate: 'sum'
          },
          'Caixes': {
            field: 'units',
            aggregate: 'sum'
          },
          'Kg': {
            field: 'kilograms',
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
