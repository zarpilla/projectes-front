const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    // data: pivotedProjects,
    columns: [{
      name: 'month',
      expand: true
    }], // Specify a dimension on columns.
    rows: [{
      name: 'year',
      expand: true
    }], // Specify a dimension on rows.
    measures: ['Balanç', 'Ingressos', 'Despeses', 'Saldo'],
    schema: {
      model: {
        fields: {
          year: {
            type: 'string'
          },
          month: {
            type: 'string'
          },
          valid: {
            type: 'bool'
          }
        }
      },
      cube: {
        dimensions: {
          year: {
            caption: 'Any (TOTS)'
          },
          month: {
            caption: 'Mesos (TOTS)'
          }
        },
        measures: {          
          'Balanç': {
            field: 'total_amount',
            aggregate: 'sum',
            format: '{0:###,###.00} €'
          },
          Ingressos: {
            field: 'total_incomes',
            aggregate: 'sum',
            format: '{0:###,###.00} €'
          },
          Despeses: {
            field: 'total_expenses',
            aggregate: 'sum',
            format: '{0:###,###.00} €'
          },
          Saldo: {
            field: 'subtotal',
            aggregate: 'sum',
            format: '{0:###,###.00} €'
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
  height: '90vh',
  dataBound: function(e) {
    this.columnsHeader.find("#treasury-pivot table colgroup col:last-child").css({width:0});
    this.content.find("#treasury-pivot table colgroup col:last-child").css({width:0});
    this.element.find("#treasury-pivot .k-grid-footer").hide();
    
  }
}

export default config
