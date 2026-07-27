// Relabel rendered field names (header buttons + setting chips) to Catalan;
// classic Kendo ignores schema.cube.dimensions.caption for local data.
import { relabelFields } from '@/service/pivotFieldCaptions'

const fieldCaptions = {
  project_state: 'Estat',
  project_leader: 'Líder',
  project_scope: 'Àmbit',
  project_type: 'Tipus de projecte',
  project_likelihood: 'Probabilitat',
  project_client: 'Client',
  year: 'Any',
  month: 'Mes',
  dedication_type: 'Tipus dedicació',
  activity_type: 'Funció',
  username: 'Persona',
  date: 'Data',
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
      name: 'project_type',
      expand: false
    }, {
      name: 'project_likelihood',
      expand: false
    }, {
      name: 'project_client',
      expand: false
    }, {
      name: 'year',
      expand: false
    }, {
      name: 'month',
      expand: false
    }, {
      name: 'dedication_type',
      expand: false
    }, {
      name: 'activity_type',
      expand: false
    }, {
      name: 'username',
      expand: false
    }], // Specify a dimension on columns.
    rows: [{
      name: 'date',
      expand: false
    }, {
      name: 'project_name',
      expand: false
    }], // Specify a dimension on rows.
    measures: ['Hores reals'],
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
          project_type: {
            type: 'string'
          },
          project_likelihood: {
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
          },
          activity_type: {
            type: 'string'
          },
          dedication_type: {
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
          project_type: {
            caption: 'Tipus de projecte (TOTS)'
          },
          project_likelihood: {
            caption: 'Probabilitats (TOTES)'
          },
          project_client: {
            caption: 'Clients (TOTS)'
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
          activity_type: {
            caption: 'Funcions (TOTES)'
          },
          dedication_type: {
            caption: 'Tipus dedicació (TOTES)'
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
            format: '{0} h'
          }
        }
      }
    },
    pageSize: 10000
  },
  dataBound: relabelFields(fieldCaptions),
  height: '74vh'
}

export default config
