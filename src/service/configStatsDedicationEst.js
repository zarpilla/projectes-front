// Classic Kendo PivotGrid (v2019) renders the raw field name in the grid header
// buttons and setting chips, ignoring schema.cube.dimensions.caption for local
// data. We relabel them in the dataBound event instead. `fieldCaptions` below is
// the single source of truth for the Catalan labels shown to the user.
import { relabelFields } from '@/service/pivotFieldCaptions'

const fieldCaptions = {
  project_state: 'Estat',
  project_leader: 'Líder',
  project_scope: 'Àmbit',
  project_client: 'Client',
  dedication_type: 'Tipus Dedicació',
  year: 'Any',
  month: 'Mes',
  username: 'Persona',
  project_name: 'Projecte'
}

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
    measures: ['Hores previstes', 'Hores previstes avui', 'Hores originals', 'Hores reals', 'Cost real'],
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
          'Hores previstes avui': {
            field: 'estimated_hours_today',
            aggregate: 'sum',
            format: "{0:n2}"
          },
          'Hores originals': {
            field: 'original_estimated_hours',
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
  dataBound: relabelFields(fieldCaptions),
  height: '74vh'
}

export default config
