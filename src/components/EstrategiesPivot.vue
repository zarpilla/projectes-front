<template>
  <div>
    <!-- Pivot Views Component -->
    <pivot-views
      :pivot-views="pivotViews"
      :selected-view-id="selectedViewId"
      :show-save-modal="showSaveViewModal"
      :view-name="newViewName"
      @apply-view="applyPivotView"
      @apply-default="applyDefaultView"
      @save-view="showSaveView"
      @delete-view="deletePivotView"
      @close-save-modal="showSaveViewModal = false"
      @confirm-save="saveCurrentView"
      @update:viewName="newViewName = $event"
    />
    
    <div id="project-stats"></div>
    <download-excel class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button mt-0"
      icon-left="file-excel" />
    </download-excel>
  </div>
</template>

<script>
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsStrategy'
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale('ca')

export default {
  name: 'EstrategiesPivot',
  components: { PivotViews },
  mixins: [pivotViewsMixin],
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
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
      pivotIdentifier: 'estrategies-pivot'
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
        const strategies = []
        const projects = r.data.forEach(p => {
          if (p.strategies) {
            p.strategies.forEach(a => {
              const strategy = {
                project_name: p.name,
                project_state: p.project_state ? p.project_state.name : '-',
                project_leader: p.leader ? p.leader.username : '-',
                project_scope: p.project_scope ? p.project_scope.short_name : '-',
                project_client: p.client ? p.client.name : '-',
                total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                hours: a.hours,
                incomes_expenses: p.incomes_expenses ? p.incomes_expenses : 0,
                strategy_name: a.name,
                strategy_code: a.code,
                count: 1
              }
              strategies.push(strategy)
            })
          }
        })
        // console.log('projects', projects)
        // console.log('activities', activities)
        this.projects = projects
        this.pivotData = Object.freeze(strategies)
        configPivot.dataSource.data = this.pivotData
        this.initializePivotWithViews('#project-stats', configPivot)
        this.isLoading = false
      })
    },
    applyDefaultView() {
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource
        const defaultConfig = configPivot.dataSource
        
        dataSource.columns(defaultConfig.columns || [])
        dataSource.rows(defaultConfig.rows || [])
        dataSource.measures(defaultConfig.measures || [])
        // Note: Kendo Pivot Grid doesn't support filters() method
        // dataSource.filters([])
        
        this.selectedViewId = null
      }
    },
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
