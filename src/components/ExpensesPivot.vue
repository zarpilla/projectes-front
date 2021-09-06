<template>
  <div>
    <div id="project-despeses"></div>
    <download-csv class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button"
      icon-left="export" />
    </download-csv>
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
import configPivot from '@/service/configStatsExpenses'

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
      let query = `projects?_where[project_state_eq]=${projectState}&_limit=-1`
      if (projectState === 0 || projectState === '0') {
        query = 'projects?_limit=-1'
      }
      // if (this.user) {
      //   query = `${query}&[users_permissions_user.id]=${this.user}`
      // }
      // if (this.project) {
      //   query = `${query}&[project.id]=${this.project}`
      // }
      service({ requiresAuth: true }).get(query).then((r) => {
        // console.log('r.data', r.data)
        const expenses = []
        r.data.forEach(p => {
          const incomes = sumBy(p.activities.map(a => { return { incomes: a.hours * a.invoice_hours_price } }), 'incomes')

          if (p.expenses && p.expenses.length > 0) {
            // console.log('p.expenses', p.expenses)
            p.expenses.forEach(e => {
              const expense = {
                project_name: p.name,
                project_state: p.project_state ? p.project_state.name : '-',
                project_leader: p.leader ? p.leader.username : '-',
                project_scope: p.project_scope ? p.project_scope.short_name : '-',
                project_client: p.client ? p.client.name : '-',
                total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                hours: sumBy(p.activities, 'hours'),
                incomes: p.invoice_hours_price ? incomes : p.total_incomes,
                total_incomes: p.total_incomes,
                expense: e.total_amount,
                expense_type: e.expense_type ? e.expense_type.name : '-',
                // expenses: p.total_expenses,
                invoice_hours_price: p.invoice_hours_price,
                invoice_type: p.invoice_hours_price ? 'Hores' : 'Projecte',
                pricehour: p.invoice_hours_price ? p.invoice_hours_price : (sumBy(p.activities, 'hours') && p.incomes_expenses ? parseFloat((p.incomes_expenses / sumBy(p.activities, 'hours')).toFixed(2)) : 0),
                pricehour_estimate: p.invoice_hours_price ? p.invoice_hours_price : p.total_estimated_hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / p.total_estimated_hours).toFixed(2)) : 0,
                balance_estimate: p.invoice_hours_price ? (p.invoice_hours_price * p.total_estimated_hours) - p.total_expenses : p.total_incomes - p.total_expenses,
                count: 1
              }
              expenses.push(expense)
            })
          } else {
            const expense = {
              project_name: p.name,
              project_state: p.project_state ? p.project_state.name : '-',
              project_leader: p.leader ? p.leader.username : '-',
              project_scope: p.project_scope ? p.project_scope.short_name : '-',
              project_client: p.client ? p.client.name : '-',
              total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
              hours: sumBy(p.activities, 'hours'),
              incomes: p.invoice_hours_price ? incomes : p.total_incomes,
              total_incomes: p.total_incomes,
              expense: 0,
              expense_type: '-',
              // expenses: p.total_expenses,
              invoice_hours_price: p.invoice_hours_price,
              invoice_type: p.invoice_hours_price ? 'Hores' : 'Projecte',
              pricehour: p.invoice_hours_price ? p.invoice_hours_price : (sumBy(p.activities, 'hours') && p.incomes_expenses ? parseFloat((p.incomes_expenses / sumBy(p.activities, 'hours')).toFixed(2)) : 0),
              pricehour_estimate: p.invoice_hours_price ? p.invoice_hours_price : p.total_estimated_hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / p.total_estimated_hours).toFixed(2)) : 0,
              balance_estimate: p.invoice_hours_price ? (p.invoice_hours_price * p.total_estimated_hours) - p.total_expenses : p.total_incomes - p.total_expenses,
              count: 1
            }
            expenses.push(expense)
          }
          this.pivotData = Object.freeze(sortBy(expenses, ['project_name']))
          configPivot.dataSource.data = this.pivotData
          window.jQuery('#project-despeses').empty()
          window.jQuery('#project-despeses').kendoPivotGrid(configPivot)
          this.isLoading = false
        })
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
