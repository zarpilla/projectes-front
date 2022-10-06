const config = {
  filterable: true,
  sortable: false,
  dataSource: {
    // data: pivotedProjects,
    columns: [{
      name: 'year',
      expand: false
    },{
      name: 'month',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'year',
      expand: true
    },{
      name: 'month',
      expand: false
    },{
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Resultat', 'Cobraments', 'Pagaments'],
    schema: {
      model: {
        fields: {
          year: {
            type: 'string'
          },
          month: {
            type: 'string'
          },
          total_amount: {
            type: 'number'
          }
        }
      },
      cube: {
        dimensions: {
          year: {
            caption: 'Anys (TOTS)'
          },
          month: {
            caption: 'Mesos (TOTS)'
          },
          project_name: {
            caption: 'Projectes (TOTS)'
          }
        },
        measures: {          
          'Resultat': {
            field: 'total_amount',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          Cobraments: {
            field: 'total_incomes',
            aggregate: 'sum',
            format: '{0:n2} €'
          },
          Pagaments: {
            field: 'total_expenses',
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
  height: '80vh',
  dataBound: function(e) {
    this.columnsHeader.find("#treasury-pivot table colgroup col:last-child").css({width:0});
    this.content.find("#treasury-pivot table colgroup col:last-child").css({width:0});
    this.element.find("#treasury-pivot .k-grid-footer").hide();
    
  }
}

export default config
