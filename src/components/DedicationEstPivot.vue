<template>
  <div>
    <div id="project-stats"></div>
    <download-excel :data="pivotData">
      <b-button
        title="Exporta dades"
        class="export-button"
        icon-left="file-excel"
      />
    </download-excel>
    <!-- <pre>
      {{ pivotData }}
    </pre> -->
  </div>
</template>

<script>
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsDedicationEst'
import sortBy from 'lodash/sortBy'

moment.locale('ca')

export default {
  name: 'DedicationPivot',
  components: { },
  props: {
    projectState: {
      type: Number,
      default: 0
    },
    year: {
      type: Number,
      default: 0
    },
    user: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      projects: [],
      projectsList: [],
      dedicationTypes: [],
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
      // console.log('filter state', newVal)
      this.getActivities()
    },
    year: function (newVal, oldVal) {
      // console.log('filter year', newVal)
      this.getActivities()
    },
    user: function (newVal, oldVal) {
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

      if (this.projectState === null || this.year === null || this.user === null) {
        return
      }

      this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
      this.states = (await service({ requiresAuth: true }).get('project-states')).data
      this.dedicationTypes = (await service({ requiresAuth: true }).get('dedication-types')).data
      this.leaders = (await service({ requiresAuth: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts?_limit=-1&_sort=name:ASC')).data

      // const from = moment(this.date1).format('YYYY-MM-DD')
      // const to = moment(this.date2).format('YYYY-MM-DD')
      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects?_where[project_state_eq]=${projectState}&_limit=-1`
      if (projectState === 0 || projectState === '0') {
        query = 'projects?_limit=-1'
      }
      service({ requiresAuth: true }).get(query).then((r) => {
        // console.log('r.data', r.data)
        const activities = []
        const projects = r.data.forEach(p => {          
          if (p.activities) {
            p.activities.forEach(a => {
              if ((this.year === 0 || (this.year > 0 && a.date && parseInt(moment(a.date).format('YYYY')) === this.year)) 
                && (this.user === 0 || (this.user > 0 && a.users_permissions_user && a.users_permissions_user.toString() === this.user.toString()))
                ) {
                const activity = {
                  project_name: p.name,
                  project_state: p.project_state ? p.project_state.name : '-',
                  project_leader: p.leader ? p.leader.username : '-',
                  project_scope: p.project_scope ? p.project_scope.short_name : '-',
                  project_client: p.client ? p.client.name : '-',
                  project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                  total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                  hours: a.hours,
                  incomes_expenses: p.incomes_expenses ? p.incomes_expenses : 0,
                  pricehour: a.hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / a.hours).toFixed(2)) : 0,
                  month: a.date ? moment(a.date).format('MM').toString() : 0,
                  year: a.date ? moment(a.date).format('YYYY').toString() : 0,
                  day: a.date ? moment(a.date).format('DD').toString() : 0,
                  date: a.date ? moment(a.date).format('YYYY-MM-DD').toString() : '-',
                  username: a.users_permissions_user ? this.leaders.find(u => u.id === a.users_permissions_user).username : '-',
                  count: 1,
                  dedication_type: a.dedication_type && this.dedicationTypes.length ? this.dedicationTypes.find(d => d.id === a.dedication_type).name : '-'
                }
                activities.push(activity)
              }
            })
          }
          if (p.original_phases && p.original_phases.length > 0) {
            p.original_phases.forEach(ph => {
              if (ph.subphases && ph.subphases.length > 0) {
                ph.subphases.forEach(sph => {
                  if (sph.estimated_hours && sph.estimated_hours.length > 0) {
                    sph.estimated_hours.forEach(h => {
                      // console.log('sph.estimated_hours', p.name, h)
                      const mdiff = Math.round(moment.duration(moment(h.to, 'YYYY-MM-DD').diff(moment(h.from, 'YYYY-MM-DD'))).asMonths())
                      // console.log('sph diff', p.name, mdiff)
                      for (var i = 0; i < mdiff; i++) {
                        const year = moment(h.from, 'YYYY-MM-DD').add(i, 'M').format('YYYY')

                        if ((year.toString() === this.year.toString() || this.year === 0) && 
                        (this.user === 0 || (this.user > 0 && h.users_permissions_user && h.users_permissions_user.id.toString() === this.user.toString()))) {
                          const activity = {
                            project_name: p.name,
                            project_leader: p.leader ? p.leader.username : '-',
                            project_state: p.project_state ? p.project_state.name : '-',
                            project_scope: p.project_scope ? p.project_scope.short_name : '-',
                            project_scope_name: p.project_scope ? p.project_scope.name : '-',
                            project_client: p.client ? p.client.name : '-',
                            total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                            total_real_hours: p.total_real_hours ? p.total_real_hours : 0,
                            count: 1,
                            month: moment(h.from, 'YYYY-MM-DD').add(i, 'M').format('MM'),
                            year: moment(h.from, 'YYYY-MM-DD').add(i, 'M').format('YYYY'),
                            day: 0,
                            date: '-',
                            hours: 0,
                            estimated_hours: h.quantity && mdiff > 0 ? h.quantity / mdiff : 0,
                            username: h.users_permissions_user && h.users_permissions_user.id ? h.users_permissions_user.username : '-',
                            dedication_type: p.default_dedication_type && p.default_dedication_type.id ? p.default_dedication_type.name : '-'
                          }
                          activities.push(activity)
                        }
                      }
                    })
                  }
                })
              }
            })
          } else if (p.estimated_hours && p.estimated_hours.length > 0) {
            p.estimated_hours.forEach(a => {
              // console.log('a.users_permissions_user', a.users_permissions_user)
              // console.log('this.month', this.month)
              // console.log('a.month', a.month)
              if ((this.year === 0 || (this.year > 0 && a.year && a.year.year && a.year.year === this.year)) && (this.month === 0 || (this.month > 0 && a.month && a.month.month && a.month.month === this.month))) {
                const activity = {
                  project_name: p.name,
                  project_leader: p.leader ? p.leader.username : '-',
                  project_state: p.project_state ? p.project_state.name : '-',
                  project_scope: p.project_scope ? p.project_scope.short_name : '-',
                  project_scope_name: p.project_scope ? p.project_scope.name : '-',
                  project_client: p.client ? p.client.name : '-',
                  total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                  total_real_hours: p.total_real_hours ? p.total_real_hours : 0,
                  count: 1,
                  month: a.month ? a.month.month_number.toString() : 0,
                  year: a.year ? a.year.year.toString() : 0,
                  day: 0,
                  date: '-',
                  hours: 0,
                  estimated_hours: a.quantity ? a.quantity : 0,
                  username: a.users_permissions_user && a.users_permissions_user.id ? a.users_permissions_user.username : '-',
                  dedication_type: p.default_dedication_type && p.default_dedication_type.id ? p.default_dedication_type.name : '-'
                }
                activities.push(activity)
              }
            })
          }
        })
        // console.log('projects', projects)
        // console.log('activities', activities)
        this.projects = projects
        // this.pivotData = Object.freeze(activities)
        this.pivotData = Object.freeze(sortBy(activities, ['year', 'month', 'project_name'], ['asc', 'asc', 'asc']))
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
