<template>
  <div>
    <div id="project-stats"></div>
  </div>
</template>

<script>
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsDedication'

moment.locale('ca')

export default {
  name: 'DedicationPivot',
  components: { },
  props: {
    projectState: {
      type: Number,
      default: 1
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
    console.log('mounted')
    this.getActivities()
  },
  methods: {
    async getActivities () {
      this.isLoading = true

      this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
      this.states = (await service({ requiresAuth: true }).get('project-states')).data
      this.leaders = (await service({ requiresAuth: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts')).data

      // const from = moment(this.date1).format('YYYY-MM-DD')
      // const to = moment(this.date2).format('YYYY-MM-DD')
      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects?_where[project_state_eq]=${projectState}`
      // let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      if (this.projectState === 0) {
        query = 'projects?_limit=999'
      }
      // if (this.user) {
      //   query = `${query}&[users_permissions_user.id]=${this.user}`
      // }
      // if (this.project) {
      //   query = `${query}&[project.id]=${this.project}`
      // }
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
                count: 1
              }
              activities.push(activity)
            })
          }
          if (p.estimated_hours && p.estimated_hours.length > 0) {
            p.estimated_hours.forEach(a => {
              // console.log('a.users_permissions_user', a.users_permissions_user)
              const activity = {
                project_name: p.name,
                project_leader: p.leader ? p.leader.username : '-',
                project_state: p.project_state ? p.project_state.name : '-',
                project_scope: p.project_scope ? p.project_scope.short_name : '-',
                project_scope_name: p.project_scope ? p.project_scope.name : '-',
                total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                total_real_hours: p.total_real_hours ? p.total_real_hours : 0,
                count: 1,
                month: a.month ? a.month.month_number.toString() : 0,
                year: a.year ? a.year.year.toString() : 0,
                day: 0,
                date: '-',
                hours: 0,
                estimated_hours: a.quantity ? a.quantity : 0,
                dedication_type: '-',
                username: a.users_permissions_user && a.users_permissions_user.id ? a.users_permissions_user.username : '-'
              }
              activities.push(activity)
            })
          }
        })
        // console.log('projects', projects)
        // console.log('activities', activities)
        this.projects = projects
        this.pivotData = Object.freeze(activities)
        configPivot.dataSource.data = this.pivotData
        window.jQuery('#project-stats').empty()
        window.jQuery('#project-stats').kendoPivotGrid(configPivot)
        this.isLoading = false
      })
      // if (!this.date1 || !this.date2) {
      //   return
      // }
      // const from = moment(this.date1).format('YYYY-MM-DD')
      // const to = moment(this.date2).format('YYYY-MM-DD')
      // let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      // if (this.last) {
      //   query = `activities?_where[updated_at_gte]=${moment().add(-7, 'days').format('YYYY-MM-DD')}`
      // }
      // if (this.user) {
      //   query = `${query}&[users_permissions_user.id]=${this.user}`
      // }
      // if (this.project) {
      //   query = `${query}&[project.id]=${this.project}`
      // }
      // service({ requiresAuth: true }).get(query).then((r) => {
      //   this.activities = r.data
      //   this.hoursTotal = sumBy(this.activities, 'hours')
      //   this.distinctDays = uniq(map(this.activities, 'date'))
      //   this.distinctDays.sort()
      //   this.distinctDaysObj = this.distinctDays.map(d => {
      //     const activities = this.activities.filter(a => a.date === d)
      //     const hours = sumBy(activities, 'hours')
      //     activities.unshift({ id: 'Total', project: { name: 'Total' }, hours: hours })
      //     return { day: d, activities: activities, hours: hours }
      //   })
      //   this.distinctTotals = this.distinctDaysObj.map(d => { return { day: d.day, hours: d.hours } })
      //   this.distinctProjects = uniq(map(this.activities, 'project.name'))
      //   this.distinctProjectsObj = this.distinctProjects.map(p => {
      //     const activities = this.activities.filter(a => a.project.name === p)
      //     const hours = sumBy(activities, 'hours')
      //     return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
      //   })
      //   this.distinctUsers = uniq(map(this.activities, 'users_permissions_user.username'))
      //   this.distinctUsersObj = this.distinctUsers.map(p => {
      //     const activities = this.activities.filter(a => (p && a.users_permissions_user && a.users_permissions_user.username === p) || (!p && !a.users_permissions_user))
      //     const hours = sumBy(activities, 'hours')
      //     return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
      //   })
      //   this.fillChartData()
      //   this.isLoading = false
      //   })
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
</style>
