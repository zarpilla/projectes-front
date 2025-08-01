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
      }, {
        name: 'route_rate',
        expand: false
      },
      {
        name: 'lastmile',
        expand: false
      },
      {
        name: 'date',
        expand: false
      },
      {
        name: 'multidelivery',
        expand: false
      },
      {
        name: 'pickup_discount',
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
        name: 'owner',
        expand: false
      }, {
        name: 'contact',
        expand: false
      }, {
        name: 'city',
        expand: false
      },
      {
        name: 'route',
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
            type: 'string'
          },
          month: {
            type: 'string'
          },
          city: {
            type: 'string'
          },          
          price: {
            type: 'number'
          },
          count: {
            type: 'number'
          },
          kilograms: {
            type: 'number'
          },
          date: {
            type: 'string'
          },
          lastmile: {
            type: 'string'
          },
          multidelivery: {
            type: 'string'
          },
          pickup_discount: {
            type: 'string'
          }
        }
      },
      cube: {
        dimensions: {
          owner: {
            caption: 'Sòcia (T)'
          },
          contact: {
            caption: 'Punt (T)'
          },
          route	: {
            caption: 'Ruta (T)'
          },
          route_rate: {
            caption: 'Tarifa (T)'
          },
          status: {
            caption: 'Estat (T)'
          },
          pickup: {
            caption: 'Recollida (T)'
          },
          delivery_type	: {
            caption: 'Entrega (T)'
          },
          month: {
            caption: 'Mesos (T)'
          },
          year: {
            caption: 'Anys (T)'
          },
          city: {
            caption: 'Població (T)'
          },
          lastmile: {
            caption: 'Úl.Milla (T)'
          },
          date: {
            caption: 'Dates (T)'
          },
          multidelivery: {
            caption: 'Multientrega (T)'
          },
          pickup_discount: {
            caption: 'Descompte Recollida (T)'
          }
        },
        measures: {
          Comandes: {
            field: 'count',
            aggregate: 'sum'
          },
          'Preu': {
            field: 'price',
            aggregate: 'sum',
            format: "{0:n2}"
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
