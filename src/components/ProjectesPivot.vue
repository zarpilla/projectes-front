<template>
  <div>
    <div id="project-stats"></div>
    <download-excel class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button"
      icon-left="file-excel" />
    </download-excel>
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
      this.contacts = (await service({ requiresAuth: true }).get('contacts?_limit=-1&_sort=name:ASC')).data

      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects?_where[project_state_eq]=${projectState}&_limit=-1`
      if (projectState === 0 || projectState === '0') {
        query = 'projects?_limit=-1'
      }
      
      service({ requiresAuth: true }).get(query).then((r) => {
        const projects = r.data.map(p => {
          const incomes = sumBy(p.activities.map(a => { return { incomes: a.hours * a.invoice_hours_price } }), 'incomes')

          return {
            project_name: p.name,
            project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
            project_state: p.project_state && p.project_state.name ? p.project_state.name : '-',
            project_leader: p.leader && p.leader.username ? p.leader.username : '-',
            project_scope: p.project_scope && p.project_scope.short_name ? p.project_scope.short_name : '-',
            project_client: p.client && p.client? p.client.name : '-',
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
            expenses: p.total_expenses, // + p.total_estimated_hours_price,
            total_estimated_hours_price: p.total_estimated_hours_price,
            total_real_hours_price: p.total_real_hours_price,
            count: 1
          }
        })

        this.projects = r.data
        this.pivotData = Object.freeze(sortBy(projects, ['project_name']))
        configPivot.dataSource.data = this.pivotData
        window.jQuery('#project-stats').empty()
        window.jQuery('#project-stats').kendoPivotGrid(configPivot)
        // setTimeout(() => {
        //   const b1 = window.jQuery('.k-button[data-name=project_state]')
        //   b1.text(b1.text().replace('project_state', 'Estat'))
        //   console.log('b1', b1.text())
        // }, 500)
        this.isLoading = false
      })
    },
    exportCSV () {

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
