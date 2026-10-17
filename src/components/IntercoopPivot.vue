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
    
    <div id="project-stats" v-show="!pivotEmpty"></div>
    <!-- with no rows the pivot drew an empty frame (issues/108) -->
    <p v-if="pivotEmpty" class="pivot-empty">No hi ha dades per a aquests filtres.</p>
    <download-excel name="intercooperacio" class="export" :data="pivotData">
      <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
    </download-excel>
  </div>
</template>

<script>
import { intercoopRows } from '@/domain/projectPivotRows'
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsIntercoop'
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale('ca')

export default {
  name: 'IntercoopPivot',
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
      pivotEmpty: false,
      pivotIdentifier: 'intercoop-pivot'
    }
  },
  watch: {
    // user: function (newVal, oldVal) {
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
      this.getActivities()
    }
  },
  mounted () {
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
        const strategies = intercoopRows(r.data)
        this.projects = r.data
        this.pivotData = Object.freeze(strategies)
        this.pivotEmpty = this.pivotData.length === 0
        configPivot.dataSource.data = this.pivotData
        this.initializePivotWithViews('#project-stats', configPivot)
        this.isLoading = false
      })
    },
    applyDefaultView() {
      this.selectedViewId = null
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
}
</script>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.card-header-title{
  text-transform: capitalize;
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar{
  color:var(--a-muted);
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
