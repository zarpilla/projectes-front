<template>
  <div>
    <div id="project-stats"></div>
    <!-- <pre>
      {{pivotData}}
    </pre> -->
  </div>
</template>

<script>
import service from '@/service/index'
import sumBy from 'lodash/sumBy'
import sortBy from 'lodash/sortBy'
import moment from 'moment'
import configPivot from '@/service/configStatsProject'

moment.locale('ca')

export default {
  name: 'ProjectesPivot',
  components: { },
  props: {
    projectState: {
      type: Number,
      default: 0
    },
    date1: {
      type: Date,
      default: null
    },
    date2: {
      type: Date,
      default: null
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
    date1: function (newVal, oldVal) {
      this.getActivities()
    },
    date2: function (newVal, oldVal) {
      this.getActivities()
    },
    // project: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    projectState: function (newVal, oldVal) {
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

      // const from = moment(this.date1).format('YYYY-MM-DD')
      // const to = moment(this.date2).format('YYYY-MM-DD')
      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects?_where[project_state_eq]=${projectState}`
      // let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      if (projectState === 0 || projectState === '0') {
        query = 'projects?_limit=999'
      }
      // if (this.user) {
      //   query = `${query}&[users_permissions_user.id]=${this.user}`
      // }
      // if (this.project) {
      //   query = `${query}&[project.id]=${this.project}`
      // }
      service({ requiresAuth: true }).get(query).then((r) => {
        console.log('projects rdata', r.data)
        const projects = r.data.map(p => {
          const incomes = sumBy(p.activities.map(a => { return { incomes: a.hours * a.invoice_hours_price } }), 'incomes')
          // const realIncomes = sumBy(p.emitted_invoices.map(a => { return { incomes: a.total_base } }), 'incomes')
          // const realExpenses = sumBy(p.received_invoices.map(a => { return { expenses: a.total_base } }), 'expenses') + sumBy(p.diets.map(a => { return { expenses: a.total_base } }), 'expenses') + sumBy(p.tickets.map(a => { return { expenses: a.total_base } }), 'expenses')

          // console.log('p.invoice_hours_price', p.invoice_hours_price)
          // console.log('incomes', incomes)

          // const bbbb = p.invoice_hours_price ? sumBy(p.activities.map(a => { return { incomes: a.hours * a.invoice_hours_price } }), 'incomes') : (p.incomes ? p.incomes : 0)
          // console.log('bbbb', bbbb)

          return {
            project_name: p.name,
            project_state: p.project_state ? p.project_state.name : '-',
            project_leader: p.leader ? p.leader.username : '-',
            project_scope: p.project_scope ? p.project_scope.short_name : '-',
            project_client: p.client ? p.client.name : '-',
            total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
            hours: sumBy(p.activities, 'hours'),
            incomes: p.invoice_hours_price ? incomes : p.total_incomes,
            total_incomes: p.total_incomes,
            // expenses: p.total_expenses,
            real_incomes: p.total_real_incomes,
            real_expenses: p.total_real_expenses + p.total_real_hours_price, // realExpenses,
            invoice_hours_price: p.invoice_hours_price,
            invoice_type: p.invoice_hours_price ? 'Hores' : 'Projecte',
            pricehour: p.invoice_hours_price ? p.invoice_hours_price : (sumBy(p.activities, 'hours') && p.incomes_expenses ? parseFloat((p.incomes_expenses / sumBy(p.activities, 'hours')).toFixed(2)) : 0),
            pricehour_estimate: p.invoice_hours_price ? p.invoice_hours_price : p.total_estimated_hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / p.total_estimated_hours).toFixed(2)) : 0,
            balance_estimate: p.invoice_hours_price ? (p.invoice_hours_price * p.total_estimated_hours) - p.total_expenses : p.total_incomes - p.total_expenses,
            incomes_expenses: p.incomes_expenses,
            total_real_incomes_expenses: p.total_real_incomes_expenses,
            total_real_incomes: p.total_real_incomes,
            expenses: p.total_expenses + p.total_estimated_hours_price,
            count: 1
          }
        })

        console.log('projects', projects)
        this.projects = r.data
        this.pivotData = Object.freeze(sortBy(projects, ['project_name']))
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
