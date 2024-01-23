<template>
  <div>
    <div id="project-despeses"></div>
    <download-excel class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button"
      icon-left="file-excel" />
    </download-excel>
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
      this.leaders = (await service({ requiresAuth: true, cached: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts/basic?_limit=-1&_sort=name:ASC')).data

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
        const data = []
        r.data.forEach(p => {
          if (p.phases) {
            var hasOriginal = p.original_phases && p.original_phases.length
            if (hasOriginal) {
              p.original_phases.forEach(ph => {
                if (ph.subphases) {
                  ph.subphases.forEach(inc => {         
                    if (inc.quantity && inc.amount) {
                      const row = {
                        project_name: p.name,
                        project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
                        project_state: p.project_state ? p.project_state.name : '-',
                        project_leader: p.leader ? p.leader.username : '-',
                        project_scope: p.project_scope ? p.project_scope.short_name : '-',
                        project_client: p.client ? p.client.name : '-',
                        project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                        type: inc.income_type ? inc.income_type.name : '-',
                        incomes: parseFloat(inc.quantity * inc.amount),
                        expenses: 0,
                        real_incomes: 0,
                        real_expenses: 0
                      }
                      data.push(row)
                    }                  
                  })
                }
                if (ph.expenses) {
                  ph.expenses.forEach(exp => {
                    if (exp.quantity && exp.amount) {
                      const row = {
                        project_name: p.name,
                        project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
                        project_state: p.project_state ? p.project_state.name : '-',
                        project_leader: p.leader ? p.leader.username : '-',
                        project_scope: p.project_scope ? p.project_scope.short_name : '-',
                        project_client: p.client ? p.client.name : '-',
                        project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                        type: exp.expense_type ? exp.expense_type.name : '-',
                        incomes: 0,
                        expenses: parseFloat(exp.quantity * exp.amount),
                        real_incomes: 0,
                        real_expenses: 0,
                      }
                      data.push(row)
                    }
                  })
                }
              })
            }
            p.phases.forEach(ph => {
              if (ph.subphases) {
                ph.subphases.forEach(inc => {         
                  if ((inc.quantity && inc.amount) || inc.income || inc.invoice) {
                    const row = {
                      project_name: p.name,
                      project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
                      concept: inc.concept,
                      project_state: p.project_state ? p.project_state.name : '-',
                      project_leader: p.leader ? p.leader.username : '-',
                      project_scope: p.project_scope ? p.project_scope.short_name : '-',
                      project_client: p.client ? p.client.name : '-',
                      project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                      type: inc.income_type ? inc.income_type.name : '-',
                      incomes: hasOriginal ? 0 : parseFloat(inc.quantity * inc.amount),
                      expenses: 0,
                      real_incomes: inc.income && inc.income.id ? inc.income.total_base : (inc.invoice && inc.invoice.id ? inc.invoice.total_base : (inc.paid ? parseFloat(inc.quantity * inc.amount): 0)),
                      real_expenses: 0,
                      
                    }
                    data.push(row)
                  }                  
                })
              }
              if (ph.expenses) {
                ph.expenses.forEach(exp => {
                  if ((exp.quantity && exp.amount) || exp.expense || exp.invoice) {
                    const row = {
                      project_name: p.name,
                      project_mother: p.mother && p.mother.name ? p.mother.name : p.name,
                      project_state: p.project_state ? p.project_state.name : '-',
                      project_leader: p.leader ? p.leader.username : '-',
                      project_scope: p.project_scope ? p.project_scope.short_name : '-',
                      project_client: p.client ? p.client.name : '-',
                      project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                      type: exp.expense_type ? exp.expense_type.name : '-',
                      incomes: 0,
                      expenses: hasOriginal ? 0 : (exp.quantity | 0) * (exp.amount | 0),
                      real_incomes: 0,
                      real_expenses: exp.expense && exp.expense.id ? exp.expense.total_base : (exp.invoice && exp.invoice.id ? exp.invoice.total_base : (exp.paid ? parseFloat(exp.quantity * exp.amount): 0)),
                    }
                    data.push(row)
                  }
                })
              }
            })
          }
          

          this.pivotData = Object.freeze(sortBy(data, ['project_name']))
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
