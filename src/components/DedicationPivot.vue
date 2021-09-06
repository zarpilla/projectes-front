<template>
  <div>
    <div id="project-stats"></div>
    <download-csv class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button"
      icon-left="export" />
    </download-csv>
    <!-- <pre>
      {{ pivotData }}
    </pre> -->
  </div>
</template>

<script>
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsDedication'
import sortBy from 'lodash/sortBy'

moment.locale('ca')

export default {
  name: 'DedicationPivot',
  components: { },
  props: {
    projectState: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: '',
      userNameSearch: '',
      projectNameSearch: '',
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: []
    }
  },
  watch: {
    // user: function (newVal, oldVal) {
    //   console.log('user newVal', newVal)
    //   this.getActivities()
    // },
    // date1: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    // date2: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    // project: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    projectState: function (newVal, oldVal) {
      console.log('filter state', newVal)
      this.getActivities()
    }
  },
  mounted () {
    // console.log('mounted')
    this.getActivities()
  },
  methods: {
    async getActivities () {
      this.isLoading = true

      this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
      this.states = (await service({ requiresAuth: true }).get('project-states')).data
      this.leaders = (await service({ requiresAuth: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts?_limit=-1')).data

      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects?_where[project_state_eq]=${projectState}&_limit=-1`
      if (projectState === 0 || projectState === '0') {
        query = 'projects?_limit=-1'
      }

      this.dedicationTypes = (await service({ requiresAuth: true }).get('dedication-types')).data
      this.activityTypes = (await service({ requiresAuth: true }).get('activity-types')).data

      service({ requiresAuth: true }).get(query).then((r) => {
        // console.log('r.data', r.data)
        const activities = []

        const projects = r.data.forEach(p => {
          if (p.activities) {
            p.activities.forEach(a => {
              const activity = {
                project_name: p.name,
                project_state: p.project_state ? p.project_state.name : '-',
                project_leader: p.leader ? p.leader.username : '-',
                project_scope: p.project_scope ? p.project_scope.short_name : '-',
                project_client: p.client ? p.client.name : '-',
                total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                hours: a.hours,
                incomes_expenses: p.incomes_expenses ? p.incomes_expenses : 0,
                pricehour: a.hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / a.hours).toFixed(2)) : 0,
                month: a.date ? moment(a.date).format('MM').toString() : 0,
                year: a.date ? moment(a.date).format('YYYY').toString() : 0,
                day: a.date ? moment(a.date).format('DD').toString() : 0,
                date: a.date ? moment(a.date).format('YYYY-MM-DD').toString() : '-',
                username: a.users_permissions_user ? this.leaders.find(u => u.id === a.users_permissions_user).username : '-',
                dedication_type: '-', // a.dedication_type ? this.dedicationTypes.find(t => t.id === a.dedication_type).name : '-',
                activity_type: '-', // a.activity_type ? this.activityTypes.find(t => t.id === a.activity_type).name : '-',
                count: 1
              }
              activities.push(activity)
            })
          }
        })
        this.projects = projects
        this.pivotData = Object.freeze(sortBy(activities, ['year', 'month', 'date', 'dedication_type', 'activity_type'], ['asc', 'asc', 'asc', 'asc', 'asc']))
        configPivot.dataSource.data = this.pivotData
        window.jQuery('#project-stats').empty()
        window.jQuery('#project-stats').kendoPivotGrid(configPivot)
        this.isLoading = false
      })
    }
  },
  filters: {
    formatDate (val) {
      if (!val) { return '-' }
      return moment(val).fromNow()
    },
    formatDMYDate (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY')
    },
    formatTitle (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY') + ' (' + moment(val).fromNow() + ')'
    }
  }
}
</script>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.card-header-title{
  text-transform: capitalize;
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: #eee;
  text-transform: capitalize;
}
.auxiliar{
  color:#999;
}
.projects-bars{
  margin-bottom: 2rem;
}
.projects-bars progress{
  margin-top: 1rem;
}
.view-button{
  margin-left: 0.5rem;
}
.export-button{
  margin-top: 1rem;
}
</style>
